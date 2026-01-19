import { Component } from 'react';

/**
 * Enhanced ErrorBoundary Component
 * Catches JavaScript errors anywhere in the child component tree with comprehensive error handling
 * Requirements: 4.4, 5.5 - Error boundaries for component failures
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      retryCount: 0,
      isRetrying: false
    };
    this.retryTimeoutId = null;
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    
    // Log error to console in development
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Log error to external service in production (if configured)
    if (process.env.NODE_ENV === 'production' && this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  handleRetry = () => {
    const { maxRetries = 3 } = this.props;
    const { retryCount } = this.state;
    
    if (retryCount >= maxRetries) {
      console.warn('Maximum retry attempts reached');
      return;
    }

    this.setState({ 
      isRetrying: true,
      retryCount: retryCount + 1
    });

    // Calculate exponential backoff delay (1s, 2s, 4s, etc.)
    const delay = Math.min(1000 * Math.pow(2, retryCount), 10000);
    
    this.retryTimeoutId = setTimeout(() => {
      this.setState({ 
        hasError: false, 
        error: null, 
        errorInfo: null,
        isRetrying: false
      });
      
      // Call custom retry handler if provided
      if (this.props.onRetry) {
        this.props.onRetry(retryCount + 1);
      }
    }, delay);
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    const { isRetrying, retryCount, hasError } = this.state;
    const { maxRetries = 3 } = this.props;

    if (hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-[#0F0F0F] flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-500/10 mb-6">
              <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            
            <h1 className="text-2xl font-bold text-[#F8F8F8] mb-2">
              Something went wrong
            </h1>
            <p className="text-sm text-[#F8F8F8]/60 mb-6">
              We encountered an unexpected error. Please try again or return to the home page.
            </p>

            {/* Retry status indicator */}
            {isRetrying && (
              <div className="mb-6 p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                <div className="flex items-center justify-center space-x-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-orange-500 border-t-transparent"></div>
                  <div className="text-sm">
                    <p className="text-orange-400 font-medium">
                      Retrying... (attempt {retryCount} of {maxRetries})
                    </p>
                    <p className="text-orange-400/70 text-xs mt-1">
                      Please wait while we attempt to recover
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Error details in development */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-left">
                <p className="text-xs font-mono text-red-400 break-all">
                  {this.state.error.toString()}
                </p>
                {this.state.errorInfo && (
                  <details className="mt-2">
                    <summary className="text-xs text-red-400/70 cursor-pointer">
                      Component Stack
                    </summary>
                    <pre className="text-xs font-mono text-red-400/60 mt-2 whitespace-pre-wrap">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {!isRetrying && retryCount < maxRetries && (
                <button
                  onClick={this.handleRetry}
                  className="px-6 py-2 text-sm font-medium text-[#0F0F0F] bg-[#5DD62C] hover:bg-[#5DD62C]/90 rounded-lg transition-colors inline-flex items-center justify-center"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Try Again {retryCount > 0 && `(${retryCount}/${maxRetries})`}
                </button>
              )}
              
              {retryCount >= maxRetries && (
                <button
                  onClick={this.handleReload}
                  className="px-6 py-2 text-sm font-medium text-[#0F0F0F] bg-orange-500 hover:bg-orange-500/90 rounded-lg transition-colors inline-flex items-center justify-center"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Reload Page
                </button>
              )}
              
              <button
                onClick={this.handleGoHome}
                className="px-6 py-2 text-sm font-medium text-[#F8F8F8]/60 hover:text-[#F8F8F8] bg-[#202020] hover:bg-[#202020]/80 border border-[#FFFFFF]/[0.08] rounded-lg transition-colors"
              >
                Go to Home
              </button>
            </div>

            {/* Retry count indicator */}
            {retryCount > 0 && (
              <div className="mt-4 text-xs text-[#F8F8F8]/50">
                {retryCount >= maxRetries 
                  ? 'Maximum retry attempts reached' 
                  : `Retry attempts: ${retryCount}/${maxRetries}`
                }
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
