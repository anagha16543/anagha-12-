"""
AI-NBA Readiness System — Backend
app/services/attainment_service.py

Direct CO / PO / PSO attainment from stored student marks.

Method (shown to users so it can be approved or changed):
  * A student "meets the target" in a subject when total marks obtained across all
    assessments are at least TARGET_PERCENT of total maximum marks (default 60%).
  * CO attainment % = share of enrolled students who meet the target.
  * Attainment level: 3 if >= 70%, 2 if >= 60%, 1 if >= 50%, else 0.
  * Assessments are not mapped to individual COs in the data model yet, so every
    CO of a subject shares that subject's result.
  * PO / PSO attainment = correlation-weighted average of the levels of the COs mapped to it.
  * A CO below level 2 is flagged weak and gets a suggested improvement action.
Indirect (survey) attainment is not blended in; feedback is reported separately.
"""

from __future__ import annotations

import uuid
from collections import defaultdict
from typing import Any, Dict, List, Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.academic import Subject
from app.models.curriculum import (
    COPOMapping,
    COPSOMapping,
    CourseOutcome,
    ProgramOutcome,
    ProgramSpecificOutcome,
    StudentAssessmentMark,
)

TARGET_PERCENT = 60.0
LEVEL_THRESHOLDS = ((70.0, 3), (60.0, 2), (50.0, 1))
WEAK_BELOW_LEVEL = 2


def _level(pct: float) -> int:
    for threshold, level in LEVEL_THRESHOLDS:
        if pct >= threshold:
            return level
    return 0


def compute_attainment(
    db: Session,
    department: str,
    academic_year_id: Optional[uuid.UUID],
    target_percent: float = TARGET_PERCENT,
) -> Dict[str, Any]:
    q = db.query(Subject).filter(Subject.department == department)
    if academic_year_id:
        q = q.filter(Subject.academic_year_id == academic_year_id)
    subjects = q.order_by(Subject.code).all()

    courses: List[Dict[str, Any]] = []
    co_levels: Dict[uuid.UUID, int] = {}
    weak: List[Dict[str, Any]] = []

    for subj in subjects:
        rows = (
            db.query(
                StudentAssessmentMark.student_id,
                func.sum(StudentAssessmentMark.marks_obtained),
                func.sum(StudentAssessmentMark.max_marks),
            )
            .filter(StudentAssessmentMark.subject_id == subj.id, StudentAssessmentMark.is_absent.is_(False))
            .group_by(StudentAssessmentMark.student_id)
            .all()
        )
        appeared = len(rows)
        met = sum(1 for _, got, mx in rows if mx and (got / mx * 100.0) >= target_percent)
        pct = round(met / appeared * 100.0, 1) if appeared else None
        level = _level(pct) if pct is not None else None

        cos = db.query(CourseOutcome).filter(CourseOutcome.subject_id == subj.id).order_by(CourseOutcome.code).all()
        co_items = []
        for co in cos:
            if level is not None:
                co_levels[co.id] = level
            item = {
                "co_code": co.code,
                "description": co.description,
                "attainment_percent": pct,
                "level": level,
                "is_weak": level is not None and level < WEAK_BELOW_LEVEL,
            }
            co_items.append(item)
            if item["is_weak"]:
                weak.append({
                    "subject_code": subj.code,
                    "subject_name": subj.name,
                    "co_code": co.code,
                    "attainment_percent": pct,
                    "level": level,
                    "recommended_action": (
                        "Run remedial sessions on this outcome, add practice assessments, "
                        "then reassess and record the new result as evidence."
                    ),
                })
        courses.append({
            "subject_code": subj.code,
            "subject_name": subj.name,
            "students_appeared": appeared,
            "students_meeting_target": met,
            "attainment_percent": pct,
            "level": level,
            "course_outcomes": co_items,
        })

    # PO / PSO roll-up (correlation-weighted average of CO levels)
    def rollup(model_map, code_model, link_col, target_col) -> List[Dict[str, Any]]:
        acc: Dict[uuid.UUID, List[tuple]] = defaultdict(list)
        for m in db.query(model_map).all():
            lvl = co_levels.get(m.course_outcome_id)
            if lvl is not None:
                acc[getattr(m, link_col)].append((lvl, m.correlation_level or 1))
        out = []
        q = db.query(code_model).filter(code_model.department == department)
        if academic_year_id:
            q = q.filter(code_model.academic_year_id == academic_year_id)
        for o in q.order_by(code_model.code).all():
            pairs = acc.get(o.id, [])
            weight = sum(w for _, w in pairs)
            avg = round(sum(l * w for l, w in pairs) / weight, 2) if weight else None
            out.append({"code": o.code, "description": o.description, "mapped_cos": len(pairs), "average_level": avg})
        return out

    pos = rollup(COPOMapping, ProgramOutcome, "program_outcome_id", None)
    psos = rollup(COPSOMapping, ProgramSpecificOutcome, "program_specific_outcome_id", None)

    def score25(items: List[Dict[str, Any]], key: str) -> Optional[float]:
        vals = [i[key] for i in items if i.get(key) is not None]
        return round(sum(vals) / len(vals) / 3.0 * 25.0, 2) if vals else None

    co_score = score25([{"l": c["level"]} for c in courses if c["level"] is not None], "l")
    po_items = [p for p in pos + psos if p["average_level"] is not None]
    po_score = score25(po_items, "average_level")

    return {
        "department": department,
        "method": {
            "target_percent": target_percent,
            "levels": "3 if >= 70% of students meet target, 2 if >= 60%, 1 if >= 50%, else 0",
            "co_mapping_note": "Assessments are not mapped to individual COs; all COs of a subject share the subject result.",
            "indirect_attainment": "Not included. Survey feedback is reported separately.",
        },
        "courses": courses,
        "program_outcomes": pos,
        "program_specific_outcomes": psos,
        "weak_course_outcomes": weak,
        "co_score_out_of_25": co_score,
        "po_pso_score_out_of_25": po_score,
    }
