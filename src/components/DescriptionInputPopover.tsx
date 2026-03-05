import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { colors, spacing, borderRadius } from '../lib/theme';

interface DescriptionInputPopoverProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  placeholderTextColor?: string;
}

export default function DescriptionInputPopover({
  value,
  onChangeText,
  placeholder = 'Enter description...',
  placeholderTextColor,
}: DescriptionInputPopoverProps) {
  const { isDark, accentColor } = useTheme();
  const theme = isDark ? colors.dark : colors.light;
  const [visible, setVisible] = useState(false);
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    if (visible) {
      setDraft(value);
    }
  }, [visible, value]);

  const handleDone = () => {
    onChangeText(draft);
    setVisible(false);
  };

  const displayText = value || placeholder;
  const isPlaceholder = !value;

  return (
    <>
      <TouchableOpacity
        style={[styles.trigger, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]}
        onPress={() => setVisible(true)}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.triggerText,
            { color: isPlaceholder ? (placeholderTextColor ?? theme.textTertiary) : theme.text },
          ]}
          numberOfLines={2}
        >
          {displayText}
        </Text>
        <Ionicons name="create-outline" size={18} color={theme.textTertiary} />
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setVisible(false)}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardView}
          >
            <Pressable
              style={[styles.popover, { backgroundColor: theme.surface }]}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={[styles.header, { borderBottomColor: theme.border }]}>
                <TouchableOpacity onPress={() => setVisible(false)}>
                  <Text style={[styles.cancelText, { color: theme.textTertiary }]}>Cancel</Text>
                </TouchableOpacity>
                <Text style={[styles.title, { color: theme.text }]}>Description</Text>
                <TouchableOpacity onPress={handleDone} style={[styles.doneButton, { backgroundColor: accentColor }]}>
                  <Ionicons name="checkmark" size={22} color="#FFF" />
                </TouchableOpacity>
              </View>
              <TextInput
                style={[styles.input, { color: theme.text }]}
                value={draft}
                onChangeText={setDraft}
                placeholder={placeholder}
                placeholderTextColor={placeholderTextColor ?? theme.textTertiary}
                multiline
                textAlignVertical="top"
                autoFocus
                autoCapitalize="sentences"
              />
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    minHeight: 48,
  },
  triggerText: {
    flex: 1,
    fontSize: 16,
    marginRight: spacing.sm,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  keyboardView: {
    justifyContent: 'flex-end',
  },
  popover: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: spacing.xl,
    maxHeight: 320,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  cancelText: {
    fontSize: 16,
    width: 60,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
  },
  doneButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    fontSize: 16,
    lineHeight: 24,
    padding: spacing.lg,
    minHeight: 120,
    maxHeight: 200,
  },
});
