import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl, StyleSheet, TouchableOpacity, TextInput, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../lib/api';
import { colors, spacing, borderRadius } from '../lib/theme';
import { useTheme } from '../context/ThemeContext';
import { Card, EmptyState, Avatar } from '../components/ui';
import { ListSkeleton } from '../components/SkeletonLoader';

interface Employee {
  id: number;
  name: string;
  email: string;
  title: string;
  team?: { name: string };
  workplace?: { name: string };
  phone?: string;
  children?: Employee[];
}

export default function OrgChartScreen() {
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const theme = isDark ? colors.dark : colors.light;
  
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  const fetchOrgChart = useCallback(async () => {
    try {
      const response = await api.getOrgChart();
      if (response.success) {
        const data = response.data || response.employees || response.orgChart || response.tree || [];
        const employeeList = Array.isArray(data) ? data : (data.employees || data.children || [data]);
        setEmployees(employeeList);
        if (employeeList.length > 0) {
          setExpandedIds(new Set(employeeList.map((e: Employee) => e.id)));
        }
      }
    } catch (err) {
      console.warn('Org chart fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchOrgChart();
  }, [fetchOrgChart]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOrgChart();
  }, [fetchOrgChart]);

  const toggleExpand = (id: number) => {
    setExpandedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const flattenEmployees = (emps: Employee[], level: number = 0): Array<Employee & { level: number; hasChildren: boolean }> => {
    const result: Array<Employee & { level: number; hasChildren: boolean }> = [];
    for (const emp of emps) {
      const hasChildren = !!(emp.children && emp.children.length > 0);
      result.push({ ...emp, level, hasChildren });
      if (hasChildren && expandedIds.has(emp.id)) {
        result.push(...flattenEmployees(emp.children!, level + 1));
      }
    }
    return result;
  };

  const filterEmployees = (emps: Array<Employee & { level: number; hasChildren: boolean }>) => {
    if (!searchQuery) return emps;
    const query = searchQuery.toLowerCase();
    return emps.filter((emp) =>
      emp.name?.toLowerCase().includes(query) ||
      emp.email?.toLowerCase().includes(query) ||
      emp.title?.toLowerCase().includes(query) ||
      emp.team?.name?.toLowerCase().includes(query)
    );
  };

  const flatEmployees = flattenEmployees(employees);
  const filteredEmployees = filterEmployees(flatEmployees);

  const COLORS = [colors.primary, colors.accent, colors.success, colors.warning, '#FF6B6B', '#4ECDC4', '#8B5CF6'];
  const getColor = (index: number) => COLORS[index % COLORS.length];

  const handleEmailPress = (email: string) => {
    Linking.openURL(`mailto:${email}`);
  };

  const handlePhonePress = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.lg }]}>
        <Text style={[styles.title, { color: theme.text }]}>People</Text>
        <Text style={[styles.subtitle, { color: theme.textTertiary }]}>
          {employees.length > 0 ? `${flatEmployees.length} people in your organization` : 'Organization chart'}
        </Text>
        
        {/* Search */}
        <View style={[styles.searchContainer, { backgroundColor: theme.surface }]}>
          <Ionicons name="search" size={20} color={theme.textTertiary} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search by name, title, or team..."
            placeholderTextColor={theme.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={theme.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <ListSkeleton count={10} />
        ) : filteredEmployees.length === 0 ? (
          <EmptyState
            icon="people-outline"
            title={searchQuery ? 'No results found' : 'No organization data'}
            subtitle={searchQuery ? 'Try a different search term' : 'Pull down to refresh or check back later'}
          />
        ) : (
          <View style={styles.section}>
            {filteredEmployees.map((employee, index) => (
              <TouchableOpacity
                key={employee.id}
                style={[
                  styles.personCard,
                  { 
                    backgroundColor: theme.surface,
                    marginLeft: employee.level * 16,
                  },
                  selectedEmployee?.id === employee.id && { borderColor: colors.primary, borderWidth: 2 },
                ]}
                onPress={() => setSelectedEmployee(selectedEmployee?.id === employee.id ? null : employee)}
                activeOpacity={0.7}
              >
                <View style={styles.personRow}>
                  {employee.hasChildren ? (
                    <TouchableOpacity onPress={() => toggleExpand(employee.id)} style={styles.expandButton}>
                      <Ionicons
                        name={expandedIds.has(employee.id) ? 'chevron-down' : 'chevron-forward'}
                        size={18}
                        color={theme.textTertiary}
                      />
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.expandPlaceholder} />
                  )}
                  
                  <Avatar name={employee.name} size={48} color={getColor(index)} />
                  
                  <View style={styles.personInfo}>
                    <Text style={[styles.personName, { color: theme.text }]}>{employee.name}</Text>
                    <Text style={[styles.personTitle, { color: theme.textTertiary }]}>{employee.title}</Text>
                    {employee.team && (
                      <View style={styles.teamRow}>
                        <Ionicons name="people-outline" size={12} color={theme.textTertiary} />
                        <Text style={[styles.teamName, { color: theme.textTertiary }]}>{employee.team.name}</Text>
                      </View>
                    )}
                  </View>
                  
                  {employee.hasChildren && (
                    <View style={[styles.childCount, { backgroundColor: colors.primaryLight }]}>
                      <Text style={[styles.childCountText, { color: colors.primary }]}>
                        {employee.children?.length}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Expanded Details */}
                {selectedEmployee?.id === employee.id && (
                  <View style={[styles.expandedDetails, { borderTopColor: theme.separator }]}>
                    {employee.email && (
                      <TouchableOpacity 
                        style={styles.detailRow} 
                        onPress={() => handleEmailPress(employee.email)}
                      >
                        <View style={[styles.detailIcon, { backgroundColor: colors.primaryLight }]}>
                          <Ionicons name="mail-outline" size={16} color={colors.primary} />
                        </View>
                        <Text style={[styles.detailText, { color: colors.primary }]}>{employee.email}</Text>
                      </TouchableOpacity>
                    )}
                    {employee.phone && (
                      <TouchableOpacity 
                        style={styles.detailRow}
                        onPress={() => handlePhonePress(employee.phone!)}
                      >
                        <View style={[styles.detailIcon, { backgroundColor: colors.successLight }]}>
                          <Ionicons name="call-outline" size={16} color={colors.success} />
                        </View>
                        <Text style={[styles.detailText, { color: colors.success }]}>{employee.phone}</Text>
                      </TouchableOpacity>
                    )}
                    {employee.workplace && (
                      <View style={styles.detailRow}>
                        <View style={[styles.detailIcon, { backgroundColor: colors.warningLight }]}>
                          <Ionicons name="location-outline" size={16} color={colors.warning} />
                        </View>
                        <Text style={[styles.detailText, { color: theme.textSecondary }]}>{employee.workplace.name}</Text>
                      </View>
                    )}
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: spacing.xl, paddingBottom: spacing.md },
  title: { fontSize: 34, fontWeight: '700' },
  subtitle: { fontSize: 15, marginTop: spacing.xs, marginBottom: spacing.lg },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: spacing.xxxl * 2 },
  loadingText: { marginTop: spacing.md, fontSize: 15 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.md, gap: spacing.sm },
  searchInput: { flex: 1, fontSize: 16, paddingVertical: spacing.xs },
  content: { flex: 1 },
  section: { paddingHorizontal: spacing.lg, gap: spacing.sm },
  personCard: { borderRadius: borderRadius.lg, padding: spacing.md, overflow: 'hidden' },
  personRow: { flexDirection: 'row', alignItems: 'center' },
  expandButton: { padding: spacing.xs, marginRight: spacing.xs },
  expandPlaceholder: { width: 26 },
  personInfo: { flex: 1, marginLeft: spacing.md },
  personName: { fontSize: 16, fontWeight: '600' },
  personTitle: { fontSize: 14, marginTop: 2 },
  teamRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  teamName: { fontSize: 12 },
  childCount: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  childCountText: { fontSize: 13, fontWeight: '600' },
  expandedDetails: { marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: StyleSheet.hairlineWidth },
  detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  detailIcon: { width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: spacing.sm },
  detailText: { fontSize: 14 },
});
