/**
 * Simple Frontend Integration Tests
 * 
 * Tests basic component integration and API mocking
 * 
 * Requirements: All
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import LoginForm from '../components/LoginForm';
import RegisterForm from '../components/RegisterForm';
import { NotificationProvider } from '../context/NotificationContext';

// Mock the API module
jest.mock('../services/api');
import api from '../services/api';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Test wrapper component
const TestWrapper = ({ children }) => (
  <BrowserRouter>
    <NotificationProvider>
      {children}
    </NotificationProvider>
  </BrowserRouter>
);

describe('Simple Frontend Integration Tests', () => {
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  describe('Authentication Integration', () => {
    test('should handle successful login workflow', async () => {
      // Mock successful login response
      api.post.mockResolvedValue({
        status: 200,
        data: {
          success: true,
          token: 'test-jwt-token',
          user: {
            id: 'user123',
            name: 'Test User',
            email: 'test@test.com',
            role: 'admin'
          }
        }
      });

      render(
        <TestWrapper>
          <LoginForm />
        </TestWrapper>
      );

      // Fill login form
      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: 'test@test.com' }
      });
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: 'password123' }
      });

      // Submit form
      const loginButton = screen.getByRole('button', { name: /sign in/i });
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/auth/login', {
          email: 'test@test.com',
          password: 'password123'
        });
      });

      // Verify token storage
      expect(localStorageMock.setItem).toHaveBeenCalledWith('token', 'test-jwt-token');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('user', JSON.stringify({
        id: 'user123',
        name: 'Test User',
        email: 'test@test.com',
        role: 'admin'
      }));
    });

    test('should handle login errors', async () => {
      // Mock login error response
      api.post.mockRejectedValue({
        response: {
          status: 401,
          data: {
            success: false,
            message: 'Invalid credentials'
          }
        }
      });

      render(
        <TestWrapper>
          <LoginForm />
        </TestWrapper>
      );

      // Fill and submit form
      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: 'invalid@test.com' }
      });
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: 'wrongpassword' }
      });

      const loginButton = screen.getByRole('button', { name: /login/i });
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
      });

      // Verify no token was stored
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });

    test('should handle successful registration workflow', async () => {
      // Mock successful registration response
      api.post.mockResolvedValue({
        status: 201,
        data: {
          success: true,
          message: 'User registered successfully',
          user: {
            id: 'user456',
            name: 'New User',
            email: 'new@test.com',
            role: 'employee'
          }
        }
      });

      render(
        <TestWrapper>
          <RegisterForm />
        </TestWrapper>
      );

      // Fill registration form
      fireEvent.change(screen.getByLabelText(/name/i), {
        target: { value: 'New User' }
      });
      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: 'new@test.com' }
      });
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: 'password123' }
      });
      fireEvent.change(screen.getByLabelText(/role/i), {
        target: { value: 'employee' }
      });

      // Submit form
      const registerButton = screen.getByRole('button', { name: /register/i });
      fireEvent.click(registerButton);

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/auth/register', {
          name: 'New User',
          email: 'new@test.com',
          password: 'password123',
          role: 'employee'
        });
      });

      await waitFor(() => {
        expect(screen.getByText(/user registered successfully/i)).toBeInTheDocument();
      });
    });

    test('should handle registration validation errors', async () => {
      // Mock validation error response
      api.post.mockRejectedValue({
        response: {
          status: 400,
          data: {
            success: false,
            message: 'Validation failed',
            errors: {
              email: 'Email is already in use',
              password: 'Password must be at least 6 characters'
            }
          }
        }
      });

      render(
        <TestWrapper>
          <RegisterForm />
        </TestWrapper>
      );

      // Fill form with invalid data
      fireEvent.change(screen.getByLabelText(/name/i), {
        target: { value: 'Test User' }
      });
      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: 'existing@test.com' }
      });
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: '123' }
      });

      // Submit form
      const registerButton = screen.getByRole('button', { name: /register/i });
      fireEvent.click(registerButton);

      await waitFor(() => {
        expect(screen.getByText(/email is already in use/i)).toBeInTheDocument();
        expect(screen.getByText(/password must be at least 6 characters/i)).toBeInTheDocument();
      });
    });
  });

  describe('Network Error Handling Integration', () => {
    test('should handle network errors gracefully', async () => {
      // Mock network error
      api.post.mockRejectedValue({
        code: 'ERR_NETWORK',
        message: 'Network Error'
      });

      render(
        <TestWrapper>
          <LoginForm />
        </TestWrapper>
      );

      // Fill and submit form
      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: 'test@test.com' }
      });
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: 'password123' }
      });

      const loginButton = screen.getByRole('button', { name: /login/i });
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });
    });

    test('should handle server errors with retry indication', async () => {
      // Mock server error
      api.post.mockRejectedValue({
        response: {
          status: 500,
          data: {
            success: false,
            message: 'Internal server error'
          }
        }
      });

      render(
        <TestWrapper>
          <LoginForm />
        </TestWrapper>
      );

      // Fill and submit form
      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: 'test@test.com' }
      });
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: 'password123' }
      });

      const loginButton = screen.getByRole('button', { name: /login/i });
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(screen.getByText(/server error/i)).toBeInTheDocument();
      });
    });
  });

  describe('Form Validation Integration', () => {
    test('should validate required fields in login form', async () => {
      render(
        <TestWrapper>
          <LoginForm />
        </TestWrapper>
      );

      // Try to submit empty form
      const loginButton = screen.getByRole('button', { name: /login/i });
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument();
        expect(screen.getByText(/password is required/i)).toBeInTheDocument();
      });

      // Verify API was not called
      expect(api.post).not.toHaveBeenCalled();
    });

    test('should validate email format in registration form', async () => {
      render(
        <TestWrapper>
          <RegisterForm />
        </TestWrapper>
      );

      // Fill form with invalid email
      fireEvent.change(screen.getByLabelText(/name/i), {
        target: { value: 'Test User' }
      });
      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: 'invalid-email' }
      });
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: 'password123' }
      });

      // Submit form
      const registerButton = screen.getByRole('button', { name: /register/i });
      fireEvent.click(registerButton);

      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email/i)).toBeInTheDocument();
      });

      // Verify API was not called
      expect(api.post).not.toHaveBeenCalled();
    });
  });

  describe('Loading States Integration', () => {
    test('should show loading state during login', async () => {
      // Mock delayed response
      api.post.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            status: 200,
            data: { success: true, token: 'test-token', user: {} }
          }), 100)
        )
      );

      render(
        <TestWrapper>
          <LoginForm />
        </TestWrapper>
      );

      // Fill and submit form
      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: 'test@test.com' }
      });
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: 'password123' }
      });

      const loginButton = screen.getByRole('button', { name: /login/i });
      fireEvent.click(loginButton);

      // Check for loading state
      expect(screen.getByText(/logging in/i)).toBeInTheDocument();
      expect(loginButton).toBeDisabled();

      // Wait for completion
      await waitFor(() => {
        expect(screen.queryByText(/logging in/i)).not.toBeInTheDocument();
      });
    });
  });
});