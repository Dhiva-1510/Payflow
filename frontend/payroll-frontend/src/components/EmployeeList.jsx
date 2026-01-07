import { useState, useEffect } from 'react';
import api from '../services/api';
import { getErrorMessage, isRetryableError, getErrorUIType } from '../utils/errorHandler';
import ErrorMessage from './ErrorMessage';
import RetryIndicator from './RetryIndicator';
import { useSettings } from '../context/SettingsContext';

/**
 * EmployeeList Component
 * Displays all employees in a table format with actions
 * Requirements: 7.2, 7.6, 8.5
 * 
 * Features:
 * - Table display of all employees
 * - Edit and delete actions
 * - Loading and error states with retry
 * - Search/filter functionality
 */
const EmployeeList = ({ onEdit, onAddNew, refreshTrigger }) => {
  const { formatCurrency } = useSettings();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [errorType, setErrorType] = useState('error');
  const [canRetry, setCanRetry] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Fetch employees on mount and when refreshTrigger changes
  useEffect(() => {
    fetchEmployees();
  }, [refreshTrigger]);

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

  const handleRetryWithIndicator = async () => {
    setIsRetrying(true);
    setRetryCount(prev => prev + 1);
    
    try {
      await fetchEmployees();
    } finally {
      setIsRetrying(false);
    }
  };

  // Filter employees based on search term
  const filteredEmployees = employees.filter(employee => {
    const searchLower = searchTerm.toLowerCase();
    return (
      employee.userName?.toLowerCase().includes(searchLower) ||
      employee.userEmail?.toLowerCase().includes(searchLower)
    );
  });

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
          message="Reconnecting to server..."
        />
        <ErrorMessage
          message={error}
          type={errorType}
          onRetry={handleRetryWithIndicator}
          className="rounded-xl"
        />
      </>
    );
  }

  return (
    <div>
      {/* Header with search and add button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="Search employees..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field pl-10"
          />
          <svg className="absolute left-3 top-2.5 w-5 h-5 text-[#F8F8F8]/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <button
          onClick={onAddNew}
          className="btn-primary flex items-center"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add Employee
        </button>
      </div>

      {/* Employee count */}
      <div className="mb-4 text-sm text-[#F8F8F8]/60">
        {filteredEmployees.length} {filteredEmployees.length === 1 ? 'employee' : 'employees'} found
      </div>

      {/* Table */}
      {filteredEmployees.length === 0 ? (
        <div className="bg-[#202020] rounded-xl border border-[#FFFFFF]/[0.08] p-12 text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-[#5DD62C]/10 mb-4">
            <svg className="h-6 w-6 text-[#5DD62C]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-[#F8F8F8] mb-2">
            {searchTerm ? 'No employees found' : 'No employees yet'}
          </h3>
          <p className="text-sm text-[#F8F8F8]/60 mb-4">
            {searchTerm 
              ? 'Try adjusting your search terms' 
              : 'Get started by adding your first employee'}
          </p>
          {!searchTerm && (
            <button
              onClick={onAddNew}
              className="btn-primary"
            >
              Add Employee
            </button>
          )}
        </div>
      ) : (
        <div className="bg-[#202020] rounded-xl border border-[#FFFFFF]/[0.08] overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#FFFFFF]/[0.08]">
                  <th className="table-header">Employee</th>
                  <th className="table-header">Base Salary</th>
                  <th className="table-header">Allowance</th>
                  <th className="table-header">Deduction</th>
                  <th className="table-header">Net Salary</th>
                  <th className="table-header text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#FFFFFF]/[0.08]">
                {filteredEmployees.map((employee) => (
                  <tr key={employee.id} className="table-row">
                    <td className="table-cell">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-br from-[#5DD62C]/20 to-[#337418]/10 rounded-full flex items-center justify-center shadow-lg">
                          <span className="text-[#5DD62C] font-medium">
                            {employee.userName?.charAt(0).toUpperCase() || '?'}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-[#F8F8F8]">{employee.userName}</div>
                          <div className="text-sm text-[#F8F8F8]/60">{employee.userEmail}</div>
                        </div>
                      </div>
                    </td>
                    <td className="table-cell">
                      {formatCurrency(employee.baseSalary)}
                    </td>
                    <td className="table-cell text-[#5DD62C] font-medium">
                      +{formatCurrency(employee.allowance)}
                    </td>
                    <td className="table-cell text-red-400 font-medium">
                      -{formatCurrency(employee.deduction)}
                    </td>
                    <td className="table-cell font-semibold text-[#F8F8F8]">
                      {formatCurrency(employee.netSalary)}
                    </td>
                    <td className="table-cell text-right">
                      <button
                        onClick={() => onEdit(employee)}
                        className="text-[#5DD62C] hover:text-[#5DD62C]/80 transition-all duration-200 p-2 rounded-lg hover:bg-[#5DD62C]/10 transform hover:scale-110"
                        title="Edit employee"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeList;
