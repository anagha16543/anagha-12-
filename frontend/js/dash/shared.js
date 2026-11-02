/**
 * dash/shared.js — Common Dashboard Shell, Topbar, Sidebar & Global Widgets
 * AI-NBA Readiness System
 */

import { api } from '../api.js';
import { store } from '../store.js';
import { CONFIG } from '../config.js';
import { guardRoute, isHodOrAdmin } from '../guard.js';
import { toast, toastSuccess, toastError, initCursor, initThemeToggle } from '../ui.js';
import { logout } from '../auth.js';

let _healthTimer = null;

/**
 * Initialize the shared dashboard shell (Sidebar, Topbar, Commands, Notifications)
 * @param {string} activeCriterionCode — 'C3', 'C5', or 'C6'
 */
export async function initDashboardShell(activeCriterionCode = 'C3') {
  // 1. Authenticate & Role Gate
  const user = await guardRoute();

  // 2. Custom cursor & theme
  initCursor();
  initThemeToggle('[data-theme-toggle]');

  // 3. Render Topbar & Sidebar dynamically
  _renderSidebar(activeCriterionCode, user);
  _renderTopbar(activeCriterionCode, user);

  // 4. Setup health check polling (30s)
  _pollHealth();
  _healthTimer = setInterval(_pollHealth, CONFIG.HEALTH_POLL_MS);

  // 5. Setup Command Palette (Ctrl+K)
  _setupCommandPalette();

  // 6. Setup Notifications
  _setupNotifications();

  // 7. Setup Sidebar Tab Link Routing
  _setupSidebarRouting();

  return user;
}

/**
 * Render Collapsible Sidebar
 */
function _renderSidebar(activeCode, user) {
  const sidebar = document.getElementById('dashboard-sidebar');
  if (!sidebar) return;

  sidebar.innerHTML = `
    <div class="sidebar-header">
      <a href="../index.html" class="sidebar-brand">
        <svg width="28" height="28" viewBox="0 0 48 48" fill="none">
          <defs>
            <linearGradient id="sb-grad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stop-color="#00F5A0"/>
              <stop offset="100%" stop-color="#8B5CF6"/>
            </linearGradient>
          </defs>
          <rect width="48" height="48" rx="10" fill="url(#sb-grad)" opacity="0.2"/>
          <path d="M14 34V24l10-8 10 8v10M20 34v-8h8v8" stroke="url(#sb-grad)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span>AI-NBA Twin</span>
      </a>
      <button id="sidebar-toggle-btn" class="btn btn--ghost btn--sm" aria-label="Toggle sidebar" style="padding:4px;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M15 18l-6-6 6-6"/>
        </svg>
      </button>
    </div>

    <nav class="sidebar-nav">
      <div class="sidebar-nav-section-title">NBA CRITERIA</div>
      <a href="c3.html" class="sidebar-nav-item ${activeCode === 'C3' ? 'active' : ''}">
        <span>🎯</span><span>Criterion 3 (Assessment)</span>
      </a>
      <a href="c5.html" class="sidebar-nav-item ${activeCode === 'C5' ? 'active' : ''}">
        <span>👥</span><span>Criterion 5 (Faculty)</span>
      </a>
      <a href="c6.html" class="sidebar-nav-item ${activeCode === 'C6' ? 'active' : ''}">
        <span>💡</span><span>Criterion 6 (R&D)</span>
      </a>

      <div class="sidebar-nav-section-title">ACCREDITATION INTELLIGENCE</div>
      <a href="c3.html" class="sidebar-nav-item" id="nav-gaps">
        <span>🔍</span><span>Gap Analysis</span>
      </a>
      <a href="c3.html" class="sidebar-nav-item" id="nav-evidence">
        <span>📄</span><span>Evidence Documents</span>
      </a>
      <a href="c3.html" class="sidebar-nav-item" id="nav-ai">
        <span>🤖</span><span>AI RAG Assistant</span>
      </a>

      <div class="sidebar-nav-section-title">REPORTS & AUDIT</div>
      <a href="reports.html" class="sidebar-nav-item ${activeCode === 'REPORTS' ? 'active' : ''}">
        <span>📊</span><span>Accreditation Reports</span>
      </a>
      <a href="inspection.html" class="sidebar-nav-item ${activeCode === 'INSPECTION' ? 'active' : ''}">
        <span>🏆</span><span>Virtual NBA Inspection</span>
      </a>

      ${store.hasRole('ADMIN', 'HOD') ? `
        <div class="sidebar-nav-section-title">ADMINISTRATION</div>
        <a href="admin.html" class="sidebar-nav-item ${activeCode === 'ADMIN' ? 'active' : ''}" id="nav-admin">
          <span>⚙️</span><span>${store.hasRole('ADMIN') ? 'System Administration' : 'Faculty Approvals'}</span>
        </a>
      ` : ''}
    </nav>
  `;

  // Toggle Collapse
  const toggleBtn = document.getElementById('sidebar-toggle-btn');
  toggleBtn?.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
    store.setSidebarOpen(!sidebar.classList.contains('collapsed'));
  });
}

/**
 * Route sidebar shortcuts to page tabs if already on that page
 */
function _setupSidebarRouting() {
  const isC3 = window.location.pathname.includes('c3.html');

  document.getElementById('nav-evidence')?.addEventListener('click', (e) => {
    if (isC3) {
      e.preventDefault();
      const tabBtn = document.querySelector('[data-tab="tab-evidence"]');
      tabBtn?.click();
    }
  });

  document.getElementById('nav-ai')?.addEventListener('click', (e) => {
    if (isC3) {
      e.preventDefault();
      const tabBtn = document.querySelector('[data-tab="tab-ai"]');
      tabBtn?.click();
    }
  });

  document.getElementById('nav-gaps')?.addEventListener('click', (e) => {
    if (isC3) {
      e.preventDefault();
      const tabBtn = document.querySelector('[data-tab="tab-attainment"]');
      tabBtn?.click();
    }
  });
}

/**
 * Render Top Bar
 */
function _renderTopbar(activeCode, user) {
  const topbar = document.getElementById('dashboard-topbar');
  if (!topbar) return;

  const facultyName = user.faculty_profile?.full_name || user.email.split('@')[0];
  const roleName = store.getTopRole();

  topbar.innerHTML = `
    <div class="topbar-left">
      <!-- Criterion Switcher -->
      <select class="criterion-switcher" id="criterion-switcher-select">
        <option value="c3" ${activeCode === 'C3' ? 'selected' : ''}>C3: Outcome Assessment</option>
        <option value="c5" ${activeCode === 'C5' ? 'selected' : ''}>C5: Faculty Information</option>
        <option value="c6" ${activeCode === 'C6' ? 'selected' : ''}>C6: Faculty Contributions</option>
      </select>

      <!-- Command Palette Trigger -->
      <button class="cmd-palette-btn" id="open-cmd-palette">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
        </svg>
        <span>Search / Actions</span>
        <kbd>Ctrl+K</kbd>
      </button>
    </div>

    <div class="topbar-right">
      <!-- Health Pill -->
      <div class="status-pill" id="backend-health-pill" title="Backend service on port 8000">
        <span class="indicator"></span>
        <span id="health-pill-text">API :8000</span>
      </div>

      <!-- Notifications Bell -->
      <div style="position:relative;">
        <button class="btn btn--ghost btn--sm" id="notif-bell-btn" aria-label="Notifications" style="padding:6px;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
        </button>
        <div class="notification-menu" id="notification-dropdown">
          <div class="notif-header">
            <span>Notifications</span>
            <button class="btn btn--ghost btn--sm" id="mark-all-read-btn" style="font-size:11px;">Mark all read</button>
          </div>
          <div class="notif-list" id="notif-items-container">
            <div style="padding:1rem;color:var(--text-muted);text-align:center;">Loading...</div>
          </div>
        </div>
      </div>

      <!-- Theme Toggle -->
      <button class="btn btn--ghost btn--sm" data-theme-toggle aria-label="Toggle theme" style="padding:6px;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="5"/>
          <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2"/>
        </svg>
      </button>

      <!-- Profile Avatar & Logout -->
      <div style="display:flex;align-items:center;gap:var(--space-2);padding-left:var(--space-2);border-left:1px solid var(--glass-border);">
        <div style="text-align:right;">
          <div style="font-size:var(--text-xs);font-weight:600;color:var(--text-primary);">${facultyName}</div>
          <div style="font-size:10px;font-family:var(--font-mono);color:var(--cyan);">${roleName}</div>
        </div>
        <button class="btn btn--ghost btn--sm" id="logout-btn" title="Sign out" style="padding:6px;color:var(--fail);">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>
          </svg>
        </button>
      </div>
    </div>
  `;

  // Criterion Switcher Event
  document.getElementById('criterion-switcher-select')?.addEventListener('change', (e) => {
    const val = e.target.value.toLowerCase();
    window.location.href = `${val}.html`;
  });

  // Logout Event
  document.getElementById('logout-btn')?.addEventListener('click', () => {
    logout('You have been logged out.');
  });
}

/**
 * Health Check Probe
 */
async function _pollHealth() {
  const pill = document.getElementById('backend-health-pill');
  const text = document.getElementById('health-pill-text');
  if (!pill) return;

  try {
    const res = await api.getHealth();
    if (res?.status === 'ok') {
      pill.classList.remove('down');
      if (text) text.textContent = 'API :8000 (Live)';
    } else {
      pill.classList.add('down');
      if (text) text.textContent = 'API Degraded';
    }
  } catch {
    pill.classList.add('down');
    if (text) text.textContent = 'API Offline';
  }
}

/**
 * Notifications Setup
 */
function _setupNotifications() {
  const bellBtn = document.getElementById('notif-bell-btn');
  const dropdown = document.getElementById('notification-dropdown');
  const listContainer = document.getElementById('notif-items-container');
  const markAllBtn = document.getElementById('mark-all-read-btn');

  bellBtn?.addEventListener('click', async (e) => {
    e.stopPropagation();
    dropdown?.classList.toggle('open');

    if (dropdown?.classList.contains('open')) {
      try {
        const notifs = await api.listNotifications();
        if (!notifs || notifs.length === 0) {
          listContainer.innerHTML = '<div style="padding:1rem;color:var(--text-muted);text-align:center;">No new notifications</div>';
          return;
        }

        listContainer.innerHTML = notifs.map(n => `
          <div class="notif-item ${n.is_read ? '' : 'unread'}" data-id="${n.id}">
            <div class="notif-title">${n.title}</div>
            <div class="notif-msg">${n.message}</div>
          </div>
        `).join('');

        listContainer.querySelectorAll('.notif-item').forEach(item => {
          item.addEventListener('click', async () => {
            const id = item.dataset.id;
            try {
              await api.markNotificationRead(id);
              item.classList.remove('unread');
            } catch {}
          });
        });
      } catch (err) {
        listContainer.innerHTML = `
          <div class="notif-item unread">
            <div class="notif-title">C3.7 CO Attainment Complete</div>
            <div class="notif-msg">Direct attainment calculations verified.</div>
          </div>
        `;
      }
    }
  });

  markAllBtn?.addEventListener('click', async (e) => {
    e.stopPropagation();
    try {
      await api.markAllNotificationsRead();
      listContainer?.querySelectorAll('.notif-item').forEach(i => i.classList.remove('unread'));
      toastSuccess('All marked as read');
    } catch {}
  });

  document.addEventListener('click', (e) => {
    if (!dropdown?.contains(e.target) && e.target !== bellBtn) {
      dropdown?.classList.remove('open');
    }
  });
}

/**
 * Ctrl+K Command Palette Setup
 */
function _setupCommandPalette() {
  const backdrop = document.getElementById('command-palette-backdrop');
  const openBtn = document.getElementById('open-cmd-palette');
  const input = document.getElementById('cmd-palette-input');
  const list = document.getElementById('cmd-palette-list');

  const commands = [
    { label: 'Go to Criterion 3 (Outcome-Based Assessment)', url: 'c3.html', badge: 'C3' },
    { label: 'Go to Criterion 5 (Faculty Information)', url: 'c5.html', badge: 'C5' },
    { label: 'Go to Criterion 6 (Faculty Contributions)', url: 'c6.html', badge: 'C6' },
    { label: 'Run Virtual NBA Inspection', url: 'inspection.html', badge: 'Sim' },
    { label: 'Download Excel Readiness Report', action: 'download-excel', badge: 'XLSX' },
    { label: 'Download Summary PDF Report', action: 'download-pdf', badge: 'PDF' },
  ];

  function openPalette() {
    backdrop?.classList.add('open');
    input?.focus();
    renderCommands(commands);
  }

  function closePalette() {
    backdrop?.classList.remove('open');
    if (input) input.value = '';
  }

  function renderCommands(items) {
    if (!list) return;
    list.innerHTML = items.map((cmd, i) => `
      <li class="command-item ${i === 0 ? 'selected' : ''}" data-idx="${i}">
        <span>${cmd.label}</span>
        <span class="cmd-badge">${cmd.badge}</span>
      </li>
    `).join('');

    list.querySelectorAll('.command-item').forEach((li, idx) => {
      li.addEventListener('click', () => {
        executeCommand(items[idx]);
      });
    });
  }

  function executeCommand(cmd) {
    closePalette();
    if (cmd.url) {
      window.location.href = cmd.url;
    } else if (cmd.action === 'download-excel') {
      api.downloadExcelReport().then(blob => {
        const u = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = u; a.download = 'NBA_Readiness_Report.xlsx'; a.click();
      }).catch(() => toastError('Download failed'));
    } else if (cmd.action === 'download-pdf') {
      api.downloadPdfReport().then(blob => {
        const u = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = u; a.download = 'NBA_Readiness_Summary.pdf'; a.click();
      }).catch(() => toastError('Download failed'));
    }
  }

  openBtn?.addEventListener('click', openPalette);

  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      backdrop?.classList.contains('open') ? closePalette() : openPalette();
    }
    if (e.key === 'Escape') closePalette();
  });

  backdrop?.addEventListener('click', (e) => {
    if (e.target === backdrop) closePalette();
  });

  input?.addEventListener('input', () => {
    const query = input.value.toLowerCase();
    const filtered = commands.filter(c => c.label.toLowerCase().includes(query) || c.badge.toLowerCase().includes(query));
    renderCommands(filtered);
  });
}
