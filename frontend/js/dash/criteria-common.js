/**
 * dash/criteria-common.js — shared requirement table, Evaluate, Inputs and History
 * for the Criterion 3-6 dashboards. Everything shown here comes from the backend.
 */

import { api } from '../api.js';
import { statusChip, toast, toastSuccess, toastError, countUp, escapeHtml, formatDate } from '../ui.js';
import { isHodOrAdmin } from '../guard.js';

const DEPARTMENT = 'Computer Science and Engineering';
const RING_LEN = 163.3;

let _cfg = null;
let _reqs = [];
let _state = {}; // requirement_id -> { status, score, max, limit }

const fmt = (n) => (n === null || n === undefined ? '–' : Number(n).toFixed(Number(n) % 1 ? 1 : 0));

/** Match a backend criterion for codes like "C3" against "CRITERION_3". */
function _matches(c, code) {
  const n = code.replace(/\D/g, '');
  return [code, `CRITERION_${n}`, `C${n}`].includes(String(c.code).toUpperCase());
}

/**
 * @param {{code:string, prefix:string, accent?:string, onLoaded?:Function}} cfg
 */
export async function initCriterionPanel(cfg) {
  _cfg = cfg;
  const tbody = document.getElementById(`${cfg.prefix}-reqs-tbody`);
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:2rem;color:var(--text-muted);">Loading requirements…</td></tr>`;

  try {
    const criteria = await api.listCriteria();
    const crit = (criteria || []).find((c) => _matches(c, cfg.code));
    if (!crit) throw new Error(`Criterion ${cfg.code} was not found on the server.`);
    _reqs = (await api.listRequirements(crit.id)).filter((r) => r.is_active !== false && r.weightage > 0);
    await _refreshState();
    _renderTable();
    _wireTableActions();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:2rem;color:var(--fail);">Could not load requirements: ${escapeHtml(err.message || String(err))}</td></tr>`;
    return;
  }

  document.getElementById(`btn-eval-all-${cfg.prefix}`)?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    toast(`Evaluating all ${cfg.code} requirements…`, 'info');
    let failed = 0;
    for (const r of _reqs) {
      try { await _evaluate(r.id, false); } catch { failed += 1; }
    }
    await _refreshState();
    btn.disabled = false;
    failed ? toastError(`${failed} requirement(s) could not be evaluated.`) : toastSuccess(`All ${cfg.code} requirements evaluated.`);
  });
}

/** Pull the latest stored evaluation for each requirement, plus the readiness ring. */
async function _refreshState() {
  const a = await api.getCriterionAnalytics(_cfg.code);
  _state = {};
  (a?.requirements || []).forEach((s) => {
    _state[s.requirement_id] = {
      status: s.status,
      score: s.score_attained,
      max: s.max_score,
      limit: (s.limitations || [])[0] || '',
    };
  });
  _paintRing(a);
  _reqs.forEach((r) => _paintRow(r.id));
}

function _paintRing(a) {
  const p = _cfg.prefix;
  const ring = document.getElementById(`${p}-ring-progress`);
  const label = document.getElementById(`${p}-ring-pct`);
  const score = document.getElementById(`${p}-score-text`);
  const evaluated = Object.values(_state).filter((s) => s.status !== 'UNEVALUATED');
  const attained = evaluated.reduce((t, s) => t + (s.score || 0), 0);
  const max = _reqs.reduce((t, r) => t + r.weightage, 0);
  const pct = evaluated.length && max ? Math.round((attained / max) * 100) : null;
  if (ring) ring.style.strokeDashoffset = pct === null ? RING_LEN : RING_LEN - RING_LEN * (pct / 100);
  if (label) pct === null ? (label.textContent = '--%') : countUp(label, pct, 900, '%');
  if (score) {
    score.textContent = evaluated.length
      ? `${fmt(attained)} / ${fmt(max)} Marks`
      : `Not evaluated yet · ${fmt(max)} Marks`;
  }
  if (_cfg.onLoaded) _cfg.onLoaded(a, { attained, max, pct });
}

function _renderTable() {
  const tbody = document.getElementById(`${_cfg.prefix}-reqs-tbody`);
  const canEdit = isHodOrAdmin();
  tbody.innerHTML = _reqs.map((r) => `
    <tr id="req-row-${r.id}">
      <td class="mono" style="font-weight:700;color:var(--cyan);">${escapeHtml(r.code.replace(/^REQ_/, '').replace(/_/g, '.'))}</td>
      <td>
        <div style="font-weight:600;color:var(--text-primary);">${escapeHtml(r.title)}</div>
        <div style="font-size:12px;color:var(--text-muted);">${escapeHtml(r.description || '')}</div>
        <div class="crit-limit" id="limit-${r.id}" style="font-size:12px;color:var(--warning);margin-top:4px;"></div>
      </td>
      <td class="mono" id="marks-cell-${r.id}"></td>
      <td id="status-cell-${r.id}"></td>
      <td style="text-align:right;">
        <div style="display:inline-flex;gap:var(--space-2);flex-wrap:wrap;justify-content:flex-end;">
          ${canEdit ? `<button class="btn btn--outline btn--sm" data-act="eval" data-id="${r.id}">Evaluate</button>` : ''}
          <button class="btn btn--ghost btn--sm" data-act="inputs" data-id="${r.id}">${canEdit ? 'Inputs' : 'View inputs'}</button>
          <button class="btn btn--ghost btn--sm" data-act="hist" data-id="${r.id}">History</button>
        </div>
      </td>
    </tr>`).join('');
  _reqs.forEach((r) => _paintRow(r.id));
}

function _paintRow(id) {
  const r = _reqs.find((x) => x.id === id);
  if (!r) return;
  const s = _state[id] || { status: 'UNEVALUATED', score: null, max: r.weightage, limit: '' };
  const status = document.getElementById(`status-cell-${id}`);
  const marks = document.getElementById(`marks-cell-${id}`);
  const limit = document.getElementById(`limit-${id}`);
  if (status) status.innerHTML = statusChip(s.status);
  if (marks) marks.textContent = `${s.status === 'UNEVALUATED' ? '–' : fmt(s.score)} / ${fmt(s.max ?? r.weightage)}`;
  if (limit) limit.textContent = s.limit && s.status !== 'PASS' ? s.limit : '';
}

function _wireTableActions() {
  document.getElementById(`${_cfg.prefix}-reqs-tbody`).addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-act]');
    if (!btn) return;
    const id = btn.dataset.id;
    if (btn.dataset.act === 'eval') {
      btn.disabled = true;
      try { await _evaluate(id, true); } catch { /* toast already shown */ }
      btn.disabled = false;
    } else if (btn.dataset.act === 'inputs') {
      _openInputs(id);
    } else if (btn.dataset.act === 'hist') {
      _openHistory(id);
    }
  });
}

async function _evaluate(id, notify) {
  const row = document.getElementById(`req-row-${id}`);
  row?.classList.add('evaluating-row');
  try {
    const res = await api.evaluateRequirement(id, { department: DEPARTMENT });
    _state[id] = { status: res.status, score: res.score_attained, max: res.max_score, limit: (res.limitations || [])[0] || '' };
    _paintRow(id);
    if (notify) {
      const r = _reqs.find((x) => x.id === id);
      toast(`${r?.title || 'Requirement'}: ${res.status.replace(/_/g, ' ')} · ${fmt(res.score_attained)} / ${fmt(res.max_score)} marks`,
        res.status === 'PASS' ? 'success' : 'warning');
      _refreshState().catch(() => {});
    }
    return res;
  } catch (err) {
    if (notify) toastError(`Evaluation failed: ${err.message || err}`);
    throw err;
  } finally {
    setTimeout(() => row?.classList.remove('evaluating-row'), 500);
  }
}

// ── Drawer ────────────────────────────────────────────────────────────────

function _drawer(title) {
  let bd = document.getElementById('crit-drawer-backdrop');
  if (!bd) {
    bd = document.createElement('div');
    bd.className = 'drawer-backdrop';
    bd.id = 'crit-drawer-backdrop';
    bd.innerHTML = `<div class="drawer-panel">
      <div class="drawer-header"><h3 id="crit-drawer-title"></h3>
        <button class="btn btn--ghost btn--sm" id="crit-drawer-close" aria-label="Close">&times;</button></div>
      <div class="drawer-body" id="crit-drawer-body"></div></div>`;
    document.body.appendChild(bd);
    bd.addEventListener('click', (e) => { if (e.target === bd) bd.classList.remove('open'); });
    bd.querySelector('#crit-drawer-close').addEventListener('click', () => bd.classList.remove('open'));
  }
  bd.querySelector('#crit-drawer-title').textContent = title;
  bd.classList.add('open');
  return bd.querySelector('#crit-drawer-body');
}

async function _openHistory(id) {
  const r = _reqs.find((x) => x.id === id);
  const body = _drawer(`Evaluation history — ${r?.title || ''}`);
  body.innerHTML = '<div style="color:var(--text-muted);text-align:center;">Loading…</div>';
  try {
    const list = await api.getEvaluationHistory(id);
    body.innerHTML = list.length ? list.map((h) => `
      <div class="chart-card" style="margin-bottom:var(--space-3);">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          ${statusChip(h.status)}<span class="mono">${fmt(h.score_attained)} / ${fmt(h.max_score)}</span>
        </div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:6px;">${escapeHtml(formatDate(h.evaluated_at))}${h.notes ? ' · ' + escapeHtml(h.notes) : ''}</div>
        ${(h.limitations || []).map((l) => `<div style="font-size:12px;color:var(--warning);margin-top:4px;">${escapeHtml(String(l))}</div>`).join('')}
      </div>`).join('') : '<div style="color:var(--text-muted);text-align:center;">This requirement has not been evaluated yet.</div>';
  } catch (err) {
    body.innerHTML = `<div style="color:var(--fail);">Could not load history: ${escapeHtml(err.message || String(err))}</div>`;
  }
}

/** "years (list of {N1, N4, N} per year)" -> { name: "years", hint: "list of {...} per year" } */
function _parseKey(raw) {
  const m = String(raw).match(/^([^\s(]+)\s*(?:\((.*)\))?$/);
  return { name: m ? m[1] : String(raw), hint: m && m[2] ? m[2] : '' };
}

function _parseValue(text) {
  const t = text.trim();
  if (t === '') return undefined;
  try { return JSON.parse(t); } catch { return t; }
}

/** Find "key: list of dicts, each with: SUB type — hint" blocks in the rule help text. */
function _parseListShapes(help) {
  const shapes = {};
  const lines = String(help || '').split('\n');
  for (let i = 0; i < lines.length; i += 1) {
    const m = lines[i].match(/^\s*(\w+):\s+list of dicts/i);
    if (!m) continue;
    const subs = [];
    for (let j = i + 1; j < lines.length; j += 1) {
      const sm = lines[j].match(/^\s{6,}(\w+)\s+(\w+)\s+[—-]\s+(.*)$/);
      if (!sm) break;
      subs.push({ key: sm[1], type: sm[2], hint: sm[3] });
    }
    if (subs.length) shapes[m[1]] = subs;
  }
  return shapes;
}

async function _openInputs(id) {
  const r = _reqs.find((x) => x.id === id);
  const canEdit = isHodOrAdmin();
  const body = _drawer(`Inputs — ${r?.title || ''}`);
  body.innerHTML = '<div style="color:var(--text-muted);text-align:center;">Loading…</div>';
  try {
    const d = await api.getRequirementInputs(id, { department: DEPARTMENT });
    const saved = d.saved || {};
    const auto = d.auto_filled || {};
    const required = new Set((d.missing_keys || []).map((k) => _parseKey(k).name));
    const shapes = _parseListShapes(d.rule_help);
    const nested = new Set(Object.values(shapes).flat().map((x) => x.key));

    // Every key the rule reads, minus keys that only exist inside a list.
    let fields = (d.expected_keys && d.expected_keys.length)
      ? d.expected_keys.filter((k) => !nested.has(k.key) || k.key in saved || k.key in auto)
      : [...required].map((k) => ({ key: k, type: '', hint: '' }));
    const have = new Set(fields.map((f) => f.key));
    [...required, ...Object.keys(saved)].forEach((k) => { if (!have.has(k)) { fields.push({ key: k, type: '', hint: '' }); have.add(k); } });
    fields = fields.filter((f) => f.key !== 'department' && f.key !== 'academic_year_id');

    const initial = (f) => (f.key in saved ? JSON.stringify(saved[f.key]) : f.key in auto ? JSON.stringify(auto[f.key]) : '');
    const badge = (t, c) => `<span class="chip chip--${c}" style="font-size:10px;padding:1px 6px;margin-left:6px;">${t}</span>`;

    const fieldHtml = (f) => {
      const isList = f.key in shapes;
      const subs = shapes[f.key] || [];
      const example = isList ? JSON.stringify([Object.fromEntries(subs.map((x) => [x.key, 0]))]) : '';
      const sub = isList
        ? `<span style="color:var(--text-muted);font-size:12px;">A list. Each item needs: ${subs.map((x) => `<span class="mono">${escapeHtml(x.key)}</span> = ${escapeHtml(x.hint)}`).join('; ')}. Example: <span class="mono">${escapeHtml(example)}</span></span>`
        : (f.hint ? `<span style="color:var(--text-muted);font-size:12px;">${escapeHtml(f.hint)}</span>` : '');
      const val = initial(f);
      const control = isList
        ? `<textarea class="form-input" name="${escapeHtml(f.key)}" rows="3" ${canEdit ? '' : 'disabled'} placeholder='${escapeHtml(example)}'>${escapeHtml(val)}</textarea>`
        : `<input class="form-input" name="${escapeHtml(f.key)}" value="${escapeHtml(val)}" ${canEdit ? '' : 'disabled'} placeholder="Number, true/false, or JSON">`;
      return `<label style="display:flex;flex-direction:column;gap:4px;font-size:13px;${required.has(f.key) ? 'border-left:3px solid var(--warning);padding-left:10px;' : ''}">
        <span style="font-weight:600;">${escapeHtml(f.key.replace(/_/g, ' '))}
          ${f.type ? `<span class="mono" style="font-weight:400;color:var(--text-muted);font-size:11px;"> ${escapeHtml(f.type)}</span>` : ''}
          ${required.has(f.key) ? badge('Required', 'warning') : ''}${f.key in auto && !(f.key in saved) ? badge('Auto from records', 'info') : ''}${f.key in saved ? badge('Entered by you', 'pass') : ''}
        </span>${sub}${control}</label>`;
    };

    body.innerHTML = `
      ${d.rule_help ? `<details style="margin-bottom:var(--space-4);"><summary style="cursor:pointer;font-weight:600;">How this is scored</summary>
        <pre style="white-space:pre-wrap;font-family:inherit;font-size:13px;color:var(--text-secondary);margin-top:var(--space-2);">${escapeHtml(d.rule_help)}</pre></details>` : ''}
      ${_state[id]?.limit && _state[id].status !== 'PASS' ? `<div class="glass-sm" style="padding:var(--space-3);border-left:3px solid var(--warning);font-size:13px;margin-bottom:var(--space-4);">${escapeHtml(_state[id].limit)}</div>` : ''}
      <h4 style="margin:0 0 var(--space-2);">${canEdit ? 'Figures this rule uses' : 'Figures this rule uses (read only)'}</h4>
      <p style="font-size:12px;color:var(--text-muted);margin-bottom:var(--space-3);">Fields marked "Auto from records" are calculated from your data. Leave them as they are to keep following the records, or change one to override it.</p>
      <form id="crit-inputs-form" style="display:flex;flex-direction:column;gap:var(--space-3);">
        ${fields.map(fieldHtml).join('')}
        ${canEdit ? `<div style="display:flex;gap:var(--space-2);align-items:flex-end;">
            <label style="flex:1;font-size:12px;color:var(--text-muted);">Add another figure (name)<input class="form-input" id="crit-extra-name" placeholder="e.g. attainment_formula_configured"></label>
            <label style="flex:1;font-size:12px;color:var(--text-muted);">Value<input class="form-input" id="crit-extra-value" placeholder="true, 12, or JSON"></label>
          </div>
          <button class="btn btn--primary" type="submit">Save and re-evaluate</button>` : ''}
      </form>`;

    body.querySelector('#crit-inputs-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = {};
      const bad = [];
      new FormData(e.currentTarget).forEach((v, k) => {
        const text = String(v).trim();
        if (text === '') return;
        // Unchanged auto values keep following the records instead of becoming a fixed override.
        if (!(k in saved) && k in auto && text === JSON.stringify(auto[k])) return;
        if (k in shapes) {
          try { const j = JSON.parse(text); if (!Array.isArray(j)) throw new Error('not a list'); data[k] = j; } catch { bad.push(k); }
          return;
        }
        const parsed = _parseValue(text);
        if (parsed !== undefined) data[k] = parsed;
      });
      if (bad.length) return toastError(`${bad.join(', ')} must be a JSON list, for example ${JSON.stringify([{}])}.`);
      const xn = document.getElementById('crit-extra-name')?.value.trim();
      const xv = _parseValue(document.getElementById('crit-extra-value')?.value || '');
      if (xn && xv !== undefined) data[xn] = xv;
      const submit = e.currentTarget.querySelector('button[type=submit]');
      submit.disabled = true;
      try {
        await api.saveRequirementInputs(id, { data, department: DEPARTMENT });
        await _evaluate(id, true);
        document.getElementById('crit-drawer-backdrop').classList.remove('open');
      } catch (err) {
        toastError(`Could not save inputs: ${err.message || err}`);
        submit.disabled = false;
      }
    });
  } catch (err) {
    body.innerHTML = `<div style="color:var(--fail);">Could not load inputs: ${escapeHtml(err.message || String(err))}</div>`;
  }
}

/** Requirements loaded for the current criterion (used by evidence upload). */
export function getRequirements() { return _reqs; }

/** Re-read stored evaluations and repaint the table, ring and score. */
export async function refreshCriterionPanel() { await _refreshState(); }


/**
 * AI Advisory Review card (Criteria 4, 5, 6). Criterion 3 has its own tab.
 * The AI only gives advice; it never changes a score.
 */
export function mountAiReview({ prefix, label, reqCode, task, into }) {
  if (document.getElementById(`${prefix}-ai-card`)) return;
  const tbody = document.getElementById(`${prefix}-reqs-tbody`);
  const anchor = tbody?.closest('.requirements-card, .chart-card') || tbody?.closest('table')?.parentElement;
  if (!anchor && !into) return;

  const card = into || document.createElement('div');
  card.id = `${prefix}-ai-card`;
  if (!into) { card.className = 'chart-card'; card.style.marginTop = 'var(--space-6)'; }
  card.innerHTML = `
    <div class="chart-card-header">
      <h3>AI Advisory Review: ${escapeHtml(label)}</h3>
      <button class="btn btn--primary btn--sm" id="${prefix}-ai-btn">Run AI Review</button>
    </div>
    <p style="font-size:var(--text-sm);color:var(--text-muted);margin-bottom:var(--space-3);">
      An AI reads this criterion's results and your uploaded evidence and suggests what to improve. It is advice only and never changes a score.</p>
    <div id="${prefix}-ai-out" style="font-size:var(--text-sm);color:var(--text-secondary);">Click "Run AI Review".</div>`;
  if (!into) anchor.after(card);

  document.getElementById(`${prefix}-ai-btn`).addEventListener('click', async () => {
    const out = document.getElementById(`${prefix}-ai-out`);
    out.innerHTML = '<span style="color:var(--cyan);">The AI is reviewing...</span>';
    try {
      const years = await api.listAcademicYears();
      const year = (years || []).find(y => y.is_active) || (years || [])[0];
      const req = _reqs.find(r => r.code === reqCode) || _reqs[0];
      if (!year || !req) throw new Error('No academic year or requirement is available yet.');
      const res = await api.triggerAiAnalysis({
        requirement_id: req.id,
        academic_year_id: year.id,
        department: 'Computer Science and Engineering',
        analysis_task: task,
      });
      const list = (arr) => (arr && arr.length)
        ? `<ul style="margin:4px 0 0 1.1rem;padding:0;">${arr.map(x => `<li>${escapeHtml(typeof x === 'string' ? x : (x.finding || x.title || JSON.stringify(x)))}</li>`).join('')}</ul>` : '';
      out.innerHTML = `
        <div class="glass-sm" style="padding:var(--space-3);border-left:3px solid var(--violet);">
          <div style="font-weight:600;color:var(--text-primary);margin-bottom:4px;">Status: ${escapeHtml(res.status)}</div>
          <div>${escapeHtml(res.summary || res.error || 'No summary was returned.')}</div>
          ${res.findings?.length ? `<div style="margin-top:8px;font-weight:600;">Findings</div>${list(res.findings)}` : ''}
          ${res.recommended_actions?.length ? `<div style="margin-top:8px;font-weight:600;">Recommended actions</div>${list(res.recommended_actions)}` : ''}
        </div>`;
    } catch (err) {
      out.innerHTML = `<span style="color:var(--fail);">The AI review could not run: ${escapeHtml(err.message || String(err))}</span>`;
    }
  });
}
