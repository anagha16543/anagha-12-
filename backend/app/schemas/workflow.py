"""
AI-NBA Readiness System — Backend
app/schemas/workflow.py

Pydantic schemas for submissions, approval workflow, and audit logs.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field


class SubmissionCreate(BaseModel):
    """Payload to create a new submission for verification."""
    criterion_code: str = Field(..., min_length=2, max_length=10, description="e.g. C3, C4, C5, C6")
    sub_requirement: str = Field(default="General", max_length=50, description="e.g. 3.2, 5.1, 6.2")
    title: str = Field(..., min_length=3, max_length=255)
    entity_type: str = Field(..., min_length=2, max_length=100, description="e.g. COURSE_ASSESSMENT, FACULTY_PROFILE, PUBLICATION")
    entity_id: Optional[str] = Field(None, max_length=100)
    department: Optional[str] = Field(None, max_length=100)
    academic_year_id: Optional[uuid.UUID] = None
    data_payload: Optional[Dict[str, Any]] = None
    document_reference: Optional[str] = Field(None, max_length=500)


class SubmissionReview(BaseModel):
    """Review action comments."""
    comments: Optional[str] = Field(None, description="Reviewer feedback or required corrections")


class SubmissionResubmit(BaseModel):
    """Payload to resubmit an item with corrections."""
    title: Optional[str] = Field(None, min_length=3, max_length=255)
    data_payload: Optional[Dict[str, Any]] = None
    document_reference: Optional[str] = Field(None, max_length=500)


class SubmissionOverride(BaseModel):
    """Administrative override payload."""
    status: str = Field(..., description="Target status: APPROVED, REJECTED, REVISION_REQUESTED")
    reason: str = Field(..., min_length=5, description="Administrative override reason for audit record")


class SubmissionResponse(BaseModel):
    """Detailed response for a workflow submission."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    criterion_code: str
    sub_requirement: str
    title: str
    entity_type: str
    entity_id: Optional[str] = None
    department: str
    submitted_by_user_id: uuid.UUID
    submitter_name: Optional[str] = None
    submitter_email: Optional[str] = None
    academic_year_id: Optional[uuid.UUID] = None
    status: str
    data_payload: Optional[Dict[str, Any]] = None
    document_reference: Optional[str] = None
    reviewer_comments: Optional[str] = None
    reviewed_by_user_id: Optional[uuid.UUID] = None
    reviewer_name: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


class AuditLogResponse(BaseModel):
    """Audit log entry response."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: Optional[uuid.UUID] = None
    user_email: Optional[str] = None
    action: str
    entity_type: str
    entity_id: Optional[str] = None
    department: Optional[str] = None
    details: Optional[str] = None
    reason: Optional[str] = None
    created_at: datetime
