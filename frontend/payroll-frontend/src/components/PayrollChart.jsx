import { useState, useEffect } from 'react';
import { useSettings } from '../context/SettingsContext';

/**
 * PayrollChart Component
 * Simple SVG-based chart showing monthly payroll trends
 */
const PayrollChart = ({ reportData }) => {
  const { formatCompactCurrency } = useSettings();
  const [chartData, setChartData] = useState([]);
  const [maxValue, setMaxValue] = useState(0);

  useEffect(() => {
    if (reportData && reportData.data) {
      const data = reportData.data.filter(month => month.totalAmount > 0);
      setChartData(data);
      
      const max = Math.max(...data.map(d => d.totalAmount));
      setMaxValue(max);
    }
  }, [reportData]);

  const formatShortCurrency = (amount) => {
    return formatCompactCurrency(amount);
  };

  if (!chartData.length) {
    return (
      <div className="flex items-center justify-center h-64 bg-[#0F0F0F] rounded-lg border border-[#FFFFFF]/[0.08]">
        <div className="text-center">
          <svg className="w-12 h-12 text-[#F8F8F8]/20 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p className="text-[#F8F8F8]/60">No payroll data available</p>
          <p className="text-[#F8F8F8]/40 text-sm mt-1">Run payroll to see trends</p>
        </div>
      </div>
    );
  }

  const chartWidth = 800;
  const chartHeight = 300;
  const padding = 60;
  const innerWidth = chartWidth - padding * 2;
  const innerHeight = chartHeight - padding * 2;

  // Calculate positions for bars
  const barWidth = innerWidth / chartData.length * 0.7;
  const barSpacing = innerWidth / chartData.length;

  return (
    <div className="bg-[#0F0F0F] rounded-lg border border-[#FFFFFF]/[0.08] p-6">
      <div className="overflow-x-auto">
        <svg width={chartWidth} height={chartHeight} className="min-w-full">
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
            const y = padding + innerHeight - (ratio * innerHeight);
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
                  {formatShortCurrency(maxValue * ratio)}
                </text>
              </g>
            );
          })}

          {/* Bars */}
          {chartData.map((month, index) => {
            const barHeight = (month.totalAmount / maxValue) * innerHeight;
            const x = padding + index * barSpacing + (barSpacing - barWidth) / 2;
            const y = padding + innerHeight - barHeight;

            return (
              <g key={month.month}>
                {/* Bar */}
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  fill="url(#barGradient)"
                  rx="4"
                  className="transition-all duration-300 hover:opacity-80"
                />
                
                {/* Value label on top of bar */}
                <text
                  x={x + barWidth / 2}
                  y={y - 8}
                  fill="#F8F8F8"
                  fillOpacity="0.8"
                  fontSize="11"
                  textAnchor="middle"
                  fontWeight="500"
                >
                  {formatShortCurrency(month.totalAmount)}
                </text>

                {/* Month label */}
                <text
                  x={x + barWidth / 2}
                  y={chartHeight - padding + 20}
                  fill="#F8F8F8"
                  fillOpacity="0.6"
                  fontSize="12"
                  textAnchor="middle"
                >
                  {month.monthName.substring(0, 3)}
                </text>

                {/* Employee count */}
                <text
                  x={x + barWidth / 2}
                  y={chartHeight - padding + 35}
                  fill="#F8F8F8"
                  fillOpacity="0.4"
                  fontSize="10"
                  textAnchor="middle"
                >
                  {month.employeeCount} emp
                </text>
              </g>
            );
          })}

          {/* Gradient definition */}
          <defs>
            <linearGradient id="barGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#5DD62C" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#337418" stopOpacity="0.7" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Chart Legend/Summary */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="text-center">
          <div className="text-sm text-[#F8F8F8]/60">Total Months</div>
          <div className="text-lg font-semibold text-[#F8F8F8]">{chartData.length}</div>
        </div>
        <div className="text-center">
          <div className="text-sm text-[#F8F8F8]/60">Highest Month</div>
          <div className="text-lg font-semibold text-[#5DD62C]">
            {formatShortCurrency(maxValue)}
          </div>
        </div>
        <div className="text-center">
          <div className="text-sm text-[#F8F8F8]/60">Average</div>
          <div className="text-lg font-semibold text-[#F8F8F8]">
            {formatShortCurrency(chartData.reduce((sum, month) => sum + month.totalAmount, 0) / chartData.length)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PayrollChart;