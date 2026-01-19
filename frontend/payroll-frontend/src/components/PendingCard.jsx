import React from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * PendingCard Component
 * Displays pending approval count with clickable navigation
 * Requirements: 3.1, 3.2, 3.4
 * 
 * Features:
 * - Display pending approval count
 * - Clickable navigation to pending items
 * - Zero state handling with appropriate messaging
 * - Future extensibility for multiple approval types
 * - Responsive design with consistent styling
 */
const PendingCard = ({ 
  pendingCount = 0, 
  approvalTypes = [],
  loading = false,
  error = null,
  className = '',
  onClick = null 
}) => {
  const navigate = useNavigate();

  // Handle click navigation
  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      // Default navigation to payroll management where approvals would be handled
      navigate('/admin/payroll');
    }
  };

  // Format pending count display
  const formatPendingCount = () => {
    if (pendingCount === 0) {
      return 'No pending approvals';
    } else if (pendingCount === 1) {
      return '1 item pending';
    } else {
      return `${pendingCount.toLocaleString()} items pending`;
    }
  };

  // Format approval types display
  const formatApprovalTypes = () => {
    if (!approvalTypes || approvalTypes.length === 0) {
      return 'All approval types';
    } else if (approvalTypes.length === 1) {
      return approvalTypes[0];
    } else if (approvalTypes.length === 2) {
      return `${approvalTypes[0]} and ${approvalTypes[1]}`;
    } else {
      return `${approvalTypes[0]} and ${approvalTypes.length - 1} others`;
    }
  };

  // Handle loading state
  if (loading) {
    return (
      <div className={`card p-6 ${className}`}>
        <div className="space-y-4 animate-pulse">
          <div className="flex items-center justify-between">
            <div className="h-4 bg-[#F8F8F8]/10 rounded w-24"></div>
            <div className="h-4 bg-[#F8F8F8]/10 rounded w-16"></div>
          </div>
          <div className="h-8 bg-[#F8F8F8]/10 rounded w-32"></div>
          <div className="h-3 bg-[#F8F8F8]/10 rounded w-28"></div>
        </div>
      </div>
    );
  }

  // Handle error state
  if (error) {
    return (
      <div className={`card p-6 ${className}`}>
        <div className="flex flex-col items-center space-y-3 text-center">
          <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center">
            <svg 
              className="w-4 h-4 text-red-400" 
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
          <div>
            <p className="text-sm font-medium text-[#F8F8F8]">Approval Data Error</p>
            <p className="text-xs text-[#F8F8F8]/60 mt-1">
              Unable to load pending approvals
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Determine if this is a zero state
  const isZeroState = pendingCount === 0;
  const isClickable = pendingCount > 0 || onClick;

  return (
    <div 
      className={`card p-6 ${isClickable ? 'cursor-pointer hover:bg-[#202020]/50 transition-colors' : ''} ${className}`}
      onClick={isClickable ? handleClick : undefined}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={isClickable ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      } : undefined}
    >
      <div className="flex flex-col h-full">
        {/* Header with title and status indicator */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${
              isZeroState 
                ? 'from-gray-500/20 to-gray-600/20' 
                : 'from-orange-500/20 to-orange-600/20'
            } flex items-center justify-center`}>
              <svg 
                className={`w-4 h-4 ${isZeroState ? 'text-gray-400' : 'text-orange-400'}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" 
                />
              </svg>
            </div>
            <h3 className="text-sm font-medium text-[#F8F8F8]/80">
              Pending Approvals
            </h3>
          </div>
          {!isZeroState && (
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 rounded-full bg-orange-400 animate-pulse"></div>
              <span className="text-xs text-[#F8F8F8]/60 font-medium">
                Action Required
              </span>
            </div>
          )}
        </div>

        {/* Main count display */}
        <div className="flex-1 flex flex-col justify-center">
          {isZeroState ? (
            <div className="text-center py-2">
              <div className="text-2xl font-bold text-[#F8F8F8]/40 mb-1">
                0
              </div>
              <p className="text-sm text-[#F8F8F8]/60">
                No items require approval
              </p>
              <p className="text-xs text-[#F8F8F8]/50 mt-1">
                All tasks are up to date
              </p>
            </div>
          ) : (
            <div className="text-center py-2">
              <div className="text-2xl font-bold text-[#F8F8F8] mb-1">
                {pendingCount.toLocaleString()}
              </div>
              <p className="text-sm text-[#F8F8F8]/70">
                {formatPendingCount()}
              </p>
              <p className="text-xs text-[#F8F8F8]/60 mt-1">
                {formatApprovalTypes()}
              </p>
            </div>
          )}
        </div>

        {/* Footer with action indicator */}
        <div className="mt-4 pt-3 border-t border-[#FFFFFF]/[0.08]">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#F8F8F8]/60">
              {isZeroState ? 'Status' : 'Action'}
            </span>
            <div className="flex items-center space-x-2">
              {isClickable && !isZeroState ? (
                <div className="flex items-center space-x-1">
                  <span className="text-[#F8F8F8]/60">
                    Click to review
                  </span>
                  <svg 
                    className="w-3 h-3 text-[#F8F8F8]/60" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M9 5l7 7-7 7" 
                    />
                  </svg>
                </div>
              ) : (
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 rounded-full bg-[#5DD62C]"></div>
                  <span className="text-[#F8F8F8]/60">
                    All Clear
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PendingCard;