import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  getOrCreateSocket,
  subscribeSocket,
  unsubscribeSocket,
  onNotificationCallback,
  onCountUpdate,
} from './socketManager';
import { api } from '../api';

const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL || '';
const POLL_FALLBACK_INTERVAL = 30000; // 30s when socket disconnected

/**
 * Hook for real-time notifications via Socket.IO
 * Uses singleton socket to prevent duplicate connections
 * On notification: fetches fresh count from API and broadcasts once
 */
export function useNotificationsSocket() {
  const { isAuthenticated, user, token } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [urgentCount, setUrgentCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const mountedRef = useRef(true);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await api.getNotifications({ status: 'unread', limit: 1 });
      if (response.success && mountedRef.current) {
        const count = response.unreadCount ?? 0;
        setUnreadCount(count);
        setUrgentCount(response.urgentCount ?? 0);
        return { unreadCount: count, urgentCount: response.urgentCount ?? 0 };
      }
    } catch (error) {
      console.error('[useNotificationsSocket] Error fetching unread count:', error);
    }
    return null;
  }, []);

  const onNotification = useCallback((callback: (notification: any) => void) => {
    return onNotificationCallback(callback);
  }, []);

  // When a notification is received via socket, refresh the badge count
  useEffect(() => {
    if (!isAuthenticated) return;
    const unsub = onNotificationCallback(() => {
      if (mountedRef.current) fetchUnreadCount();
    });
    return unsub;
  }, [isAuthenticated, fetchUnreadCount]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Initial fetch
  useEffect(() => {
    if (!isAuthenticated) return;
    fetchUnreadCount();
  }, [isAuthenticated, user?.id, fetchUnreadCount]);

  // Socket connection - singleton
  useEffect(() => {
    if (!isAuthenticated || !user || !token || !SOCKET_URL) {
      return;
    }

    let pollInterval: ReturnType<typeof setInterval> | null = null;
    let unsubCount = () => {};
    let didSubscribe = false;

    const runConnect = async () => {
      try {
        if (!token || !mountedRef.current) return;

        const refreshAndBroadcast = (broadcast: (u: number, urg: number) => void) => {
          fetchUnreadCount().then((countData) => {
            if (countData && broadcast) {
              broadcast(countData.unreadCount ?? 0, countData.urgentCount ?? 0);
            }
          });
        };

        const socket = getOrCreateSocket(token, refreshAndBroadcast);
        if (!socket) return;

        subscribeSocket();
        didSubscribe = true;

        unsubCount = onCountUpdate((payload) => {
          if (!mountedRef.current) return;
          if (payload?.unreadCount != null) {
            setUnreadCount(payload.unreadCount);
            setUrgentCount(payload.urgentCount ?? 0);
          }
        });

        socket.on('connect', () => {
          if (mountedRef.current) setIsConnected(true);
        });

        socket.on('disconnect', () => {
          if (mountedRef.current) setIsConnected(false);
        });

        pollInterval = setInterval(() => {
          if (!socket?.connected) {
            fetchUnreadCount();
          }
        }, POLL_FALLBACK_INTERVAL);
      } catch (err) {
        console.error('[useNotificationsSocket] Socket connect error:', err);
      }
    };

    runConnect();

    return () => {
      if (pollInterval) clearInterval(pollInterval);
      unsubCount();
      if (didSubscribe) unsubscribeSocket();
      setIsConnected(false);
    };
  }, [isAuthenticated, user?.id, token, fetchUnreadCount]);

  // Fallback polling when socket URL not configured
  useEffect(() => {
    if (!SOCKET_URL && isAuthenticated) {
      const interval = setInterval(fetchUnreadCount, POLL_FALLBACK_INTERVAL);
      return () => clearInterval(interval);
    }
  }, [SOCKET_URL, isAuthenticated, fetchUnreadCount]);

  return {
    unreadCount,
    urgentCount,
    isConnected,
    onNotification,
    refreshCount: fetchUnreadCount,
  };
}
