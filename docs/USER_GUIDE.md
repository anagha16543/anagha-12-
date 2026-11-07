---
title: "AI-Driven NBA Accreditation Readiness System: How to Use and Verify It"
---

# 1. What this system does, in one minute

NBA (National Board of Accreditation) will ask your department to **prove** its claims: faculty records, course files, CO attainment, research output, and the documents behind them. Normally that is a scramble of Excel files and folders the month before the visit.

This system keeps a live digital copy of the department (a "digital twin") and checks it against the NBA rules **all year**:

**COLLECT → STORE → CHECK → ANALYZE → FIX → PROVE**

| Step | What happens in the system |
|---|---|
| Collect | Faculty enter records (qualifications, publications, marks, attendance, course outcomes) |
| Store | Evidence documents (PDF, Word, Excel, CSV, text, images) are stored with context: who uploaded, which criterion, which requirement, which year |
| Check | The rule engine tests every requirement and gives **PASS / WARNING / FAIL** (or *Needs rule clarification* when a rule needs a decision from you) |
| Analyze | CO, PO and PSO attainment are calculated from marks; weak outcomes are flagged; at-risk students are listed |
| Fix | Gaps are created automatically; the HOD assigns corrective actions with owners and due dates |
| Prove | Reports (PDF, Excel) and the **Virtual NBA Inspection** summarise readiness with evidence status |

> **Important.** The readiness percentage is your own **internal indicator**. It is not an official NBA score. The pass/fail logic is deterministic code, never an AI guess. AI is advisory only.

**Scope of this build:** Criteria **3, 4, 5 and 6** (Outcome-Based Assessment, Students' Performance, Faculty Information, Faculty Contributions). Criteria 1, 2, 7, 8, 9 from the overview document are not built yet.

---

# 2. Start the system

You need Docker Desktop (for the database) and Python 3.11+.

First time only:

```bash
./start.sh setup
```

Every other time:

```bash
./start.sh
```

Then open **http://127.0.0.1:5500** in your browser.

> Use `127.0.0.1`, not `localhost`. If another program on your computer already uses port 8000 on `localhost`, the website would talk to the wrong server.

| Service | Address | Purpose |
|---|---|---|
| Website | http://127.0.0.1:5500 | What users see |
| Backend API | http://127.0.0.1:8000/docs | Interactive API documentation |
| AI service | http://127.0.0.1:8001 | Optional AI agents |
| Database | port 5433 | PostgreSQL with pgvector (searchable document text) |

## Sample logins (all passwords `password123`)

| Role | Email | Sees |
|---|---|---|
| Admin | admin@college.edu | Everything, plus users, years, backups |
| HOD | hod@college.edu | Readiness, approvals, gaps, inspection |
| Faculty | faculty1@college.edu … faculty6@college.edu | Own records, subjects, uploads |

The first run also loads a **sample department** (Computer Science and Engineering, 2026-27): 6 faculty, 60 students, 5 subjects with course outcomes, marks, attendance, publications, patents and projects. It is deliberately imperfect (two weak subjects, a few failing requirements) so you can see the system find problems. Change the passwords before any real use.

---

# 3. Who can do what

| Action | Faculty | HOD | Admin |
|---|:-:|:-:|:-:|
| Register an account (needs approval) | ✔ | | |
| Approve or reject new users | | ✔ | ✔ |
| Assign or remove the HOD role | | | ✔ |
| Create academic years, subjects, students, outcomes | | ✔ | ✔ |
| Enter own faculty records (qualifications, publications, patents, projects…) | ✔ | ✔ | ✔ |
| Enter marks, attendance, course outcomes | ✔ | ✔ | ✔ |
| Upload evidence documents | ✔ | ✔ | ✔ |
| Link evidence to an NBA requirement | | ✔ | ✔ |
| Run **Evaluate** on a requirement | | ✔ | ✔ |
| Save manual inputs for a requirement | | ✔ | ✔ |
| Generate gaps, assign corrective actions | | ✔ | ✔ |
| Approve, reject, request revision on submissions | | ✔ | ✔ |
| Override a submission decision | | | ✔ |
| Run the **Virtual NBA Inspection** | | ✔ | ✔ |
| Download PDF/Excel reports | ✔ | ✔ | ✔ |
| Create, validate, restore backups | | | ✔ |
| Delete a document | | ✔ | ✔ |

---

# 4. The three dashboards, section by section

Each dashboard is a set of tabs. The tab names below are the real ones on screen. Tabs marked ⚠ were still being checked for sample (non-live) data when this guide was written; if a number looks round or never changes, treat it as unverified.

## 4.1 Admin dashboard (admin@college.edu)

| Tab | What it is for | How to use it |
|---|---|---|
| Institution Overview (C3, C4, C5, C6) ⚠ | One-page summary: departments, faculty, students, users, readiness by criterion | Look first; click a criterion card to open it |
| Pending Approvals | New faculty accounts waiting for approval | Approve or Reject; approved users can sign in |
| User Management & Roles | List of all users, status, roles | Activate/deactivate a user; **Assign HOD** or remove it |
| Audit Logs & Override History | Who approved, rejected or overrode what, and when | Read-only record for inspectors |
| Database Backups & Restore | Backup files | **Create**, then **Validate**, then Restore only if needed |
| System Configuration ⚠ | Settings such as academic years | Create the academic year before anyone enters data |

Sidebar: Criterion 3 to 6 pages (same pages the HOD uses), Inspection, Reports.

## 4.2 HOD dashboard (hod@college.edu)

| Tab | What it is for | How to use it |
|---|---|---|
| Department Overview | Readiness from the digital twin and counts by status | Daily health check |
| Pending Approvals Queue | Items faculty submitted for approval | Approve, Reject or Request revision (with a comment) |
| Course Assignments (C3) | Which faculty teach which subjects | Assign a subject to a faculty member |
| Faculty Strength & SFR (C5) | Faculty count, qualifications, student-faculty ratio | Check against requirements 5.1 to 5.3 |
| Students Performance (C4) | Pass rates, marks, attendance, at-risk students | Check against 4.3 to 4.5 |
| Research & Contributions (C6) | Publications, patents, projects, consultancy | Check against 6.2.x |
| Gaps & Actions | Problems found and the fixes assigned | **Generate gaps**, then add an action with owner and due date |
| Department Analytics & SAR | Reports | Download PDF or Excel |

Sidebar: Criterion 3 to 6 (Evaluate, Inputs, History), **Inspection** (Run Virtual NBA Inspection), Reports.

## 4.3 Faculty dashboard (faculty1@college.edu to faculty6@college.edu)

| Tab | What it is for | How to use it |
|---|---|---|
| My Assigned Courses (C3) | Your subjects, course outcomes, marks | Add course outcomes and CO-PO mappings; enter marks |
| Assigned Students (C4) | Students in your courses, attendance | Enter attendance; see who needs support |
| My C5 Profile & FQI | Your qualifications, experience, certificates | Keep complete; feeds requirements 5.1 to 5.3 |
| My C6 Research & Consultancy | Publications, patents, projects, FDPs, consultancy | Add each record; feeds 6.2.x |
| Evidence Upload & Lifecycle | Upload and replace evidence files | Choose file, criterion, year; use Replace for a new version |
| HOD Feedback & My Submissions | Status of what you submitted | Fix anything marked *revision requested* and resubmit |

Bell icon: notifications such as assigned corrective actions.


---

# 5. Verify each criterion, step by step

Every requirement works the same way, so learn the pattern once.

## 5.0 The pattern (do this for any requirement)

1. Sign in as **HOD** (or Admin) and open the criterion page (for example **Criterion 5**).
2. Find the requirement row (for example *5.1 Student-Faculty Ratio*).
3. Click **Evaluate**. The system reads the stored records, runs the rule and shows:
   - the **status** (PASS / WARNING / FAIL / Needs rule clarification),
   - the **marks** it earned out of the maximum,
   - the **reason** in the limitations text.
4. If the reason says *missing context keys* or *must be entered by a reviewer*, click **Inputs**, fill in the listed fields, and **Save**. The row is re-evaluated immediately.
5. Click **History** to see every past evaluation. Nothing is overwritten.
6. Attach evidence: upload the document, then link it to the requirement. The requirement then counts as "has evidence".
7. Open the **Inspection** page and run the inspection to see everything together.

**How to prove the rule is real (not a mock):** change the underlying data, evaluate again, and watch the status change. Each criterion below includes a "Try this" test for exactly that.

**What the statuses mean**

| Status | Meaning | What to do |
|---|---|---|
| PASS | Meets the threshold | Keep evidence current |
| WARNING | Below full marks, or an input is missing | Read the reason; enter the missing input or improve the data |
| FAIL | Clearly below the expected level | A gap is created; assign a corrective action |
| Needs rule clarification | The NBA manual leaves a choice to your institution | Approve a method (see 3.7, 3.8) or record the decision |
| Not applicable | The requirement does not apply to this year | Nothing |

## 5.1 Criterion 3: Outcome-Based Assessment (120 marks)

*Question it answers: Did students actually learn what we said they would learn?*

| Req | What it checks | Where the data comes from |
|---|---|---|
| 3.1 Continuous assessment | Subjects have course outcomes mapped to program outcomes | **Auto**: subjects, COs and CO-PO mappings you entered |
| 3.2 SEE question papers | Quality of exam papers | **Inputs**: `reviewer_score` (HOD rubric score) |
| 3.3 Laboratory work | Lab and workshop assessment quality | **Inputs**: `reviewer_score` |
| 3.4 Industrial training | Internship assessment | **Inputs**: `reviewer_score` |
| 3.5 Projects | Project evaluation quality | **Inputs**: `reviewer_score` |
| 3.6 SDG | Sustainable Development Goal mapping | **Inputs**: `reviewer_score` |
| 3.7 CO attainment | How well students met each CO | **Auto-calculated from marks**, then **HOD approves the method** |
| 3.8 PO and PSO attainment | Roll-up of CO results into PO/PSO | **Auto-calculated**, then **HOD approves the method** |

### How CO, PO and PSO attainment is calculated

1. Faculty enter marks for each student and assessment.
2. A student **meets the target** when total marks ≥ **60%** of total maximum.
3. **CO attainment %** = students meeting the target ÷ students who appeared.
4. **Level**: 3 if ≥ 70%, 2 if ≥ 60%, 1 if ≥ 50%, otherwise 0.
5. A CO below **level 2** is **weak** and gets a recommended action (remedial teaching, reassessment, record new evidence).
6. **PO/PSO level** = average level of the mapped COs, weighted by the CO-PO correlation (1, 2 or 3).
7. Score out of 25 = average level ÷ 3 × 25.

Limits to know: assessments are not yet mapped to individual COs, so all COs of one subject share the subject's result. Survey-based (indirect) attainment is not blended in.

### Try this (about 10 minutes)

1. **HOD → Criterion 3 → CO Attainment tab.** In the sample data, CS503 (Database Systems) shows about 32% (level 0) and CS504 about 55% (level 1). Both are flagged weak.
2. Click **Approve attainment method**. Requirements 3.7 and 3.8 move from *Needs rule clarification* to a real score.
3. Open **Inputs** on 3.2 and enter a reviewer score of 8. Evaluate: PASS, 8 of 10.
4. **Make the weakness disappear:** as Faculty, raise marks for CS503 students above 60%. Return to the CO Attainment tab: the weak flag clears and the score rises.
5. Run **Evaluate** on 3.7 again and open **History**: you will see both runs.

## 5.2 Criterion 4: Students' Performance (120 marks)

*Question: How are our students performing?*

| Req | What it checks | Data |
|---|---|---|
| 4.1 Enrolment ratio | Admitted vs sanctioned intake | **Inputs**: `years` list (N1, N4, N per year) |
| 4.2 Success rate without backlogs | Batch completion | **Inputs**: `batches` list (A, B, N, N2) |
| 4.3 / 4.4 / 4.5 Academic performance (1st, 2nd, 3rd year) | Mean performance from marks | **Auto** from student marks |
| 4.6 Placement and higher studies | Needs institution decision | **Needs rule clarification** (the manual does not fix the formula) |
| 4.7 Professional activities | Qualitative | **Inputs**: `reviewer_score` |

**At-risk students:** *Criterion 4 → Students* lists students with average attendance below 75% or overall marks below 40%. These are deterministic indicators with the reason shown, not an AI opinion.

### Try this

1. Enter student marks as Faculty (or use the sample data). Evaluate 4.3: marks come from the average.
2. Lower a few students' attendance below 75%: the at-risk list grows and shows the reason.
3. Open **Inputs** on 4.1 and enter, for example, `[{"N1": 60, "N4": 60, "N": 66}]`. Evaluate and see the ratio-based score.

## 5.3 Criterion 5: Faculty Information (100 marks)

*Question: Do we have enough qualified faculty?*

This criterion is almost fully **automatic**, from faculty profiles and qualifications.

| Req | Marks | What it checks | Data |
|---|---|---|---|
| 5.1 Student-faculty ratio | 30 | Students ÷ faculty, banded (under 15 gives full marks) | **Auto** |
| 5.2 Faculty qualification index | 25 | Ph.D. and M.Tech count against required faculty (students ÷ 20) | **Auto** |
| 5.3 Faculty cadre proportion | 25 | Professors, associate and assistant professors vs the expected 1 : 2 : 6 split | **Auto** |
| 5.4 Visiting/adjunct faculty | 10 | Provision exists and 50+ hours per year | **Inputs**: `provision_exists`, `yearly_hours` |
| 5.5 Faculty retention | 10 | Retained faculty by cadre | Needs rule clarification (boundary decision) |

### Try this

1. Open **Faculty → My Profile** as faculty1 and note the designation and qualification.
2. As HOD, Evaluate 5.1: with 60 students and 6 faculty the ratio is 10 : 1, so full marks.
3. As Admin, approve a new faculty registration, then Evaluate 5.1 and 5.2 again: the ratio and qualification index change.
4. Change a professor's designation to Assistant Professor and Evaluate 5.3: the cadre score drops.

## 5.4 Criterion 6: Faculty Contributions (120 marks)

*Question: What are our faculty contributing?* (Criterion 5 asks who the faculty are; Criterion 6 asks what they do.)

| Req | Marks | Data |
|---|---|---|
| 6.1.1 Professional society memberships | 5 | **Inputs**: `reviewer_score` |
| 6.1.2.1 Resource persons invited | 5 | **Inputs**: `yearly_count` |
| 6.1.2.2 FDP/STTP participation | 5 | **Inputs**: `yearly_attendances` |
| 6.1.3 MOOCs developed | 7 | **Inputs**: `reviewer_score` |
| 6.1.4 MOOC certification by students | 8 | **Inputs**: `certified_students`, `total_students` |
| 6.1.5 FDPs organised | 10 | **Inputs**: `programs` list |
| 6.1.6 Student innovation support | 10 | **Inputs**: `participating_students`, `total_students` |
| 6.1.7 Industry training for students | 10 | **Inputs**: `trained_students`, `total_students` |
| 6.2.1 Research publications | 10 | **Auto** from faculty publications (a quality score may be asked) |
| 6.2.2 PhD students guided | 5 | **Inputs**: `enrolled_count`, `graduated_count` |
| 6.2.3 Patents and prototypes | 10 | **Auto** from faculty patents (granted or published) |
| 6.2.4 Sponsored research | 15 | **Auto** from faculty projects (grant amount) |
| 6.2.5 Consultancy | 15 | **Auto** from faculty consultancy (financial outlay) |
| 6.2.6 Seed money | 5 | **Inputs**: received and utilised amounts |

### Try this

1. As faculty1, add a publication under **Faculty → Publications**. As HOD, Evaluate 6.2.1: the count goes up.
2. Add a patent with status *Granted*. Evaluate 6.2.3: marks increase.
3. Add a sponsored project with a grant amount. Evaluate 6.2.4.
4. Upload an FDP certificate and link it to 6.1.2.2 (section 6 below), then enter `yearly_attendances` in **Inputs**.

---

# 6. Upload documents and attach evidence

**Accepted files:** PDF, Word (.docx), Excel (.xlsx), CSV, plain text, PNG, JPEG. Maximum 25 MB. The file type is checked from the file's real content, not its name. Scanned PDFs and images are read with OCR when Tesseract is installed.

**Faculty (uploading):**

1. Open **Faculty → Documents** (or the **Upload evidence** button on a criterion page).
2. Choose the file, give it a title, pick the **criterion** and the **academic year**.
3. Click **Upload**. The system fingerprints it (duplicate detection), stores it, extracts its text and indexes it for search.

**HOD or Admin (linking to proof):**

1. Open the requirement on its criterion page.
2. Click **Evidence → Link document** and choose the uploaded file. Add a one-line note such as *FDP attendance proof*.
3. The requirement now shows **Has evidence**.

**Replacing a document:** use **Replace** to upload a new version; the old version stays in **History**.

**Search your evidence:** the AI assistant and the `Analysis → retrieve` function search document text by meaning, so "What evidence do we have for FDP duration?" finds the certificate, with the document name and page.

**Evidence status**

| Status | Meaning |
|---|---|
| Linked | A document is attached to the requirement |
| Missing | Nothing is attached (counted as *Missing evidence* in the inspection) |
| Processed | Text was extracted and indexed |
| Needs review | Extraction partial (for example a scan without OCR) |

---

# 7. Find gaps, assign fixes, track them

1. **HOD → Gaps → Generate gaps.** Every FAIL, WARNING or missing-evidence requirement becomes a gap with a severity. Gaps are never duplicated; a gap that now passes is closed automatically.
2. Open a gap and click **Add action**. Enter a title, an owner (a faculty member), a priority and a **due date**.
3. The owner is notified (bell icon). They do the work, upload evidence, and mark the action **Completed** with a note.
4. Late actions appear under **Overdue actions**.
5. Re-run **Evaluate** or the inspection. A fixed requirement turns PASS and its gap closes.

This is the improvement chain the NBA wants to see: **Problem → Action → Responsible person → Deadline → Evidence → Result.**

---

# 8. The Virtual NBA Inspection

Open **Inspection** in the HOD or Admin sidebar and click **Run Virtual NBA Inspection**.

The system evaluates **every** requirement of Criteria 3 to 6 from your current records and saved inputs, refreshes the gaps, then shows:

- **PASS / WARNING / FAIL** counts and requirements that *need more input*,
- **Missing evidence**, **Pending actions**, **Overdue actions**,
- **Overall readiness %**, marks earned out of marks available,
- a **per-criterion table**,
- a **findings list**: for each non-passing requirement, the issue and the recommended action.

Readiness label: **READY** (at least 85% and no failures), **NEARLY READY** (60–84%), **NOT READY** (below 60%).

Each run is stored as evaluation history, so you can compare today with last month.

**First-time expectation:** on an empty department the answer is *NOT READY, 0%*. That is the honest result. Enter data, add inputs, attach evidence, and watch it climb.

---

# 9. Reports

**Reports** page → choose department and year → **Download PDF** or **Download Excel**. Both are produced from the same stored records and evaluations as the dashboards, so numbers always agree. The report states clearly that readiness is an internal indicator.

---

# 10. Admin tasks

- **Approve new users:** *Admin → Pending approvals*. New faculty cannot sign in until approved.
- **Make someone HOD:** *User management → Assign HOD*.
- **Academic years:** create the year before entering data for it; one year is active at a time.
- **Backups:** *Backups → Create backup*, then **Validate**. **Restore** replaces current data, so validate first. Keep backups outside the document folder.
- **Audit log:** every approval, override and rejection is recorded with who and when.

---

# 11. A complete 30-minute walkthrough

1. Run `./start.sh setup`. Open http://127.0.0.1:5500.
2. Sign in as **HOD**. Open **Inspection** and run it. Note the score and the findings.
3. Open **Criterion 5**, Evaluate 5.1, 5.2, 5.3. Read the marks and reasons.
4. Open **Criterion 3 → CO Attainment**. Spot the weak COs. Approve the attainment method.
5. Open **Inputs** on 3.2 to 3.6 and enter reviewer scores.
6. Sign out. Sign in as **faculty1**. Add a publication and upload an FDP certificate.
7. Sign in as HOD again. Link the certificate to 6.1.2.2. Evaluate 6.2.1.
8. **Gaps → Generate gaps.** Assign an action to a faculty member with a due date.
9. Run the **Inspection** again. The score is higher and the findings list is shorter.
10. Download the **PDF report**.

---

# 12. Troubleshooting

| Problem | Fix |
|---|---|
| Page loads but data is empty or login fails | Open the site as `127.0.0.1:5500`, not `localhost` |
| "Failed to fetch" | Check the backend runs: open http://127.0.0.1:8000/api/v1/health |
| Database errors | Make sure Docker Desktop is running; `docker ps` should list `nba-pg` |
| New faculty cannot sign in | An admin or HOD must approve them first |
| Evaluate says *missing context keys* | Click **Inputs** and fill the listed fields |
| Upload rejected | Use PDF, DOCX, XLSX, CSV, TXT, PNG or JPEG under 25 MB; renamed files are caught |
| 3.7 / 3.8 show *Needs rule clarification* | HOD must click **Approve attainment method** |
| AI answers unavailable | Optional: set `GROQ_API_KEY` for the AI service. All scoring works without it |

---

# 13. What is not built yet (honest list)

- Criteria 1, 2, 7, 8 and 9 (curriculum, teaching, facilities, continuous improvement, governance) and the lab/equipment, placement and IQAC modules.
- Mapping of individual assessment questions to individual COs (needed for per-CO precision).
- Placement and higher-studies formula (4.6): the manual leaves it to the institution.
- Faculty retention (5.5) boundary decision.
- Automatic document verification (name match, date validity) beyond text extraction and search.
- Single sign-on, e-mail notifications, S3/MinIO storage (files are stored locally).
