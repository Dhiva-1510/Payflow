/**
 * Error Handler Utilities
 * Provides consistent error handling and user-friendly error messages
 * Requirements: 7.6, 8.5 - Display appropriate error messages for authentication failures and network errors
 */

// Error types for categorization
export const ErrorTypes = {
  NETWORK: 'network',
  AUTH: 'auth',
  VALIDATION: 'validation',
  SERVER: 'server',
  TIMEOUT: 'timeout',
  CONFLICT: 'conflict',
  NOT_FOUND: 'not_found',
  RATE_LIMIT: 'rate_limit',
  UNKNOWN: 'unknown'
};

// Retry configuration defaults
export const DEFAULT_RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  retryableStatuses: [408, 429, 500, 502, 503, 504]
};

/**
 * Calculate exponential backoff delay with jitter
 * @param {number} attempt - Current attempt number (1-based)
 * @param {number} baseDelay - Base delay in milliseconds
 * @param {number} maxDelay - Maximum delay cap
 * @returns {number} - Delay in milliseconds
 */
export const calculateBackoffDelay = (attempt, baseDelay = DEFAULT_RETRY_CONFIG.baseDelay, maxDelay = DEFAULT_RETRY_CONFIG.maxDelay) => {
  const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
  const jitter = Math.random() * 0.3 * exponentialDelay; // Add up to 30% jitter
  return Math.min(exponentialDelay + jitter, maxDelay);
};

/**
 * Sleep utility for delays
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise} - Resolves after delay
 */
export const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Execute a function with automatic retry logic
 * @param {Function} fn - Async function to execute
 * @param {Object} options - Retry options
 * @returns {Promise} - Result of the function
 */
export const withRetry = async (fn, options = {}) => {
  const {
    maxRetries = DEFAULT_RETRY_CONFIG.maxRetries,
    baseDelay = DEFAULT_RETRY_CONFIG.baseDelay,
    maxDelay = DEFAULT_RETRY_CONFIG.maxDelay,
    onRetry = null,
    shouldRetry = isRetryableError
  } = options;

  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt <= maxRetries && shouldRetry(error)) {
        const delay = calculateBackoffDelay(attempt, baseDelay, maxDelay);
        
        if (onRetry) {
          onRetry(attempt, maxRetries, delay, error);
        }
        
        await sleep(delay);
      } else {
        break;
      }
    }
  }
  
  throw lastError;
};

/**
 * Categorize an error based on its properties
 * @param {Error} error - The error object from axios or other sources
 * @returns {string} - The error type
 */
export const categorizeError = (error) => {
  if (!error) return ErrorTypes.UNKNOWN;

  // Network errors (no response received)
  if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
    return ErrorTypes.NETWORK;
  }

  // Timeout errors
  if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
    return ErrorTypes.TIMEOUT;
  }

  // Canceled requests
  if (error.code === 'ERR_CANCELED') {
    return ErrorTypes.UNKNOWN;
  }

  // Response-based errors
  if (error.response) {
    const status = error.response.status;
    
    // Authentication errors
    if (status === 401 || status === 403) {
      return ErrorTypes.AUTH;
    }
    
    // Validation errors
    if (status === 400 || status === 422) {
      return ErrorTypes.VALIDATION;
    }

    // Conflict errors (e.g., duplicate email)
    if (status === 409) {
      return ErrorTypes.CONFLICT;
    }

    // Not found errors
    if (status === 404) {
      return ErrorTypes.NOT_FOUND;
    }

    // Rate limiting
    if (status === 429) {
      return ErrorTypes.RATE_LIMIT;
    }
    
    // Server errors
    if (status >= 500) {
      return ErrorTypes.SERVER;
    }
  }

  return ErrorTypes.UNKNOWN;
};

/**
 * Get a user-friendly error message based on the error
 * @param {Error} error - The error object
 * @returns {string} - User-friendly error message
 */
export const getErrorMessage = (error) => {
  if (!error) return 'An unexpected error occurred';

  const errorType = categorizeError(error);

  // Check for custom message from server first
  const serverMessage = error.response?.data?.message;
  const serverErrors = error.response?.data?.errors;

  switch (errorType) {
    case ErrorTypes.NETWORK:
      return 'Unable to connect to the server. Please check your internet connection and try again.';
    
    case ErrorTypes.TIMEOUT:
      return 'The request timed out. Please check your connection and try again.';
    
    case ErrorTypes.AUTH:
      if (error.response?.status === 401) {
        return serverMessage || 'Your session has expired. Please log in again.';
      }
      return serverMessage || 'You do not have permission to perform this action.';
    
    case ErrorTypes.VALIDATION:
      if (serverErrors && Array.isArray(serverErrors)) {
        return serverErrors.join(', ');
      }
      return serverMessage || 'Please check your input and try again.';

    case ErrorTypes.CONFLICT:
      return serverMessage || 'This resource already exists. Please use different values.';

    case ErrorTypes.NOT_FOUND:
      return serverMessage || 'The requested resource was not found.';

    case ErrorTypes.RATE_LIMIT:
      return 'Too many requests. Please wait a moment and try again.';
    
    case ErrorTypes.SERVER:
      return 'The server encountered an error. Please try again later.';
    
    default:
      return serverMessage || 'An unexpected error occurred. Please try again.';
  }
};

/**
 * Check if an error is retryable
 * @param {Error} error - The error object
 * @returns {boolean} - Whether the error is retryable
 */
export const isRetryableError = (error) => {
  const errorType = categorizeError(error);
  
  // Network, timeout, server, and rate limit errors are typically retryable
  return [
    ErrorTypes.NETWORK, 
    ErrorTypes.TIMEOUT, 
    ErrorTypes.SERVER,
    ErrorTypes.RATE_LIMIT
  ].includes(errorType);
};

/**
 * Get the error type for UI styling
 * @param {Error} error - The error object
 * @returns {string} - The UI error type ('error', 'warning', 'network')
 */
export const getErrorUIType = (error) => {
  const errorType = categorizeError(error);
  
  switch (errorType) {
    case ErrorTypes.NETWORK:
    case ErrorTypes.TIMEOUT:
      return 'network';
    case ErrorTypes.VALIDATION:
      return 'warning';
    default:
      return 'error';
  }
};

/**
 * Format field-specific validation errors
 * @param {Object} error - The error object
 * @returns {Object} - Object with field names as keys and error messages as values
 */
export const getFieldErrors = (error) => {
  const fieldErrors = {};
  
  if (error.response?.data?.errors) {
    const errors = error.response.data.errors;
    
    if (Array.isArray(errors)) {
      // If errors is an array of strings, return as general error
      fieldErrors.general = errors.join(', ');
    } else if (typeof errors === 'object') {
      // If errors is an object with field names
      Object.assign(fieldErrors, errors);
    }
  } else if (error.response?.data?.message) {
    fieldErrors.general = error.response.data.message;
  }
  
  return fieldErrors;
};

export default {
  ErrorTypes,
  DEFAULT_RETRY_CONFIG,
  categorizeError,
  getErrorMessage,
  isRetryableError,
  getErrorUIType,
  getFieldErrors,
  calculateBackoffDelay,
  sleep,
  withRetry
};
