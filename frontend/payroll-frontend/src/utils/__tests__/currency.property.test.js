/**
 * Property-Based Tests for Currency Formatting
 * Feature: advanced-dashboard-summary, Property 4: Currency and number formatting consistency
 * Validates: Requirements 1.4, 5.4
 */

import * as fc from 'fast-check';
import {
  formatCurrency,
  formatCompactCurrency,
  getCurrencySymbol,
  CURRENCIES,
  convertCurrency
} from '../currency';

describe('Currency Formatting Property Tests', () => {
  /**
   * Property 4: Currency and number formatting consistency
   * For any numeric value displayed on the dashboard, it should be formatted with proper locale formatting, currency symbols, and thousand separators
   * Validates: Requirements 1.4, 5.4
   */
  test('should format any numeric value with proper locale formatting, currency symbols, and thousand separators', () => {
    // Generate arbitrary amounts and currency codes
    const amountArbitrary = fc.float({ 
      min: 0, 
      max: Math.fround(999999999), 
      noNaN: true, 
      noDefaultInfinity: true 
    });
    const currencyArbitrary = fc.constantFrom(...Object.keys(CURRENCIES));

    fc.assert(
      fc.property(amountArbitrary, currencyArbitrary, (amount, currency) => {
        const formatted = formatCurrency(amount, currency);
        const currencyInfo = CURRENCIES[currency];
        
        // Property 1: Result should be a non-empty string
        expect(typeof formatted).toBe('string');
        expect(formatted.length).toBeGreaterThan(0);
        
        // Property 2: Should contain currency information 
        // The formatted string should contain some form of currency identifier
        const containsCurrencyInfo = 
          formatted.includes(currencyInfo.symbol) || // Custom symbol like "€", "£"
          formatted.includes(currency) || // Full currency code like "USD", "CAD"
          formatted.includes(currency.substring(0, 2)) || // Partial code like "CA" from "CAD"
          /[\$€£¥₹]/.test(formatted); // Common currency symbols
        
        expect(containsCurrencyInfo).toBe(true);
        
        // Property 3: For amounts >= 1000, should contain thousand separators (commas)
        if (amount >= 1000) {
          // Check if the formatted string contains commas for thousand separation
          const numericPart = formatted.replace(/[^\d,.-]/g, '');
          if (amount >= 1000) {
            expect(numericPart).toMatch(/,/);
          }
        }
        
        // Property 4: Should handle zero amounts gracefully
        if (amount === 0) {
          expect(formatted).toMatch(/0/);
        }
        
        // Property 5: Should not contain NaN or undefined
        expect(formatted).not.toContain('NaN');
        expect(formatted).not.toContain('undefined');
        
        // Property 6: Should be consistent - formatting the same amount twice should yield same result
        const formatted2 = formatCurrency(amount, currency);
        expect(formatted).toBe(formatted2);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property test for compact currency formatting consistency
   */
  test('should format any large numeric value with compact notation (K, M, B) consistently', () => {
    const largeAmountArbitrary = fc.float({ 
      min: 1000, 
      max: Math.fround(999999999), 
      noNaN: true, 
      noDefaultInfinity: true 
    });
    const currencyArbitrary = fc.constantFrom(...Object.keys(CURRENCIES));

    fc.assert(
      fc.property(largeAmountArbitrary, currencyArbitrary, (amount, currency) => {
        const formatted = formatCompactCurrency(amount, currency);
        const currencyInfo = CURRENCIES[currency];
        
        // Property 1: Result should be a non-empty string
        expect(typeof formatted).toBe('string');
        expect(formatted.length).toBeGreaterThan(0);
        
        // Property 2: Should contain currency information
        const containsCurrencyInfo = 
          formatted.includes(currencyInfo.symbol) || // Custom symbol like "€", "£"
          formatted.includes(currency) || // Full currency code like "USD", "CAD"
          formatted.includes(currency.substring(0, 2)) || // Partial code like "CA" from "CAD"
          /[\$€£¥₹]/.test(formatted); // Common currency symbols
        
        expect(containsCurrencyInfo).toBe(true);
        
        // Property 3: For amounts >= 1B, should contain 'B'
        if (amount >= 1000000000) {
          expect(formatted).toContain('B');
        }
        // Property 4: For amounts >= 1M but < 1B, should contain 'M'
        else if (amount >= 1000000) {
          expect(formatted).toContain('M');
        }
        // Property 5: For amounts >= 1K but < 1M, should contain 'K'
        else if (amount >= 1000) {
          expect(formatted).toContain('K');
        }
        
        // Property 6: Should not contain NaN or undefined
        expect(formatted).not.toContain('NaN');
        expect(formatted).not.toContain('undefined');
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property test for currency symbol consistency
   */
  test('should return consistent currency symbols for any valid currency code', () => {
    const currencyArbitrary = fc.constantFrom(...Object.keys(CURRENCIES));

    fc.assert(
      fc.property(currencyArbitrary, (currency) => {
        const symbol = getCurrencySymbol(currency);
        const expectedSymbol = CURRENCIES[currency].symbol;
        
        // Property 1: Should return the correct symbol for the currency
        expect(symbol).toBe(expectedSymbol);
        
        // Property 2: Symbol should be a non-empty string
        expect(typeof symbol).toBe('string');
        expect(symbol.length).toBeGreaterThan(0);
        
        // Property 3: Should be consistent - calling twice should yield same result
        const symbol2 = getCurrencySymbol(currency);
        expect(symbol).toBe(symbol2);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property test for currency conversion consistency
   */
  test('should convert currency amounts consistently with proper rates', () => {
    const amountArbitrary = fc.float({ 
      min: 0, 
      max: Math.fround(999999), 
      noNaN: true, 
      noDefaultInfinity: true 
    });
    const currencyArbitrary = fc.constantFrom(...Object.keys(CURRENCIES));

    fc.assert(
      fc.property(amountArbitrary, currencyArbitrary, (amount, currency) => {
        const converted = convertCurrency(amount, currency);
        const rate = CURRENCIES[currency].rate;
        
        // Property 1: Converted amount should be a number
        expect(typeof converted).toBe('number');
        expect(isNaN(converted)).toBe(false);
        
        // Property 2: Should apply the correct conversion rate
        const expectedAmount = amount * rate;
        expect(Math.abs(converted - expectedAmount)).toBeLessThan(0.01); // Allow for floating point precision
        
        // Property 3: Converting zero should always yield zero
        if (amount === 0) {
          expect(converted).toBe(0);
        }
        
        // Property 4: Should be consistent - converting the same amount twice should yield same result
        const converted2 = convertCurrency(amount, currency);
        expect(converted).toBe(converted2);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property test for number formatting with thousand separators
   */
  test('should consistently apply thousand separators for any large number', () => {
    const largeNumberArbitrary = fc.integer({ min: 1000, max: 999999999 });

    fc.assert(
      fc.property(largeNumberArbitrary, (number) => {
        // Test with default USD formatting
        const formatted = formatCurrency(number, 'USD');
        
        // Property 1: Should contain commas for thousand separation
        expect(formatted).toMatch(/,/);
        
        // Property 2: Commas should be properly placed (every 3 digits from right)
        const numericPart = formatted.replace(/[^\d,]/g, '');
        const parts = numericPart.split(',');
        
        // First part can be 1-3 digits, subsequent parts should be exactly 3 digits
        if (parts.length > 1) {
          expect(parts[0].length).toBeGreaterThan(0);
          expect(parts[0].length).toBeLessThanOrEqual(3);
          
          for (let i = 1; i < parts.length; i++) {
            expect(parts[i].length).toBe(3);
          }
        }
      }),
      { numRuns: 100 }
    );
  });
});