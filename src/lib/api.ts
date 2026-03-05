/**
 * Mobile API Client
 * Handles all API requests to the backend
 */
import { authService } from './auth';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';

interface ApiResponse<T = any> {
  success?: boolean;
  data?: T;
  message?: string;
  error?: string;
}

class ApiClient {
  private getHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      ...authService.getAuthHeader(),
    };
  }

  async get<T = any>(endpoint: string): Promise<T> {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `Request failed with status ${response.status}`);
    }
    
    return response.json();
  }

  async post<T = any>(endpoint: string, body?: any): Promise<T> {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `Request failed with status ${response.status}`);
    }
    
    return response.json();
  }

  async put<T = any>(endpoint: string, body?: any): Promise<T> {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `Request failed with status ${response.status}`);
    }
    
    return response.json();
  }

  async delete<T = any>(endpoint: string): Promise<T> {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `Request failed with status ${response.status}`);
    }
    
    return response.json();
  }

  // Dashboard
  async getDashboard() {
    return this.get('/api/atx/v1/mobile/portal/dashboard');
  }

  // Assets
  async getMyAssets() {
    return this.get('/api/atx/v1/mobile/portal/my-assets');
  }

  async getAssetTickets(params?: { page?: number; limit?: number; status?: string }) {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.status) query.set('status', params.status);
    return this.get(`/api/atx/v1/desktop/assets/tickets/?${query.toString()}`);
  }

  async getAssetTicket(id: number) {
    return this.get(`/api/atx/v1/desktop/assets/tickets/${id}/`);
  }

  async createAssetTicket(data: { deviceID: number; title: string; description: string; priority: string }) {
    return this.post('/api/atx/v1/desktop/assets/tickets', data);
  }

  async addTicketComment(ticketId: number, message: string) {
    return this.post(`/api/atx/v1/desktop/assets/tickets/${ticketId}/comment/`, { message });
  }

  // Leaves
  async getLeaveBalance() {
    return this.get('/api/atx/v1/mobile/leaves/balance');
  }

  async getMyLeaves(params?: { status?: string; limit?: number }) {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.limit) query.set('limit', String(params.limit));
    return this.get(`/api/atx/v1/mobile/leaves/me?${query.toString()}`);
  }

  async createLeaveRequest(data: { type: string; startDate: string; endDate: string; reason: string }) {
    return this.post('/api/atx/v1/desktop/leaves', data);
  }

  // Org Chart
  async getOrgChart() {
    return this.get('/api/atx/v1/mobile/org-chart/data');
  }

  // Notifications
  async getNotifications(params?: { page?: number; limit?: number; status?: string }) {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.status) query.set('status', params.status || 'all');
    return this.get(`/api/atx/v1/mobile/notifications?${query.toString()}`);
  }

  async markNotificationRead(id: number) {
    return this.post(`/api/atx/v1/mobile/notifications/${id}/read`);
  }

  async markAllNotificationsRead() {
    return this.post('/api/atx/v1/mobile/notifications/mark-all-read');
  }

  async registerPushToken(token: string, platform: string) {
    return this.post('/api/atx/v1/mobile/notifications/register-push-token', { token, platform });
  }

  // Direct Reports (for managers)
  async getDirectReports() {
    return this.get('/api/atx/v1/mobile/portal/direct-reports');
  }

  async getEmployeeDetails(id: number) {
    return this.get(`/api/atx/v1/mobile/portal/employee/${id}/details`);
  }

  // Services
  async getServices() {
    return this.get('/api/atx/v1/desktop/services/');
  }

  async getMyServiceTickets(params?: { page?: number; limit?: number; status?: string }) {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.status && params.status !== 'all') {
      query.set('status', params.status);
    } else {
      query.set('status', 'all');
    }
    const queryStr = query.toString();
    return this.get(`/api/atx/v1/desktop/services/tickets/me${queryStr ? '?' + queryStr : ''}`);
  }

  async createServiceTicket(data: { serviceID: number; title: string; description: string; priority?: string }) {
    return this.post('/api/atx/v1/desktop/services/tickets', data);
  }

  // Announcements
  async getAnnouncements() {
    return this.get('/api/atx/v1/mobile/announcements');
  }

  // Profile
  async getProfile() {
    return this.get('/api/atx/v1/mobile/portal/dashboard');
  }

  // Calendar Events (use desktop - handles missing calendarEvent model)
  async getCalendarEvents(params?: { month?: number; year?: number }) {
    const query = new URLSearchParams();
    if (params?.month !== undefined) query.set('month', String(params.month));
    if (params?.year !== undefined) query.set('year', String(params.year));
    return this.get(`/api/atx/v1/desktop/portal/calendar/events?${query.toString()}`);
  }

  async createCalendarEvent(data: { 
    title: string; 
    type: string; 
    date: string; 
    time?: string; 
    duration?: number; 
    location?: string; 
    description?: string 
  }) {
    return this.post('/api/atx/v1/mobile/calendar/events', data);
  }

  // Daily Check-in (portal - same as desktop)
  async getDailyCheckInToday() {
    return this.get('/api/atx/v1/portal/daily-checkin/today');
  }

  async getDailyCheckInQuestions() {
    return this.get('/api/atx/v1/portal/daily-checkin/questions');
  }

  async submitDailyCheckIn(responses: Record<string, string | number | null>) {
    return this.post('/api/atx/v1/portal/daily-checkin/submit', { responses });
  }

  // Attendance (use desktop - handles missing attendance model)
  async getAttendance(params?: { month?: number; year?: number }) {
    const query = new URLSearchParams();
    if (params?.month !== undefined) query.set('month', String(params.month));
    if (params?.year !== undefined) query.set('year', String(params.year));
    return this.get(`/api/atx/v1/desktop/portal/calendar/attendance?${query.toString()}`);
  }
}

export const api = new ApiClient();
export default api;
