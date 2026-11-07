import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas

class DummyDocCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica-Bold", 8)
        self.setFillColor(colors.HexColor("#64748B"))
        
        # Header
        self.drawString(54, 752, "DEPARTMENT OF COMPUTER SCIENCE & ENGINEERING — NBA CRITERION 3 COURSE FILE")
        self.drawRightString(612 - 54, 752, "ACADEMIC YEAR 2024-25")
        self.setStrokeColor(colors.HexColor("#CBD5E1"))
        self.setLineWidth(0.6)
        self.line(54, 744, 612 - 54, 744)
            
        # Footer
        page_text = f"Page {self._pageNumber} of {page_count}"
        self.setFont("Helvetica", 8)
        self.drawRightString(612 - 54, 34, page_text)
        self.drawString(54, 34, "EVIDENCE DOCUMENT FOR NBA CRITERION 3 (OUTCOME-BASED ASSESSMENT) — REF: CF-CS501-2024")
        self.setStrokeColor(colors.HexColor("#CBD5E1"))
        self.setLineWidth(0.6)
        self.line(54, 46, 612 - 54, 46)
        self.restoreState()

def generate_c3_dummy_doc(filename="CS501_Course_File_Assessment_Rubrics.pdf"):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )
    
    styles = getSampleStyleSheet()
    primary = colors.HexColor("#0F172A")
    teal = colors.HexColor("#0D9488")
    dark_gray = colors.HexColor("#334155")
    light_bg = colors.HexColor("#F8FAFC")
    border_gray = colors.HexColor("#CBD5E1")

    title_style = ParagraphStyle(
        'DocTitle', parent=styles['Normal'],
        fontName='Helvetica-Bold', fontSize=18, leading=22,
        textColor=primary, spaceAfter=4
    )
    subtitle_style = ParagraphStyle(
        'DocSub', parent=styles['Normal'],
        fontName='Helvetica', fontSize=10, leading=14,
        textColor=colors.HexColor("#475569"), spaceAfter=12
    )
    h2_style = ParagraphStyle(
        'H2', parent=styles['Normal'],
        fontName='Helvetica-Bold', fontSize=11, leading=15,
        textColor=primary, spaceBefore=10, spaceAfter=4
    )
    body_style = ParagraphStyle(
        'Body', parent=styles['Normal'],
        fontName='Helvetica', fontSize=8.5, leading=12,
        textColor=dark_gray, spaceAfter=5
    )
    th_style = ParagraphStyle(
        'TH', parent=styles['Normal'],
        fontName='Helvetica-Bold', fontSize=8, leading=10,
        textColor=colors.white
    )
    tc_style = ParagraphStyle(
        'TC', parent=styles['Normal'],
        fontName='Helvetica', fontSize=8, leading=11,
        textColor=dark_gray
    )
    tc_bold = ParagraphStyle(
        'TCB', parent=styles['Normal'],
        fontName='Helvetica-Bold', fontSize=8, leading=11,
        textColor=primary
    )

    story = []

    # Title Banner
    story.append(Paragraph("Course File & Outcome Assessment Dossier", title_style))
    story.append(Paragraph("<b>Course:</b> CS501 — Database Management Systems (Semester 5) &bull; <b>Batch Size:</b> 64 Students &bull; <b>Instructor:</b> Dr. Priya Nair", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#00F5A0"), spaceAfter=10))

    # Section 1: Course Outcomes
    story.append(Paragraph("1. Course Outcomes (CO) Definition & Bloom's Taxonomy Levels", h2_style))
    co_data = [
        [Paragraph("CO #", th_style), Paragraph("Course Outcome Statement", th_style), Paragraph("Bloom's Level", th_style), Paragraph("Target Threshold", th_style)],
        [Paragraph("CO1", tc_bold), Paragraph("Understand foundational relational data models, ER diagrams, and relational algebra.", tc_style), Paragraph("Level 2 (Understand)", tc_style), Paragraph("60% of students &ge; 60% marks", tc_style)],
        [Paragraph("CO2", tc_bold), Paragraph("Design, implement, and optimize complex SQL queries, views, and integrity triggers.", tc_style), Paragraph("Level 3 (Apply / Analyze)", tc_style), Paragraph("60% of students &ge; 60% marks", tc_style)],
        [Paragraph("CO3", tc_bold), Paragraph("Apply decomposition algorithms and normal forms (1NF through BCNF) to eliminate anomalies.", tc_style), Paragraph("Level 4 (Analyze / Design)", tc_style), Paragraph("60% of students &ge; 60% marks", tc_style)],
        [Paragraph("CO4", tc_bold), Paragraph("Evaluate ACID transaction properties, serializability schedules, and locking protocols.", tc_style), Paragraph("Level 5 (Evaluate)", tc_style), Paragraph("60% of students &ge; 60% marks", tc_style)],
        [Paragraph("CO5", tc_bold), Paragraph("Design distributed schema and NoSQL document storage for high-concurrency systems.", tc_style), Paragraph("Level 6 (Create)", tc_style), Paragraph("60% of students &ge; 60% marks", tc_style)],
    ]
    t_co = Table(co_data, colWidths=[35, 270, 95, 104])
    t_co.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), primary),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3.5),
        ('TOPPADDING', (0, 0), (-1, -1), 3.5),
        ('GRID', (0, 0), (-1, -1), 0.5, border_gray),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, light_bg]),
    ]))
    story.append(t_co)
    story.append(Spacer(1, 8))

    # Section 2: CO-PO Matrix
    story.append(Paragraph("2. CO-PO & CO-PSO Articulation Matrix", h2_style))
    matrix_headers = [Paragraph("CO", th_style)] + [Paragraph(f"P{i}", th_style) for i in range(1, 13)] + [Paragraph("PS1", th_style), Paragraph("PS2", th_style)]
    matrix_rows = [
        matrix_headers,
        [Paragraph("CO1", tc_bold), "3", "2", "-", "-", "1", "-", "-", "-", "-", "-", "-", "2", "3", "2"],
        [Paragraph("CO2", tc_bold), "3", "3", "2", "2", "-", "-", "-", "-", "-", "-", "-", "1", "2", "3"],
        [Paragraph("CO3", tc_bold), "2", "3", "3", "2", "2", "1", "-", "-", "-", "-", "-", "2", "3", "2"],
        [Paragraph("CO4", tc_bold), "1", "2", "3", "3", "3", "-", "-", "-", "2", "2", "1", "2", "3", "3"],
        [Paragraph("CO5", tc_bold), "1", "1", "2", "3", "2", "-", "-", "-", "1", "1", "-", "3", "2", "2"],
    ]
    # 504 pt width total / 15 cols: first is 34, remaining 14 are 33.5
    col_w = [34] + [33.5] * 14
    t_mat = Table(matrix_rows, colWidths=col_w)
    t_mat.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), teal),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('GRID', (0, 0), (-1, -1), 0.5, border_gray),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, light_bg]),
    ]))
    story.append(t_mat)
    story.append(Spacer(1, 8))

    # Section 3: Cohort Assessment & Attainment Summary
    story.append(Paragraph("3. Cohort Assessment Marks & Attainment Computation (NBA 80:20 Rule)", h2_style))
    calc_data = [
        [Paragraph("Assessment Component", th_style), Paragraph("Evaluated Students", th_style), Paragraph("Scoring &ge; 60% Benchmark", th_style), Paragraph("Attainment %", th_style), Paragraph("Weight", th_style)],
        [Paragraph("Continuous Internal Evaluation (CIE)", tc_bold), Paragraph("64", tc_style), Paragraph("52 Students (81.25%)", tc_style), Paragraph("81.3%", tc_style), Paragraph("50% of Direct", tc_style)],
        [Paragraph("Semester End Examination (SEE)", tc_bold), Paragraph("64", tc_style), Paragraph("48 Students (75.00%)", tc_style), Paragraph("75.0%", tc_style), Paragraph("50% of Direct", tc_style)],
        [Paragraph("<b>Direct Attainment Subtotal</b>", tc_bold), Paragraph("64", tc_style), Paragraph("0.50 &times; 81.3% + 0.50 &times; 75.0%", tc_style), Paragraph("<b>78.1%</b>", tc_bold), Paragraph("80% of Overall", tc_style)],
        [Paragraph("Course Exit Survey (Indirect Attainment)", tc_bold), Paragraph("64", tc_style), Paragraph("Mean Rating: 4.2 / 5.0 Scale", tc_style), Paragraph("84.0%", tc_style), Paragraph("20% of Overall", tc_style)],
        [Paragraph("<b>Final Course Outcome Attainment</b>", tc_bold), Paragraph("64", tc_style), Paragraph("<b>0.80 &times; 78.1% + 0.20 &times; 84.0%</b>", tc_style), Paragraph("<b>79.3%</b>", tc_bold), Paragraph("<b>Level 3 Attained &check;</b>", tc_bold)],
    ]
    t_calc = Table(calc_data, colWidths=[160, 85, 125, 65, 69])
    t_calc.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), primary),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3.5),
        ('TOPPADDING', (0, 0), (-1, -1), 3.5),
        ('GRID', (0, 0), (-1, -1), 0.5, border_gray),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, light_bg]),
        ('BACKGROUND', (0, 5), (-1, 5), colors.HexColor("#CCFF00")),
        ('TEXTCOLOR', (0, 5), (-1, 5), primary),
    ]))
    story.append(t_calc)
    story.append(Spacer(1, 10))

    # Section 4: Signatures & Verification
    story.append(Paragraph("4. Institutional Signatures & Verification Status", h2_style))
    sig_data = [
        [Paragraph("<b>Course Instructor</b><br/>Dr. Priya Nair<br/>Assistant Professor, CSE<br/>Signature: <i>[Electronically Verified]</i>", tc_style),
         Paragraph("<b>Module Coordinator</b><br/>Prof. Arvind Rao<br/>Associate Professor, CSE<br/>Signature: <i>[Electronically Verified]</i>", tc_style),
         Paragraph("<b>Head of Department (HOD)</b><br/>Dr. Rajesh Kumar<br/>Professor & HOD, CSE<br/>Signature: <b>APPROVED ✓</b>", tc_style)]
    ]
    t_sig = Table(sig_data, colWidths=[168, 168, 168])
    t_sig.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#F1F5F9")),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#94A3B8")),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(t_sig)

    doc.build(story, canvasmaker=DummyDocCanvas)
    print(f"Generated dummy C3 document: {filename} ({os.path.getsize(filename)} bytes)")

if __name__ == "__main__":
    generate_c3_dummy_doc()

