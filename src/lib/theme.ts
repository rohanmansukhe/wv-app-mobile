/** Darken a hex color by a percentage (0-100) */
export function darkenColor(hex: string, percent: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, Math.round((n >> 16) * (1 - percent / 100)));
  const g = Math.max(0, Math.round(((n >> 8) & 0xff) * (1 - percent / 100)));
  const b = Math.max(0, Math.round((n & 0xff) * (1 - percent / 100)));
  return '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('');
}

export const colors = {
  // Primary (default - can be overridden by accent color)
  primary: '#6366F1',
  primaryLight: '#EEF2FF',
  
  // Accent
  accent: '#8B5CF6',
  
  // Semantic
  success: '#34C759',
  successLight: '#E8F8EC',
  warning: '#FF9500',
  warningLight: '#FFF4E5',
  error: '#FF3B30',
  errorLight: '#FFEBEA',
  
  // Neutrals - Light Mode
  light: {
    background: '#F2F2F7',
    surface: '#FFFFFF',
    surfaceSecondary: '#F9F9F9',
    text: '#000000',
    textSecondary: '#3C3C43',
    textTertiary: '#8E8E93',
    border: '#E5E5EA',
    separator: '#C6C6C8',
  },
  
  // Neutrals - Dark Mode
  dark: {
    background: '#000000',
    surface: '#1C1C1E',
    surfaceSecondary: '#2C2C2E',
    text: '#FFFFFF',
    textSecondary: '#EBEBF5',
    textTertiary: '#8E8E93',
    border: '#38383A',
    separator: '#545458',
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
};
