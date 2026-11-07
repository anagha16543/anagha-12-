"""
AI-NBA Readiness System — Backend
app/api/v1/requirements.py

API endpoints for NBA Criteria, Requirements, and Deterministic Evaluations.

Authorization:
    - Listing criteria/requirements: any authenticated user.
    - Triggering evaluations:        HOD or ADMIN.
    - Evaluation history:            any authenticated user.
"""

from __future__ import annotations

import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_roles
from app.business_rules.readiness_rules import evaluate_requirement, load_all_rules
from app.db.session import get_db
from app.models.phase4 import (
    NBACriterion,
    NBARequirement,
    RequirementEvaluation,
    RequirementStatus,
    EvaluationMode,
)
from app.models.user import UserRoleName
from app.schemas.phase4 import (
    NBACriterionOut,
    NBARequirementOut,
    RequirementEvaluationOut,
    EvaluationTriggerRequest,
)

router = APIRouter(tags=["NBA Requirements"])


# ---------------------------------------------------------------------------
# Load rules once at import time
# ---------------------------------------------------------------------------
load_all_rules()


# ---------------------------------------------------------------------------
# Criteria
# ---------------------------------------------------------------------------

@router.get(
    "/criteria",
    response_model=List[NBACriterionOut],
    summary="List NBA Criteria",
)
def list_criteria(
    is_active: Optional[bool] = Query(default=None),
    db: Session = Depends(get_db),
    _: object = Depends(get_current_user),
):
    """Return all NBA criteria, optionally filtered by active status."""
    q = db.query(NBACriterion)
    if is_active is not None:
        q = q.filter(NBACriterion.is_active == is_active)
    return q.order_by(NBACriterion.display_order).all()


@router.get(
    "/criteria/{criterion_id}",
    response_model=NBACriterionOut,
    summary="Get NBA Criterion by ID",
)
def get_criterion(
    criterion_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: object = Depends(get_current_user),
):
    criterion = db.query(NBACriterion).filter(NBACriterion.id == criterion_id).first()
    if not criterion:
        raise HTTPException(status_code=404, detail="Criterion not found.")
    return criterion


# ---------------------------------------------------------------------------
# Requirements
# ---------------------------------------------------------------------------

@router.get(
    "/criteria/{criterion_id}/requirements",
    response_model=List[NBARequirementOut],
    summary="List requirements for a criterion",
)
def list_requirements(
    criterion_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: object = Depends(get_current_user),
):
    criterion = db.query(NBACriterion).filter(NBACriterion.id == criterion_id).first()
    if not criterion:
        raise HTTPException(status_code=404, detail="Criterion not found.")
    return (
        db.query(NBARequirement)
        .filter(NBARequirement.criterion_id == criterion_id)
        .order_by(NBARequirement.display_order)
        .all()
    )


@router.get(
    "/requirements/{requirement_id}",
    response_model=NBARequirementOut,
    summary="Get requirement by ID",
)
def get_requirement(
    requirement_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: object = Depends(get_current_user),
):
    req = db.query(NBARequirement).filter(NBARequirement.id == requirement_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Requirement not found.")
    return req


# ---------------------------------------------------------------------------
# Deterministic Evaluation
# ---------------------------------------------------------------------------

@router.post(
    "/requirements/{requirement_id}/evaluate",
    response_model=RequirementEvaluationOut,
    status_code=status.HTTP_201_CREATED,
    summary="Trigger deterministic evaluation for a requirement",
)
def evaluate_requirement_endpoint(
    requirement_id: uuid.UUID,
    body: EvaluationTriggerRequest,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(UserRoleName.HOD.value, UserRoleName.ADMIN.value)),
):
    """
    Run the deterministic rule for the given requirement and persist the result.

    SECURITY: status is computed by backend rule logic — it is NOT accepted
    from the request body and NOT delegated to an LLM.

    Historical evaluations are always preserved (new row inserted).
    """
    req = db.query(NBARequirement).filter(NBARequirement.id == requirement_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Requirement not found.")

    from app.services.evaluation_service import evaluate_and_store, resolve_academic_year

    year = resolve_academic_year(db, body.academic_year_id)
    return evaluate_and_store(
        db,
        req,
        academic_year_id=year.id,
        department=body.department,
        user_id=current_user.id,
        context_override=body.context or None,
        notes=body.notes,
    )


# ---------------------------------------------------------------------------
# Evaluation History
# ---------------------------------------------------------------------------

@router.get(
    "/requirements/{requirement_id}/evaluations",
    response_model=List[RequirementEvaluationOut],
    summary="List evaluation history for a requirement",
)
def list_evaluations(
    requirement_id: uuid.UUID,
    department: Optional[str] = Query(default=None),
    academic_year_id: Optional[uuid.UUID] = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    _: object = Depends(get_current_user),
):
    q = db.query(RequirementEvaluation).filter(
        RequirementEvaluation.requirement_id == requirement_id
    )
    if department:
        q = q.filter(RequirementEvaluation.department == department)
    if academic_year_id:
        q = q.filter(RequirementEvaluation.academic_year_id == academic_year_id)
    return q.order_by(RequirementEvaluation.evaluated_at.desc()).limit(limit).all()


# ---------------------------------------------------------------------------
# Manual inputs — figures a rule needs that records alone cannot provide
# ---------------------------------------------------------------------------

import re as _re
from typing import Any as _Any

from pydantic import BaseModel as _BaseModel, Field as _Field

from app.business_rules.readiness_rules import _RULE_REGISTRY
from app.models.inputs import RequirementInput
from app.services.evaluation_service import (
    DEFAULT_DEPARTMENT,
    build_context,
    resolve_academic_year,
)
from app.models.user import UserRoleName as _Roles


class RequirementInputsOut(_BaseModel):
    requirement_id: uuid.UUID
    academic_year_id: uuid.UUID
    department: str
    saved: dict[str, _Any]
    auto_filled: dict[str, _Any]
    missing_keys: List[str]
    rule_help: str
    expected_keys: List[dict[str, str]]


class RequirementInputsIn(_BaseModel):
    academic_year_id: Optional[uuid.UUID] = None
    department: str = _Field(default=DEFAULT_DEPARTMENT, min_length=2, max_length=100)
    data: dict[str, _Any] = _Field(default_factory=dict)


def _missing_keys(limitations: list) -> List[str]:
    keys: List[str] = []
    for line in limitations or []:
        m = _re.search(r"missing context keys: \[(.*?)\]", str(line))
        if m:
            keys += [k.strip().strip("'\"") for k in _re.split(r"',\s*'", m.group(1))]
    return keys


def _expected_keys(doc: str) -> List[dict[str, str]]:
    """Parse '    key type — description' lines from the rule's documentation."""
    out: List[dict[str, str]] = []
    for line in (doc or "").splitlines():
        m = _re.match(r"^\s{0,12}([A-Za-z_][A-Za-z0-9_]*)\s+(int|float|bool|str|list|dict|list\[[^\]]*\])\b\s*(.*)$", line)
        if m and m.group(1) not in ("Expected", "Points"):
            out.append({"key": m.group(1), "type": m.group(2), "hint": m.group(3).lstrip("—-– ").strip()})
    return out


def _keys_from_source(fn) -> List[str]:
    import inspect

    try:
        src = inspect.getsource(fn)
    except (OSError, TypeError):
        return []
    keys = _re.findall(r"context\.get\(\s*[\"']([A-Za-z_][A-Za-z0-9_]*)[\"']", src)
    keys += _re.findall(r"context\[\s*[\"']([A-Za-z_][A-Za-z0-9_]*)[\"']\s*\]", src)
    return list(dict.fromkeys(keys))


def _merge_expected(fn) -> List[dict[str, str]]:
    if fn is None:
        return []
    documented = _expected_keys(fn.__doc__ or "")
    seen = {k["key"] for k in documented}
    for key in _keys_from_source(fn):
        if key not in seen and key not in ("department", "academic_year_id"):
            documented.append({"key": key, "type": "", "hint": ""})
    return documented


def _inputs_payload(db: Session, req: NBARequirement, year_id: uuid.UUID, dept: str) -> RequirementInputsOut:
    saved = (
        db.query(RequirementInput)
        .filter(
            RequirementInput.requirement_id == req.id,
            RequirementInput.academic_year_id == year_id,
            RequirementInput.department == dept,
        )
        .first()
    )
    auto = build_context(db, req.evaluation_rule_key, dept, year_id)
    merged = dict(auto)
    merged.update(saved.data if saved else {})
    result = evaluate_requirement(req.evaluation_rule_key, merged)
    fn = _RULE_REGISTRY.get(req.evaluation_rule_key)
    return RequirementInputsOut(
        requirement_id=req.id,
        academic_year_id=year_id,
        department=dept,
        saved=(saved.data if saved else {}),
        auto_filled={k: v for k, v in auto.items() if k not in ("department", "academic_year_id")},
        missing_keys=_missing_keys(result.limitations),
        rule_help=((fn.__doc__ or "").strip() if fn else ""),
        expected_keys=_merge_expected(fn),
    )


@router.get(
    "/requirements/{requirement_id}/inputs",
    response_model=RequirementInputsOut,
    summary="Show saved manual inputs and what the rule still needs",
)
def get_requirement_inputs(
    requirement_id: uuid.UUID,
    department: str = Query(default=DEFAULT_DEPARTMENT),
    academic_year_id: Optional[uuid.UUID] = Query(default=None),
    db: Session = Depends(get_db),
    _: object = Depends(get_current_user),
):
    req = db.query(NBARequirement).filter(NBARequirement.id == requirement_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Requirement not found.")
    year = resolve_academic_year(db, academic_year_id)
    return _inputs_payload(db, req, year.id, department)


@router.put(
    "/requirements/{requirement_id}/inputs",
    response_model=RequirementInputsOut,
    summary="Save manual inputs for a requirement (HOD or Admin)",
)
def save_requirement_inputs(
    requirement_id: uuid.UUID,
    body: RequirementInputsIn,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(_Roles.HOD.value, _Roles.ADMIN.value)),
):
    req = db.query(NBARequirement).filter(NBARequirement.id == requirement_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Requirement not found.")
    year = resolve_academic_year(db, body.academic_year_id)
    row = (
        db.query(RequirementInput)
        .filter(
            RequirementInput.requirement_id == req.id,
            RequirementInput.academic_year_id == year.id,
            RequirementInput.department == body.department,
        )
        .first()
    )
    if row:
        row.data = {**(row.data or {}), **body.data}
        row.entered_by_user_id = current_user.id
    else:
        db.add(
            RequirementInput(
                requirement_id=req.id,
                academic_year_id=year.id,
                department=body.department,
                data=body.data,
                entered_by_user_id=current_user.id,
            )
        )
    db.commit()
    return _inputs_payload(db, req, year.id, body.department)
