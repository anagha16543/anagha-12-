# AI-Driven NBA Accreditation Readiness System

A web system that helps an engineering department prepare for **NBA accreditation (UG Engineering, Tier I, 2026 manual)**. Teachers enter their data and upload evidence. The system checks **Criteria 3, 4, 5 and 6** (460 marks in total) against fixed rules and shows what passes, what is weak, and what is missing.

| Criterion | Topic | Marks |
|---|---|---|
| 3 | Course outcomes and assessment | 120 |
| 4 | Students' performance | 120 |
| 5 | Faculty information | 100 |
| 6 | Faculty contributions | 120 |

The scores come from a **deterministic rule engine** (same data in, same score out). AI is only an optional helper for written reviews.

---

## What is included

```
rohit/
├── frontend/      Website (plain HTML, CSS, JavaScript). No build step.
├── backend/       API and rule engine (Python, FastAPI)
├── ai-service/    Optional AI review service (Python, FastAPI, Groq)
├── database/      Database notes
├── documents/     Test guides (PDF), dashboard map, sample test files
├── docs/          Longer guides and developer notes
├── start.ps1 / start.bat   Windows start scripts
└── start.sh                Mac and Linux start script
```

### Frontend (`frontend/`)
- **Pages:** landing page, login, register, pending approval, and three role dashboards (Admin, HOD, Faculty).
- **Criterion pages:** `dashboards/c3.html` to `c6.html`. Each has a requirements table, an Evaluate button, an Inputs drawer for reviewer scores, and an evidence upload box.
- **Virtual Inspection:** `dashboards/inspection.html` runs all four criteria together and gives one readiness score.
- **Reports:** PDF and Excel export from `dashboards/reports.html`.
- **Code:** `js/api.js` is the only place that talks to the backend. `js/dash/` holds one script per dashboard. `css/` holds the theme. Light and dark mode and a notification bell are built in.

### Backend (`backend/`)
- **API:** FastAPI, under `app/api/v1/` (login, users, criteria and requirements, documents, curriculum and marks, faculty records, inspection, gaps and actions, notifications, reports, backups).
- **Rule engine:** `app/business_rules/criterion3_rules.py` to `criterion6_rules.py`. Each requirement returns PASS, WARNING, FAIL or NEEDS CLARIFICATION with the reason.
- **Services:** `criteria_context_service.py` collects the numbers each rule needs from the database. `evaluation_service.py` runs a rule and stores the result. `attainment_service.py` works out CO, PO and PSO attainment. `document_processor.py` reads PDF, DOCX, XLSX, CSV, TXT and images. `rag_service.py` finds matching passages in uploaded documents.
- **Security:** login with JWT tokens, three roles (Admin, HOD, Faculty), every action checked against the role.
- **Tests:** 263 automated tests in `backend/tests/`.

### Database (PostgreSQL only)
- **PostgreSQL 14 or newer** with the **pgvector** extension. No other database is used.
- Tables are created by **Alembic migrations** (`backend/migrations/`), not by hand.
- Main tables: users and roles, academic years, subjects, course outcomes and mappings, students, marks and attendance, faculty records (qualifications, publications, patents, projects, training), NBA criteria and requirements, requirement evaluations, **requirement inputs** (reviewer scores typed by the HOD), documents, document chunks, evidence links, gaps and corrective actions, notifications, audit log and backups.
- Uploaded files are stored on disk in `backend/documents/uploads/`. Their details, extracted text and links to requirements are stored in the database.

### AI service (`ai-service/`)
- Optional. Gives written advice on a requirement using the evidence found. It needs a free **Groq API key** in `ai-service/.env` (`GROQ_API_KEY=...`). Without a key the "AI Agent Review" buttons show a clear "no API key" message and everything else still works.

---

## How the parts are linked

```
 Browser (frontend, port 5500)
        │  HTTP + JSON, login token         js/api.js
        ▼
 Backend API (FastAPI, port 8000)  ──────►  Rule engine
        │                                    (criterion 3-6 rules)
        │  SQL (SQLAlchemy)
        ▼
 PostgreSQL + pgvector (port 5432)   ◄──── uploaded files on disk
        ▲
        │  evidence passages
 AI service (port 8001, optional) ◄── called by the backend only
```

- The browser **never** talks to the database or the AI service. It only calls the backend.
- The backend reads data from PostgreSQL, builds the numbers for a rule, runs the rule, and saves the result.
- The AI service is called by the backend, with passages found in uploaded documents.

---

## How it works

1. **Sign in.** Admin approves new users. Roles decide what each person can do.
2. **Faculty enter data:** course outcomes and marks for their own subjects, their qualifications, publications, patents, projects and training. They upload evidence files.
3. **Evidence upload.** Each file is saved, its text is extracted, and it is linked to one requirement (for example "proves 3.4").
4. **HOD adds judgement.** Some marks need a human opinion. The HOD opens **Inputs** on a requirement and types a reviewer score or a count.
5. **Evaluate.** The backend collects the data, runs the rule, and returns the status, marks, and the reason. Results are stored with history.
6. **Gaps.** Weak or failing requirements become gaps. The HOD assigns corrective actions, and the person responsible gets a notification.
7. **Virtual Inspection.** Runs every requirement of Criteria 3 to 6 and gives one readiness score and a list of findings.
8. **Reports.** Export the result as PDF or Excel.

| Role | Can do |
|---|---|
| Faculty | Add outcomes and marks for own subjects, add own records, upload and link own evidence |
| HOD | Everything above, plus reviewer scores, Evaluate, approvals, gaps, Virtual Inspection |
| Admin | Everything the HOD can, plus users, backups, audit log |

---

## Run it

You need **Python 3.12 or newer** and **PostgreSQL 14 or newer with pgvector**. No Docker.

### Windows
1. Install Python (tick *Add python.exe to PATH*) and PostgreSQL. Install pgvector, or use a free hosted Postgres that already has it (Neon or Supabase) and put its connection string in `backend\.env`.
2. Create the database: `createdb -U postgres nba_readiness`
3. In PowerShell, in the project folder:
   ```powershell
   .\start.ps1 setup     # first time: creates .env, installs packages, builds tables, loads sample data
   .\start.ps1           # every time after that
   ```
   If PowerShell blocks the script, run once: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.
4. Follow `documents/Windows_Checklist.pdf` for the full step-by-step check.

### Mac or Linux
```bash
createdb nba_readiness
./start.sh setup
./start.sh
```

Then open **http://127.0.0.1:5500**. Always use `127.0.0.1`, not `localhost`.

| Service | Address |
|---|---|
| Website | http://127.0.0.1:5500 |
| API docs | http://127.0.0.1:8000/docs |
| AI service | http://127.0.0.1:8001 |

### Sample logins (password `password123`)
`admin@college.edu`, `hod@college.edu`, `faculty1@college.edu` to `faculty6@college.edu`.
The first run loads a sample department (6 faculty, 60 students, 5 subjects). Change these passwords before real use.

### Settings
Copy `backend/.env.example` to `backend/.env` (the setup script does this) and `ai-service/.env.example` to `ai-service/.env`. Real `.env` files are not stored in git.

---

## Test it

- **Step-by-step guides (one per criterion, 1 to 2 pages each):** `documents/Test_Guide_Criterion_3.pdf` to `Test_Guide_Criterion_6.pdf`.
- **Which dashboard handles which criterion:** `documents/Dashboard_Criteria_Map.pdf`.
- **Test files to upload:** `documents/Test_Files/C3` to `C6` (file names start with the requirement number they prove).
- **Expected result after all four guides:** C3 81.9, C4 86.1, C5 100, C6 71.3; Virtual Inspection about **339 / 460 (73.8%), Nearly Ready, 0 missing evidence**.
- **Automated tests:** `cd backend` then `python -m pytest` (263 tests).

---

## Known limits

- Reviewer scores are typed by the HOD, so their accuracy depends on the person.
- Criteria 4.6 and 5.5 need an institutional decision on how to count (marked "boundary resolved" in Inputs).
- Document search matches keywords, not meaning. Scanned PDFs are searchable only when Tesseract OCR is installed.
- Uploads are limited to 25 MB per file.
- The system is tested on sample data and a fresh install. A pilot with real department files is the next step.
- Scores are an internal readiness indicator, not an official NBA score.

## More documents
`documents/User_Guide.pdf` (full guide), `docs/` (architecture, API and database notes), `frontend/NOTES.md`.
