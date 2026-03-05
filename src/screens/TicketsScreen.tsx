import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../lib/api';
import { useTheme } from '../context/ThemeContext';
import { colors, spacing, borderRadius } from '../lib/theme';
import { Card, EmptyState, Chip, Badge, SectionHeader } from '../components/ui';

interface Ticket {
  id: number;
  title: string;
  description: string;
  status: string;
  priority: string;
  device?: { name: string; serialNumber: string };
  assignee?: { name: string };
  createdAt: string;
  updatedAt: string;
}

const STATUS_CONFIG: Record<string, { color: string; bg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  OPEN: { color: colors.primary, bg: colors.primaryLight, icon: 'radio-button-on' },
  INPROGRESS: { color: colors.warning, bg: colors.warningLight, icon: 'time-outline' },
  PENDING: { color: '#FF9500', bg: '#FFF4E5', icon: 'pause-circle-outline' },
  RESOLVED: { color: colors.success, bg: colors.successLight, icon: 'checkmark-circle-outline' },
  CLOSED: { color: colors.dark.textTertiary, bg: colors.light.surfaceSecondary, icon: 'checkmark-done-outline' },
};

const PRIORITY_CONFIG: Record<string, { color: string; bg: string }> = {
  LOW: { color: colors.dark.textTertiary, bg: colors.light.surfaceSecondary },
  MEDIUM: { color: colors.primary, bg: colors.primaryLight },
  HIGH: { color: colors.warning, bg: colors.warningLight },
  CRITICAL: { color: colors.error, bg: colors.errorLight },
};

export default function TicketsScreen() {
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const theme = isDark ? colors.dark : colors.light;
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filter, setFilter] = useState('all');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  const fetchTickets = useCallback(async () => {
    try {
      const response = await api.getAssetTickets({ status: filter, limit: 50 });
      if (response.success) {
        setTickets(response.tickets || []);
      }
    } catch (err) {
      console.warn('Tickets fetch error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchTickets();
  }, [fetchTickets]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: spacing.md }]}>
        <Text style={[styles.title, { color: theme.text }]}>Tickets</Text>
        <Text style={[styles.subtitle, { color: theme.textTertiary }]}>
          {tickets.length} ticket{tickets.length !== 1 ? 's' : ''}
        </Text>
        
        {/* Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filters}>
          {['all', 'open', 'closed'].map((status) => (
            <View key={status} style={{ marginRight: spacing.sm }}>
              <Chip
                label={status.charAt(0).toUpperCase() + status.slice(1)}
                selected={filter === status}
                onPress={() => setFilter(status)}
              />
            </View>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {tickets.length === 0 ? (
          <EmptyState
            icon="ticket-outline"
            title="No tickets"
            subtitle="Your asset tickets will appear here"
          />
        ) : (
          <View style={styles.section}>
            {tickets.map((ticket) => {
              const statusConfig = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.OPEN;
              const priorityConfig = PRIORITY_CONFIG[ticket.priority] || PRIORITY_CONFIG.MEDIUM;
              
              return (
                <TouchableOpacity 
                  key={ticket.id} 
                  activeOpacity={0.7}
                  onPress={() => setSelectedTicket(ticket)}
                >
                  <Card style={styles.ticketCard}>
                    <View style={styles.ticketHeader}>
                      <View style={[styles.statusDot, { backgroundColor: statusConfig.color }]} />
                      <Text style={[styles.ticketId, { color: theme.textTertiary }]}>#{ticket.id}</Text>
                      <Text style={[styles.ticketDate, { color: theme.textTertiary }]}>{formatDate(ticket.createdAt)}</Text>
                    </View>
                    
                    <Text style={[styles.ticketTitle, { color: theme.text }]} numberOfLines={2}>
                      {ticket.title}
                    </Text>
                    
                    {ticket.device && (
                      <View style={styles.deviceInfo}>
                        <Ionicons name="laptop-outline" size={14} color={theme.textTertiary} />
                        <Text style={[styles.deviceName, { color: theme.textTertiary }]}>
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
                  </Card>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Detail Modal */}
      <Modal
        visible={!!selectedTicket}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedTicket(null)}
      >
        {selectedTicket && (
          <View style={[styles.modalContainer, { backgroundColor: theme.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.separator }]}>
              <TouchableOpacity onPress={() => setSelectedTicket(null)}>
                <Text style={[styles.modalClose, { color: colors.primary }]}>Close</Text>
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Ticket Details</Text>
              <View style={{ width: 50 }} />
            </View>
            
            <ScrollView style={styles.modalContent}>
              <Text style={[styles.detailTitle, { color: theme.text }]}>{selectedTicket.title}</Text>
              
              <View style={styles.detailRow}>
                <Badge 
                  label={selectedTicket.status} 
                  color={STATUS_CONFIG[selectedTicket.status]?.color || colors.primary} 
                  bgColor={STATUS_CONFIG[selectedTicket.status]?.bg || colors.primaryLight} 
                />
                <Badge 
                  label={selectedTicket.priority} 
                  color={PRIORITY_CONFIG[selectedTicket.priority]?.color || colors.primary} 
                  bgColor={PRIORITY_CONFIG[selectedTicket.priority]?.bg || colors.primaryLight} 
                />
              </View>
              
              <SectionHeader title="Description" />
              <Card>
                <Text style={[styles.description, { color: theme.textSecondary }]}>
                  {selectedTicket.description || 'No description provided'}
                </Text>
              </Card>
              
              {selectedTicket.device && (
                <>
                  <SectionHeader title="Device" />
                  <Card>
                    <Text style={[styles.deviceDetailName, { color: theme.text }]}>{selectedTicket.device.name}</Text>
                    <Text style={[styles.deviceDetailSerial, { color: theme.textTertiary }]}>
                      {selectedTicket.device.serialNumber}
                    </Text>
                  </Card>
                </>
              )}
              
              <SectionHeader title="Timeline" />
              <Card>
                <View style={styles.timelineItem}>
                  <Ionicons name="create-outline" size={18} color={colors.primary} />
                  <View style={styles.timelineContent}>
                    <Text style={[styles.timelineLabel, { color: theme.textTertiary }]}>Created</Text>
                    <Text style={[styles.timelineValue, { color: theme.text }]}>{formatDate(selectedTicket.createdAt)}</Text>
                  </View>
                </View>
                <View style={styles.timelineItem}>
                  <Ionicons name="refresh-outline" size={18} color={colors.success} />
                  <View style={styles.timelineContent}>
                    <Text style={[styles.timelineLabel, { color: theme.textTertiary }]}>Updated</Text>
                    <Text style={[styles.timelineValue, { color: theme.text }]}>{formatDate(selectedTicket.updatedAt)}</Text>
                  </View>
                </View>
              </Card>
            </ScrollView>
          </View>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 15,
    marginTop: spacing.xs,
  },
  filters: {
    marginTop: spacing.lg,
  },
  content: {
    flex: 1,
  },
  section: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  ticketCard: {
    marginBottom: spacing.md,
  },
  ticketHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.sm,
  },
  ticketId: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  ticketDate: {
    fontSize: 13,
  },
  ticketTitle: {
    fontSize: 17,
    fontWeight: '600',
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  deviceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  deviceName: {
    fontSize: 14,
  },
  ticketFooter: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalClose: {
    fontSize: 17,
    fontWeight: '500',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    paddingTop: spacing.lg,
  },
  detailTitle: {
    fontSize: 22,
    fontWeight: '700',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
  },
  deviceDetailName: {
    fontSize: 17,
    fontWeight: '600',
  },
  deviceDetailSerial: {
    fontSize: 14,
    marginTop: spacing.xs,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  timelineContent: {
    flex: 1,
  },
  timelineLabel: {
    fontSize: 13,
  },
  timelineValue: {
    fontSize: 16,
    fontWeight: '500',
  },
});
