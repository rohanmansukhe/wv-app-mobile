import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../lib/api';
import { colors, spacing, borderRadius } from '../lib/theme';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { Badge, Chip, SectionHeader, EmptyState, Card } from '../components/ui';
import BottomSheet, { ActionButton } from '../components/BottomSheet';
import DescriptionInputPopover from '../components/DescriptionInputPopover';
import { ListSkeleton } from '../components/SkeletonLoader';

interface Service {
  id: number | string;
  name: string;
  shortDesc?: string;
  description?: string;
  status: string;
  category?: { id: number; name: string };
  categoryName?: string;
}

interface ServiceTicket {
  id: number | string;
  title: string;
  description: string;
  status: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
  service?: { id: number; name: string };
  activities?: Array<{ type: string; user: { name: string }; message: string; timestamp: string }>;
}

const getStatusConfig = (status: string, isDark: boolean): { color: string; bg: string; label: string } => {
  const configs: Record<string, { color: string; bgLight: string; bgDark: string; label: string }> = {
    OPEN: { color: '#64748B', bgLight: '#F1F5F9', bgDark: '#334155', label: 'Open' },
    INPROGRESS: { color: '#6366F1', bgLight: '#EEF2FF', bgDark: '#312E81', label: 'In Progress' },
    PENDING: { color: colors.warning, bgLight: colors.warningLight, bgDark: '#713F12', label: 'Pending' },
    AWAITINGAPPROVAL: { color: '#F59E0B', bgLight: '#FEF3C7', bgDark: '#713F12', label: 'Awaiting Approval' },
    APPROVED: { color: colors.success, bgLight: colors.successLight, bgDark: '#14532D', label: 'Approved' },
    CLOSED: { color: colors.success, bgLight: colors.successLight, bgDark: '#14532D', label: 'Closed' },
    RESOLVED: { color: colors.success, bgLight: colors.successLight, bgDark: '#14532D', label: 'Resolved' },
    REJECTED: { color: colors.error, bgLight: colors.errorLight, bgDark: '#7F1D1D', label: 'Rejected' },
  };
  const config = configs[status] || configs.OPEN;
  return { color: config.color, bg: isDark ? config.bgDark : config.bgLight, label: config.label };
};

const getPriorityConfig = (priority: string, isDark: boolean): { color: string; bg: string } => {
  const configs: Record<string, { color: string; bgLight: string; bgDark: string }> = {
    LOW: { color: colors.success, bgLight: colors.successLight, bgDark: '#14532D' },
    MEDIUM: { color: colors.warning, bgLight: colors.warningLight, bgDark: '#713F12' },
    HIGH: { color: '#F97316', bgLight: '#FFF7ED', bgDark: '#7C2D12' },
    URGENT: { color: colors.error, bgLight: colors.errorLight, bgDark: '#7F1D1D' },
  };
  const config = configs[priority] || configs.MEDIUM;
  return { color: config.color, bg: isDark ? config.bgDark : config.bgLight };
};

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'open', label: 'Open' },
  { key: 'inProgress', label: 'In Progress' },
  { key: 'pending', label: 'Pending' },
  { key: 'closed', label: 'Closed' },
];

export default function ServicesScreen() {
  const insets = useSafeAreaInsets();
  const { isDark, accentColor } = useTheme();
  const { showToast } = useToast();
  const theme = isDark ? colors.dark : colors.light;
  
  const [tab, setTab] = useState<'catalog' | 'requests'>('catalog');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Catalog
  const [services, setServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [showRequestSheet, setShowRequestSheet] = useState(false);
  
  // Requests
  const [tickets, setTickets] = useState<ServiceTicket[]>([]);
  const [filter, setFilter] = useState('all');
  const [selectedTicket, setSelectedTicket] = useState<ServiceTicket | null>(null);
  const [showDetailSheet, setShowDetailSheet] = useState(false);
  
  // Request form
  const [requestTitle, setRequestTitle] = useState('');
  const [requestDescription, setRequestDescription] = useState('');
  const [requestPriority, setRequestPriority] = useState('MEDIUM');
  const [submitting, setSubmitting] = useState(false);

  const fetchServices = useCallback(async () => {
    try {
      const response = await api.getServices();
      console.log('Services response:', response);
      if (response.success !== false) {
        // Handle different response formats
        const serviceList = response.services || response.data || response || [];
        setServices(Array.isArray(serviceList) ? serviceList : []);
      }
    } catch (err) {
      console.warn('Services fetch error:', err);
    }
  }, []);

  const fetchTickets = useCallback(async () => {
    try {
      const params: { status?: string; limit: number } = { limit: 50 };
      if (filter !== 'all') {
        params.status = filter;
      }
      const response = await api.getMyServiceTickets(params);
      console.log('Tickets response:', response);
      if (response.success !== false) {
        // Handle different response formats
        const ticketList = response.tickets || response.data || response.requests || [];
        setTickets(Array.isArray(ticketList) ? ticketList : []);
      }
    } catch (err) {
      console.warn('Tickets fetch error:', err);
    }
  }, [filter]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchServices(), fetchTickets()]);
    setLoading(false);
    setRefreshing(false);
  }, [fetchServices, fetchTickets]);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!loading) {
      fetchTickets();
    }
  }, [filter]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  const groupedServices = services.reduce((acc, service) => {
    if (service.status?.toLowerCase() !== 'active') return acc;
    const category = service.category?.name || service.categoryName || 'General';
    if (!acc[category]) acc[category] = [];
    acc[category].push(service);
    return acc;
  }, {} as Record<string, Service[]>);

  const handleRequestService = (service: Service) => {
    setSelectedService(service);
    setRequestTitle(service.name);
    setRequestDescription('');
    setRequestPriority('MEDIUM');
    setShowRequestSheet(true);
  };

  const handleSubmitRequest = async () => {
    if (!requestTitle.trim() || !requestDescription.trim()) {
      Alert.alert('Missing Information', 'Please enter a title and description');
      return;
    }
    
    setSubmitting(true);
    try {
      const response = await api.createServiceTicket({
        serviceID: Number(selectedService!.id),
        title: requestTitle,
        description: requestDescription,
        priority: requestPriority,
      });
      
      if (response.success !== false) {
        setShowRequestSheet(false);
        resetRequestForm();
        setTab('requests');
        fetchTickets();
        showToast('Service request submitted');
      } else {
        Alert.alert('Error', response.message || 'Failed to submit request');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  const resetRequestForm = () => {
    setRequestTitle('');
    setRequestDescription('');
    setRequestPriority('MEDIUM');
    setSelectedService(null);
  };

  const handleViewTicket = (ticket: ServiceTicket) => {
    setSelectedTicket(ticket);
    setShowDetailSheet(true);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.lg }]}>
        <Text style={[styles.title, { color: theme.text }]}>Services</Text>
        <Text style={[styles.subtitle, { color: theme.textTertiary }]}>Request IT services & support</Text>
        
        {/* Tabs */}
        <View style={[styles.tabs, { backgroundColor: theme.surface }]}>
          <TouchableOpacity 
            style={[styles.tab, tab === 'catalog' && [styles.tabActive, { backgroundColor: accentColor + '20' }]]} 
            onPress={() => setTab('catalog')}
          >
            <Ionicons name="grid-outline" size={18} color={tab === 'catalog' ? accentColor : theme.textTertiary} />
            <Text style={[styles.tabText, { color: tab === 'catalog' ? accentColor : theme.textTertiary }]}>Catalog</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, tab === 'requests' && [styles.tabActive, { backgroundColor: accentColor + '20' }]]} 
            onPress={() => setTab('requests')}
          >
            <Ionicons name="document-text-outline" size={18} color={tab === 'requests' ? accentColor : theme.textTertiary} />
            <Text style={[styles.tabText, { color: tab === 'requests' ? accentColor : theme.textTertiary }]}>My Requests</Text>
            {tickets.length > 0 && (
              <View style={[styles.tabBadge, { backgroundColor: accentColor }]}>
                <Text style={styles.tabBadgeText}>{tickets.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <ListSkeleton count={5} />
      ) : tab === 'catalog' ? (
        <ScrollView
          style={styles.content}
          contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          showsVerticalScrollIndicator={false}
        >
          {Object.keys(groupedServices).length === 0 ? (
            <EmptyState 
              icon="construct-outline" 
              title="No services available" 
              subtitle="Services will appear here when configured by your IT team" 
            />
          ) : (
            Object.entries(groupedServices).map(([category, categoryServices]) => (
              <View key={category}>
                <SectionHeader title={category} />
                <View style={styles.section}>
                  {categoryServices.map((service) => (
                    <TouchableOpacity
                      key={service.id}
                      style={[styles.serviceCard, { backgroundColor: theme.surface }]}
                      onPress={() => handleRequestService(service)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.serviceIcon, { backgroundColor: accentColor + '20' }]}>
                        <Ionicons name="construct-outline" size={24} color={accentColor} />
                      </View>
                      <View style={styles.serviceInfo}>
                        <Text style={[styles.serviceName, { color: theme.text }]}>{service.name}</Text>
                        {service.shortDesc && (
                          <Text style={[styles.serviceDesc, { color: theme.textTertiary }]} numberOfLines={2}>
                            {service.shortDesc}
                          </Text>
                        )}
                      </View>
                      <Ionicons name="chevron-forward" size={20} color={theme.textTertiary} />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))
          )}
        </ScrollView>
      ) : (
        <>
          {/* Filters */}
          <View style={styles.filterContainer}>
            {FILTERS.map((f) => (
              <TouchableOpacity
                key={f.key}
                style={[
                  styles.filterChip,
                  { backgroundColor: filter === f.key ? accentColor : theme.surface },
                ]}
                onPress={() => setFilter(f.key)}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.filterChipText,
                  { color: filter === f.key ? '#FFF' : theme.textSecondary }
                ]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView
            style={styles.content}
            contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
            showsVerticalScrollIndicator={false}
          >
            {tickets.length === 0 ? (
              <EmptyState 
                icon="document-text-outline" 
                title="No requests" 
                subtitle="Your service requests will appear here when you submit them" 
              />
            ) : (
              <View style={styles.section}>
                {tickets.map((ticket) => {
                  const statusConfig = getStatusConfig(ticket.status, isDark);
                  const priorityConfig = getPriorityConfig(ticket.priority, isDark);
                  
                  return (
                    <TouchableOpacity
                      key={ticket.id}
                      style={[styles.ticketCard, { backgroundColor: theme.surface }]}
                      onPress={() => handleViewTicket(ticket)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.ticketHeader}>
                        <Text style={[styles.ticketTitle, { color: theme.text }]} numberOfLines={1}>
                          {ticket.title}
                        </Text>
                        <Badge label={statusConfig.label} color={statusConfig.color} bgColor={statusConfig.bg} />
                      </View>
                      <Text style={[styles.ticketDesc, { color: theme.textTertiary }]} numberOfLines={2}>
                        {ticket.description}
                      </Text>
                      <View style={styles.ticketMeta}>
                        <View style={styles.ticketMetaItem}>
                          <Ionicons name="calendar-outline" size={14} color={theme.textTertiary} />
                          <Text style={[styles.ticketMetaText, { color: theme.textTertiary }]}>{formatDate(ticket.createdAt)}</Text>
                        </View>
                        <Badge label={ticket.priority} color={priorityConfig.color} bgColor={priorityConfig.bg} />
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </ScrollView>
        </>
      )}

      {/* Request Service Sheet */}
      <BottomSheet
        visible={showRequestSheet}
        onClose={() => { setShowRequestSheet(false); resetRequestForm(); }}
        title="Request Service"
        leftButton={{ label: 'Cancel', onPress: () => { setShowRequestSheet(false); resetRequestForm(); } }}
        rightButton={{ label: 'Submit', onPress: handleSubmitRequest, disabled: submitting, loading: submitting }}
      >
        <View style={styles.sheetContent}>
          {selectedService && (
            <View style={[styles.selectedServiceCard, { backgroundColor: theme.surface }]}>
              <View style={[styles.serviceIcon, { backgroundColor: accentColor + '20' }]}>
                <Ionicons name="construct-outline" size={24} color={accentColor} />
              </View>
              <View style={styles.serviceInfo}>
                <Text style={[styles.serviceName, { color: theme.text }]}>{selectedService.name}</Text>
                <Text style={[styles.serviceDesc, { color: theme.textTertiary }]}>
                  {selectedService.category?.name || selectedService.categoryName || 'General'}
                </Text>
              </View>
            </View>
          )}

          <Text style={[styles.sheetSectionTitle, { color: theme.textSecondary }]}>TITLE</Text>
          <View style={[styles.inputContainer, { backgroundColor: theme.surfaceSecondary }]}>
            <TextInput
              style={[styles.input, { color: theme.text }]}
              placeholder="Request title"
              placeholderTextColor={theme.textTertiary}
              value={requestTitle}
              onChangeText={setRequestTitle}
            />
          </View>

          <Text style={[styles.sheetSectionTitle, { color: theme.textSecondary }]}>PRIORITY</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
            <View style={styles.chipRow}>
              {['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map((priority) => (
                <Chip
                  key={priority}
                  label={priority}
                  selected={requestPriority === priority}
                  onPress={() => setRequestPriority(priority)}
                />
              ))}
            </View>
          </ScrollView>

          <Text style={[styles.sheetSectionTitle, { color: theme.textSecondary }]}>DESCRIPTION</Text>
          <View style={styles.inputContainer}>
            <DescriptionInputPopover
              value={requestDescription}
              onChangeText={setRequestDescription}
              placeholder="Describe what you need..."
              placeholderTextColor={theme.textTertiary}
            />
          </View>
        </View>
      </BottomSheet>

      {/* Ticket Detail Sheet */}
      <BottomSheet
        visible={showDetailSheet}
        onClose={() => setShowDetailSheet(false)}
        title="Request Details"
        leftButton={{ label: 'Close', onPress: () => setShowDetailSheet(false) }}
        snapPoints={[0.85]}
      >
        {selectedTicket && (
          <View style={styles.sheetContent}>
            {/* Status Banner */}
            <View style={[styles.statusBanner, { backgroundColor: getStatusConfig(selectedTicket.status, isDark).bg }]}>
              <Text style={[styles.statusBannerText, { color: getStatusConfig(selectedTicket.status, isDark).color }]}>
                {getStatusConfig(selectedTicket.status, isDark).label}
              </Text>
            </View>

            {/* Ticket Info */}
            <Text style={[styles.detailTitle, { color: theme.text }]}>{selectedTicket.title}</Text>
            <Text style={[styles.detailDesc, { color: theme.textSecondary }]}>{selectedTicket.description}</Text>
            
            <View style={styles.detailMeta}>
              <View style={styles.detailMetaItem}>
                <Ionicons name="calendar-outline" size={16} color={theme.textTertiary} />
                <Text style={[styles.detailMetaText, { color: theme.textTertiary }]}>
                  Created {formatDate(selectedTicket.createdAt)}
                </Text>
              </View>
              <View style={styles.detailMetaItem}>
                <Ionicons name="flag-outline" size={16} color={theme.textTertiary} />
                <Badge 
                  label={selectedTicket.priority} 
                  color={getPriorityConfig(selectedTicket.priority, isDark).color} 
                  bgColor={getPriorityConfig(selectedTicket.priority, isDark).bg} 
                />
              </View>
              {selectedTicket.service && (
                <View style={styles.detailMetaItem}>
                  <Ionicons name="construct-outline" size={16} color={theme.textTertiary} />
                  <Text style={[styles.detailMetaText, { color: theme.textTertiary }]}>
                    {selectedTicket.service.name}
                  </Text>
                </View>
              )}
            </View>

            {/* Activity */}
            {selectedTicket.activities && selectedTicket.activities.length > 0 && (
              <>
                <Text style={[styles.sheetSectionTitle, { color: theme.textSecondary, marginTop: spacing.xl }]}>ACTIVITY</Text>
                {selectedTicket.activities.map((activity, index) => (
                  <View key={index} style={[styles.activityItem, { backgroundColor: theme.surface }]}>
                    <View style={styles.activityDot} />
                    <View style={styles.activityContent}>
                      <Text style={[styles.activityUser, { color: theme.text }]}>{activity.user.name}</Text>
                      <Text style={[styles.activityMessage, { color: theme.textSecondary }]}>{activity.message}</Text>
                      <Text style={[styles.activityTime, { color: theme.textTertiary }]}>
                        {formatDate(activity.timestamp)}
                      </Text>
                    </View>
                  </View>
                ))}
              </>
            )}
          </View>
        )}
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: spacing.xl, paddingBottom: spacing.md },
  title: { fontSize: 34, fontWeight: '700' },
  subtitle: { fontSize: 15, marginTop: spacing.xs, marginBottom: spacing.lg },
  tabs: { flexDirection: 'row', borderRadius: borderRadius.lg, padding: spacing.xs },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.sm, borderRadius: borderRadius.md, gap: spacing.xs },
  tabActive: {},
  tabText: { fontSize: 14, fontWeight: '600' },
  tabBadge: { minWidth: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginLeft: spacing.xs, paddingHorizontal: 6 },
  tabBadgeText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { flex: 1 },
  section: { paddingHorizontal: spacing.lg, gap: spacing.sm },
  filterContainer: { flexDirection: 'row', paddingHorizontal: spacing.lg, gap: spacing.sm, marginBottom: spacing.md },
  filterChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.md },
  filterChipText: { fontSize: 13, fontWeight: '500' },
  serviceCard: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderRadius: borderRadius.lg },
  serviceIcon: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  serviceInfo: { flex: 1, marginLeft: spacing.md },
  serviceName: { fontSize: 16, fontWeight: '600' },
  serviceDesc: { fontSize: 14, marginTop: 2 },
  ticketCard: { padding: spacing.md, borderRadius: borderRadius.lg },
  ticketHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  ticketTitle: { fontSize: 16, fontWeight: '600', flex: 1, marginRight: spacing.sm },
  ticketDesc: { fontSize: 14, lineHeight: 20, marginBottom: spacing.sm },
  ticketMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ticketMetaItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  ticketMetaText: { fontSize: 13 },
  sheetContent: { paddingHorizontal: spacing.lg },
  selectedServiceCard: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderRadius: borderRadius.lg, marginBottom: spacing.md },
  sheetSectionTitle: { fontSize: 13, fontWeight: '500', marginBottom: spacing.sm, marginTop: spacing.md },
  chipScroll: { marginBottom: spacing.sm },
  chipRow: { flexDirection: 'row', gap: spacing.sm },
  inputContainer: { borderRadius: borderRadius.md, overflow: 'hidden' },
  input: { fontSize: 16, padding: spacing.md },
  textArea: { fontSize: 16, minHeight: 120, lineHeight: 24, padding: spacing.md },
  statusBanner: { padding: spacing.md, borderRadius: borderRadius.md, alignItems: 'center', marginBottom: spacing.lg },
  statusBannerText: { fontSize: 14, fontWeight: '600' },
  detailTitle: { fontSize: 20, fontWeight: '700', marginBottom: spacing.sm },
  detailDesc: { fontSize: 15, lineHeight: 22, marginBottom: spacing.lg },
  detailMeta: { gap: spacing.sm },
  detailMetaItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  detailMetaText: { fontSize: 14 },
  activityItem: { flexDirection: 'row', padding: spacing.md, borderRadius: borderRadius.lg, marginBottom: spacing.sm },
  activityDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginTop: 6, marginRight: spacing.md },
  activityContent: { flex: 1 },
  activityUser: { fontSize: 14, fontWeight: '600' },
  activityMessage: { fontSize: 14, marginTop: 2 },
  activityTime: { fontSize: 12, marginTop: 4 },
});
