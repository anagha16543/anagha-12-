/**
 * dash/criteria-extras.js
 * Real-data panels for the Criterion 4, 5 and 6 pages, plus the shared evidence upload card.
 * Nothing here is sample data: every number comes from the database through the API.
 */
import { api } from '../api.js';
import { call } from './http.js';
import { getRequirements, mountAiReview } from './criteria-common.js';
import { statusChip, toastSuccess, toastError, escapeHtml, formatDate } from '../ui.js';

const DEPT = 'Computer Science and Engineering';
const esc = escapeHtml;
const asList = (r) => Array.isArray(r) ? r : (r?.items || []);
const label = (code) => String(code || '').replace('REQ_', '').replace(/_/g, '.');

function pane(id) { return document.getElementById(id); }

function setPane(id, title, intro, bodyHtml) {
  const el = pane(id);
  if (!el) return null;
  el.innerHTML = `
    <div class="chart-card">
      <div class="chart-card-header"><h3>${esc(title)}</h3></div>
      ${intro ? `<p style="font-size:var(--text-sm);color:var(--text-muted);margin-bottom:var(--space-4);">${esc(intro)}</p>` : ''}
      <div id="${id}-body">${bodyHtml || ''}</div>
    </div>`;
  return document.getElementById(`${id}-body`);
}

const nice = (k) => String(k).replace(/_/g, ' ');
function fmt(v) {
  if (v === null || v === undefined) return '-';
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : v.toFixed(2);
  if (typeof v === 'object') return esc(JSON.stringify(v));
  return esc(v);
}

/** One card per requirement: status, marks and the figures the rule used. */
async function requirementCards(codes) {
  const reqs = getRequirements().filter(r => codes.includes(r.code));
  const cards = await Promise.all(reqs.map(async (r) => {
    let ev = null;
    try { ev = asList(await api.getEvaluationHistory(r.id))[0]; } catch { /* not evaluated yet */ }
    const metrics = ev?.deterministic_metrics ? Object.entries(ev.deterministic_metrics) : [];
    return `
      <div class="glass-sm" style="padding:var(--space-4);margin-bottom:var(--space-3);border-left:3px solid var(--violet);">
        <div style="display:flex;justify-content:space-between;gap:var(--space-3);align-items:center;flex-wrap:wrap;">
          <strong>${esc(label(r.code))} ${esc(String(r.title).replace(/\s*\([\d.]+\)\s*$/, ''))}</strong>
          <span>${ev ? statusChip(ev.status) : '<span class="chip chip--info">Not evaluated yet</span>'}
            <span class="mono" style="margin-left:8px;">${ev ? `${fmt(ev.score_attained)} / ${fmt(ev.max_score)}` : ''}</span></span>
        </div>
        ${metrics.length ? `<table class="req-table" style="margin-top:var(--space-3);font-size:var(--text-xs);"><tbody>
          ${metrics.map(([k, v]) => `<tr><td style="color:var(--text-muted);width:45%;">${esc(nice(k))}</td><td class="mono">${fmt(v)}</td></tr>`).join('')}
        </tbody></table>` : `<p style="margin-top:8px;font-size:var(--text-xs);color:var(--text-muted);">${ev ? 'No extra figures for this rule.' : 'Click Evaluate on the Requirements tab first.'}</p>`}
        ${ev?.limitations?.length ? `<p style="margin-top:8px;font-size:var(--text-xs);color:var(--text-muted);">${esc(ev.limitations[0])}</p>` : ''}
      </div>`;
  }));
  return cards.join('') || '<p style="color:var(--text-muted);">No requirements loaded.</p>';
}

async function facultyList() {
  try { return asList(await call(`/faculty?department=${encodeURIComponent(DEPT)}`)); }
  catch { return null; }   // faculty accounts cannot list everyone
}

const NO_ACCESS = '<p style="color:var(--text-muted);">Only the HOD and Admin can see the full faculty list.</p>';

/* ───────────────────────── Criterion 4 ───────────────────────── */
async function renderC4() {
  setPane('tab-c4-progression', 'Success rate and academic performance',
    'The figures behind 4.2 to 4.5, taken from your saved inputs and student marks.', 'Loading...');
  const body = pane('tab-c4-progression-body');
  if (body) {
    let risk = '';
    try {
      const r = await call(`/analysis/at-risk-students?department=${encodeURIComponent(DEPT)}`);
      risk = `<h4 style="margin:var(--space-4) 0 var(--space-2);">Students who may need support (${r.at_risk_count} of ${r.total_students})</h4>
        <p style="font-size:var(--text-xs);color:var(--text-muted);">Listed when attendance is below ${r.indicators.min_attendance}% or marks are below ${r.indicators.min_marks_percent}%.</p>
        ${r.students.length ? `<table class="req-table"><thead><tr><th>USN</th><th>Name</th><th>Attendance</th><th>Marks</th><th>Why</th></tr></thead><tbody>
          ${r.students.map(s => `<tr><td class="mono">${esc(s.usn)}</td><td>${esc(s.name)}</td><td>${fmt(s.average_attendance)}%</td><td>${fmt(s.overall_marks_percent)}%</td><td>${esc(s.reasons.join('; '))}</td></tr>`).join('')}
        </tbody></table>` : '<p>No students are flagged.</p>'}`;
    } catch (err) { risk = `<p style="color:var(--fail);">Could not load the support list: ${esc(err.message || err)}</p>`; }
    body.innerHTML = await requirementCards(['REQ_4_2', 'REQ_4_3', 'REQ_4_4', 'REQ_4_5']) + risk;
  }

  setPane('tab-c4-placements', 'Placements, higher studies and professional activities',
    'The figures behind 4.6 and 4.7.', 'Loading...');
  const pb = pane('tab-c4-placements-body');
  if (pb) pb.innerHTML = await requirementCards(['REQ_4_6', 'REQ_4_7']);

}

/* ───────────────────────── Criterion 5 ───────────────────────── */
async function renderC5() {
  setPane('tab-c5-metrics', 'Faculty numbers behind 5.1 to 5.5',
    'Student-faculty ratio, qualification index, cadre mix, visiting faculty and retention, as the rules calculated them.', 'Loading...');
  const mb = pane('tab-c5-metrics-body');
  if (mb) mb.innerHTML = await requirementCards(['REQ_5_1', 'REQ_5_2', 'REQ_5_3', 'REQ_5_4', 'REQ_5_5']);

  setPane('tab-c5-roster', 'Department faculty', 'Everyone counted in Criterion 5, with their highest qualifications on record.', 'Loading...');
  const rb = pane('tab-c5-roster-body');
  const facs = await facultyList();
  if (rb) {
    if (!facs) rb.innerHTML = NO_ACCESS;
    else {
      const rows = await Promise.all(facs.map(async (f) => {
        let q = [];
        try { q = asList(await call(`/faculty/${f.id}/qualifications`)); } catch { /* none */ }
        return `<tr><td>${esc(f.full_name)}</td><td class="mono">${esc(f.faculty_id)}</td><td>${esc(f.designation)}</td>
          <td>${q.length ? q.map(x => esc(x.degree)).join(', ') : '<span style="color:var(--warning);">None recorded</span>'}</td></tr>`;
      }));
      rb.innerHTML = `<table class="req-table"><thead><tr><th>Name</th><th>ID</th><th>Designation</th><th>Qualifications</th></tr></thead><tbody>${rows.join('')}</tbody></table>
        <p style="font-size:var(--text-xs);color:var(--text-muted);margin-top:8px;">${facs.length} faculty. Faculty add their own qualifications from the Faculty dashboard.</p>`;
    }
  }

  setPane('tab-c5-workload', 'Who teaches what', 'Subject assignments from your records.', 'Loading...');
  const wb = pane('tab-c5-workload-body');
  if (wb) {
    if (!facs) wb.innerHTML = NO_ACCESS;
    else {
      const rows = (await Promise.all(facs.map(async (f) => {
        let subs = [];
        try { subs = asList(await call(`/faculty/${f.id}/subjects`)); } catch { /* none */ }
        if (!subs.length) return `<tr><td>${esc(f.full_name)}</td><td colspan="2" style="color:var(--text-muted);">No subject assigned</td></tr>`;
        return subs.map(s => `<tr><td>${esc(f.full_name)}</td><td class="mono">${esc(s.code || s.subject?.code || '')}</td><td>${esc(s.name || s.subject?.name || '')}</td></tr>`).join('');
      }))).join('');
      wb.innerHTML = `<table class="req-table"><thead><tr><th>Faculty</th><th>Code</th><th>Subject</th></tr></thead><tbody>${rows}</tbody></table>`;
    }
  }

}

/* ───────────────────────── Criterion 6 ───────────────────────── */
async function renderC6() {
  setPane('tab-c6-research', 'Research figures behind 6.2',
    'Publications, patents, sponsored research, consultancy and seed money, as the rules calculated them.', 'Loading...');
  const rb = pane('tab-c6-research-body');
  if (rb) rb.innerHTML = await requirementCards(['REQ_6_2_1', 'REQ_6_2_2', 'REQ_6_2_3', 'REQ_6_2_4', 'REQ_6_2_5', 'REQ_6_2_6']);

  const facs = await facultyList();

  setPane('tab-c6-leaderboard', 'Faculty contributions', 'Counts of what each faculty member has recorded.', 'Loading...');
  const lb = pane('tab-c6-leaderboard-body');
  if (lb) {
    if (!facs) lb.innerHTML = NO_ACCESS;
    else {
      const count = async (f, kind) => { try { return asList(await call(`/faculty/${f.id}/${kind}`)).length; } catch { return 0; } };
      const data = await Promise.all(facs.map(async f => ({
        f, pubs: await count(f, 'publications'), patents: await count(f, 'patents'),
        projects: await count(f, 'projects'), consult: await count(f, 'consultancies'),
      })));
      data.sort((a, b) => (b.pubs + b.patents + b.projects + b.consult) - (a.pubs + a.patents + a.projects + a.consult));
      lb.innerHTML = `<table class="req-table"><thead><tr><th>Faculty</th><th>Publications</th><th>Patents</th><th>Projects</th><th>Consultancy</th></tr></thead><tbody>
        ${data.map(d => `<tr><td>${esc(d.f.full_name)}</td><td>${d.pubs}</td><td>${d.patents}</td><td>${d.projects}</td><td>${d.consult}</td></tr>`).join('')}</tbody></table>`;
    }
  }

  setPane('tab-c6-certificates', 'Certificates on record', 'FDP, workshop and course certificates that faculty have added.', 'Loading...');
  const cb = pane('tab-c6-certificates-body');
  if (cb) {
    if (!facs) cb.innerHTML = NO_ACCESS;
    else {
      const rows = (await Promise.all(facs.map(async f => {
        let certs = [];
        try { certs = asList(await call(`/faculty/${f.id}/certificates`)); } catch { /* none */ }
        return certs.map(c => `<tr><td>${esc(f.full_name)}</td><td>${esc(c.title)}</td><td>${esc(c.issuing_organization || '')}</td><td>${c.issue_date ? formatDate(c.issue_date) : ''}</td><td class="mono">v${c.version || 1}</td></tr>`).join('');
      }))).join('');
      cb.innerHTML = rows
        ? `<table class="req-table"><thead><tr><th>Faculty</th><th>Certificate</th><th>Issued by</th><th>Date</th><th>Version</th></tr></thead><tbody>${rows}</tbody></table>`
        : '<p style="color:var(--text-muted);">No certificates have been added yet. Faculty add them from the Faculty dashboard.</p>';
    }
  }

}

/* ───────────────────────── Page entry points ───────────────────────── */
function refreshOnTabClick(render) {
  document.querySelectorAll('.dash-tab-btn').forEach(b => b.addEventListener('click', () => setTimeout(render, 60)));
}

export async function mountC4Extras() {
  const evHost = setPane('tab-c4-evidence', 'Evidence documents for Criterion 4', '', '');
  const aiHost = setPane('tab-c4-ai', 'AI advisory review', '', '');
  mountEvidenceCard({ container: evHost, criterion: 'CRITERION_4', prefix: 'c4' });
  mountAiReview({ into: aiHost, prefix: 'c4', label: "Students' Performance", reqCode: 'REQ_4_3',
    task: 'Review student performance, pass rates and at-risk indicators for Criterion 4' });
  await renderC4();
  refreshOnTabClick(renderC4);
}

export async function mountC5Extras() {
  mountEvidenceCard({ after: document.getElementById('c5-reqs-tbody')?.closest('.requirements-card'), criterion: 'CRITERION_5', prefix: 'c5' });
  await renderC5();
  refreshOnTabClick(renderC5);
}

export async function mountC6Extras() {
  mountEvidenceCard({ after: document.getElementById('c6-reqs-tbody')?.closest('.requirements-card'), criterion: 'CRITERION_6', prefix: 'c6' });
  await renderC6();
  refreshOnTabClick(renderC6);
}

/* ───────────────────────── Evidence upload card ───────────────────────── */
export function mountEvidenceCard({ container, after, criterion, prefix }) {
  let host = container;
  if (!host) {
    if (!after || document.getElementById(`${prefix}-evidence-card`)) return;
    host = document.createElement('div');
    host.id = `${prefix}-evidence-card`;
    host.className = 'chart-card';
    host.style.marginTop = 'var(--space-6)';
    after.after(host);
  }
  host.innerHTML = `
    <div class="chart-card-header"><h3>Evidence documents</h3>
      <button class="btn btn--primary btn--sm" id="${prefix}-ev-toggle">+ Upload evidence document</button></div>
    <p style="font-size:var(--text-sm);color:var(--text-muted);margin-bottom:var(--space-3);">
      Upload a file and say which requirement it proves. Marks come from the rules, not from files; evidence shows the claim can be proved.</p>
    <form id="${prefix}-ev-form" style="display:none;margin-bottom:var(--space-4);gap:var(--space-3);flex-direction:column;">
      <label>Title <input id="${prefix}-ev-title" class="form-control" required placeholder="For example: Placement record 2026"></label>
      <label>File (PDF, DOCX, XLSX, CSV, TXT, PNG, JPEG) <input id="${prefix}-ev-file" type="file" class="form-control" required accept=".pdf,.docx,.xlsx,.csv,.txt,.png,.jpg,.jpeg"></label>
      <label>This document proves requirement <select id="${prefix}-ev-req" class="form-control" required></select></label>
      <button type="submit" class="btn btn--primary">Upload evidence</button>
    </form>
    <div id="${prefix}-ev-list">Loading...</div>`;

  const form = document.getElementById(`${prefix}-ev-form`);
  const list = document.getElementById(`${prefix}-ev-list`);
  const picker = document.getElementById(`${prefix}-ev-req`);

  const fillPicker = () => {
    picker.innerHTML = '<option value="">Choose a requirement...</option>' + getRequirements()
      .map(r => `<option value="${r.id}">${esc(label(r.code))} ${esc(String(r.title).replace(/\s*\([\d.]+\)\s*$/, ''))}</option>`).join('');
  };

  async function refresh() {
    try {
      const links = {};
      await Promise.all(getRequirements().map(async (r) => {
        try {
          (asList(await api.listEvidence(r.id))).forEach(e => { (links[e.document_id] = links[e.document_id] || []).push(label(r.code)); });
        } catch { /* nothing linked */ }
      }));
      const docs = asList(await api.listDocuments()).filter(d => links[d.id]);
      list.innerHTML = docs.length
        ? `<table class="req-table"><thead><tr><th>File</th><th>Proves</th><th>Date</th><th></th></tr></thead><tbody>
          ${docs.map(d => `<tr><td><strong>${esc(d.original_filename || d.title)}</strong></td>
            <td>${links[d.id].map(c => `<span class="chip chip--pass">Proves ${esc(c)}</span>`).join(' ')}</td>
            <td class="mono">${d.created_at ? formatDate(d.created_at) : ''}</td>
            <td style="text-align:right;"><button class="btn btn--outline btn--sm" data-dl="${d.id}" data-name="${esc(d.original_filename || 'document')}">Download</button></td></tr>`).join('')}
          </tbody></table>`
        : '<p style="color:var(--text-muted);">No evidence is linked to this criterion yet. Click "+ Upload evidence document".</p>';
      list.querySelectorAll('[data-dl]').forEach(b => b.addEventListener('click', async () => {
        try {
          const blob = await api.downloadDocument(b.dataset.dl);
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob); a.download = b.dataset.name; a.click();
          setTimeout(() => URL.revokeObjectURL(a.href), 2000);
        } catch (err) { toastError(`Download failed: ${err.message || err}`); }
      }));
    } catch (err) {
      list.innerHTML = `<p style="color:var(--fail);">Could not load documents: ${esc(err.message || err)}</p>`;
    }
  }

  document.getElementById(`${prefix}-ev-toggle`).addEventListener('click', () => {
    fillPicker();
    form.style.display = form.style.display === 'none' ? 'flex' : 'none';
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const file = document.getElementById(`${prefix}-ev-file`).files[0];
    const reqId = picker.value;
    if (!file || !reqId) { toastError('Choose a file and a requirement.'); return; }
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('title', document.getElementById(`${prefix}-ev-title`).value || file.name);
      fd.append('criterion_code', criterion);
      fd.append('department', DEPT);
      const years = await api.listAcademicYears().catch(() => []);
      const year = (years || []).find(y => y.is_active) || (years || [])[0];
      if (year) fd.append('academic_year_id', year.id);
      const up = await api.uploadDocument(fd);
      await api.linkDocumentToRequirement(up.document_id || up.id, { requirement_id: reqId, is_primary: true });
      toastSuccess(`"${file.name}" uploaded and linked to ${label((getRequirements().find(r => r.id === reqId) || {}).code)}.`);
      form.reset();
      form.style.display = 'none';
    } catch (err) {
      toastError(`Upload failed: ${err.message || err}`);
    } finally {
      btn.disabled = false;
      refresh();
    }
  });

  refresh();
}
