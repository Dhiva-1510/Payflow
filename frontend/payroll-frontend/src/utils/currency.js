/**
 * Currency Utility Functions
 * Handles currency formatting and conversion based on user preferences
 */

// Currency configuration with exchange rates (in a real app, these would come from an API)
export const CURRENCIES = {
  USD: { name: 'US Dollar', symbol: '$', rate: 1.0 },
  EUR: { name: 'Euro', symbol: '€', rate: 0.85 },
  GBP: { name: 'British Pound', symbol: '£', rate: 0.73 },
  JPY: { name: 'Japanese Yen', symbol: '¥', rate: 110.0 },
  INR: { name: 'Indian Rupee', symbol: '₹', rate: 74.5 },
  CAD: { name: 'Canadian Dollar', symbol: 'C$', rate: 1.25 },
  AUD: { name: 'Australian Dollar', symbol: 'A$', rate: 1.35 },
  CHF: { name: 'Swiss Franc', symbol: 'CHF', rate: 0.92 }
};

/**
 * Get user's preferred currency from localStorage
 * @returns {string} Currency code (default: USD)
 */
export const getUserCurrency = () => {
  try {
    const settings = localStorage.getItem('userSettings');
    if (settings) {
      const parsed = JSON.parse(settings);
      return parsed.currency || 'USD';
    }
  } catch (error) {
    console.error('Error getting user currency:', error);
  }
  return 'USD';
};

/**
 * Set user's preferred currency in localStorage
 * @param {string} currency - Currency code
 */
export const setUserCurrency = (currency) => {
  try {
    const settings = JSON.parse(localStorage.getItem('userSettings') || '{}');
    settings.currency = currency;
    localStorage.setItem('userSettings', JSON.stringify(settings));
  } catch (error) {
    console.error('Error setting user currency:', error);
  }
};

/**
 * Convert amount from USD to target currency
 * @param {number} amount - Amount in USD
 * @param {string} targetCurrency - Target currency code
 * @returns {number} Converted amount
 */
export const convertCurrency = (amount, targetCurrency = 'USD') => {
  if (!amount || !CURRENCIES[targetCurrency]) {
    return amount || 0;
  }
  
  const rate = CURRENCIES[targetCurrency].rate;
  return amount * rate;
};

/**
 * Format currency amount with proper symbol and locale
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code (optional, uses user preference)
 * @param {Object} options - Formatting options
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount, currency = null, options = {}) => {
  const targetCurrency = currency || getUserCurrency();
  const currencyInfo = CURRENCIES[targetCurrency] || CURRENCIES.USD;
  
  // Convert from USD if needed
  const convertedAmount = currency ? amount : convertCurrency(amount, targetCurrency);
  
  const defaultOptions = {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    ...options
  };

  try {
    // Use Intl.NumberFormat for proper localization
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: targetCurrency,
      ...defaultOptions
    });
    
    return formatter.format(convertedAmount || 0);
  } catch (error) {
    // Fallback to manual formatting
    const formattedAmount = (convertedAmount || 0).toLocaleString('en-US', defaultOptions);
    return `${currencyInfo.symbol}${formattedAmount}`;
  }
};

/**
 * Format currency for compact display (K, M, B suffixes)
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code (optional, uses user preference)
 * @returns {string} Compact formatted currency string
 */
export const formatCompactCurrency = (amount, currency = null) => {
  const targetCurrency = currency || getUserCurrency();
  const currencyInfo = CURRENCIES[targetCurrency] || CURRENCIES.USD;
  const convertedAmount = currency ? amount : convertCurrency(amount, targetCurrency);
  
  if (convertedAmount >= 1000000000) {
    return `${currencyInfo.symbol}${(convertedAmount / 1000000000).toFixed(1)}B`;
  } else if (convertedAmount >= 1000000) {
    return `${currencyInfo.symbol}${(convertedAmount / 1000000).toFixed(1)}M`;
  } else if (convertedAmount >= 1000) {
    return `${currencyInfo.symbol}${(convertedAmount / 1000).toFixed(0)}K`;
  }
  
  return formatCurrency(convertedAmount, targetCurrency);
};

/**
 * Get currency symbol for a given currency code
 * @param {string} currency - Currency code
 * @returns {string} Currency symbol
 */
export const getCurrencySymbol = (currency = null) => {
  const targetCurrency = currency || getUserCurrency();
  return CURRENCIES[targetCurrency]?.symbol || '$';
};

/**
 * Get all available currencies for selection
 * @returns {Array} Array of currency objects
 */
export const getAvailableCurrencies = () => {
  return Object.entries(CURRENCIES).map(([code, info]) => ({
    code,
    name: info.name,
    symbol: info.symbol
  }));
};

export default {
  CURRENCIES,
  getUserCurrency,
  setUserCurrency,
  convertCurrency,
  formatCurrency,
  formatCompactCurrency,
  getCurrencySymbol,
  getAvailableCurrencies
};