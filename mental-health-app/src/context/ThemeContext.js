import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@hp_theme_mode';

// Light palette (matches existing theme)
const LIGHT = {
  primary: '#8B5CF6',
  primaryDark: '#7C3AED',
  primaryLight: '#A78BFA',
  secondary: '#06B6D4',
  accent: '#10B981',

  // Gradient stops (for LinearGradient — kept for backwards compat)
  gradientStart: '#667EEA',
  gradientMid: '#764BA2',
  gradientEnd: '#F093FB',
  gradientCyan: '#4FACFE',
  gradientGreen: '#43E97B',
  gradientTeal: '#38F9D7',

  // Dark surface palette (used by login branding panel — always dark)
  darkBg: '#0F172A',
  darkCard: '#1E293B',
  darkSurface: '#334155',

  background: '#F1F5F9',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  cardElevated: '#FFFFFF',

  text: '#1E293B',
  textSecondary: '#64748B',
  textLight: '#94A3B8',
  textOnPrimary: '#FFFFFF',
  textOnDark: '#E2E8F0',

  border: '#E2E8F0',
  divider: '#F1F5F9',
  shadow: '#0F172A15',
  overlay: '#0F172A60',

  positive: '#10B981',
  negative: '#EF4444',
  neutral: '#F59E0B',
  mixed: '#A78BFA',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#06B6D4',

  riskLow: '#10B981',
  riskMedium: '#F59E0B',
  riskHigh: '#EF4444',
  riskCritical: '#DC2626',

  priorityLow: '#10B981',
  priorityMedium: '#F59E0B',
  priorityHigh: '#EF4444',
  priorityCritical: '#DC2626',

  statusBar: 'dark-content',
  statusBarBg: '#F1F5F9',
};

// Dark palette — calm slate-indigo, easy on the eyes
const DARK = {
  primary: '#A78BFA',
  primaryDark: '#8B5CF6',
  primaryLight: '#C4B5FD',
  secondary: '#22D3EE',
  accent: '#34D399',

  // Gradient stops kept for components that import COLORS.gradient*
  gradientStart: '#312E81',
  gradientMid: '#1E1B4B',
  gradientEnd: '#0E7490',
  gradientCyan: '#0891B2',
  gradientGreen: '#0F766E',
  gradientTeal: '#0D9488',

  // Dark branding surfaces (login panel uses these regardless of mode)
  darkBg: '#0F172A',
  darkCard: '#1E293B',
  darkSurface: '#334155',

  background: '#0F172A',
  surface: '#1E293B',
  card: '#1E293B',
  cardElevated: '#273449',

  text: '#F8FAFC',
  textSecondary: '#CBD5E1',
  textLight: '#94A3B8',
  textOnPrimary: '#0B1020',
  textOnDark: '#F8FAFC',

  border: '#334155',
  divider: '#1F2A3D',
  shadow: '#00000080',
  overlay: '#000000A0',

  positive: '#34D399',
  negative: '#F87171',
  neutral: '#FBBF24',
  mixed: '#C4B5FD',
  success: '#34D399',
  warning: '#FBBF24',
  error: '#F87171',
  info: '#60A5FA',

  riskLow: '#34D399',
  riskMedium: '#FBBF24',
  riskHigh: '#F87171',
  riskCritical: '#EF4444',

  priorityLow: '#34D399',
  priorityMedium: '#FBBF24',
  priorityHigh: '#F87171',
  priorityCritical: '#EF4444',

  statusBar: 'light-content',
  statusBarBg: '#0F172A',
};

const GRADIENTS_LIGHT = {
  primary: ['#8B5CF6', '#06B6D4'],
  primaryButton: ['#8B5CF6', '#06B6D4'],
  header: ['#667EEA', '#764BA2'],
  background: ['#667EEA', '#764BA2', '#F093FB', '#4FACFE'],
  dark: ['#0F172A', '#1E293B', '#334155'],
  accent: ['#06B6D4', '#10B981'],
  warm: ['#F093FB', '#4FACFE'],
  card: ['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.85)'],
};

const GRADIENTS_DARK = {
  primary: ['#7C3AED', '#0891B2'],
  primaryButton: ['#A78BFA', '#22D3EE'],
  header: ['#1E1B4B', '#312E81', '#0E7490'],
  background: ['#0B1020', '#1E1B4B', '#312E81', '#0E7490'],
  dark: ['#020617', '#0B1020', '#141B2E'],
  accent: ['#22D3EE', '#34D399'],
  warm: ['#7C3AED', '#0891B2'],
  card: ['rgba(34,43,69,0.95)', 'rgba(26,34,56,0.85)'],
};

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const systemScheme = Appearance.getColorScheme();
  const [mode, setMode] = useState(systemScheme === 'dark' ? 'dark' : 'light');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved === 'light' || saved === 'dark') setMode(saved);
      } catch {
        // ignore
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

  const setTheme = async (next) => {
    setMode(next);
    try { await AsyncStorage.setItem(STORAGE_KEY, next); } catch { /* ignore */ }
  };

  const toggleTheme = () => setTheme(mode === 'dark' ? 'light' : 'dark');

  const value = useMemo(() => {
    const isDark = mode === 'dark';
    return {
      mode,
      isDark,
      hydrated,
      colors: isDark ? DARK : LIGHT,
      gradients: isDark ? GRADIENTS_DARK : GRADIENTS_LIGHT,
      setTheme,
      toggleTheme,
    };
  }, [mode, hydrated]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    // Safe fallback — return light theme so screens never crash if provider is missing
    return {
      mode: 'light',
      isDark: false,
      hydrated: true,
      colors: LIGHT,
      gradients: GRADIENTS_LIGHT,
      setTheme: () => {},
      toggleTheme: () => {},
    };
  }
  return ctx;
}

export default ThemeContext;
