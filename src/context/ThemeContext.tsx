import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme, Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ThemeMode = 'light' | 'dark' | 'system';

export const ACCENT_COLORS = [
  { id: 'indigo', color: '#6366F1', name: 'Indigo' },
  { id: 'blue', color: '#3B82F6', name: 'Blue' },
  { id: 'purple', color: '#8B5CF6', name: 'Purple' },
  { id: 'pink', color: '#EC4899', name: 'Pink' },
  { id: 'red', color: '#EF4444', name: 'Red' },
  { id: 'orange', color: '#F97316', name: 'Orange' },
  { id: 'green', color: '#22C55E', name: 'Green' },
  { id: 'teal', color: '#14B8A6', name: 'Teal' },
];

interface ThemeContextType {
  themeMode: ThemeMode;
  isDark: boolean;
  accentColor: string;
  accentColorId: string;
  setThemeMode: (mode: ThemeMode) => void;
  setAccentColor: (colorId: string) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  themeMode: 'system',
  isDark: false,
  accentColor: '#6366F1',
  accentColorId: 'indigo',
  setThemeMode: () => {},
  setAccentColor: () => {},
});

export const useTheme = () => useContext(ThemeContext);

const THEME_STORAGE_KEY = '@theme_mode';
const ACCENT_STORAGE_KEY = '@accent_color';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const colorSchemeFromHook = useColorScheme();
  const [systemColorScheme, setSystemColorScheme] = useState<'light' | 'dark' | null>(() =>
    colorSchemeFromHook || Appearance.getColorScheme() || 'light'
  );
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [accentColorId, setAccentColorIdState] = useState('indigo');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const resolved = colorSchemeFromHook || Appearance.getColorScheme();
    if (resolved) setSystemColorScheme(resolved);
  }, [colorSchemeFromHook]);

  useEffect(() => {
    loadTheme();
    const listener = Appearance.addChangeListener(({ colorScheme }) => {
      if (colorScheme) setSystemColorScheme(colorScheme);
    });
    return () => listener.remove();
  }, []);

  const loadTheme = async () => {
    try {
      const [storedTheme, storedAccent] = await Promise.all([
        AsyncStorage.getItem(THEME_STORAGE_KEY),
        AsyncStorage.getItem(ACCENT_STORAGE_KEY),
      ]);
      
      if (storedTheme && ['light', 'dark', 'system'].includes(storedTheme)) {
        setThemeModeState(storedTheme as ThemeMode);
      }
      
      if (storedAccent && ACCENT_COLORS.some(c => c.id === storedAccent)) {
        setAccentColorIdState(storedAccent);
      }
    } catch (e) {
      console.warn('Failed to load theme preference');
    } finally {
      setIsLoaded(true);
    }
  };

  const setThemeMode = async (mode: ThemeMode) => {
    setThemeModeState(mode);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch (e) {
      console.warn('Failed to save theme preference');
    }
  };

  const setAccentColor = async (colorId: string) => {
    setAccentColorIdState(colorId);
    try {
      await AsyncStorage.setItem(ACCENT_STORAGE_KEY, colorId);
    } catch (e) {
      console.warn('Failed to save accent color');
    }
  };

  const isDark = themeMode === 'system'
    ? (systemColorScheme === 'dark')
    : themeMode === 'dark';

  const accentColor = ACCENT_COLORS.find(c => c.id === accentColorId)?.color || '#6366F1';

  if (!isLoaded) {
    return null;
  }

  return (
    <ThemeContext.Provider value={{ themeMode, isDark, accentColor, accentColorId, setThemeMode, setAccentColor }}>
      {children}
    </ThemeContext.Provider>
  );
}
