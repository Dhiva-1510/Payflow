import axios from 'axios';
import { getToken, clearAuth } from '../utils/tokenManager';
import { getErrorMessage, isRetryableError, calculateBackoffDelay, sleep } from '../utils/errorHandler';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api',
  timeout: 15000, // 15 second timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401 unauthorized - redirect to login
    if (error.response?.status === 401) {
      // Only redirect if not already on login page and not a login request
      const isLoginRequest = error.config?.url?.includes('/auth/login');
      const isOnLoginPage = window.location.pathname === '/login';
      
      if (!isLoginRequest && !isOnLoginPage) {
        clearAuth();
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

/**
 * Retry configuration for API requests
 * Requirements: 8.5 - Network error handling and retry mechanisms
 */
export const retryConfig = {
  maxRetries: 3,
  retryDelay: 1000,
  maxDelay: 10000,
  retryableStatuses: [408, 429, 500, 502, 503, 504]
};

/**
 * Check if an error should trigger a retry
 * @param {Error} error - The error object
 * @returns {boolean} - Whether the error is retryable
 */
const shouldRetry = (error) => {
  // Network errors (no response received)
  if (!error.response && error.code !== 'ERR_CANCELED') {
    return true;
  }
  
  // Retryable HTTP status codes
  if (error.response && retryConfig.retryableStatuses.includes(error.response.status)) {
    return true;
  }
  
  return false;
};

/**
 * Execute an API request with automatic retry for network errors
 * @param {Function} requestFn - Function that returns a promise
 * @param {Object} options - Retry options
 * @returns {Promise} - The API response
 */
export const withRetry = async (requestFn, options = {}) => {
  const { 
    maxRetries = retryConfig.maxRetries, 
    retryDelay = retryConfig.retryDelay,
    maxDelay = retryConfig.maxDelay,
    onRetry,
    onError
  } = options;
  
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await requestFn();
    } catch (error) {
      lastError = error;
      
      const canRetry = shouldRetry(error) && attempt < maxRetries;
      
      if (canRetry) {
        // Calculate delay with exponential backoff and jitter
        const delay = calculateBackoffDelay(attempt + 1, retryDelay, maxDelay);
        
        if (onRetry) {
          onRetry(attempt + 1, maxRetries, delay, error);
        }
        
        await sleep(delay);
      } else {
        // Final error - call onError callback if provided
        if (onError) {
          onError(error, getErrorMessage(error));
        }
        break;
      }
    }
  }
  
  throw lastError;
};

/**
 * Create a request with automatic retry
 * @param {string} method - HTTP method
 * @param {string} url - Request URL
 * @param {Object} data - Request data (for POST/PUT)
 * @param {Object} options - Retry options
 * @returns {Promise} - The API response
 */
export const requestWithRetry = (method, url, data = null, options = {}) => {
  const requestFn = () => {
    switch (method.toLowerCase()) {
      case 'get':
        return api.get(url);
      case 'post':
        return api.post(url, data);
      case 'put':
        return api.put(url, data);
      case 'delete':
        return api.delete(url);
      default:
        return api.request({ method, url, data });
    }
  };
  
  return withRetry(requestFn, options);
};

export default api;