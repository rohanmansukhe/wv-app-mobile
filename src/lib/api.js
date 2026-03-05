/**
 * API client for Workverge Mobile
 * Uses auth token from authService
 */
import { authService } from './auth';

const getBaseUrl = () => authService.getApiUrl() || process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';

async function request(path, options = {}) {
  const url = `${getBaseUrl()}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...authService.getAuthHeader(),
    ...options.headers,
  };
  const res = await fetch(url, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || data.error || `Request failed: ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export const api = {
  get: (path) => request(path, { method: 'GET' }),
  post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) }),
  put: (path, body) => request(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (path) => request(path, { method: 'DELETE' }),

  portal: {
    dashboard: () => api.get('/api/atx/v1/mobile/portal/dashboard'),
    myAssets: () => api.get('/api/atx/v1/mobile/portal/my-assets'),
    directReports: () => api.get('/api/atx/v1/mobile/portal/direct-reports'),
    employeeDetails: (id) => api.get(`/api/atx/v1/mobile/portal/employee/${id}/details`),
  },
  orgChart: () => api.get('/api/atx/v1/mobile/org-chart/data'),
};

export default api;
