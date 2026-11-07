"""
AI-NBA Readiness System — Backend
app/db/seed_demo.py

Loads a small, realistic sample department so every criterion (3, 4, 5, 6) has
data to evaluate.  Safe to run more than once; it skips when the sample exists.

Usage:
    python -m app.db.seed_demo
Sample logins (password: password123):  faculty1@college.edu ... faculty6@college.edu
"""

from __future__ import annotations

import logging
import random
from datetime import date

from app.core.security import get_password_hash
from app.db.seed import seed_database
from app.db.session import SessionLocal
from app.models.academic import AcademicYear, FacultySubjectAssignment, Subject
from app.models.curriculum import (
    AssessmentScheme,
    AttendanceRecord,
    COPOMapping,
    COPSOMapping,
    CourseOutcome,
    FeedbackSurvey,
    ProgramOutcome,
    ProgramSpecificOutcome,
    Student,
    StudentAssessmentMark,
    SubjectEnrolment,
)
from app.models.faculty import FacultyProfile
from app.models.faculty_data import (
    FacultyConsultancy,
    FacultyContribution,
    FacultyExperience,
    FacultyPatent,
    FacultyProject,
    FacultyPublication,
    FacultyQualification,
    FacultyTraining,
)
from app.models.user import Role, User, UserAccountStatus, UserRoleName

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
log = logging.getLogger("seed_demo")

DEPT = "Computer Science and Engineering"
PASSWORD = "password123"

FACULTY = [
    ("Dr. Ananya Rao", "Professor", "Ph.D", "Machine Learning"),
    ("Dr. Rajesh Kumar", "Professor", "Ph.D", "Computer Networks"),
    ("Dr. Meera Nair", "Associate Professor", "Ph.D", "Data Mining"),
    ("Prof. Suresh Patil", "Associate Professor", "M.Tech", "Software Engineering"),
    ("Prof. Divya Shetty", "Assistant Professor", "M.Tech", "Databases"),
    ("Prof. Arjun Gowda", "Assistant Professor", "M.Tech", "Operating Systems"),
]

SUBJECTS = [
    ("CS501", "Machine Learning", 5), ("CS502", "Computer Networks", 5),
    ("CS503", "Database Systems", 5), ("CS504", "Software Engineering", 5),
    ("CS505", "Operating Systems", 5),
]

PO_TEXT = [
    "Engineering knowledge", "Problem analysis", "Design/development of solutions",
    "Investigation of complex problems", "Modern tool usage", "The engineer and society",
    "Environment and sustainability", "Ethics", "Individual and team work",
    "Communication", "Project management and finance", "Life-long learning",
]


def run() -> None:
    seed_database()
    db = SessionLocal()
    random.seed(7)
    try:
        if db.query(User).filter(User.email == "faculty1@college.edu").first():
            log.info("Sample department already loaded. Nothing to do.")
            return
        year = db.query(AcademicYear).filter(AcademicYear.is_active.is_(True)).first()
        fac_role = db.query(Role).filter(Role.name == UserRoleName.FACULTY.value).first()

        # ---- Faculty (Criterion 5 and 6 source data) -------------------------
        profiles = []
        for i, (name, desig, degree, field) in enumerate(FACULTY, start=1):
            user = User(
                email=f"faculty{i}@college.edu",
                hashed_password=get_password_hash(PASSWORD),
                status=UserAccountStatus.ACTIVE.value,
            )
            user.roles.append(fac_role)
            db.add(user)
            db.flush()
            fp = FacultyProfile(
                user_id=user.id, faculty_id=f"FAC{i:03d}", full_name=name,
                designation=desig, department=DEPT, contact_number=f"98000000{i:02d}",
            )
            db.add(fp)
            db.flush()
            profiles.append(fp)
            db.add(FacultyQualification(
                faculty_profile_id=fp.id, degree=degree, field_of_study=field,
                institution="IISc Bangalore", university="VTU", year_of_passing=2008 + i,
            ))
            if degree == "Ph.D":
                db.add(FacultyQualification(
                    faculty_profile_id=fp.id, degree="M.Tech", field_of_study=field,
                    institution="NIT Surathkal", university="NITK", year_of_passing=2004 + i,
                ))
            db.add(FacultyExperience(
                faculty_profile_id=fp.id, designation=desig, organization="Sample Engineering College",
                experience_type="TEACHING", start_date=date(2012 + i % 3, 7, 1), is_current=True,
            ))
            db.add(FacultyTraining(
                faculty_profile_id=fp.id, academic_year_id=year.id, title=f"FDP on {field}",
                program_type="FDP", organization="Partner University", start_date=date(2026, 6, 10),
                end_date=date(2026, 6, 14), duration_days=5, role="PARTICIPANT",
            ))
            db.add(FacultyContribution(
                faculty_profile_id=fp.id, academic_year_id=year.id, title="Professional society membership",
                category="MEMBERSHIP", description="IEEE / CSI membership",
            ))
            for j in range(2 if i <= 3 else 1):
                db.add(FacultyPublication(
                    faculty_profile_id=fp.id, academic_year_id=year.id,
                    title=f"{field}: approach {j + 1} by {name}", publication_type="JOURNAL",
                    journal_or_conference_name="IEEE Access", publication_date=date(2026, 1 + j, 15),
                    indexing="Scopus",
                ))
            if i <= 2:
                db.add(FacultyPatent(
                    faculty_profile_id=fp.id, title=f"System for {field.lower()}",
                    application_number=f"2026{i}0001", status="Published", filing_date=date(2026, 2, 1),
                ))
                db.add(FacultyProject(
                    faculty_profile_id=fp.id, academic_year_id=year.id, title=f"Funded study on {field}",
                    funding_agency="DST", grant_amount=1200000, status="ONGOING", role="PI",
                    start_date=date(2026, 8, 1),
                ))
            if i == 3:
                db.add(FacultyConsultancy(
                    faculty_profile_id=fp.id, academic_year_id=year.id, project_title="Data platform audit",
                    client_organization="Local Industry Pvt Ltd", financial_outlay=450000, status="COMPLETED",
                    start_date=date(2026, 3, 1), end_date=date(2026, 5, 30),
                ))
        db.flush()

        # ---- Curriculum: outcomes (Criterion 3 source data) ------------------
        pos = [ProgramOutcome(code=f"PO{n}", description=t, department=DEPT, academic_year_id=year.id)
               for n, t in enumerate(PO_TEXT, start=1)]
        psos = [ProgramSpecificOutcome(code=f"PSO{n}", description=d, department=DEPT, academic_year_id=year.id)
                for n, d in enumerate(["Software development", "Data and intelligent systems", "Networks and security"], start=1)]
        db.add_all(pos + psos)
        db.flush()

        # ---- Students ---------------------------------------------------------
        students = []
        for n in range(1, 61):
            students.append(Student(
                usn=f"1XX22CS{n:03d}", full_name=f"Student {n:02d}", email=f"student{n:02d}@college.edu",
                department=DEPT, current_semester=5, academic_year_id=year.id,
            ))
        db.add_all(students)
        db.flush()

        # ---- Subjects, COs, mappings, assessments, marks, attendance ----------
        weak_co = {("CS503", 2)}  # one deliberately weak CO so gap analysis has something to find
        for si, (code, name, sem) in enumerate(SUBJECTS):
            subj = Subject(code=code, name=name, semester=sem, academic_year_id=year.id, department=DEPT, credits=4)
            db.add(subj)
            db.flush()
            db.add(FacultySubjectAssignment(faculty_profile_id=profiles[si % len(profiles)].id, subject_id=subj.id))
            cos = []
            for c in range(1, 4):
                co = CourseOutcome(code=f"{code}.CO{c}", description=f"{name} outcome {c}", subject_id=subj.id)
                db.add(co)
                db.flush()
                cos.append(co)
                db.add(COPOMapping(course_outcome_id=co.id, program_outcome_id=pos[(si + c) % 12].id, correlation_level=random.choice([1, 2, 3])))
                db.add(COPSOMapping(course_outcome_id=co.id, program_specific_outcome_id=psos[c % 3].id, correlation_level=2))
            scheme = AssessmentScheme(subject_id=subj.id, name="CIE-1", assessment_type="CIE", max_marks=50, weightage=0.5)
            see = AssessmentScheme(subject_id=subj.id, name="SEE", assessment_type="SEE", max_marks=100, weightage=0.5)
            db.add_all([scheme, see])
            db.flush()
            for st in students:
                db.add(SubjectEnrolment(student_id=st.id, subject_id=subj.id, academic_year_id=year.id))
                low = (code, 2) in weak_co
                cie = random.randint(18, 28) if low else random.randint(30, 48)
                db.add(StudentAssessmentMark(student_id=st.id, subject_id=subj.id, assessment_scheme_id=scheme.id,
                                             marks_obtained=cie, max_marks=50))
                db.add(StudentAssessmentMark(student_id=st.id, subject_id=subj.id, assessment_scheme_id=see.id,
                                             marks_obtained=random.randint(35, 90), max_marks=100))
                held = 40
                att = random.randint(26, 40)
                db.add(AttendanceRecord(student_id=st.id, subject_id=subj.id, academic_year_id=year.id,
                                        classes_held=held, classes_attended=att,
                                        attendance_percentage=round(att / held * 100, 1)))
            for st in students[:20]:
                db.add(FeedbackSurvey(survey_type="COURSE", subject_id=subj.id, academic_year_id=year.id,
                                      student_id=st.id, stakeholder_type="STUDENT",
                                      rating=random.choice([3, 4, 4, 5]), comments="Sample feedback"))
        db.commit()
        log.info("Sample department loaded: 6 faculty, 60 students, 5 subjects.")
        log.info("Faculty logins: faculty1@college.edu ... faculty6@college.edu / %s", PASSWORD)
    finally:
        db.close()


if __name__ == "__main__":
    run()
