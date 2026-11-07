"""
AI-NBA Readiness System — Backend
api/v1/router.py

Aggregates all v1 API routers into a single APIRouter that is then
mounted on the FastAPI application by main.py.
"""

from __future__ import annotations

from fastapi import APIRouter

from app.api.v1 import (
    analysis,
    auth,
    backups,
    curriculum,
    digital_twin,
    documents,
    faculty_data,
    gaps,
    health,
    inspection,
    notifications,
    reports,
    requirements,
    subjects,
    submissions,
    users,
)

v1_router = APIRouter()

v1_router.include_router(health.router)
v1_router.include_router(auth.router)
v1_router.include_router(users.router)
v1_router.include_router(subjects.router)
v1_router.include_router(faculty_data.router)
v1_router.include_router(curriculum.router)
v1_router.include_router(requirements.router)
v1_router.include_router(requirements.router, prefix="/nba")
v1_router.include_router(documents.router)
v1_router.include_router(analysis.router)
v1_router.include_router(digital_twin.router)
v1_router.include_router(gaps.router)
v1_router.include_router(reports.router)
v1_router.include_router(notifications.router)
v1_router.include_router(backups.router)
v1_router.include_router(submissions.router)
v1_router.include_router(inspection.router)
