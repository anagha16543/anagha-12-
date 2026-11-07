"""
AI-NBA Readiness System — Backend
app/api/v1/inspection.py

Virtual NBA Inspection: evaluates every active requirement of Criteria 3-6
from the department's stored data, refreshes gaps, and returns a summary.

The readiness figures are an internal indicator only, never an official NBA score.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, List, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.db.session import get_db
from app.models.phase4 import (
    Document,
    NBACriterion,
    NBARequirement,
    RequirementEvidence,
    RequirementStatus,
)
from app.models.phase5 import ActionStatus, CorrectiveAction, Gap, GapStatus
from app.models.user import User, UserRoleName
from app.services.evaluation_service import (
    DEFAULT_DEPARTMENT,
    evaluate_and_store,
    resolve_academic_year,
)
from app.services.gap_service import GapService

router = APIRouter(prefix="/inspection", tags=["Virtual Inspection"])

DISCLAIMER = (
    "Internal readiness indicator based on deterministic rules applied to your stored "
    "records. It is not an official NBA score."
)

_ACTION_BY_STATUS = {
    RequirementStatus.FAIL.value: "Fix the data or evidence behind this requirement, then re-run the inspection.",
    RequirementStatus.WARNING.value: "Close the remaining shortfall and attach supporting evidence.",
    RequirementStatus.NEEDS_RULE_CLARIFICATION.value: "Enter the missing inputs this rule needs (see limitations).",
}


class InspectionRequest(BaseModel):
    department: str = Field(default=DEFAULT_DEPARTMENT, min_length=2, max_length=100)
    academic_year_id: Optional[uuid.UUID] = None


class InspectionFinding(BaseModel):
    criterion_code: str
    requirement_code: str
    title: str
    status: str
    marks_attained: float
    max_marks: float
    has_evidence: bool
    issue: str
    recommended_action: str


class InspectionCriterion(BaseModel):
    criterion_code: str
    name: str
    passed: int
    warning: int
    failed: int
    needs_clarification: int
    not_applicable: int
    marks_attained: float
    max_marks: float
    readiness_percentage: Optional[float]


class InspectionResult(BaseModel):
    inspection_id: str
    completed_at: datetime
    department: str
    academic_year: str
    total_requirements: int
    passed: int
    warning: int
    failed: int
    needs_clarification: int
    not_applicable: int
    missing_evidence: int
    pending_actions: int
    overdue_actions: int
    readiness_score: float
    max_score: float
    readiness_percentage: float
    status: str
    summary: str
    criteria: List[InspectionCriterion]
    findings: List[InspectionFinding]
    disclaimer: str = DISCLAIMER


def _overall_label(pct: float, failed: int) -> str:
    if pct >= 85 and failed == 0:
        return "READY"
    if pct >= 60:
        return "NEARLY_READY"
    return "NOT_READY"


@router.post(
    "/run",
    response_model=InspectionResult,
    summary="Run the Virtual NBA Inspection for Criteria 3-6",
)
def run_inspection(
    body: Optional[InspectionRequest] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRoleName.HOD.value, UserRoleName.ADMIN.value)),
) -> InspectionResult:
    body = body or InspectionRequest()
    year = resolve_academic_year(db, body.academic_year_id)
    dept = body.department

    criteria = (
        db.query(NBACriterion)
        .filter(NBACriterion.is_active.is_(True))
        .order_by(NBACriterion.display_order)
        .all()
    )

    findings: List[InspectionFinding] = []
    crit_out: List[InspectionCriterion] = []
    totals = dict(PASS=0, WARNING=0, FAIL=0, NRC=0, NA=0)
    missing_evidence = 0
    score = 0.0
    max_score = 0.0
    total_reqs = 0

    for crit in criteria:
        reqs = (
            db.query(NBARequirement)
            .filter(
                NBARequirement.criterion_id == crit.id,
                NBARequirement.is_active.is_(True),
                NBARequirement.weightage > 0,
            )
            .order_by(NBARequirement.display_order)
            .all()
        )
        c = dict(PASS=0, WARNING=0, FAIL=0, NRC=0, NA=0)
        c_score = 0.0
        c_max = 0.0
        for req in reqs:
            ev = evaluate_and_store(
                db, req, year.id, dept, current_user.id, notes="Virtual NBA Inspection", commit=False
            )
            evidence_count = (
                db.query(func.count(RequirementEvidence.id))
                .join(Document, RequirementEvidence.document_id == Document.id)
                .filter(RequirementEvidence.requirement_id == req.id, Document.is_deleted.is_(False))
                .scalar()
                or 0
            )
            total_reqs += 1
            if evidence_count == 0:
                missing_evidence += 1
            if ev.status == RequirementStatus.PASS.value:
                c["PASS"] += 1
            elif ev.status == RequirementStatus.WARNING.value:
                c["WARNING"] += 1
            elif ev.status == RequirementStatus.FAIL.value:
                c["FAIL"] += 1
            elif ev.status == RequirementStatus.NOT_APPLICABLE.value:
                c["NA"] += 1
            else:
                c["NRC"] += 1
            if ev.status != RequirementStatus.NOT_APPLICABLE.value:
                c_score += ev.score_attained or 0.0
                c_max += ev.max_score or 0.0
            if ev.status not in (RequirementStatus.PASS.value, RequirementStatus.NOT_APPLICABLE.value):
                limits: List[Any] = ev.limitations or []
                findings.append(
                    InspectionFinding(
                        criterion_code=crit.code,
                        requirement_code=req.code,
                        title=req.title,
                        status=ev.status,
                        marks_attained=ev.score_attained or 0.0,
                        max_marks=ev.max_score or 0.0,
                        has_evidence=evidence_count > 0,
                        issue=str(limits[0]) if limits else f"{req.title} is below the expected level.",
                        recommended_action=_ACTION_BY_STATUS.get(ev.status, "Review this requirement."),
                    )
                )
        for k in totals:
            totals[k] += c[k]
        score += c_score
        max_score += c_max
        eligible = sum(c.values()) - c["NA"]
        crit_out.append(
            InspectionCriterion(
                criterion_code=crit.code,
                name=crit.name,
                passed=c["PASS"],
                warning=c["WARNING"],
                failed=c["FAIL"],
                needs_clarification=c["NRC"],
                not_applicable=c["NA"],
                marks_attained=round(c_score, 2),
                max_marks=round(c_max, 2),
                readiness_percentage=round(c_score / c_max * 100, 1) if c_max else None,
            )
        )
    db.commit()

    # Refresh gaps and corrective-action tracking from the fresh evaluations.
    GapService(db).generate_gaps_for_academic_year(
        academic_year_id=year.id, department=dept, current_user=current_user
    )

    open_states = [ActionStatus.IDENTIFIED.value, ActionStatus.IN_PROGRESS.value]
    pending_actions = (
        db.query(func.count(CorrectiveAction.id))
        .join(Gap, CorrectiveAction.gap_id == Gap.id)
        .filter(
            Gap.academic_year_id == year.id,
            Gap.department == dept,
            CorrectiveAction.status.in_(open_states),
        )
        .scalar()
        or 0
    )
    now = datetime.now(timezone.utc)
    overdue = (
        db.query(func.count(CorrectiveAction.id))
        .join(Gap, CorrectiveAction.gap_id == Gap.id)
        .filter(
            Gap.academic_year_id == year.id,
            Gap.department == dept,
            CorrectiveAction.status.in_(open_states),
            CorrectiveAction.due_date.isnot(None),
            CorrectiveAction.due_date < now,
        )
        .scalar()
        or 0
    )

    pct = round(score / max_score * 100, 1) if max_score else 0.0
    label = _overall_label(pct, totals["FAIL"])
    summary = (
        f"{totals['PASS']} of {total_reqs} requirements pass, {totals['WARNING']} need attention, "
        f"{totals['FAIL']} fail and {totals['NRC']} need more input. "
        f"{missing_evidence} requirements have no linked evidence."
    )
    return InspectionResult(
        inspection_id=str(uuid.uuid4()),
        completed_at=now,
        department=dept,
        academic_year=year.name if hasattr(year, "name") else str(year.id),
        total_requirements=total_reqs,
        passed=totals["PASS"],
        warning=totals["WARNING"],
        failed=totals["FAIL"],
        needs_clarification=totals["NRC"],
        not_applicable=totals["NA"],
        missing_evidence=missing_evidence,
        pending_actions=pending_actions,
        overdue_actions=overdue,
        readiness_score=round(score, 2),
        max_score=round(max_score, 2),
        readiness_percentage=pct,
        status=label,
        summary=summary,
        criteria=crit_out,
        findings=findings,
    )
