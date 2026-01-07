import { useState } from 'react';
import api from '../services/api';
import { getErrorMessage, isRetryableError, getErrorUIType } from '../utils/errorHandler';
import ErrorMessage from './ErrorMessage';
import RetryIndicator from './RetryIndicator';
import { useSettings } from '../context/SettingsContext';

/**
 * PayrollRunner Component
 * Interface for triggering payroll processing for all employees
 * Requirements: 7.2, 7.6, 8.5
 * 
 * Features:
 * - Month and year selection
 * - Run payroll for all employees
 * - Display processing results
 * - Loading and error states with retry
 */
const PayrollRunner = ({ onPayrollComplete }) => {
  const { formatCurrency } = useSettings();
  const currentDate = new Date();
  const [month, setMonth] = useState(currentDate.getMonth() + 1);
  const [year, setYear] = useState(currentDate.getFullYear());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [errorType, setErrorType] = useState('error');
  const [canRetry, setCanRetry] = useState(false);
  const [result, setResult] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' }
  ];

  // Generate year options (2020 to current year + 1)
  const currentYear = currentDate.getFullYear();
  const years = Array.from({ length: currentYear - 2020 + 2 }, (_, i) => 2020 + i);

  const handleRunPayroll = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setSuccessMessage(null);

    try {
      const response = await api.post('/payroll/run', { month, year });
      setResult(response.data.data);
      
      // Show success message based on results
      const { processedCount, failedCount } = response.data.data;
      if (failedCount === 0) {
        setSuccessMessage(`Payroll processed successfully for ${processedCount} employee${processedCount !== 1 ? 's' : ''}!`);
      } else {
        setSuccessMessage(`Payroll processed: ${processedCount} successful, ${failedCount} failed.`);
      }
      
      if (onPayrollComplete) {
        onPayrollComplete();
      }
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      const uiErrorType = getErrorUIType(err);
      const retryable = isRetryableError(err);
      
      setError(errorMessage);
      setErrorType(uiErrorType);
      setCanRetry(retryable);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setIsRetrying(true);
    setRetryCount(prev => prev + 1);
    handleRunPayroll().finally(() => setIsRetrying(false));
  };

  const handleDismissError = () => {
    setError(null);
    setIsRetrying(false);
    setRetryCount(0);
  };

  const getMonthName = (monthNum) => {
    return months.find(m => m.value === monthNum)?.label || '';
  };

  return (
    <div className="bg-[#202020] rounded-xl border border-[#FFFFFF]/[0.08] p-6">
      <div className="flex items-center mb-6">
        <div className="flex-shrink-0 w-10 h-10 bg-[#5DD62C]/10 rounded-xl flex items-center justify-center mr-4">
          <svg className="w-6 h-6 text-[#5DD62C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-semibold text-[#F8F8F8]">Run Payroll</h2>
          <p className="text-sm text-[#F8F8F8]/60">Process payroll for all employees</p>
        </div>
      </div>

      {/* Period Selection */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-[#F8F8F8]/80 mb-2">
            Month
          </label>
          <select
            value={month}
            onChange={(e) => setMonth(parseInt(e.target.value))}
            disabled={loading}
            className="w-full px-4 py-3 bg-[#0F0F0F] border border-[#FFFFFF]/[0.08] rounded-lg text-[#F8F8F8] focus:outline-none focus:border-[#5DD62C]/50 focus:ring-1 focus:ring-[#5DD62C]/50 disabled:opacity-50"
          >
            {months.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-[#F8F8F8]/80 mb-2">
            Year
          </label>
          <select
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value))}
            disabled={loading}
            className="w-full px-4 py-3 bg-[#0F0F0F] border border-[#FFFFFF]/[0.08] rounded-lg text-[#F8F8F8] focus:outline-none focus:border-[#5DD62C]/50 focus:ring-1 focus:ring-[#5DD62C]/50 disabled:opacity-50"
          >
            {years.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Run Button */}
      <button
        onClick={handleRunPayroll}
        disabled={loading}
        className={`btn-primary w-full ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {loading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#0F0F0F] mr-2"></div>
            Processing Payroll...
          </>
        ) : (
          <>
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Run Payroll for {getMonthName(month)} {year}
          </>
        )}
      </button>

      {/* Error Display */}
      {error && (
        <>
          <RetryIndicator 
            isRetrying={isRetrying} 
            retryCount={retryCount} 
            maxRetries={3}
            message="Processing payroll..."
          />
          <ErrorMessage
            message={error}
            type={errorType}
            onRetry={handleRetry}
            dismissible={true}
            onDismiss={handleDismissError}
            className="mt-4"
          />
        </>
      )}

      {/* Success Display */}
      {successMessage && (
        <div className="mt-4 bg-[#5DD62C]/10 border border-[#5DD62C]/20 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-[#5DD62C] mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-[#5DD62C]">{successMessage}</span>
          </div>
        </div>
      )}

      {/* Results Display */}
      {result && (
        <div className="mt-6">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="bg-[#0F0F0F] rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-[#F8F8F8]">{result.totalEmployees}</div>
              <div className="text-xs text-[#F8F8F8]/60">Total Employees</div>
            </div>
            <div className="bg-[#0F0F0F] rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-[#5DD62C]">{result.processedCount}</div>
              <div className="text-xs text-[#F8F8F8]/60">Processed</div>
            </div>
            <div className="bg-[#0F0F0F] rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-red-400">{result.failedCount}</div>
              <div className="text-xs text-[#F8F8F8]/60">Failed</div>
            </div>
          </div>

          {/* Detailed Results */}
          {result.results && result.results.length > 0 && (
            <div className="bg-[#0F0F0F] rounded-lg border border-[#FFFFFF]/[0.08] overflow-hidden">
              <div className="px-4 py-3 border-b border-[#FFFFFF]/[0.08]">
                <h3 className="text-sm font-medium text-[#F8F8F8]">Processing Details</h3>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {result.results.map((item, index) => (
                  <div 
                    key={index}
                    className={`px-4 py-3 flex items-center justify-between border-b border-[#FFFFFF]/[0.08] last:border-b-0 ${
                      item.success ? '' : 'bg-red-500/5'
                    }`}
                  >
                    <div className="flex items-center">
                      {item.success ? (
                        <svg className="w-5 h-5 text-[#5DD62C] mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 text-red-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                      <span className="text-sm text-[#F8F8F8]/80">
                        Employee ID: {item.employeeId?.toString().slice(-8) || 'Unknown'}
                      </span>
                    </div>
                    {item.success && item.payroll ? (
                      <span className="text-sm font-medium text-[#5DD62C]">
                        {formatCurrency(item.payroll.netSalary)}
                      </span>
                    ) : (
                      <span className="text-xs text-red-400 max-w-xs truncate">
                        {item.error || item.message}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PayrollRunner;
