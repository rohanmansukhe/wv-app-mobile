import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, ScrollView, RefreshControl, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../lib/api';
import { colors, spacing, borderRadius } from '../lib/theme';
import { useTheme } from '../context/ThemeContext';
import { EmptyState } from '../components/ui';
import { ListSkeleton } from '../components/SkeletonLoader';

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  icon?: string;
  createdAt: string;
  read?: boolean;
  isRead?: boolean;
  readAt?: string | null;
}

const getTypeConfig = (accentColor: string): Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }> => ({
  leave: { icon: 'calendar-outline', color: colors.success, bg: colors.success + '30' },
  ticket: { icon: 'ticket-outline', color: colors.warning, bg: colors.warning + '30' },
  asset: { icon: 'laptop-outline', color: accentColor, bg: accentColor + '30' },
  announcement: { icon: 'megaphone-outline', color: colors.accent, bg: colors.accent + '30' },
  service: { icon: 'construct-outline', color: '#06B6D4', bg: '#06B6D430' },
  default: { icon: 'notifications-outline', color: accentColor, bg: accentColor + '30' },
});

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const { isDark, accentColor } = useTheme();
  const theme = isDark ? colors.dark : colors.light;
  const TYPE_CONFIG = getTypeConfig(accentColor);
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState('all');
  const [markingRead, setMarkingRead] = useState<Set<number>>(new Set());
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const isInitialLoad = useRef(true);

  const isNotificationRead = (n: Notification) => n.read ?? n.isRead ?? !!n.readAt;

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await api.getNotifications({ status: filter, limit: 50 });
      if (response.success) {
        setNotifications(response.notifications || []);
        setUnreadCount(response.unreadCount || 0);
      }
    } catch (err) {
      console.warn('Notifications fetch error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useEffect(() => {
    if (isInitialLoad.current) {
      setLoading(true);
      isInitialLoad.current = false;
    } else {
      setRefreshing(true);
    }
    fetchNotifications();
  }, [fetchNotifications]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkAllRead = async () => {
    if (unreadCount === 0 || markingAllRead) return;
    
    setMarkingAllRead(true);
    try {
      await api.markAllNotificationsRead();
      // Optimistically update local state
      setNotifications(prev => prev.map(n => ({ ...n, read: true, isRead: true })));
      setUnreadCount(0);
      // Refetch to ensure consistency
      await fetchNotifications();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to mark all as read');
      // Refetch on error to get correct state
      fetchNotifications();
    } finally {
      setMarkingAllRead(false);
    }
  };

  const handleMarkRead = async (notification: Notification) => {
    if (isNotificationRead(notification) || markingRead.has(notification.id)) return;
    
    setMarkingRead(prev => new Set(prev).add(notification.id));
    
    try {
      await api.markNotificationRead(notification.id);
      // Optimistically update local state
      setNotifications(prev => 
        prev.map(n => n.id === notification.id ? { ...n, read: true, isRead: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to mark as read');
      // Refetch on error to get correct state
      fetchNotifications();
    } finally {
      setMarkingRead(prev => {
        const newSet = new Set(prev);
        newSet.delete(notification.id);
        return newSet;
      });
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getConfigForType = (type?: string) => TYPE_CONFIG[type || 'default'] || TYPE_CONFIG.default;

  if (loading) {
    return <ListSkeleton count={8} topInset={100} />;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: spacing.md }]}>
        <View style={styles.headerRow}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: theme.text }]}>Notifications</Text>
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
              </View>
            )}
          </View>
          {unreadCount > 0 && (
            <TouchableOpacity 
              onPress={handleMarkAllRead} 
              disabled={markingAllRead}
              style={styles.markAllButton}
            >
              {markingAllRead ? (
                <ActivityIndicator size="small" color={accentColor} />
              ) : (
                <Text style={[styles.markAllRead, { color: accentColor }]}>Mark all read</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
        
        {/* Filters */}
        <View style={styles.filterRow}>
          {['all', 'unread', 'read'].map((status) => (
            <TouchableOpacity
              key={status}
              style={[
                styles.filterChip,
                { backgroundColor: filter === status ? accentColor : theme.surface },
              ]}
              onPress={() => setFilter(status)}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.filterChipText,
                { color: filter === status ? '#FFF' : theme.textSecondary }
              ]}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />
        }
        showsVerticalScrollIndicator={false}
      >
        {notifications.length === 0 ? (
          <EmptyState
            icon="notifications-off-outline"
            title="No notifications"
            subtitle="You're all caught up!"
          />
        ) : (
          <View style={styles.section}>
            {notifications.map((notification) => {
              const config = getConfigForType(notification.type);
              const isMarkingThis = markingRead.has(notification.id);
              const read = isNotificationRead(notification);
              
              return (
                <View
                  key={notification.id}
                  style={[
                    styles.notificationCard,
                    { backgroundColor: read ? theme.surface : (isDark ? '#1A1A2E' : '#F0F7FF') },
                  ]}
                >
                  <View style={styles.notificationRow}>
                    <View style={[styles.iconContainer, { backgroundColor: config.bg }]}>
                      <Ionicons name={config.icon} size={20} color={config.color} />
                    </View>
                    
                    <View style={styles.notificationContent}>
                      <View style={styles.notificationHeader}>
                        <Text 
                          style={[
                            styles.notificationTitle, 
                            { color: theme.text, fontWeight: read ? '500' : '600' }
                          ]} 
                          numberOfLines={1}
                        >
                          {notification.title}
                        </Text>
                        <Text style={[styles.notificationTime, { color: theme.textTertiary }]}>
                          {formatDate(notification.createdAt)}
                        </Text>
                      </View>
                      <Text 
                        style={[styles.notificationMessage, { color: theme.textSecondary }]} 
                        numberOfLines={2}
                      >
                        {notification.message}
                      </Text>
                    </View>
                    
                    {!read && !isMarkingThis && (
                      <View style={[styles.unreadDot, { backgroundColor: accentColor }]} />
                    )}
                  </View>
                  
                  {/* Mark as read button - only for unread notifications */}
                  {!read && (
                    <TouchableOpacity 
                      style={[styles.markReadButton, { borderColor: theme.separator }]}
                      onPress={() => handleMarkRead(notification)}
                      disabled={isMarkingThis}
                    >
                      {isMarkingThis ? (
                        <ActivityIndicator size="small" color={accentColor} />
                      ) : (
                        <>
                          <Ionicons name="checkmark-circle-outline" size={16} color={accentColor} />
                          <Text style={[styles.markReadText, { color: accentColor }]}>Mark as read</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: spacing.xl, paddingBottom: spacing.md },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { fontSize: 34, fontWeight: '700' },
  badge: { backgroundColor: colors.error, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, minWidth: 24, alignItems: 'center' },
  badgeText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  markAllButton: { minWidth: 100, alignItems: 'flex-end' },
  markAllRead: { fontSize: 15, fontWeight: '500' },
  filterRow: { flexDirection: 'row', marginTop: spacing.lg, gap: spacing.sm },
  filterChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.md },
  filterChipText: { fontSize: 13, fontWeight: '500' },
  content: { flex: 1 },
  section: { paddingHorizontal: spacing.lg, gap: spacing.sm },
  notificationCard: { borderRadius: borderRadius.lg, padding: spacing.md },
  notificationRow: { flexDirection: 'row', alignItems: 'flex-start' },
  iconContainer: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  notificationContent: { flex: 1, marginLeft: spacing.md },
  notificationHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  notificationTitle: { fontSize: 15, flex: 1, marginRight: spacing.sm },
  notificationTime: { fontSize: 13 },
  notificationMessage: { fontSize: 14, lineHeight: 20, marginTop: 4 },
  markReadButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: spacing.md, paddingTop: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, gap: spacing.xs, minHeight: 32 },
  markReadText: { fontSize: 14, fontWeight: '500' },
  unreadDot: { width: 10, height: 10, borderRadius: 5, marginLeft: spacing.sm, marginTop: 6 },
});
