import React from 'react';

/**
 * EmployeeCard Component
 * Displays count of employees paid vs total employees with context information
 * Requirements: 2.1, 2.2, 2.4, 2.5
 * 
 * Features:
 * - Count of employees paid in current month
 * - Total employee count for context
 * - Descriptive labels and context information
 * - Zero state handling with appropriate messaging
 * - Responsive design with consistent styling
 */
const EmployeeCard = ({ 
  employeesPaid = 0, 
  totalEmployees = 0, 
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
    if (employeesPaid === 0) {
      return 'No employees paid';
    } else if (employeesPaid === 1) {
      return '1 employee paid';
    } else {
      return `${employeesPaid.toLocaleString()} employees paid`;
    }
  };

  // Format total employee context
  const formatTotalContext = () => {
    if (totalEmployees === 0) {
      return 'No employees in system';
    } else if (totalEmployees === 1) {
      return 'of 1 total employee';
    } else {
      return `of ${totalEmployees.toLocaleString()} total employees`;
    }
  };

  // Calculate coverage percentage
  const getCoveragePercentage = () => {
    if (totalEmployees === 0) return 0;
    return Math.round((employeesPaid / totalEmployees) * 100);
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
            <p className="text-sm font-medium text-[#F8F8F8]">Employee Data Error</p>
            <p className="text-xs text-[#F8F8F8]/60 mt-1">
              Unable to load employee information
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Determine if this is a zero state
  const isZeroState = employeesPaid === 0;
  const coveragePercentage = getCoveragePercentage();

  return (
    <div className={`card p-6 ${className}`}>
      <div className="flex flex-col h-full">
        {/* Header with title and period */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-600/20 flex items-center justify-center">
              <svg 
                className="w-4 h-4 text-blue-400" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" 
                />
              </svg>
            </div>
            <h3 className="text-sm font-medium text-[#F8F8F8]/80">
              Employees Paid
            </h3>
          </div>
          <span className="text-xs text-[#F8F8F8]/60 font-medium">
            {formatPeriod()}
          </span>
        </div>

        {/* Main count display */}
        <div className="flex-1 flex flex-col justify-center">
          {isZeroState ? (
            <div className="text-center py-2">
              <div className="text-2xl font-bold text-[#F8F8F8]/40 mb-1">
                0
              </div>
              <p className="text-sm text-[#F8F8F8]/60">
                No employees paid this month
              </p>
              {totalEmployees > 0 && (
                <p className="text-xs text-[#F8F8F8]/50 mt-1">
                  {formatTotalContext()}
                </p>
              )}
            </div>
          ) : (
            <div className="text-center py-2">
              <div className="text-2xl font-bold text-[#F8F8F8] mb-1">
                {employeesPaid.toLocaleString()}
              </div>
              <p className="text-sm text-[#F8F8F8]/70">
                {formatEmployeeCount()}
              </p>
              <p className="text-xs text-[#F8F8F8]/60 mt-1">
                {formatTotalContext()}
              </p>
            </div>
          )}
        </div>

        {/* Footer with coverage information */}
        <div className="mt-4 pt-3 border-t border-[#FFFFFF]/[0.08]">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#F8F8F8]/60">
              Coverage
            </span>
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1">
                <div 
                  className={`w-2 h-2 rounded-full ${
                    coveragePercentage === 100 
                      ? 'bg-[#5DD62C]' 
                      : coveragePercentage >= 80 
                        ? 'bg-blue-400' 
                        : coveragePercentage >= 50 
                          ? 'bg-yellow-400' 
                          : 'bg-red-400'
                  } ${coveragePercentage > 0 ? 'animate-pulse' : ''}`}
                ></div>
                <span className="text-[#F8F8F8]/60">
                  {coveragePercentage}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeCard;