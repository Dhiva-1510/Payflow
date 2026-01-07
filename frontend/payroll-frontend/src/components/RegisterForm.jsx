import { useState } from 'react';
import api from '../services/api';
import { getErrorMessage, isRetryableError, getErrorUIType } from '../utils/errorHandler';
import ErrorMessage from './ErrorMessage';

/**
 * RegisterForm Component
 * User registration interface with form validation and error handling
 * Requirements: 7.1, 7.6, 8.5
 */
const RegisterForm = ({ onRegisterSuccess, onSwitchToLogin }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'employee'
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);
  const [apiError, setApiError] = useState(null);
  const [errorType, setErrorType] = useState('error');
  const [canRetry, setCanRetry] = useState(false);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name) {
      newErrors.name = 'Name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!formData.role || !['admin', 'employee'].includes(formData.role)) {
      newErrors.role = 'Please select a valid role';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
    // Clear API error when user starts typing
    if (apiError) {
      setApiError(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setErrors({});
    setApiError(null);

    try {
      const { confirmPassword: _, ...registrationData } = formData;
      const response = await api.post('/auth/register', registrationData);
      
      if (response.data.success) {
        setSuccessMessage('Account created successfully! Please sign in.');
        
        // Brief delay to show success message before switching to login
        setTimeout(() => {
          if (onRegisterSuccess) {
            onRegisterSuccess(response.data.user);
          }
        }, 1500);
      }
    } catch (error) {
      console.error('Registration error:', error);
      
      const errorMessage = getErrorMessage(error);
      const uiErrorType = getErrorUIType(error);
      const retryable = isRetryableError(error);
      
      // Handle specific field errors
      if (error.response?.status === 409) {
        setErrors({ email: 'Email already exists' });
      } else {
        setApiError(errorMessage);
        setErrorType(uiErrorType);
        setCanRetry(retryable);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    handleSubmit({ preventDefault: () => {} });
  };

  const handleDismissError = () => {
    setApiError(null);
  };

  const inputClasses = (hasError) => `
    input-field ${hasError ? 'input-error' : ''}
  `;

  return (
    <div>
      <form onSubmit={handleSubmit} className="space-y-4">
        {successMessage && (
          <div className="bg-[#5DD62C]/10 border border-[#5DD62C]/20 text-[#5DD62C] px-4 py-3 rounded-lg text-sm flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {successMessage}
          </div>
        )}

        {apiError && (
          <ErrorMessage
            message={apiError}
            type={errorType}
            onRetry={canRetry ? handleRetry : undefined}
            dismissible={true}
            onDismiss={handleDismissError}
          />
        )}

        <div className="form-group">
          <label htmlFor="name" className="form-label">
            Full Name
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className={inputClasses(errors.name)}
            placeholder="Enter your full name"
            disabled={isLoading}
          />
          {errors.name && (
            <p className="form-error">{errors.name}</p>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="email" className="form-label">
            Email Address
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className={inputClasses(errors.email)}
            placeholder="Enter your email"
            disabled={isLoading}
          />
          {errors.email && (
            <p className="form-error">{errors.email}</p>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="password" className="form-label">
            Password
          </label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            className={inputClasses(errors.password)}
            placeholder="Enter your password"
            disabled={isLoading}
          />
          {errors.password && (
            <p className="form-error">{errors.password}</p>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="confirmPassword" className="form-label">
            Confirm Password
          </label>
          <input
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            className={inputClasses(errors.confirmPassword)}
            placeholder="Confirm your password"
            disabled={isLoading}
          />
          {errors.confirmPassword && (
            <p className="form-error">{errors.confirmPassword}</p>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="role" className="form-label">
            Role
          </label>
          <select
            id="role"
            name="role"
            value={formData.role}
            onChange={handleChange}
            className={inputClasses(errors.role)}
            disabled={isLoading}
          >
            <option value="employee">Employee</option>
            <option value="admin">Administrator</option>
          </select>
          {errors.role && (
            <p className="form-error">{errors.role}</p>
          )}
          <p className="form-help">
            Select "Employee" for regular users or "Administrator" for payroll management access
          </p>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className={`w-full py-3 px-4 rounded-lg text-sm font-medium transition-all duration-200 transform mt-6 ${
            isLoading
              ? 'bg-[#202020] text-[#F8F8F8]/60 cursor-not-allowed'
              : 'btn-primary'
          }`}
        >
          {isLoading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#0F0F0F] mr-2"></div>
              Creating Account...
            </div>
          ) : (
            'Create Account'
          )}
        </button>
      </form>

      <div className="mt-8 text-center">
        <span className="text-[#F8F8F8]/60 text-sm">Already have an account? </span>
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="text-[#5DD62C] hover:text-[#337418] font-medium text-sm transition-all duration-200 hover:underline"
        >
          Sign in
        </button>
      </div>
    </div>
  );
};

export default RegisterForm;
