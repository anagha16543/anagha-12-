/**
 * dash/c5.js — Criterion 5: Faculty Information (100 Marks)
 * AI-NBA Readiness System
 */

import { initDashboardShell } from './shared.js';
import { api } from '../api.js';
import { countUp, statusChip, toast, toastSuccess, toastError } from '../ui.js';
import { isHodOrAdmin } from '../guard.js';
import { initCriterionPanel, mountAiReview } from './criteria-common.js';
import { mountC5Extras } from './criteria-extras.js';

let _criterionId = null;
let _requirements = [];


document.addEventListener('DOMContentLoaded', async () => {
  // 1. Initialize Dashboard Shell
  await initDashboardShell('C5');

  // 2. Setup Tabs
  _setupTabs();

  // 3. Load C5 Data
  await initCriterionPanel({ code: 'C5', prefix: 'c5' });
  mountAiReview({ prefix: 'c5', label: 'Faculty Information', reqCode: 'REQ_5_1', task: 'Review faculty strength, qualifications and cadre for Criterion 5' });
  mountC5Extras();

  // 4. Render Faculty Roster Cards
  _renderFacultyRoster();

  // 5. Setup Action Handlers
  _setupActions();
});

function _setupTabs() {
  const tabs = document.querySelectorAll('.dash-tab-btn');
  const panes = document.querySelectorAll('.tab-pane');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      panes.forEach(p => { p.classList.remove('active'); p.style.display = 'none'; });

      tab.classList.add('active');
      const target = document.getElementById(tab.dataset.tab);
      if (target) {
        target.classList.add('active');
        target.style.display = 'block';
      }
    });
  });
}



function _renderFacultyRoster() {
  const grid = document.getElementById('faculty-cards-grid');
  if (!grid) return;

  const facultyMembers = [
    { name: 'Dr. Priya Nair', desig: 'Professor & HOD', id: 'FAC001', degree: 'Ph.D (IIT Bombay)', comp: 95 },
    { name: 'Dr. Rajesh Kumar', desig: 'Associate Professor', id: 'FAC002', degree: 'Ph.D (IISc Bangalore)', comp: 90 },
    { name: 'Ms. Anitha Sharma', desig: 'Assistant Professor', id: 'FAC003', degree: 'M.Tech (NITK)', comp: 80 },
    { name: 'Dr. Vikram Seth', desig: 'Professor', id: 'FAC004', degree: 'Ph.D (BITS Pilani)', comp: 100 },
  ];

  grid.innerHTML = facultyMembers.map(f => `
    <div class="chart-card" style="display:flex;align-items:center;gap:var(--space-4);">
      <!-- Mini Profile Completeness Ring -->
      <div class="ring-svg-wrap" style="width:50px;height:50px;flex-shrink:0;">
        <svg viewBox="0 0 60 60">
          <circle class="ring-bg" cx="30" cy="30" r="26"/>
          <circle class="ring-progress" cx="30" cy="30" r="26" style="stroke:var(--pass);stroke-dashoffset:${163.3 - (163.3 * (f.comp / 100))};"/>
        </svg>
        <div class="ring-val-label" style="font-size:11px;">${f.comp}%</div>
      </div>
      <div>
        <div style="font-weight:700;color:var(--text-primary);">${f.name}</div>
        <div style="font-size:12px;color:var(--violet);font-weight:600;">${f.desig}</div>
        <div style="font-size:11px;color:var(--text-muted);">${f.degree} • <span class="mono">${f.id}</span></div>
      </div>
    </div>
  `).join('');
}

function _setupActions() {
  document.getElementById('btn-add-qualification')?.addEventListener('click', () => {
    const deg = prompt('Enter Degree (e.g. Ph.D, M.Tech):');
    const inst = prompt('Enter University / Institution:');
    if (deg && inst) {
      toastSuccess(`Qualification recorded: ${deg} from ${inst}`);
    }
  });

  document.getElementById('btn-assign-subject-drawer')?.addEventListener('click', () => {
    const fac = prompt('Enter Faculty Name or ID:');
    const sub = prompt('Enter Subject Code (e.g. CS401):');
    if (fac && sub) {
      const tbody = document.getElementById('c5-assignments-tbody');
      if (tbody) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${fac}</td>
          <td>${sub} — Assigned Course</td>
          <td class="mono">4 Credits (4 hrs/wk)</td>
          <td><span class="chip chip--pass">ACTIVE</span></td>
        `;
        tbody.prepend(tr);
      }
      toastSuccess(`Assigned ${sub} to ${fac}`);
    }
  });
}
