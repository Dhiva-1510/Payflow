import React from 'react';

/**
 * YearSelector Component
 * Dropdown component for selecting years in reports and charts
 */
const YearSelector = ({ 
  selectedYear, 
  onYearChange, 
  availableYears = [], 
  loading = false,
  className = '' 
}) => {
  // Generate a range of years if no available years provided
  const getYearOptions = () => {
    if (availableYears.length > 0) {
      // Remove duplicates and sort descending (newest first)
      const uniqueYears = [...new Set(availableYears)].sort((a, b) => b - a);
      return uniqueYears;
    }
    
    // Default: from 2000 to current year
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let year = currentYear; year >= 2000; year--) {
      years.push(year);
    }
    return years;
  };

  const yearOptions = getYearOptions();

  return (
    <div className={`relative ${className}`}>
      <select
        value={selectedYear}
        onChange={(e) => onYearChange(parseInt(e.target.value))}
        disabled={loading}
        className="
          appearance-none bg-[#202020] border border-[#FFFFFF]/[0.08] 
          text-[#F8F8F8] text-sm rounded-lg px-3 py-2 pr-10 w-full min-w-[80px]
          focus:outline-none focus:ring-2 focus:ring-[#5DD62C]/50 focus:border-[#5DD62C]
          disabled:opacity-50 disabled:cursor-not-allowed
          hover:border-[#FFFFFF]/[0.12] transition-colors
        "
      >
        {yearOptions.map(year => (
          <option key={year} value={year} className="bg-[#202020] text-[#F8F8F8]">
            {year}
          </option>
        ))}
      </select>
      
      {/* Custom dropdown arrow */}
      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
        {loading ? (
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#5DD62C]"></div>
        ) : (
          <svg 
            className="w-4 h-4 text-[#F8F8F8]/60" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M19 9l-7 7-7-7" 
            />
          </svg>
        )}
      </div>
    </div>
  );
};

export default YearSelector;