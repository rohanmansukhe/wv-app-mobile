import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Modal, ScrollView, Animated, Platform } from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import LoginScreen from '../screens/LoginScreen';
import DashboardScreen from '../screens/DashboardScreen';
import AssetsScreen from '../screens/AssetsScreen';
import TicketsScreen from '../screens/TicketsScreen';
import CalendarScreen from '../screens/CalendarScreen';
import OrgChartScreen from '../screens/OrgChartScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ServicesScreen from '../screens/ServicesScreen';
import { useAuth } from '../context/AuthContext';
import { useTheme, ACCENT_COLORS } from '../context/ThemeContext';
import { useNotificationsSocket } from '../lib/socket/useNotificationsSocket';
import { colors, spacing, borderRadius } from '../lib/theme';
import BottomSheet from '../components/BottomSheet';
import DailyCheckIn from '../components/DailyCheckIn';
import { AppSkeleton } from '../components/SkeletonLoader';

const Stack = createNativeStackNavigator();

type TabKey = 'home' | 'assets' | 'calendar' | 'services' | 'people';
type SubScreen = 'tickets' | 'notifications' | 'profile' | 'settings' | null;

interface Tab {
  key: TabKey;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
}

const TABS: Tab[] = [
  { key: 'home', label: 'Home', icon: 'home-outline', activeIcon: 'home' },
  { key: 'assets', label: 'Assets', icon: 'cube-outline', activeIcon: 'cube' },
  { key: 'calendar', label: 'Calendar', icon: 'calendar-outline', activeIcon: 'calendar' },
  { key: 'services', label: 'Services', icon: 'construct-outline', activeIcon: 'construct' },
  { key: 'people', label: 'People', icon: 'people-outline', activeIcon: 'people' },
];

function MainScreen() {
  const [activeTab, setActiveTab] = useState<TabKey>('home');
  const [subScreen, setSubScreen] = useState<SubScreen>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const { isDark, themeMode, setThemeMode, accentColor, accentColorId, setAccentColor } = useTheme();
  const theme = isDark ? colors.dark : colors.light;
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { unreadCount } = useNotificationsSocket();
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  const animateTransition = useCallback((callback: () => void, direction: 'left' | 'right' = 'right') => {
    const slideOut = direction === 'right' ? -20 : 20;
    const slideIn = direction === 'right' ? 20 : -20;
    
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 100, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: slideOut, duration: 100, useNativeDriver: true }),
    ]).start(() => {
      callback();
      slideAnim.setValue(slideIn);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, damping: 20, stiffness: 200 }),
      ]).start();
    });
  }, [fadeAnim, slideAnim]);

  const handleQuickAction = useCallback((action: string) => {
    switch (action) {
      case 'newService':
        animateTransition(() => setActiveTab('services'), 'right');
        break;
      case 'applyLeave':
        animateTransition(() => setActiveTab('calendar'), 'right');
        break;
      case 'services':
        animateTransition(() => setActiveTab('services'), 'right');
        break;
      case 'orgChart':
        animateTransition(() => setActiveTab('people'), 'right');
        break;
      case 'notifications':
        animateTransition(() => setSubScreen('notifications'), 'right');
        break;
      case 'assets':
      case 'viewAsset':
        animateTransition(() => setActiveTab('assets'), 'right');
        break;
    }
  }, [animateTransition]);

  const renderScreen = () => {
    if (subScreen === 'tickets') return <TicketsScreen />;
    if (subScreen === 'notifications') return <NotificationsScreen />;
    if (subScreen === 'profile') return <ProfileScreen />;
    
    switch (activeTab) {
      case 'home': return <DashboardScreen onQuickAction={handleQuickAction} />;
      case 'assets': return <AssetsScreen onNavigateToTickets={() => animateTransition(() => setSubScreen('tickets'), 'right')} />;
      case 'calendar': return <CalendarScreen />;
      case 'services': return <ServicesScreen />;
      case 'people': return <OrgChartScreen />;
      default: return <DashboardScreen onQuickAction={handleQuickAction} />;
    }
  };

  const handleTabPress = (key: TabKey) => {
    if (key === activeTab && !subScreen) return;
    const currentIndex = TABS.findIndex(t => t.key === activeTab);
    const newIndex = TABS.findIndex(t => t.key === key);
    const direction = newIndex > currentIndex ? 'right' : 'left';
    
    animateTransition(() => {
      setSubScreen(null);
      setActiveTab(key);
    }, direction);
  };

  const handleSwipeTab = useCallback((direction: 'left' | 'right') => {
    if (subScreen) return;
    const currentIndex = TABS.findIndex(t => t.key === activeTab);
    let newIndex: number;
    if (direction === 'left') {
      newIndex = Math.min(currentIndex + 1, TABS.length - 1);
    } else {
      newIndex = Math.max(currentIndex - 1, 0);
    }
    if (newIndex !== currentIndex) {
      animateTransition(() => {
        setSubScreen(null);
        setActiveTab(TABS[newIndex].key);
      }, direction);
    }
  }, [activeTab, subScreen, animateTransition]);

  const swipeHandlerRef = useRef(handleSwipeTab);
  swipeHandlerRef.current = handleSwipeTab;

  const handleEdgeSwipeBack = useCallback(() => {
    if (showSettings) {
      setShowSettings(false);
    } else if (showProfileMenu) {
      setShowProfileMenu(false);
    } else if (subScreen) {
      animateTransition(() => setSubScreen(null), 'left');
    }
  }, [showSettings, showProfileMenu, subScreen, animateTransition]);

  const edgeSwipeBackRef = useRef(handleEdgeSwipeBack);
  edgeSwipeBackRef.current = handleEdgeSwipeBack;

  const EDGE_SWIPE_THRESHOLD = 35;
  const handleEdgeSwipeStateChange = useCallback((e: any) => {
    if (e.nativeEvent.state === State.END && e.nativeEvent.translationX > EDGE_SWIPE_THRESHOLD) {
      edgeSwipeBackRef.current();
    }
  }, []);

  const SWIPE_THRESHOLD = 50;
  const handleTabBarSwipeStateChange = useCallback((e: any) => {
    if (e.nativeEvent.state === State.END) {
      const { translationX } = e.nativeEvent;
      if (translationX > SWIPE_THRESHOLD) {
        swipeHandlerRef.current('right');
      } else if (translationX < -SWIPE_THRESHOLD) {
        swipeHandlerRef.current('left');
      }
    }
  }, []);

  const getInitials = (name?: string) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name[0]?.toUpperCase() || '?';
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Sub-screen Header */}
      {subScreen && (
        <View style={[styles.subHeader, { paddingTop: insets.top + spacing.sm, backgroundColor: theme.background }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => animateTransition(() => setSubScreen(null), 'left')}>
            <Ionicons name="chevron-back" size={28} color={accentColor} />
            <Text style={[styles.backText, { color: accentColor }]}>Back</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {/* Profile button - show on every main tab */}
      {!subScreen && (
        <View style={[styles.headerActions, { top: insets.top + 16 }]}>
          <TouchableOpacity
            style={[styles.profileButton, { backgroundColor: accentColor }]}
            onPress={() => setShowProfileMenu(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.profileInitials}>{getInitials(user?.name)}</Text>
            {unreadCount > 0 && (
              <View style={styles.profileBadge}>
                <Text style={styles.profileBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      )}
      
      {/* Main Content - extends behind tab bar for translucency */}
      <View style={styles.content}>
        <Animated.View 
          style={[
            styles.animatedContent,
            { 
              opacity: fadeAnim,
              transform: [{ translateX: slideAnim }],
            }
          ]}
        >
          {renderScreen()}
        </Animated.View>
      </View>

      {/* Left edge swipe to go back - like iOS back gesture. Exclude tab bar area so Home tap works. */}
      <PanGestureHandler
        activeOffsetX={20}
        failOffsetY={[-15, 15]}
        onHandlerStateChange={handleEdgeSwipeStateChange}
      >
        <View
          style={[
            styles.edgeSwipeZone,
            { top: insets.top, bottom: subScreen ? 0 : insets.bottom + 70 },
          ]}
          collapsable={false}
        />
      </PanGestureHandler>

      {/* Tab Bar - Blur + translucent, full height, overlays content */}
      {!subScreen && (
        <PanGestureHandler
          activeOffsetX={[-20, 20]}
          failOffsetY={[-25, 25]}
          onHandlerStateChange={handleTabBarSwipeStateChange}
        >
          <View
            style={[
              styles.tabBarWrapper,
              {
                paddingBottom: insets.bottom || spacing.md,
                borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
              },
            ]}
          >
          <BlurView
            intensity={80}
            tint={isDark ? 'dark' : 'light'}
            style={StyleSheet.absoluteFill}
            {...(Platform.OS === 'android' && { experimentalBlurMethod: 'dimezisBlurView' })}
          />
          <View style={styles.tabBar}>
              {TABS.map((tab, index) => {
                const isActive = activeTab === tab.key;
                const isLeftMost = index === 0;
                return (
                  <TouchableOpacity
                    key={tab.key}
                    style={styles.tabItem}
                    onPress={() => handleTabPress(tab.key)}
                    activeOpacity={0.7}
                    hitSlop={{
                      top: 24,
                      bottom: 24,
                      left: isLeftMost ? 24 : 16,
                      right: index === TABS.length - 1 ? 24 : 16,
                    }}
                  >
                    <View style={[styles.tabIconContainer, isActive && { backgroundColor: accentColor + '25' }]}>
                      <Ionicons
                        name={isActive ? tab.activeIcon : tab.icon}
                        size={22}
                        color={isActive ? accentColor : theme.textTertiary}
                      />
                    </View>
                    <Text style={[styles.tabLabel, { color: isActive ? accentColor : theme.textTertiary }]}>
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
          </View>
        </View>
        </PanGestureHandler>
      )}

      {/* Profile Menu Modal */}
      <Modal
        visible={showProfileMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowProfileMenu(false)}
      >
        <View style={{ flex: 1 }}>
          <TouchableOpacity 
            style={styles.modalOverlay} 
            activeOpacity={1} 
            onPress={() => setShowProfileMenu(false)}
          >
          <View style={[styles.profileMenu, { top: insets.top + 70, borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
            <BlurView
              intensity={80}
              tint={isDark ? 'dark' : 'light'}
              style={StyleSheet.absoluteFill}
              {...(Platform.OS === 'android' && { experimentalBlurMethod: 'dimezisBlurView' })}
            />
            <View style={styles.profileMenuContent}>
            {/* User Info */}
            <View style={styles.profileMenuHeader}>
              <View style={[styles.profileMenuAvatar, { backgroundColor: accentColor }]}>
                <Text style={styles.profileMenuInitials}>{getInitials(user?.name)}</Text>
              </View>
              <View style={styles.profileMenuInfo}>
                <Text style={[styles.profileMenuName, { color: theme.text }]}>{user?.name || 'User'}</Text>
                <Text style={[styles.profileMenuEmail, { color: theme.textTertiary }]}>{user?.email}</Text>
              </View>
            </View>

            <View style={[styles.menuDivider, { backgroundColor: theme.separator }]} />

            {/* Menu Items */}
            <TouchableOpacity 
              style={styles.menuItem} 
              onPress={() => { setShowProfileMenu(false); animateTransition(() => setSubScreen('profile'), 'right'); }}
            >
              <Ionicons name="person-outline" size={22} color={theme.text} />
              <Text style={[styles.menuItemText, { color: theme.text }]}>View Profile</Text>
              <Ionicons name="chevron-forward" size={18} color={theme.textTertiary} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.menuItem} 
              onPress={() => { setShowProfileMenu(false); animateTransition(() => setSubScreen('notifications'), 'right'); }}
            >
              <Ionicons name="notifications-outline" size={22} color={theme.text} />
              <Text style={[styles.menuItemText, { color: theme.text }]}>Notifications</Text>
              {unreadCount > 0 && (
                <View style={styles.menuBadge}>
                  <Text style={styles.menuBadgeText}>{unreadCount}</Text>
                </View>
              )}
              <Ionicons name="chevron-forward" size={18} color={theme.textTertiary} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.menuItem} 
              onPress={() => { setShowProfileMenu(false); setShowSettings(true); }}
            >
              <Ionicons name="settings-outline" size={22} color={theme.text} />
              <Text style={[styles.menuItemText, { color: theme.text }]}>Settings</Text>
              <Ionicons name="chevron-forward" size={18} color={theme.textTertiary} />
            </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
          <PanGestureHandler onHandlerStateChange={handleEdgeSwipeStateChange}>
            <View
              style={[styles.edgeSwipeZone, { top: insets.top, bottom: 0 }]}
            />
          </PanGestureHandler>
        </View>
      </Modal>

      {/* Daily Check-in - shows on app load when not yet checked in today */}
      <DailyCheckIn />

      {/* Settings Sheet */}
      <BottomSheet
        visible={showSettings}
        onClose={() => setShowSettings(false)}
        title="Settings"
        leftButton={{ label: 'Done', onPress: () => setShowSettings(false) }}
        snapPoints={[0.75]}
      >
        <View style={styles.settingsContent}>
          <Text style={[styles.settingsSectionTitle, { color: theme.textSecondary }]}>APPEARANCE</Text>
          <View style={[styles.settingsCard, { backgroundColor: theme.surface }]}>
            {(['light', 'dark', 'system'] as const).map((mode, index) => {
              const isSelected = themeMode === mode;
              const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
                light: 'sunny-outline',
                dark: 'moon-outline',
                system: 'phone-portrait-outline',
              };
              const labels: Record<string, string> = {
                light: 'Light',
                dark: 'Dark',
                system: 'System Default',
              };
              
              return (
                <TouchableOpacity
                  key={mode}
                  style={[
                    styles.settingsItem,
                    index < 2 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.separator },
                  ]}
                  onPress={() => setThemeMode(mode)}
                >
                  <View style={[styles.settingsItemIcon, { backgroundColor: mode === 'dark' ? '#2C2C2E' : accentColor + '20' }]}>
                    <Ionicons name={icons[mode]} size={18} color={mode === 'dark' ? '#FFF' : accentColor} />
                  </View>
                  <Text style={[styles.settingsItemText, { color: theme.text }]}>{labels[mode]}</Text>
                  {isSelected && <Ionicons name="checkmark" size={22} color={accentColor} />}
                </TouchableOpacity>
              );
            })}
          </View>
          
          <Text style={[styles.settingsSectionTitle, { color: theme.textSecondary, marginTop: spacing.xl }]}>ACCENT COLOR</Text>
          <View style={[styles.settingsCard, { backgroundColor: theme.surface }]}>
            <View style={styles.colorGrid}>
              {ACCENT_COLORS.map((color) => {
                const isSelected = accentColorId === color.id;
                return (
                  <TouchableOpacity
                    key={color.id}
                    style={[
                      styles.colorOption,
                      { backgroundColor: color.color },
                      isSelected && styles.colorOptionSelected,
                    ]}
                    onPress={() => setAccentColor(color.id)}
                    activeOpacity={0.8}
                  >
                    {isSelected && <Ionicons name="checkmark" size={20} color="#FFF" />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
          
          <Text style={[styles.settingsFooter, { color: theme.textTertiary }]}>
            Choose an accent color to personalize the app's appearance.
          </Text>
        </View>
      </BottomSheet>
    </View>
  );
}

export default function AppNavigator() {
  const { isAuthenticated, loading } = useAuth();
  const { isDark, accentColor } = useTheme();
  const theme = isDark ? colors.dark : colors.light;

  if (loading) {
    return <AppSkeleton />;
  }

  const navTheme = isDark ? {
    ...DarkTheme,
    colors: { ...DarkTheme.colors, primary: accentColor, background: colors.dark.background, card: colors.dark.surface, text: colors.dark.text, border: colors.dark.border },
  } : {
    ...DefaultTheme,
    colors: { ...DefaultTheme.colors, primary: accentColor, background: colors.light.background, card: colors.light.surface, text: colors.light.text, border: colors.light.border },
  };

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <Stack.Screen name="Main" component={MainScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  subHeader: { paddingHorizontal: spacing.sm, paddingBottom: spacing.sm },
  backButton: { flexDirection: 'row', alignItems: 'center' },
  backText: { fontSize: 17, fontWeight: '400' },
  headerActions: { position: 'absolute', right: spacing.lg, zIndex: 10, flexDirection: 'row', gap: spacing.sm },
  headerButton: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  profileButton: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  profileInitials: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  badge: { position: 'absolute', top: -4, right: -4, backgroundColor: colors.error, minWidth: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  badgeText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  content: { flex: 1, overflow: 'hidden' },
  animatedContent: { flex: 1 },
  edgeSwipeZone: {
    position: 'absolute',
    left: 0,
    width: 44,
    zIndex: 999,
  },
  tabBarWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: spacing.xs,
    overflow: 'hidden',
    borderTopWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 10,
  },
  tabBar: { flexDirection: 'row', paddingTop: spacing.xs },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.md, paddingHorizontal: spacing.sm, minHeight: 56 },
  tabIconContainer: { width: 44, height: 28, justifyContent: 'center', alignItems: 'center', borderRadius: 14 },
  tabIconContainerActive: { backgroundColor: colors.primaryLight },
  tabLabel: { fontSize: 10, fontWeight: '500', marginTop: 2 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  profileMenu: { position: 'absolute', right: spacing.lg, width: 280, borderRadius: borderRadius.lg, padding: spacing.md, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8 },
  profileMenuContent: { flex: 1 },
  profileMenuHeader: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm },
  profileMenuAvatar: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  profileMenuInitials: { color: '#FFF', fontSize: 18, fontWeight: '600' },
  profileMenuInfo: { marginLeft: spacing.md, flex: 1 },
  profileMenuName: { fontSize: 16, fontWeight: '600' },
  profileMenuEmail: { fontSize: 13, marginTop: 2 },
  menuDivider: { height: StyleSheet.hairlineWidth, marginVertical: spacing.sm },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, gap: spacing.md },
  menuItemText: { flex: 1, fontSize: 16 },
  menuBadge: { backgroundColor: colors.error, minWidth: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6 },
  menuBadgeText: { color: '#FFF', fontSize: 12, fontWeight: '600' },
  settingsContent: { paddingHorizontal: spacing.lg },
  settingsSectionTitle: { fontSize: 13, fontWeight: '500', marginLeft: spacing.xs, marginBottom: spacing.sm },
  settingsCard: { borderRadius: borderRadius.lg, overflow: 'hidden' },
  settingsItem: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, gap: spacing.md },
  settingsItemIcon: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  settingsItemText: { flex: 1, fontSize: 16 },
  settingsFooter: { fontSize: 13, marginTop: spacing.md, lineHeight: 18 },
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: spacing.md, gap: spacing.md },
  colorOption: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  colorOptionSelected: { borderWidth: 3, borderColor: 'rgba(255,255,255,0.5)' },
  profileBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: colors.error, minWidth: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4, borderWidth: 2, borderColor: '#FFF' },
  profileBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '700' },
});
