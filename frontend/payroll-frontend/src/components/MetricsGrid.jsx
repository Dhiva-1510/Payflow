import React from 'react';
import ErrorBoundary from './ErrorBoundary';
import LoadingSpinner from './LoadingSpinner';
import { CardSkeleton } from './LoadingSkeleton';
import RetryMechanism from './RetryMechanism';

/**
 * Enhanced MetricsGrid Component
 * Responsive grid layout for dashboard metric cards with comprehensive error handling
 * Requirements: 5.1, 5.2, 5.5, 4.4
 * 
 * Features:
 * - CSS Grid layout with responsive breakpoints
 * - Enhanced loading states with skeleton loaders
 * - Comprehensive error boundaries for component failures
 * - Retry mechanisms with exponential backoff
 * - Consistent card styling and spacing
 */
const MetricsGrid = ({ 
  children, 
  loading = false, 
  error = null, 
  onRetry = null,
  className = '',
  maxRetries = 3,
  autoRetry = false
}) => {
  // Enhanced error state component with retry mechanism
  const ErrorState = ({ error, onRetry, maxRetries, autoRetry }) => (
    <div className="col-span-full">
      <div className="card p-8 text-center">
        <div className="flex flex-col items-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
            <svg 
              className="w-8 h-8 text-red-400" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" 
              />
            </svg>
          </div>
          
          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-[#F8F8F8]">
              Dashboard Metrics Unavailable
            </h3>
            <p className="text-[#F8F8F8]/60 max-w-md">
              {error?.message || 'An unexpected error occurred while loading the dashboard data. Please check your connection and try again.'}
            </p>
          </div>

          {/* Enhanced retry mechanism */}
          {onRetry && (
            <RetryMechanism
              onRetry={onRetry}
              maxRetries={maxRetries}
              autoRetry={autoRetry}
              error={error}
              isRetryable={true}
              className="w-full max-w-md"
            />
          )}

          {/* Fallback manual retry button if RetryMechanism fails */}
          {onRetry && !autoRetry && (
            <button
              onClick={onRetry}
              className="btn-secondary inline-flex items-center space-x-2"
            >
              <svg 
                className="w-4 h-4" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
                />
              </svg>
              <span>Try Again</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );

  // Enhanced loading state with sophisticated skeletons
  const LoadingState = () => (
    <>
      <CardSkeleton className="animate-pulse" />
      <CardSkeleton className="animate-pulse" style={{ animationDelay: '0.1s' }} />
      <CardSkeleton className="animate-pulse" style={{ animationDelay: '0.2s' }} />
    </>
  );

  // If there's an error, show enhanced error state
  if (error) {
    return (
      <div className={`metrics-grid ${className}`}>
        <ErrorState 
          error={error} 
          onRetry={onRetry} 
          maxRetries={maxRetries}
          autoRetry={autoRetry}
        />
      </div>
    );
  }

  // If loading, show enhanced skeleton loaders
  if (loading) {
    return (
      <div className={`metrics-grid ${className}`}>
        <LoadingState />
      </div>
    );
  }

  // Normal state with enhanced error boundaries around children
  return (
    <div className={`metrics-grid ${className}`}>
      {React.Children.map(children, (child, index) => (
        <ErrorBoundary
          key={index}
          maxRetries={2}
          onError={(error, errorInfo) => {
            console.error(`MetricsGrid child ${index} error:`, error, errorInfo);
          }}
          fallback={
            <div className="card p-6">
              <div className="flex flex-col items-center space-y-4 text-center">
                <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
                  <svg 
                    className="w-6 h-6 text-red-400" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M6 18L18 6M6 6l12 12" 
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-[#F8F8F8] mb-1">
                    Metric Card Error
                  </p>
                  <p className="text-xs text-[#F8F8F8]/60">
                    This metric card failed to load properly
                  </p>
                </div>
                <button
                  onClick={() => window.location.reload()}
                  className="text-xs text-[#5DD62C] hover:text-[#5DD62C]/80 transition-colors"
                >
                  Reload Page
                </button>
              </div>
            </div>
          }
        >
          {child}
        </ErrorBoundary>
      ))}
    </div>
  );
};

export default MetricsGrid;