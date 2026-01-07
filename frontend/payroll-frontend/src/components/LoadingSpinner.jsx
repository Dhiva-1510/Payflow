/**
 * LoadingSpinner Component
 * Displays a loading spinner with optional message
 * Requirements: 8.1, 8.3 - Implement loading states
 */
const LoadingSpinner = ({ message = 'Loading...', size = 'md', fullScreen = false, variant = 'default' }) => {
  const sizes = {
    xs: 'h-3 w-3',
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16'
  };

  const variants = {
    default: 'border-[#5DD62C]',
    primary: 'border-[#5DD62C]',
    secondary: 'border-[#F8F8F8]/60',
    success: 'border-green-400',
    error: 'border-red-400',
    warning: 'border-yellow-400'
  };

  const spinner = (
    <div className="flex flex-col items-center justify-center space-y-3">
      <div className="relative">
        <div className={`animate-spin rounded-full border-2 border-transparent ${sizes[size]}`}>
          <div className={`absolute inset-0 rounded-full border-2 border-t-transparent ${variants[variant]} animate-spin`}></div>
        </div>
        {/* Pulsing center dot */}
        <div className={`absolute inset-0 flex items-center justify-center`}>
          <div className={`w-1 h-1 ${variant === 'default' || variant === 'primary' ? 'bg-[#5DD62C]' : `bg-${variant}-400`} rounded-full animate-pulse`}></div>
        </div>
      </div>
      {message && (
        <div className="text-center">
          <span className="text-[#F8F8F8]/60 text-sm font-medium">{message}</span>
          <div className="loading-dots text-[#F8F8F8]/40 text-xs mt-1"></div>
        </div>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-[#0F0F0F]/90 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
        <div className="bg-[#202020] rounded-xl border border-[#FFFFFF]/10 p-8 shadow-2xl">
          {spinner}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center py-4">
      {spinner}
    </div>
  );
};

export default LoadingSpinner;
