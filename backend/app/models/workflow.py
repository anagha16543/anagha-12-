"""
AI-NBA Readiness System — Backend
app/models/workflow.py

Models for Submissions, Approval Workflow, and System Audit Logs.
Supports NBA Criteria 3, 4, 5, and 6 lifecycle:
  DRAFT -> SUBMITTED -> UNDER_REVIEW -> APPROVED / REJECTED / REVISION_REQUESTED
"""

from __future__ import annotations

import enum
import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Optional

from sqlalchemy import (
    DateTime,
    ForeignKey,
    String,
    Text,
    Uuid,
)
from sqlalchemy import JSON as _JSONType
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base

if TYPE_CHECKING:
    from app.models.academic import AcademicYear
    from app.models.user import User


class SubmissionStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    SUBMITTED = "SUBMITTED"
    UNDER_REVIEW = "UNDER_REVIEW"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    REVISION_REQUESTED = "REVISION_REQUESTED"


class WorkflowSubmission(Base):
    """
    Submissions created by faculty for NBA Criteria 3, 4, 5, 6 records
    awaiting review, revision, or approval by HOD / Admin.
    """
    __tablename__ = "workflow_submissions"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    criterion_code: Mapped[str] = mapped_column(String(10), nullable=False, index=True)
    sub_requirement: Mapped[str] = mapped_column(String(50), nullable=False, default="General")
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    entity_type: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    entity_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    department: Mapped[str] = mapped_column(String(100), nullable=False, index=True)

    submitted_by_user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    academic_year_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid, ForeignKey("academic_years.id", ondelete="SET NULL"), nullable=True
    )

    status: Mapped[str] = mapped_column(
        String(30), nullable=False, default=SubmissionStatus.SUBMITTED.value, index=True
    )

    data_payload: Mapped[Optional[dict]] = mapped_column(_JSONType, nullable=True)
    document_reference: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # Review loop
    reviewer_comments: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    reviewed_by_user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    submitter: Mapped["User"] = relationship("User", foreign_keys=[submitted_by_user_id], lazy="selectin")
    reviewer: Mapped[Optional["User"]] = relationship("User", foreign_keys=[reviewed_by_user_id], lazy="selectin")
    academic_year: Mapped[Optional["AcademicYear"]] = relationship("AcademicYear", lazy="selectin")

    def __repr__(self) -> str:
        return f"<WorkflowSubmission(id={self.id}, crit={self.criterion_code}, status={self.status})>"


class AuditLog(Base):
    """
    Immutable audit log recording user modifications, approval actions,
    and administrative overrides across the system.
    """
    __tablename__ = "system_audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    action: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    entity_type: Mapped[str] = mapped_column(String(100), nullable=False)
    entity_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    department: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
    details: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False, index=True
    )

    user: Mapped[Optional["User"]] = relationship("User", foreign_keys=[user_id], lazy="selectin")

    def __repr__(self) -> str:
        return f"<AuditLog(action={self.action}, user={self.user_id}, time={self.created_at})>"
