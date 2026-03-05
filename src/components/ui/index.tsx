import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ViewStyle, TextStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, shadows } from '../../lib/theme';
import { useTheme } from '../../context/ThemeContext';

type IoniconsName = keyof typeof Ionicons.glyphMap;

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
}

export function Card({ children, style, onPress }: CardProps) {
  const { isDark } = useTheme();
  const theme = isDark ? colors.dark : colors.light;
  
  const cardStyle = [
    styles.card,
    { backgroundColor: theme.surface },
    shadows.sm,
    style,
  ];
  
  if (onPress) {
    return (
      <TouchableOpacity style={cardStyle} onPress={onPress} activeOpacity={0.7}>
        {children}
      </TouchableOpacity>
    );
  }
  
  return <View style={cardStyle}>{children}</View>;
}

interface ListItemProps {
  icon?: IoniconsName;
  iconColor?: string;
  iconBg?: string;
  title: string;
  subtitle?: string;
  value?: string;
  showChevron?: boolean;
  onPress?: () => void;
  isLast?: boolean;
}

export function ListItem({ icon, iconColor, iconBg, title, subtitle, value, showChevron, onPress, isLast }: ListItemProps) {
  const { isDark } = useTheme();
  const theme = isDark ? colors.dark : colors.light;
  
  const content = (
    <View style={[styles.listItem, !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.separator }]}>
      {icon && (
        <View style={[styles.listItemIcon, { backgroundColor: iconBg || colors.primary }]}>
          <Ionicons name={icon} size={18} color={iconColor || '#FFF'} />
        </View>
      )}
      <View style={styles.listItemContent}>
        <Text style={[styles.listItemTitle, { color: theme.text }]}>{title}</Text>
        {subtitle && <Text style={[styles.listItemSubtitle, { color: theme.textTertiary }]}>{subtitle}</Text>}
      </View>
      {value && <Text style={[styles.listItemValue, { color: theme.textTertiary }]}>{value}</Text>}
      {showChevron && <Ionicons name="chevron-forward" size={20} color={theme.textTertiary} />}
    </View>
  );
  
  if (onPress) {
    return <TouchableOpacity onPress={onPress} activeOpacity={0.6}>{content}</TouchableOpacity>;
  }
  
  return content;
}

interface SectionHeaderProps {
  title: string;
  action?: string;
  onAction?: () => void;
}

export function SectionHeader({ title, action, onAction }: SectionHeaderProps) {
  const { isDark, accentColor } = useTheme();
  const theme = isDark ? colors.dark : colors.light;
  
  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>{title}</Text>
      {action && (
        <TouchableOpacity onPress={onAction}>
          <Text style={[styles.sectionAction, { color: accentColor }]}>{action}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

interface BadgeProps {
  label: string;
  color?: string;
  bgColor?: string;
}

export function Badge({ label, color, bgColor }: BadgeProps) {
  const { accentColor } = useTheme();
  return (
    <View style={[styles.badge, { backgroundColor: bgColor || accentColor + '30' }]}>
      <Text style={[styles.badgeText, { color: color || accentColor }]}>{label}</Text>
    </View>
  );
}

interface StatCardProps {
  icon: IoniconsName;
  iconColor: string;
  iconBg: string;
  value: string | number;
  label: string;
  onPress?: () => void;
}

export function StatCard({ icon, iconColor, iconBg, value, label, onPress }: StatCardProps) {
  const { isDark } = useTheme();
  const theme = isDark ? colors.dark : colors.light;
  
  return (
    <Card style={styles.statCard} onPress={onPress}>
      <View style={[styles.statIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={22} color={iconColor} />
      </View>
      <Text style={[styles.statValue, { color: theme.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: theme.textTertiary }]}>{label}</Text>
    </Card>
  );
}

interface EmptyStateProps {
  icon: IoniconsName;
  title: string;
  subtitle?: string;
}

export function EmptyState({ icon, title, subtitle }: EmptyStateProps) {
  const { isDark } = useTheme();
  const theme = isDark ? colors.dark : colors.light;
  
  return (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIcon, { backgroundColor: theme.surfaceSecondary }]}>
        <Ionicons name={icon} size={48} color={theme.textTertiary} />
      </View>
      <Text style={[styles.emptyTitle, { color: theme.text }]}>{title}</Text>
      {subtitle && <Text style={[styles.emptySubtitle, { color: theme.textTertiary }]}>{subtitle}</Text>}
    </View>
  );
}

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  compact?: boolean;
}

export function Chip({ label, selected, onPress, compact }: ChipProps) {
  const { isDark, accentColor } = useTheme();
  const theme = isDark ? colors.dark : colors.light;
  
  return (
    <TouchableOpacity
      style={[
        styles.chip,
        compact && styles.chipCompact,
        { backgroundColor: selected ? accentColor : theme.surfaceSecondary },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[
        styles.chipText, 
        compact && styles.chipTextCompact,
        { color: selected ? '#FFF' : theme.textSecondary }
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

interface AvatarProps {
  name: string;
  size?: number;
  color?: string;
}

export function Avatar({ name, size = 44, color }: AvatarProps) {
  const getInitials = (n: string) => {
    const parts = n.split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return n[0]?.toUpperCase() || '?';
  };
  
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: color || colors.primary }]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.4 }]}>{getInitials(name)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  listItemIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  listItemContent: {
    flex: 1,
  },
  listItemTitle: {
    fontSize: 16,
    fontWeight: '400',
  },
  listItemSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  listItemValue: {
    fontSize: 16,
    marginRight: spacing.xs,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionAction: {
    fontSize: 15,
    fontWeight: '500',
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 13,
    marginTop: spacing.xs,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl * 2,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontSize: 15,
    textAlign: 'center',
    paddingHorizontal: spacing.xxxl,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  chipCompact: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  chipTextCompact: {
    fontSize: 13,
  },
  avatar: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFF',
    fontWeight: '600',
  },
});
