import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
  TextInput,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { authService } from '../lib/auth';
import { colors, spacing, borderRadius } from '../lib/theme';
import appConfig from '../lib/appConfig';

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  if (hour < 22) return 'Good Evening';
  return 'Still Working Late';
};

export default function LoginScreen() {
  const { login } = useAuth();
  const insets = useSafeAreaInsets();
  const { isDark, accentColor } = useTheme();
  const theme = isDark ? colors.dark : colors.light;

  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [email, setEmail] = useState('');
  const [greeting, setGreeting] = useState(getGreeting);

  useEffect(() => setGreeting(getGreeting()), []);

  const cancelAuth = () => {
    authService.cancelPolling();
    setLoading(false);
    setStatus(null);
  };

  const handleBrowserLogin = async () => {
    setError(null);
    setLoading(true);
    setStatus('Preparing...');
    try {
      await login('browser', null, (s: string) =>
        setStatus(
          s === 'opening_browser'
            ? 'Opening browser...'
            : s === 'waiting_for_auth'
              ? 'Waiting for you to complete sign-in in browser...'
              : s === 'completed'
                ? 'Login successful!'
                : s
        )
      );
    } catch (err: any) {
      setError(err?.message || 'Login failed');
    } finally {
      setLoading(false);
      setStatus(null);
    }
  };

  const handleEmailLogin = async () => {
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }
    setError(null);
    setLoading(true);
    setStatus('Sending magic link...');
    try {
      await login('email', email, (s: string) =>
        setStatus(
          s === 'opening_browser'
            ? 'Opening browser...'
            : ['waiting_for_auth', 'pending'].includes(s)
              ? 'Check your email, then complete sign-in in browser...'
              : s === 'completed'
                ? 'Login successful!'
                : s
        )
      );
    } catch (err: any) {
      setError(err?.message || 'Login failed');
    } finally {
      setLoading(false);
      setStatus(null);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + 48,
            paddingBottom: insets.bottom + spacing.xl,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.cardWrapper}>
          {/* Translucent card with BlurView - matches app tab bar / profile menu */}
          <View
            style={[
              styles.card,
              {
                borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                backgroundColor: Platform.OS === 'web' ? (isDark ? 'rgba(28,28,30,0.95)' : 'rgba(255,255,255,0.95)') : 'transparent',
              },
            ]}
          >
            {Platform.OS !== 'web' && (
              <BlurView
                intensity={80}
                tint={isDark ? 'dark' : 'light'}
                style={StyleSheet.absoluteFill}
                {...(Platform.OS === 'android' && { experimentalBlurMethod: 'dimezisBlurView' })}
              />
            )}
            <View style={styles.cardContent}>
              {/* Logo - from desktop app */}
              <View style={styles.logoContainer}>
                <Image
                  source={appConfig.logo.full}
                  style={styles.logo}
                  resizeMode="contain"
                  accessibilityLabel={appConfig.name}
                />
              </View>

              <Text style={[styles.greeting, { color: theme.textSecondary }]}>
                {greeting}. Sign in to continue.
              </Text>

              {status && (
                <View
                  style={[
                    styles.statusBox,
                    {
                      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                      borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                    },
                  ]}
                >
                  <View style={styles.statusRow}>
                    {loading && (
                      <ActivityIndicator size="small" color={accentColor} style={styles.statusSpinner} />
                    )}
                    <Text style={[styles.statusText, { color: theme.text }]}>{status}</Text>
                  </View>
                  {loading && (
                    <TouchableOpacity onPress={cancelAuth} style={styles.cancelButton}>
                      <Text style={[styles.cancelText, { color: accentColor }]}>Cancel</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {error && (
                <View style={[styles.errorBox, { backgroundColor: colors.errorLight }]}>
                  <Ionicons name="alert-circle" size={18} color={colors.error} />
                  <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
                </View>
              )}

              {!showEmail ? (
                <View style={styles.authSection}>
                  <TouchableOpacity
                    style={[
                      styles.signInButton,
                      { backgroundColor: accentColor },
                      loading && styles.signInButtonDisabled,
                    ]}
                    onPress={handleBrowserLogin}
                    disabled={loading}
                    activeOpacity={0.8}
                  >
                    <View style={styles.buttonContent}>
                      <Ionicons name="globe-outline" size={20} color="#FFF" />
                      <Text style={styles.signInButtonText}>
                        Login with {appConfig.name}
                      </Text>
                    </View>
                  </TouchableOpacity>
                  <Text style={[styles.hint, { color: theme.textTertiary }]}>
                    Opens your browser for secure authentication
                  </Text>
                  <View style={[styles.separator, { backgroundColor: theme.separator }]} />
                  <TouchableOpacity
                    style={[
                      styles.secondaryButton,
                      {
                        borderColor: theme.separator,
                        borderWidth: StyleSheet.hairlineWidth,
                      },
                    ]}
                    onPress={() => setShowEmail(true)}
                    disabled={loading}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="mail-outline" size={20} color={theme.text} />
                    <Text style={[styles.secondaryButtonText, { color: theme.text }]}>
                      Continue with Email
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.authSection}>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Work Email</Text>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                        borderColor: theme.separator,
                        color: theme.text,
                      },
                    ]}
                    placeholder="name@company.com"
                    placeholderTextColor={theme.textTertiary}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!loading}
                  />
                  <TouchableOpacity
                    style={[
                      styles.signInButton,
                      { backgroundColor: accentColor },
                      loading && styles.signInButtonDisabled,
                    ]}
                    onPress={handleEmailLogin}
                    disabled={loading}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.signInButtonText}>Send Magic Link</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => setShowEmail(false)}
                    disabled={loading}
                  >
                    <Text style={[styles.backButtonText, { color: theme.textTertiary }]}>
                      ← Back to other options
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              <View style={[styles.separator, { backgroundColor: theme.separator }]} />
              <Text style={[styles.footerTagline, { color: theme.textTertiary }]}>
                Enterprise asset management & engagement
              </Text>
              <Text style={[styles.footerCopyright, { color: theme.textTertiary }]}>
                © 2025 {appConfig.name} • v1.0.0
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    justifyContent: 'center',
    minHeight: '100%',
  },
  cardWrapper: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  card: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    ...(Platform.OS === 'ios'
      ? {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.12,
          shadowRadius: 16,
        }
      : { elevation: 6 }),
  },
  cardContent: {
    padding: spacing.xxl,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  logo: {
    height: 48,
    maxWidth: 260,
    width: '100%',
  },
  greeting: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  statusBox: {
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statusSpinner: {
    marginRight: spacing.xs,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  cancelButton: {
    marginTop: spacing.sm,
  },
  cancelText: {
    fontSize: 12,
    fontWeight: '500',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  errorText: {
    fontSize: 14,
    flex: 1,
  },
  authSection: {
    gap: spacing.md,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: -spacing.xs,
  },
  input: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    fontSize: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  signInButton: {
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signInButtonDisabled: {
    opacity: 0.7,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  signInButtonText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '600',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  secondaryButtonText: {
    fontSize: 17,
    fontWeight: '500',
  },
  backButton: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 15,
  },
  hint: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginVertical: spacing.lg,
  },
  footerTagline: {
    fontSize: 12,
    textAlign: 'center',
  },
  footerCopyright: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
});
