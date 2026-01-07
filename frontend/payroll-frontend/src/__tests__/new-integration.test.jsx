/**
 * Comprehensive Frontend-Backend Integration Tests
 * 
 * Tests complete authentication and payroll workflows from frontend perspective
 * Verifies frontend-backend integration and data flow
 * Tests system-wide functionality and error handling
 * 
 * Requirements: All
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import axios from 'axios';
import App from '../App';
import { NotificationProvider } from '../context/NotificationContext';

// Mock axios
jest.mock('axios');
const mockedAxios = axios;

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

describe('Comprehensive Frontend-Backend Integration Tests', () => {
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    
    // Mock axios defaults
    mockedAxios.create = jest.fn(() => mockedAxios);
    mockedAxios.interceptors = {
      request: { use: jest.fn() },
      response: { use: jest.fn() }
    };
  });

  describe('Authentication and Authorization Integration', () => {
    test('should enforce role-based access control throughout the application', async () => {
      const mockEmployeeUser = {
        _id: 'emp123',
        name: 'Employee User',
        email: 'employee@test.com',
        role: 'employee'
      };

      // Setup authenticated employee state
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'token') return 'employee-jwt-token';
        if (key === 'user') return JSON.stringify(mockEmployeeUser);
        return null;
      });

      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/employee dashboard/i)).toBeInTheDocument();
      });

      // Verify employee sees only employee-specific navigation
      expect(screen.getByText(/payroll history/i)).toBeInTheDocument();

      // Verify employee does NOT see admin-only navigation
      expect(screen.queryByText(/employee management/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/payroll management/i)).not.toBeInTheDocument();
    });

    test('should handle authentication errors properly', async () => {
      // Mock authentication failure
      mockedAxios.post.mockImplementationOnce(() =>
        Promise.reject({
          response: {
            status: 401,
            data: {
              success: false,
              message: 'Invalid credentials'
            }
          }
        })
      );

      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      // Navigate to login page
      const loginLink = screen.getByText(/login/i);
      fireEvent.click(loginLink);

      // Fill login form with invalid credentials
      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: 'invalid@test.com' }
      });
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: 'wrongpassword' }
      });

      // Submit login
      const loginButton = screen.getByRole('button', { name: /sign in/i });
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
        expect(localStorageMock.setItem).not.toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling and Recovery Integration', () => {
    test('should handle network errors gracefully', async () => {
      // Mock network error
      mockedAxios.post.mockImplementationOnce(() =>
        Promise.reject({
          code: 'ERR_NETWORK',
          message: 'Network Error'
        })
      );

      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      // Navigate to login page
      const loginLink = screen.getByText(/login/i);
      fireEvent.click(loginLink);

      // Fill and submit login form
      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: 'test@test.com' }
      });
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: 'password123' }
      });

      const loginButton = screen.getByRole('button', { name: /sign in/i });
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });
    });

    test('should handle server errors with user-friendly messages', async () => {
      // Mock server error
      mockedAxios.post.mockImplementationOnce(() =>
        Promise.reject({
          response: {
            status: 500,
            data: {
              success: false,
              message: 'Internal server error'
            }
          }
        })
      );

      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      // Navigate to login page
      const loginLink = screen.getByText(/login/i);
      fireEvent.click(loginLink);

      // Fill and submit login form
      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: 'test@test.com' }
      });
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: 'password123' }
      });

      const loginButton = screen.getByRole('button', { name: /sign in/i });
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(screen.getByText(/server error/i)).toBeInTheDocument();
      });
    });
  });

  describe('Complete Workflow Integration', () => {
    test('should complete admin workflow: login → manage employees → run payroll', async () => {
      const mockAdminUser = {
        _id: 'admin123',
        name: 'Admin User',
        email: 'admin@test.com',
        role: 'admin'
      };

      const mockEmployee = {
        _id: 'emp123',
        userId: 'user123',
        baseSalary: 50000,
        allowance: 5000,
        deduction: 2000,
        user: {
          _id: 'user123',
          name: 'Employee User',
          email: 'employee@test.com',
          role: 'employee'
        }
      };

      // Setup authenticated admin state
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'token') return 'admin-jwt-token';
        if (key === 'user') return JSON.stringify(mockAdminUser);
        return null;
      });

      // Mock employee list API call
      mockedAxios.get.mockImplementationOnce(() =>
        Promise.resolve({
          status: 200,
          data: {
            success: true,
            employees: [mockEmployee]
          }
        })
      );

      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/admin dashboard/i)).toBeInTheDocument();
      });

      // Navigate to employee management
      const employeeManagementLink = screen.getByText(/employee management/i);
      fireEvent.click(employeeManagementLink);

      await waitFor(() => {
        expect(mockedAxios.get).toHaveBeenCalledWith('/employee');
        expect(screen.getByText('Employee User')).toBeInTheDocument();
        expect(screen.getByText('employee@test.com')).toBeInTheDocument();
      });

      // Mock payroll run API call
      mockedAxios.post.mockImplementationOnce(() =>
        Promise.resolve({
          status: 200,
          data: {
            success: true,
            data: {
              processedCount: 1,
              results: [{
                employeeId: 'emp123',
                success: true,
                payroll: {
                  month: 12,
                  year: 2024,
                  baseSalary: 50000,
                  allowance: 5000,
                  deduction: 2000,
                  grossSalary: 55000,
                  netSalary: 53000
                }
              }]
            }
          }
        })
      );

      // Navigate to payroll management
      const payrollManagementLink = screen.getByText(/payroll management/i);
      fireEvent.click(payrollManagementLink);

      // Fill payroll form
      fireEvent.change(screen.getByLabelText(/month/i), {
        target: { value: '12' }
      });
      fireEvent.change(screen.getByLabelText(/year/i), {
        target: { value: '2024' }
      });

      // Submit payroll
      const runPayrollButton = screen.getByRole('button', { name: /run payroll/i });
      fireEvent.click(runPayrollButton);

      await waitFor(() => {
        expect(mockedAxios.post).toHaveBeenCalledWith('/payroll/run', {
          month: 12,
          year: 2024
        });
        expect(screen.getByText(/payroll processed successfully/i)).toBeInTheDocument();
        expect(screen.getByText(/processed 1 employee/i)).toBeInTheDocument();
      });
    });

    test('should complete employee workflow: login → view payroll history', async () => {
      const mockEmployeeUser = {
        _id: 'user123',
        name: 'Employee User',
        email: 'employee@test.com',
        role: 'employee'
      };

      const mockPayrollRecords = [
        {
          _id: 'payroll1',
          employeeId: 'emp123',
          month: 12,
          year: 2024,
          baseSalary: 50000,
          allowance: 5000,
          deduction: 2000,
          grossSalary: 55000,
          netSalary: 53000,
          createdAt: '2024-12-01T00:00:00.000Z'
        }
      ];

      // Setup authenticated employee state
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'token') return 'employee-jwt-token';
        if (key === 'user') return JSON.stringify(mockEmployeeUser);
        return null;
      });

      // Mock payroll history API call
      mockedAxios.get.mockImplementationOnce(() =>
        Promise.resolve({
          status: 200,
          data: {
            success: true,
            data: {
              payrollRecords: mockPayrollRecords
            }
          }
        })
      );

      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/employee dashboard/i)).toBeInTheDocument();
      });

      // Navigate to payroll history
      const payrollHistoryLink = screen.getByText(/payroll history/i);
      fireEvent.click(payrollHistoryLink);

      await waitFor(() => {
        expect(mockedAxios.get).toHaveBeenCalledWith('/payroll/emp123');
        expect(screen.getByText('December 2024')).toBeInTheDocument();
        expect(screen.getByText('$55,000')).toBeInTheDocument(); // Gross salary
        expect(screen.getByText('$53,000')).toBeInTheDocument(); // Net salary
      });
    });
  });
});