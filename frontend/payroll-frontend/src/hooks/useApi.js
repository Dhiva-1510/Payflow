import { useState, useCallback, useRef } from 'react';
import api, { withRetry, retryConfig } from '../services/api';
import { getErrorMessage, isRetryableError, getErrorUIType, DEFAULT_RETRY_CONFIG } from '../utils/errorHandler';

/**
 * Custom hook for API calls with retry functionality
 * Requirements: 7.6, 8.5 - Handle network errors and provide retry mechanisms
 * 
 * @param {Object} options - Configuration options
 * @param {number} options.maxRetries - Maximum number of retry attempts (default: 3)
 * @param {number} options.retryDelay - Base delay between retries in ms (default: 1000)
 * @param {boolean} options.autoRetry - Whether to automatically retry on retryable errors (default: false)
 */
const useApi = (options = {}) => {
  const { 
    maxRetries = DEFAULT_RETRY_CONFIG.maxRetries, 
    retryDelay = DEFAULT_RETRY_CONFIG.baseDelay, 
    autoRetry = false 
  } = options;
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [errorType, setErrorType] = useState(null);
  const [data, setData] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryMessage, setRetryMessage] = useState('');
  
  // Store the last request for retry functionality
  const lastRequestRef = useRef(null);
  const lastErrorRef = useRef(null);
  const abortControllerRef = useRef(null);

  /**
   * Cancel any ongoing request
   */
  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  /**
   * Execute an API request with retry logic
   * @param {Function} requestFn - Function that returns a promise (the API call)
   * @param {Object} requestOptions - Options for this specific request
   */
  const execute = useCallback(async (requestFn, requestOptions = {}) => {
    const { 
      onSuccess, 
      onError,
      onRetry,
      shouldRetry = autoRetry,
      retries = maxRetries,
      retryMsg = 'Connection issue detected. Retrying...'
    } = requestOptions;

    // Cancel any previous request
    cancel();
    
    // Create new abort controller
    abortControllerRef.current = new AbortController();

    // Store the request for potential retry
    lastRequestRef.current = { requestFn, requestOptions };
    
    setLoading(true);
    setError(null);
    setErrorType(null);
    setRetryCount(0);
    setIsRetrying(false);
    setRetryMessage('');

    const handleRetry = (attempt, maxAttempts, delay, err) => {
      setRetryCount(attempt);
      setIsRetrying(true);
      setRetryMessage(retryMsg);
      
      if (onRetry) {
        onRetry(attempt, maxAttempts, delay, err);
      }
    };

    try {
      let response;
      
      if (shouldRetry) {
        // Use withRetry for automatic retry
        response = await withRetry(requestFn, {
          maxRetries: retries,
          retryDelay,
          onRetry: handleRetry
        });
      } else {
        response = await requestFn();
      }
      
      setData(response.data);
      setLoading(false);
      setIsRetrying(false);
      setRetryMessage('');
      
      if (onSuccess) {
        onSuccess(response.data);
      }
      
      return response.data;
    } catch (err) {
      // Don't handle aborted requests
      if (err.code === 'ERR_CANCELED') {
        return;
      }
      
      lastErrorRef.current = err;
      
      const errorMessage = getErrorMessage(err);
      const uiErrorType = getErrorUIType(err);
      
      setError(errorMessage);
      setErrorType(uiErrorType);
      setLoading(false);
      setIsRetrying(false);
      setRetryMessage('');
      
      if (onError) {
        onError(err, errorMessage);
      }
      
      throw err;
    }
  }, [autoRetry, maxRetries, retryDelay, cancel]);

  /**
   * Retry the last failed request
   */
  const retry = useCallback(async () => {
    if (!lastRequestRef.current) {
      console.warn('No request to retry');
      return;
    }

    const { requestFn, requestOptions } = lastRequestRef.current;
    return execute(requestFn, { ...requestOptions, shouldRetry: true });
  }, [execute]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
    setErrorType(null);
  }, []);

  /**
   * Reset all state
   */
  const reset = useCallback(() => {
    cancel();
    setLoading(false);
    setError(null);
    setErrorType(null);
    setData(null);
    setRetryCount(0);
    setIsRetrying(false);
    setRetryMessage('');
    lastRequestRef.current = null;
    lastErrorRef.current = null;
  }, [cancel]);

  // Convenience methods for common HTTP methods
  const get = useCallback((url, options = {}) => {
    return execute(() => api.get(url), options);
  }, [execute]);

  const post = useCallback((url, data, options = {}) => {
    return execute(() => api.post(url, data), options);
  }, [execute]);

  const put = useCallback((url, data, options = {}) => {
    return execute(() => api.put(url, data), options);
  }, [execute]);

  const del = useCallback((url, options = {}) => {
    return execute(() => api.delete(url), options);
  }, [execute]);

  return {
    loading,
    error,
    errorType,
    data,
    retryCount,
    isRetrying,
    retryMessage,
    execute,
    retry,
    clearError,
    reset,
    cancel,
    get,
    post,
    put,
    delete: del,
    canRetry: lastErrorRef.current ? isRetryableError(lastErrorRef.current) : false,
    maxRetries
  };
};

export default useApi;
