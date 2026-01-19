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
    currency: 'INR',
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

  // Currency formatting functions that use current settings
  const formatCurrencyWithSettings = (amount, options = {}) => {
    // Since our backend returns amounts in INR, we pass 'INR' explicitly to avoid conversion
    return formatCurrency(amount, 'INR', options);
  };

  const formatCompactCurrencyWithSettings = (amount) => {
    // Since our backend returns amounts in INR, don't convert
    const currencySymbol = '₹'; // INR symbol
    
    if (amount >= 1000000000) {
      return `${currencySymbol}${(amount / 1000000000).toFixed(1)}B`;
    } else if (amount >= 1000000) {
      return `${currencySymbol}${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `${currencySymbol}${(amount / 1000).toFixed(0)}K`;
    }
    
    return formatCurrencyWithSettings(amount);
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