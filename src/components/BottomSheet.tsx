import React, { useEffect, useRef, useCallback } from 'react';
import { 
  View, 
  Text, 
  Modal, 
  TouchableOpacity, 
  StyleSheet, 
  Animated,
  useWindowDimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { colors, spacing, borderRadius } from '../lib/theme';

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  leftButton?: { label: string; onPress: () => void };
  rightButton?: { label: string; onPress: () => void; disabled?: boolean; loading?: boolean };
  children: React.ReactNode;
  snapPoints?: number[];
  showHandle?: boolean;
}

export default function BottomSheet({
  visible,
  onClose,
  title,
  leftButton,
  rightButton,
  children,
  snapPoints = [0.9],
  showHandle = true,
}: BottomSheetProps) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const { isDark, accentColor } = useTheme();
  const theme = isDark ? colors.dark : colors.light;
  
  const translateY = useRef(new Animated.Value(windowHeight)).current;
  const dragOffset = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  
  const sheetHeight = Math.floor(windowHeight * snapPoints[0]);
  const bottomPadding = Math.max(insets.bottom, 16);
  const CLOSE_THRESHOLD = 80;

  useEffect(() => {
    if (visible) {
      dragOffset.setValue(0);
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          damping: 20,
          stiffness: 200,
          mass: 0.8,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: windowHeight,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, translateY, dragOffset, opacity, windowHeight]);

  const handleEdgeSwipeStateChange = useCallback((e: any) => {
    if (e.nativeEvent.state === State.END && e.nativeEvent.translationX > 35) {
      onClose();
    }
  }, [onClose]);

  const handleGestureEvent = Animated.event(
    [{ nativeEvent: { translationY: dragOffset } }],
    { useNativeDriver: true }
  );

  const handleSwipeDownStateChange = useCallback(
    (e: any) => {
      if (e.nativeEvent.state === State.END) {
        const ty = e.nativeEvent.translationY;
        if (ty > CLOSE_THRESHOLD) {
          Animated.parallel([
            Animated.timing(translateY, {
              toValue: windowHeight,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(dragOffset, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }),
          ]).start(() => {
            dragOffset.setValue(0);
            onClose();
          });
        } else {
          Animated.spring(dragOffset, {
            toValue: 0,
            useNativeDriver: true,
            damping: 20,
            stiffness: 200,
          }).start();
        }
      }
    },
    [onClose, windowHeight, dragOffset, translateY]
  );

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.container}>
        <Animated.View style={[styles.overlay, { opacity }]}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
        </Animated.View>

        <PanGestureHandler
          activeOffsetX={25}
          failOffsetY={[-15, 15]}
          onHandlerStateChange={handleEdgeSwipeStateChange}
        >
          <View style={[styles.edgeSwipeZone, { top: insets.top, bottom: 0 }]} collapsable={false} />
        </PanGestureHandler>

        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardView}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <PanGestureHandler
            activeOffsetY={5}
            failOffsetX={[-20, 20]}
            onGestureEvent={handleGestureEvent}
            onHandlerStateChange={handleSwipeDownStateChange}
          >
            <Animated.View
              style={[
                styles.sheet,
                {
                  backgroundColor: theme.surface,
                  height: sheetHeight,
                  maxHeight: sheetHeight,
                  transform: [{ translateY: Animated.add(translateY, dragOffset) }],
                  paddingBottom: bottomPadding,
                },
              ]}
              collapsable={false}
            >
              {showHandle && (
                <View style={styles.handleContainer}>
                  <View style={[styles.handle, { backgroundColor: theme.separator }]} />
                </View>
              )}

              {/* Header */}
              {(title || leftButton || rightButton) && (
                <View style={[styles.header, { borderBottomColor: theme.separator }]}>
                  <View style={styles.headerLeft}>
                    {leftButton ? (
                      <TouchableOpacity onPress={leftButton.onPress} style={styles.headerButton}>
                        <Text style={[styles.headerButtonText, { color: accentColor }]}>
                          {leftButton.label}
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.headerButtonPlaceholder} />
                    )}
                  </View>
                  
                  <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>
                    {title}
                  </Text>
                  
                  <View style={styles.headerRight}>
                    {rightButton ? (
                      <TouchableOpacity 
                        onPress={rightButton.onPress} 
                        style={styles.headerButton}
                        disabled={rightButton.disabled}
                      >
                        <Text style={[
                          styles.headerButtonText, 
                          styles.headerButtonTextBold,
                          { color: accentColor, opacity: rightButton.disabled ? 0.5 : 1 }
                        ]}>
                          {rightButton.loading ? '...' : rightButton.label}
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.headerButtonPlaceholder} />
                    )}
                  </View>
                </View>
              )}

              {/* Content */}
              <ScrollView 
                style={styles.content}
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                bounces={false}
              >
                {children}
              </ScrollView>
            </Animated.View>
          </PanGestureHandler>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

interface ActionButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'dark' | 'destructive';
  icon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
  loading?: boolean;
}

export function ActionButton({ 
  label, 
  onPress, 
  variant = 'primary', 
  icon,
  disabled,
  loading,
}: ActionButtonProps) {
  const { isDark, accentColor } = useTheme();
  const theme = isDark ? colors.dark : colors.light;
  
  const getButtonStyle = () => {
    switch (variant) {
      case 'primary':
        return { backgroundColor: accentColor };
      case 'secondary':
        return { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border };
      case 'dark':
        return { backgroundColor: isDark ? theme.surfaceSecondary : '#1C1C1E' };
      case 'destructive':
        return { backgroundColor: colors.error };
      default:
        return { backgroundColor: accentColor };
    }
  };
  
  const getTextColor = () => {
    switch (variant) {
      case 'primary':
      case 'dark':
      case 'destructive':
        return '#FFF';
      case 'secondary':
        return theme.text;
      default:
        return '#FFF';
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.actionButton,
        getButtonStyle(),
        disabled && { opacity: 0.5 },
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {icon && <Ionicons name={icon} size={20} color={getTextColor()} />}
      <Text style={[styles.actionButtonText, { color: getTextColor() }]}>
        {loading ? 'Loading...' : label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  edgeSwipeZone: {
    position: 'absolute',
    left: 0,
    width: 44,
    zIndex: 999,
  },
  keyboardView: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  handle: {
    width: 36,
    height: 5,
    borderRadius: 2.5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerLeft: {
    flex: 1,
    alignItems: 'flex-start',
  },
  headerRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    flex: 2,
    textAlign: 'center',
  },
  headerButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  headerButtonText: {
    fontSize: 17,
  },
  headerButtonTextBold: {
    fontWeight: '600',
  },
  headerButtonPlaceholder: {
    width: 60,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  actionButtonText: {
    fontSize: 17,
    fontWeight: '600',
  },
});
