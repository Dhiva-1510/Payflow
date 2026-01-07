import { createContext, useContext, useState, useEffect } from 'react';
import { formatCurrency, convertCurrency, getUserCurrency, setUserCurrency } from '../utils/currency';

/**
 * Settings Context
 * Manages global application settings like currency, theme, language, etc.
 */
const SettingsContext = createContext();

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState({
    currency: 'USD',
    theme: 'dark',
    language: 'en',
    timezone: 'UTC',
    notifications: {
      email: true,
      payroll: true,
      system: false
    }
  });

  // Load settings from localStorage on mount
  useEffect(() => {
    loadSettings();
  }, []);

  // Apply theme changes when theme setting changes
  useEffect(() => {
    applyTheme(settings.theme);
  }, [settings.theme]);

  const loadSettings = () => {
    try {
      const savedSettings = localStorage.getItem('userSettings');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        setSettings(prev => ({ ...prev, ...parsed }));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const updateSettings = (newSettings) => {
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);
    
    // Save to localStorage
    try {
      localStorage.setItem('userSettings', JSON.stringify(updatedSettings));
      
      // Update currency utility if currency changed
      if (newSettings.currency) {
        setUserCurrency(newSettings.currency);
      }
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  const applyTheme = (theme) => {
    const root = document.documentElement;
    
    if (theme === 'light') {
      // Light theme colors
      root.style.setProperty('--bg-primary', '#FFFFFF');
      root.style.setProperty('--bg-secondary', '#F8F9FA');
      root.style.setProperty('--bg-tertiary', '#E9ECEF');
      root.style.setProperty('--text-primary', '#212529');
      root.style.setProperty('--text-secondary', '#6C757D');
      root.style.setProperty('--border-color', '#DEE2E6');
      
      // Update body class
      document.body.classList.remove('dark-theme');
      document.body.classList.add('light-theme');
    } else if (theme === 'auto') {
      // Auto theme - detect system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      applyTheme(prefersDark ? 'dark' : 'light');
      return;
    } else {
      // Dark theme (default)
      root.style.setProperty('--bg-primary', '#0F0F0F');
      root.style.setProperty('--bg-secondary', '#202020');
      root.style.setProperty('--bg-tertiary', '#2A2A2A');
      root.style.setProperty('--text-primary', '#F8F8F8');
      root.style.setProperty('--text-secondary', '#F8F8F8CC');
      root.style.setProperty('--border-color', '#FFFFFF14');
      
      // Update body class
      document.body.classList.remove('light-theme');
      document.body.classList.add('dark-theme');
    }
  };

  // Currency formatting functions that use current settings
  const formatCurrencyWithSettings = (amount, options = {}) => {
    return formatCurrency(amount, settings.currency, options);
  };

  const formatCompactCurrencyWithSettings = (amount) => {
    const convertedAmount = convertCurrency(amount, settings.currency);
    const currencySymbol = getCurrencySymbol();
    
    if (convertedAmount >= 1000000000) {
      return `${currencySymbol}${(convertedAmount / 1000000000).toFixed(1)}B`;
    } else if (convertedAmount >= 1000000) {
      return `${currencySymbol}${(convertedAmount / 1000000).toFixed(1)}M`;
    } else if (convertedAmount >= 1000) {
      return `${currencySymbol}${(convertedAmount / 1000).toFixed(0)}K`;
    }
    
    return formatCurrencyWithSettings(convertedAmount);
  };

  const getCurrencySymbol = () => {
    const currencySymbols = {
      USD: '$',
      EUR: '€',
      GBP: '£',
      JPY: '¥',
      INR: '₹',
      CAD: 'C$',
      AUD: 'A$',
      CHF: 'CHF'
    };
    return currencySymbols[settings.currency] || '$';
  };

  const convertCurrencyWithSettings = (amount) => {
    return convertCurrency(amount, settings.currency);
  };

  const value = {
    settings,
    updateSettings,
    loadSettings,
    formatCurrency: formatCurrencyWithSettings,
    formatCompactCurrency: formatCompactCurrencyWithSettings,
    convertCurrency: convertCurrencyWithSettings,
    getCurrencySymbol
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

export default SettingsContext;