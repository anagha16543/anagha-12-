/**
 * guard.js — Route / feature access guard
 *
 * Role hierarchy: ADMIN > HOD > FACULTY
 * Every dashboard page calls guardRoute() on load.
 * Buttons/sections call canAccess() before rendering.
 */

import { store }  from './store.js';
import { CONFIG } from './config.js';
import { toastError, getParam, navigate } from './ui.js';
import { restoreSession } from './auth.js';

// ══════════════════════════════════════════════════════════════
// ROUTE GUARD
// ══════════════════════════════════════════════════════════════

/**
 * Call this at the top of every protected page.
 * @param {string|string[]} [requiredRoles]  — if provided, user must have one of these
 * @returns {Promise<object>} user — or redirects
 */
export async function guardRoute(requiredRoles = null) {
  // 1. Restore / validate session
  let user = store.getUser();
  const token = store.getToken();

  if (!token) {
    _redirectToLogin();
    throw new Error('Not authenticated');
  }

  // Validate token is still good (call /auth/me)
  if (!user) {
    user = await restoreSession();
    if (!user) {
      _redirectToLogin();
      throw new Error('Session expired');
    }
  }

  // 2. Check role requirements
  if (requiredRoles) {
    const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
    if (!store.hasRole(...roles)) {
      _show403(user);
      throw new Error('Forbidden');
    }
  }

  // 3. Apply role-based DOM hiding
  _applyRoleGating(user);

  return user;
}

function _redirectToLogin() {
  const redirect = encodeURIComponent(window.location.pathname + window.location.search);
  navigate(`${_rootPath()}login.html?redirect=${redirect}`, 0);
}

function _show403(user) {
  const topRole = store.getTopRole();
  const defaultDash = CONFIG.DEFAULT_REDIRECT[topRole] || 'dashboards/c3.html';
  document.body.innerHTML = `
    <div style="min-height:100dvh;display:flex;flex-direction:column;align-items:center;justify-content:center;
      background:var(--ink);padding:2rem;text-align:center;font-family:var(--font-body);color:var(--text-primary);">
      <div style="font-size:4rem;margin-bottom:1rem;">🔒</div>
      <h1 style="font-family:var(--font-heading);font-size:2rem;margin-bottom:0.75rem;">Access Denied</h1>
      <p style="color:var(--text-secondary);margin-bottom:2rem;max-width:400px;">
        Your role (<strong>${topRole}</strong>) doesn't have permission to view this page.
      </p>
      <a href="${_rootPath()}${defaultDash}" class="btn btn--primary">← Back to Your Dashboard</a>
    </div>
  `;
}

/** Compute root path relative to current page depth */
function _rootPath() {
  const depth = window.location.pathname.split('/').length - 2;
  return depth > 0 ? '../'.repeat(depth) : './';
}

// ══════════════════════════════════════════════════════════════
// ROLE-GATED DOM ELEMENTS
// ══════════════════════════════════════════════════════════════

/**
 * Elements with data-require-role="HOD ADMIN" are hidden if user lacks any of those roles.
 * Elements with data-min-role="HOD" are hidden if user is below that in the hierarchy.
 */
function _applyRoleGating(user) {
  const roles = user?.roles || [];

  // data-require-role="HOD ADMIN" — any of the listed roles
  document.querySelectorAll('[data-require-role]').forEach(el => {
    const required = el.getAttribute('data-require-role').split(/\s+/);
    const allowed  = required.some(r => roles.includes(r));
    el.style.display = allowed ? '' : 'none';
  });

  // data-min-role="HOD" — hierarchy check
  document.querySelectorAll('[data-min-role]').forEach(el => {
    const minRole = el.getAttribute('data-min-role');
    const allowed = store.hasMinRole(minRole);
    el.style.display = allowed ? '' : 'none';
  });

  // data-hide-role="FACULTY" — hide for specific roles
  document.querySelectorAll('[data-hide-role]').forEach(el => {
    const hideFor = el.getAttribute('data-hide-role').split(/\s+/);
    const shouldHide = hideFor.some(r => roles.includes(r));
    el.style.display = shouldHide ? 'none' : '';
  });
}

// ══════════════════════════════════════════════════════════════
// PROGRAMMATIC CHECKS
// ══════════════════════════════════════════════════════════════

/**
 * Returns true if current user can perform an action.
 * @param {string|string[]} roles — required roles (any match)
 */
export function canAccess(...roles) {
  return store.hasRole(...roles);
}

/** Returns true if user is at or above minRole in the hierarchy */
export function canAccessMin(minRole) {
  return store.hasMinRole(minRole);
}

/** True if user is ADMIN */
export function isAdmin() { return store.hasRole('ADMIN'); }

/** True if user is HOD or ADMIN */
export function isHodOrAdmin() { return store.hasRole('HOD', 'ADMIN'); }

/** True if user is any faculty (including HOD and ADMIN) */
export function isFaculty() { return store.hasRole('FACULTY', 'HOD', 'ADMIN'); }

// ══════════════════════════════════════════════════════════════
// CRITERION ROUTE GUARD
// ══════════════════════════════════════════════════════════════

/**
 * Per-criterion access rules (all roles can view dashboards).
 * This is where you'd add criterion-specific gating if needed.
 */
export const CRITERION_ROLES = {
  C3: ['FACULTY', 'HOD', 'ADMIN'],
  C4: ['HOD', 'ADMIN'],
  C5: ['FACULTY', 'HOD', 'ADMIN'],
  C6: ['FACULTY', 'HOD', 'ADMIN'],
};

export async function guardCriterion(code) {
  const roles = CRITERION_ROLES[code] || ['ADMIN'];
  return guardRoute(roles);
}

