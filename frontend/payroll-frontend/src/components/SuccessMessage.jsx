/**
 * SuccessMessage Component
 * Displays success messages with optional actions
 * Requirements: 7.6 - Display appropriate success messages
 */
const SuccessMessage = ({ 
  message, 
  onAction, 
  actionText = 'Continue',
  className = '',
  showIcon = true,
  dismissible = false,
  onDismiss,
  variant = 'default',
  size = 'md'
}) => {
  const sizes = {
    sm: 'p-3 text-sm',
    md: 'p-4 text-sm',
    lg: 'p-6 text-base'
  };

  const variants = {
    default: {
      bg: 'bg-gradient-to-r from-[#5DD62C]/10 to-green-500/5',
      border: 'border-[#5DD62C]/20',
      text: 'text-[#5DD62C]',
      glow: 'shadow-[#5DD62C]/20'
    },
    subtle: {
      bg: 'bg-[#5DD62C]/5',
      border: 'border-[#5DD62C]/10',
      text: 'text-[#5DD62C]',
      glow: 'shadow-none'
    },
    bold: {
      bg: 'bg-gradient-to-r from-[#5DD62C]/20 to-green-500/10',
      border: 'border-[#5DD62C]/30',
      text: 'text-[#5DD62C]',
      glow: 'shadow-[#5DD62C]/30'
    }
  };

  const style = variants[variant] || variants.default;

  return (
    <div className={`${style.bg} ${style.border} border rounded-xl shadow-lg ${style.glow} animate-slide-up ${sizes[size]} ${className}`}>
      <div className="flex items-start">
        {showIcon && (
          <div className={`flex-shrink-0 ${style.text} animate-bounce-subtle`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
        <div className={`flex-1 ${showIcon ? 'ml-3' : ''}`}>
          <p className={`font-medium ${style.text}`}>{message}</p>
          
          {onAction && (
            <button
              onClick={onAction}
              className={`mt-3 px-4 py-2 text-sm font-medium text-[#F8F8F8] bg-[#5DD62C]/10 hover:bg-[#5DD62C]/20 rounded-lg transition-all duration-200 inline-flex items-center hover:shadow-md transform hover:scale-[1.02] active:scale-[0.98]`}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
              {actionText}
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

export default SuccessMessage;