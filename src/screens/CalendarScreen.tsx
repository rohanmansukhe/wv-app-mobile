import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, RefreshControl, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../lib/api';
import { colors, spacing, borderRadius } from '../lib/theme';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { Card, Badge, Chip, SectionHeader, EmptyState } from '../components/ui';
import BottomSheet, { ActionButton } from '../components/BottomSheet';
import DatePicker from '../components/DatePicker';
import DescriptionInputPopover from '../components/DescriptionInputPopover';
import { CalendarSkeleton } from '../components/SkeletonLoader';

interface CalendarEvent {
  id: number | string;
  title: string;
  type: string;
  date: string;
  time?: string;
  duration?: number;
  location?: string;
  description?: string;
  source?: 'app' | 'google';
}

interface LeaveBalance {
  type: string;
  totalBalance: number;
  usedDays: number;
  availableBalance: number;
  isActive: boolean;
}

interface Leave {
  id: number;
  type: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: string;
}

interface AttendanceRecord {
  date: number;
  fullDate: string;
  login: string;
  status: string;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const EVENT_COLORS: Record<string, string> = {
  meeting: colors.primary,
  call: colors.success,
  reminder: colors.warning,
  task: colors.accent,
  ooo: '#8B5CF6',
  google: '#4285F4',
};

const LEAVE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  'Annual Leave': 'sunny-outline',
  'Sick Leave': 'medkit-outline',
  'Casual Leave': 'cafe-outline',
  'Emergency Leave': 'alert-circle-outline',
  'Parental Leave': 'heart-outline',
  'Work From Home': 'home-outline',
  default: 'calendar-outline',
};

const getLeaveStatusConfig = (status: string, isDark: boolean) => {
  const configs: Record<string, { color: string; bgLight: string; bgDark: string }> = {
    pending: { color: colors.warning, bgLight: colors.warningLight, bgDark: '#713F12' },
    approved: { color: colors.success, bgLight: colors.successLight, bgDark: '#14532D' },
    rejected: { color: colors.error, bgLight: colors.errorLight, bgDark: '#7F1D1D' },
  };
  const config = configs[status] || configs.pending;
  return { color: config.color, bg: isDark ? config.bgDark : config.bgLight };
};

export default function CalendarScreen() {
  const insets = useSafeAreaInsets();
  const { isDark, accentColor } = useTheme();
  const { showToast } = useToast();
  const theme = isDark ? colors.dark : colors.light;
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  
  const [showApplyLeave, setShowApplyLeave] = useState(false);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [showDayDetail, setShowDayDetail] = useState(false);
  const [applying, setApplying] = useState(false);
  
  // Leave form
  const [leaveType, setLeaveType] = useState('');
  const [leaveStart, setLeaveStart] = useState<Date | null>(null);
  const [leaveEnd, setLeaveEnd] = useState<Date | null>(null);
  const [leaveReason, setLeaveReason] = useState('');
  
  // Event form
  const [eventTitle, setEventTitle] = useState('');
  const [eventType, setEventType] = useState('meeting');
  const [eventDate, setEventDate] = useState<Date | null>(null);
  const [eventTime, setEventTime] = useState('');
  const [eventDuration, setEventDuration] = useState('30');
  const [eventLocation, setEventLocation] = useState('');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const fetchData = useCallback(async () => {
    try {
      const [eventsRes, leavesRes, balanceRes, attendanceRes] = await Promise.all([
        api.getCalendarEvents({ month, year }).catch(() => ({ success: false })),
        api.getMyLeaves({ limit: 100 }).catch(() => ({ success: false, leaves: [] })),
        api.getLeaveBalance().catch(() => ({ success: false, balances: [] })),
        api.getAttendance({ month, year }).catch(() => ({ success: false, attendance: [] })),
      ]);
      
      if (eventsRes.success) setEvents(eventsRes.events || []);
      if (leavesRes.success) setLeaves(leavesRes.leaves || []);
      if (balanceRes.success) setBalances(balanceRes.balances || []);
      if (attendanceRes.success) setAttendance(attendanceRes.attendance || []);
    } catch (err) {
      console.warn('Calendar fetch error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [month, year]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: Array<{ date: number | null; isToday: boolean; events: CalendarEvent[]; leaves: Leave[]; attendance?: AttendanceRecord }> = [];
    
    for (let i = 0; i < firstDay; i++) {
      days.push({ date: null, isToday: false, events: [], leaves: [] });
    }
    
    const today = new Date();
    
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === d;
      
      const dayEvents = events.filter(e => {
        const eventDate = new Date(e.date);
        return eventDate.getFullYear() === year && eventDate.getMonth() === month && eventDate.getDate() === d;
      });
      
      const dayLeaves = leaves.filter(l => {
        const start = new Date(l.startDate);
        const end = new Date(l.endDate);
        const current = new Date(dateStr);
        return current >= start && current <= end;
      });
      
      const dayAttendance = attendance.find(a => a.date === d);
      
      days.push({ date: d, isToday, events: dayEvents, leaves: dayLeaves, attendance: dayAttendance });
    }
    
    return days;
  }, [year, month, events, leaves, attendance]);

  const selectedDayData = useMemo(() => {
    if (!selectedDate) return null;
    const d = selectedDate.getDate();
    return calendarDays.find(day => day.date === d);
  }, [selectedDate, calendarDays]);

  const todayEvents = useMemo(() => {
    const today = new Date();
    return events.filter(e => {
      const eventDate = new Date(e.date);
      return eventDate.toDateString() === today.toDateString();
    }).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  }, [events]);

  const navigateMonth = useCallback((delta: number) => {
    setCurrentDate(new Date(year, month + delta, 1));
  }, [year, month]);

  const SWIPE_THRESHOLD = 50;

  const handleCalendarSwipe = useCallback(
    (e: any) => {
      if (e.nativeEvent.state === State.END) {
        const tx = e.nativeEvent.translationX;
        if (tx > SWIPE_THRESHOLD) navigateMonth(-1);
        else if (tx < -SWIPE_THRESHOLD) navigateMonth(1);
      }
    },
    [navigateMonth]
  );

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const handleDayPress = (day: number) => {
    setSelectedDate(new Date(year, month, day));
    setShowDayDetail(true);
  };

  const formatDateForApi = (date: Date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  const handleApplyLeave = async () => {
    if (!leaveType || !leaveStart || !leaveEnd || !leaveReason.trim()) {
      Alert.alert('Missing Information', 'Please fill all fields');
      return;
    }
    
    setApplying(true);
    try {
      const response = await api.createLeaveRequest({ 
        type: leaveType, 
        startDate: formatDateForApi(leaveStart), 
        endDate: formatDateForApi(leaveEnd), 
        reason: leaveReason 
      });
      if (response.success) {
        showToast('Leave request submitted');
        setShowApplyLeave(false);
        resetLeaveForm();
        fetchData();
      } else {
        Alert.alert('Error', response.message || 'Failed to submit request');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to submit request');
    } finally {
      setApplying(false);
    }
  };

  const handleAddEvent = async () => {
    if (!eventTitle.trim() || !eventDate) {
      Alert.alert('Missing Information', 'Please enter a title and date');
      return;
    }
    
    setApplying(true);
    try {
      const response = await api.createCalendarEvent({
        title: eventTitle,
        type: eventType,
        date: formatDateForApi(eventDate),
        time: eventTime || undefined,
        duration: parseInt(eventDuration) || 30,
        location: eventLocation || undefined,
      });
      if (response.success) {
        showToast('Event created');
        setShowAddEvent(false);
        resetEventForm();
        fetchData();
      } else {
        Alert.alert('Error', response.message || 'Failed to create event');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create event');
    } finally {
      setApplying(false);
    }
  };

  const resetLeaveForm = () => {
    setLeaveType('');
    setLeaveStart(null);
    setLeaveEnd(null);
    setLeaveReason('');
  };

  const resetEventForm = () => {
    setEventTitle('');
    setEventType('meeting');
    setEventDate(null);
    setEventTime('');
    setEventDuration('30');
    setEventLocation('');
  };

  const formatTime = (time?: string) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
  };

  const activeBalances = balances.filter(b => b.isActive);

  const hasLeave = (leaves: Leave[]) => {
    return leaves.length > 0;
  };

  if (loading) {
    return <CalendarSkeleton />;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + spacing.lg }]}>
          <Text style={[styles.title, { color: theme.text }]}>Calendar</Text>
          <Text style={[styles.subtitle, { color: theme.textTertiary }]}>Events, meetings & leaves</Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: accentColor }]} 
            onPress={() => setShowAddEvent(true)}
          >
            <Ionicons name="add" size={18} color="#FFF" />
            <Text style={styles.actionButtonText}>New Event</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: isDark ? theme.surfaceSecondary : '#1C1C1E' }]} 
            onPress={() => setShowApplyLeave(true)}
          >
            <Ionicons name="calendar-outline" size={16} color="#FFF" />
            <Text style={styles.actionButtonText}>Apply Leave</Text>
          </TouchableOpacity>
        </View>

        {/* Month Navigation + Calendar – swipe left/right to change month */}
        <PanGestureHandler
          activeOffsetX={[-25, 25]}
          failOffsetY={[-20, 20]}
          onHandlerStateChange={handleCalendarSwipe}
        >
          <View style={styles.calendarSwipeArea} collapsable={false}>
            <View style={styles.monthNav}>
              <TouchableOpacity onPress={() => navigateMonth(-1)} style={styles.navButton}>
                <Ionicons name="chevron-back" size={24} color={accentColor} />
              </TouchableOpacity>
              <TouchableOpacity onPress={goToToday} style={styles.monthButton}>
                <Text style={[styles.monthTitle, { color: theme.text }]}>{MONTHS[month]} {year}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigateMonth(1)} style={styles.navButton}>
                <Ionicons name="chevron-forward" size={24} color={accentColor} />
              </TouchableOpacity>
            </View>

            {/* Calendar Grid */}
            <View style={[styles.calendarCard, { backgroundColor: theme.surface }]}>
              <View style={styles.weekdayRow}>
                {WEEKDAYS.map(day => (
                  <Text key={day} style={[styles.weekdayText, { color: theme.textTertiary }]}>{day}</Text>
                ))}
              </View>

              <View style={styles.daysGrid}>
                {calendarDays.map((day, index) => {
                  const showLeaveUnderline = day.date && hasLeave(day.leaves);
                  return (
                    <TouchableOpacity
                      key={index}
                      style={[styles.dayCell, day.isToday && { backgroundColor: accentColor, borderRadius: 20 }]}
                      onPress={() => day.date && handleDayPress(day.date)}
                      disabled={!day.date}
                      activeOpacity={0.7}
                    >
                      {day.date && (
                        <>
                          <Text style={[styles.dayNumber, { color: day.isToday ? '#FFF' : theme.text }]}>
                            {day.date}
                          </Text>
                          {showLeaveUnderline && <View style={styles.leaveUnderline} />}
                          <View style={styles.indicators}>
                            {day.events.slice(0, 3).map((e, i) => (
                              <View key={i} style={[styles.eventDot, { backgroundColor: EVENT_COLORS[e.source === 'google' ? 'google' : e.type] || colors.primary }]} />
                            ))}
                          </View>
                          {day.attendance && <View style={[styles.attendanceDot, { backgroundColor: colors.success }]} />}
                        </>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.legend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: accentColor }]} />
                  <Text style={[styles.legendText, { color: theme.textTertiary }]}>Event</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
                  <Text style={[styles.legendText, { color: theme.textTertiary }]}>Attended</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendUnderline, { backgroundColor: '#F59E0B' }]} />
                  <Text style={[styles.legendText, { color: theme.textTertiary }]}>Leave</Text>
                </View>
              </View>
            </View>
          </View>
        </PanGestureHandler>

        {/* Today's Events */}
        {todayEvents.length > 0 && (
          <>
            <SectionHeader title="Today's Schedule" />
            <View style={styles.section}>
              {todayEvents.map(event => (
                <Card key={event.id} style={styles.eventCard}>
                  <View style={styles.eventRow}>
                    <View style={[styles.eventColorBar, { backgroundColor: EVENT_COLORS[event.source === 'google' ? 'google' : event.type] || colors.primary }]} />
                    <View style={styles.eventContent}>
                      <Text style={[styles.eventTitle, { color: theme.text }]}>{event.title}</Text>
                      <View style={styles.eventMeta}>
                        {event.time && <Text style={[styles.eventTime, { color: theme.textTertiary }]}>{formatTime(event.time)}</Text>}
                        {event.duration && <Text style={[styles.eventDuration, { color: theme.textTertiary }]}> • {event.duration} min</Text>}
                      </View>
                    </View>
                    {event.source === 'google' && <Ionicons name="logo-google" size={18} color="#4285F4" />}
                  </View>
                </Card>
              ))}
            </View>
          </>
        )}

        {/* Leave Balance */}
        {activeBalances.length > 0 && (
          <>
            <SectionHeader title="Leave Balance" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.balanceScroll}>
              <View style={styles.balanceRow}>
                {activeBalances.map(balance => (
                  <View key={balance.type} style={[styles.balanceCard, { backgroundColor: theme.surface }]}>
                    <View style={[styles.balanceIcon, { backgroundColor: accentColor + '20' }]}>
                      <Ionicons name={LEAVE_ICONS[balance.type] || LEAVE_ICONS.default} size={20} color={accentColor} />
                    </View>
                    <Text style={[styles.balanceValue, { color: theme.text }]}>{balance.availableBalance}</Text>
                    <Text style={[styles.balanceLabel, { color: theme.textTertiary }]}>of {balance.totalBalance}</Text>
                    <Text style={[styles.balanceType, { color: theme.textSecondary }]} numberOfLines={1}>{balance.type.replace(' Leave', '')}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          </>
        )}

        {/* Recent Leaves */}
        {leaves.length > 0 && (
          <>
            <SectionHeader title="Leave Requests" />
            <View style={styles.section}>
              {leaves.slice(0, 5).map(leave => {
                const statusConfig = getLeaveStatusConfig(leave.status, isDark);
                return (
                  <Card key={leave.id} style={styles.leaveCard}>
                    <View style={styles.leaveRow}>
                      <View style={[styles.leaveIcon, { backgroundColor: accentColor + '20' }]}>
                        <Ionicons name={LEAVE_ICONS[leave.type] || LEAVE_ICONS.default} size={18} color={accentColor} />
                      </View>
                      <View style={styles.leaveContent}>
                        <Text style={[styles.leaveType, { color: theme.text }]}>{leave.type}</Text>
                        <Text style={[styles.leaveDates, { color: theme.textTertiary }]}>
                          {new Date(leave.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} — {new Date(leave.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </Text>
                      </View>
                      <Badge label={leave.status} color={statusConfig.color} bgColor={statusConfig.bg} />
                    </View>
                  </Card>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>

      {/* Day Detail Sheet */}
      <BottomSheet
        visible={showDayDetail}
        onClose={() => setShowDayDetail(false)}
        title={selectedDate?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        leftButton={{ label: 'Close', onPress: () => setShowDayDetail(false) }}
        snapPoints={[0.6]}
      >
        {selectedDayData?.events.length === 0 && selectedDayData?.leaves.length === 0 ? (
          <EmptyState icon="calendar-outline" title="No events" subtitle="Nothing scheduled for this day" />
        ) : (
          <View style={styles.sheetContent}>
            {selectedDayData?.events.map(event => (
              <Card key={event.id} style={styles.sheetCard}>
                <View style={styles.eventRow}>
                  <View style={[styles.eventColorBar, { backgroundColor: EVENT_COLORS[event.source === 'google' ? 'google' : event.type] || colors.primary }]} />
                  <View style={styles.eventContent}>
                    <Text style={[styles.eventTitle, { color: theme.text }]}>{event.title}</Text>
                    {event.time && <Text style={[styles.eventTime, { color: theme.textTertiary }]}>{formatTime(event.time)}</Text>}
                  </View>
                </View>
              </Card>
            ))}
            {selectedDayData?.leaves.map(leave => (
              <Card key={leave.id} style={styles.sheetCard}>
                <View style={styles.leaveRow}>
                  <View style={[styles.leaveIcon, { backgroundColor: colors.warningLight }]}>
                    <Ionicons name={LEAVE_ICONS[leave.type] || LEAVE_ICONS.default} size={18} color={colors.warning} />
                  </View>
                  <View style={styles.leaveContent}>
                    <Text style={[styles.leaveType, { color: theme.text }]}>{leave.type}</Text>
                    <Text style={[styles.leaveDates, { color: theme.textTertiary }]}>{leave.status}</Text>
                  </View>
                </View>
              </Card>
            ))}
          </View>
        )}
      </BottomSheet>

      {/* Apply Leave Sheet */}
      <BottomSheet
        visible={showApplyLeave}
        onClose={() => { setShowApplyLeave(false); resetLeaveForm(); }}
        title="Apply for Leave"
        leftButton={{ label: 'Cancel', onPress: () => { setShowApplyLeave(false); resetLeaveForm(); } }}
        rightButton={{ label: 'Submit', onPress: handleApplyLeave, disabled: applying, loading: applying }}
      >
        <View style={styles.sheetContent}>
          <Text style={[styles.sheetSectionTitle, { color: theme.textSecondary }]}>LEAVE TYPE</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
            <View style={styles.chipRow}>
              {activeBalances.filter(b => b.availableBalance > 0).map(b => (
                <Chip key={b.type} label={`${b.type} (${b.availableBalance})`} selected={leaveType === b.type} onPress={() => setLeaveType(b.type)} />
              ))}
            </View>
          </ScrollView>
          
          <Text style={[styles.sheetSectionTitle, { color: theme.textSecondary }]}>DATES</Text>
          <View style={styles.dateRow}>
            <View style={styles.dateColumn}>
              <DatePicker
                label="Start Date"
                value={leaveStart}
                onChange={setLeaveStart}
                placeholder="Select start"
                minimumDate={new Date()}
              />
            </View>
            <View style={styles.dateColumn}>
              <DatePicker
                label="End Date"
                value={leaveEnd}
                onChange={setLeaveEnd}
                placeholder="Select end"
                minimumDate={leaveStart || new Date()}
              />
            </View>
          </View>
          
          <Text style={[styles.sheetSectionTitle, { color: theme.textSecondary }]}>REASON</Text>
          <View style={styles.inputContainer}>
            <DescriptionInputPopover
              value={leaveReason}
              onChangeText={setLeaveReason}
              placeholder="Reason for leave..."
              placeholderTextColor={theme.textTertiary}
            />
          </View>
        </View>
      </BottomSheet>

      {/* Add Event Sheet */}
      <BottomSheet
        visible={showAddEvent}
        onClose={() => { setShowAddEvent(false); resetEventForm(); }}
        title="New Event"
        leftButton={{ label: 'Cancel', onPress: () => { setShowAddEvent(false); resetEventForm(); } }}
        rightButton={{ label: 'Add', onPress: handleAddEvent, disabled: applying, loading: applying }}
      >
        <View style={styles.sheetContent}>
          <Text style={[styles.sheetSectionTitle, { color: theme.textSecondary }]}>TITLE</Text>
          <View style={[styles.inputContainer, { backgroundColor: theme.surfaceSecondary }]}>
            <TextInput 
              style={[styles.input, { color: theme.text }]} 
              placeholder="Event title" 
              placeholderTextColor={theme.textTertiary} 
              value={eventTitle} 
              onChangeText={setEventTitle} 
            />
          </View>
          
          <Text style={[styles.sheetSectionTitle, { color: theme.textSecondary }]}>TYPE</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
            <View style={styles.chipRow}>
              {['meeting', 'call', 'reminder', 'task', 'ooo'].map(type => (
                <Chip key={type} label={type.charAt(0).toUpperCase() + type.slice(1)} selected={eventType === type} onPress={() => setEventType(type)} />
              ))}
            </View>
          </ScrollView>
          
          <Text style={[styles.sheetSectionTitle, { color: theme.textSecondary }]}>DATE & TIME</Text>
          <DatePicker
            label="Date"
            value={eventDate}
            onChange={setEventDate}
            placeholder="Select date"
          />
          <View style={styles.timeRow}>
            <View style={styles.timeColumn}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Time (optional)</Text>
              <View style={[styles.inputContainer, { backgroundColor: theme.surfaceSecondary }]}>
                <TextInput 
                  style={[styles.input, { color: theme.text }]} 
                  placeholder="HH:MM" 
                  placeholderTextColor={theme.textTertiary} 
                  value={eventTime} 
                  onChangeText={setEventTime} 
                />
              </View>
            </View>
            <View style={styles.timeColumn}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Duration (min)</Text>
              <View style={[styles.inputContainer, { backgroundColor: theme.surfaceSecondary }]}>
                <TextInput 
                  style={[styles.input, { color: theme.text }]} 
                  placeholder="30" 
                  placeholderTextColor={theme.textTertiary} 
                  value={eventDuration} 
                  onChangeText={setEventDuration} 
                  keyboardType="numeric" 
                />
              </View>
            </View>
          </View>
          
          <Text style={[styles.sheetSectionTitle, { color: theme.textSecondary }]}>LOCATION (OPTIONAL)</Text>
          <View style={[styles.inputContainer, { backgroundColor: theme.surfaceSecondary }]}>
            <TextInput 
              style={[styles.input, { color: theme.text }]} 
              placeholder="Meeting location" 
              placeholderTextColor={theme.textTertiary} 
              value={eventLocation} 
              onChangeText={setEventLocation} 
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
  scrollView: { flex: 1 },
  header: { paddingHorizontal: spacing.xl, paddingBottom: spacing.sm },
  title: { fontSize: 34, fontWeight: '700' },
  subtitle: { fontSize: 15, marginTop: spacing.xs },
  actionButtons: { flexDirection: 'row', paddingHorizontal: spacing.lg, gap: spacing.sm, marginTop: spacing.md, marginBottom: spacing.lg },
  actionButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: borderRadius.full, gap: spacing.xs },
  actionButtonText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  calendarSwipeArea: { marginBottom: spacing.md },
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl, marginBottom: spacing.md },
  navButton: { padding: spacing.sm },
  monthButton: { padding: spacing.sm },
  monthTitle: { fontSize: 18, fontWeight: '600' },
  calendarCard: { marginHorizontal: spacing.lg, borderRadius: borderRadius.lg, padding: spacing.md },
  weekdayRow: { flexDirection: 'row', marginBottom: spacing.sm },
  weekdayText: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '600' },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: '14.28%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center', padding: 2, borderRadius: 8 },
  todayCell: { backgroundColor: colors.primary, borderRadius: 20 },
  dayNumber: { fontSize: 15, fontWeight: '500' },
  leaveUnderline: { width: 14, height: 2, backgroundColor: '#F59E0B', borderRadius: 1, marginTop: 2 },
  indicators: { flexDirection: 'row', gap: 2, marginTop: 2 },
  eventDot: { width: 4, height: 4, borderRadius: 2 },
  attendanceDot: { position: 'absolute', bottom: 4, width: 4, height: 4, borderRadius: 2 },
  legend: { flexDirection: 'row', justifyContent: 'center', gap: spacing.lg, marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(0,0,0,0.1)' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendUnderline: { width: 14, height: 2, borderRadius: 1 },
  legendText: { fontSize: 11 },
  section: { paddingHorizontal: spacing.lg },
  balanceScroll: { paddingLeft: spacing.lg },
  balanceRow: { flexDirection: 'row', gap: spacing.md, paddingRight: spacing.lg },
  balanceCard: { width: 100, padding: spacing.md, borderRadius: borderRadius.lg, alignItems: 'center' },
  balanceIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.sm },
  balanceValue: { fontSize: 22, fontWeight: '700' },
  balanceLabel: { fontSize: 11 },
  balanceType: { fontSize: 11, fontWeight: '500', marginTop: spacing.xs, textAlign: 'center' },
  eventCard: { marginBottom: spacing.sm },
  eventRow: { flexDirection: 'row', alignItems: 'center' },
  eventColorBar: { width: 4, alignSelf: 'stretch', borderRadius: 2, marginRight: spacing.md },
  eventContent: { flex: 1 },
  eventTitle: { fontSize: 16, fontWeight: '600' },
  eventMeta: { flexDirection: 'row', marginTop: 2 },
  eventTime: { fontSize: 14 },
  eventDuration: { fontSize: 14 },
  leaveCard: { marginBottom: spacing.sm },
  leaveRow: { flexDirection: 'row', alignItems: 'center' },
  leaveIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  leaveContent: { flex: 1, marginLeft: spacing.md },
  leaveType: { fontSize: 15, fontWeight: '600' },
  leaveDates: { fontSize: 13, marginTop: 2 },
  sheetContent: { paddingHorizontal: spacing.lg },
  sheetCard: { marginBottom: spacing.sm },
  sheetSectionTitle: { fontSize: 13, fontWeight: '500', marginBottom: spacing.sm, marginTop: spacing.md },
  chipScroll: { marginBottom: spacing.sm },
  chipRow: { flexDirection: 'row', gap: spacing.sm },
  dateRow: { flexDirection: 'row', gap: spacing.md },
  dateColumn: { flex: 1 },
  timeRow: { flexDirection: 'row', gap: spacing.md },
  timeColumn: { flex: 1 },
  inputLabel: { fontSize: 14, fontWeight: '500', marginBottom: spacing.sm },
  inputContainer: { borderRadius: borderRadius.md, overflow: 'hidden' },
  input: { fontSize: 16, padding: spacing.md },
  textArea: { fontSize: 16, minHeight: 100, lineHeight: 24, padding: spacing.md },
});
