#!/usr/bin/env python3
"""
Builds docs/NBA_Dashboard_Map_Guide.pdf — a beginner guide that says, for each
NBA criterion (3 to 6), which dashboards are needed to verify it.

Run:  python3 docs/tools/build_dashboard_guide.py
Needs: pip install reportlab

Edit the CONTENT section when Criteria 4, 5 and 6 change; the layout code
below it does not need to be touched.
"""
from pathlib import Path
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer,
                                Table, TableStyle, PageBreak, KeepTogether)

OUT = Path(__file__).resolve().parent.parent / "NBA_Dashboard_Map_Guide.pdf"

# ── Fonts ────────────────────────────────────────────────────
FONT_DIR = Path("/System/Library/Fonts/Supplemental")
try:
    pdfmetrics.registerFont(TTFont("Body", str(FONT_DIR / "Arial.ttf")))
    pdfmetrics.registerFont(TTFont("Body-Bold", str(FONT_DIR / "Arial Bold.ttf")))
    pdfmetrics.registerFont(TTFont("Body-Italic", str(FONT_DIR / "Arial Italic.ttf")))
    pdfmetrics.registerFontFamily("Body", normal="Body", bold="Body-Bold", italic="Body-Italic", boldItalic="Body-Bold")
    F, FB, FI = "Body", "Body-Bold", "Body-Italic"
except Exception:                      # non-Mac fallback
    F, FB, FI = "Helvetica", "Helvetica-Bold", "Helvetica-Oblique"

# ── Palette: flat, one accent, 0.1 mm hairlines ──────────────
INK = colors.HexColor("#111418")
MUTED = colors.HexColor("#5B6470")
ACCENT = colors.HexColor("#2563EB")
ACCENT_BG = colors.HexColor("#EAF1FE")
PANEL = colors.HexColor("#F5F6F8")
LINE = colors.HexColor("#8A929C")
OK_BG = colors.HexColor("#E6F4EA")
WARN_BG = colors.HexColor("#FFF4DB")
HAIR = 0.1 * mm * 72 / 25.4 * 1.0     # 0.1 mm expressed in points (~0.28 pt)

W, H = A4
MARGIN = 18 * mm
CONTENT_W = W - 2 * MARGIN

# ── Text styles ──────────────────────────────────────────────
def S(name, **kw):
    base = dict(fontName=F, fontSize=9.6, leading=14, textColor=INK, alignment=TA_LEFT)
    base.update(kw)
    return ParagraphStyle(name, **base)

st = {
    "title": S("title", fontName=FB, fontSize=27, leading=32),
    "sub": S("sub", fontSize=12.5, leading=18, textColor=MUTED),
    "h1": S("h1", fontName=FB, fontSize=18, leading=23, spaceBefore=0, spaceAfter=7),
    "h2": S("h2", fontName=FB, fontSize=12, leading=16, spaceBefore=11, spaceAfter=4),
    "p": S("p", spaceAfter=5),
    "small": S("small", fontSize=8.4, leading=12, textColor=MUTED),
    "cell": S("cell", fontSize=8.8, leading=12),
    "cellb": S("cellb", fontName=FB, fontSize=8.8, leading=12),
    "head": S("head", fontName=FB, fontSize=8, leading=11, textColor=MUTED),
    "tag": S("tag", fontName=FB, fontSize=8, leading=11, textColor=ACCENT),
    "mono": S("mono", fontName="Courier", fontSize=8.6, leading=12),
}

def P(text, style="p"):
    return Paragraph(text, st[style])

def ul(items):
    return [Paragraph("•&nbsp;&nbsp;" + t, S("li", leftIndent=12, firstLineIndent=-12, spaceAfter=2)) for t in items]

# ── Building blocks ──────────────────────────────────────────
def grid(rows, widths, header=True, zebra=False, fills=None):
    """Hairline table. rows are lists of strings or flowables."""
    data = []
    for ri, row in enumerate(rows):
        cells = []
        for c in row:
            if isinstance(c, str):
                c = Paragraph(c, st["head"] if (header and ri == 0) else st["cell"])
            cells.append(c)
        data.append(cells)
    t = Table(data, colWidths=widths, repeatRows=1 if header else 0)
    cmds = [
        ("GRID", (0, 0), (-1, -1), HAIR, LINE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6), ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 5), ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]
    if header:
        cmds.append(("BACKGROUND", (0, 0), (-1, 0), PANEL))
    for (col, row, colr) in (fills or []):
        cmds.append(("BACKGROUND", (col, row), (col, row), colr))
    t.setStyle(TableStyle(cmds))
    return t

def callout(title, body, bg=ACCENT_BG, bar=ACCENT):
    inner = [Paragraph(f"<b>{title}</b>", S("ct", fontSize=9.6, leading=13, spaceAfter=2))]
    inner += body if isinstance(body, list) else [Paragraph(body, S("cb", fontSize=9.2, leading=13.5))]
    t = Table([[inner]], colWidths=[CONTENT_W])
    t.setStyle(TableStyle([
        ("BOX", (0, 0), (-1, -1), HAIR, LINE),
        ("LINEBEFORE", (0, 0), (0, -1), 2, bar),
        ("BACKGROUND", (0, 0), (-1, -1), bg),
        ("LEFTPADDING", (0, 0), (-1, -1), 10), ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 7), ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]))
    return t

def steps(items):
    rows = [[Paragraph(f"<b>{i}</b>", S("n", fontName=FB, textColor=ACCENT, alignment=1)), Paragraph(t, st["cell"])]
            for i, t in enumerate(items, 1)]
    t = Table(rows, colWidths=[9 * mm, CONTENT_W - 9 * mm])
    t.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), HAIR, LINE), ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 5), ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 6), ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ]))
    return t

def need_tag(label):
    return {"Required": "<b>REQUIRED</b>", "Enter": "<b>ENTER DATA</b>",
            "Optional": "Optional", "No": "Not needed", "Setup": "One-time setup"}[label]

# ═════════════════════════ CONTENT ═══════════════════════════
DASH_PAGE = "Criterion page"

CRITERIA = [
    dict(
        code="3", name="Outcome-Based Assessment", marks="120",
        status=("Built and tested", OK_BG),
        question="Did students actually learn what we said they would learn?",
        minimum=("Criterion 3 page", "Sign in as HOD or Admin. Open <b>Criterion 3 (Assessment)</b> from the left menu. "
                 "With the sample data loaded, no other dashboard is needed to verify it."),
        needs=[
            ["Criterion 3 page", "HOD or Admin", "Left menu: <b>Criterion 3 (Assessment)</b>. Tabs: Requirements &amp; Evaluation, CO Attainment &amp; Matrix, Marks &amp; Attendance, Evidence Documents, AI Advisory &amp; RAG.", need_tag("Required")],
            ["Faculty dashboard", "Faculty", "Tab <b>My Assigned Courses (C3)</b>: add course outcomes, enter marks. Only needed if you want to change the numbers.", need_tag("Enter")],
            ["HOD dashboard", "HOD", "Tab <b>Course Assignments (C3)</b>: decide which faculty teaches which subject.", need_tag("Optional")],
            ["Admin dashboard", "Admin", "Only to approve new users or create the academic year before data entry.", need_tag("Setup")],
            ["Virtual Inspection", "HOD or Admin", "Shows Criterion 3 next to 4, 5 and 6 with an overall score.", need_tag("Optional")],
        ],
        steps=[
            "Sign in as <b>HOD</b> (<font name='Courier'>hod@college.edu</font>).",
            "Left menu, <b>Criterion 3 (Assessment)</b>. You land on <b>Requirements &amp; Evaluation</b>.",
            "On row <b>3.1</b> click <b>Evaluate</b>. Read the status, the marks and the reason.",
            "Rows 3.2 to 3.6 say they need a reviewer score. Click <b>Inputs</b>, type a score, <b>Save</b>. The row re-evaluates by itself.",
            "Open tab <b>CO Attainment &amp; Matrix</b>. Weak subjects are flagged. Click <b>Approve attainment method</b>; rows 3.7 and 3.8 now get a real score.",
            "Click <b>History</b> on any row to see every earlier evaluation. Nothing is overwritten.",
        ],
        good="Rows 3.1 to 3.8 show PASS or WARNING with marks. The sample data has two weak subjects (CS503 and CS504), so a few WARNING or FAIL rows are expected and are the proof that the rules are real.",
        proof="Sign in as Faculty, raise the marks of CS503 students above 60 percent, then re-open <b>CO Attainment &amp; Matrix</b>. The weak flag clears and the score rises.",
        reqs="3.1 Continuous assessment · 3.2 Exam papers · 3.3 Lab work · 3.4 Industrial training · 3.5 Projects · 3.6 SDG mapping · 3.7 CO attainment · 3.8 PO and PSO attainment",
    ),
    dict(
        code="4", name="Students' Performance", marks="120",
        status=("Being built in a separate work stream", WARN_BG),
        question="How are our students performing?",
        minimum=("Criterion 4 page", "Sign in as HOD or Admin. Open <b>Criterion 4 (Students)</b>. Marks and attendance come from Faculty entries or the sample data."),
        needs=[
            ["Criterion 4 page", "HOD or Admin", "Left menu: <b>Criterion 4 (Students)</b>. Tabs: Requirements (4.1 to 4.7), Success Rate &amp; Academic Index, Placements &amp; Higher Studies, Evidence Checklist &amp; Result Sheets, AI Advisory &amp; Gap Analysis.", need_tag("Required")],
            ["Faculty dashboard", "Faculty", "Tab <b>Assigned Students (C4)</b>: enter attendance and see students who need support.", need_tag("Enter")],
            ["HOD dashboard", "HOD", "Tab <b>Students Performance (C4)</b>: pass rates, marks, at-risk students (a read-only check).", need_tag("Optional")],
            ["Admin dashboard", "Admin", "Not needed for verification.", need_tag("No")],
            ["Virtual Inspection", "HOD or Admin", "Confirms Criterion 4 inside the whole-department score.", need_tag("Optional")],
        ],
        steps=[
            "Sign in as <b>HOD</b>.",
            "Left menu, <b>Criterion 4 (Students)</b>. Click <b>Evaluate</b> on row 4.3 (academic performance). The marks come from the average student marks.",
            "Rows 4.1 and 4.2 ask for lists of numbers. Click <b>Inputs</b>, fill the listed fields, <b>Save</b>.",
            "Row 4.6 (placement) says <b>Needs rule clarification</b>. That is correct: the NBA manual leaves the formula to the institution.",
            "Open the <b>Students</b> area to see the at-risk list: attendance under 75 percent or marks under 40 percent, with the reason shown.",
            "To see the rule react: sign in as Faculty, lower a few attendance values, and return to the HOD view.",
        ],
        good="4.3 to 4.5 show marks calculated from student data. The at-risk list names each student and the reason. 4.6 honestly says it needs a decision.",
        proof="Lower some attendance below 75 percent as Faculty. The at-risk list grows.",
        reqs="4.1 Enrolment ratio · 4.2 Success rate without backlogs · 4.3 / 4.4 / 4.5 Academic performance (1st, 2nd, 3rd year) · 4.6 Placement and higher studies · 4.7 Professional activities",
    ),
    dict(
        code="5", name="Faculty Information", marks="100",
        status=("Being built in a separate work stream", WARN_BG),
        question="Do we have enough qualified faculty?",
        minimum=("Criterion 5 page", "Sign in as HOD or Admin. Open <b>Criterion 5 (Faculty)</b>. Almost everything is calculated from faculty profiles, so nothing else is needed."),
        needs=[
            ["Criterion 5 page", "HOD or Admin", "Left menu: <b>Criterion 5 (Faculty)</b>. Tabs: Requirements (5.1 to 5.5), Faculty Roster &amp; Profile Rings, SFR, FQI &amp; Cadre Gauges, Workload &amp; Assignments.", need_tag("Required")],
            ["Faculty dashboard", "Faculty", "Tab <b>My C5 Profile &amp; FQI</b>: keep qualifications, designation and experience complete.", need_tag("Enter")],
            ["HOD dashboard", "HOD", "Tab <b>Faculty Strength &amp; SFR (C5)</b>: faculty count and student-faculty ratio at a glance.", need_tag("Optional")],
            ["Admin dashboard", "Admin", "Tab <b>Pending Approvals</b>: a new faculty member only counts after approval, which changes the ratio.", need_tag("Setup")],
            ["Virtual Inspection", "HOD or Admin", "Confirms Criterion 5 inside the whole-department score.", need_tag("Optional")],
        ],
        steps=[
            "Sign in as <b>HOD</b>.",
            "Left menu, <b>Criterion 5 (Faculty)</b>. Click <b>Evaluate</b> on 5.1. With 60 students and 6 faculty the ratio is 10 to 1, which earns full marks.",
            "Evaluate <b>5.2</b> (qualification index) and <b>5.3</b> (cadre proportion). Each shows the numbers it used.",
            "Row 5.4 asks for two inputs (provision exists, yearly hours). Use <b>Inputs</b>.",
            "Row 5.5 (retention) says <b>Needs rule clarification</b>. Expected.",
            "To see the rule react: as Faculty change a designation to Assistant Professor, then Evaluate 5.3 again. The cadre score drops.",
        ],
        good="5.1 to 5.3 show a number and a reason on the first click, without any typing. That proves they are computed, not typed in.",
        proof="Sign in as Admin, approve one more faculty account, then Evaluate 5.1 and 5.2 again. The ratio and the index change.",
        reqs="5.1 Student-faculty ratio · 5.2 Faculty qualification index · 5.3 Faculty cadre proportion · 5.4 Visiting / adjunct faculty · 5.5 Faculty retention",
    ),
    dict(
        code="6", name="Faculty Contributions", marks="120",
        status=("Being built in a separate work stream", WARN_BG),
        question="What are our faculty contributing (research, patents, projects, consultancy)?",
        minimum=("Criterion 6 page", "Sign in as HOD or Admin. Open <b>Criterion 6 (R&amp;D)</b>. Publications, patents and projects come from Faculty entries or the sample data."),
        needs=[
            ["Criterion 6 page", "HOD or Admin", "Left menu: <b>Criterion 6 (R&amp;D)</b>. Tabs: Requirements (6.1 and 6.2), Year-wise R&amp;D Stacked Chart, Faculty Leaderboard, Certificate Versioning.", need_tag("Required")],
            ["Faculty dashboard", "Faculty", "Tab <b>My C6 Research &amp; Consultancy</b>: add each publication, patent, project and consultancy record. Also <b>Evidence Upload &amp; Lifecycle</b> for certificates.", need_tag("Enter")],
            ["HOD dashboard", "HOD", "Tab <b>Research &amp; Contributions (C6)</b>: department totals.", need_tag("Optional")],
            ["Admin dashboard", "Admin", "Not needed for verification.", need_tag("No")],
            ["Virtual Inspection", "HOD or Admin", "Confirms Criterion 6 inside the whole-department score.", need_tag("Optional")],
        ],
        steps=[
            "Sign in as <b>HOD</b>.",
            "Left menu, <b>Criterion 6 (R&amp;D)</b>. Click <b>Evaluate</b> on 6.2.1 (publications), 6.2.3 (patents), 6.2.4 (sponsored research) and 6.2.5 (consultancy). These are calculated from faculty records.",
            "Rows such as 6.1.2.2 (FDP participation) ask for numbers. Use <b>Inputs</b>.",
            "Open <b>Year-wise R&amp;D Stacked Chart</b> and <b>Faculty Leaderboard</b> to see the same records as pictures.",
            "To see the rule react: sign in as <b>faculty1</b>, open <b>My C6 Research &amp; Consultancy</b>, add a publication. Back as HOD, Evaluate 6.2.1 again; the count goes up.",
            "Upload an FDP certificate as Faculty (<b>Evidence Upload &amp; Lifecycle</b>). As HOD, link it to row 6.1.2.2 using the evidence option on that row.",
        ],
        good="6.2.x rows show counts and marks straight from the stored records. Linking a certificate changes the row to <b>Has evidence</b>.",
        proof="Add a patent with status Granted as Faculty. Evaluate 6.2.3 as HOD: marks increase.",
        reqs="6.1.1 Societies · 6.1.2.x Resource persons and FDPs · 6.1.3 MOOCs developed · 6.1.4 MOOC certification · 6.1.5 FDPs organised · 6.1.6 Student innovation · 6.1.7 Industry training · 6.2.1 Publications · 6.2.2 PhD guidance · 6.2.3 Patents · 6.2.4 Sponsored research · 6.2.5 Consultancy · 6.2.6 Seed money",
    ),
]

# ═════════════════════════ LAYOUT ════════════════════════════
def footer(canv, doc):
    canv.saveState()
    canv.setStrokeColor(LINE); canv.setLineWidth(HAIR)
    canv.line(MARGIN, 14 * mm, W - MARGIN, 14 * mm)
    canv.setFont(F, 7.6); canv.setFillColor(MUTED)
    canv.drawString(MARGIN, 10 * mm, "AI-NBA Readiness System · Which dashboard do I need?")
    canv.drawRightString(W - MARGIN, 10 * mm, f"Page {doc.page}")
    canv.restoreState()

def cover(canv, doc):
    canv.saveState()
    canv.setStrokeColor(ACCENT); canv.setLineWidth(2)
    canv.line(MARGIN, H - 30 * mm, MARGIN + 22 * mm, H - 30 * mm)
    canv.restoreState()

doc = BaseDocTemplate(str(OUT), pagesize=A4, leftMargin=MARGIN, rightMargin=MARGIN,
                      topMargin=18 * mm, bottomMargin=20 * mm,
                      title="Which Dashboard Do I Need? Verifying NBA Criteria 3 to 6",
                      author="AI-NBA Readiness System")
frame = Frame(MARGIN, 20 * mm, CONTENT_W, H - 38 * mm, leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)
doc.addPageTemplates([PageTemplate(id="first", frames=[frame], onPage=cover),
                      PageTemplate(id="rest", frames=[frame], onPage=footer)])
from reportlab.platypus import NextPageTemplate

story = []

# ── Cover ────────────────────────────────────────────────────
story += [Spacer(1, 40 * mm),
          P("Which dashboard do I need?", "title"), Spacer(1, 4),
          P("A beginner's map for verifying NBA Criteria 3, 4, 5 and 6", "sub"),
          Spacer(1, 14 * mm),
          P("You do not need to know anything about NBA accreditation or about this code. For every criterion this guide tells you "
            "<b>which page to open, which person to sign in as, and what to click</b>.", "p"),
          Spacer(1, 6 * mm)]
story.append(grid([
    ["If you want to…", "Go to"],
    ["Understand the pages and who sees what", "Section 1 (page 2)"],
    ["Sign in for the first time", "Section 2 (page 3)"],
    ["See, at a glance, which dashboards each criterion needs", "Section 3 (page 4)"],
    ["Verify one criterion step by step", "Sections 4 to 7 (one page each)"],
    ["Run a complete 15-minute check", "Section 8"],
    ["Fix something that does not work", "Section 9"],
], [CONTENT_W * 0.64, CONTENT_W * 0.36]))
story += [Spacer(1, 10 * mm),
          callout("Status of this guide",
                  "Criterion 3 is built and tested. Criteria 4, 5 and 6 are still being built in a separate work stream. "
                  "This guide names the dashboards and tabs that exist today. If a tab is renamed later, the answer to "
                  "<i>which dashboard</i> stays the same. The guide is produced by <font name='Courier'>docs/tools/build_dashboard_guide.py</font> "
                  "and can be regenerated after those criteria are finished.", bg=WARN_BG, bar=colors.HexColor("#B7791F")),
          NextPageTemplate("rest"), PageBreak()]

# ── 1. Pages and roles ───────────────────────────────────────
story += [P("1. The pages and who can open them", "h1"),
          P("The system has <b>three kinds of people</b> (roles) and <b>eleven pages</b> you will use. "
            "A <b>criterion</b> is one chapter of the NBA checklist (Criterion 3 is about learning outcomes, 4 about students, "
            "5 about faculty, 6 about faculty contributions). Each chapter is a list of <b>requirements</b>, and each requirement "
            "ends as <b>PASS</b>, <b>WARNING</b> or <b>FAIL</b>.")]
story.append(grid([
    ["Page", "Address after the site opens", "Who", "What it is for"],
    ["Admin dashboard", "/dashboards/admin.html", "Admin", "Approve users, assign HOD, backups, audit log, whole-institution overview"],
    ["HOD dashboard", "/dashboards/hod.html", "HOD, Admin", "Department health, approvals, course assignments, gaps and actions"],
    ["Faculty dashboard", "/dashboards/faculty.html", "Faculty, HOD, Admin", "Your own subjects, marks, profile, research records and evidence uploads"],
    ["Criterion 3 page", "/dashboards/c3.html", "Everyone signed in; HOD and Admin can evaluate", "Where Criterion 3 is verified"],
    ["Criterion 4 page", "/dashboards/c4.html", "same", "Where Criterion 4 is verified"],
    ["Criterion 5 page", "/dashboards/c5.html", "same", "Where Criterion 5 is verified"],
    ["Criterion 6 page", "/dashboards/c6.html", "same", "Where Criterion 6 is verified"],
    ["Virtual Inspection", "/dashboards/inspection.html", "HOD, Admin", "Runs every requirement of Criteria 3 to 6 and gives one readiness score"],
    ["Reports", "/dashboards/reports.html", "Everyone signed in; export for HOD and Admin", "Download PDF or Excel report"],
    ["Login, Register, Pending", "login.html, register.html, pending.html", "Anyone", "Sign in, ask for an account, wait for approval"],
], [CONTENT_W * 0.19, CONTENT_W * 0.28, CONTENT_W * 0.19, CONTENT_W * 0.34]))
story += [Spacer(1, 6),
          callout("The one idea that makes everything simple",
                  "<b>Verifying</b> a criterion always happens on its own <b>Criterion page</b> (c3, c4, c5 or c6), signed in as HOD or Admin. "
                  "The Faculty, HOD and Admin dashboards are where the <b>data comes from</b> and where people are managed. "
                  "If the sample data is loaded, the Criterion page alone is enough to verify.")]

# ── 2. Start and sign in ─────────────────────────────────────
story += [PageBreak(), P("2. Start the system and sign in", "h1"), Spacer(1, 2), P("Start", "h2"),
          P("Windows (PowerShell, in the project folder): <font name='Courier'>.\\start.ps1 setup</font> the first time, then <font name='Courier'>.\\start.ps1</font>.<br/>"
            "Mac or Linux: <font name='Courier'>./start.sh setup</font> the first time, then <font name='Courier'>./start.sh</font>."),
          P("Open <font name='Courier'>http://127.0.0.1:5500</font> in your browser. "
            "Type exactly <b>127.0.0.1</b>; the word <i>localhost</i> can make sign-in fail with \"Failed to fetch\"."),
          P("Sample logins (password for all is <font name='Courier'>password123</font>)", "h2")]
story.append(grid([
    ["Sign in as", "Email", "Use it for"],
    ["Admin", "admin@college.edu", "Everything, plus users, years and backups"],
    ["HOD", "hod@college.edu", "Verifying criteria, approvals, gaps, inspection"],
    ["Faculty", "faculty1@college.edu … faculty6@college.edu", "Entering marks, profile, research records, evidence"],
], [CONTENT_W * 0.17, CONTENT_W * 0.41, CONTENT_W * 0.42]))
story += [Spacer(1, 4), P("The login page also has demo buttons that fill these in for you. "
                          "The first start loads a sample department (Computer Science and Engineering, 2026-27) with 6 faculty, "
                          "60 students and 5 subjects. It is deliberately imperfect so you can see the system find problems. "
                          "Change the passwords before any real use.", "small"),
          P("Words you will see", "h2")]
story.append(grid([
    ["Word", "Plain meaning"],
    ["NBA", "The body that accredits engineering programmes. This system checks how ready a department is."],
    ["Criterion", "One chapter of the NBA checklist. This guide covers Criteria 3, 4, 5 and 6."],
    ["Requirement", "One line in a criterion, for example 5.1 Student-faculty ratio. It ends as PASS, WARNING or FAIL."],
    ["Evaluate", "A button that reads the stored records, applies the NBA rule and shows marks and a reason."],
    ["Inputs", "A form for facts the system cannot work out alone (for example a reviewer score)."],
    ["Evidence", "A document (certificate, result sheet, report) that proves a requirement."],
    ["Gap", "A requirement that is failing or has no evidence. HOD turns gaps into assigned actions."],
    ["Role", "Admin, HOD or Faculty. Your role decides which buttons you see."],
], [CONTENT_W * 0.2, CONTENT_W * 0.8]))
story += [PageBreak()]

# ── 3. Master matrix ─────────────────────────────────────────
story += [P("3. The master table: which dashboards for which criterion", "h1"),
          P("Read across a row to see everything one criterion touches. <b>REQUIRED</b> means you cannot verify without it. "
            "<b>ENTER DATA</b> means the numbers are typed there, so open it only if you want to change results. "
            "<b>Optional</b> pages add context.")]
hdr = ["Criterion", "Its Criterion page", "Faculty dashboard", "HOD dashboard", "Admin dashboard", "Virtual Inspection"]
rows = [hdr]
fills = []
for i, c in enumerate(CRITERIA, 1):
    needmap = {r[0]: r[3] for r in c["needs"]}
    rows.append([f"<b>Criterion {c['code']}</b><br/>{c['name']}",
                 needmap["Criterion %s page" % c["code"]], needmap["Faculty dashboard"],
                 needmap["HOD dashboard"], needmap["Admin dashboard"], needmap["Virtual Inspection"]])
    fills.append((1, i, ACCENT_BG))
story.append(grid(rows, [CONTENT_W * 0.22] + [CONTENT_W * 0.156] * 5, fills=fills))
story += [Spacer(1, 8),
          callout("Shortest path for each criterion (verification only)",
                  [Paragraph("&nbsp;", st["small"])] + ul([
                      "<b>Criterion 3:</b> HOD or Admin, then the <b>Criterion 3 page</b>.",
                      "<b>Criterion 4:</b> HOD or Admin, then the <b>Criterion 4 page</b>.",
                      "<b>Criterion 5:</b> HOD or Admin, then the <b>Criterion 5 page</b>.",
                      "<b>Criterion 6:</b> HOD or Admin, then the <b>Criterion 6 page</b>.",
                      "<b>All four at once:</b> HOD or Admin, then the <b>Virtual Inspection</b> page and press <b>Run Virtual NBA Inspection</b>.",
                  ])),
          Spacer(1, 8),
          P("Why not just the Admin dashboard?", "h2"),
          P("The Admin dashboard manages <i>people and the system</i> (approvals, roles, backups, audit log). "
            "Its Institution Overview shows a summary of the four criteria, but the proof for a single requirement "
            "(the marks, the reason, the inputs, the history) lives on that criterion's own page. "
            "Signing in as Admin gives you access to all of those pages, so Admin is a fine login for verification; "
            "the Admin <i>dashboard</i> is just not where the verifying happens."),
          P("Who can click what on a Criterion page", "h2")]
story.append(grid([
    ["Action on a Criterion page", "Faculty", "HOD", "Admin"],
    ["Look at the requirement table, <b>History</b>, <b>View inputs</b>", "Yes", "Yes", "Yes"],
    ["<b>Evaluate</b> a requirement, <b>Evaluate all</b>", "No", "Yes", "Yes"],
    ["Type and save <b>Inputs</b>", "No", "Yes", "Yes"],
    ["Add own records (marks, qualification, publication, certificate)", "Yes", "Yes", "Yes"],
    ["Approve a method (for example C3 attainment) or link evidence to a requirement", "No", "Yes", "Yes"],
], [CONTENT_W * 0.58, CONTENT_W * 0.14, CONTENT_W * 0.14, CONTENT_W * 0.14]))

# ── 4 to 7. Criterion pages ──────────────────────────────────
for n, c in enumerate(CRITERIA):
    sec = 4 + n
    title_row = Table([[P(f"{sec}. Criterion {c['code']}: {c['name']}", "h1"),
                        Paragraph(f"<b>{c['marks']} marks</b>", S("m", alignment=2, textColor=MUTED))]],
                      colWidths=[CONTENT_W * 0.78, CONTENT_W * 0.22])
    title_row.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "BOTTOM"), ("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 0)]))
    status_t = Table([[Paragraph(f"<b>Status:</b> {c['status'][0]}", S("s", fontSize=8.6, leading=12))]], colWidths=[CONTENT_W])
    status_t.setStyle(TableStyle([("BOX", (0, 0), (-1, -1), HAIR, LINE), ("BACKGROUND", (0, 0), (-1, -1), c["status"][1]),
                                  ("LEFTPADDING", (0, 0), (-1, -1), 8), ("TOPPADDING", (0, 0), (-1, -1), 4), ("BOTTOMPADDING", (0, 0), (-1, -1), 4)]))
    story += [PageBreak(), title_row, status_t, Spacer(1, 7),
              P(f"<b>The question it answers:</b> {c['question']}"),
              callout("Minimum to verify this criterion: " + c["minimum"][0], c["minimum"][1]),
              P("Dashboards for this criterion", "h2")]
    story.append(grid([["Dashboard", "Sign in as", "Where exactly and why", "Needed?"]] + c["needs"],
                      [CONTENT_W * 0.17, CONTENT_W * 0.13, CONTENT_W * 0.52, CONTENT_W * 0.18]))
    story += [P("Verify it, step by step", "h2"), steps(c["steps"]),
              P("What good looks like", "h2"), P(c["good"]),
              P("Prove it is real", "h2"), P(c["proof"]),
              P("Requirements in this criterion", "h2"), P(c["reqs"], "small")]

# ── 8. Checklist ─────────────────────────────────────────────
story += [PageBreak(), P("8. A 15-minute check of all four criteria", "h1"),
          P("Tick each box as you go. Everything here is done as <b>HOD</b> unless it says otherwise.")]
check = [
    "Open <font name='Courier'>http://127.0.0.1:5500</font>, sign in as <b>hod@college.edu</b>.",
    "Open <b>Virtual Inspection</b> (button on the HOD dashboard, tab <i>Department Analytics &amp; SAR</i>, or the drop-down at the top). Press <b>Run Virtual NBA Inspection</b>. Note the readiness percentage.",
    "<b>Criterion 3:</b> Evaluate 3.1; set an input on 3.2; open <i>CO Attainment &amp; Matrix</i> and approve the method.",
    "<b>Criterion 4:</b> Evaluate 4.3; read the at-risk students list.",
    "<b>Criterion 5:</b> Evaluate 5.1, 5.2, 5.3 and read the reasons.",
    "<b>Criterion 6:</b> Evaluate 6.2.1, 6.2.3, 6.2.4, 6.2.5.",
    "Sign out. Sign in as <b>faculty1@college.edu</b>. Add one publication under <i>My C6 Research &amp; Consultancy</i>.",
    "Sign in as HOD again. Evaluate 6.2.1. The count should be one higher.",
    "Open <b>Gaps &amp; Actions</b> on the HOD dashboard. Press <b>Generate gaps</b>. Assign one action with an owner and a due date.",
    "Run the <b>Virtual Inspection</b> again. The score should be higher than in step 2.",
    "Open <b>Reports</b> and download the PDF.",
]
rows = [[Paragraph("[&nbsp;]", S("cb", fontName="Courier", fontSize=9, alignment=1)), Paragraph(t, st["cell"])] for t in check]
t = Table(rows, colWidths=[12 * mm, CONTENT_W - 12 * mm])
t.setStyle(TableStyle([("GRID", (0, 0), (-1, -1), HAIR, LINE), ("VALIGN", (0, 0), (-1, -1), "TOP"),
                       ("TOPPADDING", (0, 0), (-1, -1), 5), ("BOTTOMPADDING", (0, 0), (-1, -1), 5)]))
story += [t, Spacer(1, 8), P("What the status words mean", "h2")]
story.append(grid([
    ["Status", "Meaning", "What you do"],
    ["PASS", "Meets the threshold", "Keep evidence current"],
    ["WARNING", "Below full marks, or an input is missing", "Read the reason; enter the missing input"],
    ["FAIL", "Clearly below the expected level", "Generate gaps and assign a corrective action"],
    ["Needs rule clarification", "The NBA manual leaves a choice to the institution", "Approve a method or record the decision"],
    ["Not applicable", "Does not apply this year", "Nothing"],
], [CONTENT_W * 0.25, CONTENT_W * 0.40, CONTENT_W * 0.35]))
story += [Spacer(1, 8), P("On an empty department the Inspection says <b>NOT READY, 0 percent</b>. That is the honest answer. "
                          "Readiness labels: <b>READY</b> at 85 percent or more with no failures, <b>NEARLY READY</b> 60 to 84 percent, <b>NOT READY</b> below 60.", "small")]

# ── 9. Troubleshooting ───────────────────────────────────────
story += [PageBreak(), P("9. If something does not work", "h1")]
story.append(grid([
    ["What you see", "What to do"],
    ["Login says \"Failed to fetch\", or pages stay empty", "Open the site as <font name='Courier'>127.0.0.1:5500</font>, not localhost. Check the backend: <font name='Courier'>http://127.0.0.1:8000/api/v1/health</font> should answer."],
    ["A new faculty account cannot sign in", "An Admin or HOD must approve it first (Admin dashboard, Pending Approvals)."],
    ["\"Missing context keys\" after Evaluate", "Click <b>Inputs</b> on that row, fill the fields listed, <b>Save</b>."],
    ["3.7 and 3.8 say Needs rule clarification", "On Criterion 3, tab <i>CO Attainment &amp; Matrix</i>, press <b>Approve attainment method</b>."],
    ["No <b>Evaluate</b> button on the Criterion page", "You are signed in as Faculty. Sign in as HOD or Admin."],
    ["A page says you are not allowed", "That page needs a higher role. Admin dashboard needs Admin."],
    ["Numbers look round and never change", "That tab may still show sample values. Trust the Evaluate result on the Criterion page."],
    ["A tab named in this guide is missing", "Criteria 4, 5 and 6 are being built; the tab may have been renamed. Use the same Criterion page and look for the closest name."],
    ["Upload is rejected", "Use PDF, DOCX, XLSX, CSV, TXT, PNG or JPEG, under 25 MB."],
], [CONTENT_W * 0.38, CONTENT_W * 0.62]))
story += [Spacer(1, 8),
          callout("Where to read more", "<b>docs/USER_GUIDE.md</b> (full manual, also available as a PDF) explains every requirement and how marks are calculated. "
                  "<b>docs/CRITERION_3_QUICK_TEST.md</b> is a short test script for Criterion 3 with sample evidence files.")]

doc.build(story)
print("wrote", OUT)
