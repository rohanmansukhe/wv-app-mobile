import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl, StyleSheet, TouchableOpacity } from 'react-native';
import { confirmAlert } from '../lib/alert';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../lib/api';
import { colors, spacing, borderRadius } from '../lib/theme';
import { Card, ListItem, Avatar, SectionHeader } from '../components/ui';

interface ProfileData {
  id: number;
  name: string;
  email: string;
  title?: string;
  team?: { name: string };
  workplace?: { name: string };
  manager?: { name: string };
  employeeId?: string;
  joinDate?: string;
}

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const { isDark, accentColor } = useTheme();
  const theme = isDark ? colors.dark : colors.light;
  
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);

  const fetchProfile = useCallback(async () => {
    try {
      const response = await api.getDashboard();
      if (response.success && response.dashboard?.employee) {
        setProfile(response.dashboard.employee);
      }
    } catch (err) {
      console.warn('Profile fetch error');
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchProfile();
  }, [fetchProfile]);

  const handleLogout = () => {
    confirmAlert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: logout },
      ]
    );
  };

  const displayProfile = profile || user;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.xl }]}>
        <Avatar name={displayProfile?.name || 'U'} size={88} color={accentColor} />
        <Text style={[styles.name, { color: theme.text }]}>{displayProfile?.name || 'User'}</Text>
        <Text style={[styles.title, { color: theme.textTertiary }]}>{displayProfile?.title || 'Employee'}</Text>
        <Text style={[styles.email, { color: theme.textTertiary }]}>{displayProfile?.email}</Text>
      </View>

      {/* Work Info */}
      <SectionHeader title="Work Information" />
      <View style={styles.section}>
        <Card>
          <ListItem
            icon="briefcase-outline"
            iconColor={accentColor}
            iconBg={accentColor + '30'}
            title="Role"
            value={profile?.title || '—'}
          />
          <ListItem
            icon="people-outline"
            iconColor={colors.success}
            iconBg={colors.success + '30'}
            title="Team"
            value={profile?.team?.name || '—'}
          />
          <ListItem
            icon="location-outline"
            iconColor={colors.warning}
            iconBg={colors.warning + '30'}
            title="Location"
            value={profile?.workplace?.name || '—'}
          />
          {profile?.manager && (
            <ListItem
              icon="person-outline"
              iconColor={colors.accent}
              iconBg={colors.accent + '30'}
              title="Manager"
              value={profile.manager.name}
            />
          )}
          {profile?.employeeId && (
            <ListItem
              icon="card-outline"
              iconColor="#06B6D4"
              iconBg="#06B6D430"
              title="Employee ID"
              value={profile.employeeId}
              isLast
            />
          )}
        </Card>
      </View>

      {/* App Info */}
      <SectionHeader title="App" />
      <View style={styles.section}>
        <Card>
          <ListItem
            icon="information-circle-outline"
            iconColor={accentColor}
            iconBg={accentColor + '30'}
            title="Version"
            value="1.0.0"
          />
          <ListItem
            icon="phone-portrait-outline"
            iconColor={colors.accent}
            iconBg={colors.accent + '30'}
            title="Platform"
            value="Workverge Mobile"
            isLast
          />
        </Card>
      </View>

      {/* Sign Out */}
      <View style={styles.signOutSection}>
        <TouchableOpacity
          style={[styles.signOutButton, { backgroundColor: theme.surface }]}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <Ionicons name="log-out-outline" size={22} color={colors.error} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.footer, { color: theme.textTertiary }]}>
        Workverge © {new Date().getFullYear()}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingBottom: spacing.xl,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: spacing.lg,
  },
  title: {
    fontSize: 16,
    marginTop: spacing.xs,
  },
  email: {
    fontSize: 14,
    marginTop: spacing.xs,
  },
  section: {
    paddingHorizontal: spacing.lg,
  },
  signOutSection: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  signOutText: {
    fontSize: 17,
    fontWeight: '500',
    color: colors.error,
  },
  footer: {
    textAlign: 'center',
    fontSize: 13,
    marginTop: spacing.xxxl,
  },
});
