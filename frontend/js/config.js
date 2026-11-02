/* js/config.js — Central Configuration */

export const CONFIG = {
  /** FastAPI backend base URL — never change to port 8001 */
  API_BASE: 'http://localhost:8000/api/v1',

  /** localStorage key for the JWT access token */
  TOKEN_KEY: 'nba_access_token',

  /** User profile cache key */
  USER_KEY: 'nba_user_profile',

  /**
   * MOCK mode: when true the API layer returns data from /js/mock/
   * instead of hitting the real backend. Set to false for live backend testing.
   */
  MOCK: false,

  /** Health-check poll interval (ms) */
  HEALTH_POLL_MS: 30_000,

  /** Request timeout (ms) */
  REQUEST_TIMEOUT_MS: 15_000,

  /** Toast auto-dismiss duration (ms) */
  TOAST_DURATION_MS: 4_500,

  /** Default department filter */
  DEFAULT_DEPARTMENT: 'Computer Science and Engineering',

  /** Available roles in hierarchy order (highest first) */
  ROLES: ['ADMIN', 'HOD', 'FACULTY'],

  /** Criterion codes the frontend handles */
  CRITERIA: ['C3', 'C4', 'C5', 'C6'],

  /** Status enum values (matches backend exactly) */
  STATUS: {
    PASS:                    'PASS',
    WARNING:                 'WARNING',
    FAIL:                    'FAIL',
    NOT_APPLICABLE:          'NOT_APPLICABLE',
    NEEDS_RULE_CLARIFICATION:'NEEDS_RULE_CLARIFICATION',
  },

  /** Default redirect after login per role */
  DEFAULT_REDIRECT: {
    ADMIN:   '/dashboards/admin.html',
    HOD:     '/dashboards/reports.html',
    FACULTY: '/dashboards/c3.html',
  },
};

export default CONFIG;

