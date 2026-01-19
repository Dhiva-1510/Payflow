import { useState, useEffect } from 'react';
import { useSettings } from '../context/SettingsContext';

/**
 * PayrollChart Component
 * Flexible chart component for displaying different payroll metrics
 * Can show base salary, allowance, deduction, or net salary
 * Supports both line charts and bar charts
 */
const PayrollChart = ({ 
  payrollData, 
  reportData,
  selectedYear,
  type = 'netSalary', 
  title, 
  color = '#5DD62C', 
  chartType = 'line' // 'line' or 'bar'
}) => {
  const { formatCurrency, formatCompactCurrency } = useSettings();
  const [chartData, setChartData] = useState([]);
  const [maxValue, setMaxValue] = useState(0);
  const [minValue, setMinValue] = useState(0);

  // Define chart configurations for different types
  const chartConfigs = {
    baseSalary: {
      title: 'Base Salary History',
      color: '#5DD62C',
      icon: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
      )
    },
    allowance: {
      title: 'Allowance History',
      color: '#10B981',
      icon: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
      )
    },
    deduction: {
      title: 'Deduction History',
      color: '#EF4444',
      icon: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
      )
    },
    netSalary: {
      title: 'Net Salary History',
      color: '#5DD62C',
      icon: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      )
    }
  };

  const config = chartConfigs[type] || chartConfigs.netSalary;
  const chartColor = color || config.color;
  const chartTitle = title || config.title;

  useEffect(() => {
    let dataToProcess = [];
    
    // Handle both payrollData (employee dashboard) and reportData (admin dashboard)
    if (reportData && reportData.data) {
      // Admin dashboard format
      dataToProcess = reportData.data.map(monthData => ({
        month: monthData.month,
        year: reportData.year,
        netSalary: monthData.totalAmount,
        baseSalary: monthData.totalAmount * 0.8, // Approximate
        allowance: monthData.totalAmount * 0.15, // Approximate
        deduction: monthData.totalAmount * 0.05, // Approximate
        createdAt: new Date(reportData.year, monthData.month - 1, 1).toISOString()
      }));
    } else if (payrollData && payrollData.length > 0) {
      // Employee dashboard format
      dataToProcess = payrollData;
    }
    
    if (dataToProcess.length > 0) {
      // Sort by date and take last 12 months
      const sortedData = [...dataToProcess]
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
        .slice(-12);
      
      setChartData(sortedData);
      
      const values = sortedData.map(d => d[type] || 0);
      const max = Math.max(...values);
      const min = Math.min(...values);
      
      // Add some padding to the range, ensure minimum range for single data point
      if (sortedData.length === 1) {
        const value = values[0];
        setMaxValue(value * 1.2);
        setMinValue(Math.max(0, value * 0.8));
      } else {
        const range = max - min;
        const padding = range > 0 ? range * 0.1 : max * 0.1;
        setMaxValue(max + padding);
        setMinValue(Math.max(0, min - padding));
      }
    }
  }, [payrollData, reportData, type]);

  const getMonthName = (month) => {
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    return months[month - 1] || '';
  };

  if (!chartData.length) {
    return (
      <div className="bg-[#0F0F0F] rounded-lg border border-[#FFFFFF]/[0.08] p-6">
        <div className="flex items-center mb-4">
          <svg className="w-5 h-5 mr-2" style={{ color: chartColor }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {config.icon}
          </svg>
          <h3 className="text-lg font-semibold text-[#F8F8F8]">{chartTitle}</h3>
        </div>
        <div className="flex items-center justify-center h-48">
          <div className="text-center">
            <svg className="w-12 h-12 text-[#F8F8F8]/20 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {config.icon}
            </svg>
            <p className="text-[#F8F8F8]/60">No {type.replace(/([A-Z])/g, ' $1').toLowerCase()} history available</p>
            <p className="text-[#F8F8F8]/40 text-sm mt-1">Your {type.replace(/([A-Z])/g, ' $1').toLowerCase()} trends will appear here</p>
          </div>
        </div>
      </div>
    );
  }

  // Determine if this is an admin dashboard chart (has reportData) or employee dashboard
  const isAdminChart = !!(reportData && reportData.data);
  const isNetSalaryOverview = !title && type === 'netSalary';
  
  // Set chart dimensions based on context
  let chartWidth, chartHeight;
  if (isAdminChart) {
    // Admin dashboard chart - full width
    chartWidth = 800;
    chartHeight = 300;
  } else if (isNetSalaryOverview) {
    // Employee dashboard net salary overview - same size as admin
    chartWidth = 800;
    chartHeight = 300;
  } else {
    // Employee dashboard individual charts - smaller
    chartWidth = 400;
    chartHeight = 200;
  }
  const padding = (isAdminChart || isNetSalaryOverview) ? 60 : 40;
  const innerWidth = chartWidth - padding * 2;
  const innerHeight = chartHeight - padding * 2;

  // Calculate points for the line
  const points = chartData.map((data, index) => {
    // Handle single data point case
    const xRatio = chartData.length === 1 ? 0.5 : index / (chartData.length - 1);
    const x = padding + xRatio * innerWidth;
    const value = data[type] || 0;
    const yRatio = (maxValue - minValue) > 0 ? (value - minValue) / (maxValue - minValue) : 0.5;
    const y = padding + innerHeight - (yRatio * innerHeight);
    return { x, y, data, value };
  });

  // Create path string for the line or bars
  let pathData = '';
  let areaPath = '';
  let bars = [];
  
  if (chartType === 'bar') {
    // Calculate bar dimensions
    const maxBarWidth = 60;
    const minBarWidth = 20;
    const availableWidth = innerWidth * 0.8; // Use 80% of available width
    const barWidth = Math.min(maxBarWidth, Math.max(minBarWidth, availableWidth / chartData.length));
    const totalBarsWidth = barWidth * chartData.length;
    const startX = padding + (innerWidth - totalBarsWidth) / 2;
    
    bars = points.map((point, index) => {
      const barHeight = Math.max(2, innerHeight - (point.y - padding));
      const barX = startX + (index * barWidth);
      const barY = padding + innerHeight - barHeight;
      
      return {
        x: barX,
        y: barY,
        width: barWidth,
        height: barHeight,
        value: point.value,
        data: point.data
      };
    });
  } else {
    // Line chart logic (existing)
    if (points.length === 1) {
      // For single point, create a small horizontal line
      const point = points[0];
      const lineLength = 15;
      pathData = `M ${point.x - lineLength} ${point.y} L ${point.x + lineLength} ${point.y}`;
      areaPath = `M ${point.x - lineLength} ${point.y} L ${point.x + lineLength} ${point.y} L ${point.x + lineLength} ${padding + innerHeight} L ${point.x - lineLength} ${padding + innerHeight} Z`;
    } else {
      // For multiple points, create normal line
      pathData = points.reduce((path, point, index) => {
        const command = index === 0 ? 'M' : 'L';
        return `${path} ${command} ${point.x} ${point.y}`;
      }, '');
      
      // Create area path for gradient fill
      areaPath = `${pathData} L ${points[points.length - 1].x} ${padding + innerHeight} L ${points[0].x} ${padding + innerHeight} Z`;
    }
  }

  const gradientId = `gradient-${type}`;

  return (
    <div className="bg-[#0F0F0F] rounded-lg border border-[#FFFFFF]/[0.08] p-4">
      {/* Chart Header */}
      {chartTitle && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" style={{ color: chartColor }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {config.icon}
            </svg>
            <h3 className="text-lg font-semibold text-[#F8F8F8]">{chartTitle}</h3>
          </div>
          <div className="text-right">
            <div className="text-xs text-[#F8F8F8]/60">Latest</div>
            <div className="text-sm font-semibold" style={{ color: chartColor }}>
              {formatCompactCurrency(chartData[chartData.length - 1]?.[type] || 0)}
            </div>
          </div>
        </div>
      )}

      {!chartTitle && (
        <div className="flex justify-end mb-4">
          <div className="text-right">
            <div className="text-xs text-[#F8F8F8]/60">
              {isAdminChart ? 'Latest Monthly Total' : 'Latest Net Salary'}
            </div>
            <div className="text-xl font-bold" style={{ color: chartColor }}>
              {formatCurrency(chartData[chartData.length - 1]?.[type] || 0)}
            </div>
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="overflow-x-auto">
        <svg width={chartWidth} height={chartHeight} className="w-full">
          {/* Grid lines */}
          {((isAdminChart || isNetSalaryOverview) ? [0, 0.2, 0.4, 0.6, 0.8, 1] : [0, 0.5, 1]).map((ratio, index) => {
            const y = padding + innerHeight - (ratio * innerHeight);
            const value = minValue + (maxValue - minValue) * ratio;
            return (
              <g key={index}>
                <line
                  x1={padding}
                  y1={y}
                  x2={chartWidth - padding}
                  y2={y}
                  stroke="#FFFFFF"
                  strokeOpacity="0.05"
                  strokeWidth="1"
                />
                <text
                  x={padding - 5}
                  y={y + 3}
                  fill="#F8F8F8"
                  fillOpacity="0.4"
                  fontSize={(isAdminChart || isNetSalaryOverview) ? "12" : "10"}
                  textAnchor="end"
                >
                  {formatCompactCurrency(value)}
                </text>
              </g>
            );
          })}

          {/* Area fill for line charts */}
          {chartType === 'line' && pathData && (
            <path
              d={areaPath}
              fill={`url(#${gradientId})`}
              fillOpacity="0.1"
            />
          )}

          {/* Main line for line charts */}
          {chartType === 'line' && pathData && (
            <path
              d={pathData}
              fill="none"
              stroke={chartColor}
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeOpacity="1"
            />
          )}

          {/* Bars for bar charts */}
          {chartType === 'bar' && bars.map((bar, index) => (
            <g key={index}>
              {/* Bar */}
              <rect
                x={bar.x}
                y={bar.y}
                width={bar.width}
                height={bar.height}
                fill={`url(#${gradientId})`}
                stroke={chartColor}
                strokeWidth="1"
                rx="2"
                className="transition-all duration-200 hover:opacity-80"
              />
              
              {/* Value label on top of bar */}
              <text
                x={bar.x + bar.width / 2}
                y={bar.y - 8}
                fill={chartColor}
                fontSize={(isAdminChart || isNetSalaryOverview) ? "12" : "10"}
                textAnchor="middle"
                className="font-medium"
              >
                {formatCompactCurrency(bar.value)}
              </text>

              {/* Hover tooltip area */}
              <rect
                x={bar.x}
                y={bar.y}
                width={bar.width}
                height={bar.height}
                fill="transparent"
                className="cursor-pointer"
              >
                <title>
                  {getMonthName(bar.data.month)} {bar.data.year}: {formatCurrency(bar.value)}
                </title>
              </rect>
            </g>
          ))}

          {/* Data points for line charts */}
          {chartType === 'line' && points.map((point, index) => (
            <g key={index}>
              {/* Outer glow circle */}
              <circle
                cx={point.x}
                cy={point.y}
                r="6"
                fill={chartColor}
                fillOpacity="0.2"
              />
              
              {/* Main data point */}
              <circle
                cx={point.x}
                cy={point.y}
                r="3"
                fill={chartColor}
                stroke="#0F0F0F"
                strokeWidth="1"
                className="transition-all duration-200 hover:r-4"
              />

              {/* Hover tooltip area */}
              <circle
                cx={point.x}
                cy={point.y}
                r="10"
                fill="transparent"
                className="cursor-pointer"
              >
                <title>
                  {getMonthName(point.data.month)} {point.data.year}: {formatCurrency(point.value)}
                </title>
              </circle>
            </g>
          ))}

          {/* X-axis labels */}
          {chartType === 'bar' ? (
            // Bar chart labels - show all months
            bars.map((bar, index) => (
              <text
                key={index}
                x={bar.x + bar.width / 2}
                y={chartHeight - padding + ((isAdminChart || isNetSalaryOverview) ? 20 : 15)}
                fill="#F8F8F8"
                fillOpacity="0.6"
                fontSize={(isAdminChart || isNetSalaryOverview) ? "12" : "10"}
                textAnchor="middle"
              >
                {getMonthName(bar.data.month)}
              </text>
            ))
          ) : (
            // Line chart labels - show first and last only to save space
            points.length > 0 && (
              <>
                <text
                  x={points[0].x}
                  y={chartHeight - padding + 15}
                  fill="#F8F8F8"
                  fillOpacity="0.6"
                  fontSize="10"
                  textAnchor="middle"
                >
                  {getMonthName(points[0].data.month)}
                </text>
                {points.length > 1 && (
                  <text
                    x={points[points.length - 1].x}
                    y={chartHeight - padding + 15}
                    fill="#F8F8F8"
                    fillOpacity="0.6"
                    fontSize="10"
                    textAnchor="middle"
                  >
                    {getMonthName(points[points.length - 1].data.month)}
                  </text>
                )}
              </>
            )
          )}

          {/* Gradient definition */}
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={chartColor} stopOpacity={chartType === 'bar' ? "0.8" : "0.3"} />
              <stop offset="100%" stopColor={chartColor} stopOpacity={chartType === 'bar' ? "0.4" : "0.05"} />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Chart Summary */}
      <div className={`mt-4 grid gap-4 text-center ${(isAdminChart || isNetSalaryOverview) ? 'grid-cols-1 md:grid-cols-4' : 'grid-cols-2'}`}>
        <div>
          <div className="text-xs text-[#F8F8F8]/60">Trend</div>
          <div className="text-sm font-semibold text-[#F8F8F8]">
            {chartData.length >= 2 ? (
              chartData[chartData.length - 1][type] > chartData[chartData.length - 2][type] ? (
                <span style={{ color: chartColor }}>↗ Up</span>
              ) : chartData[chartData.length - 1][type] < chartData[chartData.length - 2][type] ? (
                <span className="text-red-400">↘ Down</span>
              ) : (
                <span className="text-[#F8F8F8]">→ Stable</span>
              )
            ) : (
              <span className="text-[#F8F8F8]">--</span>
            )}
          </div>
        </div>
        <div>
          <div className="text-xs text-[#F8F8F8]/60">Average</div>
          <div className="text-sm font-semibold text-[#F8F8F8]">
            {formatCompactCurrency(chartData.reduce((sum, d) => sum + (d[type] || 0), 0) / chartData.length)}
          </div>
        </div>
        {!(isAdminChart || isNetSalaryOverview) && (
          <>
            <div>
              <div className="text-xs text-[#F8F8F8]/60">Highest</div>
              <div className="text-sm font-semibold" style={{ color: chartColor }}>
                {formatCompactCurrency(Math.max(...chartData.map(d => d[type] || 0)))}
              </div>
            </div>
            <div>
              <div className="text-xs text-[#F8F8F8]/60">Total Records</div>
              <div className="text-sm font-semibold text-[#F8F8F8]">
                {chartData.length}
              </div>
            </div>
          </>
        )}
        {(isAdminChart || isNetSalaryOverview) && (
          <>
            <div>
              <div className="text-xs text-[#F8F8F8]/60">Highest</div>
              <div className="text-sm font-semibold" style={{ color: chartColor }}>
                {formatCompactCurrency(Math.max(...chartData.map(d => d[type] || 0)))}
              </div>
            </div>
            <div>
              <div className="text-xs text-[#F8F8F8]/60">Total Records</div>
              <div className="text-sm font-semibold text-[#F8F8F8]">
                {chartData.length}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PayrollChart;