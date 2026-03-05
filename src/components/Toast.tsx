/**
 * Toast component - shows brief success/error messages
 * Works on web and native
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '../lib/theme';

const TAB_BAR_HEIGHT = 56;

const TOAST_DURATION = 3000;

interface ToastProps {
  message: string;
  visible: boolean;
  onHide: () => void;
  type?: 'success' | 'error' | 'info';
}

export function Toast({ message, visible, onHide, type = 'success' }: ToastProps) {
  const insets = useSafeAreaInsets();
  const opacity = useRef(new Animated.Value(0)).current;
  const bottomOffset = insets.bottom + TAB_BAR_HEIGHT + spacing.md;

  useEffect(() => {
    if (!visible || !message) return;

    Animated.sequence([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.delay(TOAST_DURATION),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => onHide());
  }, [visible, message]);

  if (!visible) return null;

  const bgColor = type === 'success' ? 'rgba(34, 197, 94, 0.85)' : type === 'error' ? 'rgba(239, 68, 68, 0.85)' : 'rgba(99, 102, 241, 0.85)';

  return (
    <Animated.View
      style={[
        styles.wrapper,
        { opacity, bottom: bottomOffset },
      ]}
      pointerEvents="box-none"
    >
      <View style={[styles.container, { backgroundColor: bgColor }]}>
        <Text style={styles.message}>{message}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: spacing.sm,
    alignItems: 'center',
    zIndex: 9999,
  },
  container: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 200,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  message: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
