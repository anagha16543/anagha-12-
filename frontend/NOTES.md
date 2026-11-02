# NOTES.md — API Mismatches, Implementation Notes & Pending Items
_AI-NBA Readiness System Frontend_

---

## Live Integration Status (Branch: integration/ai-agents-backend)

- **Repository**: `https://github.com/TubatasneemW/AI-NBA-Readiness-System` (cloned locally to `../AI-NBA-Readiness-System`)
- **Backend Service**: FastAPI running at `http://localhost:8000/api/v1`
- **Database**: Initialized and seeded with standard schema (all models across users, faculty, academic years, criteria C3/C4/C5/C6, and requirements)
- **CORS Config**: `CORS_ORIGINS` configured to explicitly whitelist `http://localhost:5500` and `http://127.0.0.1:5500`
- **Live Authentication**: Real JWT authentication tested and working with `admin@college.edu / password123` and `hod@college.edu / password123`
- **AI Agent Integration**: 8 advisory agents (`assessment_agent`, `compliance_agent`, `coordinator_agent`, `document_agent`, `faculty_agent`, `inspection_agent`, `report_agent`, `student_agent`) mapped under `/ai-service/app/agents`

---

## API Differences Found (Code vs README)

| Item | README/Spec says | Code actually does | Frontend action |
|---|---|---|---|
| `/auth/login` body | Not specified | **JSON** `{email, password}` — NOT `application/x-www-form-urlencoded` | Uses `Content-Type: application/json` ✓ |
| `/auth/register` | "faculty self-registration" | JSON body matching `FacultyRegisterRequest`: `{email, password, faculty_id, full_name, designation, department, contact_number?}` | Implemented exactly ✓ |
| `/auth/me` response | "roles array" | Returns `{id, email, status, roles: string[], faculty_profile: {...}, created_at, last_login}` | Stored in `store.js` ✓ |
| `/documents` multipart | Not documented precisely | FormData fields: `file` (binary blob), then string fields: `title`, `department`, `academic_year_id`, `criterion_code`, optional `requirement_id` | `api.uploadDocument(FormData)` sends raw FormData ✓ |
| `/digital-twin/snapshot` | Spec says "snapshot" | Route is `GET /digital-twin/snapshot?department=...&academic_year_id=...` | Confirmed ✓ |
| `/digital-twin/criteria/{code}` | Spec says "criterion analytics" | `GET /digital-twin/criteria/{criterion_code}?department=...&academic_year_id=...` | Confirmed ✓ |
| `/academic-years/{id}` GET | Implied | **Does NOT exist** — only list endpoint. Use list and filter client-side. | Handled client-side ✓ |
| `/criteria` vs `/requirements` | README says "GET /criteria" | Router prefix is `/criteria`, requirements sub-path is `/criteria/{id}/requirements` | api.listRequirements(criterionId) ✓ |
| Status enums | PASS, WARNING, FAIL, NOT_APPLICABLE, NEEDS_RULE_CLARIFICATION | Confirmed in `readiness_rules.py` | Mapped in `config.js` and `ui.js` ✓ |
| AI service port | Not to be called | Frontend NEVER calls port 8001. Backend's `agent_client.py` calls the AI service internally. | CONFIG.API_BASE = port 8000 only ✓ |
| `ai_drives_compliance` | Always false | Backend hardcodes `ai_drives_compliance=False` in all AI responses | Frontend never blends AI into scores ✓ |

---

## Motion & 3D Criteria Showcase Behavior

- **Skiper 58 TextRoll Engine (Homepage Hero)**:
  - Ported from Skiper 58 (`TextRoll`) to Vanilla JS and CSS for `"Your department."` and `"Digitally twinned."`.
  - Uses dual-layer characters with center-outward stagger formula (`STAGGER * Math.abs(i - (len - 1) / 2)` where `STAGGER = 0.035`).
  - Layer 1 rolls from `translateY(0%)` up to `translateY(-100%)`; Layer 2 rolls from `translateY(100%)` up to `translateY(0%)`.
  - Non-breaking spaces (`\u00A0`) prevent whitespace collapse.
  - Interactive on hover, focus-visible, keyboard Enter/Space, and runs a subtle introductory wave on mount.

- **Scroll-Driven Staging**:
  - The Criteria cards showcase arranges:
    - **C6 (Faculty Contributions)** on the **LEFT side of C3** upon scrolling down.
    - **C3 (Outcome-Based Assessment)** in the **CENTER** as the primary active card with glowing borders.
    - **C5 (Faculty Information)** on the **RIGHT side of C3** upon scrolling down.
  - As the user scrolls into view, ScrollTrigger smoothly scrubs the spread so C6 comes into place on the left and C5 on the right.
  - Clicking any side card brings it smoothly into focus. Clicking the active card triggers the shared-element expansion into its dashboard.
  - All scroll animations are tied strictly to user scrolling (`scrub: 0.8`), with no autonomous runaway motion.

---

## Pending Data Sources (Widgets showing graceful fallback state)

| Widget | Dashboard | Fallback Handling |
|---|---|---|
| CO attainment % per student | C3 | Rendered with fallback CIE marks dataset; live aggregation ready |
| PO/PSO attainment matrix values | C3 | Pre-configured Tier I articulation matrix mapped to live CO IDs |
| Faculty completeness ring % | C5 | Computed client-side with visual fallback rings |
| SFR value | C5 | Evaluated via deterministic backend call `POST /requirements/{id}/evaluate` |
| FQI value | C5 | Evaluated via deterministic backend call with formula display |
| Year-wise stacked chart (C6) | C6 | Rendered via Chart.js with CAY, CAYm1, and CAYm2 aggregation |
| Overall readiness % on landing hero | index.html | Shows animated gauge simulation; live snapshot available when signed in |

---

## Implementation Details

### Authentication Flow
1. `POST /auth/login` → `{access_token, token_type:"bearer", expires_in:28800}`
2. Store token in `localStorage` under `TOKEN_KEY`
3. `GET /auth/me` → user profile with roles
4. On 401: clear session, redirect to `login.html?redirect=<current>`
5. Account statuses: `ACTIVE`, `PENDING`, `REJECTED`, `DISABLED`

### Role Hierarchy (highest → lowest)
```
ADMIN > HOD > FACULTY
```
- `guard.js`: `hasMinRole('HOD')` returns true for HOD and ADMIN
- `data-require-role="HOD ADMIN"` → hidden for FACULTY
- `data-min-role="HOD"` → hidden if role below HOD

### MOCK Mode
Set `CONFIG.MOCK = true` in `js/config.js` to run without backend.
Demo credentials (mock): `admin@college.edu / password123`

---

## Phase Completion Tracker

- [x] **Phase 1**: CSS tokens, base, auth styles, config, api.js, auth.js, guard.js, store.js, ui.js, mock data, login/register/pending pages
- [x] **Phase 2**: Landing page (index.html) — Lenis + GSAP ScrollTrigger scenes 1–5 & canvas
- [x] **Phase 3**: Criteria 3D showcase with C6 on left side of C3, tilt, live stats, and expand navigation
- [x] **Phase 4**: Shared dashboard shell + C3, C5, and C6 dashboards
- [x] **Phase 5**: Gaps, Evidence, AI panels; Virtual Inspection simulation, Admin console
- [x] **Phase 6**: Polish, accessibility, reduced-motion, README (run steps + test accounts) and NOTES.md

---

## Browser Test Matrix

| Browser | Width | Status |
|---|---|---|
| Chrome | 1440px | ✓ Verified |
| Chrome | 1024px | ✓ Verified |
| Chrome | 390px | ✓ Verified |
| Edge | 1440px | ✓ Verified |
| Edge | 1024px | ✓ Verified |
| Edge | 390px | ✓ Verified |
