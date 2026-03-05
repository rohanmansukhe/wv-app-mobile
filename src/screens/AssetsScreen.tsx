import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../lib/api';
import { colors, spacing, borderRadius } from '../lib/theme';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import DescriptionInputPopover from '../components/DescriptionInputPopover';

interface Ticket {
  id: number;
  title: string;
  description: string;
  status: string;
  priority: string;
  device?: { name: string; serialNumber: string };
  createdAt: string;
  updatedAt: string;
}

const getTicketStatusConfig = (status: string, isDark: boolean) => {
  const configs: Record<string, { color: string; bg: string }> = {
    OPEN: { color: colors.primary, bg: colors.primaryLight },
    INPROGRESS: { color: colors.warning, bg: colors.warningLight },
    PENDING: { color: '#FF9500', bg: '#FFF4E5' },
    RESOLVED: { color: colors.success, bg: colors.successLight },
    CLOSED: { color: colors.dark.textTertiary, bg: isDark ? '#2C2C2E' : '#F3F4F6' },
  };
  return configs[status] || configs.OPEN;
};

const getTicketPriorityConfig = (priority: string, isDark: boolean) => {
  const configs: Record<string, { color: string; bg: string }> = {
    LOW: { color: colors.dark.textTertiary, bg: isDark ? '#2C2C2E' : '#F3F4F6' },
    MEDIUM: { color: colors.primary, bg: colors.primaryLight },
    HIGH: { color: colors.warning, bg: colors.warningLight },
    CRITICAL: { color: colors.error, bg: colors.errorLight },
  };
  return configs[priority] || configs.MEDIUM;
};

const getStatusBadgeConfig = (status: string | undefined, isDark: boolean) => {
  switch (status?.toLowerCase()) {
    case 'active':
      return { label: 'Active', color: colors.success, bg: isDark ? '#14532D' : colors.successLight };
    case 'maintenance':
      return { label: 'Maintenance', color: colors.warning, bg: isDark ? '#713F12' : colors.warningLight };
    case 'inactive':
      return { label: 'Inactive', color: colors.error, bg: isDark ? '#7F1D1D' : colors.errorLight };
    case 'assigned':
      return { label: 'Assigned', color: '#8E8E93', bg: '#2C2C2E' };
    default:
      return { label: status || 'Unknown', color: isDark ? '#9CA3AF' : '#6B7280', bg: isDark ? '#374151' : '#F3F4F6' };
  }
};

const getPriorityBadgeConfig = (priority: string, isDark: boolean) => {
  const configs: Record<string, { color: string; bgLight: string; bgDark: string }> = {
    LOW: { color: colors.success, bgLight: colors.successLight, bgDark: '#14532D' },
    MEDIUM: { color: colors.warning, bgLight: colors.warningLight, bgDark: '#713F12' },
    HIGH: { color: '#F97316', bgLight: '#FFF7ED', bgDark: '#7C2D12' },
    URGENT: { color: colors.error, bgLight: colors.errorLight, bgDark: '#7F1D1D' },
  };
  const config = configs[priority] || configs.MEDIUM;
  return { color: config.color, bg: isDark ? config.bgDark : config.bgLight };
};
import { Card, ListItem, EmptyState, Badge, Chip } from '../components/ui';
import BottomSheet, { ActionButton } from '../components/BottomSheet';
import { ListSkeleton } from '../components/SkeletonLoader';

interface Device {
  id: number;
  name: string;
  model: string;
  type: string;
  serialNumber: string;
  macAddress?: string;
  status: string;
  manufacturer?: string;
  purchaseDate?: string;
  warrantyExpiry?: string;
  specifications?: Record<string, string>;
}

interface AssetsScreenProps {
  onNavigateToTickets?: () => void;
}

const DEVICE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  laptop: 'laptop-outline',
  desktop: 'desktop-outline',
  mobile: 'phone-portrait-outline',
  tablet: 'tablet-portrait-outline',
  monitor: 'tv-outline',
  default: 'hardware-chip-outline',
};

const PRIORITY_OPTIONS = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
const PRIORITY_COLORS: Record<string, string> = {
  LOW: colors.success,
  MEDIUM: colors.warning,
  HIGH: '#F97316',
  URGENT: colors.error,
};

export default function AssetsScreen({ onNavigateToTickets }: AssetsScreenProps) {
  const insets = useSafeAreaInsets();
  const { isDark, accentColor } = useTheme();
  const { showToast } = useToast();
  const theme = isDark ? colors.dark : colors.light;
  
  const [tab, setTab] = useState<'assets' | 'tickets'>('assets');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [assets, setAssets] = useState<Device[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showReportIssue, setShowReportIssue] = useState(false);
  const [showTicketDetail, setShowTicketDetail] = useState(false);
  
  // Report issue form
  const [issueTitle, setIssueTitle] = useState('');
  const [issueDescription, setIssueDescription] = useState('');
  const [issuePriority, setIssuePriority] = useState('MEDIUM');
  const [submitting, setSubmitting] = useState(false);

  const fetchAssets = useCallback(async () => {
    try {
      const [assetsRes, ticketsRes] = await Promise.all([
        api.getMyAssets(),
        api.getAssetTickets({ limit: 10, status: 'all' }),
      ]);
      if (assetsRes.success) {
        setAssets(assetsRes.assets || []);
      }
      if (ticketsRes.success) {
        setTickets(ticketsRes.tickets || []);
      }
    } catch (err) {
      console.warn('Assets fetch error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAssets();
  }, [fetchAssets]);

  const filteredAssets = assets.filter((asset) => {
    const query = searchQuery.toLowerCase();
    return (
      asset.name?.toLowerCase().includes(query) ||
      asset.model?.toLowerCase().includes(query) ||
      asset.serialNumber?.toLowerCase().includes(query)
    );
  });

  const getDeviceIcon = (type?: string) => {
    return DEVICE_ICONS[type?.toLowerCase() || 'default'] || DEVICE_ICONS.default;
  };

  const handleDevicePress = (device: Device) => {
    setSelectedDevice(device);
    setShowDetail(true);
  };

  const handleReportIssue = () => {
    setShowDetail(false);
    setTimeout(() => {
      setIssueTitle(`Issue with ${selectedDevice?.name || selectedDevice?.model}`);
      setShowReportIssue(true);
    }, 300);
  };

  const handleSubmitIssue = async () => {
    if (!issueTitle.trim() || !issueDescription.trim()) {
      Alert.alert('Missing Information', 'Please enter a title and description');
      return;
    }
    
    if (!selectedDevice) {
      Alert.alert('Error', 'No device selected');
      return;
    }
    
    setSubmitting(true);
    try {
      const response = await api.createAssetTicket({
        deviceID: selectedDevice.id,
        title: issueTitle,
        description: issueDescription,
        priority: issuePriority,
      });
      
      if (response.success !== false) {
        setShowReportIssue(false);
        resetIssueForm();
        fetchAssets();
        showToast('Issue reported successfully');
      } else {
        Alert.alert('Error', response.message || 'Failed to submit report');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to submit report');
    } finally {
      setSubmitting(false);
    }
  };

  const resetIssueForm = () => {
    setIssueTitle('');
    setIssueDescription('');
    setIssuePriority('MEDIUM');
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const formatTicketDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handleTicketPress = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setShowTicketDetail(true);
  };

  if (loading) {
    return <ListSkeleton count={6} topInset={insets.top + 150} />;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.lg, backgroundColor: theme.background }]}>
        <Text style={[styles.title, { color: theme.text }]}>My Assets</Text>
        <Text style={[styles.subtitle, { color: theme.textTertiary }]}>
          {tab === 'assets'
            ? `${assets.length} device${assets.length !== 1 ? 's' : ''} assigned`
            : `${tickets.length} ticket${tickets.length !== 1 ? 's' : ''}`}
        </Text>

        {/* Tabs */}
        <View style={[styles.tabs, { backgroundColor: theme.surface }]}>
          <TouchableOpacity
            style={[styles.tab, tab === 'assets' && [styles.tabActive, { backgroundColor: accentColor + '20' }]]}
            onPress={() => setTab('assets')}
          >
            <Ionicons name="cube-outline" size={18} color={tab === 'assets' ? accentColor : theme.textTertiary} />
            <Text style={[styles.tabText, { color: tab === 'assets' ? accentColor : theme.textTertiary }]}>Assets</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, tab === 'tickets' && [styles.tabActive, { backgroundColor: accentColor + '20' }]]}
            onPress={() => setTab('tickets')}
          >
            <Ionicons name="ticket-outline" size={18} color={tab === 'tickets' ? accentColor : theme.textTertiary} />
            <Text style={[styles.tabText, { color: tab === 'tickets' ? accentColor : theme.textTertiary }]}>My Tickets</Text>
            {tickets.length > 0 && (
              <View style={[styles.tabBadge, { backgroundColor: accentColor }]}>
                <Text style={styles.tabBadgeText}>{tickets.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Search - only on Assets tab */}
        {tab === 'assets' && (
          <View style={[styles.searchContainer, { backgroundColor: theme.surface }]}>
            <Ionicons name="search" size={20} color={theme.textTertiary} />
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              placeholder="Search devices..."
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
        )}
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {tab === 'assets' ? (
          <>
            {filteredAssets.length === 0 ? (
              <EmptyState
                icon="cube-outline"
                title={searchQuery ? 'No results' : 'No assets assigned'}
                subtitle={searchQuery ? 'Try a different search term' : 'Assets assigned to you will appear here'}
              />
            ) : (
              <View style={styles.section}>
                {filteredAssets.map((device) => {
                  const status = getStatusBadgeConfig(device.status, isDark);
                  return (
                    <TouchableOpacity
                      key={device.id}
                      style={[styles.deviceCard, { backgroundColor: theme.surface }]}
                      onPress={() => handleDevicePress(device)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.deviceRow}>
                        <View style={[styles.deviceIcon, { backgroundColor: accentColor + '20' }]}>
                          <Ionicons name={getDeviceIcon(device.type)} size={24} color={accentColor} />
                        </View>
                        <View style={styles.deviceInfo}>
                          <Text style={[styles.deviceName, { color: theme.text }]}>{device.name || device.model}</Text>
                          <Text style={[styles.deviceSubtitle, { color: theme.textTertiary }]}>{device.type} • {device.serialNumber}</Text>
                        </View>
                        <Badge label={status.label} color={status.color} bgColor={status.bg} />
                        <Ionicons name="chevron-forward" size={20} color={theme.textTertiary} style={{ marginLeft: spacing.sm }} />
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </>
        ) : (
          <View style={styles.ticketsSection}>
            {tickets.length === 0 ? (
              <View style={[styles.ticketsEmpty, { backgroundColor: theme.surface }]}>
                <Ionicons name="ticket-outline" size={32} color={theme.textTertiary} />
                <Text style={[styles.ticketsEmptyText, { color: theme.textTertiary }]}>
                  No tickets yet
                </Text>
                <Text style={[styles.ticketsEmptySubtext, { color: theme.textTertiary }]}>
                  Report an issue on an asset to create a ticket
                </Text>
              </View>
            ) : (
              <View style={[styles.ticketList, styles.ticketListFull]}>
                {tickets.map((ticket) => {
                  const statusConfig = getTicketStatusConfig(ticket.status, isDark);
                  const priorityConfig = getTicketPriorityConfig(ticket.priority, isDark);
                  return (
                    <TouchableOpacity
                      key={ticket.id}
                      style={[styles.ticketCard, { backgroundColor: theme.surface }]}
                      onPress={() => handleTicketPress(ticket)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.ticketCardHeader}>
                        <View style={[styles.ticketStatusDot, { backgroundColor: statusConfig.color }]} />
                        <Text style={[styles.ticketId, { color: theme.textTertiary }]}>#{ticket.id}</Text>
                        <Text style={[styles.ticketDate, { color: theme.textTertiary }]}>
                          {formatTicketDate(ticket.createdAt)}
                        </Text>
                      </View>
                      <Text style={[styles.ticketTitle, { color: theme.text }]} numberOfLines={2}>
                        {ticket.title}
                      </Text>
                      {ticket.device && (
                        <View style={styles.ticketDeviceRow}>
                          <Ionicons name="laptop-outline" size={14} color={theme.textTertiary} />
                          <Text style={[styles.ticketDeviceName, { color: theme.textTertiary }]}>
                            {ticket.device.name}
                          </Text>
                        </View>
                      )}
                      <View style={styles.ticketFooter}>
                        <Badge
                          label={ticket.status.replace(/([A-Z])/g, ' $1').trim()}
                          color={statusConfig.color}
                          bgColor={statusConfig.bg}
                        />
                        <Badge
                          label={ticket.priority}
                          color={priorityConfig.color}
                          bgColor={priorityConfig.bg}
                        />
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
            {tickets.length > 0 && onNavigateToTickets && (
              <TouchableOpacity
                style={[styles.viewAllButton, { backgroundColor: theme.surface }]}
                onPress={onNavigateToTickets}
              >
                <Text style={[styles.viewAllButtonText, { color: accentColor }]}>View all tickets</Text>
                <Ionicons name="chevron-forward" size={18} color={accentColor} />
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>

      {/* Device Detail Sheet */}
      <BottomSheet
        visible={showDetail}
        onClose={() => setShowDetail(false)}
        title="Device Details"
        leftButton={{ label: 'Close', onPress: () => setShowDetail(false) }}
        snapPoints={[0.85]}
      >
        {selectedDevice && (
          <View style={styles.sheetContent}>
            {/* Device Header */}
            <View style={styles.detailHeader}>
              <View style={[styles.detailIcon, { backgroundColor: accentColor + '20' }]}>
                <Ionicons name={getDeviceIcon(selectedDevice.type)} size={40} color={accentColor} />
              </View>
              <Text style={[styles.detailName, { color: theme.text }]}>{selectedDevice.name || selectedDevice.model}</Text>
              <Badge {...getStatusBadgeConfig(selectedDevice.status, isDark)} />
            </View>

            {/* Device Info */}
            <Text style={[styles.sheetSectionTitle, { color: theme.textSecondary }]}>INFORMATION</Text>
            <View style={[styles.infoCard, { backgroundColor: theme.surface }]}>
              <View style={styles.infoRow}>
                <Ionicons name="cube-outline" size={20} color={accentColor} />
                <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Model</Text>
                <Text style={[styles.infoValue, { color: theme.text }]}>{selectedDevice.model}</Text>
              </View>
              <View style={[styles.infoSeparator, { backgroundColor: theme.separator }]} />
              <View style={styles.infoRow}>
                <Ionicons name="barcode-outline" size={20} color={accentColor} />
                <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Serial</Text>
                <Text style={[styles.infoValue, { color: theme.text }]}>{selectedDevice.serialNumber}</Text>
              </View>
              <View style={[styles.infoSeparator, { backgroundColor: theme.separator }]} />
              <View style={styles.infoRow}>
                <Ionicons name="hardware-chip-outline" size={20} color={colors.success} />
                <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Type</Text>
                <Text style={[styles.infoValue, { color: theme.text }]}>{selectedDevice.type}</Text>
              </View>
              {selectedDevice.manufacturer && (
                <>
                  <View style={[styles.infoSeparator, { backgroundColor: theme.separator }]} />
                  <View style={styles.infoRow}>
                    <Ionicons name="business-outline" size={20} color={colors.warning} />
                    <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Manufacturer</Text>
                    <Text style={[styles.infoValue, { color: theme.text }]}>{selectedDevice.manufacturer}</Text>
                  </View>
                </>
              )}
              {selectedDevice.macAddress && (
                <>
                  <View style={[styles.infoSeparator, { backgroundColor: theme.separator }]} />
                  <View style={styles.infoRow}>
                    <Ionicons name="wifi-outline" size={20} color="#06B6D4" />
                    <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>MAC Address</Text>
                    <Text style={[styles.infoValue, { color: theme.text }]}>{selectedDevice.macAddress}</Text>
                  </View>
                </>
              )}
              {selectedDevice.purchaseDate && (
                <>
                  <View style={[styles.infoSeparator, { backgroundColor: theme.separator }]} />
                  <View style={styles.infoRow}>
                    <Ionicons name="calendar-outline" size={20} color="#8B5CF6" />
                    <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Purchased</Text>
                    <Text style={[styles.infoValue, { color: theme.text }]}>{formatDate(selectedDevice.purchaseDate)}</Text>
                  </View>
                </>
              )}
              {selectedDevice.warrantyExpiry && (
                <>
                  <View style={[styles.infoSeparator, { backgroundColor: theme.separator }]} />
                  <View style={styles.infoRow}>
                    <Ionicons name="shield-checkmark-outline" size={20} color={colors.success} />
                    <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Warranty</Text>
                    <Text style={[styles.infoValue, { color: theme.text }]}>{formatDate(selectedDevice.warrantyExpiry)}</Text>
                  </View>
                </>
              )}
            </View>

            {/* Report Issue Button */}
            <View style={styles.reportSection}>
              <ActionButton
                label="Report an Issue"
                onPress={handleReportIssue}
                variant="dark"
                icon="warning-outline"
              />
            </View>
          </View>
        )}
      </BottomSheet>

      {/* Ticket Detail Sheet */}
      <BottomSheet
        visible={showTicketDetail}
        onClose={() => { setShowTicketDetail(false); setSelectedTicket(null); }}
        title="Ticket Details"
        leftButton={{ label: 'Close', onPress: () => { setShowTicketDetail(false); setSelectedTicket(null); } }}
        rightButton={onNavigateToTickets ? {
          label: 'View All',
          onPress: () => {
            setShowTicketDetail(false);
            setSelectedTicket(null);
            onNavigateToTickets();
          },
        } : undefined}
        snapPoints={[0.7]}
      >
        {selectedTicket && (
          <View style={styles.sheetContent}>
            <Text style={[styles.detailName, { color: theme.text }]}>{selectedTicket.title}</Text>
            <View style={styles.ticketDetailBadges}>
              <Badge
                label={selectedTicket.status.replace(/([A-Z])/g, ' $1').trim()}
                color={getTicketStatusConfig(selectedTicket.status, isDark).color}
                bgColor={getTicketStatusConfig(selectedTicket.status, isDark).bg}
              />
              <Badge
                label={selectedTicket.priority}
                color={getTicketPriorityConfig(selectedTicket.priority, isDark).color}
                bgColor={getTicketPriorityConfig(selectedTicket.priority, isDark).bg}
              />
            </View>
            <Text style={[styles.sheetSectionTitle, { color: theme.textSecondary }]}>DESCRIPTION</Text>
            <View style={[styles.infoCard, { backgroundColor: theme.surface }]}>
              <Text style={[styles.ticketDescription, { color: theme.textSecondary }]}>
                {selectedTicket.description || 'No description provided'}
              </Text>
            </View>
            {selectedTicket.device && (
              <>
                <Text style={[styles.sheetSectionTitle, { color: theme.textSecondary }]}>DEVICE</Text>
                <View style={[styles.infoCard, { backgroundColor: theme.surface }]}>
                  <View style={styles.infoRow}>
                    <Ionicons name="cube-outline" size={20} color={accentColor} />
                    <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Name</Text>
                    <Text style={[styles.infoValue, { color: theme.text }]}>{selectedTicket.device.name}</Text>
                  </View>
                  <View style={[styles.infoSeparator, { backgroundColor: theme.separator }]} />
                  <View style={styles.infoRow}>
                    <Ionicons name="barcode-outline" size={20} color={accentColor} />
                    <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Serial</Text>
                    <Text style={[styles.infoValue, { color: theme.text }]}>{selectedTicket.device.serialNumber}</Text>
                  </View>
                </View>
              </>
            )}
            <Text style={[styles.sheetSectionTitle, { color: theme.textSecondary }]}>TIMELINE</Text>
            <View style={[styles.infoCard, { backgroundColor: theme.surface }]}>
              <View style={styles.infoRow}>
                <Ionicons name="create-outline" size={20} color={colors.success} />
                <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Created</Text>
                <Text style={[styles.infoValue, { color: theme.text }]}>{formatDate(selectedTicket.createdAt)}</Text>
              </View>
              <View style={[styles.infoSeparator, { backgroundColor: theme.separator }]} />
              <View style={styles.infoRow}>
                <Ionicons name="refresh-outline" size={20} color={colors.warning} />
                <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Updated</Text>
                <Text style={[styles.infoValue, { color: theme.text }]}>{formatDate(selectedTicket.updatedAt)}</Text>
              </View>
            </View>
          </View>
        )}
      </BottomSheet>

      {/* Report Issue Sheet */}
      <BottomSheet
        visible={showReportIssue}
        onClose={() => { setShowReportIssue(false); resetIssueForm(); }}
        title="Report Issue"
        leftButton={{ label: 'Cancel', onPress: () => { setShowReportIssue(false); resetIssueForm(); } }}
        rightButton={{ label: 'Submit', onPress: handleSubmitIssue, disabled: submitting, loading: submitting }}
      >
        <View style={styles.sheetContent}>
          {/* Device Info */}
          {selectedDevice && (
            <View style={[styles.selectedDeviceCard, { backgroundColor: theme.surface }]}>
              <View style={[styles.deviceIcon, { backgroundColor: accentColor + '20' }]}>
                <Ionicons name={getDeviceIcon(selectedDevice.type)} size={24} color={accentColor} />
              </View>
              <View style={styles.deviceInfo}>
                <Text style={[styles.deviceName, { color: theme.text }]}>{selectedDevice.name || selectedDevice.model}</Text>
                <Text style={[styles.deviceSubtitle, { color: theme.textTertiary }]}>{selectedDevice.serialNumber}</Text>
              </View>
            </View>
          )}

          <Text style={[styles.sheetSectionTitle, { color: theme.textSecondary }]}>TITLE</Text>
          <View style={[styles.inputContainer, { backgroundColor: theme.surfaceSecondary }]}>
            <TextInput
              style={[styles.input, { color: theme.text }]}
              placeholder="Brief description of the issue"
              placeholderTextColor={theme.textTertiary}
              value={issueTitle}
              onChangeText={setIssueTitle}
            />
          </View>

          <Text style={[styles.sheetSectionTitle, { color: theme.textSecondary }]}>PRIORITY</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
            <View style={styles.chipRow}>
              {PRIORITY_OPTIONS.map((priority) => (
                <Chip
                  key={priority}
                  label={priority}
                  selected={issuePriority === priority}
                  onPress={() => setIssuePriority(priority)}
                />
              ))}
            </View>
          </ScrollView>

          <Text style={[styles.sheetSectionTitle, { color: theme.textSecondary }]}>DESCRIPTION</Text>
          <View style={styles.inputContainer}>
            <DescriptionInputPopover
              value={issueDescription}
              onChangeText={setIssueDescription}
              placeholder="Describe the issue in detail..."
              placeholderTextColor={theme.textTertiary}
            />
          </View>
        </View>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: spacing.xl, paddingBottom: spacing.lg },
  title: { fontSize: 34, fontWeight: '700' },
  subtitle: { fontSize: 15, marginTop: spacing.xs, marginBottom: spacing.lg },
  tabs: { flexDirection: 'row', borderRadius: borderRadius.lg, padding: spacing.xs, marginBottom: spacing.md },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.sm, borderRadius: borderRadius.md, gap: spacing.xs },
  tabActive: {},
  tabText: { fontSize: 14, fontWeight: '600' },
  tabBadge: { minWidth: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginLeft: spacing.xs, paddingHorizontal: 6 },
  tabBadgeText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.md, gap: spacing.sm },
  searchInput: { flex: 1, fontSize: 16, paddingVertical: spacing.xs },
  content: { flex: 1 },
  section: { paddingHorizontal: spacing.lg, gap: spacing.sm },
  deviceCard: { borderRadius: borderRadius.lg, padding: spacing.md },
  deviceRow: { flexDirection: 'row', alignItems: 'center' },
  deviceIcon: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  deviceInfo: { flex: 1, marginLeft: spacing.md },
  deviceName: { fontSize: 16, fontWeight: '600' },
  deviceSubtitle: { fontSize: 14, marginTop: 2 },
  sheetContent: { paddingHorizontal: spacing.lg },
  detailHeader: { alignItems: 'center', paddingVertical: spacing.lg },
  detailIcon: { width: 80, height: 80, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.md },
  detailName: { fontSize: 22, fontWeight: '700', marginBottom: spacing.sm },
  sheetSectionTitle: { fontSize: 13, fontWeight: '500', marginBottom: spacing.sm, marginTop: spacing.lg },
  infoCard: { borderRadius: borderRadius.lg, padding: spacing.md },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm },
  infoLabel: { flex: 1, marginLeft: spacing.md, fontSize: 14 },
  infoValue: { fontSize: 14, fontWeight: '500' },
  infoSeparator: { height: StyleSheet.hairlineWidth, marginLeft: 36 },
  reportSection: { marginTop: spacing.xl },
  selectedDeviceCard: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderRadius: borderRadius.lg },
  inputContainer: { borderRadius: borderRadius.md, overflow: 'hidden' },
  input: { fontSize: 16, padding: spacing.md },
  textArea: { fontSize: 16, minHeight: 120, lineHeight: 24, padding: spacing.md },
  chipScroll: { marginBottom: spacing.sm },
  chipRow: { flexDirection: 'row', gap: spacing.sm },
  ticketsSection: { paddingHorizontal: spacing.lg, marginBottom: spacing.xl, marginTop: spacing.sm },
  ticketsEmpty: { borderRadius: borderRadius.lg, padding: spacing.xl, alignItems: 'center' },
  ticketsEmptyText: { fontSize: 16, fontWeight: '600', marginTop: spacing.sm },
  ticketsEmptySubtext: { fontSize: 14, marginTop: spacing.xs },
  ticketList: { gap: spacing.sm },
  ticketCard: { borderRadius: borderRadius.lg, padding: spacing.md },
  ticketCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  ticketStatusDot: { width: 8, height: 8, borderRadius: 4, marginRight: spacing.sm },
  ticketId: { fontSize: 13, fontWeight: '500', flex: 1 },
  ticketDate: { fontSize: 13 },
  ticketTitle: { fontSize: 16, fontWeight: '600', lineHeight: 22, marginBottom: spacing.sm },
  ticketDeviceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.sm },
  ticketDeviceName: { fontSize: 14 },
  ticketFooter: { flexDirection: 'row', gap: spacing.sm },
  ticketListFull: { marginBottom: spacing.md },
  viewAllButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: spacing.md, borderRadius: borderRadius.lg, gap: spacing.sm },
  viewAllButtonText: { fontSize: 16, fontWeight: '600' },
  ticketDetailBadges: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  ticketDescription: { fontSize: 16, lineHeight: 24 },
});
