/**
 * dash/c3-attainment.js — live CO / PO / PSO attainment for Criterion 3.
 * All numbers come from GET /analysis/attainment; nothing here is hardcoded.
 */

import { api } from '../api.js';
import { isHodOrAdmin } from '../guard.js';
import { statusChip, toast, toastSuccess, toastError, escapeHtml } from '../ui.js';
import { getRequirements, refreshCriterionPanel } from './criteria-common.js';

const DEPARTMENT = 'Computer Science and Engineering';
const pct = (n) => (n === null || n === undefined ? '–' : `${Number(n).toFixed(1)}%`);
const lvl = (n) => (n === null || n === undefined ? '–' : Number(n).toFixed(2));

const _ids = () => {
  const reqs = getRequirements();
  return ['REQ_3_7', 'REQ_3_8'].map((c) => reqs.find((r) => r.code === c)?.id).filter(Boolean);
};

export async function initAttainmentPanel() {
  document.getElementById('btn-approve-attainment')?.addEventListener('click', _approve);
  await _load();
}

async function _approvalState() {
  const ids = _ids();
  if (!ids.length) return false;
  try {
    const all = await Promise.all(ids.map((id) => api.getRequirementInputs(id, { department: DEPARTMENT })));
    return all.every((d) => d.saved && d.saved.attainment_formula_configured === true);
  } catch { return false; }
}

async function _load() {
  const q = (id) => document.getElementById(id);
  try {
    const [d, approved] = await Promise.all([api.getAttainment({ department: DEPARTMENT }), _approvalState()]);

    const m = d.method;
    q('att-method-text').innerHTML = m && typeof m === 'object'
      ? `<ul style="margin:0;padding-left:1.1rem;line-height:1.6;">
          <li>A student meets the target with at least <strong>${m.target_percent}%</strong> of total marks.</li>
          <li>CO attainment level: ${m.levels}.</li>
          <li>${m.co_mapping_note}</li>
          <li>${m.indirect_attainment}</li>
        </ul>`
      : (m || 'No method description was returned.');
    q('att-co-score').textContent = `${lvl(d.co_score_out_of_25)} / 25`;
    q('att-po-score').textContent = `${lvl(d.po_pso_score_out_of_25)} / 25`;
    const chip = q('att-approval-chip');
    chip.className = approved ? 'chip chip--pass' : 'chip chip--warning';
    chip.textContent = approved ? 'Method approved' : 'Awaiting HOD approval';
    const btn = q('btn-approve-attainment');
    if (btn) {
      btn.textContent = approved ? 'Method approved — re-run evaluation' : 'Approve attainment method';
      if (!isHodOrAdmin()) btn.style.display = 'none';
    }

    q('att-courses-tbody').innerHTML = (d.courses || []).length
      ? d.courses.map((c) => `<tr>
          <td><div style="font-weight:600;">${escapeHtml(c.subject_name)}</div><div class="mono" style="font-size:12px;color:var(--text-muted);">${escapeHtml(c.subject_code)}</div></td>
          <td class="mono">${c.students_meeting_target} / ${c.students_appeared}</td>
          <td class="mono" style="font-weight:700;">${pct(c.attainment_percent)}</td>
          <td class="mono">${escapeHtml(String(c.level ?? '–'))}</td>
          <td style="font-size:12px;">${(c.course_outcomes || []).map((co) =>
            `<span class="chip chip--${co.is_weak ? 'warning' : 'pass'}" style="margin:2px;" title="${escapeHtml(co.description || '')}">${escapeHtml(co.co_code || '')} ${pct(co.attainment_percent)}</span>`).join('')}</td>
        </tr>`).join('')
      : '<tr><td colspan="5" style="text-align:center;padding:2rem;color:var(--text-muted);">No marks have been recorded yet, so there is nothing to calculate. Record marks under "Marks & Attendance".</td></tr>';

    const weak = d.weak_course_outcomes || [];
    const wc = q('weak-co-count-chip');
    wc.textContent = weak.length ? `${weak.length} weak CO${weak.length > 1 ? 's' : ''}` : 'None';
    wc.className = weak.length ? 'chip chip--warning' : 'chip chip--pass';
    q('weak-co-alert-card').style.borderLeftColor = weak.length ? 'var(--warning)' : 'var(--pass)';
    q('weak-co-details-content').innerHTML = weak.length
      ? weak.map((w) => `<div class="glass" style="padding:var(--space-4);margin-bottom:var(--space-3);">
          <div><strong class="mono">${escapeHtml(w.co_code)}</strong> in ${escapeHtml(w.subject_code)} attained <strong>${pct(w.attainment_percent)}</strong> (level ${escapeHtml(String(w.level))}).</div>
          <div style="font-size:var(--text-xs);color:var(--text-muted);margin-top:6px;">RECOMMENDED ACTION</div>
          <div style="font-weight:600;">${escapeHtml(w.recommended_action)}</div></div>`).join('')
      : 'Every course outcome meets the target.';

    const levels = (rows) => (rows || []).map((r) => `<tr><td class="mono" style="font-weight:700;">${escapeHtml(r.code)}</td><td class="mono">${lvl(r.average_level)}</td><td class="mono">${r.mapped_cos ?? '–'}</td></tr>`).join('')
      || '<tr><td colspan="3" style="text-align:center;color:var(--text-muted);">No mappings yet.</td></tr>';
    q('att-po-tbody').innerHTML = levels(d.program_outcomes);
    q('att-pso-tbody').innerHTML = levels(d.program_specific_outcomes);
  } catch (err) {
    const msg = escapeHtml(err.message || String(err));
    q('att-method-text').innerHTML = `<span style="color:var(--fail);">Could not load attainment: ${msg}</span>`;
    q('att-approval-chip').textContent = 'Unavailable';
  }
}

async function _approve(e) {
  const btn = e.currentTarget;
  const ids = _ids();
  if (!ids.length) return toastError('Requirements 3.7 and 3.8 are not loaded yet. Try again in a moment.');
  btn.disabled = true;
  try {
    for (const id of ids) {
      await api.saveRequirementInputs(id, { data: { attainment_formula_configured: true }, department: DEPARTMENT });
    }
    const results = [];
    for (const id of ids) results.push(await api.evaluateRequirement(id, { department: DEPARTMENT }));
    toastSuccess(`Method approved. 3.7: ${results[0].status.replace(/_/g, ' ')}, 3.8: ${results[1].status.replace(/_/g, ' ')}.`);
    await refreshCriterionPanel();
    await _load();
  } catch (err) {
    toastError(`Could not approve the method: ${err.message || err}`);
  } finally {
    btn.disabled = false;
  }
}
