/**
 * Daily Check-in – matches desktop app behavior
 * Shows modal on app load when user hasn't checked in today and isn't snoozed
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ScrollView,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../lib/api';
import { useToast } from '../context/ToastContext';
import { colors, spacing, borderRadius } from '../lib/theme';

const MOOD_OPTIONS = [
  { value: 1, label: 'Great', emoji: '😊' },
  { value: 2, label: 'Good', emoji: '🙂' },
  { value: 3, label: 'Okay', emoji: '😐' },
  { value: 4, label: 'Tough', emoji: '😔' },
  { value: 5, label: 'Struggling', emoji: '😞' },
];

interface DailyCheckInQuestion {
  id: number;
  type: string;
  label: string;
  required: boolean;
  options?: any;
}

const getOptionsList = (q: DailyCheckInQuestion): Array<{ value?: string; label?: string }> => {
  const opts = q.options;
  if (!opts) return [];
  if (Array.isArray(opts)) return opts;
  if (opts.choices && Array.isArray(opts.choices)) return opts.choices;
  return [];
};

const todayDateString = () => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const getCheckInStorageKey = (userId: string) => `portal_checkin_${userId}`;
const getCheckInSnoozeKey = (userId: string) => `portal_checkin_snooze_${userId}`;

const getTimeGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return { text: 'Good morning', icon: 'sunny-outline' as const };
  if (hour < 17) return { text: 'Good afternoon', icon: 'partly-sunny-outline' as const };
  return { text: 'Good evening', icon: 'moon-outline' as const };
};

interface DailyCheckInProps {
  onClosed?: () => void;
}

export default function DailyCheckIn({ onClosed }: DailyCheckInProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const { isDark, accentColor } = useTheme();
  const theme = isDark ? colors.dark : colors.light;
  const modalWidth = Math.min(screenWidth - spacing.lg * 2, 360);

  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<DailyCheckInQuestion[]>([]);
  const [responses, setResponses] = useState<Record<string | number, string | number | null>>({});
  const [mood, setMood] = useState<number | null>(null);
  const [focus, setFocus] = useState('');
  const [blockers, setBlockers] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const userId = user?.id || 'anonymous';
  const firstName = user?.name?.split(' ')[0] || 'there';
  const greeting = getTimeGreeting();
  const isDynamic = questions.length > 0;

  const hasSubmittedToday = useCallback(async () => {
    try {
      const key = getCheckInStorageKey(userId);
      const val = await AsyncStorage.getItem(key);
      return val === todayDateString();
    } catch {
      return false;
    }
  }, [userId]);

  const markSubmittedToday = useCallback(async () => {
    try {
      await AsyncStorage.setItem(getCheckInStorageKey(userId), todayDateString());
    } catch {}
  }, [userId]);

  const isSnoozed = useCallback(async () => {
    try {
      const val = await AsyncStorage.getItem(getCheckInSnoozeKey(userId));
      if (!val) return false;
      return Date.now() < parseInt(val, 10);
    } catch {
      return false;
    }
  }, [userId]);

  const snoozeCheckIn = useCallback(async () => {
    try {
      await AsyncStorage.setItem(
        getCheckInSnoozeKey(userId),
        String(Date.now() + 60 * 60 * 1000)
      );
    } catch {}
  }, [userId]);

  const clearSnooze = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(getCheckInSnoozeKey(userId));
    } catch {}
  }, [userId]);

  const checkIfNeeded = useCallback(async () => {
    if (await hasSubmittedToday()) return;
    if (await isSnoozed()) return;

    setLoading(true);
    try {
      const todayRes = await api.getDailyCheckInToday().catch(() => ({ success: true, responded: false }));
      if (todayRes?.responded) {
        await markSubmittedToday();
        await clearSnooze();
        setLoading(false);
        return;
      }
      const qRes = await api.getDailyCheckInQuestions().catch(() => ({ success: true, questions: [] }));
      const qs = qRes?.questions || [];
      setQuestions(qs);
      if (qs.length > 0) {
        const initial: Record<string, string | number | null> = {};
        qs.forEach((q) => {
          if (q.type === 'mood_scale') initial[q.id] = null;
          else initial[q.id] = '';
        });
        setResponses(initial);
      }
      setVisible(true);
    } catch {
      setVisible(true);
    } finally {
      setLoading(false);
    }
  }, [hasSubmittedToday, isSnoozed, markSubmittedToday, clearSnooze]);

  useEffect(() => {
    if (user) checkIfNeeded();
  }, [user?.id, checkIfNeeded]);

  const setResponse = (key: string | number, value: string | number | null) => {
    setResponses((prev) => ({ ...prev, [key]: value }));
  };

  const buildPayload = (): Record<string, string | number | null> => {
    if (isDynamic) {
      const out: Record<string, string | number | null> = {};
      questions.forEach((q) => {
        const v = responses[q.id];
        if (q.type === 'mood_scale') out[`q_${q.id}`] = v != null ? Number(v) : null;
        else out[`q_${q.id}`] = v != null ? String(v) : '';
      });
      return out;
    }
    return {
      mood: mood != null ? mood : null,
      focus: focus.trim() || null,
      blockers: blockers.trim() || null,
    };
  };

  const canSubmit = () => {
    if (isDynamic) {
      const required = questions.filter((q) => q.required);
      return required.every((q) => {
        const v = responses[q.id];
        return v != null && (typeof v !== 'string' || v.trim() !== '');
      });
    }
    return mood != null;
  };

  const handleSubmit = async () => {
    if (!canSubmit()) return;
    setSubmitting(true);
    try {
      const payload = buildPayload();
      await api.submitDailyCheckIn(payload);
      await markSubmittedToday();
      await clearSnooze();
      setSubmitted(true);
      showToast('Check-in saved. Have a great day!');
      setTimeout(() => {
        setVisible(false);
        onClosed?.();
      }, 1500);
    } catch (e) {
      showToast('Failed to save check-in. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = async () => {
    await snoozeCheckIn();
    setVisible(false);
    onClosed?.();
  };

  if (loading || !visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={handleSkip}
      >
        <TouchableOpacity
          style={[styles.modal, { backgroundColor: theme.surface, width: modalWidth }]}
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Compact header */}
          <View style={[styles.header, { backgroundColor: accentColor }]}>
            <Text style={styles.headerTitle}>
              {greeting.text}, {firstName}!
            </Text>
          </View>

          <ScrollView
            style={styles.body}
            contentContainerStyle={[styles.bodyContent, { paddingBottom: insets.bottom + spacing.lg }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {submitted ? (
              <View style={styles.success}>
                <Ionicons name="checkmark-circle" size={48} color={accentColor} />
                <Text style={[styles.successTitle, { color: theme.text }]}>Done!</Text>
              </View>
            ) : isDynamic ? (
              <View style={styles.questions}>
                {questions.map((q) => (
                  <View key={q.id} style={styles.questionBlock}>
                    <Text style={[styles.questionLabel, { color: theme.text }]}>
                      {q.label}
                      {q.required && <Text style={styles.required}> *</Text>}
                    </Text>
                    {q.type === 'mood_scale' && (
                      <View style={styles.moodRow}>
                        {MOOD_OPTIONS.map((opt) => (
                          <TouchableOpacity
                            key={opt.value}
                            style={[
                              styles.moodOption,
                              {
                                borderColor: responses[q.id] === opt.value ? accentColor : theme.separator,
                                backgroundColor: responses[q.id] === opt.value ? accentColor + '20' : 'transparent',
                              },
                            ]}
                            onPress={() => setResponse(q.id, opt.value)}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.moodEmoji}>{opt.emoji}</Text>
                            <Text style={[styles.moodLabel, { color: theme.textSecondary }]}>{opt.label}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                    {q.type === 'text' && (
                      <TextInput
                        style={[styles.input, { backgroundColor: theme.surfaceSecondary, color: theme.text }]}
                        placeholder="Your answer..."
                        placeholderTextColor={theme.textTertiary}
                        value={(responses[q.id] as string) ?? ''}
                        onChangeText={(t) => setResponse(q.id, t)}
                      />
                    )}
                    {q.type === 'single_choice' && (
                      <View style={styles.choiceRow}>
                        {getOptionsList(q).map((opt) => {
                          const val = opt.value ?? opt;
                          const label = opt.label ?? opt;
                          const sel = responses[q.id] === val;
                          return (
                            <TouchableOpacity
                              key={String(val)}
                              style={[
                                styles.choiceChip,
                                { backgroundColor: sel ? accentColor : theme.surfaceSecondary },
                              ]}
                              onPress={() => setResponse(q.id, val)}
                              activeOpacity={0.7}
                            >
                              <Text style={[styles.choiceChipText, { color: sel ? '#FFF' : theme.text }]}>
                                {label}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}
                  </View>
                ))}
              </View>
            ) : (
              <>
                <Text style={[styles.sectionLabel, { color: theme.textTertiary }]}>How are you feeling?</Text>
                <View style={styles.moodRow}>
                  {MOOD_OPTIONS.map((opt) => (
                    <TouchableOpacity
                      key={opt.value}
                      style={[
                        styles.moodOption,
                        {
                          borderColor: mood === opt.value ? accentColor : theme.separator,
                          backgroundColor: mood === opt.value ? accentColor + '20' : 'transparent',
                        },
                      ]}
                      onPress={() => setMood(opt.value)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.moodEmoji}>{opt.emoji}</Text>
                      <Text style={[styles.moodLabel, { color: theme.textSecondary }]}>{opt.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={[styles.sectionLabel, { color: theme.textTertiary, marginTop: spacing.lg }]}>
                  Focus today
                </Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.surfaceSecondary, color: theme.text }]}
                  placeholder="e.g. Finish the report"
                  placeholderTextColor={theme.textTertiary}
                  value={focus}
                  onChangeText={setFocus}
                />
                <Text style={[styles.sectionLabel, { color: theme.textTertiary, marginTop: spacing.lg }]}>
                  Blockers
                </Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.surfaceSecondary, color: theme.text }]}
                  placeholder="e.g. Waiting on feedback"
                  placeholderTextColor={theme.textTertiary}
                  value={blockers}
                  onChangeText={setBlockers}
                />
              </>
            )}

            {!submitted && (
              <View style={styles.footer}>
                <TouchableOpacity
                  style={[styles.footerBtn, styles.footerBtnOutline, { borderColor: theme.separator }]}
                  onPress={handleSkip}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.footerBtnText, { color: theme.text }]}>Skip</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.footerBtn,
                    styles.footerBtnPrimary,
                    { backgroundColor: accentColor },
                    (!canSubmit() || submitting) && { opacity: 0.5 },
                  ]}
                  onPress={handleSubmit}
                  disabled={!canSubmit() || submitting}
                  activeOpacity={0.7}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.footerBtnPrimaryText}>Done</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modal: {
    maxHeight: '85%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
  body: {
    maxHeight: 400,
  },
  bodyContent: {
    padding: spacing.xl,
    paddingBottom: spacing.lg,
  },
  success: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.md,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  questions: {
    gap: spacing.xl,
  },
  questionBlock: {
    gap: spacing.sm,
  },
  questionLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  required: {
    color: colors.error,
  },
  moodRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  moodOption: {
    flex: 1,
    minWidth: 52,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    borderRadius: 12,
    borderWidth: 2,
    minHeight: 56,
  },
  moodEmoji: {
    fontSize: 20,
  },
  moodLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  input: {
    borderRadius: 12,
    padding: spacing.md,
    fontSize: 15,
    minHeight: 44,
  },
  choiceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  choiceChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 18,
  },
  choiceChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    marginTop: spacing.xl,
    gap: spacing.md,
    justifyContent: 'flex-end',
  },
  footerBtn: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 12,
    minHeight: 44,
    justifyContent: 'center',
  },
  footerBtnOutline: {
    borderWidth: 1,
  },
  footerBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  footerBtnPrimary: {
    minWidth: 80,
    alignItems: 'center',
  },
  footerBtnPrimaryText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
  },
});
