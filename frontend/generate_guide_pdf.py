import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super(NumberedCanvas, self).showPage()
        super(NumberedCanvas, self).save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica-Bold", 8)
        self.setFillColor(colors.HexColor("#64748B"))
        
        # Header (pages > 1)
        if self._pageNumber > 1:
            self.drawString(54, 752, "AI-NBA READINESS SYSTEM — ROLE DASHBOARDS & SECTIONS REFERENCE")
            self.drawRightString(612 - 54, 752, "NBA TIER-I (2026 EDITION)")
            self.setStrokeColor(colors.HexColor("#CBD5E1"))
            self.setLineWidth(0.6)
            self.line(54, 744, 612 - 54, 744)
            
        # Footer
        page_text = f"Page {self._pageNumber} of {page_count}"
        self.setFont("Helvetica", 8)
        self.drawRightString(612 - 54, 34, page_text)
        self.drawString(54, 34, "NBA ACCREDITATION READINESS MANAGEMENT SYSTEM — CONFIDENTIAL REFERENCE MANUAL")
        self.setStrokeColor(colors.HexColor("#CBD5E1"))
        self.setLineWidth(0.6)
        self.line(54, 46, 612 - 54, 46)
        self.restoreState()

def build_pdf(filename="NBA_Role_Dashboards_Guide.pdf"):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=50,
        rightMargin=50,
        topMargin=50,
        bottomMargin=50
    )
    
    styles = getSampleStyleSheet()
    
    primary_color = colors.HexColor("#0F172A")    # Deep slate
    faculty_color = colors.HexColor("#0D9488")    # Emerald / Teal
    hod_color     = colors.HexColor("#0284C7")    # Sky / Cyan
    admin_color   = colors.HexColor("#7C3AED")    # Purple / Violet
    dark_gray     = colors.HexColor("#334155")
    light_bg      = colors.HexColor("#F8FAFC")
    border_gray   = colors.HexColor("#E2E8F0")

    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=primary_color,
        spaceAfter=4
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubTitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#475569"),
        spaceAfter=10
    )
    
    h1_style = ParagraphStyle(
        'SectionH1',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12.5,
        leading=16,
        textColor=primary_color,
        spaceBefore=10,
        spaceAfter=5
    )

    body_style = ParagraphStyle(
        'BodyDark',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=dark_gray,
        spaceAfter=5
    )

    th_style = ParagraphStyle(
        'TH',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        textColor=colors.white
    )

    tc_num = ParagraphStyle(
        'TCNum',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10.5,
        textColor=colors.HexColor("#0F172A")
    )

    tc_title = ParagraphStyle(
        'TCTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10.5,
        textColor=primary_color
    )

    tc_desc = ParagraphStyle(
        'TCDesc',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=11,
        textColor=dark_gray
    )

    story = []

    # ── HEADER ──
    story.append(Paragraph("AI-NBA Accreditation System — Role Dashboards Guide", title_style))
    story.append(Paragraph("<b>Section-by-Section Blueprint:</b> Complete breakdown of exact sections in Faculty, HOD, and Administrator dashboards, with a one-sentence functional explanation for each section.", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#00F5A0"), spaceAfter=10))

    # ── SECTION 1: AUTHENTICATION WORKFLOW ──
    story.append(Paragraph("1. Common Sign-In Workflow & Automatic Role Redirection", h1_style))
    story.append(Paragraph(
        "<b>Workflow:</b> Users authenticate through a single common login page (<code>/login.html</code>) with email and password (no manual role selector). "
        "The backend authenticates the user, reads the assigned role from <code>GET /api/v1/auth/me</code>, and immediately navigates them to their authorized dashboard. "
        "All routes are protected by <code>guardRoute()</code> to prevent cross-role unauthorized access.",
        body_style
    ))

    login_matrix = [
        [Paragraph("#", th_style), Paragraph("User Account", th_style), Paragraph("Role Detected", th_style), Paragraph("Dashboard Destination", th_style), Paragraph("Access Boundary (1-Sentence Function)", th_style)],
        [Paragraph("1", tc_num), Paragraph("<b>faculty@college.edu</b>", tc_title), Paragraph("FACULTY", tc_desc), Paragraph("/dashboards/faculty.html", tc_title), Paragraph("Restricted to assigned teaching courses, mentee students, personal profile, and research contributions.", tc_desc)],
        [Paragraph("2", tc_num), Paragraph("<b>hod@college.edu</b>", tc_title), Paragraph("HOD, FACULTY", tc_desc), Paragraph("/dashboards/hod.html", tc_title), Paragraph("Authorized to oversee, verify, approve, or return submissions for the Department of CSE.", tc_desc)],
        [Paragraph("3", tc_num), Paragraph("<b>admin@college.edu</b>", tc_title), Paragraph("ADMIN", tc_desc), Paragraph("/dashboards/admin.html", tc_title), Paragraph("Has institution-wide authority to manage users, departments, audit logs, authorized overrides, and backups.", tc_desc)]
    ]
    t_login = Table(login_matrix, colWidths=[18, 110, 75, 125, 184])
    t_login.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), primary_color),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('GRID', (0, 0), (-1, -1), 0.5, border_gray),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, light_bg]),
    ]))
    story.append(t_login)
    story.append(Spacer(1, 10))

    # ── SECTION 2: FACULTY DASHBOARD ──
    story.append(Paragraph("2. Faculty Personal Workspace (<code>/dashboards/faculty.html</code>)", h1_style))
    story.append(Paragraph(
        "<b>Dashboard Scope:</b> Dedicated personal workspace for faculty members to manage teaching workload, cohort assessments, student mentoring, credentials, and research evidence.",
        body_style
    ))

    fac_sections = [
        [Paragraph("#", th_style), Paragraph("Section / Tab Name", th_style), Paragraph("Criterion", th_style), Paragraph("1-Sentence Functional Explanation", th_style)],
        [
            Paragraph("1", tc_num),
            Paragraph("<b>Dashboard Overview</b>", tc_title),
            Paragraph("Overview", tc_desc),
            Paragraph("Displays personal summary KPI cards (Assigned Courses, Total Submissions, Pending Approvals, Approved, Rejected, Action Required) for quick workload status tracking.", tc_desc)
        ],
        [
            Paragraph("2", tc_num),
            Paragraph("<b>My Courses</b>", tc_title),
            Paragraph("Criterion 3", tc_desc),
            Paragraph("Lists all subjects assigned to the logged-in faculty member showing course code, name, semester, and active attainment percentage.", tc_desc)
        ],
        [
            Paragraph("3", tc_num),
            Paragraph("<b>Criterion 3 – CO Attainment</b>", tc_title),
            Paragraph("Criterion 3", tc_desc),
            Paragraph("Evaluates overall cohort attainment across CIE and SEE against the 60% benchmark (80:20 rule) and submits the course assessment package to HOD.", tc_desc)
        ],
        [
            Paragraph("4", tc_num),
            Paragraph("<b>Criterion 4 – Student Performance</b>", tc_title),
            Paragraph("Criterion 4", tc_desc),
            Paragraph("Enables faculty to view assigned mentee students, monitor CGPA and backlogs, and log continuous counseling and remedial support records.", tc_desc)
        ],
        [
            Paragraph("5", tc_num),
            Paragraph("<b>Criterion 5 – My Profile (FQI)</b>", tc_title),
            Paragraph("Criterion 5", tc_desc),
            Paragraph("Allows faculty to maintain educational qualifications, academic and industry experience, and upload certificates for 5-day AICTE ATAL FDPs.", tc_desc)
        ],
        [
            Paragraph("6", tc_num),
            Paragraph("<b>Criterion 6 – My Contributions</b>", tc_title),
            Paragraph("Criterion 6", tc_desc),
            Paragraph("Records personal research publications (SCI/Scopus), patents, sponsored research projects, consultancy, and professional memberships with evidence PDFs.", tc_desc)
        ],
        [
            Paragraph("7", tc_num),
            Paragraph("<b>Upload Documents</b>", tc_title),
            Paragraph("Evidence", tc_desc),
            Paragraph("Provides a drag-and-drop evidence uploader that automatically generates SHA-256 digital signatures to verify document authenticity.", tc_desc)
        ],
        [
            Paragraph("8", tc_num),
            Paragraph("<b>My Submissions & HOD Feedback</b>", tc_title),
            Paragraph("Workflow", tc_desc),
            Paragraph("Tracks submission review statuses, displays HOD correction comments, and provides a resubmit modal to send revised records back to the HOD.", tc_desc)
        ],
        [
            Paragraph("9", tc_num),
            Paragraph("<b>Department Criteria (Read-Only)</b>", tc_title),
            Paragraph("Criteria 3–6", tc_desc),
            Paragraph("Allows faculty to inspect department-wide criteria hubs (C3, C4, C5, C6) in read-only mode to understand departmental accreditation targets.", tc_desc)
        ],
        [
            Paragraph("10", tc_num),
            Paragraph("<b>Profile & Session Logout</b>", tc_title),
            Paragraph("Session", tc_desc),
            Paragraph("Displays active faculty identification credentials and allows the user to securely terminate their session and clear stored tokens.", tc_desc)
        ]
    ]
    t_fac = Table(fac_sections, colWidths=[18, 125, 60, 309])
    t_fac.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), faculty_color),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3.5),
        ('TOPPADDING', (0, 0), (-1, -1), 3.5),
        ('GRID', (0, 0), (-1, -1), 0.5, border_gray),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, light_bg]),
    ]))
    story.append(t_fac)
    
    story.append(PageBreak())

    # ── SECTION 3: HOD DASHBOARD ──
    story.append(Paragraph("3. Head of Department (HOD) Command Center (<code>/dashboards/hod.html</code>)", h1_style))
    story.append(Paragraph(
        "<b>Dashboard Scope:</b> Departmental governance console for monitoring faculty submissions, verifying course evidence, allocating teaching duties, maintaining SFR, and generating SAR reports.",
        body_style
    ))

    hod_sections = [
        [Paragraph("#", th_style), Paragraph("Section / Tab Name", th_style), Paragraph("Criterion", th_style), Paragraph("1-Sentence Functional Explanation", th_style)],
        [
            Paragraph("1", tc_num),
            Paragraph("<b>Department Overview</b>", tc_title),
            Paragraph("Overview", tc_desc),
            Paragraph("Presents macro health cards for Criteria 3, 4, 5, and 6 alongside summary KPIs (Total Faculty, Students, Active Courses, SFR 20:1, Readiness Score).", tc_desc)
        ],
        [
            Paragraph("2", tc_num),
            Paragraph("<b>Pending Approvals Queue</b>", tc_title),
            Paragraph("Workflow", tc_desc),
            Paragraph("Serves as the primary verification queue where HOD inspects faculty submissions and chooses to Approve, Reject, or Request Revisions with feedback.", tc_desc)
        ],
        [
            Paragraph("3", tc_num),
            Paragraph("<b>Criterion 3 – Course Allocations</b>", tc_title),
            Paragraph("Criterion 3", tc_desc),
            Paragraph("Lists all departmental courses and provides an assignment modal for the HOD to allocate subjects and teaching workloads to faculty.", tc_desc)
        ],
        [
            Paragraph("4", tc_num),
            Paragraph("<b>Criterion 4 – Student Performance</b>", tc_title),
            Paragraph("Criterion 4", tc_desc),
            Paragraph("Tracks batch-wise progression, Academic Performance Index (API), campus placement rates, higher studies admissions, and competitive exams.", tc_desc)
        ],
        [
            Paragraph("5", tc_num),
            Paragraph("<b>Criterion 5 – Faculty Strength & SFR</b>", tc_title),
            Paragraph("Criterion 5", tc_desc),
            Paragraph("Monitors faculty cadre proportions, verifies Ph.D. Faculty Qualification Index (FQI), and ensures Student-Faculty Ratio remains &le; 20:1 for max 20 marks.", tc_desc)
        ],
        [
            Paragraph("6", tc_num),
            Paragraph("<b>Criterion 6 – Research & Contributions</b>", tc_title),
            Paragraph("Criterion 6", tc_desc),
            Paragraph("Reviews departmental research output including SCI/Scopus indexed journal papers, patents, and sponsored research grant funding.", tc_desc)
        ],
        [
            Paragraph("7", tc_num),
            Paragraph("<b>Faculty Management</b>", tc_title),
            Paragraph("Directory", tc_desc),
            Paragraph("Maintains the departmental faculty directory, profile verification statuses, and tracks submission compliance progress for each teacher.", tc_desc)
        ],
        [
            Paragraph("8", tc_num),
            Paragraph("<b>Document Verification</b>", tc_title),
            Paragraph("Audit", tc_desc),
            Paragraph("Inspects course files, question paper rubrics, and certificates to ensure all evidence files possess valid cryptographic SHA-256 signatures.", tc_desc)
        ],
        [
            Paragraph("9", tc_num),
            Paragraph("<b>Department Analytics</b>", tc_title),
            Paragraph("Analytics", tc_desc),
            Paragraph("Displays graphical distributions of CO attainment benchmarks, student progression trends, and faculty contribution metrics.", tc_desc)
        ],
        [
            Paragraph("10", tc_num),
            Paragraph("<b>Generate Reports (SAR)</b>", tc_title),
            Paragraph("Exports", tc_desc),
            Paragraph("Exports official NBA Self-Assessment Report (SAR) executive summaries in PDF format and full departmental criteria ledgers in Excel (.xlsx).", tc_desc)
        ],
        [
            Paragraph("11", tc_num),
            Paragraph("<b>My Teaching Workspace</b>", tc_title),
            Paragraph("Teaching", tc_desc),
            Paragraph("Provides direct access for the HOD to their own personal teaching workspace to enter marks and maintain their personal faculty portfolio.", tc_desc)
        ],
        [
            Paragraph("12", tc_num),
            Paragraph("<b>Profile & Session Logout</b>", tc_title),
            Paragraph("Session", tc_desc),
            Paragraph("Shows authenticated HOD credentials and provides a one-click session logout that clears credentials across browser tabs.", tc_desc)
        ]
    ]
    t_hod = Table(hod_sections, colWidths=[18, 125, 60, 309])
    t_hod.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), hod_color),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3.5),
        ('TOPPADDING', (0, 0), (-1, -1), 3.5),
        ('GRID', (0, 0), (-1, -1), 0.5, border_gray),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, light_bg]),
    ]))
    story.append(t_hod)
    story.append(Spacer(1, 10))

    # ── SECTION 4: ADMIN DASHBOARD ──
    story.append(Paragraph("4. Administrator Console (<code>/dashboards/admin.html</code>)", h1_style))
    story.append(Paragraph(
        "<b>Dashboard Scope:</b> Institutional management console covering all academic departments (CSE, ECE, ISE, ME), user provisioning, RBAC privilege assignment, system audit logs, and database backup verification.",
        body_style
    ))

    admin_sections = [
        [Paragraph("#", th_style), Paragraph("Section / Tab Name", th_style), Paragraph("Scope", th_style), Paragraph("1-Sentence Functional Explanation", th_style)],
        [
            Paragraph("1", tc_num),
            Paragraph("<b>Institution Overview</b>", tc_title),
            Paragraph("Institution", tc_desc),
            Paragraph("Displays institutional macro KPI cards (Total Departments, Faculty, Students, Courses, Readiness Score) and comparative departmental readiness tables.", tc_desc)
        ],
        [
            Paragraph("2", tc_num),
            Paragraph("<b>Department Management</b>", tc_title),
            Paragraph("Departments", tc_desc),
            Paragraph("Enables administrator to monitor, compare, and manage accreditation readiness progress across all engineering departments.", tc_desc)
        ],
        [
            Paragraph("3", tc_num),
            Paragraph("<b>Pending User Approvals</b>", tc_title),
            Paragraph("Accounts", tc_desc),
            Paragraph("Houses the faculty self-registration queue where the administrator verifies new registrations and activates or denies accounts.", tc_desc)
        ],
        [
            Paragraph("4", tc_num),
            Paragraph("<b>User Management & Roles</b>", tc_title),
            Paragraph("RBAC", tc_desc),
            Paragraph("Manages all user accounts and provides one-click privilege buttons to grant or revoke HOD role status and create new institutional accounts.", tc_desc)
        ],
        [
            Paragraph("5", tc_num),
            Paragraph("<b>Faculty & HOD Management</b>", tc_title),
            Paragraph("Directory", tc_desc),
            Paragraph("Maintains institution-wide directories of faculty and department heads with department filtering and credential status tracking.", tc_desc)
        ],
        [
            Paragraph("6", tc_num),
            Paragraph("<b>Criteria Management (C3-C6)</b>", tc_title),
            Paragraph("Criteria Hubs", tc_desc),
            Paragraph("Provides cross-department macro views into Criteria 3, 4, 5, and 6 with direct navigation links to institutional criteria hubs.", tc_desc)
        ],
        [
            Paragraph("7", tc_num),
            Paragraph("<b>Audit Logs & Overrides</b>", tc_title),
            Paragraph("Security", tc_desc),
            Paragraph("Maintains an immutable audit log of all system changes and provides an authorized administrative override modal with mandatory justification logging.", tc_desc)
        ],
        [
            Paragraph("8", tc_num),
            Paragraph("<b>Database Backups & Restore</b>", tc_title),
            Paragraph("Integrity", tc_desc),
            Paragraph("Generates full database snapshot archives and verifies cryptographic SHA-256 hashes to guarantee data integrity against tampering.", tc_desc)
        ],
        [
            Paragraph("9", tc_num),
            Paragraph("<b>System Configuration</b>", tc_title),
            Paragraph("Settings", tc_desc),
            Paragraph("Manages NBA Tier-I 2026 Manual parameters, active academic year, institutional benchmark thresholds, and SFR ratio policy limits.", tc_desc)
        ],
        [
            Paragraph("10", tc_num),
            Paragraph("<b>Consolidated Reports (SAR)</b>", tc_title),
            Paragraph("Reporting", tc_desc),
            Paragraph("Generates institution-wide consolidated Self-Assessment Reports (SAR) covering all criteria for visiting peer review teams.", tc_desc)
        ],
        [
            Paragraph("11", tc_num),
            Paragraph("<b>Document Management</b>", tc_title),
            Paragraph("Storage", tc_desc),
            Paragraph("Oversees the centralized evidence repository across all criteria, ensuring files comply with official retention policies.", tc_desc)
        ],
        [
            Paragraph("12", tc_num),
            Paragraph("<b>Profile & Session Logout</b>", tc_title),
            Paragraph("Session", tc_desc),
            Paragraph("Displays administrator profile metadata and allows secure system logout to terminate active authentication tokens.", tc_desc)
        ]
    ]
    t_admin = Table(admin_sections, colWidths=[18, 125, 60, 309])
    t_admin.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), admin_color),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3.5),
        ('TOPPADDING', (0, 0), (-1, -1), 3.5),
        ('GRID', (0, 0), (-1, -1), 0.5, border_gray),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, light_bg]),
    ]))
    story.append(t_admin)
    story.append(Spacer(1, 10))

    # ── SECTION 5: SUMMARY MATRIX ──
    story.append(Paragraph("5. Summary Comparison Matrix Across Dashboards", h1_style))
    summary_matrix = [
        [Paragraph("Functional Dimension", th_style), Paragraph("Faculty Dashboard", th_style), Paragraph("HOD Command Center", th_style), Paragraph("Administrator Console", th_style)],
        [Paragraph("<b>Governance Scope</b>", tc_title), Paragraph("Assigned Courses & Mentees", tc_desc), Paragraph("Department of CSE", tc_desc), Paragraph("Entire Institution (All Depts)", tc_desc)],
        [Paragraph("<b>C3 Attainment Entry</b>", tc_title), Paragraph("Inputs Cohort Performance", tc_desc), Paragraph("Verifies & Approves Calculations", tc_desc), Paragraph("Audits Institutional Attainment", tc_desc)],
        [Paragraph("<b>Review & Approvals</b>", tc_title), Paragraph("Resubmits Corrected Records", tc_desc), Paragraph("Approve / Reject / Request Revision", tc_desc), Paragraph("Authorized Audit Override", tc_desc)],
        [Paragraph("<b>Course Allocation</b>", tc_title), Paragraph("Views Teaching Workload", tc_desc), Paragraph("Allocates Subjects to Faculty", tc_desc), Paragraph("Oversees Global Curriculum", tc_desc)],
        [Paragraph("<b>User & Role Management</b>", tc_title), Paragraph("Updates Own Profile (FQI)", tc_desc), Paragraph("Monitors Dept Faculty Roster", tc_desc), Paragraph("Provisions Accounts, Grants/Revokes Roles", tc_desc)],
        [Paragraph("<b>Reports & Exports</b>", tc_title), Paragraph("Personal Course Files", tc_desc), Paragraph("Department SAR (PDF / Excel)", tc_desc), Paragraph("Institutional SAR & Full DB Backups", tc_desc)]
    ]
    t_sum = Table(summary_matrix, colWidths=[105, 130, 137, 140])
    t_sum.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), primary_color),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('GRID', (0, 0), (-1, -1), 0.5, border_gray),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, light_bg]),
    ]))
    story.append(t_sum)

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"PDF built successfully: {filename} ({os.path.getsize(filename)} bytes)")

if __name__ == "__main__":
    out_path = sys.argv[1] if len(sys.argv) > 1 else "NBA_Role_Dashboards_Guide.pdf"
    build_pdf(out_path)
