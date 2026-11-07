/**
 * ui.js — UI helpers: toast, skeleton, preloader, cursor, theme toggle
 * AI-NBA Readiness System
 */

import { CONFIG } from './config.js';
import { store } from './store.js';

// ══════════════════════════════════════════════════════════════
// TOAST NOTIFICATIONS
// ══════════════════════════════════════════════════════════════

let _toastContainer = null;

function _getToastContainer() {
  if (!_toastContainer) {
    _toastContainer = document.getElementById('toast-container');
    if (!_toastContainer) {
      _toastContainer = document.createElement('div');
      _toastContainer.id = 'toast-container';
      document.body.appendChild(_toastContainer);
    }
  }
  return _toastContainer;
}

const TOAST_ICONS = {
  success: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg>`,
  error:   `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>`,
  warning: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>`,
  info:    `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4m0-4h.01"/></svg>`,
};

/**
 * Show a toast notification.
 * @param {string} message
 * @param {'success'|'error'|'warning'|'info'} type
 * @param {number} [duration]
 */
export function toast(message, type = 'info', duration = CONFIG.TOAST_DURATION_MS) {
  const container = _getToastContainer();
  const el = document.createElement('div');
  el.className = `toast toast--${type}`;
  el.setAttribute('role', 'alert');
  el.setAttribute('aria-live', 'polite');
  el.innerHTML = `
    <span class="toast-icon">${TOAST_ICONS[type] || TOAST_ICONS.info}</span>
    <span class="toast-msg">${escapeHtml(message)}</span>
    <button class="toast-close" aria-label="Dismiss" style="
      background:none;border:none;cursor:pointer;
      color:var(--text-muted);margin-left:auto;padding:2px;
      display:flex;align-items:center;
    ">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <path d="M18 6L6 18M6 6l12 12"/>
      </svg>
    </button>
  `;

  container.appendChild(el);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => el.classList.add('show'));
  });

  el.querySelector('.toast-close').addEventListener('click', () => dismissToast(el));

  if (duration > 0) {
    setTimeout(() => dismissToast(el), duration);
  }

  return el;
}

function dismissToast(el) {
  el.classList.add('hide');
  el.classList.remove('show');
  setTimeout(() => el.remove(), 700);
}

export const toastSuccess = (msg, dur) => toast(msg, 'success', dur);
export const toastError   = (msg, dur) => toast(msg, 'error', dur);
export const toastWarning = (msg, dur) => toast(msg, 'warning', dur);
export const toastInfo    = (msg, dur) => toast(msg, 'info', dur);


// ══════════════════════════════════════════════════════════════
// PRELOADER
// ══════════════════════════════════════════════════════════════

export function hidePreloader(delay = 400) {
  const el = document.getElementById('preloader');
  if (!el) return;
  setTimeout(() => {
    el.classList.add('fade-out');
    setTimeout(() => el.remove(), 700);
  }, delay);
}


// ══════════════════════════════════════════════════════════════
// CUSTOM CURSOR
// ══════════════════════════════════════════════════════════════

let _cursorDot, _cursorRing;
let _mx = -100, _my = -100;
let _rx = -100, _ry = -100;
let _rafId = null;

export function initCursor() {
  if (window.matchMedia('(hover: none)').matches) return;

  _cursorDot  = document.getElementById('cursor-dot');
  _cursorRing = document.getElementById('cursor-ring');

  if (!_cursorDot) {
    _cursorDot = document.createElement('div');
    _cursorDot.id = 'cursor-dot';
    document.body.appendChild(_cursorDot);
  }
  if (!_cursorRing) {
    _cursorRing = document.createElement('div');
    _cursorRing.id = 'cursor-ring';
    document.body.appendChild(_cursorRing);
  }

  document.addEventListener('mousemove', e => {
    _mx = e.clientX;
    _my = e.clientY;
    _cursorDot.style.left = `${_mx}px`;
    _cursorDot.style.top  = `${_my}px`;
  });

  // Throttled ring tracking
  function animateRing() {
    _rx += (_mx - _rx) * 0.12;
    _ry += (_my - _ry) * 0.12;
    _cursorRing.style.left = `${_rx}px`;
    _cursorRing.style.top  = `${_ry}px`;
    _rafId = requestAnimationFrame(animateRing);
  }
  animateRing();

  // Hover state on interactive elements
  const magnetTargets = '[data-magnetic], .btn, a, button, input, select, textarea, label';
  document.addEventListener('mouseover', e => {
    if (e.target.closest(magnetTargets)) {
      document.body.classList.add('cursor-hover');
    }
  });
  document.addEventListener('mouseout', e => {
    if (e.target.closest(magnetTargets)) {
      document.body.classList.remove('cursor-hover');
    }
  });
}

export function destroyCursor() {
  if (_rafId) cancelAnimationFrame(_rafId);
}


// ══════════════════════════════════════════════════════════════
// SCROLL PROGRESS BAR
// ══════════════════════════════════════════════════════════════

export function initScrollProgress() {
  const bar = document.getElementById('scroll-progress') || (() => {
    const el = document.createElement('div');
    el.id = 'scroll-progress';
    document.body.prepend(el);
    return el;
  })();

  window.addEventListener('scroll', () => {
    const total  = document.documentElement.scrollHeight - window.innerHeight;
    const pct    = total > 0 ? (window.scrollY / total) * 100 : 0;
    bar.style.width = `${pct}%`;
  }, { passive: true });
}


// ══════════════════════════════════════════════════════════════
// THEME TOGGLE
// ══════════════════════════════════════════════════════════════

export function initThemeToggle(buttonSelector = '[data-theme-toggle]') {
  const btn = document.querySelector(buttonSelector);
  if (!btn) return;

  _applyTheme(store.getTheme());

  btn.addEventListener('click', () => {
    const next = store.getTheme() === 'dark' ? 'light' : 'dark';
    store.setTheme(next);
    _applyTheme(next);
    _updateToggleIcon(btn, next);
  });

  _updateToggleIcon(btn, store.getTheme());
}

function _applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
}

function _updateToggleIcon(btn, theme) {
  btn.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`);
  btn.innerHTML = theme === 'dark'
    ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
         <circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
       </svg>`
    : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
         <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
       </svg>`;
}


// ══════════════════════════════════════════════════════════════
// SKELETON HELPERS
// ══════════════════════════════════════════════════════════════

/**
 * Replace el content with skeleton lines.
 * @param {HTMLElement} el
 * @param {number} lines
 */
export function showSkeleton(el, lines = 3) {
  el.innerHTML = Array.from({ length: lines }, (_, i) => `
    <div class="skeleton" style="height:16px;margin-bottom:10px;width:${70 + Math.random() * 30}%;border-radius:4px;"></div>
  `).join('');
}

export function clearSkeleton(el) {
  el.innerHTML = '';
}


// ══════════════════════════════════════════════════════════════
// STATUS CHIP HELPER
// ══════════════════════════════════════════════════════════════

const STATUS_MAP = {
  PASS:                     'pass',
  WARNING:                  'warning',
  FAIL:                     'fail',
  NOT_APPLICABLE:           'na',
  NEEDS_RULE_CLARIFICATION: 'nrc',
};

const STATUS_LABEL = {
  PASS:                     'PASS',
  WARNING:                  'WARNING',
  FAIL:                     'FAIL',
  NOT_APPLICABLE:           'N/A',
  NEEDS_RULE_CLARIFICATION: 'NEEDS CLARIFICATION',
};

export function statusChip(status) {
  const cls   = STATUS_MAP[status]   || 'na';
  const label = STATUS_LABEL[status] || status;
  return `<span class="chip chip--${cls}">${label}</span>`;
}


// ══════════════════════════════════════════════════════════════
// INLINE FORM VALIDATION HELPERS
// ══════════════════════════════════════════════════════════════

export function setFieldError(inputEl, message) {
  inputEl.classList.add('error');
  let errEl = inputEl.parentElement.querySelector('.form-error');
  if (!errEl) {
    errEl = document.createElement('div');
    errEl.className = 'form-error';
    inputEl.parentElement.appendChild(errEl);
  }
  errEl.textContent = message;
  errEl.classList.add('visible');
}

export function clearFieldError(inputEl) {
  inputEl.classList.remove('error');
  const errEl = inputEl.parentElement.querySelector('.form-error');
  if (errEl) errEl.classList.remove('visible');
}

export function clearAllErrors(formEl) {
  formEl.querySelectorAll('.form-control.error').forEach(el => clearFieldError(el));
}


// ══════════════════════════════════════════════════════════════
// MISC UTILITIES
// ══════════════════════════════════════════════════════════════

export function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

export function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

export function formatNumber(n) {
  if (n === null || n === undefined) return '—';
  return Number(n).toLocaleString('en-IN');
}

export function debounce(fn, delay) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
}

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/** Animate a number counting up from 0 to target */
export function countUp(el, target, duration = 1200, suffix = '') {
  const start = performance.now();
  const from = 0;
  function step(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // ease-out-cubic
    el.textContent = Math.round(from + (target - from) * eased) + suffix;
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

/** Set button to loading state, returns restore function */
export function setButtonLoading(btn, label = 'Loading…') {
  const original = btn.innerHTML;
  btn.classList.add('btn--loading');
  btn.disabled = true;
  btn.innerHTML = `<span>${label}</span>`;
  return () => {
    btn.classList.remove('btn--loading');
    btn.disabled = false;
    btn.innerHTML = original;
  };
}

/** Get query param from current URL */
export function getParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

/** Navigate with optional delay (for transitions) */
export function navigate(url, delay = 0) {
  let target = url;
  if (window.location.protocol === 'file:') {
    if (target.startsWith('/')) {
      const depth = window.location.pathname.split('/').filter(Boolean).length - 1;
      target = (depth > 0 ? '../'.repeat(depth) : './') + target.replace(/^\/+/, '');
    }
  } else {
    // Over HTTP, ensure root-relative paths start with / so they resolve from site root
    if (!target.startsWith('/') && !target.startsWith('http')) {
      target = '/' + target;
    }
  }
  setTimeout(() => { window.location.href = target; }, delay);
}

/** Floating label: mark input as has-value for CSS */
export function bindFloatingLabel(input) {
  function check() {
    if (input.value) input.classList.add('has-value');
    else input.classList.remove('has-value');
  }
  input.addEventListener('input', check);
  input.addEventListener('blur', check);
  check();
}

