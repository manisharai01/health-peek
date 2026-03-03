export const COLORS = {
  // Primary palette — matches web gradient (#8b5cf6 → #06b6d4 → #10b981)
  primary: '#8B5CF6',
  primaryDark: '#7C3AED',
  primaryLight: '#A78BFA',
  secondary: '#06B6D4',
  accent: '#10B981',

  // Gradient stops (for LinearGradient)
  gradientStart: '#667EEA',
  gradientMid: '#764BA2',
  gradientEnd: '#F093FB',
  gradientCyan: '#4FACFE',
  gradientGreen: '#43E97B',
  gradientTeal: '#38F9D7',

  // Dark palette (login / headers)
  darkBg: '#0F172A',
  darkCard: '#1E293B',
  darkSurface: '#334155',

  background: '#F1F5F9',
  surface: '#FFFFFF',
  card: '#FFFFFF',

  text: '#1E293B',
  textSecondary: '#64748B',
  textLight: '#94A3B8',
  textOnPrimary: '#FFFFFF',
  textOnDark: '#E2E8F0',

  positive: '#10B981',
  negative: '#EF4444',
  neutral: '#F59E0B',
  mixed: '#A78BFA',

  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#06B6D4',

  border: '#E2E8F0',
  divider: '#F1F5F9',
  shadow: '#0F172A15',
  overlay: '#0F172A60',

  riskLow: '#10B981',
  riskMedium: '#F59E0B',
  riskHigh: '#EF4444',
  riskCritical: '#DC2626',

  priorityLow: '#10B981',
  priorityMedium: '#F59E0B',
  priorityHigh: '#EF4444',
  priorityCritical: '#DC2626',
};

// Gradient presets for LinearGradient
export const GRADIENTS = {
  primary: ['#8B5CF6', '#06B6D4'],
  primaryButton: ['#8B5CF6', '#06B6D4'],
  header: ['#667EEA', '#764BA2'],
  background: ['#667EEA', '#764BA2', '#F093FB', '#4FACFE'],
  dark: ['#0F172A', '#1E293B', '#334155'],
  accent: ['#06B6D4', '#10B981'],
  warm: ['#F093FB', '#4FACFE'],
  card: ['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.85)'],
};

export const FONTS = {
  regular: { fontFamily: 'System', fontWeight: '400' },
  medium: { fontFamily: 'System', fontWeight: '500' },
  semiBold: { fontFamily: 'System', fontWeight: '600' },
  bold: { fontFamily: 'System', fontWeight: '700' },
  sizes: {
    xs: 10,
    sm: 12,
    md: 14,
    lg: 16,
    xl: 18,
    xxl: 22,
    xxxl: 28,
    display: 34,
  },
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  xxxxl: 48,
};

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  full: 999,
};

export const SHADOWS = {
  small: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  medium: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  large: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  glow: {
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
};
