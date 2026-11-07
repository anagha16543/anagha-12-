"""
tests/test_phase6_inspection_and_inputs.py

Virtual NBA Inspection, saved manual inputs, auto-built evaluation context,
and the widened evidence file types.
"""

from __future__ import annotations

import io
import zipfile
from datetime import date

import pytest
from sqlalchemy.orm import Session

from app.models.academic import AcademicYear
from app.models.faculty import FacultyProfile
from app.models.faculty_data import FacultyQualification
from app.models.phase4 import NBARequirement
from app.models.user import User, UserAccountStatus
from app.services.storage_service import detect_mime

DEPT = "Computer Science and Engineering"


@pytest.fixture
def nba_year(db_session: Session) -> AcademicYear:
    """seed_database() already creates the active year and the NBA requirements."""
    return db_session.query(AcademicYear).filter(AcademicYear.is_active.is_(True)).one()


def _req(db: Session, code: str) -> NBARequirement:
    return db.query(NBARequirement).filter(NBARequirement.code == code).one()


class TestInspection:
    def test_requires_hod_or_admin(self, db_client, nba_year, faculty_headers):
        assert db_client.post("/api/v1/inspection/run", json={}, headers=faculty_headers).status_code == 403

    def test_empty_department_is_not_ready(self, db_client, nba_year, hod_headers):
        res = db_client.post("/api/v1/inspection/run", json={}, headers=hod_headers)
        assert res.status_code == 200
        body = res.json()
        assert body["status"] == "NOT_READY"
        assert body["passed"] == 0
        assert body["total_requirements"] > 0
        assert {c["criterion_code"] for c in body["criteria"]} == {
            "CRITERION_3", "CRITERION_4", "CRITERION_5", "CRITERION_6"
        }
        assert "not an official NBA score" in body["disclaimer"]

    def test_faculty_records_change_criterion5_result(self, db_client, db_session, nba_year, hod_headers):
        for i in range(2):
            user = User(email=f"phd{i}@example.com", hashed_password="x", status=UserAccountStatus.ACTIVE.value)
            db_session.add(user)
            db_session.flush()
            fp = FacultyProfile(
                user_id=user.id, faculty_id=f"F{i}", full_name=f"Dr {i}", designation="Professor", department=DEPT,
            )
            db_session.add(fp)
            db_session.flush()
            db_session.add(FacultyQualification(
                faculty_profile_id=fp.id, degree="Ph.D", field_of_study="CS",
                institution="X", university="Y", year_of_passing=2010,
            ))
        db_session.commit()
        body = db_client.post("/api/v1/inspection/run", json={}, headers=hod_headers).json()
        c5 = next(c for c in body["criteria"] if c["criterion_code"] == "CRITERION_5")
        assert c5["marks_attained"] > 0


class TestManualInputs:
    def test_saved_input_unblocks_rule(self, db_client, db_session, nba_year, hod_headers):
        req = _req(db_session, "REQ_3_2")
        before = db_client.get(f"/api/v1/requirements/{req.id}/inputs", headers=hod_headers).json()
        assert "reviewer_score" in before["missing_keys"]

        saved = db_client.put(
            f"/api/v1/requirements/{req.id}/inputs", json={"data": {"reviewer_score": 8}}, headers=hod_headers
        ).json()
        assert saved["missing_keys"] == []

        ev = db_client.post(f"/api/v1/requirements/{req.id}/evaluate", json={}, headers=hod_headers).json()
        assert ev["status"] == "PASS"
        assert ev["score_attained"] == 8

    def test_faculty_cannot_save_inputs(self, db_client, db_session, nba_year, faculty_headers):
        req = _req(db_session, "REQ_3_2")
        res = db_client.put(
            f"/api/v1/requirements/{req.id}/inputs", json={"data": {"reviewer_score": 10}}, headers=faculty_headers
        )
        assert res.status_code == 403

    def test_evaluate_without_year_or_context(self, db_client, db_session, nba_year, hod_headers):
        req = _req(db_session, "REQ_5_1")
        res = db_client.post(f"/api/v1/requirements/{req.id}/evaluate", json={}, headers=hod_headers)
        assert res.status_code == 201


def _zip_with(name: str) -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as z:
        z.writestr(name, "<x/>")
    return buf.getvalue()


class TestEvidenceFileTypes:
    def test_docx_and_xlsx_detected_by_content(self):
        assert detect_mime(_zip_with("word/document.xml"), ".docx").endswith("wordprocessingml.document")
        assert detect_mime(_zip_with("xl/workbook.xml"), ".xlsx").endswith("spreadsheetml.sheet")

    def test_zip_renamed_to_docx_is_rejected(self):
        assert detect_mime(_zip_with("random.txt"), ".docx") is None

    def test_csv_requires_text_content(self):
        assert detect_mime(b"a,b\n1,2\n", ".csv") == "text/csv"
        assert detect_mime(b"\xff\xfe\x00\x01", ".csv") is None


class TestAttainment:
    def test_weak_co_is_flagged_and_strong_is_not(self, db_session, nba_year):
        from app.models.academic import Subject
        from app.models.curriculum import AssessmentScheme, CourseOutcome, Student, StudentAssessmentMark
        from app.services.attainment_service import compute_attainment

        subj = Subject(code="T1", name="Test", semester=1, academic_year_id=nba_year.id, department=DEPT, credits=3)
        db_session.add(subj)
        db_session.flush()
        co = CourseOutcome(code="T1.CO1", description="d", subject_id=subj.id)
        scheme = AssessmentScheme(subject_id=subj.id, name="CIE", assessment_type="CIE", max_marks=100, weightage=1)
        db_session.add_all([co, scheme])
        db_session.flush()
        # 10 students: 4 score 80 (meet 60% target), 6 score 30 -> 40% attainment -> level 0 -> weak
        for n in range(10):
            st = Student(usn=f"U{n}", full_name=f"S{n}", email=f"s{n}@x.com", department=DEPT,
                         current_semester=1, academic_year_id=nba_year.id)
            db_session.add(st)
            db_session.flush()
            db_session.add(StudentAssessmentMark(student_id=st.id, subject_id=subj.id,
                                                 assessment_scheme_id=scheme.id,
                                                 marks_obtained=80 if n < 4 else 30, max_marks=100))
        db_session.commit()
        result = compute_attainment(db_session, DEPT, nba_year.id)
        course = result["courses"][0]
        assert course["attainment_percent"] == 40.0
        assert course["level"] == 0
        assert [w["co_code"] for w in result["weak_course_outcomes"]] == ["T1.CO1"]


class TestKeywordSearchFallback:
    def test_ranks_matching_document_first(self):
        from app.services.rag_service import _keyword_score, _query_terms

        terms = _query_terms("SDG zero hunger")
        sdg = _keyword_score(terms, "Mapping to SDG 2 Zero Hunger for crop project", "sdg.docx")
        other = _keyword_score(terms, "Question paper with Bloom levels", "paper.pdf")
        assert sdg > other == 0.0

    def test_stopwords_and_plurals_are_ignored(self):
        from app.services.rag_service import _query_terms

        assert _query_terms("What are the experiments") == ["experiment"]


class TestEvidenceLinkPermission:
    def _upload(self, client, headers, year):
        import io

        res = client.post(
            f"/api/v1/documents/upload?academic_year_id={year.id}&department=CSE",
            files={"file": ("notes.csv", io.BytesIO(b"a,b\n1,2\n"), "text/csv")},
            headers=headers,
        )
        assert res.status_code in (200, 201), res.text
        return res.json()["document_id"]

    def test_uploader_can_link_but_other_faculty_cannot(
        self, db_client, db_session, nba_year, faculty_headers, second_faculty_headers
    ):
        doc_id = self._upload(db_client, faculty_headers, nba_year)
        req = _req(db_session, "REQ_3_1")
        url = f"/api/v1/documents/requirements/{req.id}/evidence"
        assert db_client.post(url, json={"document_id": doc_id}, headers=second_faculty_headers).status_code == 403
        assert db_client.post(url, json={"document_id": doc_id}, headers=faculty_headers).status_code == 201


class TestActionAssignmentNotification:
    def test_assigning_action_notifies_assignee(
        self, db_client, db_session, nba_year, hod_headers, active_faculty_user
    ):
        from app.models.phase4 import NBARequirement
        from app.models.phase5 import Notification

        req = _req(db_session, "REQ_3_1")
        gap = db_client.post(
            "/api/v1/gaps",
            json={
                "requirement_id": str(req.id), "criterion_id": str(req.criterion_id),
                "academic_year_id": str(nba_year.id), "department": DEPT,
                "title": "Gap", "description": "A test gap", "severity": "HIGH",
            },
            headers=hod_headers,
        )
        assert gap.status_code in (200, 201), gap.text
        res = db_client.post(
            f"/api/v1/gaps/{gap.json()['id']}/actions",
            json={"title": "Fix it", "description": "Do the work", "priority": "HIGH",
                  "assigned_to_user_id": str(active_faculty_user.id)},
            headers=hod_headers,
        )
        assert res.status_code in (200, 201), res.text
        notes = db_session.query(Notification).filter(Notification.user_id == active_faculty_user.id).all()
        assert [n.title for n in notes] == ["New Corrective Action Assigned"]


class TestFacultyQualificationCountsPeopleNotDegrees:
    def test_phd_with_mtech_counts_once_as_phd(self, db_session, nba_year):
        from app.models.faculty import FacultyProfile
        from app.models.faculty_data import FacultyQualification
        from app.models.user import User, UserAccountStatus
        from app.services.criteria_context_service import get_c5_context

        user = User(email="dual@example.com", hashed_password="x", status=UserAccountStatus.ACTIVE.value)
        db_session.add(user)
        db_session.flush()
        fp = FacultyProfile(user_id=user.id, faculty_id="D1", full_name="Dr Dual", designation="Professor", department=DEPT)
        db_session.add(fp)
        db_session.flush()
        for degree in ("Ph.D", "M.Tech"):
            db_session.add(FacultyQualification(faculty_profile_id=fp.id, degree=degree, field_of_study="CS",
                                                institution="X", university="Y", year_of_passing=2010))
        db_session.commit()
        ctx = get_c5_context(db_session, DEPT, nba_year.id)
        assert (ctx["X"], ctx["Y"]) == (1, 0)


class TestFilenameCleaningIsOsIndependent:
    def test_windows_and_unix_paths_reduce_to_the_file_name(self):
        from app.services.storage_service import sanitize_original_filename as clean

        assert clean(r"C:\Users\Anagha Rao\Desktop\3.1 Course File (final).pdf") == "3.1 Course File (final).pdf"
        assert clean(r"..\..\windows\system32\evil.pdf") == "evil.pdf"
        assert clean("../../etc/passwd.pdf") == "passwd.pdf"
        assert clean("report 2026-27.docx") == "report 2026-27.docx"
        assert clean("..") == "unnamed_file"
