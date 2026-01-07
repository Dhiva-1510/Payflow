import { useState } from 'react';
import api from '../services/api';
import { setAuth } from '../utils/tokenManager';
import { getErrorMessage, isRetryableError, getErrorUIType } from '../utils/errorHandler';
import ErrorMessage from './ErrorMessage';

/**
 * LoginForm Component
 * User login interface with form validation and error handling
 * Requirements: 7.1, 7.6, 8.5
 */
const LoginForm = ({ onLoginSuccess, onSwitchToRegister }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);
  const [apiError, setApiError] = useState(null);
  const [errorType, setErrorType] = useState('error');
  const [canRetry, setCanRetry] = useState(false);

  const validateForm = () => {
    const newErrors = {};

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
      const response = await api.post('/auth/login', formData);
      
      if (response.data.success) {
        setAuth(response.data.token, response.data.user);
        setSuccessMessage('Login successful! Redirecting...');
        
        // Brief delay to show success message before redirect
        setTimeout(() => {
          if (onLoginSuccess) {
            onLoginSuccess(response.data.user);
          }
        }, 500);
      }
    } catch (error) {
      console.error('Login error:', error);
      
      const errorMessage = getErrorMessage(error);
      const uiErrorType = getErrorUIType(error);
      const retryable = isRetryableError(error);
      
      setApiError(errorMessage);
      setErrorType(uiErrorType);
      setCanRetry(retryable);
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

  return (
    <div>
      <form onSubmit={handleSubmit} className="space-y-5">
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

        <div>
          <label htmlFor="email" className="form-label">
            Email Address
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className={`input-field ${errors.email ? 'input-error' : ''}`}
            placeholder="Enter your email"
            disabled={isLoading}
          />
          {errors.email && (
            <p className="form-error">{errors.email}</p>
          )}
        </div>

        <div>
          <label htmlFor="password" className="form-label">
            Password
          </label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            className={`input-field ${errors.password ? 'input-error' : ''}`}
            placeholder="Enter your password"
            disabled={isLoading}
          />
          {errors.password && (
            <p className="form-error">{errors.password}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className={`w-full py-3 px-4 rounded-lg text-sm font-medium transition-all duration-200 transform ${
            isLoading
              ? 'bg-[#202020] text-[#F8F8F8]/60 cursor-not-allowed'
              : 'btn-primary'
          }`}
        >
          {isLoading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#0F0F0F] mr-2"></div>
              Signing in...
            </div>
          ) : (
            'Sign in'
          )}
        </button>
      </form>

      <div className="mt-8 text-center">
        <span className="text-[#F8F8F8]/60 text-sm">Don't have an account? </span>
        <button
          type="button"
          onClick={onSwitchToRegister}
          className="text-[#5DD62C] hover:text-[#337418] font-medium text-sm transition-all duration-200 hover:underline"
        >
          Sign up
        </button>
      </div>
    </div>
  );
};

export default LoginForm;
