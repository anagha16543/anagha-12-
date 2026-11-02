/**
 * auth.js — Authentication helpers
 * Handles login, logout, registration, session restore
 */

import { CONFIG } from './config.js';
import { store }  from './store.js';
import { api }    from './api.js';
import { toastSuccess, toastError, toastWarning, getParam, navigate } from './ui.js';

// ══════════════════════════════════════════════════════════════
// SESSION MANAGEMENT
// ══════════════════════════════════════════════════════════════

/**
 * Try to restore session from localStorage.
 * Calls GET /auth/me to validate the stored token.
 * Returns the user object or null.
 */
export async function restoreSession() {
  const token = store.getToken();
  if (!token) return null;

  try {
    const user = await api.getMe();
    store.setUser(user);
    return user;
  } catch {
    // Token expired or invalid
    store.clearSession();
    return null;
  }
}

// ══════════════════════════════════════════════════════════════
// LOGIN
// ══════════════════════════════════════════════════════════════

/**
 * Perform login.
 * @param {string} email
 * @param {string} password
 * @param {string|null} redirectTo — URL to go to after login (from ?redirect=)
 * @returns {Promise<{user, token}>}
 */
export async function login(email, password, redirectTo = null) {
  const tokenResp = await api.login(email, password);
  // tokenResp: { access_token, token_type, expires_in }

  store.setToken(tokenResp.access_token);

  // Fetch user profile
  const user = await api.getMe();
  store.setUser(user);

  toastSuccess(`Welcome back, ${user.faculty_profile?.full_name || user.email}!`);

  // Determine where to navigate:
  // Role-specific default destination
  const roleDest = _defaultDestination(user);
  
  // Use redirectTo ONLY if it is an explicit destination that does NOT default back to c3.html
  let dest = roleDest;
  if (redirectTo && !redirectTo.includes('c3.html')) {
    dest = redirectTo;
  }

  navigate(dest, 150);

  return { user, token: tokenResp.access_token };
}

// ── Determine post-login destination ────────────────────────
function _defaultDestination(user) {
  const topRole = _getTopRole(user);
  return CONFIG.DEFAULT_REDIRECT[topRole] || '/dashboards/c3.html';
}

export function _getTopRole(user) {
  for (const r of CONFIG.ROLES) {
    if ((user?.roles || []).includes(r)) return r;
  }
  return 'FACULTY';
}

// ══════════════════════════════════════════════════════════════
// LOGOUT
// ══════════════════════════════════════════════════════════════

export function logout(message = null) {
  store.clearSession();
  if (message) toastWarning(message);
  navigate('/login.html', 100);
}

// ══════════════════════════════════════════════════════════════
// REGISTER
// ══════════════════════════════════════════════════════════════

/**
 * Faculty self-registration.
 * On success navigates to pending.html.
 */
export async function register(payload) {
  const user = await api.register(payload);
  toastSuccess('Account created! Awaiting HOD approval.');
  navigate('/pending.html', 400);
  return user;
}

// ══════════════════════════════════════════════════════════════
// FRIENDLY ERROR MESSAGES FOR AUTH FLOWS
// ══════════════════════════════════════════════════════════════

export function friendlyAuthError(err) {
  const msg = err?.message || '';
  const status = err?.status || 0;

  if (status === 401 || msg.toLowerCase().includes('invalid email or password')) {
    return 'Invalid email or password. Please try again.';
  }
  if (msg.toLowerCase().includes('pending')) {
    return 'Your account is pending approval by an HOD or Administrator.';
  }
  if (msg.toLowerCase().includes('rejected')) {
    return 'Your registration was rejected. Please contact your administrator.';
  }
  if (msg.toLowerCase().includes('disabled')) {
    return 'This account has been disabled. Please contact your administrator.';
  }
  if (status === 409 || msg.toLowerCase().includes('already exists')) {
    return 'An account with this email or faculty ID already exists.';
  }
  return msg || 'Something went wrong. Please try again.';
}

