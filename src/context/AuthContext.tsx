import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Platform } from 'react-native';
import { authService } from '../lib/auth';

interface User {
  name?: string;
  email?: string;
  role?: string;
}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  loading: boolean;
}

interface AuthContextType extends AuthState {
  login: (provider: string, email: string | null, onStatusChange?: (status: string) => void) => Promise<any>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    token: null,
    loading: true,
  });

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        await authService.loadStored();
        if (!mounted) return;
        const valid = await authService.verifyToken();
        if (!mounted) return;
        setState({
          isAuthenticated: !!valid?.valid,
          user: authService.getUser(),
          token: authService.getToken(),
          loading: false,
        });
        // Register push token when app opens with existing session
        if (valid?.valid && Platform.OS !== 'web') {
          (async () => {
            try {
              const { registerForPushNotificationsAsync } = await import('../lib/pushNotifications');
              const pushToken = await registerForPushNotificationsAsync();
              if (pushToken) {
                const { api } = await import('../lib/api');
                await api.registerPushToken(pushToken, Platform.OS);
              }
            } catch (e) {
              console.warn('Push registration failed:', e?.message);
            }
          })();
        }
      } catch (e) {
        if (mounted) {
          setState((s) => ({ ...s, loading: false, isAuthenticated: false }));
        }
      }
    }

    const t = setTimeout(() => {
      setState((s) => (s.loading ? { ...s, loading: false } : s));
    }, 5000);

    const unsubscribe = authService.onAuthChange(({ isAuthenticated, user, token }: { isAuthenticated: boolean; user: User | null; token: string | null }) => {
      console.log('Auth state changed:', { isAuthenticated, user: user?.email });
      if (mounted) {
        setState({ isAuthenticated, user, token, loading: false });
      }
    });

    init();

    return () => {
      mounted = false;
      clearTimeout(t);
      unsubscribe();
    };
  }, []);

  const login = async (provider: string, email: string | null, onStatusChange?: (status: string) => void) => {
    return authService.login(provider, email, onStatusChange);
  };

  const logout = async () => {
    await authService.logout();
    setState((s) => ({ ...s, isAuthenticated: false, user: null, token: null }));
  };

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
