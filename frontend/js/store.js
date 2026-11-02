/**
 * store.js — Lightweight reactive state store
 * AI-NBA Readiness System
 */

import { CONFIG } from './config.js';

// ── Internal state ──────────────────────────────────────────
const _state = {
  user:        null,   // { id, email, roles, status, faculty_profile }
  token:       null,
  theme:       localStorage.getItem('nba_theme') || 'dark',
  sidebarOpen: true,
};

const _listeners = {};

// ── Subscribe / publish ─────────────────────────────────────
function on(key, callback) {
  if (!_listeners[key]) _listeners[key] = [];
  _listeners[key].push(callback);
  return () => {
    _listeners[key] = _listeners[key].filter(cb => cb !== callback);
  };
}

function emit(key, value) {
  (_listeners[key] || []).forEach(cb => cb(value));
}

// ── Setters ─────────────────────────────────────────────────
function setUser(user) {
  _state.user = user;
  if (user) {
    try { localStorage.setItem(CONFIG.USER_KEY, JSON.stringify(user)); } catch {}
  } else {
    localStorage.removeItem(CONFIG.USER_KEY);
  }
  emit('user', user);
}

function setToken(token) {
  _state.token = token;
  if (token) {
    try { localStorage.setItem(CONFIG.TOKEN_KEY, token); } catch {}
  } else {
    localStorage.removeItem(CONFIG.TOKEN_KEY);
  }
  emit('token', token);
}

function setTheme(theme) {
  _state.theme = theme;
  localStorage.setItem('nba_theme', theme);
  document.documentElement.setAttribute('data-theme', theme);
  emit('theme', theme);
}

function setSidebarOpen(open) {
  _state.sidebarOpen = open;
  emit('sidebarOpen', open);
}

// ── Getters ─────────────────────────────────────────────────
function getToken() {
  if (_state.token) return _state.token;
  return localStorage.getItem(CONFIG.TOKEN_KEY) || null;
}

function getUser() {
  if (_state.user) return _state.user;
  try {
    const raw = localStorage.getItem(CONFIG.USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function getTheme() { return _state.theme; }
function getSidebarOpen() { return _state.sidebarOpen; }

// ── Auth helpers ────────────────────────────────────────────
function isLoggedIn() { return !!getToken() && !!getUser(); }

function hasRole(...roles) {
  const user = getUser();
  if (!user) return false;
  return roles.some(r => (user.roles || []).includes(r));
}

/** Returns true if user role is at or above the required minimum */
function hasMinRole(minRole) {
  const hierarchy = CONFIG.ROLES; // ['ADMIN','HOD','FACULTY']
  const userRoles = getUser()?.roles || [];
  const minIdx = hierarchy.indexOf(minRole);
  if (minIdx === -1) return false;
  return userRoles.some(r => hierarchy.indexOf(r) <= minIdx);
}

function getTopRole() {
  const user = getUser();
  if (!user) return null;
  for (const r of CONFIG.ROLES) {
    if ((user.roles || []).includes(r)) return r;
  }
  return null;
}

// ── Clear session ────────────────────────────────────────────
function clearSession() {
  setToken(null);
  setUser(null);
}

// ── Init: restore theme ──────────────────────────────────────
(function init() {
  const saved = localStorage.getItem('nba_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
  _state.theme = saved;
})();

export const store = {
  on,
  setUser, setToken, setTheme, setSidebarOpen,
  getToken, getUser, getTheme, getSidebarOpen,
  isLoggedIn, hasRole, hasMinRole, getTopRole,
  clearSession,
};

export default store;

