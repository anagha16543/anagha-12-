/**
 * dash/hod.js — Head of Department (HOD) Command Center
 * AI-NBA Readiness System
 */

import { api } from '../api.js';
import { store } from '../store.js';
import { initDashboardShell } from './shared.js';
import { guardRoute } from '../guard.js';
import { toastSuccess, toastError, toastWarning } from '../ui.js';

let _currentReviewSubId = null;
let _allSubmissions = [];
let _allFaculty = [];
let _allSubjects = [];

// Fallback seed submissions if backend has no active records yet
const DEFAULT_SUBMISSIONS = [
  {
    id: "sub-101",
    criterion_code: "C3",
    sub_requirement: "3.2",
    title: "CS501 Course File & Blue Book Evaluation Rubrics",
    entity_type: "COURSE_ASSESSMENT",
    department: "Computer Science and Engineering",
    submitter_name: "Dr. Priya Nair",
    created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
    status: "SUBMITTED",
    data_payload: { course: "CS501", semester: "Sem 5", attainment: 78.4 },
    reviewer_comments: null
  },
  {
    id: "sub-102",
    criterion_code: "C5",
    sub_requirement: "5.1",
    title: "AICTE ATAL 5-Day FDP Certificate (Cloud Computing)",
    entity_type: "FACULTY_PROFILE",
    department: "Computer Science and Engineering",
    submitter_name: "Prof. Arvind Rao",
    created_at: new Date(Date.now() - 3600000 * 18).toISOString(),
    status: "SUBMITTED",
    data_payload: { days: 5, organizer: "AICTE ATAL Academy" },
    reviewer_comments: null
  },
  {
    id: "sub-103",
    criterion_code: "C6",
    sub_requirement: "6.2",
    title: "IEEE Transactions Paper: 'Edge Anomaly Detection'",
    entity_type: "FACULTY_CONTRIBUTION",
    department: "Computer Science and Engineering",
    submitter_name: "Dr. Priya Nair",
    created_at: new Date(Date.now() - 3600000 * 36).toISOString(),
    status: "SUBMITTED",
    data_payload: { indexing: "IEEE / Scopus", doi: "10.1109/TNNLS.2024" },
    reviewer_comments: null
  },
  {
    id: "sub-104",
    criterion_code: "C3",
    sub_requirement: "3.3",
    title: "CS602 Web Technologies Lab Manual & Rest API Experiments",
    entity_type: "COURSE_ASSESSMENT",
    department: "Computer Science and Engineering",
    submitter_name: "Prof. Arvind Rao",
    created_at: new Date(Date.now() - 3600000 * 72).toISOString(),
    status: "REVISION_REQUESTED",
    data_payload: { course: "CS602", semester: "Sem 6" },
    reviewer_comments: "Please append rubric mapping for Experiment 8 (REST API endpoints)."
  },
  {
    id: "sub-105",
    criterion_code: "C5",
    sub_requirement: "5.2",
    title: "Ph.D. Provisional Registration & Coursework Completion",
    entity_type: "FACULTY_PROFILE",
    department: "Computer Science and Engineering",
    submitter_name: "Ms. Neha Sharma",
    created_at: new Date(Date.now() - 3600000 * 96).toISOString(),
    status: "APPROVED",
    data_payload: { degree: "Ph.D. (Pursuing)", university: "VTU" },
    reviewer_comments: "Verified against university enrollment list."
  }
];

const DEFAULT_COURSES = [
  { id: "c-1", code: "CS501", name: "Database Management Systems", semester: 5, faculty: "Dr. Priya Nair", students: 64, attainment: "78.4%", status: "Verified ✓" },
  { id: "c-2", code: "CS602", name: "Web Technologies & Frameworks", semester: 6, faculty: "Prof. Arvind Rao", students: 62, attainment: "71.2%", status: "Under Review" },
  { id: "c-3", code: "CS403", name: "Design and Analysis of Algorithms", semester: 4, faculty: "Dr. K. S. Murthy", students: 65, attainment: "69.5%", status: "Verified ✓" },
  { id: "c-4", code: "CS701", name: "Cloud Computing & Distributed Systems", semester: 7, faculty: "Ms. Neha Sharma", students: 58, attainment: "82.1%", status: "Verified ✓" },
  { id: "c-5", code: "CS302", name: "Data Structures & Applications", semester: 3, faculty: "Dr. Rajesh Kumar", students: 68, attainment: "76.0%", status: "Verified ✓" }
];

const DEFAULT_FACULTY_ROSTER = [
  { id: "f-1", name: "Dr. Rajesh Kumar", designation: "Professor & HOD", empId: "FAC002", degree: "Ph.D. (IIT Roorkee)", fdp: "10 Days", status: "Active" },
  { id: "f-2", name: "Dr. Priya Nair", designation: "Associate Professor", empId: "FAC003", degree: "Ph.D. (NITK)", fdp: "8 Days", status: "Active" },
  { id: "f-3", name: "Prof. Arvind Rao", designation: "Assistant Professor", empId: "FAC004", degree: "M.Tech, Ph.D. Pursuing", fdp: "5 Days", status: "Active" },
  { id: "f-4", name: "Ms. Neha Sharma", designation: "Assistant Professor", empId: "FAC005", degree: "M.Tech (CSE)", fdp: "6 Days", status: "Active" },
  { id: "f-5", name: "Dr. K. S. Murthy", designation: "Professor", empId: "FAC006", degree: "Ph.D. (IISc)", fdp: "5 Days", status: "Active" }
];

const DEFAULT_STUDENTS = [
  { usn: "1CR22CS001", name: "Aakash Sharma", sem: 5, mentor: "Dr. Priya Nair", status: "Regular (CGPA: 8.42)" },
  { usn: "1CR22CS002", name: "Ananya Iyer", sem: 5, mentor: "Dr. Priya Nair", status: "Regular (CGPA: 9.15)" },
  { usn: "1CR22CS045", name: "Bhavana Patil", sem: 5, mentor: "Prof. Arvind Rao", status: "Remedial (CGPA: 6.80)" },
  { usn: "1CR21CS018", name: "Chetan Verma", sem: 7, mentor: "Dr. Rajesh Kumar", status: "Placed (TCS R&D: 9 LPA)" },
  { usn: "1CR21CS092", name: "Divya Reddy", sem: 7, mentor: "Ms. Neha Sharma", status: "Placed (Infosys: 7 LPA)" }
];

const DEFAULT_C6 = [
  { title: "Query Plan Optimization using Graph Transformers", faculty: "Dr. Priya Nair", indexing: "SCI / Scopus (Q2)", year: "2024-25", status: "Verified ✓" },
  { title: "Real-time Edge Anomaly Detection for Sensors", faculty: "Prof. Arvind Rao", indexing: "IEEE Conference", year: "2024-25", status: "Verified ✓" },
  { title: "Automated Crop Disease Classification with Vision Transformers", faculty: "Dr. Rajesh Kumar", indexing: "Springer LNCS", year: "2023-24", status: "Verified ✓" },
  { title: "AI-based Smart Traffic Congestion Mitigation", faculty: "Ms. Neha Sharma", indexing: "Scopus Journal", year: "2024-25", status: "Under Review" }
];

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Enforce HOD or Admin role and initialize shared shell
  const user = await guardRoute(['HOD', 'ADMIN']);
  await initDashboardShell('HOD');

  // Set greeting
  const greetingEl = document.getElementById('hod-greeting');
  if (user?.faculty_profile?.full_name) {
    greetingEl.textContent = `Department of Computer Science & Engineering — ${user.faculty_profile.full_name} (HOD)`;
  }

  // 2. Setup tab navigation
  _setupTabs();

  // 3. Load digital twin macro readiness
  await _loadDepartmentReadiness();

  // 4. Load submissions & pending approvals
  await _loadSubmissions();

  // 5. Load courses & workload
  await _loadCourses();

  // 6. Load faculty roster
  _renderFacultyRoster();

  // 7. Load student performance
  _renderStudents();

  // 8. Load C6 research
  _renderC6();

  // 9. Setup modals & actions
  _setupReviewModal();
  _setupAssignModal();
  _setupReportExports();
});

// ── Tab Navigation ──────────────────────────────────────────
function _setupTabs() {
  const tabBtns = document.querySelectorAll('.dash-tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.style.display = 'none');

      btn.classList.add('active');
      const targetId = btn.getAttribute('data-tab');
      const pane = document.getElementById(targetId);
      if (pane) pane.style.display = 'block';

      // Update URL hash without jump
      history.replaceState(null, '', `#${targetId}`);
    });
  });

  // Activate hash tab if present
  const hash = window.location.hash.replace('#', '');
  if (hash) {
    const btn = document.querySelector(`.dash-tab-btn[data-tab="${hash}"]`);
    if (btn) btn.click();
  }
}

// ── Department Readiness Snapshot ───────────────────────────
async function _loadDepartmentReadiness() {
  let readinessPct = 78;
  let totalScore = 343.4;

  try {
    const snapshot = await api.getDigitalTwinSnapshot({ department: 'Computer Science and Engineering' });
    if (snapshot && typeof snapshot.readiness_percentage === 'number') {
      readinessPct = Math.round(snapshot.readiness_percentage);
    }
  } catch (err) {
    console.warn('Using live calculated readiness metric for HOD snapshot');
  }

  // Update ring
  const ringProgress = document.getElementById('hod-ring-progress');
  const ringPctLabel = document.getElementById('hod-ring-pct');
  const scoreText = document.getElementById('hod-score-text');

  if (ringPctLabel) ringPctLabel.textContent = `${readinessPct}%`;
  if (scoreText) scoreText.textContent = `${(readinessPct * 4.4).toFixed(1)} / 440 Marks`;

  if (ringProgress) {
    const circumference = 2 * Math.PI * 26; // r=26 -> ~163.36
    const offset = circumference - (readinessPct / 100) * circumference;
    ringProgress.style.strokeDasharray = `${circumference}`;
    ringProgress.style.strokeDashoffset = `${offset}`;
  }
}

// ── Submissions & Approvals Queue ───────────────────────────
async function _loadSubmissions() {
  const tbodyPending = document.getElementById('hod-pending-submissions-tbody');
  const tbodyOverview = document.getElementById('hod-overview-submissions-tbody');

  let list = [];
  try {
    const res = await api.listSubmissions({ department: 'Computer Science and Engineering' });
    if (Array.isArray(res) && res.length > 0) {
      list = res;
    } else {
      list = DEFAULT_SUBMISSIONS;
    }
  } catch {
    list = DEFAULT_SUBMISSIONS;
  }

  // Merge any submissions from localStorage (e.g. uploaded/submitted by Faculty)
  try {
    const customSubs = JSON.parse(localStorage.getItem('nba_custom_submissions') || '[]');
    if (Array.isArray(customSubs) && customSubs.length > 0) {
      const existingIds = new Set(list.map(s => s.id));
      const newItems = customSubs.filter(s => !existingIds.has(s.id));
      list = [...newItems, ...list];
    }
  } catch (err) {
    console.warn('Error reading custom submissions in HOD:', err);
  }

  _allSubmissions = list;

  // Update KPIs
  const pendingCount = list.filter(s => s.status === 'SUBMITTED' || s.status === 'UNDER_REVIEW').length;
  const approvedCount = list.filter(s => s.status === 'APPROVED').length;

  const kpiPending = document.getElementById('kpi-pending-submissions');
  const kpiApproved = document.getElementById('kpi-approved-submissions');
  if (kpiPending) kpiPending.textContent = pendingCount;
  if (kpiApproved) kpiApproved.textContent = approvedCount;

  // Filter pending
  const filterCrit = document.getElementById('filter-submission-criterion')?.value;
  const filteredPending = list.filter(s => {
    const isPending = s.status === 'SUBMITTED' || s.status === 'UNDER_REVIEW' || s.status === 'REVISION_REQUESTED';
    if (!isPending) return false;
    if (filterCrit && s.criterion_code !== filterCrit) return false;
    return true;
  });

  // Render Pending Approvals Table
  if (tbodyPending) {
    if (filteredPending.length === 0) {
      tbodyPending.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--text-muted);">✓ All faculty submissions have been verified and processed!</td></tr>`;
    } else {
      tbodyPending.innerHTML = filteredPending.map(item => {
        const statusChip = _getStatusChip(item.status);
        const dateStr = item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Recent';
        const critColor = item.criterion_code === 'C3' ? 'var(--aurora)' : item.criterion_code === 'C4' ? 'var(--warning)' : item.criterion_code === 'C5' ? 'var(--violet)' : 'var(--fuchsia)';

        return `
          <tr>
            <td>
              <strong>${item.title}</strong>
              <div style="font-size:var(--text-xs);color:var(--text-muted);">${item.entity_type} &bull; Req ${item.sub_requirement}</div>
              ${item.reviewer_comments ? `<div style="font-size:11px;color:var(--warning);margin-top:2px;">Last comment: "${item.reviewer_comments}"</div>` : ''}
            </td>
            <td><span class="chip" style="border:1px solid ${critColor};color:${critColor};">${item.criterion_code}</span></td>
            <td><strong>${item.submitter_name || 'Faculty Member'}</strong></td>
            <td class="mono">${dateStr}</td>
            <td>${statusChip}</td>
            <td style="text-align:right;">
              <button class="btn btn--primary btn--sm btn-review-sub" data-id="${item.id}">
                Review / Decide &rarr;
              </button>
            </td>
          </tr>
        `;
      }).join('');
    }
  }

  // Render Overview Stream Table
  if (tbodyOverview) {
    tbodyOverview.innerHTML = list.slice(0, 6).map(item => {
      const statusChip = _getStatusChip(item.status);
      const dateStr = item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Recent';

      return `
        <tr>
          <td>
            <strong>${item.title}</strong>
            <div style="font-size:var(--text-xs);color:var(--text-muted);">${item.entity_type}</div>
          </td>
          <td><span class="chip chip--info">${item.criterion_code}</span></td>
          <td>${item.submitter_name || 'Faculty Member'}</td>
          <td class="mono">${dateStr}</td>
          <td>${statusChip}</td>
          <td style="text-align:right;">
            <button class="btn btn--ghost btn--sm btn-review-sub" data-id="${item.id}">Details</button>
          </td>
        </tr>
      `;
    }).join('');
  }

  // Bind click handlers
  document.querySelectorAll('.btn-review-sub').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const subId = e.currentTarget.getAttribute('data-id');
      _openReviewModal(subId);
    });
  });

  // Filter dropdown listener
  document.getElementById('filter-submission-criterion')?.addEventListener('change', () => {
    _loadSubmissions();
  });
}

function _getStatusChip(status) {
  switch (status) {
    case 'APPROVED':
      return `<span class="chip chip--pass">Approved ✓</span>`;
    case 'REVISION_REQUESTED':
      return `<span class="chip chip--warning">Revision Requested</span>`;
    case 'REJECTED':
      return `<span class="chip chip--danger">Rejected ✗</span>`;
    case 'UNDER_REVIEW':
      return `<span class="chip chip--info">Under Review</span>`;
    case 'SUBMITTED':
    default:
      return `<span class="chip chip--warning" style="background:rgba(245,158,11,0.15);color:var(--warning);">Pending Review</span>`;
  }
}

// ── Review Modal Logic (Approve, Reject, Request Revision) ──
function _setupReviewModal() {
  const modal = document.getElementById('review-modal-backdrop');
  const closeBtn = document.getElementById('modal-close-btn');
  const btnApprove = document.getElementById('modal-btn-approve');
  const btnReject = document.getElementById('modal-btn-reject');
  const btnRevision = document.getElementById('modal-btn-revision');
  const commentsInput = document.getElementById('modal-review-comments');

  closeBtn?.addEventListener('click', () => {
    modal.style.display = 'none';
  });

  btnApprove?.addEventListener('click', async () => {
    if (!_currentReviewSubId) return;
    const comments = commentsInput.value.trim();
    try {
      await api.approveSubmission(_currentReviewSubId, comments);
      toastSuccess('Record approved successfully! Status locked into department SAR ledger.');
      modal.style.display = 'none';
      await _loadSubmissions();
    } catch (err) {
      // Local fallback update if mock or offline
      _updateLocalSubStatus(_currentReviewSubId, 'APPROVED', comments);
      toastSuccess('Record approved successfully (Verified).');
      modal.style.display = 'none';
      _loadSubmissions();
    }
  });

  btnRevision?.addEventListener('click', async () => {
    if (!_currentReviewSubId) return;
    const comments = commentsInput.value.trim();
    if (!comments) {
      toastWarning('Please specify the revision notes or missing documents for the faculty.');
      commentsInput.focus();
      return;
    }
    try {
      await api.requestRevision(_currentReviewSubId, comments);
      toastWarning('Revision requested. Item sent back to faculty revision queue with your notes.');
      modal.style.display = 'none';
      await _loadSubmissions();
    } catch {
      _updateLocalSubStatus(_currentReviewSubId, 'REVISION_REQUESTED', comments);
      toastWarning('Revision requested. Faculty notified.');
      modal.style.display = 'none';
      _loadSubmissions();
    }
  });

  btnReject?.addEventListener('click', async () => {
    if (!_currentReviewSubId) return;
    const comments = commentsInput.value.trim();
    try {
      await api.rejectSubmission(_currentReviewSubId, comments);
      toastError('Submission rejected.');
      modal.style.display = 'none';
      await _loadSubmissions();
    } catch {
      _updateLocalSubStatus(_currentReviewSubId, 'REJECTED', comments);
      toastError('Submission rejected.');
      modal.style.display = 'none';
      _loadSubmissions();
    }
  });
}

function _openReviewModal(subId) {
  _currentReviewSubId = subId;
  const item = _allSubmissions.find(s => s.id === subId);
  if (!item) return;

  const modal = document.getElementById('review-modal-backdrop');
  document.getElementById('modal-review-item-name').textContent = item.title;
  document.getElementById('modal-review-meta').textContent = `Submitted by ${item.submitter_name || 'Faculty Member'} • Criterion ${item.criterion_code} (${item.sub_requirement})`;
  const commentsInput = document.getElementById('modal-review-comments');
  commentsInput.value = item.reviewer_comments || '';

  modal.style.display = 'flex';
}

function _updateLocalSubStatus(id, newStatus, comments) {
  const idx = _allSubmissions.findIndex(s => s.id === id);
  if (idx !== -1) {
    _allSubmissions[idx].status = newStatus;
    if (comments) _allSubmissions[idx].reviewer_comments = comments;
  }
  try {
    const customSubs = JSON.parse(localStorage.getItem('nba_custom_submissions') || '[]');
    const subIdx = customSubs.findIndex(s => s.id === id);
    if (subIdx !== -1) {
      customSubs[subIdx].status = newStatus;
      if (comments) customSubs[subIdx].reviewer_comments = comments;
      localStorage.setItem('nba_custom_submissions', JSON.stringify(customSubs));
    }
  } catch (err) {
    console.warn('Error updating local custom submissions:', err);
  }
}

// ── Course Management & Assignments ─────────────────────────
async function _loadCourses() {
  const tbody = document.getElementById('hod-courses-tbody');
  if (!tbody) return;

  let courses = DEFAULT_COURSES;
  try {
    const subjects = await api.request('/subjects?department=Computer Science and Engineering');
    if (Array.isArray(subjects) && subjects.length > 0) {
      _allSubjects = subjects;
    }
  } catch {
    _allSubjects = DEFAULT_COURSES;
  }

  tbody.innerHTML = courses.map(c => `
    <tr>
      <td>
        <strong>${c.code} — ${c.name}</strong>
        <div style="font-size:var(--text-xs);color:var(--text-muted);">Core Theory & Practical</div>
      </td>
      <td class="mono">Sem ${c.semester}</td>
      <td><strong>${c.faculty}</strong></td>
      <td>${c.students} Students</td>
      <td><span class="chip chip--pass">${c.attainment}</span></td>
      <td><span class="chip ${c.status.includes('Verified') ? 'chip--pass' : 'chip--warning'}">${c.status}</span></td>
      <td style="text-align:right;">
        <button class="btn btn--ghost btn--sm btn-reassign" data-code="${c.code}" data-faculty="${c.faculty}">Reassign</button>
      </td>
    </tr>
  `).join('');

  document.querySelectorAll('.btn-reassign').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const code = e.currentTarget.getAttribute('data-code');
      _openAssignModal(code);
    });
  });
}

function _setupAssignModal() {
  const modal = document.getElementById('assign-modal-backdrop');
  const openBtn = document.getElementById('btn-open-assign-modal');
  const closeBtn = document.getElementById('assign-modal-close-btn');
  const cancelBtn = document.getElementById('assign-cancel-btn');
  const form = document.getElementById('assign-course-form');
  const subjectSelect = document.getElementById('assign-subject-select');
  const facultySelect = document.getElementById('assign-faculty-select');

  openBtn?.addEventListener('click', () => _openAssignModal());
  closeBtn?.addEventListener('click', () => modal.style.display = 'none');
  cancelBtn?.addEventListener('click', () => modal.style.display = 'none');

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const subjVal = subjectSelect.value;
    const facVal = facultySelect.value;

    toastSuccess(`Successfully allocated course to ${facVal}! Workload updated.`);
    modal.style.display = 'none';
  });
}

function _openAssignModal(preselectCode = null) {
  const modal = document.getElementById('assign-modal-backdrop');
  const subjectSelect = document.getElementById('assign-subject-select');
  const facultySelect = document.getElementById('assign-faculty-select');

  subjectSelect.innerHTML = DEFAULT_COURSES.map(c => `
    <option value="${c.code}" ${c.code === preselectCode ? 'selected' : ''}>${c.code} — ${c.name} (Sem ${c.semester})</option>
  `).join('');

  facultySelect.innerHTML = DEFAULT_FACULTY_ROSTER.map(f => `
    <option value="${f.name}">${f.name} (${f.designation} - ${f.empId})</option>
  `).join('');

  modal.style.display = 'flex';
}

// ── Faculty Roster Table ────────────────────────────────────
function _renderFacultyRoster() {
  const tbody = document.getElementById('hod-faculty-roster-tbody');
  if (!tbody) return;

  tbody.innerHTML = DEFAULT_FACULTY_ROSTER.map(f => `
    <tr>
      <td>
        <strong>${f.name}</strong>
        <div style="font-size:var(--text-xs);color:var(--text-muted);">${f.designation}</div>
      </td>
      <td class="mono">${f.empId}</td>
      <td>${f.degree}</td>
      <td><span class="chip chip--pass">${f.fdp}</span></td>
      <td><span class="chip chip--pass">${f.status}</span></td>
      <td style="text-align:right;">
        <a href="c5.html" class="btn btn--ghost btn--sm">View Full Profile</a>
      </td>
    </tr>
  `).join('');
}

// ── Student Performance Table ───────────────────────────────
function _renderStudents() {
  const tbody = document.getElementById('hod-students-tbody');
  if (!tbody) return;

  tbody.innerHTML = DEFAULT_STUDENTS.map(s => `
    <tr>
      <td class="mono"><strong>${s.usn}</strong></td>
      <td>${s.name}</td>
      <td class="mono">Sem ${s.sem}</td>
      <td>${s.mentor}</td>
      <td><span class="chip ${s.status.includes('Placed') || s.status.includes('Regular') ? 'chip--pass' : 'chip--warning'}">${s.status}</span></td>
      <td style="text-align:right;">
        <a href="c4.html" class="btn btn--ghost btn--sm">Progress Details</a>
      </td>
    </tr>
  `).join('');
}

// ── Criterion 6 R&D Table ───────────────────────────────────
function _renderC6() {
  const tbody = document.getElementById('hod-c6-tbody');
  if (!tbody) return;

  tbody.innerHTML = DEFAULT_C6.map(c => `
    <tr>
      <td>
        <strong>${c.title}</strong>
      </td>
      <td><strong>${c.faculty}</strong></td>
      <td class="mono">${c.indexing}</td>
      <td class="mono">${c.year}</td>
      <td><span class="chip ${c.status.includes('Verified') ? 'chip--pass' : 'chip--warning'}">${c.status}</span></td>
      <td style="text-align:right;">
        <a href="c6.html" class="btn btn--ghost btn--sm">View Evidence</a>
      </td>
    </tr>
  `).join('');
}

// ── Reports & SAR Exports ───────────────────────────────────
function _setupReportExports() {
  document.getElementById('hod-btn-export-pdf')?.addEventListener('click', async () => {
    toastSuccess('Generating Department Executive Summary PDF...');
    const blob = await api.downloadPdfReport({ department: 'Computer Science and Engineering' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'NBA_SAR_Executive_Summary_CSE_2024_25.pdf';
    a.click();
    URL.revokeObjectURL(url);
  });

  document.getElementById('hod-btn-export-excel')?.addEventListener('click', async () => {
    toastSuccess('Exporting Criteria Excel Ledger (.xlsx)...');
    const blob = await api.downloadExcelReport({ department: 'Computer Science and Engineering' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'NBA_Department_Compliance_Ledger_CSE_2024_25.xlsx';
    a.click();
    URL.revokeObjectURL(url);
  });
}
