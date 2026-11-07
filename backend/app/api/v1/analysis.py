"""
AI-NBA Readiness System — Backend
app/api/v1/analysis.py

RAG retrieval and AI-assisted analysis endpoints.

Authorization: any authenticated user may query RAG.
              AI analysis triggering: HOD or ADMIN.

Security:
    - AI findings never set requirement status.
    - Citations validated against actually retrieved chunks.
    - API keys are not logged or returned.
"""

from __future__ import annotations

import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_roles
from app.db.session import get_db
from app.models.phase4 import NBARequirement, RequirementEvaluation, EvaluationMode
from app.models.user import UserRoleName
from app.schemas.phase4 import (
    AIAnalysisOut,
    AIAnalysisTriggerIn,
    ChunkMatchOut,
    RAGQueryIn,
    RAGQueryOut,
)
from app.services.agent_client import (
    AgentAnalysisRequest,
    EvidencePassage,
    call_agent,
)
from app.services.rag_service import retrieve_relevant_chunks

router = APIRouter(prefix="/analysis", tags=["AI Analysis & RAG"])


# ---------------------------------------------------------------------------
# RAG Retrieval
# ---------------------------------------------------------------------------

@router.post(
    "/retrieve",
    response_model=RAGQueryOut,
    summary="Retrieve relevant document chunks (RAG)",
)
def retrieve_chunks(
    body: RAGQueryIn,
    db: Session = Depends(get_db),
    _: object = Depends(get_current_user),
):
    """
    Semantic retrieval of document chunks for a query.
    On PostgreSQL with pgvector: cosine similarity.
    On SQLite (test mode): recency fallback (no ranking).
    Deleted documents are always excluded.
    """
    from app.services.rag_service import _get_embedding_settings, generate_embedding

    emb_settings = _get_embedding_settings()
    test_vec = generate_embedding("test", emb_settings)
    embedding_available = test_vec is not None

    matches = retrieve_relevant_chunks(
        db=db,
        query_text=body.query,
        top_k=body.top_k,
        department=body.department,
        academic_year_id=body.academic_year_id,
        criterion_code=body.criterion_code,
    )

    results = [
        ChunkMatchOut(
            chunk_id=m.chunk_id,
            document_id=m.document_id,
            document_name=m.document_name,
            page_number=m.page_number,
            section_heading=m.section_heading,
            content=m.content,
            similarity_score=m.similarity_score,
        )
        for m in matches
    ]

    return RAGQueryOut(
        query=body.query,
        results=results,
        total=len(results),
        embedding_available=embedding_available,
    )


# ---------------------------------------------------------------------------
# AI-Assisted Analysis
# ---------------------------------------------------------------------------

@router.post(
    "/ai-analysis",
    response_model=AIAnalysisOut,
    summary="Trigger AI-assisted analysis for a requirement",
)
def trigger_ai_analysis(
    body: AIAnalysisTriggerIn,
    db: Session = Depends(get_db),
    current_user=Depends(
        require_roles(UserRoleName.HOD.value, UserRoleName.ADMIN.value)
    ),
):
    """
    Retrieve relevant evidence passages and call the AI service for
    qualitative interpretation.

    IMPORTANT: The AI response NEVER sets requirement status.
    Status is determined solely by the deterministic evaluation engine.
    AI findings are stored as advisory context on the latest evaluation only.

    C4, C5, C6: returns UNAVAILABLE if the AI service has not implemented
    those endpoints. The backend deterministic evaluation still applies.
    """
    req = db.query(NBARequirement).filter(
        NBARequirement.id == body.requirement_id
    ).first()
    if not req:
        raise HTTPException(status_code=404, detail="Requirement not found.")

    # Get criterion code
    criterion_code = req.criterion.code if req.criterion else "UNKNOWN"

    from app.models.academic import AcademicYear
    year = db.query(AcademicYear).filter(AcademicYear.id == body.academic_year_id).first()
    if not year:
        raise HTTPException(status_code=404, detail="Academic year not found.")

    # Retrieve relevant passages
    passages = retrieve_relevant_chunks(
        db=db,
        query_text=f"{req.title} {req.description or ''}",
        top_k=body.top_k_passages,
        department=body.department,
        academic_year_id=body.academic_year_id,
    )

    evidence_passages = [
        EvidencePassage(
            passage_id=m.chunk_id,
            document_id=m.document_id,
            document_name=m.document_name,
            page_number=m.page_number,
            section_heading=m.section_heading,
            content=m.content,
        )
        for m in passages
    ]

    # Build deterministic metrics from latest evaluation (if any)
    latest_eval = (
        db.query(RequirementEvaluation)
        .filter(
            RequirementEvaluation.requirement_id == body.requirement_id,
            RequirementEvaluation.academic_year_id == body.academic_year_id,
            RequirementEvaluation.department == body.department,
        )
        .order_by(RequirementEvaluation.evaluated_at.desc())
        .first()
    )

    structured_data = {}
    if latest_eval:
        structured_data = {
            "latest_evaluation_status": latest_eval.status,
            "score_attained": latest_eval.score_attained,
            "max_score": latest_eval.max_score,
            "deterministic_metrics": latest_eval.deterministic_metrics or {},
            "limitations": latest_eval.limitations or [],
        }

    agent_request = AgentAnalysisRequest(
        criterion_code=criterion_code,
        requirement_code=req.code,
        academic_year=year.name,
        department=body.department,
        analysis_task=body.analysis_task,
        structured_data=structured_data,
        evidence_passages=evidence_passages,
    )

    agent_response = call_agent(agent_request)

    # Optionally persist AI findings to the latest evaluation (advisory only)
    if latest_eval and agent_response.status == "SUCCESS":
        latest_eval.ai_interpretation = agent_response.summary
        latest_eval.ai_findings = {
            "findings": [f.model_dump() for f in agent_response.findings],
            "recommended_actions": agent_response.recommended_actions,
        }
        latest_eval.ai_request_id = agent_response.request_id
        latest_eval.ai_correlation_id = agent_response.correlation_id
        latest_eval.ai_confidence = agent_response.confidence_score
        latest_eval.mode = EvaluationMode.AI_ASSISTED.value
        db.commit()

    return AIAnalysisOut(
        request_id=agent_response.request_id,
        correlation_id=agent_response.correlation_id,
        criterion_code=criterion_code,
        status=agent_response.status,
        summary=agent_response.summary,
        findings=[f.model_dump() for f in agent_response.findings],
        recommended_actions=agent_response.recommended_actions,
        confidence_score=agent_response.confidence_score,
        limitations=agent_response.limitations,
        execution_time_ms=agent_response.execution_time_ms,
        error=agent_response.error,
        ai_drives_compliance=False,   # ALWAYS False
    )


# ---------------------------------------------------------------------------
# CO / PO / PSO attainment (Criterion 3)
# ---------------------------------------------------------------------------

@router.get("/attainment", summary="CO, PO and PSO attainment with weak outcomes")
def get_attainment(
    department: str = "Computer Science and Engineering",
    academic_year_id: Optional[uuid.UUID] = None,
    target_percent: float = 60.0,
    db: Session = Depends(get_db),
    _: object = Depends(get_current_user),
):
    from app.services.attainment_service import compute_attainment
    from app.services.evaluation_service import resolve_academic_year

    year = resolve_academic_year(db, academic_year_id)
    return compute_attainment(db, department, year.id, target_percent)


# ---------------------------------------------------------------------------
# At-risk students (Criterion 4)
# ---------------------------------------------------------------------------

@router.get("/at-risk-students", summary="Students who may need support (attendance / marks indicators)")
def get_at_risk_students(
    department: str = "Computer Science and Engineering",
    academic_year_id: Optional[uuid.UUID] = None,
    min_attendance: float = 75.0,
    min_marks_percent: float = 40.0,
    db: Session = Depends(get_db),
    _: object = Depends(get_current_user),
):
    """
    Deterministic indicators only: a student is listed when average attendance is
    below `min_attendance` or overall marks are below `min_marks_percent`.
    """
    from sqlalchemy import func

    from app.models.curriculum import AttendanceRecord, Student, StudentAssessmentMark
    from app.services.evaluation_service import resolve_academic_year

    year = resolve_academic_year(db, academic_year_id)
    students = db.query(Student).filter(Student.department == department).all()
    att = dict(
        db.query(AttendanceRecord.student_id, func.avg(AttendanceRecord.attendance_percentage))
        .filter(AttendanceRecord.academic_year_id == year.id)
        .group_by(AttendanceRecord.student_id)
        .all()
    )
    marks = {
        sid: (got / mx * 100.0 if mx else None)
        for sid, got, mx in db.query(
            StudentAssessmentMark.student_id,
            func.sum(StudentAssessmentMark.marks_obtained),
            func.sum(StudentAssessmentMark.max_marks),
        )
        .group_by(StudentAssessmentMark.student_id)
        .all()
    }
    flagged = []
    for s in students:
        a, m = att.get(s.id), marks.get(s.id)
        reasons = []
        if a is not None and a < min_attendance:
            reasons.append(f"Average attendance {a:.1f}% is below {min_attendance:.0f}%")
        if m is not None and m < min_marks_percent:
            reasons.append(f"Overall marks {m:.1f}% are below {min_marks_percent:.0f}%")
        if reasons:
            flagged.append({
                "usn": s.usn, "name": s.full_name, "semester": s.current_semester,
                "average_attendance": round(a, 1) if a is not None else None,
                "overall_marks_percent": round(m, 1) if m is not None else None,
                "reasons": reasons,
            })
    flagged.sort(key=lambda r: (r["overall_marks_percent"] if r["overall_marks_percent"] is not None else 999))
    return {
        "department": department,
        "total_students": len(students),
        "at_risk_count": len(flagged),
        "indicators": {"min_attendance": min_attendance, "min_marks_percent": min_marks_percent},
        "students": flagged,
    }
