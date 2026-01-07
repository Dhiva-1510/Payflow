/**
 * ErrorMessage Component
 * Displays error messages with optional retry functionality
 * Requirements: 7.6, 8.5 - Display appropriate error messages for authentication failures and network errors
 */
const ErrorMessage = ({ 
  message, 
  onRetry, 
  retryText = 'Try Again',
  type = 'error',
  className = '',
  showIcon = true,
  dismissible = false,
  onDismiss,
  isRetrying = false,
  retryCount = 0,
  maxRetries = 3
}) => {
  const styles = {
    error: {
      bg: 'bg-gradient-to-r from-red-500/10 to-red-600/5',
      border: 'border-red-500/20',
      text: 'text-red-400',
      glow: 'shadow-red-500/10',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    warning: {
      bg: 'bg-gradient-to-r from-yellow-500/10 to-orange-500/5',
      border: 'border-yellow-500/20',
      text: 'text-yellow-400',
      glow: 'shadow-yellow-500/10',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      )
    },
    network: {
      bg: 'bg-gradient-to-r from-orange-500/10 to-red-500/5',
      border: 'border-orange-500/20',
      text: 'text-orange-400',
      glow: 'shadow-orange-500/10',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
        </svg>
      )
    },
    info: {
      bg: 'bg-gradient-to-r from-blue-500/10 to-cyan-500/5',
      border: 'border-blue-500/20',
      text: 'text-blue-400',
      glow: 'shadow-blue-500/10',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    }
  };

  const style = styles[type] || styles.error;

  return (
    <div className={`${style.bg} ${style.border} border rounded-xl p-4 shadow-lg ${style.glow} animate-slide-up ${className}`}>
      <div className="flex items-start">
        {showIcon && (
          <div className={`flex-shrink-0 ${style.text} animate-bounce-subtle`}>
            {style.icon}
          </div>
        )}
        <div className={`flex-1 ${showIcon ? 'ml-3' : ''}`}>
          <p className={`text-sm font-medium ${style.text}`}>{message}</p>
          
          {/* Retry status indicator */}
          {isRetrying && (
            <div className="mt-3 flex items-center text-xs text-[#F8F8F8]/60 bg-[#0F0F0F]/30 rounded-lg px-3 py-2">
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-[#5DD62C] mr-2"></div>
              <span>Retrying... (attempt {retryCount} of {maxRetries})</span>
            </div>
          )}
          
          {onRetry && !isRetrying && (
            <button
              onClick={onRetry}
              className={`mt-3 px-4 py-2 text-sm font-medium text-[#F8F8F8] bg-[#5DD62C]/10 hover:bg-[#5DD62C]/20 rounded-lg transition-all duration-200 inline-flex items-center hover:shadow-md transform hover:scale-[1.02] active:scale-[0.98]`}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {retryText}
            </button>
          )}
        </div>
        {dismissible && onDismiss && (
          <button
            onClick={onDismiss}
            className={`ml-4 flex-shrink-0 ${style.text} hover:opacity-70 transition-all duration-200 p-1 rounded-lg hover:bg-[#FFFFFF]/5`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

export default ErrorMessage;
