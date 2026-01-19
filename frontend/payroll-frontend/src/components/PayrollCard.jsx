import React from 'react';
import { formatCurrency } from '../utils/currency';

/**
 * PayrollCard Component
 * Displays monthly payroll total with currency formatting and context
 * Requirements: 1.1, 1.2, 1.4, 1.5
 * 
 * Features:
 * - Monthly payroll total with proper currency formatting
 * - Month/year context display
 * - Employee count information
 * - Zero state handling with appropriate messaging
 * - Responsive design with consistent styling
 */
const PayrollCard = ({ 
  amount = 0, 
  employeeCount = 0, 
  month = new Date().getMonth() + 1, 
  year = new Date().getFullYear(),
  loading = false,
  error = null,
  className = '' 
}) => {
  // Month names for display
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Get month name from month number
  const getMonthName = (monthNum) => {
    return monthNames[monthNum - 1] || 'Unknown';
  };

  // Format the month/year display
  const formatPeriod = () => {
    return `${getMonthName(month)} ${year}`;
  };

  // Format employee count display
  const formatEmployeeCount = () => {
    if (employeeCount === 0) {
      return 'No employees paid';
    } else if (employeeCount === 1) {
      return '1 employee paid';
    } else {
      return `${employeeCount.toLocaleString()} employees paid`;
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
            <p className="text-sm font-medium text-[#F8F8F8]">Payroll Data Error</p>
            <p className="text-xs text-[#F8F8F8]/60 mt-1">
              Unable to load payroll information
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Determine if this is a zero state
  const isZeroState = amount === 0 && employeeCount === 0;

  return (
    <div className={`card p-6 ${className}`}>
      <div className="flex flex-col h-full">
        {/* Header with title and period */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#5DD62C]/20 to-[#337418]/20 flex items-center justify-center">
              <svg 
                className="w-4 h-4 text-[#5DD62C]" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" 
                />
              </svg>
            </div>
            <h3 className="text-sm font-medium text-[#F8F8F8]/80">
              Total Payroll
            </h3>
          </div>
          <span className="text-xs text-[#F8F8F8]/60 font-medium">
            {formatPeriod()}
          </span>
        </div>

        {/* Main amount display */}
        <div className="flex-1 flex flex-col justify-center">
          {isZeroState ? (
            <div className="text-center py-2">
              <div className="text-2xl font-bold text-[#F8F8F8]/40 mb-1">
                {formatCurrency(0, 'INR')}
              </div>
              <p className="text-sm text-[#F8F8F8]/60">
                No payroll processed this month
              </p>
            </div>
          ) : (
            <div className="text-center py-2">
              <div className="text-2xl font-bold text-[#F8F8F8] mb-1">
                {formatCurrency(amount, 'INR')}
              </div>
              <p className="text-sm text-[#F8F8F8]/70">
                {formatEmployeeCount()}
              </p>
            </div>
          )}
        </div>

        {/* Footer with additional context */}
        <div className="mt-4 pt-3 border-t border-[#FFFFFF]/[0.08]">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#F8F8F8]/60">
              Period Total
            </span>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 rounded-full bg-[#5DD62C] animate-pulse"></div>
              <span className="text-[#F8F8F8]/60">
                Live Data
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PayrollCard;