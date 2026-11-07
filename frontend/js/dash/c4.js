/**
 * dash/c4.js — Criterion 4: Students' Performance (100 Marks)
 * AI-NBA Readiness System
 */

import { initDashboardShell } from './shared.js';
import { api } from '../api.js';
import { countUp, statusChip, toast, toastSuccess, toastError } from '../ui.js';
import { isHodOrAdmin } from '../guard.js';
import { initCriterionPanel, mountAiReview } from './criteria-common.js';
import { mountC4Extras } from './criteria-extras.js';

let _criterionId = null;
let _requirements = [];
let _successChart = null;
let _apiChart = null;
let _placementChart = null;


document.addEventListener('DOMContentLoaded', async () => {
  await initDashboardShell('C4');
  _setupTabs();
  await initCriterionPanel({ code: 'C4', prefix: 'c4' });
  mountC4Extras();
  _initCharts();
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

        if (tab.dataset.tab === 'tab-c4-progression') {
          setTimeout(() => {
            _successChart?.resize();
            _apiChart?.resize();
          }, 50);
        } else if (tab.dataset.tab === 'tab-c4-placements') {
          setTimeout(() => {
            _placementChart?.resize();
          }, 50);
        }
      }
    });
  });
}



function _initCharts() {
  // Chart 1: Success Rate progression
  const ctxSuccess = document.getElementById('c4-success-chart')?.getContext('2d');
  if (ctxSuccess) {
    _successChart = new Chart(ctxSuccess, {
      type: 'bar',
      data: {
        labels: ['CAYm2 (2022-23)', 'CAYm1 (2023-24)', 'CAY (2024-25)'],
        datasets: [
          {
            label: 'Without Backlog (%)',
            data: [73.0, 75.8, 77.9],
            backgroundColor: '#10B981',
            borderRadius: 6,
          },
          {
            label: 'With Backlog (%)',
            data: [15.6, 13.8, 11.9],
            backgroundColor: '#F59E0B',
            borderRadius: 6,
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', labels: { color: '#94A3B8', boxWidth: 12 } }
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#94A3B8' } },
          y: {
            grid: { color: 'rgba(255,255,255,0.06)' },
            ticks: { color: '#94A3B8' },
            suggestedMax: 100
          }
        }
      }
    });
  }

  // Chart 2: API
  const ctxApi = document.getElementById('c4-api-chart')?.getContext('2d');
  if (ctxApi) {
    _apiChart = new Chart(ctxApi, {
      type: 'line',
      data: {
        labels: ['1st Year (4.5)', '2nd Year (4.4)', '3rd Year (4.3)'],
        datasets: [{
          label: 'Academic Performance Index (API)',
          data: [6.95, 5.94, 7.12],
          borderColor: '#35E0FF',
          backgroundColor: 'rgba(53,224,255, 0.1)',
          fill: true,
          tension: 0.35,
          pointBackgroundColor: '#35E0FF',
          pointRadius: 5
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#94A3B8' } },
          y: {
            grid: { color: 'rgba(255,255,255,0.06)' },
            ticks: { color: '#94A3B8' },
            suggestedMin: 4,
            suggestedMax: 10
          }
        }
      }
    });
  }

  // Chart 3: Placement Distribution
  const ctxPlacement = document.getElementById('c4-placement-chart')?.getContext('2d');
  if (ctxPlacement) {
    _placementChart = new Chart(ctxPlacement, {
      type: 'bar',
      data: {
        labels: ['CAYm2 (2022-23)', 'CAYm1 (2023-24)', 'CAY (2024-25)'],
        datasets: [
          {
            label: 'Campus Placements (X)',
            data: [82, 86, 92],
            backgroundColor: '#35E0FF',
            borderRadius: 6
          },
          {
            label: 'Higher Studies (Y)',
            data: [12, 15, 14],
            backgroundColor: '#7C5CFF',
            borderRadius: 6
          },
          {
            label: 'Startups / Entrepreneurship (Z)',
            data: [2, 3, 5],
            backgroundColor: '#CCFF3D',
            borderRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', labels: { color: '#94A3B8', boxWidth: 12 } }
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#94A3B8' } },
          y: {
            grid: { color: 'rgba(255,255,255,0.06)' },
            ticks: { color: '#94A3B8' },
            suggestedMax: 120
          }
        }
      }
    });
  }
}

function _setupActions() {
  // Evaluate-all is wired in criteria-common.js (real evaluation).
}

