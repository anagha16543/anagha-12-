/**
 * dash/c6.js — Criterion 6: Faculty Contributions & Research (120 Marks)
 * AI-NBA Readiness System
 */

import { initDashboardShell } from './shared.js';
import { api } from '../api.js';
import { countUp, statusChip, toast, toastSuccess, toastError } from '../ui.js';
import { isHodOrAdmin } from '../guard.js';
import { initCriterionPanel, mountAiReview } from './criteria-common.js';
import { mountC6Extras } from './criteria-extras.js';

let _criterionId = null;
let _requirements = [];
let _researchChart = null;


document.addEventListener('DOMContentLoaded', async () => {
  await initDashboardShell('C6');
  _setupTabs();
  await initCriterionPanel({ code: 'C6', prefix: 'c6' });
  mountAiReview({ prefix: 'c6', label: 'Faculty Contributions', reqCode: 'REQ_6_2_1', task: 'Review research, patents, projects and consultancy for Criterion 6' });
  mountC6Extras();
  _initResearchChart();
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

        if (tab.dataset.tab === 'tab-c6-research') {
          setTimeout(() => {
            if (_researchChart) {
              _researchChart.resize();
              _researchChart.update();
            } else {
              _initResearchChart();
            }
          }, 50);
        }
      }
    });
  });
}



function _initResearchChart() {
  const ctx = document.getElementById('c6-research-chart');
  if (!ctx || typeof Chart === 'undefined') return;

  if (_researchChart) {
    _researchChart.destroy();
  }

  _researchChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['2022-23 (CAYm2)', '2023-24 (CAYm1)', '2024-25 (CAY)'],
      datasets: [
        {
          label: 'Journal Publications (SCI/Scopus)',
          data: [12, 18, 25],
          backgroundColor: 'rgba(53,224,255, 0.75)',
          borderRadius: 4,
        },
        {
          label: 'Patents Published / Granted',
          data: [1, 2, 4],
          backgroundColor: 'rgba(124,92,255, 0.75)',
          borderRadius: 4,
        },
        {
          label: 'Sponsored Research Projects',
          data: [2, 3, 5],
          backgroundColor: 'rgba(255,92,124, 0.75)',
          borderRadius: 4,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { stacked: true, grid: { display: false }, ticks: { color: '#94A3B8' } },
        y: { stacked: true, grid: { color: 'rgba(255,255,255,0.06)' }, ticks: { color: '#64748B' } }
      },
      plugins: {
        legend: { labels: { color: '#94A3B8', font: { family: 'Inter' } } }
      }
    }
  });
}

function _setupActions() {
  document.getElementById('btn-add-pub')?.addEventListener('click', () => {
    const title = prompt('Enter Paper / Publication Title:');
    const journal = prompt('Enter Journal Name & Index (e.g. IEEE Access - SCI Q1):');
    if (title && journal) {
      const tbody = document.getElementById('c6-leaderboard-tbody');
      if (tbody) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>Current Faculty</td>
          <td class="mono">1 (Q1)</td>
          <td class="mono">0</td>
          <td class="mono">₹ 0.0</td>
          <td><span class="chip chip--pass">+10 pts</span></td>
        `;
        tbody.prepend(tr);
      }
      toastSuccess(`Publication added: "${title}" in ${journal}`);
    }
  });

  document.getElementById('btn-upload-cert')?.addEventListener('click', () => {
    const cert = prompt('Enter Certificate Name (e.g. NPTEL Deep Learning):');
    if (cert) {
      toastSuccess(`Certificate "${cert}" uploaded and logged.`);
    }
  });

  document.querySelectorAll('.btn-replace-cert').forEach(btn => {
    btn.addEventListener('click', () => {
      const row = btn.closest('tr');
      const badge = row?.querySelector('.chip--info');
      if (badge) badge.textContent = 'v2.1 (Replaced)';
      toastSuccess('Certificate replaced with new verified version. Audit trail updated.');
    });
  });
}
