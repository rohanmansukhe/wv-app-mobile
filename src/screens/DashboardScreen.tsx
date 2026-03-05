import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../lib/api';
import { colors, spacing, borderRadius } from '../lib/theme';
import { Card, StatCard, Avatar, SectionHeader, ListItem } from '../components/ui';
import { DashboardSkeleton } from '../components/SkeletonLoader';

interface DashboardData {
  employee?: {
    id: number;
    name: string;
    email: string;
    title: string;
    team?: { name: string };
    workplace?: { name: string };
  };
  myDevices?: any[];
  openTickets?: number;
  recentTickets?: any[];
}

interface DashboardScreenProps {
  onQuickAction?: (action: string) => void;
}

export default function DashboardScreen({ onQuickAction }: DashboardScreenProps) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const theme = isDark ? colors.dark : colors.light;
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);

  const fetchDashboard = useCallback(async () => {
    try {
      const response = await api.getDashboard();
      if (response.success) {
        setDashboard(response.dashboard);
      }
    } catch (err) {
      console.warn('Dashboard fetch error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDashboard();
  }, [fetchDashboard]);

  const employee = dashboard?.employee || user;
  const deviceCount = dashboard?.myDevices?.length || 0;
  const ticketCount = dashboard?.openTickets || 0;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const quickActions = [
    { key: 'newService', icon: 'add-circle-outline' as const, label: 'New Service', color: colors.primary },
    { key: 'applyLeave', icon: 'calendar-outline' as const, label: 'Apply Leave', color: colors.success },
    { key: 'orgChart', icon: 'people-outline' as const, label: 'Org Chart', color: colors.accent },
    { key: 'services', icon: 'construct-outline' as const, label: 'Services', color: colors.warning },
  ];

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.lg }]}>
        <View style={styles.headerContent}>
          <View>
            <Text style={[styles.greeting, { color: theme.textTertiary }]}>{getGreeting()}</Text>
            <Text style={[styles.name, { color: theme.text }]}>{employee?.name?.split(' ')[0] || 'there'}</Text>
          </View>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <StatCard
          icon="laptop-outline"
          iconColor={colors.primary}
          iconBg={colors.primary + '30'}
          value={deviceCount}
          label="My Assets"
        />
        <View style={{ width: spacing.md }} />
        <StatCard
          icon="ticket-outline"
          iconColor={colors.warning}
          iconBg={colors.warning + '30'}
          value={ticketCount}
          label="Open Tickets"
        />
      </View>

      {/* Quick Actions */}
      <SectionHeader title="Quick Actions" />
      <View style={styles.quickActions}>
        {quickActions.map((action) => (
          <TouchableOpacity 
            key={action.key} 
            style={styles.quickAction} 
            activeOpacity={0.7}
            onPress={() => onQuickAction?.(action.key)}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: action.color + '30' }]}>
              <Ionicons name={action.icon} size={24} color={action.color} />
            </View>
            <Text style={[styles.quickActionLabel, { color: theme.text }]}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* My Devices */}
      {dashboard?.myDevices && dashboard.myDevices.length > 0 && (
        <>
          <SectionHeader title="My Devices" action="See All" onAction={() => onQuickAction?.('assets')} />
          <View style={styles.section}>
            <Card>
              {dashboard.myDevices.slice(0, 3).map((device: any, index: number) => (
                <TouchableOpacity 
                  key={device.id} 
                  onPress={() => onQuickAction?.('viewAsset')}
                  activeOpacity={0.7}
                >
                  <ListItem
                    icon={device.type === 'laptop' ? 'laptop-outline' : device.type === 'mobile' ? 'phone-portrait-outline' : 'desktop-outline'}
                    iconColor={colors.primary}
                    iconBg={colors.primary + '30'}
                    title={device.name || device.model}
                    subtitle={device.serialNumber}
                    showChevron
                    isLast={index === Math.min(dashboard.myDevices!.length - 1, 2)}
                  />
                </TouchableOpacity>
              ))}
            </Card>
          </View>
        </>
      )}

      {/* Profile Info */}
      <SectionHeader title="Work Info" />
      <View style={styles.section}>
        <Card>
          <ListItem
            icon="briefcase-outline"
            iconColor={colors.accent}
            iconBg={colors.accent + '30'}
            title="Role"
            value={employee?.title || '—'}
          />
          {employee?.team && (
            <ListItem
              icon="people-outline"
              iconColor={colors.success}
              iconBg={colors.success + '30'}
              title="Team"
              value={employee.team.name}
            />
          )}
          <ListItem
            icon="location-outline"
            iconColor={colors.warning}
            iconBg={colors.warning + '30'}
            title="Location"
            value={employee?.workplace?.name || '—'}
            isLast
          />
        </Card>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  greeting: { fontSize: 15, fontWeight: '500' },
  name: { fontSize: 28, fontWeight: '700', marginTop: spacing.xs },
  statsRow: { flexDirection: 'row', paddingHorizontal: spacing.lg },
  quickActions: { flexDirection: 'row', paddingHorizontal: spacing.lg, gap: spacing.sm },
  quickAction: { flex: 1, alignItems: 'center', paddingVertical: spacing.lg },
  quickActionIcon: { width: 56, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.sm },
  quickActionLabel: { fontSize: 12, fontWeight: '500', textAlign: 'center' },
  section: { paddingHorizontal: spacing.lg },
});
