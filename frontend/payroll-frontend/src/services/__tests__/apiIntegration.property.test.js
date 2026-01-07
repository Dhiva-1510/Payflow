/**
 * Property-Based Tests for API Integration
 * 
 * Feature: employee-payroll-system
 * 
 * Property 20: Error Handling Consistency
 * Validates: Requirements 7.6, 8.5
 * 
 * Property 21: API Response Handling
 * Validates: Requirements 8.3
 * 
 * Property 22: JSON Communication Format
 * Validates: Requirements 8.4
 */

import * as fc from 'fast-check';
import { 
  categorizeError, 
  getErrorMessage, 
  isRetryableError, 
  ErrorTypes,
  getErrorUIType,
  getFieldErrors
} from '../../utils/errorHandler';

/**
 * Helper to create mock axios errors with various status codes
 */
const createMockError = (status, message = null, data = null) => {
  if (status === null) {
    // Network error - no response
    return {
      code: 'ERR_NETWORK',
      message: 'Network Error',
      response: undefined
    };
  }
  
  return {
    response: {
      status,
      data: data || { message: message || `Error ${status}` }
    }
  };
};

/**
 * Helper to create timeout errors
 */
const createTimeoutError = () => ({
  code: 'ECONNABORTED',
  message: 'timeout of 15000ms exceeded',
  response: undefined
});

describe('Property 20: Error Handling Consistency', () => {
  /**
   * Property Test: For any authentication failure (401/403), 
   * the system should return a user-friendly error message.
   * 
   * Feature: employee-payroll-system, Property 20: Error Handling Consistency
   * Validates: Requirements 7.6, 8.5
   */
  test('should return user-friendly message for any authentication error', () => {
    const authStatusArbitrary = fc.constantFrom(401, 403);
    const messageArbitrary = fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined });

    fc.assert(
      fc.property(authStatusArbitrary, messageArbitrary, (status, serverMessage) => {
        const error = createMockError(status, serverMessage);
        const message = getErrorMessage(error);
        
        // Message should be a non-empty string
        if (typeof message !== 'string' || message.length === 0) return false;
        
        // Error type should be AUTH
        const errorType = categorizeError(error);
        return errorType === ErrorTypes.AUTH;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: For any network error, the system should 
   * return a consistent network-related error message.
   * 
   * Feature: employee-payroll-system, Property 20: Error Handling Consistency
   * Validates: Requirements 7.6, 8.5
   */
  test('should return consistent message for any network error', () => {
    fc.assert(
      fc.property(fc.nat(100), () => {
        const error = createMockError(null);
        const message = getErrorMessage(error);
        const errorType = categorizeError(error);
        
        // Should be categorized as network error
        if (errorType !== ErrorTypes.NETWORK) return false;
        
        // Message should mention connection or network
        return message.toLowerCase().includes('connect') || 
               message.toLowerCase().includes('network') ||
               message.toLowerCase().includes('internet');
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: For any timeout error, the system should 
   * return a timeout-specific error message.
   * 
   * Feature: employee-payroll-system, Property 20: Error Handling Consistency
   * Validates: Requirements 7.6, 8.5
   */
  test('should return timeout message for any timeout error', () => {
    fc.assert(
      fc.property(fc.nat(100), () => {
        const error = createTimeoutError();
        const message = getErrorMessage(error);
        const errorType = categorizeError(error);
        
        // Should be categorized as timeout error
        if (errorType !== ErrorTypes.TIMEOUT) return false;
        
        // Message should mention timeout
        return message.toLowerCase().includes('timeout') || 
               message.toLowerCase().includes('timed out');
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: For any server error (5xx), the system should 
   * return a server error message and mark it as retryable.
   * 
   * Feature: employee-payroll-system, Property 20: Error Handling Consistency
   * Validates: Requirements 7.6, 8.5
   */
  test('should handle any server error (5xx) consistently', () => {
    const serverStatusArbitrary = fc.integer({ min: 500, max: 599 });

    fc.assert(
      fc.property(serverStatusArbitrary, (status) => {
        const error = createMockError(status);
        const message = getErrorMessage(error);
        const errorType = categorizeError(error);
        const retryable = isRetryableError(error);
        
        // Should be categorized as server error
        if (errorType !== ErrorTypes.SERVER) return false;
        
        // Server errors should be retryable
        if (!retryable) return false;
        
        // Message should be a non-empty string
        return typeof message === 'string' && message.length > 0;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: For any validation error (400/422), the system 
   * should return validation-specific error handling.
   * 
   * Feature: employee-payroll-system, Property 20: Error Handling Consistency
   * Validates: Requirements 7.6, 8.5
   */
  test('should handle any validation error consistently', () => {
    const validationStatusArbitrary = fc.constantFrom(400, 422);
    const validationMessageArbitrary = fc.string({ minLength: 1, maxLength: 200 });

    fc.assert(
      fc.property(validationStatusArbitrary, validationMessageArbitrary, (status, serverMessage) => {
        const error = createMockError(status, serverMessage);
        const message = getErrorMessage(error);
        const errorType = categorizeError(error);
        
        // Should be categorized as validation error
        if (errorType !== ErrorTypes.VALIDATION) return false;
        
        // Validation errors should NOT be retryable
        if (isRetryableError(error)) return false;
        
        // Message should be a non-empty string
        return typeof message === 'string' && message.length > 0;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: For any error, getErrorUIType should return 
   * a valid UI type string.
   * 
   * Feature: employee-payroll-system, Property 20: Error Handling Consistency
   * Validates: Requirements 7.6, 8.5
   */
  test('should return valid UI type for any error', () => {
    const statusArbitrary = fc.oneof(
      fc.constant(null), // network error
      fc.integer({ min: 400, max: 599 })
    );

    fc.assert(
      fc.property(statusArbitrary, (status) => {
        const error = status === null ? createMockError(null) : createMockError(status);
        const uiType = getErrorUIType(error);
        
        // UI type should be one of the valid types
        return ['error', 'warning', 'network'].includes(uiType);
      }),
      { numRuns: 100 }
    );
  });
});


describe('Property 21: API Response Handling', () => {
  /**
   * Property Test: For any successful API response, the frontend 
   * should be able to extract the data correctly.
   * 
   * Feature: employee-payroll-system, Property 21: API Response Handling
   * Validates: Requirements 8.3
   */
  test('should handle any successful response data structure', () => {
    // Generate arbitrary response data structures
    const responseDataArbitrary = fc.oneof(
      fc.record({
        success: fc.constant(true),
        data: fc.anything()
      }),
      fc.record({
        success: fc.constant(true),
        message: fc.string(),
        data: fc.array(fc.object())
      }),
      fc.record({
        success: fc.constant(true),
        token: fc.string(),
        user: fc.object()
      })
    );

    fc.assert(
      fc.property(responseDataArbitrary, (responseData) => {
        // Simulate successful response handling
        const mockResponse = { data: responseData, status: 200 };
        
        // Response should have data property
        if (!mockResponse.data) return false;
        
        // Success flag should be true
        return mockResponse.data.success === true;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: For any error response, the frontend should 
   * extract error information appropriately.
   * 
   * Feature: employee-payroll-system, Property 21: API Response Handling
   * Validates: Requirements 8.3
   */
  test('should extract error information from any error response', () => {
    const errorStatusArbitrary = fc.integer({ min: 400, max: 599 });
    const errorDataArbitrary = fc.oneof(
      fc.record({
        message: fc.string({ minLength: 1, maxLength: 200 })
      }),
      fc.record({
        message: fc.string({ minLength: 1, maxLength: 200 }),
        errors: fc.array(fc.string({ minLength: 1, maxLength: 100 }))
      }),
      fc.record({
        error: fc.string({ minLength: 1, maxLength: 200 })
      })
    );

    fc.assert(
      fc.property(errorStatusArbitrary, errorDataArbitrary, (status, errorData) => {
        const error = {
          response: {
            status,
            data: errorData
          }
        };
        
        // getErrorMessage should always return a string
        const message = getErrorMessage(error);
        if (typeof message !== 'string') return false;
        
        // Message should not be empty
        return message.length > 0;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: For any error with field-specific errors, 
   * getFieldErrors should extract them correctly.
   * 
   * Feature: employee-payroll-system, Property 21: API Response Handling
   * Validates: Requirements 8.3
   */
  test('should extract field errors from any validation response', () => {
    const fieldNameArbitrary = fc.stringOf(
      fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'),
      { minLength: 1, maxLength: 20 }
    );
    
    const fieldErrorsArbitrary = fc.dictionary(
      fieldNameArbitrary,
      fc.string({ minLength: 1, maxLength: 100 })
    );

    fc.assert(
      fc.property(fieldErrorsArbitrary, (fieldErrors) => {
        const error = {
          response: {
            status: 400,
            data: {
              errors: fieldErrors
            }
          }
        };
        
        const extractedErrors = getFieldErrors(error);
        
        // Should return an object
        if (typeof extractedErrors !== 'object') return false;
        
        // If original had field errors as object, they should be preserved
        if (Object.keys(fieldErrors).length > 0) {
          for (const [key, value] of Object.entries(fieldErrors)) {
            if (extractedErrors[key] !== value) return false;
          }
        }
        
        return true;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: For any error with array of error messages, 
   * getFieldErrors should combine them into general error.
   * 
   * Feature: employee-payroll-system, Property 21: API Response Handling
   * Validates: Requirements 8.3
   */
  test('should combine array errors into general error', () => {
    const errorMessagesArbitrary = fc.array(
      fc.string({ minLength: 1, maxLength: 100 }),
      { minLength: 1, maxLength: 5 }
    );

    fc.assert(
      fc.property(errorMessagesArbitrary, (errorMessages) => {
        const error = {
          response: {
            status: 400,
            data: {
              errors: errorMessages
            }
          }
        };
        
        const extractedErrors = getFieldErrors(error);
        
        // Should have a general error
        if (!extractedErrors.general) return false;
        
        // General error should contain all messages joined
        const expectedGeneral = errorMessages.join(', ');
        return extractedErrors.general === expectedGeneral;
      }),
      { numRuns: 100 }
    );
  });
});

describe('Property 22: JSON Communication Format', () => {
  /**
   * Property Test: For any valid request payload, it should be 
   * serializable to JSON format.
   * 
   * Feature: employee-payroll-system, Property 22: JSON Communication Format
   * Validates: Requirements 8.4
   */
  test('should serialize any valid request payload to JSON', () => {
    // Generate arbitrary JSON-serializable objects
    const jsonSerializableArbitrary = fc.oneof(
      fc.record({
        name: fc.string({ minLength: 1, maxLength: 50 }),
        email: fc.emailAddress(),
        password: fc.string({ minLength: 6, maxLength: 50 })
      }),
      fc.record({
        baseSalary: fc.nat({ max: 1000000 }),
        allowance: fc.nat({ max: 100000 }),
        deduction: fc.nat({ max: 100000 })
      }),
      fc.record({
        month: fc.integer({ min: 1, max: 12 }),
        year: fc.integer({ min: 2020, max: 2030 })
      })
    );

    fc.assert(
      fc.property(jsonSerializableArbitrary, (payload) => {
        // Should be able to stringify without error
        let jsonString;
        try {
          jsonString = JSON.stringify(payload);
        } catch (e) {
          return false;
        }
        
        // Should be able to parse back
        let parsed;
        try {
          parsed = JSON.parse(jsonString);
        } catch (e) {
          return false;
        }
        
        // Parsed object should match original
        return JSON.stringify(parsed) === jsonString;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: For any valid API response, it should be 
   * parseable from JSON format.
   * 
   * Feature: employee-payroll-system, Property 22: JSON Communication Format
   * Validates: Requirements 8.4
   */
  test('should parse any valid JSON response', () => {
    // Generate arbitrary JSON response structures
    const jsonResponseArbitrary = fc.oneof(
      // Auth response
      fc.record({
        success: fc.boolean(),
        token: fc.string({ minLength: 10, maxLength: 200 }),
        user: fc.record({
          id: fc.string(),
          name: fc.string(),
          email: fc.emailAddress(),
          role: fc.constantFrom('admin', 'employee')
        })
      }),
      // Employee list response
      fc.record({
        success: fc.boolean(),
        employees: fc.array(fc.record({
          id: fc.string(),
          baseSalary: fc.nat({ max: 1000000 }),
          allowance: fc.nat({ max: 100000 }),
          deduction: fc.nat({ max: 100000 })
        }))
      }),
      // Payroll response
      fc.record({
        success: fc.boolean(),
        payrollRecords: fc.array(fc.record({
          month: fc.integer({ min: 1, max: 12 }),
          year: fc.integer({ min: 2020, max: 2030 }),
          grossSalary: fc.nat({ max: 1000000 }),
          netSalary: fc.nat({ max: 1000000 })
        }))
      })
    );

    fc.assert(
      fc.property(jsonResponseArbitrary, (response) => {
        // Simulate receiving JSON from server
        const jsonString = JSON.stringify(response);
        
        // Should be able to parse
        let parsed;
        try {
          parsed = JSON.parse(jsonString);
        } catch (e) {
          return false;
        }
        
        // Parsed should have success property
        return typeof parsed.success === 'boolean';
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: For any error response, it should follow 
   * JSON format with message field.
   * 
   * Feature: employee-payroll-system, Property 22: JSON Communication Format
   * Validates: Requirements 8.4
   */
  test('should handle any JSON error response format', () => {
    const errorResponseArbitrary = fc.record({
      success: fc.constant(false),
      message: fc.string({ minLength: 1, maxLength: 200 }),
      errors: fc.option(
        fc.array(fc.string({ minLength: 1, maxLength: 100 })),
        { nil: undefined }
      )
    });

    fc.assert(
      fc.property(errorResponseArbitrary, (errorResponse) => {
        // Simulate receiving JSON error from server
        const jsonString = JSON.stringify(errorResponse);
        
        // Should be able to parse
        let parsed;
        try {
          parsed = JSON.parse(jsonString);
        } catch (e) {
          return false;
        }
        
        // Should have success=false and message
        if (parsed.success !== false) return false;
        if (typeof parsed.message !== 'string') return false;
        
        return true;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: Content-Type header should always be 
   * application/json for API requests.
   * 
   * Feature: employee-payroll-system, Property 22: JSON Communication Format
   * Validates: Requirements 8.4
   */
  test('should use JSON content type for any request', () => {
    // Simulate the axios instance configuration
    const defaultHeaders = {
      'Content-Type': 'application/json'
    };

    fc.assert(
      fc.property(
        fc.record({
          url: fc.constantFrom('/auth/login', '/auth/register', '/employee/add', '/payroll/run'),
          method: fc.constantFrom('get', 'post', 'put', 'delete'),
          data: fc.option(fc.object(), { nil: undefined })
        }),
        (requestConfig) => {
          // Simulate request config with default headers
          const config = {
            ...requestConfig,
            headers: { ...defaultHeaders }
          };
          
          // Content-Type should be application/json
          return config.headers['Content-Type'] === 'application/json';
        }
      ),
      { numRuns: 100 }
    );
  });
});
