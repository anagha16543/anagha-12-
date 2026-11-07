"""
AI-NBA Readiness System — Backend
app/api/v1/submissions.py

CRUD and Review Lifecycle endpoints for Criteria 3, 4, 5, and 6 Submissions:
  - Faculty submits records (Course marks/attainment, Mentoring, Profiles, Publications, Evidence)
  - HOD reviews, verifies, approves, rejects, or requests revision with comments
  - Faculty views reviewer comments and resubmits
  - Admin has macro oversight and authorized overrides with immutable audit logging
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, require_roles
from app.db.session import Base, engine
from app.models.phase5 import Notification, NotificationType
from app.models.user import User, UserRoleName
from app.models.workflow import AuditLog, SubmissionStatus, WorkflowSubmission
from app.schemas.workflow import (
    AuditLogResponse,
    SubmissionCreate,
    SubmissionOverride,
    SubmissionResponse,
    SubmissionResubmit,
    SubmissionReview,
)

# Router
router = APIRouter(prefix="/submissions", tags=["Workflow & Submissions"])

@router.on_event("startup")
def _ensure_workflow_tables():
    try:
        Base.metadata.create_all(bind=engine)
    except Exception:
        pass


def _to_submission_response(sub: WorkflowSubmission) -> SubmissionResponse:
    """Format WorkflowSubmission model into schema response with submitter/reviewer names."""
    submitter_name = None
    submitter_email = None
    if sub.submitter:
        submitter_email = sub.submitter.email
        submitter_name = (
            sub.submitter.faculty_profile.full_name
            if sub.submitter.faculty_profile
            else sub.submitter.email.split("@")[0]
        )

    reviewer_name = None
    if sub.reviewer:
        reviewer_name = (
            sub.reviewer.faculty_profile.full_name
            if sub.reviewer.faculty_profile
            else sub.reviewer.email.split("@")[0]
        )

    return SubmissionResponse(
        id=sub.id,
        criterion_code=sub.criterion_code,
        sub_requirement=sub.sub_requirement,
        title=sub.title,
        entity_type=sub.entity_type,
        entity_id=sub.entity_id,
        department=sub.department,
        submitted_by_user_id=sub.submitted_by_user_id,
        submitter_name=submitter_name,
        submitter_email=submitter_email,
        academic_year_id=sub.academic_year_id,
        status=sub.status,
        data_payload=sub.data_payload,
        document_reference=sub.document_reference,
        reviewer_comments=sub.reviewer_comments,
        reviewed_by_user_id=sub.reviewed_by_user_id,
        reviewer_name=reviewer_name,
        reviewed_at=sub.reviewed_at,
        created_at=sub.created_at,
        updated_at=sub.updated_at,
    )


# =============================================================================
# 1. CREATE SUBMISSION (Faculty or HOD)
# =============================================================================

@router.post(
    "",
    response_model=SubmissionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit record for verification (Faculty/HOD)",
)
def create_submission(
    payload: SubmissionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SubmissionResponse:
    # Determine department
    user_dept = "Computer Science and Engineering"
    if current_user.faculty_profile and current_user.faculty_profile.department:
        user_dept = current_user.faculty_profile.department
    elif payload.department:
        user_dept = payload.department

    sub = WorkflowSubmission(
        criterion_code=payload.criterion_code.upper().strip(),
        sub_requirement=payload.sub_requirement.strip(),
        title=payload.title.strip(),
        entity_type=payload.entity_type.upper().strip(),
        entity_id=payload.entity_id,
        department=user_dept,
        submitted_by_user_id=current_user.id,
        academic_year_id=payload.academic_year_id,
        status=SubmissionStatus.SUBMITTED.value,
        data_payload=payload.data_payload,
        document_reference=payload.document_reference,
    )
    db.add(sub)
    db.flush()

    # Record Audit Log
    audit = AuditLog(
        user_id=current_user.id,
        action="SUBMISSION_CREATED",
        entity_type=sub.entity_type,
        entity_id=str(sub.id),
        department=user_dept,
        details=f"Submitted '{sub.title}' for {sub.criterion_code} ({sub.sub_requirement})",
    )
    db.add(audit)

    # Notify Department HOD users
    hod_users = (
        db.query(User)
        .join(User.roles)
        .filter(User.roles.any(name=UserRoleName.HOD.value))
        .all()
    )
    submitter_display = (
        current_user.faculty_profile.full_name
        if current_user.faculty_profile
        else current_user.email
    )
    for hod in hod_users:
        notif = Notification(
            user_id=hod.id,
            title=f"New {sub.criterion_code} Submission",
            message=f"{submitter_display} submitted '{sub.title}' for verification.",
            notification_type=NotificationType.SYSTEM.value,
            link_url="/dashboards/hod.html#tab-pending-approvals",
        )
        db.add(notif)

    db.commit()
    db.refresh(sub)
    return _to_submission_response(sub)


# =============================================================================
# 2. LIST SUBMISSIONS (Role-Scoped)
# =============================================================================

@router.get(
    "",
    response_model=List[SubmissionResponse],
    summary="List submissions (Scoped by Role & Department)",
)
def list_submissions(
    status_filter: Optional[str] = Query(None, alias="status"),
    criterion_code: Optional[str] = Query(None),
    department: Optional[str] = Query(None),
    my_only: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> List[SubmissionResponse]:
    isAdmin = current_user.has_role(UserRoleName.ADMIN.value)
    isHod = current_user.has_role(UserRoleName.HOD.value) and not isAdmin
    isFaculty = not isAdmin and not isHod

    query = db.query(WorkflowSubmission)

    # Scope filtering
    if isFaculty or my_only:
        query = query.filter(WorkflowSubmission.submitted_by_user_id == current_user.id)
    elif isHod:
        dept = (
            current_user.faculty_profile.department
            if current_user.faculty_profile
            else "Computer Science and Engineering"
        )
        query = query.filter(WorkflowSubmission.department == dept)
    elif isAdmin and department:
        query = query.filter(WorkflowSubmission.department == department)

    if status_filter:
        query = query.filter(WorkflowSubmission.status == status_filter.upper())
    if criterion_code:
        query = query.filter(WorkflowSubmission.criterion_code == criterion_code.upper())

    records = query.order_by(WorkflowSubmission.created_at.desc()).all()
    return [_to_submission_response(r) for r in records]


# =============================================================================
# 3. GET SUBMISSION DETAILS
# =============================================================================

@router.get(
    "/{submission_id}",
    response_model=SubmissionResponse,
    summary="Get submission by ID",
)
def get_submission(
    submission_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SubmissionResponse:
    sub = db.query(WorkflowSubmission).filter(WorkflowSubmission.id == submission_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found.")

    # Permissions check
    isAdmin = current_user.has_role(UserRoleName.ADMIN.value)
    isHod = current_user.has_role(UserRoleName.HOD.value)
    isOwner = sub.submitted_by_user_id == current_user.id

    if not (isAdmin or isHod or isOwner):
        raise HTTPException(status_code=403, detail="Not authorized to view this submission.")

    return _to_submission_response(sub)


# =============================================================================
# 4. APPROVE SUBMISSION (HOD / Admin)
# =============================================================================

@router.post(
    "/{submission_id}/approve",
    response_model=SubmissionResponse,
    summary="Approve submission (HOD/Admin)",
)
def approve_submission(
    submission_id: uuid.UUID,
    body: Optional[SubmissionReview] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRoleName.HOD.value, UserRoleName.ADMIN.value)),
) -> SubmissionResponse:
    sub = db.query(WorkflowSubmission).filter(WorkflowSubmission.id == submission_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found.")

    if sub.status == SubmissionStatus.APPROVED.value:
        raise HTTPException(status_code=400, detail="Submission is already approved and locked.")

    sub.status = SubmissionStatus.APPROVED.value
    sub.reviewed_by_user_id = current_user.id
    sub.reviewed_at = datetime.now(timezone.utc)
    if body and body.comments:
        sub.reviewer_comments = body.comments.strip()

    # Audit log
    audit = AuditLog(
        user_id=current_user.id,
        action="SUBMISSION_APPROVED",
        entity_type=sub.entity_type,
        entity_id=str(sub.id),
        department=sub.department,
        details=f"Approved submission '{sub.title}' ({sub.criterion_code})",
    )
    db.add(audit)

    # Notify faculty owner
    reviewer_name = (
        current_user.faculty_profile.full_name
        if current_user.faculty_profile
        else current_user.email
    )
    notif = Notification(
        user_id=sub.submitted_by_user_id,
        title=f"Submission Approved: {sub.criterion_code}",
        message=f"Your submission '{sub.title}' was approved by {reviewer_name}. Record is locked.",
        notification_type=NotificationType.SYSTEM.value,
        link_url="/dashboards/faculty.html#tab-faculty-uploads",
    )
    db.add(notif)

    db.commit()
    db.refresh(sub)
    return _to_submission_response(sub)


# =============================================================================
# 5. REJECT SUBMISSION (HOD / Admin)
# =============================================================================

@router.post(
    "/{submission_id}/reject",
    response_model=SubmissionResponse,
    summary="Reject submission (HOD/Admin)",
)
def reject_submission(
    submission_id: uuid.UUID,
    body: Optional[SubmissionReview] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRoleName.HOD.value, UserRoleName.ADMIN.value)),
) -> SubmissionResponse:
    sub = db.query(WorkflowSubmission).filter(WorkflowSubmission.id == submission_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found.")

    sub.status = SubmissionStatus.REJECTED.value
    sub.reviewed_by_user_id = current_user.id
    sub.reviewed_at = datetime.now(timezone.utc)
    if body and body.comments:
        sub.reviewer_comments = body.comments.strip()

    audit = AuditLog(
        user_id=current_user.id,
        action="SUBMISSION_REJECTED",
        entity_type=sub.entity_type,
        entity_id=str(sub.id),
        department=sub.department,
        details=f"Rejected '{sub.title}'. Comments: {sub.reviewer_comments}",
    )
    db.add(audit)

    notif = Notification(
        user_id=sub.submitted_by_user_id,
        title=f"Submission Rejected: {sub.criterion_code}",
        message=f"Submission '{sub.title}' was rejected. Reason: {sub.reviewer_comments or 'Criteria not satisfied'}.",
        notification_type=NotificationType.SYSTEM.value,
        link_url="/dashboards/faculty.html#tab-faculty-revisions",
    )
    db.add(notif)

    db.commit()
    db.refresh(sub)
    return _to_submission_response(sub)


# =============================================================================
# 6. REQUEST REVISION (HOD / Admin)
# =============================================================================

@router.post(
    "/{submission_id}/request-revision",
    response_model=SubmissionResponse,
    summary="Request corrections/revision from submitter (HOD/Admin)",
)
def request_revision(
    submission_id: uuid.UUID,
    body: SubmissionReview,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRoleName.HOD.value, UserRoleName.ADMIN.value)),
) -> SubmissionResponse:
    if not body.comments or not body.comments.strip():
        raise HTTPException(
            status_code=400,
            detail="Specific reviewer comments are mandatory when requesting revision.",
        )

    sub = db.query(WorkflowSubmission).filter(WorkflowSubmission.id == submission_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found.")

    sub.status = SubmissionStatus.REVISION_REQUESTED.value
    sub.reviewer_comments = body.comments.strip()
    sub.reviewed_by_user_id = current_user.id
    sub.reviewed_at = datetime.now(timezone.utc)

    audit = AuditLog(
        user_id=current_user.id,
        action="REVISION_REQUESTED",
        entity_type=sub.entity_type,
        entity_id=str(sub.id),
        department=sub.department,
        details=f"Requested revision on '{sub.title}'. Note: {sub.reviewer_comments}",
    )
    db.add(audit)

    reviewer_name = (
        current_user.faculty_profile.full_name
        if current_user.faculty_profile
        else current_user.email
    )
    notif = Notification(
        user_id=sub.submitted_by_user_id,
        title=f"Action Required: Revision for {sub.criterion_code}",
        message=f"{reviewer_name} requested corrections on '{sub.title}': {sub.reviewer_comments}",
        notification_type=NotificationType.SYSTEM.value,
        link_url="/dashboards/faculty.html#tab-faculty-revisions",
    )
    db.add(notif)

    db.commit()
    db.refresh(sub)
    return _to_submission_response(sub)


# =============================================================================
# 7. RESUBMIT (Faculty Owner)
# =============================================================================

@router.post(
    "/{submission_id}/resubmit",
    response_model=SubmissionResponse,
    summary="Resubmit record after making revisions (Faculty)",
)
def resubmit_record(
    submission_id: uuid.UUID,
    payload: Optional[SubmissionResubmit] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SubmissionResponse:
    sub = db.query(WorkflowSubmission).filter(WorkflowSubmission.id == submission_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found.")

    if sub.submitted_by_user_id != current_user.id and not current_user.has_role(UserRoleName.ADMIN.value):
        raise HTTPException(status_code=403, detail="Only the owner can resubmit this item.")

    if payload:
        if payload.title:
            sub.title = payload.title.strip()
        if payload.data_payload:
            sub.data_payload = payload.data_payload
        if payload.document_reference:
            sub.document_reference = payload.document_reference

    sub.status = SubmissionStatus.SUBMITTED.value
    sub.updated_at = datetime.now(timezone.utc)

    audit = AuditLog(
        user_id=current_user.id,
        action="SUBMISSION_RESUBMITTED",
        entity_type=sub.entity_type,
        entity_id=str(sub.id),
        department=sub.department,
        details=f"Resubmitted corrected version of '{sub.title}'",
    )
    db.add(audit)

    # Notify HOD
    hod_users = (
        db.query(User)
        .join(User.roles)
        .filter(User.roles.any(name=UserRoleName.HOD.value))
        .all()
    )
    submitter_display = (
        current_user.faculty_profile.full_name
        if current_user.faculty_profile
        else current_user.email
    )
    for hod in hod_users:
        notif = Notification(
            user_id=hod.id,
            title=f"Resubmitted: {sub.criterion_code}",
            message=f"{submitter_display} resubmitted '{sub.title}' for verification.",
            notification_type=NotificationType.SYSTEM.value,
            link_url="/dashboards/hod.html#tab-pending-approvals",
        )
        db.add(notif)

    db.commit()
    db.refresh(sub)
    return _to_submission_response(sub)


# =============================================================================
# 8. ADMINISTRATIVE OVERRIDE (Admin Only)
# =============================================================================

@router.post(
    "/{submission_id}/override",
    response_model=SubmissionResponse,
    summary="Administrative override with mandatory reason (Admin Only)",
)
def override_submission(
    submission_id: uuid.UUID,
    body: SubmissionOverride,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRoleName.ADMIN.value)),
) -> SubmissionResponse:
    sub = db.query(WorkflowSubmission).filter(WorkflowSubmission.id == submission_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found.")

    old_status = sub.status
    sub.status = body.status.upper().strip()
    sub.reviewed_by_user_id = current_user.id
    sub.reviewed_at = datetime.now(timezone.utc)
    sub.reviewer_comments = f"[ADMIN OVERRIDE] {body.reason.strip()}"

    audit = AuditLog(
        user_id=current_user.id,
        action="ADMIN_OVERRIDE",
        entity_type=sub.entity_type,
        entity_id=str(sub.id),
        department=sub.department,
        details=f"Override from {old_status} to {sub.status}",
        reason=body.reason.strip(),
    )
    db.add(audit)

    db.commit()
    db.refresh(sub)
    return _to_submission_response(sub)


# =============================================================================
# 9. AUDIT LOGS (Admin & HOD)
# =============================================================================

@router.get(
    "/audit-logs/all",
    response_model=List[AuditLogResponse],
    summary="Retrieve system audit logs",
)
def list_audit_logs(
    limit: int = Query(50, ge=1, le=200),
    department: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRoleName.HOD.value, UserRoleName.ADMIN.value)),
) -> List[AuditLogResponse]:
    isAdmin = current_user.has_role(UserRoleName.ADMIN.value)
    query = db.query(AuditLog)

    if not isAdmin:
        dept = (
            current_user.faculty_profile.department
            if current_user.faculty_profile
            else "Computer Science and Engineering"
        )
        query = query.filter(AuditLog.department == dept)
    elif department:
        query = query.filter(AuditLog.department == department)

    logs = query.order_by(AuditLog.created_at.desc()).limit(limit).all()

    resp = []
    for log in logs:
        user_email = log.user.email if log.user else "System"
        resp.append(
            AuditLogResponse(
                id=log.id,
                user_id=log.user_id,
                user_email=user_email,
                action=log.action,
                entity_type=log.entity_type,
                entity_id=log.entity_id,
                department=log.department,
                details=log.details,
                reason=log.reason,
                created_at=log.created_at,
            )
        )
    return resp
