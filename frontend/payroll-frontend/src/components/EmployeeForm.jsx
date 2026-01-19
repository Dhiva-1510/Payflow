import { useState, useEffect } from 'react';
import api from '../services/api';
import { getErrorMessage, isRetryableError, getErrorUIType } from '../utils/errorHandler';
import ErrorMessage from './ErrorMessage';
import { useSettings } from '../context/SettingsContext';

/**
 * EmployeeForm Component
 * Form for adding and editing employee information
 * Requirements: 7.2, 7.6, 8.5
 * 
 * Features:
 * - Add new employee with user selection
 * - Edit existing employee salary details
 * - Form validation
 * - Loading and error states with retry
 */
const EmployeeForm = ({ employee, onSuccess, onCancel }) => {
  const { formatCurrency } = useSettings();
  const isEditMode = !!employee;
  
  const [formData, setFormData] = useState({
    userId: '',
    baseSalary: '',
    allowance: '',
    deduction: ''
  });
  const [availableUsers, setAvailableUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [error, setError] = useState(null);
  const [errorType, setErrorType] = useState('error');
  const [canRetry, setCanRetry] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState(null);

  // Initialize form data when editing
  useEffect(() => {
    if (employee) {
      setFormData({
        userId: employee.userId || '',
        baseSalary: employee.baseSalary?.toString() || '',
        allowance: employee.allowance?.toString() || '',
        deduction: employee.deduction?.toString() || ''
      });
    }
  }, [employee]);

  // Fetch available users when adding new employee
  useEffect(() => {
    if (!isEditMode) {
      fetchAvailableUsers();
    }
  }, [isEditMode]);

  const fetchAvailableUsers = async () => {
    try {
      setLoadingUsers(true);
      // Fetch all users with employee role who don't have employee records yet
      const response = await api.get('/auth/users');
      const users = response.data.users || [];
      // Filter to show only users without employee records
      setAvailableUsers(users.filter(user => !user.hasEmployeeRecord));
    } catch (err) {
      // If endpoint doesn't exist, we'll handle user selection differently
      console.log('Could not fetch users:', err.message);
      setAvailableUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear field error when user starts typing
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  const validateForm = () => {
    const errors = {};

    if (!isEditMode && !formData.userId) {
      errors.userId = 'Please select a user';
    }

    if (!formData.baseSalary) {
      errors.baseSalary = 'Base salary is required';
    } else if (isNaN(parseFloat(formData.baseSalary)) || parseFloat(formData.baseSalary) < 0) {
      errors.baseSalary = 'Base salary must be a positive number';
    }

    if (formData.allowance && (isNaN(parseFloat(formData.allowance)) || parseFloat(formData.allowance) < 0)) {
      errors.allowance = 'Allowance must be a positive number';
    }

    if (formData.deduction && (isNaN(parseFloat(formData.deduction)) || parseFloat(formData.deduction) < 0)) {
      errors.deduction = 'Deduction must be a positive number';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        baseSalary: parseFloat(formData.baseSalary),
        allowance: parseFloat(formData.allowance) || 0,
        deduction: parseFloat(formData.deduction) || 0
      };

      if (isEditMode) {
        // Update existing employee
        await api.put(`/employee/${employee.id}`, payload);
        setSuccessMessage('Employee updated successfully!');
      } else {
        // Create new employee
        payload.userId = formData.userId;
        await api.post('/employee/add', payload);
        setSuccessMessage('Employee added successfully!');
      }

      // Brief delay to show success message before closing
      setTimeout(() => {
        onSuccess();
      }, 800);
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
    handleSubmit({ preventDefault: () => {} });
  };

  const handleDismissError = () => {
    setError(null);
  };

  // Calculate preview values
  const baseSalary = parseFloat(formData.baseSalary) || 0;
  const allowance = parseFloat(formData.allowance) || 0;
  const deduction = parseFloat(formData.deduction) || 0;
  const grossSalary = baseSalary + allowance;
  const netSalary = grossSalary - deduction;

  return (
    <div className="bg-[#202020] rounded-xl border border-[#FFFFFF]/[0.08] p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-[#F8F8F8]">
          {isEditMode ? 'Edit Employee' : 'Add New Employee'}
        </h2>
        <button
          onClick={onCancel}
          className="text-[#F8F8F8]/60 hover:text-[#F8F8F8] transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {error && (
        <ErrorMessage
          message={error}
          type={errorType}
          onRetry={canRetry ? handleRetry : undefined}
          dismissible={true}
          onDismiss={handleDismissError}
          className="mb-6"
        />
      )}

      {successMessage && (
        <div className="mb-6 bg-[#5DD62C]/10 border border-[#5DD62C]/20 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-[#5DD62C] mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-[#5DD62C]">{successMessage}</span>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* User Selection (only for new employees) */}
        {!isEditMode && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-[#F8F8F8]/80 mb-2">
              Select User *
            </label>
            {loadingUsers ? (
              <div className="flex items-center text-[#F8F8F8]/60">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#5DD62C] mr-2"></div>
                Loading users...
              </div>
            ) : availableUsers.length > 0 ? (
              <select
                name="userId"
                value={formData.userId}
                onChange={handleChange}
                className={`w-full px-4 py-3 min-h-[44px] sm:min-h-[48px] bg-[#0F0F0F] border rounded-lg text-[#F8F8F8] focus:outline-none focus:border-[#5DD62C]/50 focus:ring-1 focus:ring-[#5DD62C]/50 ${
                  fieldErrors.userId ? 'border-red-500' : 'border-[#FFFFFF]/[0.08]'
                }`}
              >
                <option value="">Select a user...</option>
                {availableUsers.map(user => (
                  <option key={user._id} value={user._id}>
                    {user.name} ({user.email})
                  </option>
                ))}
              </select>
            ) : (
              <div>
                <input
                  type="text"
                  name="userId"
                  value={formData.userId}
                  onChange={handleChange}
                  placeholder="Enter User ID"
                  className={`w-full px-4 py-3 min-h-[44px] sm:min-h-[48px] bg-[#0F0F0F] border rounded-lg text-[#F8F8F8] placeholder-[#F8F8F8]/40 focus:outline-none focus:border-[#5DD62C]/50 focus:ring-1 focus:ring-[#5DD62C]/50 ${
                    fieldErrors.userId ? 'border-red-500' : 'border-[#FFFFFF]/[0.08]'
                  }`}
                />
                <p className="mt-1 text-xs text-[#F8F8F8]/40">
                  Enter the MongoDB User ID for the employee
                </p>
              </div>
            )}
            {fieldErrors.userId && (
              <p className="mt-1 text-sm text-red-400">{fieldErrors.userId}</p>
            )}
          </div>
        )}

        {/* Employee info display when editing */}
        {isEditMode && (
          <div className="mb-6 p-4 bg-[#0F0F0F] rounded-lg border border-[#FFFFFF]/[0.08]">
            <div className="flex items-center">
              <div className="flex-shrink-0 h-10 w-10 bg-[#5DD62C]/10 rounded-full flex items-center justify-center">
                <span className="text-[#5DD62C] font-medium">
                  {employee.userName?.charAt(0).toUpperCase() || '?'}
                </span>
              </div>
              <div className="ml-4">
                <div className="text-sm font-medium text-[#F8F8F8]">{employee.userName}</div>
                <div className="text-sm text-[#F8F8F8]/60">{employee.userEmail}</div>
              </div>
            </div>
          </div>
        )}

        {/* Salary Fields */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-6">
          <div className="form-group">
            <label className="form-label">
              Base Salary *
            </label>
            <div className="input-icon-container">
              <span className="input-currency-symbol">₹</span>
              <input
                type="number"
                name="baseSalary"
                value={formData.baseSalary}
                onChange={handleChange}
                placeholder="0.00"
                step="0.01"
                min="0"
                className={`input-with-currency input-field-with-states min-h-[44px] sm:min-h-[48px] ${fieldErrors.baseSalary ? 'error' : ''}`}
              />
            </div>
            {fieldErrors.baseSalary && (
              <p className="form-error">{fieldErrors.baseSalary}</p>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">
              Allowance
            </label>
            <div className="input-icon-container">
              <span className="input-currency-symbol">₹</span>
              <input
                type="number"
                name="allowance"
                value={formData.allowance}
                onChange={handleChange}
                placeholder="0.00"
                step="0.01"
                min="0"
                className={`input-with-currency input-field-with-states min-h-[44px] sm:min-h-[48px] ${fieldErrors.allowance ? 'error' : ''}`}
              />
            </div>
            {fieldErrors.allowance && (
              <p className="form-error">{fieldErrors.allowance}</p>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">
              Deduction
            </label>
            <div className="input-icon-container">
              <span className="input-currency-symbol">₹</span>
              <input
                type="number"
                name="deduction"
                value={formData.deduction}
                onChange={handleChange}
                placeholder="0.00"
                step="0.01"
                min="0"
                className={`input-with-currency input-field-with-states min-h-[44px] sm:min-h-[48px] ${fieldErrors.deduction ? 'error' : ''}`}
              />
            </div>
            {fieldErrors.deduction && (
              <p className="form-error">{fieldErrors.deduction}</p>
            )}
          </div>
        </div>

        {/* Salary Preview */}
        <div className="mb-6 p-4 bg-[#0F0F0F] rounded-lg border border-[#FFFFFF]/[0.08]">
          <h3 className="text-sm font-medium text-[#F8F8F8]/60 mb-3">Salary Preview</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-xs text-[#F8F8F8]/40">Base Salary</div>
              <div className="text-lg font-semibold text-[#F8F8F8]">{formatCurrency(baseSalary)}</div>
            </div>
            <div>
              <div className="text-xs text-[#F8F8F8]/40">+ Allowance</div>
              <div className="text-lg font-semibold text-[#5DD62C]">{formatCurrency(allowance)}</div>
            </div>
            <div>
              <div className="text-xs text-[#F8F8F8]/40">- Deduction</div>
              <div className="text-lg font-semibold text-red-400">{formatCurrency(deduction)}</div>
            </div>
            <div>
              <div className="text-xs text-[#F8F8F8]/40">Net Salary</div>
              <div className="text-lg font-semibold text-[#5DD62C]">{formatCurrency(netSalary)}</div>
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-4">
          <button
            type="button"
            onClick={onCancel}
            className="btn-secondary min-h-[44px] sm:min-h-auto w-full sm:w-auto"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className={`btn-primary min-h-[44px] sm:min-h-auto w-full sm:w-auto ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {loading && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#0F0F0F] mr-2"></div>
            )}
            {isEditMode ? 'Update Employee' : 'Add Employee'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EmployeeForm;
