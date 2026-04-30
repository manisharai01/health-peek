import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

const STORAGE_KEY = 'hp_theme_mode';
const ThemeContext = createContext(null);

function getInitialMode() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch { /* ignore */ }
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
}

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(getInitialMode);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', mode);
    document.body.setAttribute('data-theme', mode);
    try { localStorage.setItem(STORAGE_KEY, mode); } catch { /* ignore */ }
  }, [mode]);

  const toggleTheme = useCallback(() => {
    setMode((m) => (m === 'dark' ? 'light' : 'dark'));
  }, []);

  const value = { mode, isDark: mode === 'dark', toggleTheme, setTheme: setMode };
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    return { mode: 'light', isDark: false, toggleTheme: () => {}, setTheme: () => {} };
  }
  return ctx;
}

export default ThemeContext;
