/**
 * dash/http.js — small authenticated fetch helper for dashboard pages.
 * Used where api.js has no wrapper (or a wrapper with the wrong shape).
 */
import { CONFIG } from '../config.js';
import { store } from '../store.js';

export class HttpError extends Error {
  constructor(message, status) { super(message); this.status = status; }
}

function _detail(data, fallback) {
  const d = data?.detail;
  if (typeof d === 'string') return d;
  if (Array.isArray(d)) return d.map(e => `${(e.loc || []).slice(1).join('.')}: ${e.msg}`).join('; ');
  return fallback;
}

export async function call(path, { method = 'GET', body, blob = false } = {}) {
  const headers = {};
  const token = store.getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  let res;
  try {
    res = await fetch(`${CONFIG.API_BASE}${path}`, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
  } catch {
    throw new HttpError('Cannot reach the server. Check that the backend is running.', 0);
  }
  if (!res.ok) {
    let data = null;
    try { data = await res.json(); } catch { /* not json */ }
    throw new HttpError(_detail(data, res.statusText || 'Request failed'), res.status);
  }
  if (blob) return res.blob();
  if (res.status === 204) return null;
  return res.json();
}

export function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const emptyRow = (cols, msg) => `<tr><td colspan="${cols}" style="text-align:center;padding:2rem;color:var(--text-muted);">${msg}</td></tr>`;
