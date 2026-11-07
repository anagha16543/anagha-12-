"""
AI-NBA Readiness System — Backend
app/services/evaluation_service.py

Runs the deterministic compliance engine against the department's stored data.

* build_context()   — aggregates DB records into the metrics a rule expects,
                      chosen by the rule key prefix (criterion3. ... criterion6.).
* evaluate_and_store() — evaluates one requirement and persists the result.
* resolve_academic_year() — explicit id, else the active year, else the newest.

Statuses always come from the rule functions, never from a client or an LLM.
"""

from __future__ import annotations

import uuid
from typing import Any, Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.business_rules.readiness_rules import evaluate_requirement
from app.models.academic import AcademicYear
from app.models.inputs import RequirementInput
from app.models.phase4 import EvaluationMode, NBARequirement, RequirementEvaluation
from app.services.attainment_service import compute_attainment
from app.services.criteria_context_service import (
    get_c3_context,
    get_c4_context,
    get_c5_context,
    get_c6_context,
)

DEFAULT_DEPARTMENT = "Computer Science and Engineering"

_CONTEXT_BUILDERS = {
    "criterion3": get_c3_context,
    "criterion4": get_c4_context,
    "criterion5": get_c5_context,
    "criterion6": get_c6_context,
}


def resolve_academic_year(db: Session, academic_year_id: Optional[uuid.UUID] = None) -> AcademicYear:
    if academic_year_id:
        year = db.query(AcademicYear).filter(AcademicYear.id == academic_year_id).first()
        if not year:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Academic year not found.")
        return year
    year = db.query(AcademicYear).filter(AcademicYear.is_active.is_(True)).first()
    if not year:
        year = db.query(AcademicYear).order_by(AcademicYear.created_at.desc()).first()
    if not year:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "No academic year exists yet. Ask the admin to create one first.",
        )
    return year


def build_context(
    db: Session,
    rule_key: str,
    department: str,
    academic_year_id: Optional[uuid.UUID],
) -> dict[str, Any]:
    builder = _CONTEXT_BUILDERS.get((rule_key or "").split(".")[0])
    if builder is None:
        return {}
    ctx = builder(db, department, academic_year_id)
    # RF (required faculty) = students / 20, used by several C5 rules.
    if "S" in ctx and "RF" not in ctx:
        ctx["RF"] = ctx["S"] / 20.0 if ctx["S"] else None
    if rule_key in ("criterion3.co_attainment_tools", "criterion3.po_pso_attainment"):
        att = compute_attainment(db, department, academic_year_id)
        key = "co_score_out_of_25" if rule_key.endswith("co_attainment_tools") else "po_pso_score_out_of_25"
        if att[key] is not None:
            ctx["attainment_score"] = att[key]
        # attainment_formula_configured stays False until the HOD approves the method (saved input).
    return ctx


def evaluate_and_store(
    db: Session,
    requirement: NBARequirement,
    academic_year_id: uuid.UUID,
    department: str,
    user_id: Optional[uuid.UUID],
    context_override: Optional[dict[str, Any]] = None,
    notes: Optional[str] = None,
    commit: bool = True,
) -> RequirementEvaluation:
    context = build_context(db, requirement.evaluation_rule_key, department, academic_year_id)
    saved = (
        db.query(RequirementInput)
        .filter(
            RequirementInput.requirement_id == requirement.id,
            RequirementInput.academic_year_id == academic_year_id,
            RequirementInput.department == department,
        )
        .first()
    )
    if saved and saved.data:
        context.update(saved.data)
    if context_override:
        context.update(context_override)
    result = evaluate_requirement(requirement.evaluation_rule_key, context)
    evaluation = RequirementEvaluation(
        requirement_id=requirement.id,
        academic_year_id=academic_year_id,
        department=department,
        status=result.status,
        score_attained=result.score_attained,
        max_score=result.max_score,
        mode=EvaluationMode.DETERMINISTIC.value,
        deterministic_metrics=result.deterministic_metrics,
        limitations=result.limitations,
        evaluated_by_user_id=user_id,
        notes=notes,
    )
    db.add(evaluation)
    if commit:
        db.commit()
        db.refresh(evaluation)
    else:
        db.flush()
    return evaluation
