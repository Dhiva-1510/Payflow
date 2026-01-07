/**
 * RetryIndicator Component
 * Shows a visual indicator when an API request is being retried
 * Requirements: 7.6, 8.5 - Network error handling and retry mechanisms
 */
const RetryIndicator = ({ 
  isRetrying, 
  retryCount, 
  maxRetries = 3,
  message = 'Connection issue detected. Retrying...'
}) => {
  if (!isRetrying) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 animate-slide-up">
      <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4 shadow-lg max-w-sm">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-orange-500 border-t-transparent"></div>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-orange-400">
              {message}
            </p>
            <p className="text-xs text-orange-400/70 mt-1">
              Attempt {retryCount} of {maxRetries}
            </p>
          </div>
        </div>
        {/* Progress bar */}
        <div className="mt-3 h-1 bg-orange-500/20 rounded-full overflow-hidden">
          <div 
            className="h-full bg-orange-500 transition-all duration-300"
            style={{ width: `${(retryCount / maxRetries) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default RetryIndicator;
