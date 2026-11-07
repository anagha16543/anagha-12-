---
title: "Criterion 3 Test Guide: Testing Every Sub-category (3.1 to 3.8)"
---

# 1. What you will do

Criterion 3 asks one question: **"Did students actually learn what we said they would learn?"** It is worth **120 marks** across eight sub-categories, 3.1 to 3.8.

In this guide you will test each one the same way:

1. Open the Criterion 3 page.
2. Click **Evaluate** and read the result (status, marks, reason).
3. Give the system what it is missing (an **Input**, or data in the records).
4. Upload a **dummy evidence document** and link it to the requirement.
5. Evaluate again and see the result change.

**Time needed:** about 45 minutes for everything. Each sub-category takes 3 to 5 minutes.

> All numbers in this guide come from the sample data that ships with the project (6 faculty, 60 students, 5 subjects). If you loaded the sample data with `start.ps1 setup` / `start.sh setup`, you will see the same numbers.

---

# 2. Before you start

## 2.1 Start the system

Windows: `.\start.ps1` · Mac/Linux: `./start.sh` · then open **http://127.0.0.1:5500** (use `127.0.0.1`, not `localhost`).

## 2.2 Accounts

| Role | Email | Password | Why you need it |
|---|---|---|---|
| HOD | hod@college.edu | password123 | Evaluates requirements, saves inputs, links evidence |
| Faculty | faculty1@college.edu | password123 | Uploads evidence |
| Admin | admin@college.edu | password123 | Can do everything the HOD can |

## 2.3 The dummy test documents

They are in the folder **`docs/criterion3-test-files/`**. Each is fake, labelled *DUMMY DOCUMENT FOR TESTING ONLY*, and written to look like the real thing.

| File | Use it for | What is inside |
|---|---|---|
| `3.1_Course_File_CS501_Machine_Learning.pdf` | 3.1 | Course details, 3 course outcomes, CO-PO mapping table, syllabus, lesson plan |
| `3.2_SEE_Question_Paper_CS502_Computer_Networks.pdf` | 3.2 | Question paper with each question mapped to a CO and Bloom level, quality checklist |
| `3.3_Lab_Manual_and_Records_CS503.docx` | 3.3 | 12 lab experiments mapped to COs, lab records, safety briefing |
| `3.4_Internship_Summary_2026-27.docx` | 3.4 | 38 of 60 students completed internships, assessment split, PO linkage |
| `3.5_Project_Evaluation_Sheet.xlsx` | 3.5 | Project rubric and scores for three teams |
| `3.6_SDG_Mapping_Report.docx` | 3.6 | Three activities mapped to SDGs 2, 7 and 10 |
| `3.7_CO_Attainment_Sheet.xlsx` | 3.7 | Attainment per subject, method, weak COs (numbers match the system) |
| `3.8_PO_PSO_Attainment_Sheet.xlsx` | 3.8 | PO and PSO levels and score (numbers match the system) |
| `Marks_CS505_Operating_Systems.csv` | Spare | 60 rows of CIE and SEE marks for practice uploads |

Accepted file types: PDF, DOCX, XLSX, CSV, TXT, PNG, JPEG, up to 25 MB.

## 2.4 Know how scoring works

| Sub-category | Marks | How the score is decided |
|---|---|---|
| 3.1 | 10 | **Automatic.** Share of subjects that have at least one course outcome (CO) defined |
| 3.2 to 3.4, 3.6 | 10 each | **You enter a reviewer score** (0 to 10). 7 or more = PASS, 4 to 6.9 = WARNING, below 4 = FAIL |
| 3.5 | 20 | **You enter a reviewer score** (0 to 20). 14 or more = PASS, 8 to 13.9 = WARNING, below 8 = FAIL |
| 3.7 | 25 | **Automatic from student marks**, after the HOD approves the method. 17.5 or more = PASS, 10 to 17.4 = WARNING, below 10 = FAIL |
| 3.8 | 25 | **Automatic** roll-up from CO results, same approval and bands as 3.7 |

**Important:** uploading evidence does **not** change a status or a mark. Marks come from the rules. Evidence proves the claim and shows up as *Evidence: linked* in the inspection. This is deliberate, so a file can never be used to buy marks.

## 2.5 Starting state (what you should see first)

Sign in as **HOD**, open **Criterion 3**, and click **Evaluate All C3**. You should see:

| Req | Status | Marks |
|---|---|---|
| 3.1 | PASS | 10 / 10 |
| 3.2, 3.3, 3.4, 3.5, 3.6 | WARNING (needs a reviewer score) | 0 |
| 3.7, 3.8 | Needs rule clarification | 0 |
| **Total** | | **10 / 120** |

If your numbers differ, someone changed the data. Reload the sample data or tell me what differs.

---

# 3. The three actions you will repeat

## Action A: Evaluate a requirement

1. Sign in as **HOD**. In the left menu click **5. Criterion 3 (Assessment)**.
2. On the **Requirements & Evaluation** tab, find the row.
3. Click **Evaluate**.
4. Read the **status** chip, the **marks**, and the reason under the row.
5. Click **History** to see every previous run. Nothing is ever overwritten.

## Action B: Enter an Input (reviewer score, approval, etc.)

1. On the same row click **Inputs**.
2. A panel opens. It lists every figure the rule uses. Fields tagged **Auto from records** are filled by the system; fields tagged **Required** are what the rule is waiting for.
3. Type the value and click **Save and re-evaluate**. The row updates straight away.

## Action C: Upload evidence and link it to a requirement

1. Sign in as **HOD** (or Admin). (Faculty upload from their own dashboard's *Evidence Upload & Lifecycle* tab; this guide tests the Criterion 3 page.)
2. Open **Criterion 3 → Evidence Documents** tab.
3. Click **+ Upload Evidence Document**.
4. Type a **Document Title**, choose the **file**, and in **This document proves requirement** pick the sub-category (for example *3.2 SEE Question Paper Evaluation*).
5. Click **Upload evidence**. A message confirms the upload and the link.
6. The file appears in the list with a green **Proves 3.2** tag. A file uploaded without choosing a requirement shows an amber **Not linked to a requirement** tag.

Rules for linking: the person who uploaded a file, an HOD, or an Admin can link it. Another faculty member cannot.

---

# 4. Test each sub-category

## 3.1 Continuous Assessment (10 marks): course outcomes defined

**What it checks.** Every subject must have at least one course outcome (CO). The score is the share of subjects that do.
(The page title says *Continuous Assessment*; the rule measures CO coverage.)

**Test 1: the passing case**

1. Action A on **3.1**.
2. **Expected:** **PASS, 10 / 10**. All 5 sample subjects have COs.

**Test 2: make it fail, then fix it**

1. Open **http://127.0.0.1:8000/docs** (the API page). Click **Authorize**, sign in as HOD (`hod@college.edu` / `password123`).
2. Open **POST /api/v1/subjects** → *Try it out*. Use the active academic year id from **GET /api/v1/academic-years**:

```json
{ "code": "CS999", "name": "Test Subject", "semester": 5,
  "academic_year_id": "<paste the id>", "department": "Computer Science and Engineering", "credits": 3 }
```

3. Back on the Criterion 3 page click **Evaluate** on 3.1.
   **Expected:** **WARNING, 8.33 / 10**. Five of six subjects have COs (83%).
4. In the API page open **POST /api/v1/subjects/{subject_id}/course-outcomes**, paste the new subject's id, and send `{ "code": "CS999.CO1", "description": "Test outcome" }`.
5. **Evaluate** 3.1 again. **Expected:** **PASS, 10 / 10**.
6. Open **History**: you will see all three runs.

**Evidence test:** upload `3.1_Course_File_CS501_Machine_Learning.pdf` and link it to **3.1** (Action C).

**Rule of thumb:** 100% coverage = PASS; 80% to 99% = WARNING; below 80% = FAIL.

---

## 3.2 SEE Question Paper Evaluation (10 marks)

**What it checks.** Quality of semester-end exam papers. A reviewer scores it from 0 to 10.

1. Action A on **3.2**. **Expected:** WARNING, 0 / 10, reason *missing context keys: reviewer_score*.
2. Action B: enter **reviewer_score = 8** and save. **Expected:** **PASS, 8 / 10**.
3. Try the other bands, re-evaluating each time:

| Enter | Result |
|---|---|
| 8 | PASS, 8 / 10 |
| 5 | WARNING, 5 / 10 |
| 2 | FAIL, 2 / 10 |

4. **Evidence test:** upload `3.2_SEE_Question_Paper_CS502_Computer_Networks.pdf`, link to **3.2**.
5. Click **History**: you now see every score you tried.

---

## 3.3 Laboratory Work and Workshop (10 marks)

**What it checks.** Whether labs and workshops are conducted and assessed properly. Reviewer score 0 to 10.

1. Action A: WARNING, 0 / 10 (needs `reviewer_score`).
2. Action B: enter **7**. **Expected:** **PASS, 7 / 10** (7 is exactly the PASS line).
3. Change it to **6.9**. **Expected:** WARNING. This proves the boundary.
4. For the final checklist in section 5, set it to **5** (WARNING, 5 / 10).
5. **Evidence test:** upload `3.3_Lab_Manual_and_Records_CS503.docx`, link to **3.3**. This is a Word file, so it also proves DOCX uploads work.

---

## 3.4 Industrial Training / Internship (10 marks)

**What it checks.** Internship quality and assessment. Reviewer score 0 to 10.

1. Action A: WARNING, 0 / 10.
2. Action B: enter **2**. **Expected:** **FAIL, 2 / 10**.
3. Raise it to **8**. **Expected:** PASS, 8 / 10. (For the final checklist in section 5, set it back to **2**.)
4. **Evidence test:** upload `3.4_Internship_Summary_2026-27.docx`, link to **3.4**.

---

## 3.5 Projects Evaluation (20 marks)

**What it checks.** How student projects are evaluated. Reviewer score 0 to **20**. (This one has different bands.)

| Enter | Result |
|---|---|
| 15 | PASS, 15 / 20 (14 or more passes) |
| 10 | WARNING, 10 / 20 |
| 5 | FAIL, 5 / 20 |

1. Action A, then Action B with **15**: **PASS, 15 / 20**.
2. **Evidence test:** upload `3.5_Project_Evaluation_Sheet.xlsx`, link to **3.5**. This is an Excel file; its sheets (rubric and team scores) are read and become searchable.

---

## 3.6 Sustainable Development Goals (10 marks)

**What it checks.** Evidence that the programme addresses the UN Sustainable Development Goals. Reviewer score 0 to 10.

1. Action A, then Action B with **7**: **PASS, 7 / 10**.
2. **Evidence test:** upload `3.6_SDG_Mapping_Report.docx`, link to **3.6**.

---

## 3.7 Course Outcome (CO) Attainment (25 marks)

**What it checks.** How well students actually met each course outcome, calculated from their marks. This is the most important sub-category.

**How the system calculates it** (also shown on the *CO Attainment & Matrix* tab):

1. A student **meets the target** when total marks are at least **60%** of the maximum.
2. **CO attainment %** = students meeting the target ÷ students who appeared.
3. **Level:** 3 if 70% or more, 2 if 60% or more, 1 if 50% or more, otherwise 0.
4. A CO below **level 2** is **weak** and gets a recommended action.
5. Score out of 25 = average level ÷ 3 × 25.

**Test 1: approval is required first**

1. Action A on **3.7**. **Expected:** *Needs rule clarification*, 0 / 25. NBA wants each college to approve its own method, so the system will not score until you do.
2. Open the **CO Attainment & Matrix** tab. You will see **Awaiting HOD approval**, the method text, and the computed score **16.67 / 25**.
3. Click **Approve attainment method**.
4. Return to **Requirements & Evaluation**, **Evaluate** 3.7.
   **Expected: WARNING, 16.67 / 25.** (17.5 is the PASS line, so this is just short. That is correct.)

**Test 2: read the course table**

On the *CO Attainment & Matrix* tab, **Course outcome attainment by course** should show:

| Subject | Attainment | Level |
|---|---|---|
| CS501 Machine Learning | 71.7% | 3 |
| CS502 Computer Networks | 81.7% | 3 |
| CS503 Database Systems | about 38% (random sample data, may differ slightly) | 0 |
| CS504 Software Engineering | 55.0% | 1 |
| CS505 Operating Systems | 70.0% | 3 |

**Weak course outcomes and what to do** lists the 6 COs of CS503 and CS504, each with a recommended action (remedial sessions, practice assessments, reassess, record new evidence).

**Test 3: see how better results lift the score (using the target setting)**

The page does not let you overwrite marks that already exist, so test the effect with the target percentage instead:

1. Open **http://127.0.0.1:8000/docs**, click **Authorize** and sign in as HOD.
2. Open **GET /api/v1/analysis/attainment** → *Try it out*. First leave `target_percent` at **60** and run it. You will see CS503 at level 0 and CS504 at level 1, score **16.67**.
3. Run it again with `target_percent` **40**. All five subjects reach level 3 and the score becomes **25.0**. This shows exactly what a real improvement in student results would do: fewer weak COs and a higher 3.7 score.

(The 3.7 requirement itself always uses the 60% target; this call is only to see the effect.)

**Evidence test:** upload `3.7_CO_Attainment_Sheet.xlsx`, link to **3.7**.

---

## 3.8 Program Outcome (PO) and PSO Attainment (25 marks)

**What it checks.** The CO results rolled up into the program outcomes. Each PO or PSO level is the average level of the COs mapped to it, weighted by how strongly they map (1, 2 or 3).

1. Action A on **3.8**: *Needs rule clarification*, until the method is approved (the same single approval as 3.7).
2. On the *CO Attainment & Matrix* tab read **Program outcome (PO) levels** and **Program specific outcome (PSO) levels**. In the sample data POs 2 and 3 and 8 reach level 3.0 while others are lower.
3. After approval, **Evaluate** 3.8. **Expected: PASS, 18.26 / 25.**
4. **Evidence test:** upload `3.8_PO_PSO_Attainment_Sheet.xlsx`, link to **3.8**.

---

# 5. The full-run checklist

After doing every test above (with the reviewer scores 8, 5, 2, 15, 7 and the approval), the page should total about **82 / 120**. Use this table to confirm each result with the values below:

| Req | You entered | Expected status | Marks |
|---|---|---|---|
| 3.1 | nothing | PASS | 10 / 10 |
| 3.2 | reviewer_score 8 | PASS | 8 / 10 |
| 3.3 | reviewer_score 5 | WARNING | 5 / 10 |
| 3.4 | reviewer_score 2 | FAIL | 2 / 10 |
| 3.5 | reviewer_score 15 | PASS | 15 / 20 |
| 3.6 | reviewer_score 7 | PASS | 7 / 10 |
| 3.7 | approve method | WARNING | 16.67 / 25 |
| 3.8 | approve method | PASS | 18.26 / 25 |
| **Total** | | | **81.93 / 120** (about 68%) |

Then:

1. Open **Inspection** (left menu) and click **Run Virtual NBA Inspection**.
2. Look at the **Criterion 3** line: marks earned, and the findings list. Each non-passing requirement (3.3, 3.4, 3.7) appears with the issue and the recommended action.
3. The **Missing evidence** total is the number of requirements (across Criteria 3 to 6) with no linked file. Each Criterion 3 file you link lowers it by one, so linking all eight lowers it by 8.

---

# 6. Check the evidence search (optional)

On **Criterion 3 → AI Advisory & RAG** tab, type a question in **Evidence Semantic Search** and click **Search**. With the dummy files uploaded:

| Type | Top result should be |
|---|---|
| `CO-PO mapping course outcomes` | the 3.1 course file |
| `question paper Bloom level` | the 3.2 question paper |
| `lab experiments safety` | the 3.3 lab manual |
| `internship duration companies` | the 3.4 internship summary |
| `project rubric team scores` | the 3.5 project sheet |
| `SDG zero hunger` | the 3.6 SDG report |

Search uses keyword relevance for now (the vector model is not loaded), so use words that appear in the document.

---

# 7. Reset to a clean state

- **Reviewer scores:** open **Inputs** on a row and set the value again, or leave them; they only affect Criterion 3 evaluations.
- **Evidence:** the page has no delete button. To remove a test file, open **http://127.0.0.1:8000/docs**, sign in as HOD, and use **DELETE /api/v1/documents/{document_id}** (get the id from **GET /api/v1/documents**). A deleted file can be uploaded again.
- **Everything:** run `python -m app.db.seed_demo` on a fresh database to reload the sample data.

---

# 8. If something looks wrong

| Symptom | What to do |
|---|---|
| The page shows old numbers or `[object Object]` | Hard refresh: **Ctrl+F5** (Windows) or **Cmd+Shift+R** (Mac). Browsers cache scripts. |
| Evaluate shows an error in red | Read the message; it is the real server reply. Check the backend is running at `http://127.0.0.1:8000/api/v1/health`. |
| 3.7 and 3.8 stay at *Needs rule clarification* | Click **Approve attainment method** on the *CO Attainment & Matrix* tab. |
| Upload says *File type not permitted* | Use PDF, DOCX, XLSX, CSV, TXT, PNG or JPEG. Renamed files are detected. |
| *Could not link it to the requirement* | Only the uploader, an HOD or an Admin can link. Sign in as one of them. |
| Faculty cannot press **Evaluate** or **Inputs** | By design. Only HOD and Admin evaluate. |

---

# 9. What was checked, and what to know

**Checked by running it** (API and, where noted, in the browser):

- 3.1: PASS at full coverage, WARNING (8.33) with one subject lacking COs, PASS again after adding one.
- 3.2 to 3.6: every band (PASS, WARNING, FAIL) and the 7.0 / 6.9 boundary through saved inputs; history keeps every run.
- 3.7 and 3.8: need approval first; scores 16.67 and 18.26; the weak COs (CS503, CS504) found; a higher CO result lifted the 3.7 score (when I raised CS503 marks directly in the database it went from 16.67 to 21.67, PASS; I then restored the sample data). The target setting shows the same effect safely.
- All eight dummy files uploaded, processed (text extracted from PDF, DOCX and XLSX), linked to their requirement, and found by search.
- The upload form with the requirement dropdown (in the browser, signed in as Admin), faculty linking their own upload through the API, and another faculty member being refused (API). I did not test the upload form signed in as HOD or faculty in the browser.
- Automated tests: the full backend suite passes.

**Known limits:**

- Marks are not tied to individual COs yet, so every CO in a subject shares the subject's result.
- Survey (indirect) attainment is not blended into 3.7.
- Reviewer scores for 3.2 to 3.6 are your judgement. The system records and bands them, and does not read the documents to score them.
- The old *CO-PO Mapping Completeness* item exists as a 0-mark legacy rule and is not part of the 120.
