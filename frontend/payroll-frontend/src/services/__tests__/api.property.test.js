/**
 * Property-Based Tests for API Service - Authenticated Request Headers
 * 
 * Feature: employee-payroll-system, Property 18: Authenticated Request Headers
 * Validates: Requirements 7.4, 8.2
 * 
 * Property 18: *For any* API request from authenticated users, the request 
 * should include a valid JWT token in the authorization header
 */

import * as fc from 'fast-check';

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: jest.fn((key) => store[key] || null),
    setItem: jest.fn((key, value) => { store[key] = value.toString(); }),
    removeItem: jest.fn((key) => { delete store[key]; }),
    clear: jest.fn(() => { store = {}; })
  };
})();

Object.defineProperty(global, 'localStorage', { value: localStorageMock });

// Import tokenManager after localStorage mock is set up
import { getToken, setToken } from '../../utils/tokenManager';

/**
 * Simulates the request interceptor logic from api.js
 * This is the core logic we're testing:
 * 
 * api.interceptors.request.use((config) => {
 *   const token = getToken();
 *   if (token) {
 *     config.headers.Authorization = `Bearer ${token}`;
 *   }
 *   return config;
 * });
 */
const applyRequestInterceptor = (config) => {
  const token = getToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
};

describe('Property 18: Authenticated Request Headers', () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
  });

  /**
   * Property Test: For any valid JWT token stored in localStorage,
   * the request interceptor should add it to the Authorization header
   * with the Bearer prefix.
   * 
   * Feature: employee-payroll-system, Property 18: Authenticated Request Headers
   * Validates: Requirements 7.4, 8.2
   */
  test('should include Bearer token in Authorization header for any stored token', () => {
    // Generate arbitrary JWT-like tokens (base64 encoded parts separated by dots)
    const jwtArbitrary = fc.tuple(
      fc.base64String({ minLength: 10, maxLength: 50 }),
      fc.base64String({ minLength: 10, maxLength: 100 }),
      fc.base64String({ minLength: 10, maxLength: 50 })
    ).map(([header, payload, signature]) => 
      `${header}.${payload}.${signature}`
    );

    fc.assert(
      fc.property(jwtArbitrary, (token) => {
        // Store the token using tokenManager
        setToken(token);
        
        // Create a mock request config
        const config = { headers: {} };
        
        // Apply the request interceptor logic
        const modifiedConfig = applyRequestInterceptor(config);
        
        // Verify the Authorization header is set correctly
        return modifiedConfig.headers.Authorization === `Bearer ${token}`;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: For any request when no token is stored,
   * the request should not have an Authorization header added.
   * 
   * Feature: employee-payroll-system, Property 18: Authenticated Request Headers
   * Validates: Requirements 7.4, 8.2
   */
  test('should not add Authorization header when no token is stored', () => {
    fc.assert(
      fc.property(
        fc.record({
          url: fc.webUrl(),
          method: fc.constantFrom('get', 'post', 'put', 'delete'),
          data: fc.option(fc.object(), { nil: undefined })
        }),
        (requestParams) => {
          // Ensure no token is stored (clear localStorage)
          localStorageMock.clear();
          
          // Create a mock request config
          const config = { 
            headers: {},
            url: requestParams.url,
            method: requestParams.method,
            data: requestParams.data
          };
          
          // Apply the request interceptor logic
          const modifiedConfig = applyRequestInterceptor(config);
          
          // Verify no Authorization header is added
          return modifiedConfig.headers.Authorization === undefined;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: For any request config with existing headers,
   * the interceptor should preserve existing headers while adding Authorization.
   * 
   * Feature: employee-payroll-system, Property 18: Authenticated Request Headers
   * Validates: Requirements 7.4, 8.2
   */
  test('should preserve existing headers when adding Authorization', () => {
    const jwtArbitrary = fc.tuple(
      fc.base64String({ minLength: 10, maxLength: 50 }),
      fc.base64String({ minLength: 10, maxLength: 100 }),
      fc.base64String({ minLength: 10, maxLength: 50 })
    ).map(([header, payload, signature]) => 
      `${header}.${payload}.${signature}`
    );

    // Generate header names that are valid HTTP header names (alphanumeric + hyphen)
    const headerNameArbitrary = fc.stringOf(
      fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-'),
      { minLength: 1, maxLength: 20 }
    ).filter(s => s !== 'Authorization' && s.length > 0 && !s.startsWith('-') && !s.endsWith('-'));

    const headerArbitrary = fc.dictionary(
      headerNameArbitrary,
      fc.string({ minLength: 1, maxLength: 50 })
    );

    fc.assert(
      fc.property(jwtArbitrary, headerArbitrary, (token, existingHeaders) => {
        // Store the token using tokenManager
        setToken(token);
        
        // Create a mock request config with existing headers
        const config = { headers: { ...existingHeaders } };
        
        // Apply the request interceptor logic
        const modifiedConfig = applyRequestInterceptor(config);
        
        // Verify existing headers are preserved
        for (const [key, value] of Object.entries(existingHeaders)) {
          if (modifiedConfig.headers[key] !== value) {
            return false;
          }
        }
        
        // Verify Authorization header is added
        return modifiedConfig.headers.Authorization === `Bearer ${token}`;
      }),
      { numRuns: 100 }
    );
  });
});
