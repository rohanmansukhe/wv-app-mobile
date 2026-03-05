import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Modal, Pressable } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { colors, spacing, borderRadius } from '../lib/theme';

interface DatePickerProps {
  label?: string;
  value: Date | null;
  onChange: (date: Date) => void;
  placeholder?: string;
  minimumDate?: Date;
  maximumDate?: Date;
}

export default function DatePicker({
  label,
  value,
  onChange,
  placeholder = 'Select date',
  minimumDate,
  maximumDate,
}: DatePickerProps) {
  const { isDark, accentColor } = useTheme();
  const theme = isDark ? colors.dark : colors.light;
  const insets = useSafeAreaInsets();
  const [showPicker, setShowPicker] = useState(false);
  const [tempDate, setTempDate] = useState(value || new Date());

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleChange = (_event: unknown, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
      if (selectedDate) onChange(selectedDate);
    } else {
      if (selectedDate) setTempDate(selectedDate);
    }
  };

  const handlePress = () => {
    setTempDate(value || new Date());
    setShowPicker(true);
  };

  const handleConfirm = () => {
    onChange(tempDate);
    setShowPicker(false);
  };

  const webInputRef = useRef<HTMLInputElement | null>(null);

  if (Platform.OS === 'web') {
    const handleWebChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const dateValue = e.target.value;
      if (dateValue) {
        const parsed = new Date(dateValue + 'T00:00:00');
        if (!isNaN(parsed.getTime())) {
          onChange(parsed);
        }
      }
    };

    const formatForInput = (date: Date) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    };

    return (
      <View style={styles.container}>
        {label && <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>}
        <TouchableOpacity
          style={[styles.input, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]}
          onPress={() => webInputRef.current?.showPicker?.()}
          activeOpacity={0.7}
        >
          <View style={[styles.iconContainer, { backgroundColor: accentColor + '25' }]}>
            <Ionicons name="calendar" size={16} color={accentColor} />
          </View>
          <Text style={[styles.inputText, { color: value ? theme.text : theme.textTertiary }]}>
            {value ? formatDate(value) : placeholder}
          </Text>
          <Ionicons name="chevron-down" size={16} color={theme.textTertiary} />
          <input
            ref={webInputRef}
            type="date"
            value={value ? formatForInput(value) : ''}
            onChange={handleWebChange}
            min={minimumDate ? formatForInput(minimumDate) : undefined}
            max={maximumDate ? formatForInput(maximumDate) : undefined}
            style={{
              position: 'absolute',
              opacity: 0,
              width: '100%',
              height: '100%',
              cursor: 'pointer',
              left: 0,
              top: 0,
            }}
          />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {label && <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>}
      <TouchableOpacity
        style={[styles.input, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <View style={[styles.iconContainer, { backgroundColor: accentColor + '25' }]}>
          <Ionicons name="calendar" size={16} color={accentColor} />
        </View>
        <Text style={[styles.inputText, { color: value ? theme.text : theme.textTertiary }]}>
          {value ? formatDate(value) : placeholder}
        </Text>
        <Ionicons name="chevron-down" size={16} color={theme.textTertiary} />
      </TouchableOpacity>

      {showPicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={value || new Date()}
          mode="date"
          display="default"
          onChange={handleChange}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
        />
      )}

      {showPicker && Platform.OS === 'ios' && (
        <Modal visible transparent animationType="slide">
          <Pressable style={styles.iosOverlay} onPress={() => setShowPicker(false)}>
            <Pressable style={[styles.iosPickerSheet, { backgroundColor: theme.surface, paddingBottom: insets.bottom + spacing.md }]} onPress={(e) => e.stopPropagation()}>
              <View style={[styles.iosPickerHeader, { borderBottomColor: theme.border }]}>
                <TouchableOpacity onPress={() => setShowPicker(false)}>
                  <Text style={[styles.iosPickerButton, { color: theme.textTertiary }]}>Cancel</Text>
                </TouchableOpacity>
                <Text style={[styles.iosPickerTitle, { color: theme.text }]}>Select Date</Text>
                <TouchableOpacity onPress={handleConfirm}>
                  <Text style={[styles.iosPickerButton, { color: accentColor, fontWeight: '600' }]}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={tempDate}
                mode="date"
                display="spinner"
                onChange={handleChange}
                minimumDate={minimumDate}
                maximumDate={maximumDate}
              />
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: spacing.sm,
  },
  input: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.sm,
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  iosOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  iosPickerSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: spacing.md,
  },
  iosPickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iosPickerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  iosPickerButton: {
    fontSize: 16,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
});
