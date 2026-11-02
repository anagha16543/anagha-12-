# AI-NBA Readiness System — Frontend

A cinematic, animated scroll-driven frontend for the **AI-Driven NBA Accreditation Readiness System**. It represents a continuous **"Digital Twin"** of an engineering department undergoing National Board of Accreditation (NBA) review under the **Manual for UG Engineering Tier I (2026 Edition)**.

Built entirely with **pure HTML, CSS, and Vanilla JavaScript (ES modules)** without any framework or build step.

---

## 🚀 Quick Start

### 1. Start the Real Backend (AI-NBA-Readiness-System)
In your first terminal, start the real FastAPI backend on `http://localhost:8000`:
```bash
cd "../AI-NBA-Readiness-System/backend"
uvicorn app.main:app --host 127.0.0.1 --port 8000
```
*(Or double-click `run_real_backend.bat` inside the `frontend` folder. You can also view interactive Swagger docs at `http://localhost:8000/docs`).*

### 2. Start the Frontend Server
In your second terminal, serve the frontend on `http://localhost:5500`:
```bash
cd frontend
python -u -m http.server 5500 --directory "c:\Users\Anagha\OneDrive\Documents\major project\frontend"
```
*(Or double-click `run_frontend.bat` on Windows).*

Now open your browser at:
👉 **[http://localhost:5500](http://localhost:5500)**

---

## 🔑 Test Demo Accounts

| Role | Email | Password | Dedicated Dashboard | Access Privileges & API Boundaries |
|---|---|---|---|---|
| **ADMIN** | `admin@college.edu` | `password123` | **`dashboards/admin.html`** (Admin Console) | System backups (`/backups`), role assignment (Grant/Revoke HOD), approve pending faculty (`/users/pending`), view all users (`/users`) |
| **HOD** | `hod@college.edu` | `password123` | **`dashboards/reports.html`** (Department Head Overview) | Department gap analysis (`/gaps/generate`), SAR Excel & PDF export (`/reports/excel`, `/reports/pdf`), evaluate requirements (`/nba/evaluate`), approve department faculty (`/users/pending`). *Backups & role promotions forbidden (403).* |
| **FACULTY** | `faculty@college.edu` | `password123` | **`dashboards/c3.html`** (Assessment & Student Marks) | Course outcomes, student CIE marks (`/curriculum`), course file evidence uploads (`/documents`), view criteria C3/C5/C6. *Admin console, backups, gap generation, and evaluation rules forbidden (403).* |

*(Note: When `CONFIG.MOCK = true` in `js/config.js`, you can sign in with any of the accounts above without needing a running backend!)*

---

## 🎨 Design System & Motion Architecture

- **Dark Command-Centre Palette**: `#070B14` ink base with animated gradient mesh, glass cards (`backdrop-filter: blur(20px)`), and customizable light-theme toggle.
- **Cinematic Scroll Experience**:
  1. **Lenis**: Smooth inertial scrolling.
  2. **GSAP & ScrollTrigger**: Section pins, scrubbed parallax, text reveals, horizontal loop scrolling.
  3. **Node Network Canvas**: Interactive hero canvas reacting to mouse movement.
  4. **Skiper 48 Card Carousel**: 3D cards effect using Swiper 11 with tilt-on-hover, moving gradient border on active card, and shared-element expand transition into dashboards.
  5. **Chart.js**: Dynamic bar charts and stacked contribution graphs.
- **Status Color Enums (Matches Backend)**:
  - `PASS` (Green: `#10B981`)
  - `WARNING` (Amber: `#F59E0B`)
  - `FAIL` (Red: `#EF4444`)
  - `NOT_APPLICABLE` (Grey: `#64748B`)
  - `NEEDS_RULE_CLARIFICATION` (Purple: `#A855F7`)

---

## 📂 File Architecture

```
frontend/
├── index.html                 # Cinematic landing page & Criteria Carousel (Skiper 48)
├── login.html                 # Split-screen auth with animated cards & floating labels
├── register.html              # Faculty registration form
├── pending.html               # Account pending approval state
├── NOTES.md                   # API differences, notes & pending data sources
├── README.md                  # This file
│
├── dashboards/
│   ├── c3.html                # Criterion 3: Outcome-Based Assessment (120 Marks)
│   ├── c5.html                # Criterion 5: Faculty Information & SFR (100 Marks)
│   ├── c6.html                # Criterion 6: Faculty Contributions & R&D (120 Marks)
│   ├── inspection.html        # Virtual NBA Inspection simulator & audit trail
│   └── admin.html             # Admin approvals & system backups
│
├── css/
│   ├── tokens.css             # Design tokens, variables & colors
│   ├── base.css               # Typography, glassmorphism, reset & utilities
│   ├── auth.css               # Split screen login & register styling
│   ├── landing.css            # Hero canvas, chaos cards & scroll scenes
│   ├── carousel.css           # Skiper 48 criteria cards carousel port
│   ├── components.css         # Status pills, command palette, rings & drawers
│   └── dashboard.css          # Shared dashboard shell, sidebar & charts layout
│
└── js/
    ├── config.js              # Central configuration (API_BASE, TOKEN_KEY, MOCK)
    ├── api.js                 # Centralized fetch wrapper mapping all backend endpoints
    ├── auth.js                # Login, logout, registration & session restore
    ├── guard.js               # Role hierarchy & route protection (ADMIN > HOD > FACULTY)
    ├── store.js               # Reactive store with localStorage sync
    ├── ui.js                  # Toasts, custom cursor, skeleton loaders, counters
    ├── landing.js             # Lenis + GSAP ScrollTrigger scenes & hero canvas
    ├── carousel.js            # Port of Skiper 48 Swiper cards carousel
    ├── transitions.js         # Shared-element card expand navigation
    ├── dash/
    │   ├── shared.js          # Shared sidebar, topbar, Ctrl+K palette & polling
    │   ├── c3.js              # C3 CO attainment & matrix logic
    │   ├── c5.js              # C5 roster & SFR/FQI gauges
    │   └── c6.js              # C6 stacked charts & research leaderboard
    └── mock/
        └── index.js           # Realistic mock data matching backend schemas
```

---

## 🔒 Security & AI Rules

- **Frontend talks strictly to port 8000** (`http://localhost:8000/api/v1`), never port 8001.
- **AI is Advisory Only**: Models explain and contextualize qualitative documents. `ai_drives_compliance` is strictly `false` across all responses; AI never alters compliance numbers or scores.
- **Role-Based Guards**: Navigation and UI actions are conditionally displayed and enforced based on the user's roles (`ADMIN > HOD > FACULTY`).

---

## Attribution
- Card carousel inspired by **Skiper UI (Skiper 48)** — [https://skiper-ui.com](https://skiper-ui.com)

