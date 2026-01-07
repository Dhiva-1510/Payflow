import { useState, useEffect } from 'react';

/**
 * Notification Component
 * Displays success, error, or info notifications
 * Requirements: 8.3 - Handle success and error cases appropriately
 */
const Notification = ({ type = 'success', message, onClose, duration = 5000, position = 'top-right' }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (duration > 0) {
      // Progress bar animation
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          const newProgress = prev - (100 / (duration / 100));
          return newProgress <= 0 ? 0 : newProgress;
        });
      }, 100);

      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => onClose?.(), 300);
      }, duration);

      return () => {
        clearTimeout(timer);
        clearInterval(progressInterval);
      };
    }
  }, [duration, onClose]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => onClose?.(), 300);
  };

  const positions = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-center': 'top-4 left-1/2 transform -translate-x-1/2',
    'bottom-center': 'bottom-4 left-1/2 transform -translate-x-1/2'
  };

  const styles = {
    success: {
      bg: 'bg-gradient-to-r from-[#5DD62C]/10 to-green-500/5',
      border: 'border-[#5DD62C]/20',
      text: 'text-[#5DD62C]',
      glow: 'shadow-[#5DD62C]/20',
      progress: 'bg-[#5DD62C]',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      )
    },
    error: {
      bg: 'bg-gradient-to-r from-red-500/10 to-red-600/5',
      border: 'border-red-500/20',
      text: 'text-red-400',
      glow: 'shadow-red-500/20',
      progress: 'bg-red-400',
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
      glow: 'shadow-yellow-500/20',
      progress: 'bg-yellow-400',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      )
    },
    info: {
      bg: 'bg-gradient-to-r from-blue-500/10 to-cyan-500/5',
      border: 'border-blue-500/20',
      text: 'text-blue-400',
      glow: 'shadow-blue-500/20',
      progress: 'bg-blue-400',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    }
  };

  const style = styles[type] || styles.info;

  return (
    <div
      className={`fixed ${positions[position]} z-50 transition-all duration-300 ${
        isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-2 scale-95'
      }`}
    >
      <div className={`${style.bg} ${style.border} border rounded-xl shadow-xl ${style.glow} max-w-md backdrop-blur-sm`}>
        <div className="p-4">
          <div className="flex items-start">
            <div className={`flex-shrink-0 ${style.text} animate-bounce-subtle`}>
              {style.icon}
            </div>
            <div className="ml-3 flex-1">
              <p className={`text-sm font-medium ${style.text}`}>{message}</p>
            </div>
            <button
              onClick={handleClose}
              className={`ml-4 flex-shrink-0 ${style.text} hover:opacity-70 transition-all duration-200 p-1 rounded-lg hover:bg-[#FFFFFF]/5`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        {/* Progress bar */}
        {duration > 0 && (
          <div className="h-1 bg-[#FFFFFF]/10 rounded-b-xl overflow-hidden">
            <div 
              className={`h-full ${style.progress} transition-all duration-100 ease-linear rounded-b-xl`}
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default Notification;
