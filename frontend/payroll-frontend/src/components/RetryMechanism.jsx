import React, { useState, useEffect, useCallback } from 'react';
import { calculateBackoffDelay, sleep } from '../utils/errorHandler';

/**
 * RetryMechanism Component
 * Provides sophisticated retry mechanisms with exponential backoff
 * Requirements: 4.4 - Retry mechanisms with exponential backoff
 */
const RetryMechanism = ({
  onRetry,
  maxRetries = 3,
  baseDelay = 1000,
  maxDelay = 10000,
  autoRetry = false,
  error = null,
  isRetryable = true,
  className = '',
  children
}) => {
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [nextRetryIn, setNextRetryIn] = useState(0);
  const [retryHistory, setRetryHistory] = useState([]);

  // Auto retry effect
  useEffect(() => {
    if (autoRetry && error && isRetryable && retryCount < maxRetries && !isRetrying) {
      handleRetry();
    }
  }, [error, autoRetry, isRetryable, retryCount, maxRetries, isRetrying]);

  // Countdown effect for next retry
  useEffect(() => {
    let intervalId;
    
    if (nextRetryIn > 0) {
      intervalId = setInterval(() => {
        setNextRetryIn(prev => {
          if (prev <= 1) {
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [nextRetryIn]);

  const handleRetry = useCallback(async () => {
    if (retryCount >= maxRetries || isRetrying) {
      return;
    }

    const attempt = retryCount + 1;
    const delay = calculateBackoffDelay(attempt, baseDelay, maxDelay);
    
    setIsRetrying(true);
    setNextRetryIn(Math.ceil(delay / 1000));
    
    // Add to retry history
    setRetryHistory(prev => [...prev, {
      attempt,
      timestamp: new Date(),
      delay,
      error: error?.message || 'Unknown error'
    }]);

    try {
      await sleep(delay);
      setNextRetryIn(0);
      
      if (onRetry) {
        await onRetry(attempt);
      }
      
      setRetryCount(attempt);
    } catch (retryError) {
      console.error('Retry failed:', retryError);
    } finally {
      setIsRetrying(false);
    }
  }, [retryCount, maxRetries, isRetrying, baseDelay, maxDelay, onRetry, error]);

  const handleManualRetry = useCallback(() => {
    if (!isRetrying && retryCount < maxRetries) {
      handleRetry();
    }
  }, [handleRetry, isRetrying, retryCount, maxRetries]);

  const resetRetries = useCallback(() => {
    setRetryCount(0);
    setIsRetrying(false);
    setNextRetryIn(0);
    setRetryHistory([]);
  }, []);

  const formatDelay = (seconds) => {
    if (seconds < 60) {
      return `${seconds}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getRetryStatus = () => {
    if (retryCount >= maxRetries) {
      return 'exhausted';
    }
    if (isRetrying) {
      return 'retrying';
    }
    if (error && isRetryable) {
      return 'ready';
    }
    return 'idle';
  };

  const status = getRetryStatus();

  // If children are provided, render them with retry context
  if (children) {
    return children({
      retryCount,
      maxRetries,
      isRetrying,
      nextRetryIn,
      retryHistory,
      status,
      canRetry: status === 'ready',
      handleRetry: handleManualRetry,
      resetRetries
    });
  }

  // Default UI rendering
  if (!error || !isRetryable) {
    return null;
  }

  return (
    <div className={`retry-mechanism ${className}`}>
      {/* Retry Status Display */}
      <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          {/* Status Icon */}
          <div className="flex-shrink-0 mt-0.5">
            {status === 'retrying' ? (
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-orange-500 border-t-transparent"></div>
            ) : status === 'exhausted' ? (
              <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            )}
          </div>

          {/* Status Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-orange-400">
                {status === 'retrying' && 'Retrying...'}
                {status === 'exhausted' && 'Retry Failed'}
                {status === 'ready' && 'Connection Issue'}
              </h4>
              <span className="text-xs text-orange-400/70">
                {retryCount}/{maxRetries} attempts
              </span>
            </div>

            <p className="text-sm text-orange-400/80 mt-1">
              {status === 'retrying' && nextRetryIn > 0 && (
                `Retrying in ${formatDelay(nextRetryIn)}...`
              )}
              {status === 'exhausted' && (
                'Maximum retry attempts reached. Please check your connection and try again.'
              )}
              {status === 'ready' && (
                'Unable to connect. Click retry to try again.'
              )}
            </p>

            {/* Progress Bar for Retry Countdown */}
            {status === 'retrying' && nextRetryIn > 0 && (
              <div className="mt-3">
                <div className="h-1 bg-orange-500/20 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-orange-500 transition-all duration-1000 ease-linear"
                    style={{ 
                      width: `${100 - (nextRetryIn / Math.ceil(calculateBackoffDelay(retryCount + 1, baseDelay, maxDelay) / 1000)) * 100}%` 
                    }}
                  />
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center space-x-3 mt-3">
              {status === 'ready' && (
                <button
                  onClick={handleManualRetry}
                  className="text-sm font-medium text-orange-400 hover:text-orange-300 transition-colors"
                >
                  Retry Now
                </button>
              )}
              
              {status === 'exhausted' && (
                <button
                  onClick={resetRetries}
                  className="text-sm font-medium text-orange-400 hover:text-orange-300 transition-colors"
                >
                  Reset & Try Again
                </button>
              )}

              {retryHistory.length > 0 && (
                <details className="text-xs text-orange-400/60">
                  <summary className="cursor-pointer hover:text-orange-400/80">
                    View Retry History
                  </summary>
                  <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                    {retryHistory.map((entry, index) => (
                      <div key={index} className="flex justify-between text-xs">
                        <span>Attempt {entry.attempt}</span>
                        <span>{formatDelay(Math.ceil(entry.delay / 1000))} delay</span>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Hook for using retry mechanism in components
 */
export const useRetryMechanism = (options = {}) => {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    autoRetry = false
  } = options;

  const [retryState, setRetryState] = useState({
    retryCount: 0,
    isRetrying: false,
    error: null,
    isRetryable: true
  });

  const executeWithRetry = useCallback(async (fn, retryOptions = {}) => {
    const {
      onRetry,
      onError,
      shouldRetry = () => true
    } = retryOptions;

    setRetryState(prev => ({ ...prev, error: null, retryCount: 0 }));

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        setRetryState(prev => ({ ...prev, isRetrying: attempt > 0 }));
        const result = await fn();
        setRetryState(prev => ({ ...prev, isRetrying: false, error: null }));
        return result;
      } catch (error) {
        const canRetry = shouldRetry(error) && attempt < maxRetries;
        
        setRetryState(prev => ({
          ...prev,
          error,
          retryCount: attempt + 1,
          isRetryable: shouldRetry(error),
          isRetrying: canRetry
        }));

        if (canRetry) {
          const delay = calculateBackoffDelay(attempt + 1, baseDelay, maxDelay);
          
          if (onRetry) {
            onRetry(attempt + 1, maxRetries, delay, error);
          }
          
          await sleep(delay);
        } else {
          setRetryState(prev => ({ ...prev, isRetrying: false }));
          
          if (onError) {
            onError(error);
          }
          
          throw error;
        }
      }
    }
  }, [maxRetries, baseDelay, maxDelay]);

  const resetRetries = useCallback(() => {
    setRetryState({
      retryCount: 0,
      isRetrying: false,
      error: null,
      isRetryable: true
    });
  }, []);

  return {
    ...retryState,
    executeWithRetry,
    resetRetries
  };
};

export default RetryMechanism;