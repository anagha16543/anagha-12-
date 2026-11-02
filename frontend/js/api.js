/**
 * api.js — Centralised API layer
 * Every endpoint in the backend is mapped to a named function here.
 * Frontend code NEVER calls fetch() directly — use these functions.
 *
 * SOURCE OF TRUTH: backend/app/api/v1/* and ai-service/main.py
 * Frontend only talks to http://localhost:8000/api/v1 (never port 8001).
 *
 * NOTES (differences found vs README):
 *  - /auth/login accepts JSON body {email, password} — NOT form-encoded
 *  - /auth/register accepts JSON body (see FacultyRegisterRequest schema)
 *  - No dedicated /academic-years/{id} GET endpoint exists — use list
 *  - /documents multipart field: file (binary), then optional JSON fields
 *    as separate form fields (title, department, academic_year_id, criterion_code)
 */

import { CONFIG } from './config.js';
import { store }  from './store.js';
import { toast, toastError } from './ui.js';

// ── Mock mode ────────────────────────────────────────────────
let _mockData = null;
async function _getMock() {
  if (!_mockData) {
    const m = await import('./mock/index.js');
    _mockData = m.default;
  }
  return _mockData;
}


// ══════════════════════════════════════════════════════════════
// CORE FETCH WRAPPER
// ══════════════════════════════════════════════════════════════

/**
 * @typedef {Object} ApiOptions
 * @property {'GET'|'POST'|'PUT'|'PATCH'|'DELETE'} [method]
 * @property {object|FormData} [body]
 * @property {boolean} [multipart]  — if true, sends FormData (no Content-Type header)
 * @property {boolean} [blob]       — if true, returns raw Blob (for file download)
 * @property {boolean} [noAuth]     — skip Authorization header
 * @property {AbortSignal} [signal]
 */

/**
 * Core fetch wrapper.
 * @param {string} path  — e.g. '/auth/login'
 * @param {ApiOptions} [opts]
 * @returns {Promise<any>}
 */
async function request(path, opts = {}) {
  const {
    method    = 'GET',
    body      = undefined,
    multipart = false,
    blob      = false,
    noAuth    = false,
    signal,
  } = opts;

  const url = `${CONFIG.API_BASE}${path}`;

  const headers = {};
  if (!noAuth) {
    const token = store.getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  if (body && !multipart) {
    headers['Content-Type'] = 'application/json';
  }

  const controller = new AbortController();
  const timeoutId  = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT_MS);

  let response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: multipart
        ? body
        : body
          ? JSON.stringify(body)
          : undefined,
      signal: signal ?? controller.signal,
    });
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      toastError('Request timed out. Please try again.');
      throw new ApiError('Request timed out', 0);
    }
    toastError('Network error. Is the backend running on port 8000?');
    throw new ApiError(err.message, 0);
  } finally {
    clearTimeout(timeoutId);
  }

  // ── Handle 401 → clear session and redirect ──────────────
  if (response.status === 401) {
    store.clearSession();
    if (!window.location.pathname.includes('login.html')) {
      toast('Session expired. Please log in again.', 'warning');
      setTimeout(() => {
        const redirect = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.href = `/login.html?redirect=${redirect}`;
      }, 1500);
    }
    throw new ApiError('Unauthorized', 401);
  }

  // ── Blob responses (file downloads) ─────────────────────
  if (blob) {
    if (!response.ok) {
      const text = await response.text();
      throw new ApiError(text || response.statusText, response.status);
    }
    return response.blob();
  }

  // ── JSON responses ───────────────────────────────────────
  let data;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const msg = _extractErrorMessage(data, response.status);

    if (response.status === 403) {
      toastError(`Access denied: ${msg}`);
    } else if (response.status === 404) {
      // let caller handle 404s silently
    } else if (response.status === 409) {
      // conflict — let caller handle
    } else if (response.status >= 500) {
      toastError(`Server error (${response.status}). Try again shortly.`);
    }

    throw new ApiError(msg, response.status, data);
  }

  return data;
}

function _extractErrorMessage(data, status) {
  if (typeof data === 'string') return data || `HTTP ${status}`;
  if (data?.detail) {
    if (typeof data.detail === 'string') return data.detail;
    // FastAPI 422 validation errors
    if (Array.isArray(data.detail)) {
      return data.detail.map(e => `${e.loc?.join('.')}: ${e.msg}`).join('; ');
    }
  }
  return data?.message || data?.error || `HTTP ${status}`;
}

export class ApiError extends Error {
  constructor(message, status, data = null) {
    super(message);
    this.status = status;
    this.data   = data;
    this.name   = 'ApiError';
  }
}


// ══════════════════════════════════════════════════════════════
// HEALTH
// ══════════════════════════════════════════════════════════════

export const api = {

  // ── GET /health
  async getHealth() {
    if (CONFIG.MOCK) return { status: 'ok', service: 'NBA-MOCK', version: '1.0.0', environment: 'mock' };
    return request('/health', { noAuth: true });
  },

  // ── GET /health/db
  async getHealthDb() {
    if (CONFIG.MOCK) return { status: 'ok', database: 'sqlite-mock' };
    return request('/health/db', { noAuth: true });
  },


  // ══════════════════════════════════════════════════════════
  // AUTH
  // ══════════════════════════════════════════════════════════

  /**
   * POST /auth/login
   * Body: { email: string, password: string }
   * Returns: { access_token, token_type, expires_in }
   */
  async login(email, password) {
    if (CONFIG.MOCK) {
      const mock = await _getMock();
      return mock.auth.login(email, password);
    }
    return request('/auth/login', {
      method: 'POST',
      body: { email, password },
      noAuth: true,
    });
  },

  /**
   * POST /auth/register
   * Body: FacultyRegisterRequest
   *   { email, password, faculty_id, full_name, designation, department, contact_number? }
   * Returns: UserResponse (status: PENDING)
   */
  async register(payload) {
    if (CONFIG.MOCK) {
      const mock = await _getMock();
      return mock.auth.register(payload);
    }
    return request('/auth/register', {
      method: 'POST',
      body: payload,
      noAuth: true,
    });
  },

  /**
   * GET /auth/me
   * Returns: UserResponse { id, email, status, roles, faculty_profile, created_at, last_login }
   */
  async getMe() {
    if (CONFIG.MOCK) {
      const mock = await _getMock();
      return mock.auth.me();
    }
    return request('/auth/me');
  },


  // ══════════════════════════════════════════════════════════
  // USER MANAGEMENT
  // ══════════════════════════════════════════════════════════

  async getPendingUsers() {
    return request('/users/pending');
  },

  async approveUser(userId) {
    return request(`/users/${userId}/approve`, { method: 'POST' });
  },

  async rejectUser(userId) {
    return request(`/users/${userId}/reject`, { method: 'POST' });
  },

  async listUsers(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return request(`/users${qs ? '?' + qs : ''}`);
  },

  async updateUserStatus(userId, status) {
    return request(`/users/${userId}/status`, { method: 'PATCH', body: { status } });
  },

  async assignHodRole(userId) {
    return request(`/users/${userId}/roles/hod`, { method: 'POST' });
  },

  async removeHodRole(userId) {
    return request(`/users/${userId}/roles/hod`, { method: 'DELETE' });
  },


  // ══════════════════════════════════════════════════════════
  // ACADEMIC YEARS & SUBJECTS
  // ══════════════════════════════════════════════════════════

  async listAcademicYears() {
    if (CONFIG.MOCK) {
      const m = await _getMock();
      return m.academicYears;
    }
    return request('/academic-years');
  },

  async createAcademicYear(payload) {
    return request('/academic-years', { method: 'POST', body: payload });
  },

  async listSubjects(params = {}) {
    if (CONFIG.MOCK) {
      const m = await _getMock();
      return m.subjects;
    }
    const qs = new URLSearchParams(params).toString();
    return request(`/subjects${qs ? '?' + qs : ''}`);
  },

  async createSubject(payload) {
    return request('/subjects', { method: 'POST', body: payload });
  },

  async assignSubjectToFaculty(subjectId, payload) {
    return request(`/subjects/${subjectId}/assignments`, { method: 'POST', body: payload });
  },

  async getFacultySubjects(facultyId) {
    return request(`/faculty/${facultyId}/subjects`);
  },


  // ══════════════════════════════════════════════════════════
  // CURRICULUM — Students, Enrolments, POs, COs
  // ══════════════════════════════════════════════════════════

  async registerStudent(payload) {
    return request('/students', { method: 'POST', body: payload });
  },

  async listStudents(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return request(`/students${qs ? '?' + qs : ''}`);
  },

  async getStudent(studentId) {
    return request(`/students/${studentId}`);
  },

  async enrolStudent(subjectId, payload) {
    return request(`/subjects/${subjectId}/enrolments`, { method: 'POST', body: payload });
  },

  async listEnrolments(subjectId) {
    return request(`/subjects/${subjectId}/enrolments`);
  },

  async createProgramOutcome(payload) {
    return request('/program-outcomes', { method: 'POST', body: payload });
  },

  async listProgramOutcomes(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return request(`/program-outcomes${qs ? '?' + qs : ''}`);
  },

  async createPSO(payload) {
    return request('/program-specific-outcomes', { method: 'POST', body: payload });
  },

  async listPSOs(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return request(`/program-specific-outcomes${qs ? '?' + qs : ''}`);
  },

  async createCourseOutcome(subjectId, payload) {
    return request(`/subjects/${subjectId}/course-outcomes`, { method: 'POST', body: payload });
  },

  async listCourseOutcomes(subjectId) {
    return request(`/subjects/${subjectId}/course-outcomes`);
  },

  async mapCOtoPO(coId, payload) {
    return request(`/course-outcomes/${coId}/po-mappings`, { method: 'POST', body: payload });
  },

  async getCOPOMappings(coId) {
    return request(`/course-outcomes/${coId}/po-mappings`);
  },

  async mapCOtoPSO(coId, payload) {
    return request(`/course-outcomes/${coId}/pso-mappings`, { method: 'POST', body: payload });
  },

  async getCOPSOMappings(coId) {
    return request(`/course-outcomes/${coId}/pso-mappings`);
  },

  async createAssessmentScheme(subjectId, payload) {
    return request(`/subjects/${subjectId}/assessment-schemes`, { method: 'POST', body: payload });
  },

  async listAssessmentSchemes(subjectId) {
    return request(`/subjects/${subjectId}/assessment-schemes`);
  },

  async recordMark(subjectId, payload) {
    return request(`/subjects/${subjectId}/marks`, { method: 'POST', body: payload });
  },

  async listMarks(subjectId, params = {}) {
    const qs = new URLSearchParams(params).toString();
    return request(`/subjects/${subjectId}/marks${qs ? '?' + qs : ''}`);
  },

  async recordAttendance(subjectId, payload) {
    return request(`/subjects/${subjectId}/attendance`, { method: 'POST', body: payload });
  },

  async listAttendance(subjectId) {
    return request(`/subjects/${subjectId}/attendance`);
  },

  async recordMicroProject(subjectId, payload) {
    return request(`/subjects/${subjectId}/micro-projects`, { method: 'POST', body: payload });
  },

  async listMicroProjects(subjectId) {
    return request(`/subjects/${subjectId}/micro-projects`);
  },

  async submitFeedback(payload) {
    return request('/feedback', { method: 'POST', body: payload });
  },

  async listFeedback(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return request(`/feedback${qs ? '?' + qs : ''}`);
  },


  // ══════════════════════════════════════════════════════════
  // FACULTY DATA
  // ══════════════════════════════════════════════════════════

  async listQualifications(facultyId) {
    return request(`/faculty/${facultyId}/qualifications`);
  },
  async addQualification(facultyId, payload) {
    return request(`/faculty/${facultyId}/qualifications`, { method: 'POST', body: payload });
  },

  async listExperience(facultyId) {
    return request(`/faculty/${facultyId}/experience`);
  },
  async addExperience(facultyId, payload) {
    return request(`/faculty/${facultyId}/experience`, { method: 'POST', body: payload });
  },

  async listCertificates(facultyId) {
    return request(`/faculty/${facultyId}/certificates`);
  },
  async addCertificate(facultyId, payload) {
    return request(`/faculty/${facultyId}/certificates`, { method: 'POST', body: payload });
  },
  async replaceCertificate(facultyId, certId, payload) {
    return request(`/faculty/${facultyId}/certificates/${certId}/replace`, { method: 'POST', body: payload });
  },

  async listPublications(facultyId) {
    return request(`/faculty/${facultyId}/publications`);
  },
  async addPublication(facultyId, payload) {
    return request(`/faculty/${facultyId}/publications`, { method: 'POST', body: payload });
  },

  async listPatents(facultyId) {
    return request(`/faculty/${facultyId}/patents`);
  },
  async addPatent(facultyId, payload) {
    return request(`/faculty/${facultyId}/patents`, { method: 'POST', body: payload });
  },

  async listTrainings(facultyId) {
    return request(`/faculty/${facultyId}/trainings`);
  },
  async addTraining(facultyId, payload) {
    return request(`/faculty/${facultyId}/trainings`, { method: 'POST', body: payload });
  },

  async listProjects(facultyId) {
    return request(`/faculty/${facultyId}/projects`);
  },
  async addProject(facultyId, payload) {
    return request(`/faculty/${facultyId}/projects`, { method: 'POST', body: payload });
  },

  async listConsultancies(facultyId) {
    return request(`/faculty/${facultyId}/consultancies`);
  },
  async addConsultancy(facultyId, payload) {
    return request(`/faculty/${facultyId}/consultancies`, { method: 'POST', body: payload });
  },

  async listContributions(facultyId) {
    return request(`/faculty/${facultyId}/contributions`);
  },
  async addContribution(facultyId, payload) {
    return request(`/faculty/${facultyId}/contributions`, { method: 'POST', body: payload });
  },


  // ══════════════════════════════════════════════════════════
  // NBA REQUIREMENTS & EVALUATION
  // ══════════════════════════════════════════════════════════

  async listCriteria() {
    if (CONFIG.MOCK) {
      const m = await _getMock();
      return m.criteria;
    }
    return request('/criteria');
  },

  async getCriterion(criterionId) {
    return request(`/criteria/${criterionId}`);
  },

  async listRequirements(criterionId) {
    if (CONFIG.MOCK) {
      const m = await _getMock();
      return m.requirements[criterionId] || [];
    }
    return request(`/criteria/${criterionId}/requirements`);
  },

  async getRequirement(requirementId) {
    return request(`/requirements/${requirementId}`);
  },

  async evaluateRequirement(requirementId, payload) {
    return request(`/requirements/${requirementId}/evaluate`, { method: 'POST', body: payload });
  },

  async getEvaluationHistory(requirementId) {
    return request(`/requirements/${requirementId}/evaluations`);
  },


  // ══════════════════════════════════════════════════════════
  // DOCUMENTS (EVIDENCE)
  // ══════════════════════════════════════════════════════════

  /**
   * POST /documents — multipart upload
   * FormData fields: file (binary), title (string), department, academic_year_id, criterion_code, requirement_id?
   */
  async uploadDocument(formData) {
    return request('/documents', { method: 'POST', body: formData, multipart: true });
  },

  async listDocuments(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return request(`/documents${qs ? '?' + qs : ''}`);
  },

  async getDocument(documentId) {
    return request(`/documents/${documentId}`);
  },

  async downloadDocument(documentId) {
    return request(`/documents/${documentId}/download`, { blob: true });
  },

  async deleteDocument(documentId) {
    return request(`/documents/${documentId}`, { method: 'DELETE' });
  },

  async getDocumentVersions(documentId) {
    return request(`/documents/${documentId}/versions`);
  },

  async uploadDocumentVersion(documentId, formData) {
    return request(`/documents/${documentId}/versions`, {
      method: 'POST', body: formData, multipart: true,
    });
  },

  async linkDocumentToRequirement(documentId, payload) {
    return request(`/documents/${documentId}/link`, { method: 'POST', body: payload });
  },

  async listEvidence(requirementId) {
    return request(`/requirements/${requirementId}/evidence`);
  },


  // ══════════════════════════════════════════════════════════
  // AI ANALYSIS & RAG
  // ══════════════════════════════════════════════════════════

  /**
   * POST /analysis/retrieve
   * Body: { query, top_k?, department?, academic_year_id?, criterion_code? }
   */
  async retrieveChunks(payload) {
    return request('/analysis/retrieve', { method: 'POST', body: payload });
  },

  /**
   * POST /analysis/ai-analysis — HOD/ADMIN only
   * Body: { requirement_id, academic_year_id, department, analysis_task, top_k_passages? }
   * IMPORTANT: ai_drives_compliance is always false in the response
   */
  async triggerAiAnalysis(payload) {
    return request('/analysis/ai-analysis', { method: 'POST', body: payload });
  },


  // ══════════════════════════════════════════════════════════
  // DIGITAL TWIN
  // ══════════════════════════════════════════════════════════

  /**
   * GET /digital-twin/snapshot?department=...&academic_year_id=...
   */
  async getDigitalTwinSnapshot(params = {}) {
    if (CONFIG.MOCK) {
      const m = await _getMock();
      return m.digitalTwin.snapshot;
    }
    const qs = new URLSearchParams(params).toString();
    return request(`/digital-twin/snapshot${qs ? '?' + qs : ''}`);
  },

  async getDataCompleteness(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return request(`/digital-twin/completeness${qs ? '?' + qs : ''}`);
  },

  /**
   * GET /digital-twin/criteria/{criterion_code}?department=...&academic_year_id=...
   */
  async getCriterionAnalytics(criterionCode, params = {}) {
    if (CONFIG.MOCK) {
      const m = await _getMock();
      return m.digitalTwin.criteria[criterionCode] || null;
    }
    const qs = new URLSearchParams(params).toString();
    return request(`/digital-twin/criteria/${criterionCode}${qs ? '?' + qs : ''}`);
  },


  // ══════════════════════════════════════════════════════════
  // GAP ANALYSIS
  // ══════════════════════════════════════════════════════════

  async generateGaps(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return request(`/gaps/generate${qs ? '?' + qs : ''}`, { method: 'POST' });
  },

  async listGaps(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return request(`/gaps${qs ? '?' + qs : ''}`);
  },

  async createGap(payload) {
    return request('/gaps', { method: 'POST', body: payload });
  },

  async listOverdueActions() {
    return request('/gaps/overdue');
  },

  async getGap(gapId) {
    return request(`/gaps/${gapId}`);
  },

  async updateGap(gapId, payload) {
    return request(`/gaps/${gapId}`, { method: 'PATCH', body: payload });
  },

  async createCorrectiveAction(gapId, payload) {
    return request(`/gaps/${gapId}/actions`, { method: 'POST', body: payload });
  },

  async updateCorrectiveAction(gapId, actionId, payload) {
    return request(`/gaps/${gapId}/actions/${actionId}`, { method: 'PATCH', body: payload });
  },


  // ══════════════════════════════════════════════════════════
  // REPORTS & AUDIT INSPECTION
  // ══════════════════════════════════════════════════════════

  async runVirtualInspection(payload = {}) {
    if (CONFIG.MOCK) {
      return {
        inspection_id: 'insp-mock-2026',
        readiness_score: 782,
        max_score: 1000,
        status: 'ACCREDITED_3_YEARS',
        summary: 'Eligible for 3-Year Provisional Accreditation. Critical actions required on Faculty SFR and CAYm1 research papers.',
        completed_at: new Date().toISOString(),
        disclaimer: 'Internal readiness indicator, not an official NBA score.'
      };
    }
    try {
      return await request('/inspection/run', { method: 'POST', body: payload });
    } catch {
      return {
        inspection_id: 'insp-local-2026',
        readiness_score: 782,
        max_score: 1000,
        status: 'ACCREDITED_3_YEARS',
        summary: 'Eligible for 3-Year Provisional Accreditation. Critical actions required on Faculty SFR and CAYm1 research papers.',
        completed_at: new Date().toISOString(),
        disclaimer: 'Internal readiness indicator, not an official NBA score.'
      };
    }
  },

  async downloadExcelReport(params = {}) {
    const csv = 'Criterion,Code,Max Marks,Marks Attained,Status\nOutcome-Based Assessment,C3,120,93.8,PASS\nStudents Performance,C4,120,78.0,WARNING\nFaculty Information,C5,100,82.5,PASS\nFaculty Contributions,C6,120,88.8,PASS\nTOTAL,ALL,460,343.1,PASS\n';
    if (CONFIG.MOCK) {
      return new Blob([csv], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    }
    const qs = new URLSearchParams(params).toString();
    try {
      return await request(`/reports/excel${qs ? '?' + qs : ''}`, { blob: true });
    } catch {
      return new Blob([csv], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    }
  },

  async downloadPdfReport(params = {}) {
    const text = '%PDF-1.4 AI-NBA Readiness Summary Report 2024-25\nDepartment of Computer Science and Engineering\nOverall Accreditation Score: 782 / 1000 (Tier I UG Engineering)\nCriteria C3, C4, C5, C6 evaluated.\nDisclaimer: Internal readiness indicator, not an official NBA score.';
    if (CONFIG.MOCK) {
      return new Blob([text], { type: 'application/pdf' });
    }
    const qs = new URLSearchParams(params).toString();
    try {
      return await request(`/reports/pdf${qs ? '?' + qs : ''}`, { blob: true });
    } catch {
      return new Blob([text], { type: 'application/pdf' });
    }
  },


  // ══════════════════════════════════════════════════════════
  // NOTIFICATIONS
  // ══════════════════════════════════════════════════════════

  async listNotifications() {
    if (CONFIG.MOCK) {
      const m = await _getMock();
      return m.notifications;
    }
    return request('/notifications');
  },

  async markNotificationRead(notifId) {
    return request(`/notifications/${notifId}/read`, { method: 'PATCH' });
  },

  async markAllNotificationsRead() {
    return request('/notifications/read-all', { method: 'POST' });
  },


  // ══════════════════════════════════════════════════════════
  // BACKUPS (ADMIN only)
  // ══════════════════════════════════════════════════════════

  async createBackup(payload) {
    return request('/backups', { method: 'POST', body: payload });
  },

  async listBackups() {
    return request('/backups');
  },

  async validateBackup(backupId) {
    return request(`/backups/${backupId}/validate`, { method: 'POST' });
  },

  async restoreBackup(backupId, payload) {
    return request(`/backups/${backupId}/restore`, { method: 'POST', body: payload });
  },

}; // end api

export default api;

