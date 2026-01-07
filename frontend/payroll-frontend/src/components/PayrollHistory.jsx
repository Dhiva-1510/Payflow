import { useState, useEffect } from 'react';
import api from '../services/api';
import { getErrorMessage, isRetryableError, getErrorUIType } from '../utils/errorHandler';
import ErrorMessage from './ErrorMessage';
import RetryIndicator from './RetryIndicator';
import { useSettings } from '../context/SettingsContext';

/**
 * PayrollHistory Component
 * Displays payroll history for admin overview
 * Requirements: 7.2, 7.6, 8.5
 * 
 * Features:
 * - List all employees with payroll data
 * - View individual employee payroll history
 * - Filter by employee
 * - Loading and error states with retry
 */
const PayrollHistory = ({ refreshTrigger }) => {
  const { formatCurrency } = useSettings();
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [payrollRecords, setPayrollRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingPayroll, setLoadingPayroll] = useState(false);
  const [error, setError] = useState(null);
  const [errorType, setErrorType] = useState('error');
  const [canRetry, setCanRetry] = useState(false);
  const [payrollError, setPayrollError] = useState(null);
  const [payrollErrorType, setPayrollErrorType] = useState('error');
  const [canRetryPayroll, setCanRetryPayroll] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetryingPayroll, setIsRetryingPayroll] = useState(false);
  const [retryCountPayroll, setRetryCountPayroll] = useState(0);

  // Fetch employees on mount and when refreshTrigger changes
  useEffect(() => {
    fetchEmployees();
  }, [refreshTrigger]);

  // Fetch payroll when employee is selected
  useEffect(() => {
    if (selectedEmployee) {
      fetchPayrollHistory(selectedEmployee.id);
    } else {
      setPayrollRecords([]);
    }
  }, [selectedEmployee]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      setError(null);
      setIsRetrying(false);
      setRetryCount(0);
      const response = await api.get('/employee');
      setEmployees(response.data.employees || []);
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

  const fetchPayrollHistory = async (employeeId) => {
    try {
      setLoadingPayroll(true);
      setPayrollError(null);
      setIsRetryingPayroll(false);
      setRetryCountPayroll(0);
      const response = await api.get(`/payroll/${employeeId}`);
      setPayrollRecords(response.data.data?.payrollRecords || []);
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      const uiErrorType = getErrorUIType(err);
      const retryable = isRetryableError(err);
      
      setPayrollError(errorMessage);
      setPayrollErrorType(uiErrorType);
      setCanRetryPayroll(retryable);
      setPayrollRecords([]);
    } finally {
      setLoadingPayroll(false);
    }
  };

  const handleRetryEmployees = async () => {
    setIsRetrying(true);
    setRetryCount(prev => prev + 1);
    try {
      await fetchEmployees();
    } finally {
      setIsRetrying(false);
    }
  };

  const handleRetryPayroll = async () => {
    if (!selectedEmployee) return;
    setIsRetryingPayroll(true);
    setRetryCountPayroll(prev => prev + 1);
    try {
      await fetchPayrollHistory(selectedEmployee.id);
    } finally {
      setIsRetryingPayroll(false);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#5DD62C]"></div>
        <span className="ml-3 text-[#F8F8F8]/60">Loading employees...</span>
      </div>
    );
  }

  if (error) {
    return (
      <>
        <RetryIndicator 
          isRetrying={isRetrying} 
          retryCount={retryCount} 
          maxRetries={3}
          message="Loading employees..."
        />
        <ErrorMessage
          message={error}
          type={errorType}
          onRetry={handleRetryEmployees}
          className="rounded-xl"
        />
      </>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Employee List */}
      <div className="lg:col-span-1">
        <div className="bg-[#202020] rounded-xl border border-[#FFFFFF]/[0.08] overflow-hidden">
          <div className="px-4 py-3 border-b border-[#FFFFFF]/[0.08]">
            <h3 className="text-sm font-medium text-[#F8F8F8]">Employees</h3>
            <p className="text-xs text-[#F8F8F8]/60 mt-1">
              {employees.length} {employees.length === 1 ? 'employee' : 'employees'}
            </p>
          </div>
          
          {employees.length === 0 ? (
            <div className="p-6 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-[#5DD62C]/10 mb-3">
                <svg className="h-6 w-6 text-[#5DD62C]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <p className="text-sm text-[#F8F8F8]/60">No employees found</p>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              {employees.map((employee) => (
                <button
                  key={employee.id}
                  onClick={() => setSelectedEmployee(employee)}
                  className={`w-full px-4 py-3 flex items-center text-left border-b border-[#FFFFFF]/[0.08] last:border-b-0 transition-colors ${
                    selectedEmployee?.id === employee.id
                      ? 'bg-[#5DD62C]/10'
                      : 'hover:bg-[#0F0F0F]/50'
                  }`}
                >
                  <div className="flex-shrink-0 h-8 w-8 bg-[#5DD62C]/10 rounded-full flex items-center justify-center mr-3">
                    <span className="text-[#5DD62C] text-sm font-medium">
                      {employee.userName?.charAt(0).toUpperCase() || '?'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-[#F8F8F8] truncate">
                      {employee.userName}
                    </div>
                    <div className="text-xs text-[#F8F8F8]/60 truncate">
                      {employee.userEmail}
                    </div>
                  </div>
                  {selectedEmployee?.id === employee.id && (
                    <svg className="w-5 h-5 text-[#5DD62C] ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Payroll History */}
      <div className="lg:col-span-2">
        <div className="bg-[#202020] rounded-xl border border-[#FFFFFF]/[0.08] overflow-hidden">
          <div className="px-4 py-3 border-b border-[#FFFFFF]/[0.08]">
            <h3 className="text-sm font-medium text-[#F8F8F8]">
              {selectedEmployee ? `Payroll History - ${selectedEmployee.userName}` : 'Payroll History'}
            </h3>
            <p className="text-xs text-[#F8F8F8]/60 mt-1">
              {selectedEmployee 
                ? `${payrollRecords.length} ${payrollRecords.length === 1 ? 'record' : 'records'}`
                : 'Select an employee to view payroll history'
              }
            </p>
          </div>

          {!selectedEmployee ? (
            <div className="p-12 text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-[#5DD62C]/10 mb-4">
                <svg className="h-8 w-8 text-[#5DD62C]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-[#F8F8F8] mb-2">Select an Employee</h3>
              <p className="text-sm text-[#F8F8F8]/60">
                Choose an employee from the list to view their payroll history
              </p>
            </div>
          ) : loadingPayroll ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#5DD62C]"></div>
              <span className="ml-3 text-[#F8F8F8]/60">Loading payroll history...</span>
            </div>
          ) : payrollError ? (
            <div className="p-6">
              <RetryIndicator 
                isRetrying={isRetryingPayroll} 
                retryCount={retryCountPayroll} 
                maxRetries={3}
                message="Loading payroll history..."
              />
              <ErrorMessage
                message={payrollError}
                type={payrollErrorType}
                onRetry={handleRetryPayroll}
              />
            </div>
          ) : payrollRecords.length === 0 ? (
            <div className="p-12 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-[#5DD62C]/10 mb-3">
                <svg className="h-6 w-6 text-[#5DD62C]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-sm text-[#F8F8F8]/60">No payroll records found for this employee</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#FFFFFF]/[0.08]">
                    <th className="px-4 py-3 text-left text-xs font-medium text-[#F8F8F8]/60 uppercase tracking-wider">Period</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-[#F8F8F8]/60 uppercase tracking-wider">Base</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-[#F8F8F8]/60 uppercase tracking-wider">Allowance</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-[#F8F8F8]/60 uppercase tracking-wider">Deduction</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-[#F8F8F8]/60 uppercase tracking-wider">Gross</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-[#F8F8F8]/60 uppercase tracking-wider">Net</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#FFFFFF]/[0.08]">
                  {payrollRecords.map((record) => (
                    <tr key={record._id} className="hover:bg-[#0F0F0F]/50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm font-medium text-[#F8F8F8]">
                          {getMonthName(record.month)} {record.year}
                        </div>
                        <div className="text-xs text-[#F8F8F8]/60">
                          {formatDate(record.createdAt)}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-[#F8F8F8]">
                        {formatCurrency(record.baseSalary)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-[#5DD62C]">
                        +{formatCurrency(record.allowance)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-red-400">
                        -{formatCurrency(record.deduction)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-[#F8F8F8]/80">
                        {formatCurrency(record.grossSalary)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium text-[#5DD62C]">
                        {formatCurrency(record.netSalary)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PayrollHistory;
