import { useState, useEffect } from 'react';
import api from '../services/api';
import { getErrorMessage, isRetryableError, getErrorUIType } from '../utils/errorHandler';
import ErrorMessage from './ErrorMessage';
import PayslipView from './PayslipView';
import RetryIndicator from './RetryIndicator';
import { useSettings } from '../context/SettingsContext';

/**
 * EmployeePayrollHistory Component
 * Displays the logged-in employee's personal payroll history
 * Requirements: 7.3, 7.6, 8.5
 * 
 * Features:
 * - Fetch and display employee's own payroll records
 * - View individual payslip details
 * - Loading and error states with retry
 * - Records ordered by date (most recent first)
 */
const EmployeePayrollHistory = () => {
  const { formatCurrency } = useSettings();
  const [payrollRecords, setPayrollRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [errorType, setErrorType] = useState('error');
  const [canRetry, setCanRetry] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    fetchPayrollHistory();
  }, []);

  const fetchPayrollHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      setIsRetrying(false);
      setRetryCount(0);
      // Use the my-payroll endpoint for employees to get their own payroll
      const response = await api.get('/payroll/my-payroll');
      setPayrollRecords(response.data.data?.payrollRecords || []);
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

  const handleRetryWithIndicator = async () => {
    setIsRetrying(true);
    setRetryCount(prev => prev + 1);
    
    try {
      await fetchPayrollHistory();
    } finally {
      setIsRetrying(false);
    }
  };

  const getMonthName = (month) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[month - 1] || '';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Calculate summary statistics
  const getSummaryStats = () => {
    if (payrollRecords.length === 0) {
      return { latestNet: 0, totalPayslips: 0, lastPaymentDate: null };
    }
    
    const latestRecord = payrollRecords[0]; // Records are ordered by date desc
    return {
      latestNet: latestRecord?.netSalary || 0,
      totalPayslips: payrollRecords.length,
      lastPaymentDate: latestRecord?.createdAt
    };
  };

  const stats = getSummaryStats();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#5DD62C]"></div>
        <span className="ml-3 text-[#F8F8F8]/60">Loading your payroll history...</span>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#F8F8F8]">My Payslips</h1>
        <p className="text-sm text-[#F8F8F8]/60 mt-1">
          View your salary history and payslip details
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <div className="bg-[#202020] p-5 rounded-xl border border-[#FFFFFF]/[0.08]">
          <div className="text-xs font-medium text-[#F8F8F8]/60">Latest Net Salary</div>
          <div className="mt-2 text-2xl font-bold text-[#5DD62C]">
            {stats.latestNet > 0 ? formatCurrency(stats.latestNet) : '--'}
          </div>
        </div>
        <div className="bg-[#202020] p-5 rounded-xl border border-[#FFFFFF]/[0.08]">
          <div className="text-xs font-medium text-[#F8F8F8]/60">Total Payslips</div>
          <div className="mt-2 text-2xl font-bold text-[#F8F8F8]">
            {stats.totalPayslips}
          </div>
        </div>
        <div className="bg-[#202020] p-5 rounded-xl border border-[#FFFFFF]/[0.08]">
          <div className="text-xs font-medium text-[#F8F8F8]/60">Last Payment Date</div>
          <div className="mt-2 text-2xl font-bold text-[#F8F8F8]">
            {stats.lastPaymentDate ? formatDate(stats.lastPaymentDate) : '--'}
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <>
          <RetryIndicator 
            isRetrying={isRetrying} 
            retryCount={retryCount} 
            maxRetries={3}
            message="Loading your payroll history..."
          />
          <ErrorMessage
            message={error}
            type={errorType}
            onRetry={handleRetryWithIndicator}
            className="mb-6 rounded-xl"
          />
        </>
      )}

      {/* Payroll Records Table */}
      <div className="bg-[#202020] rounded-xl border border-[#FFFFFF]/[0.08] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#FFFFFF]/[0.08]">
          <h2 className="text-lg font-semibold text-[#F8F8F8]">Payroll History</h2>
          <p className="text-sm text-[#F8F8F8]/60 mt-1">
            {payrollRecords.length} {payrollRecords.length === 1 ? 'record' : 'records'} found
          </p>
        </div>

        {payrollRecords.length === 0 && !error ? (
          <div className="p-12 text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-[#5DD62C]/10 mb-4">
              <svg className="h-8 w-8 text-[#5DD62C]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-[#F8F8F8] mb-2">No Payslips Yet</h3>
            <p className="text-sm text-[#F8F8F8]/60 max-w-md mx-auto">
              Your payroll history will appear here once payroll has been processed for you.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#FFFFFF]/[0.08]">
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#F8F8F8]/60 uppercase tracking-wider">
                    Period
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-[#F8F8F8]/60 uppercase tracking-wider">
                    Base Salary
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-[#F8F8F8]/60 uppercase tracking-wider">
                    Allowance
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-[#F8F8F8]/60 uppercase tracking-wider">
                    Deduction
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-[#F8F8F8]/60 uppercase tracking-wider">
                    Gross
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-[#F8F8F8]/60 uppercase tracking-wider">
                    Net Salary
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-[#F8F8F8]/60 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#FFFFFF]/[0.08]">
                {payrollRecords.map((record) => (
                  <tr key={record._id} className="hover:bg-[#0F0F0F]/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-[#F8F8F8]">
                        {getMonthName(record.month)} {record.year}
                      </div>
                      <div className="text-xs text-[#F8F8F8]/60">
                        {formatDate(record.createdAt)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-[#F8F8F8]">
                      {formatCurrency(record.baseSalary)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-[#5DD62C]">
                      +{formatCurrency(record.allowance)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-red-400">
                      -{formatCurrency(record.deduction)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-[#F8F8F8]/80">
                      {formatCurrency(record.grossSalary)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-[#5DD62C]">
                      {formatCurrency(record.netSalary)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <button
                        onClick={() => setSelectedPayslip(record)}
                        className="px-3 py-1.5 text-xs font-medium text-[#5DD62C] bg-[#5DD62C]/10 hover:bg-[#5DD62C]/20 rounded-lg transition-colors"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payslip Detail Modal */}
      {selectedPayslip && (
        <PayslipView
          payslip={selectedPayslip}
          onClose={() => setSelectedPayslip(null)}
        />
      )}
    </div>
  );
};

export default EmployeePayrollHistory;
