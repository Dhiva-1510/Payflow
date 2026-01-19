import { useState, useEffect } from 'react';
import api from '../services/api';
import { getErrorMessage, isRetryableError, getErrorUIType } from '../utils/errorHandler';
import ErrorMessage from './ErrorMessage';
import RetryIndicator from './RetryIndicator';
import { useSettings } from '../context/SettingsContext';

/**
 * IndividualPayrollRunner Component
 * Interface for running payroll for individual employees
 * 
 * Features:
 * - Employee selection dropdown
 * - Month and year selection
 * - Run payroll for selected employee
 * - Display processing results
 * - Loading and error states with retry
 */
const IndividualPayrollRunner = ({ onPayrollComplete }) => {
  const { formatCurrency } = useSettings();
  const currentDate = new Date();
  const [month, setMonth] = useState(currentDate.getMonth() + 1);
  const [year, setYear] = useState(currentDate.getFullYear());
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
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

  // Fetch employees on component mount
  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoadingEmployees(true);
      const response = await api.get('/employee');
      setEmployees(response.data.employees || []);
    } catch (err) {
      console.error('Failed to fetch employees:', err);
      // Don't show error for employee loading, just log it
    } finally {
      setLoadingEmployees(false);
    }
  };

  const handleRunPayroll = async () => {
    if (!selectedEmployee) {
      setError('Please select an employee');
      setErrorType('warning');
      setCanRetry(false);
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setSuccessMessage(null);

    try {
      const response = await api.post(`/payroll/run/${selectedEmployee}`, { month, year });
      setResult(response.data.data);
      
      // Show success message
      setSuccessMessage(`Payroll processed successfully for ${response.data.data.employee.name}!`);
      
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

  const getSelectedEmployeeName = () => {
    const employee = employees.find(emp => emp.id === selectedEmployee);
    return employee ? employee.userName : '';
  };

  return (
    <div className="bg-[#202020] rounded-xl border border-[#FFFFFF]/[0.08] p-6">
      <div className="flex items-center mb-6">
        <div className="flex-shrink-0 w-10 h-10 bg-[#5DD62C]/10 rounded-xl flex items-center justify-center mr-4">
          <svg className="w-6 h-6 text-[#5DD62C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-semibold text-[#F8F8F8]">Individual Payroll</h2>
          <p className="text-sm text-[#F8F8F8]/60">Process payroll for a specific employee</p>
        </div>
      </div>

      {/* Employee Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-[#F8F8F8]/80 mb-2">
          Select Employee
        </label>
        {loadingEmployees ? (
          <div className="w-full px-4 py-3 bg-[#0F0F0F] border border-[#FFFFFF]/[0.08] rounded-lg flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#5DD62C] mr-2"></div>
            <span className="text-[#F8F8F8]/60">Loading employees...</span>
          </div>
        ) : (
          <select
            value={selectedEmployee}
            onChange={(e) => setSelectedEmployee(e.target.value)}
            disabled={loading}
            className="w-full px-4 py-3 bg-[#0F0F0F] border border-[#FFFFFF]/[0.08] rounded-lg text-[#F8F8F8] focus:outline-none focus:border-[#5DD62C]/50 focus:ring-1 focus:ring-[#5DD62C]/50 disabled:opacity-50"
          >
            <option value="">Choose an employee...</option>
            {employees.map(employee => (
              <option key={employee.id} value={employee.id}>
                {employee.userName} ({employee.userEmail})
              </option>
            ))}
          </select>
        )}
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
        disabled={loading || !selectedEmployee}
        className={`btn-primary w-full ${(loading || !selectedEmployee) ? 'opacity-50 cursor-not-allowed' : ''}`}
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
            Run Payroll for {selectedEmployee ? getSelectedEmployeeName() : 'Selected Employee'} - {getMonthName(month)} {year}
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
            onRetry={canRetry ? handleRetry : undefined}
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
          <div className="bg-[#0F0F0F] rounded-lg border border-[#FFFFFF]/[0.08] p-4">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-br from-[#5DD62C]/20 to-[#337418]/10 rounded-full flex items-center justify-center shadow-lg mr-3">
                <span className="text-[#5DD62C] font-medium">
                  {result.employee.name?.charAt(0).toUpperCase() || '?'}
                </span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[#F8F8F8]">{result.employee.name}</h3>
                <p className="text-sm text-[#F8F8F8]/60">{result.employee.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-lg font-bold text-[#F8F8F8]">{formatCurrency(result.payroll.baseSalary)}</div>
                <div className="text-xs text-[#F8F8F8]/60">Base Salary</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-[#5DD62C]">+{formatCurrency(result.payroll.allowance)}</div>
                <div className="text-xs text-[#F8F8F8]/60">Allowance</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-red-400">-{formatCurrency(result.payroll.deduction)}</div>
                <div className="text-xs text-[#F8F8F8]/60">Deduction</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-[#5DD62C]">{formatCurrency(result.payroll.netSalary)}</div>
                <div className="text-xs text-[#F8F8F8]/60">Net Salary</div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-[#FFFFFF]/[0.08]">
              <div className="flex justify-between items-center text-sm text-[#F8F8F8]/60">
                <span>Period: {getMonthName(result.payroll.month)} {result.payroll.year}</span>
                <span>Processed: {new Date(result.payroll.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IndividualPayrollRunner;