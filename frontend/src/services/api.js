import axios from 'axios';

// Detect API base URL. Fallback to localhost:5000 for standard local run, or root proxy for container setups
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 second timeout for Gemini processing
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const session = sessionStorage.getItem('civicmind_user');
  if (session) {
    const user = JSON.parse(session);
    if (user.role) config.headers['x-user-role'] = user.role;
    if (user.email) config.headers['x-user-email'] = user.email;
    if (user.department) config.headers['x-user-department'] = user.department;
    if (user.name) config.headers['x-user-name'] = user.name;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export const apiService = {
  /**
   * Submit citizen report (multi-part form data containing 'image', 'description', 'latitude', 'longitude', 'citizenEmail')
   */
  createIssue: async (formData) => {
    const response = await apiClient.post('/issues', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  /**
   * Fetch list of reported issues with filters
   */
  getIssues: async (params = {}) => {
    const response = await apiClient.get('/issues', { params });
    return response.data;
  },

  /**
   * Retrieve detail of a single issue
   */
  getIssueById: async (id) => {
    const response = await apiClient.get(`/issues/${id}`);
    return response.data;
  },

  /**
   * Update status of a reported issue (supports completion photo upload)
   */
  updateIssueStatus: async (id, status, note, worker, file = null) => {
    let payload;
    let headers = {};

    if (file) {
      payload = new FormData();
      payload.append('status', status);
      if (note) payload.append('note', note);
      if (worker) payload.append('worker', worker);
      payload.append('afterImage', file);
      headers['Content-Type'] = 'multipart/form-data';
    } else {
      payload = { status, note, worker };
    }

    const response = await apiClient.patch(`/issues/${id}/status`, payload, { headers });
    return response.data;
  },

  /**
   * Add comment to a ticket
   */
  addComment: async (id, author, text) => {
    const response = await apiClient.post(`/issues/${id}/comments`, { author, text });
    return response.data;
  },

  /**
   * Request materials list
   */
  requestMaterials: async (id, materials) => {
    const response = await apiClient.post(`/issues/${id}/materials`, { materials });
    return response.data;
  },

  /**
   * Reassign worker / department
   */
  reassignTicket: async (id, worker, department) => {
    const response = await apiClient.patch(`/issues/${id}/reassign`, { worker, department });
    return response.data;
  },

  /**
   * Escalate priority / severity
   */
  escalateTicket: async (id, priority, severity) => {
    const response = await apiClient.patch(`/issues/${id}/escalate`, { priority, severity });
    return response.data;
  },

  /**
   * Fetch daily AI sprint briefing report
   */
  getSprintSummary: async () => {
    const response = await apiClient.get('/dashboard/sprint-summary');
    return response.data;
  },

  /**
   * Fetch aggregated municipal dashboard metrics (MongoDB-only)
   */
  getDashboardStats: async () => {
    const response = await apiClient.get('/dashboard/stats');
    return response.data;
  },

  /**
   * On-demand AI insights (copilot + risk zones)
   */
  getDashboardAiInsights: async () => {
    const response = await apiClient.post('/dashboard/ai-insights');
    return response.data;
  },

  /**
   * Explicit batch priority recalculation (Agent 9)
   */
  recalculatePriorities: async () => {
    const response = await apiClient.post('/dashboard/recalculate-priorities');
    return response.data;
  },

  /**
   * Generate executive briefing report (Agent 11)
   */
  getExecutiveBriefing: async () => {
    const response = await apiClient.get('/dashboard/executive-briefing');
    return response.data;
  },

  /**
   * Fetch recent AI decision log entries
   */
  getAiDecisions: async () => {
    const response = await apiClient.get('/dashboard/ai-decisions');
    return response.data;
  },

  /**
   * Fetch recent administrative audit logs (Admin only)
   */
  getAuditLogs: async () => {
    const response = await apiClient.get('/dashboard/audit-logs');
    return response.data;
  },

  /**
   * Override AI decisions for a ticket (Admin only)
   */
  overrideAi: async (ticketId, overrideData) => {
    const response = await apiClient.post(`/dashboard/override-ai/${ticketId}`, overrideData);
    return response.data;
  },

  /**
   * Fetch system health status
   */
  getSystemHealth: async () => {
    const response = await apiClient.get('/dashboard/health');
    return response.data;
  },

  /**
   * Fetch live operations feed
   */
  getLiveFeed: async () => {
    const response = await apiClient.get('/dashboard/feed');
    return response.data;
  }
};

export default apiClient;
