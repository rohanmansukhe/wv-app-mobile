/**
 * Singleton Socket.IO connection manager for mobile
 * Prevents multiple connections and duplicate count increments
 */
import { io } from 'socket.io-client';

const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL || '';

let socketInstance: ReturnType<typeof io> | null = null;
let subscriberCount = 0;
let currentToken: string | null = null;

const notificationCallbacks = new Set<(notification: any) => void>();
const countListeners = new Set<(payload: { unreadCount: number; urgentCount: number }) => void>();

function broadcastCount(unreadCount: number, urgentCount: number) {
  countListeners.forEach((cb) => cb({ unreadCount, urgentCount }));
}

type BroadcastFn = (unreadCount: number, urgentCount: number) => void;

function setupSocketListeners(
  socket: ReturnType<typeof io>,
  onNotificationOrConnect?: (broadcast: BroadcastFn) => void
) {
  socket.off('connect');
  socket.off('disconnect');
  socket.off('notification');
  socket.off('unread-count');

  const refreshAndBroadcast = () => {
    onNotificationOrConnect?.(broadcastCount);
  };

  socket.on('connect', refreshAndBroadcast);

  socket.on('disconnect', () => {});

  socket.on('notification', (notification: any) => {
    notificationCallbacks.forEach((cb) => cb(notification));
    refreshAndBroadcast();
  });

  socket.on('unread-count', (payload: { unreadCount?: number; urgentCount?: number }) => {
    if (typeof payload?.unreadCount === 'number') {
      broadcastCount(payload.unreadCount, payload.urgentCount ?? 0);
    }
  });
}

export function getOrCreateSocket(
  token: string,
  onNotificationOrConnect?: (broadcast: BroadcastFn) => void
): ReturnType<typeof io> | null {
  if (!SOCKET_URL || !token) return null;

  if (socketInstance?.connected && currentToken === token) {
    return socketInstance;
  }

  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }

  currentToken = token;
  socketInstance = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });

  setupSocketListeners(socketInstance, onNotificationOrConnect);
  return socketInstance;
}

export function subscribeSocket() {
  subscriberCount++;
}

export function unsubscribeSocket() {
  subscriberCount = Math.max(0, subscriberCount - 1);
  if (subscriberCount === 0 && socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
    currentToken = null;
  }
}

export function onNotificationCallback(cb: (notification: any) => void) {
  notificationCallbacks.add(cb);
  return () => notificationCallbacks.delete(cb);
}

export function onCountUpdate(cb: (payload: { unreadCount: number; urgentCount: number }) => void) {
  countListeners.add(cb);
  return () => countListeners.delete(cb);
}

export function getSocket() {
  return socketInstance;
}
