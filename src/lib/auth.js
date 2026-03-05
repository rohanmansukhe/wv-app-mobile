/**
 * Mobile Auth Service
 * Uses in-app browser for authentication flow
 */
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';
const POLL_INTERVAL = 2000;
const MAX_POLL_ATTEMPTS = 150;

const TOKEN_KEY = 'mobile_token';
const USER_KEY = 'mobile_user';

// Storage abstraction - SecureStore on native, localStorage on web
const storage = {
  async getItem(key) {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    }
    const SecureStore = require('expo-secure-store');
    return SecureStore.getItemAsync(key);
  },
  async setItem(key, value) {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
      return;
    }
    const SecureStore = require('expo-secure-store');
    return SecureStore.setItemAsync(key, value);
  },
  async removeItem(key) {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
      return;
    }
    const SecureStore = require('expo-secure-store');
    return SecureStore.deleteItemAsync(key);
  },
};

class AuthService {
  constructor() {
    this.token = null;
    this.user = null;
    this.pollInterval = null;
    this.listeners = new Set();
  }

  async loadStored() {
    try {
      const [token, userJson] = await Promise.all([
        storage.getItem(TOKEN_KEY),
        storage.getItem(USER_KEY),
      ]);
      this.token = token;
      if (userJson) {
        this.user = JSON.parse(userJson);
      }
    } catch (e) {
      console.warn('Auth loadStored error:', e?.message);
    }
  }

  onAuthChange(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notifyListeners() {
    const state = { isAuthenticated: this.isAuthenticated(), user: this.user, token: this.token };
    this.listeners.forEach((cb) => cb(state));
  }

  isAuthenticated() {
    return !!this.token && !!this.user;
  }

  getToken() {
    return this.token;
  }

  getUser() {
    return this.user;
  }

  async initiateLogin(provider, email = null) {
    const url = `${API_URL}/api/atx/v1/desktop/auth/initiate/`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider,
        email,
        baseUrl: API_URL.replace(/\/$/, ''),
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to initiate login');
    return { sessionId: data.sessionId, authUrl: data.authUrl };
  }

  async openBrowser(authUrl) {
    if (Platform.OS === 'web') {
      // On web, open in a new tab/window
      window.open(authUrl, '_blank');
      return;
    }
    // Use in-app browser on native
    try {
      await WebBrowser.openBrowserAsync(authUrl, {
        dismissButtonStyle: 'close',
        presentationStyle: 'pageSheet',
        toolbarColor: Platform.OS === 'android' ? '#6366f1' : undefined,
        controlsColor: '#6366f1',
      });
    } catch (e) {
      console.warn('Browser open error:', e?.message);
    }
  }

  async collectDeviceInfo() {
    return {
      os: Platform.OS,
      arch: 'unknown',
      platform: Platform.OS,
      hostname: Platform.OS === 'ios' ? 'iPhone' : Platform.OS === 'android' ? 'Android' : 'Web',
      appVersion: '1.0.0',
    };
  }

  async pollForAuth(sessionId, onStatusChange = null) {
    return new Promise((resolve, reject) => {
      let attempts = 0;

      const poll = async () => {
        attempts++;
        if (attempts > MAX_POLL_ATTEMPTS) {
          this.cancelPolling();
          reject(new Error('Authentication timeout. Please try again.'));
          return;
        }

        try {
          const url = `${API_URL}/api/atx/v1/desktop/auth/poll/?sessionId=${sessionId}`;
          const res = await fetch(url);
          const data = await res.json();

          if (onStatusChange) onStatusChange(data.status, attempts);

          switch (data.status) {
            case 'completed':
              this.cancelPolling();
              // Close the browser if still open (native only)
              if (Platform.OS !== 'web') {
                try {
                  await WebBrowser.dismissBrowser();
                } catch (e) {
                  // Browser may already be closed
                }
              }
              // Register device
              try {
                const deviceInfo = await this.collectDeviceInfo();
                await fetch(`${API_URL}/api/atx/v1/desktop/auth/register/`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ sessionId, deviceInfo, userAgent: 'Workverge-Mobile' }),
                });
              } catch (regErr) {
                console.warn('Device register failed:', regErr?.message);
              }
              this.token = data.token;
              this.user = data.user;
              console.log('Auth completed, storing token and notifying listeners');
              await storage.setItem(TOKEN_KEY, data.token);
              await storage.setItem(USER_KEY, JSON.stringify(data.user));
              console.log('Token stored, calling notifyListeners, listeners count:', this.listeners.size);
              this.notifyListeners();

              // Register push token for native notifications (fire-and-forget)
              if (Platform.OS !== 'web') {
                (async () => {
                  try {
                    const { registerForPushNotificationsAsync } = await import('./pushNotifications');
                    const pushToken = await registerForPushNotificationsAsync();
                    if (pushToken) {
                      const { api } = await import('./api');
                      await api.registerPushToken(pushToken, Platform.OS);
                    }
                  } catch (e) {
                    console.warn('Push registration failed:', e?.message);
                  }
                })();
              }

              resolve({ token: data.token, user: data.user });
              break;
            case 'failed':
              this.cancelPolling();
              reject(new Error(data.error || 'Authentication failed'));
              break;
            case 'expired':
            case 'not_found':
              this.cancelPolling();
              reject(new Error('Session expired. Please try again.'));
              break;
            default:
              break;
          }
        } catch (err) {
          console.warn('Poll error:', err?.message);
        }
      };

      this.pollInterval = setInterval(poll, POLL_INTERVAL);
      poll();
    });
  }

  cancelPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  async login(provider, email = null, onStatusChange = null) {
    const { sessionId, authUrl } = await this.initiateLogin(provider, email);
    if (onStatusChange) onStatusChange('opening_browser');
    
    // Start polling BEFORE opening browser so we catch the completion
    const pollPromise = this.pollForAuth(sessionId, onStatusChange);
    
    // Open browser (non-blocking - user will close it after login)
    if (onStatusChange) onStatusChange('waiting_for_auth');
    await this.openBrowser(authUrl);
    
    // Wait for poll to complete
    const result = await pollPromise;
    if (onStatusChange) onStatusChange('completed');
    return result;
  }

  async verifyToken() {
    if (!this.token) return { valid: false, message: 'No token' };
    try {
      const res = await fetch(`${API_URL}/api/atx/v1/mobile/auth/verify`, {
        headers: { Authorization: `Bearer ${this.token}` },
      });
      const data = await res.json();
      if (data.valid) {
        this.user = data.user;
        await storage.setItem(USER_KEY, JSON.stringify(data.user));
        if (data.token && data.refreshed) {
          this.token = data.token;
          await storage.setItem(TOKEN_KEY, data.token);
        }
        this.notifyListeners();
        return { valid: true, user: data.user };
      }
      if (data.expired || data.invalidated) await this.logout();
      return { valid: false, message: data.message };
    } catch (e) {
      return { valid: false, networkError: true, message: 'Network error' };
    }
  }

  async logout() {
    this.token = null;
    this.user = null;
    await storage.removeItem(TOKEN_KEY);
    await storage.removeItem(USER_KEY);
    this.cancelPolling();
    this.notifyListeners();
  }

  getAuthHeader() {
    return this.token ? { Authorization: `Bearer ${this.token}` } : {};
  }

  getApiUrl() {
    return API_URL;
  }
}

export const authService = new AuthService();
export default authService;
