import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { colors, spacing, borderRadius } from '../lib/theme';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({ width = '100%', height = 20, borderRadius: radius = 8, style }: SkeletonProps) {
  const { isDark } = useTheme();
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius: radius,
          backgroundColor: isDark ? '#3A3A3C' : '#E5E7EB',
          opacity,
        },
        style,
      ]}
    />
  );
}

export function DashboardSkeleton() {
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const theme = isDark ? colors.dark : colors.light;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.lg }]}>
        <Skeleton width={100} height={16} />
        <Skeleton width={150} height={32} style={{ marginTop: spacing.sm }} />
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: theme.surface }]}>
          <Skeleton width={48} height={48} borderRadius={14} />
          <Skeleton width={40} height={28} style={{ marginTop: spacing.md }} />
          <Skeleton width={60} height={14} style={{ marginTop: spacing.xs }} />
        </View>
        <View style={[styles.statCard, { backgroundColor: theme.surface }]}>
          <Skeleton width={48} height={48} borderRadius={14} />
          <Skeleton width={40} height={28} style={{ marginTop: spacing.md }} />
          <Skeleton width={60} height={14} style={{ marginTop: spacing.xs }} />
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActionsRow}>
        {[1, 2, 3, 4].map((i) => (
          <View key={i} style={styles.quickAction}>
            <Skeleton width={56} height={56} borderRadius={16} />
            <Skeleton width={50} height={12} style={{ marginTop: spacing.sm }} />
          </View>
        ))}
      </View>

      {/* Cards */}
      <View style={styles.cards}>
        <Skeleton width={80} height={14} style={{ marginBottom: spacing.sm }} />
        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          {[1, 2, 3].map((i) => (
            <View key={i} style={styles.listItem}>
              <Skeleton width={32} height={32} borderRadius={8} />
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Skeleton width="70%" height={16} />
                <Skeleton width="50%" height={12} style={{ marginTop: spacing.xs }} />
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

export function ListSkeleton({ count = 5, topInset }: { count?: number; topInset?: number }) {
  const { isDark } = useTheme();
  const theme = isDark ? colors.dark : colors.light;

  return (
    <View style={[
      styles.listContainer,
      { backgroundColor: theme.background },
      topInset != null && { paddingTop: topInset },
    ]}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={[styles.listCard, { backgroundColor: theme.surface }]}>
          <Skeleton width={48} height={48} borderRadius={12} />
          <View style={{ flex: 1, marginLeft: spacing.md }}>
            <Skeleton width="80%" height={16} />
            <Skeleton width="60%" height={14} style={{ marginTop: spacing.sm }} />
          </View>
          <Skeleton width={60} height={24} borderRadius={6} />
        </View>
      ))}
    </View>
  );
}

export function CalendarSkeleton() {
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const theme = isDark ? colors.dark : colors.light;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.lg }]}>
        <Skeleton width={120} height={34} />
        <Skeleton width={180} height={16} style={{ marginTop: spacing.xs }} />
      </View>

      {/* Month Nav */}
      <View style={styles.monthNav}>
        <Skeleton width={24} height={24} borderRadius={12} />
        <Skeleton width={140} height={20} />
        <Skeleton width={24} height={24} borderRadius={12} />
      </View>

      {/* Calendar Grid */}
      <View style={[styles.calendarCard, { backgroundColor: theme.surface }]}>
        <View style={styles.weekRow}>
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <Skeleton key={i} width={30} height={14} style={{ marginHorizontal: 4 }} />
          ))}
        </View>
        <View style={styles.daysGrid}>
          {Array.from({ length: 35 }).map((_, i) => (
            <View key={i} style={styles.dayCell}>
              <Skeleton width={32} height={32} borderRadius={16} />
            </View>
          ))}
        </View>
      </View>

      {/* Leave Balance */}
      <View style={styles.balanceRow}>
        {[1, 2, 3, 4].map((i) => (
          <View key={i} style={[styles.balanceCard, { backgroundColor: theme.surface }]}>
            <Skeleton width={36} height={36} borderRadius={10} />
            <Skeleton width={30} height={22} style={{ marginTop: spacing.sm }} />
            <Skeleton width={50} height={12} style={{ marginTop: spacing.xs }} />
          </View>
        ))}
      </View>
    </View>
  );
}

export function AppSkeleton() {
  const { isDark } = useTheme();
  const theme = isDark ? colors.dark : colors.light;

  return (
    <View style={[styles.appContainer, { backgroundColor: theme.background }]}>
      <View style={styles.appCenter}>
        <Skeleton width={80} height={80} borderRadius={20} />
        <Skeleton width={120} height={20} style={{ marginTop: spacing.lg }} />
        <Skeleton width={80} height={12} style={{ marginTop: spacing.sm }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  appContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  appCenter: { alignItems: 'center' },
  container: { flex: 1, padding: spacing.lg },
  header: { paddingTop: spacing.xxl, paddingBottom: spacing.xl },
  statsRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.xl },
  statCard: { flex: 1, alignItems: 'center', padding: spacing.xl, borderRadius: borderRadius.lg },
  quickActionsRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: spacing.xl },
  quickAction: { alignItems: 'center' },
  cards: { marginBottom: spacing.xl },
  card: { borderRadius: borderRadius.lg, padding: spacing.lg },
  listItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md },
  listContainer: { flex: 1, padding: spacing.lg, gap: spacing.sm },
  listCard: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderRadius: borderRadius.lg },
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  calendarCard: { marginHorizontal: spacing.lg, borderRadius: borderRadius.lg, padding: spacing.md, marginBottom: spacing.xl },
  weekRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: spacing.md },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: '14.28%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center' },
  balanceRow: { flexDirection: 'row', paddingHorizontal: spacing.lg, gap: spacing.sm },
  balanceCard: { flex: 1, alignItems: 'center', padding: spacing.md, borderRadius: borderRadius.lg },
});
