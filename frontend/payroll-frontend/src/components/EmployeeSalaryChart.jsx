import { useState, useEffect } from 'react';
import { useSettings } from '../context/SettingsContext';

/**
 * EmployeeSalaryChart Component
 * Line chart showing employee's salary history over time
 */
const EmployeeSalaryChart = ({ payrollData }) => {
  const { formatCurrency, formatCompactCurrency } = useSettings();
  const [chartData, setChartData] = useState([]);
  const [maxValue, setMaxValue] = useState(0);
  const [minValue, setMinValue] = useState(0);

  useEffect(() => {
    if (payrollData && payrollData.length > 0) {
      // Sort by date and take last 12 months
      const sortedData = [...payrollData]
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
        .slice(-12);
      
      setChartData(sortedData);
      
      const salaries = sortedData.map(d => d.netSalary);
      const max = Math.max(...salaries);
      const min = Math.min(...salaries);
      
      // Add some padding to the range, ensure minimum range for single data point
      if (sortedData.length === 1) {
        const value = salaries[0];
        setMaxValue(value * 1.2);
        setMinValue(value * 0.8);
      } else {
        const range = max - min;
        const padding = range > 0 ? range * 0.1 : max * 0.1;
        setMaxValue(max + padding);
        setMinValue(Math.max(0, min - padding));
      }
    }
  }, [payrollData]);

  const getMonthName = (month) => {
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    return months[month - 1] || '';
  };

  if (!chartData.length) {
    return (
      <div className="flex items-center justify-center h-64 bg-[#0F0F0F] rounded-lg border border-[#FFFFFF]/[0.08]">
        <div className="text-center">
          <svg className="w-12 h-12 text-[#F8F8F8]/20 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          <p className="text-[#F8F8F8]/60">No salary history available</p>
          <p className="text-[#F8F8F8]/40 text-sm mt-1">Your salary trends will appear here</p>
        </div>
      </div>
    );
  }

  const chartWidth = 800;
  const chartHeight = 300;
  const padding = 60;
  const innerWidth = chartWidth - padding * 2;
  const innerHeight = chartHeight - padding * 2;

  // Calculate points for the line
  const points = chartData.map((data, index) => {
    // Handle single data point case
    const xRatio = chartData.length === 1 ? 0.5 : index / (chartData.length - 1);
    const x = padding + xRatio * innerWidth;
    const yRatio = (maxValue - minValue) > 0 ? (data.netSalary - minValue) / (maxValue - minValue) : 0.5;
    const y = padding + innerHeight - (yRatio * innerHeight);
    return { x, y, data };
  });

  // Create path string for the line
  let pathData = '';
  let areaPath = '';
  
  if (points.length === 1) {
    // For single point, create a small horizontal line
    const point = points[0];
    const lineLength = 20;
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

  return (
    <div className="bg-[#0F0F0F] rounded-lg border border-[#FFFFFF]/[0.08] p-6">
      <div className="overflow-x-auto">
        <svg width={chartWidth} height={chartHeight} className="min-w-full">
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
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
                  x={padding - 10}
                  y={y + 4}
                  fill="#F8F8F8"
                  fillOpacity="0.4"
                  fontSize="12"
                  textAnchor="end"
                >
                  {formatCompactCurrency(value)}
                </text>
              </g>
            );
          })}

          {/* Area fill */}
          {pathData && (
            <path
              d={areaPath}
              fill="url(#salaryGradient)"
              fillOpacity="0.1"
            />
          )}

          {/* Main line */}
          {pathData && (
            <path
              d={pathData}
              fill="none"
              stroke="#5DD62C"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeOpacity="1"
            />
          )}

          {/* Fallback for single point - add a horizontal reference line */}
          {chartData.length === 1 && points.length > 0 && (
            <line
              x1={padding}
              x2={chartWidth - padding}
              y1={points[0].y}
              y2={points[0].y}
              stroke="#5DD62C"
              strokeWidth="2"
              strokeOpacity="0.3"
              strokeDasharray="5,5"
            />
          )}

          {/* Data points */}
          {points.map((point, index) => (
            <g key={index}>
              {/* Outer glow circle */}
              <circle
                cx={point.x}
                cy={point.y}
                r="8"
                fill="#5DD62C"
                fillOpacity="0.2"
              />
              
              {/* Main data point */}
              <circle
                cx={point.x}
                cy={point.y}
                r="5"
                fill="#5DD62C"
                stroke="#0F0F0F"
                strokeWidth="2"
                className="transition-all duration-200 hover:r-7"
              />
              
              {/* Month labels */}
              <text
                x={point.x}
                y={chartHeight - padding + 20}
                fill="#F8F8F8"
                fillOpacity="0.6"
                fontSize="12"
                textAnchor="middle"
              >
                {getMonthName(point.data.month)}
              </text>
              
              {/* Year labels (only show if different from previous) */}
              {(index === 0 || point.data.year !== points[index - 1].data.year) && (
                <text
                  x={point.x}
                  y={chartHeight - padding + 35}
                  fill="#F8F8F8"
                  fillOpacity="0.4"
                  fontSize="10"
                  textAnchor="middle"
                >
                  {point.data.year}
                </text>
              )}

              {/* Hover tooltip area */}
              <circle
                cx={point.x}
                cy={point.y}
                r="15"
                fill="transparent"
                className="cursor-pointer"
              >
                <title>
                  {getMonthName(point.data.month)} {point.data.year}: {formatCurrency(point.data.netSalary)}
                </title>
              </circle>
            </g>
          ))}

          {/* Gradient definition */}
          <defs>
            <linearGradient id="salaryGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#5DD62C" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#5DD62C" stopOpacity="0.05" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Chart Summary */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="text-center">
          <div className="text-sm text-[#F8F8F8]/60">Salary Trend</div>
          <div className="text-lg font-semibold text-[#F8F8F8]">
            {chartData.length >= 2 ? (
              chartData[chartData.length - 1].netSalary > chartData[chartData.length - 2].netSalary ? (
                <span className="text-[#5DD62C]">↗ Increasing</span>
              ) : chartData[chartData.length - 1].netSalary < chartData[chartData.length - 2].netSalary ? (
                <span className="text-red-400">↘ Decreasing</span>
              ) : (
                <span className="text-[#F8F8F8]">→ Stable</span>
              )
            ) : (
              <span className="text-[#F8F8F8]">--</span>
            )}
          </div>
        </div>
        <div className="text-center">
          <div className="text-sm text-[#F8F8F8]/60">Highest</div>
          <div className="text-lg font-semibold text-[#5DD62C]">
            {formatCompactCurrency(Math.max(...chartData.map(d => d.netSalary)))}
          </div>
        </div>
        <div className="text-center">
          <div className="text-sm text-[#F8F8F8]/60">Average</div>
          <div className="text-lg font-semibold text-[#F8F8F8]">
            {formatCompactCurrency(chartData.reduce((sum, d) => sum + d.netSalary, 0) / chartData.length)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeSalaryChart;