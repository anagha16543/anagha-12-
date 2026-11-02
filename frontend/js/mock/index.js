/**
 * mock/index.js — Mock API data (same shapes as real backend)
 * Used when CONFIG.MOCK = true
 */

const MOCK_TOKEN = 'mock_jwt_token_admin_2026';

const MOCK_USERS = {
  'admin@college.edu': {
    id: 'user-001',
    email: 'admin@college.edu',
    status: 'ACTIVE',
    roles: ['ADMIN', 'HOD', 'FACULTY'],
    faculty_profile: {
      id: 'fp-001',
      faculty_id: 'FAC001',
      full_name: 'Dr. Priya Nair',
      designation: 'Professor & Head',
      department: 'Computer Science and Engineering',
    },
    created_at: '2025-01-01T00:00:00Z',
    last_login: new Date().toISOString(),
  },
  'hod@college.edu': {
    id: 'user-002',
    email: 'hod@college.edu',
    status: 'ACTIVE',
    roles: ['HOD', 'FACULTY'],
    faculty_profile: {
      id: 'fp-002',
      faculty_id: 'FAC002',
      full_name: 'Dr. Rajesh Kumar',
      designation: 'Associate Professor',
      department: 'Computer Science and Engineering',
    },
    created_at: '2025-01-15T00:00:00Z',
    last_login: new Date().toISOString(),
  },
  'faculty@college.edu': {
    id: 'user-003',
    email: 'faculty@college.edu',
    status: 'ACTIVE',
    roles: ['FACULTY'],
    faculty_profile: {
      id: 'fp-003',
      faculty_id: 'FAC003',
      full_name: 'Ms. Anitha Sharma',
      designation: 'Assistant Professor',
      department: 'Computer Science and Engineering',
    },
    created_at: '2025-02-01T00:00:00Z',
    last_login: new Date().toISOString(),
  },
};

let _activeUser = MOCK_USERS['admin@college.edu'];

const mockData = {

  // ── Auth ──────────────────────────────────────────────────
  auth: {
    login(email, password) {
      const user = MOCK_USERS[email];
      if (!user || password !== 'password123') {
        return Promise.reject({ message: 'Invalid email or password.', status: 401 });
      }
      if (user.status === 'PENDING') {
        return Promise.reject({
          message: 'Account is pending approval by an HOD or Administrator.',
          status: 403,
        });
      }
      _activeUser = user;
      return Promise.resolve({ access_token: MOCK_TOKEN, token_type: 'bearer', expires_in: 28800 });
    },

    me() {
      return Promise.resolve(_activeUser);
    },

    register(payload) {
      return Promise.resolve({
        id: 'user-new',
        email: payload.email,
        status: 'PENDING',
        roles: [],
        faculty_profile: {
          id: 'fp-new',
          faculty_id: payload.faculty_id,
          full_name: payload.full_name,
          designation: payload.designation,
          department: payload.department,
        },
        created_at: new Date().toISOString(),
      });
    },
  },

  // ── Academic Years ────────────────────────────────────────
  academicYears: [
    { id: 'ay-2024', name: '2024-25', start_date: '2024-06-01', end_date: '2025-05-31', is_active: true },
    { id: 'ay-2023', name: '2023-24', start_date: '2023-06-01', end_date: '2024-05-31', is_active: false },
    { id: 'ay-2022', name: '2022-23', start_date: '2022-06-01', end_date: '2023-05-31', is_active: false },
  ],

  // ── Subjects ──────────────────────────────────────────────
  subjects: [
    { id: 'sub-001', code: 'CS301', name: 'Data Structures', semester: 3, department: 'Computer Science and Engineering', credits: 4, academic_year_id: 'ay-2024' },
    { id: 'sub-002', code: 'CS302', name: 'Design & Analysis of Algorithms', semester: 3, department: 'Computer Science and Engineering', credits: 4, academic_year_id: 'ay-2024' },
    { id: 'sub-003', code: 'CS401', name: 'Operating Systems', semester: 4, department: 'Computer Science and Engineering', credits: 4, academic_year_id: 'ay-2024' },
    { id: 'sub-004', code: 'CS402', name: 'Database Management Systems', semester: 4, department: 'Computer Science and Engineering', credits: 4, academic_year_id: 'ay-2024' },
    { id: 'sub-005', code: 'CS501', name: 'Machine Learning', semester: 5, department: 'Computer Science and Engineering', credits: 4, academic_year_id: 'ay-2024' },
  ],

  // ── Criteria ──────────────────────────────────────────────
  criteria: [
    { id: 'c3', code: 'C3', name: 'Outcome-Based Assessment', max_marks: 120, description: 'CO-PO attainment, continuous assessment, lab conduct, projects, SDG.' },
    { id: 'c4', code: 'C4', name: "Students' Performance", max_marks: 120, description: 'Enrolment ratio, success rate, placement, professional activities.' },
    { id: 'c5', code: 'C5', name: 'Faculty Information', max_marks: 100, description: 'SFR, FQI, cadre, retention.' },
    { id: 'c6', code: 'C6', name: 'Faculty Contributions', max_marks: 120, description: 'Professional development, R&D, publications, patents.' },
  ],

  // ── Requirements ──────────────────────────────────────────
  requirements: {
    'c3': [
      { id: 'req-c3-1', code: 'C3.1', title: 'Continuous Assessment', description: 'Quality of continuous assessment process', max_score: 10, criterion_id: 'c3' },
      { id: 'req-c3-2', code: 'C3.2', title: 'SEE Question Paper', description: 'Semester-end exam question paper evaluation', max_score: 10, criterion_id: 'c3' },
      { id: 'req-c3-3', code: 'C3.3', title: 'Lab/Workshop Conduct', description: 'Quality of laboratory and workshop sessions', max_score: 10, criterion_id: 'c3' },
      { id: 'req-c3-4', code: 'C3.4', title: 'Industrial Training', description: 'Industrial training and internship', max_score: 10, criterion_id: 'c3' },
      { id: 'req-c3-5', code: 'C3.5', title: 'Projects Evaluation', description: 'Project-based learning evaluation', max_score: 20, criterion_id: 'c3' },
      { id: 'req-c3-6', code: 'C3.6', title: 'Sustainable Development Goals', description: 'SDG integration in curriculum', max_score: 10, criterion_id: 'c3' },
      { id: 'req-c3-7', code: 'C3.7', title: 'CO Attainment', description: 'Direct and indirect CO attainment calculation', max_score: 25, criterion_id: 'c3' },
      { id: 'req-c3-8', code: 'C3.8', title: 'PO/PSO Attainment', description: 'Program Outcome and PSO attainment', max_score: 25, criterion_id: 'c3' },
    ],
    'c5': [
      { id: 'req-c5-1', code: 'C5.1', title: 'Student-Faculty Ratio', description: 'SFR calculation and evaluation', max_score: 30, criterion_id: 'c5' },
      { id: 'req-c5-2', code: 'C5.2', title: 'Faculty Qualification Index', description: 'FQI based on qualifications', max_score: 25, criterion_id: 'c5' },
      { id: 'req-c5-3', code: 'C5.3', title: 'Faculty Cadre Proportion', description: 'Distribution of faculty by cadre', max_score: 25, criterion_id: 'c5' },
      { id: 'req-c5-4', code: 'C5.4', title: 'Visiting Faculty', description: 'Visiting faculty provision ≥50 hrs/yr', max_score: 10, criterion_id: 'c5' },
      { id: 'req-c5-5', code: 'C5.5', title: 'Faculty Retention', description: 'Faculty retention rate', max_score: 10, criterion_id: 'c5' },
    ],
    'c6': [
      { id: 'req-c6-1', code: 'C6.1', title: 'Professional Development', description: 'FDPs, MOOCs, memberships, industry training', max_score: 60, criterion_id: 'c6' },
      { id: 'req-c6-2', code: 'C6.2', title: 'R&D Contributions', description: 'Publications, patents, projects, consultancies', max_score: 60, criterion_id: 'c6' },
    ],
  },

  // ── Digital Twin ──────────────────────────────────────────
  digitalTwin: {
    snapshot: {
      department: 'Computer Science and Engineering',
      academic_year: '2024-25',
      overall_readiness_pct: 74,
      total_marks_attained: 326,
      total_marks_possible: 460,
      criteria: [
        { code: 'C3', name: 'Outcome-Based Assessment', readiness_pct: 78, pass_count: 5, warning_count: 2, fail_count: 1 },
        { code: 'C4', name: "Students' Performance", readiness_pct: 65, pass_count: 3, warning_count: 3, fail_count: 1 },
        { code: 'C5', name: 'Faculty Information', readiness_pct: 82, pass_count: 4, warning_count: 1, fail_count: 0 },
        { code: 'C6', name: 'Faculty Contributions', readiness_pct: 71, pass_count: 1, warning_count: 1, fail_count: 0 },
      ],
    },
    criteria: {
      C3: { code: 'C3', name: 'Outcome-Based Assessment', readiness_pct: 78, pass_count: 5, warning_count: 2, fail_count: 1, marks_attained: 89, max_marks: 120 },
      C4: { code: 'C4', name: "Students' Performance", readiness_pct: 65, pass_count: 3, warning_count: 3, fail_count: 1, marks_attained: 73, max_marks: 120 },
      C5: { code: 'C5', name: 'Faculty Information', readiness_pct: 82, pass_count: 4, warning_count: 1, fail_count: 0, marks_attained: 81, max_marks: 100 },
      C6: { code: 'C6', name: 'Faculty Contributions', readiness_pct: 71, pass_count: 1, warning_count: 1, fail_count: 0, marks_attained: 83, max_marks: 120 },
    },
  },

  // ── Notifications ─────────────────────────────────────────
  notifications: [
    { id: 'n1', title: 'C3.7 Evaluation Ready', message: 'CO attainment data is complete. Run evaluation.', is_read: false, created_at: new Date(Date.now()-3600000).toISOString() },
    { id: 'n2', title: 'Gap Detected: Faculty SFR', message: 'Student-Faculty Ratio is at WARNING threshold (19.8)', is_read: false, created_at: new Date(Date.now()-86400000).toISOString() },
    { id: 'n3', title: 'Document Uploaded', message: 'NBA compliance report v2.0 uploaded by Dr. Rajesh Kumar', is_read: true, created_at: new Date(Date.now()-172800000).toISOString() },
  ],

};

export default mockData;

