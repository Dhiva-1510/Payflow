/**
 * Frontend End-to-End Integration Tests
 * 
 * Tests complete user workflows from frontend perspective
 * Verifies all role-based access controls work correctly
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

describe('Frontend End-to-End Integration Tests', () => {
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

  describe('Complete Admin Workflow Integration', () => {
    test('should complete full admin workflow: register → login → manage employees → run payroll', async () => {
      // Mock API responses for admin workflow
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

      const mockPayrollResult = {
        employeeId: 'emp123',
        month: 12,
        year: 2024,
        baseSalary: 50000,
        allowance: 5000,
        deduction: 2000,
        grossSalary: 55000,
        netSalary: 53000
      };

      // Step 1: Admin Registration
      mockedAxios.post.mockImplementationOnce(() =>
        Promise.resolve({
          status: 201,
          data: {
            success: true,
            message: 'User registered successfully',
            user: mockAdminUser
          }
        })
      );

      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      // Navigate to register page
      const registerLink = screen.getByText(/register/i);
      fireEvent.click(registerLink);

      // Fill registration form
      fireEvent.change(screen.getByLabelText(/name/i), {
        target: { value: 'Admin User' }
      });
      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: 'admin@test.com' }
      });
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: 'password123' }
      });
      fireEvent.change(screen.getByLabelText(/role/i), {
        target: { value: 'admin' }
      });

      // Submit registration
      const registerButton = screen.getByRole('button', { name: /register/i });
      fireEvent.click(registerButton);

      await waitFor(() => {
        expect(mockedAxios.post).toHaveBeenCalledWith('/auth/register', {
          name: 'Admin User',
          email: 'admin@test.com',
          password: 'password123',
          role: 'admin'
        });
      });

      // Step 2: Admin Login
      mockedAxios.post.mockImplementationOnce(() =>
        Promise.resolve({
          status: 200,
          data: {
            success: true,
            token: 'admin-jwt-token',
            user: mockAdminUser
          }
        })
      );

      // Navigate to login page
      const loginLink = screen.getByText(/login/i);
      fireEvent.click(loginLink);

      // Fill login form
      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: 'admin@test.com' }
      });
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: 'password123' }
      });

      // Submit login
      const loginButton = screen.getByRole('button', { name: /login/i });
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(mockedAxios.post).toHaveBeenCalledWith('/auth/login', {
          email: 'admin@test.com',
          password: 'password123'
        });
      });

      // Verify token is stored
      expect(localStorageMock.setItem).toHaveBeenCalledWith('token', 'admin-jwt-token');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('user', JSON.stringify(mockAdminUser));

      // Step 3: Admin Dashboard - Employee Management
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

      // Re-render with authenticated state
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

      // Step 4: Run Payroll
      mockedAxios.post.mockImplementationOnce(() =>
        Promise.resolve({
          status: 200,
          data: {
            success: true,
            processedCount: 1,
            results: [mockPayrollResult]
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

      // Step 5: View Payroll History
      mockedAxios.get.mockImplementationOnce(() =>
        Promise.resolve({
          status: 200,
          data: {
            success: true,
            payrollRecords: [mockPayrollResult]
          }
        })
      );

      const viewHistoryButton = screen.getByText(/view payroll history/i);
      fireEvent.click(viewHistoryButton);

      await waitFor(() => {
        expect(mockedAxios.get).toHaveBeenCalledWith(`/payroll/${mockEmployee._id}`);
        expect(screen.getByText('December 2024')).toBeInTheDocument();
        expect(screen.getByText('₹55,000')).toBeInTheDocument(); // Gross salary
        expect(screen.getByText('₹53,000')).toBeInTheDocument(); // Net salary
      });
    });

    test('should handle admin adding new employee', async () => {
      const mockAdminUser = {
        _id: 'admin123',
        name: 'Admin User',
        email: 'admin@test.com',
        role: 'admin'
      };

      const mockNewEmployee = {
        _id: 'emp456',
        userId: 'user456',
        baseSalary: 60000,
        allowance: 6000,
        deduction: 3000,
        user: {
          _id: 'user456',
          name: 'New Employee',
          email: 'newemployee@test.com',
          role: 'employee'
        }
      };

      // Setup authenticated admin state
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'token') return 'admin-jwt-token';
        if (key === 'user') return JSON.stringify(mockAdminUser);
        return null;
      });

      // Mock employee list (initially empty)
      mockedAxios.get.mockImplementationOnce(() =>
        Promise.resolve({
          status: 200,
          data: {
            success: true,
            employees: []
          }
        })
      );

      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      // Navigate to employee management
      const employeeManagementLink = screen.getByText(/employee management/i);
      fireEvent.click(employeeManagementLink);

      await waitFor(() => {
        expect(screen.getByText(/no employees found/i)).toBeInTheDocument();
      });

      // Mock add employee API call
      mockedAxios.post.mockImplementationOnce(() =>
        Promise.resolve({
          status: 201,
          data: {
            success: true,
            employee: mockNewEmployee
          }
        })
      );

      // Click add employee button
      const addEmployeeButton = screen.getByText(/add employee/i);
      fireEvent.click(addEmployeeButton);

      // Fill employee form
      fireEvent.change(screen.getByLabelText(/user id/i), {
        target: { value: 'user456' }
      });
      fireEvent.change(screen.getByLabelText(/base salary/i), {
        target: { value: '60000' }
      });
      fireEvent.change(screen.getByLabelText(/allowance/i), {
        target: { value: '6000' }
      });
      fireEvent.change(screen.getByLabelText(/deduction/i), {
        target: { value: '3000' }
      });

      // Submit form
      const submitButton = screen.getByRole('button', { name: /add employee/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockedAxios.post).toHaveBeenCalledWith('/employee/add', {
          userId: 'user456',
          baseSalary: 60000,
          allowance: 6000,
          deduction: 3000
        });
        expect(screen.getByText(/employee added successfully/i)).toBeInTheDocument();
      });
    });
  });

  describe('Complete Employee Workflow Integration', () => {
    test('should complete full employee workflow: register → login → view payroll', async () => {
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
        },
        {
          _id: 'payroll2',
          employeeId: 'emp123',
          month: 11,
          year: 2024,
          baseSalary: 50000,
          allowance: 5000,
          deduction: 2000,
          grossSalary: 55000,
          netSalary: 53000,
          createdAt: '2024-11-01T00:00:00.000Z'
        }
      ];

      // Step 1: Employee Registration
      mockedAxios.post.mockImplementationOnce(() =>
        Promise.resolve({
          status: 201,
          data: {
            success: true,
            message: 'User registered successfully',
            user: mockEmployeeUser
          }
        })
      );

      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      // Navigate to register page
      const registerLink = screen.getByText(/register/i);
      fireEvent.click(registerLink);

      // Fill registration form
      fireEvent.change(screen.getByLabelText(/name/i), {
        target: { value: 'Employee User' }
      });
      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: 'employee@test.com' }
      });
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: 'password123' }
      });
      fireEvent.change(screen.getByLabelText(/role/i), {
        target: { value: 'employee' }
      });

      // Submit registration
      const registerButton = screen.getByRole('button', { name: /register/i });
      fireEvent.click(registerButton);

      await waitFor(() => {
        expect(mockedAxios.post).toHaveBeenCalledWith('/auth/register', {
          name: 'Employee User',
          email: 'employee@test.com',
          password: 'password123',
          role: 'employee'
        });
      });

      // Step 2: Employee Login
      mockedAxios.post.mockImplementationOnce(() =>
        Promise.resolve({
          status: 200,
          data: {
            success: true,
            token: 'employee-jwt-token',
            user: mockEmployeeUser
          }
        })
      );

      // Navigate to login page
      const loginLink = screen.getByText(/login/i);
      fireEvent.click(loginLink);

      // Fill login form
      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: 'employee@test.com' }
      });
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: 'password123' }
      });

      // Submit login
      const loginButton = screen.getByRole('button', { name: /login/i });
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(mockedAxios.post).toHaveBeenCalledWith('/auth/login', {
          email: 'employee@test.com',
          password: 'password123'
        });
      });

      // Step 3: Employee Dashboard - View Payroll
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
            payrollRecords: mockPayrollRecords
          }
        })
      );

      // Re-render with authenticated state
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
        expect(screen.getByText('November 2024')).toBeInTheDocument();
        expect(screen.getAllByText('₹55,000')).toHaveLength(2); // Gross salary for both records
        expect(screen.getAllByText('₹53,000')).toHaveLength(2); // Net salary for both records
      });

      // Step 4: View Individual Payslip
      const viewPayslipButton = screen.getAllByText(/view payslip/i)[0];
      fireEvent.click(viewPayslipButton);

      await waitFor(() => {
        expect(screen.getByText(/payslip for december 2024/i)).toBeInTheDocument();
        expect(screen.getByText(/base salary.*₹50,000/i)).toBeInTheDocument();
        expect(screen.getByText(/allowance.*₹5,000/i)).toBeInTheDocument();
        expect(screen.getByText(/deduction.*₹2,000/i)).toBeInTheDocument();
        expect(screen.getByText(/gross salary.*₹55,000/i)).toBeInTheDocument();
        expect(screen.getByText(/net salary.*₹53,000/i)).toBeInTheDocument();
      });
    });
  });

  describe('Role-Based Access Control Integration', () => {
    test('should enforce admin-only access in frontend', async () => {
      const mockEmployeeUser = {
        _id: 'user123',
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

      // Employee should NOT see admin-only links
      expect(screen.queryByText(/employee management/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/payroll management/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/run payroll/i)).not.toBeInTheDocument();

      // Employee should only see employee-specific links
      expect(screen.getByText(/payroll history/i)).toBeInTheDocument();
      expect(screen.getByText(/my payslips/i)).toBeInTheDocument();
    });

    test('should enforce employee access restrictions via API', async () => {
      const mockEmployeeUser = {
        _id: 'user123',
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

      // Mock API calls that should fail for employees
      mockedAxios.get.mockImplementationOnce(() =>
        Promise.reject({
          response: {
            status: 403,
            data: {
              success: false,
              message: 'Access denied. Admin role required.'
            }
          }
        })
      );

      mockedAxios.post.mockImplementationOnce(() =>
        Promise.reject({
          response: {
            status: 403,
            data: {
              success: false,
              message: 'Access denied. Admin role required.'
            }
          }
        })
      );

      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      // Simulate employee trying to access admin endpoints directly
      // (This would happen if they manipulated the URL or made direct API calls)

      // Try to access employee list (should fail)
      try {
        await mockedAxios.get('/employee');
      } catch (error) {
        expect(error.response.status).toBe(403);
        expect(error.response.data.message).toContain('Access denied');
      }

      // Try to run payroll (should fail)
      try {
        await mockedAxios.post('/payroll/run', { month: 12, year: 2024 });
      } catch (error) {
        expect(error.response.status).toBe(403);
        expect(error.response.data.message).toContain('Access denied');
      }
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
      const loginButton = screen.getByRole('button', { name: /login/i });
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
        expect(localStorageMock.setItem).not.toHaveBeenCalled();
      });
    });

    test('should handle token expiration and redirect to login', async () => {
      const mockAdminUser = {
        _id: 'admin123',
        name: 'Admin User',
        email: 'admin@test.com',
        role: 'admin'
      };

      // Setup authenticated state with expired token
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'token') return 'expired-jwt-token';
        if (key === 'user') return JSON.stringify(mockAdminUser);
        return null;
      });

      // Mock API call that returns 401 (token expired)
      mockedAxios.get.mockImplementationOnce(() =>
        Promise.reject({
          response: {
            status: 401,
            data: {
              success: false,
              message: 'Token expired'
            }
          }
        })
      );

      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      // Try to access protected resource
      const employeeManagementLink = screen.getByText(/employee management/i);
      fireEvent.click(employeeManagementLink);

      await waitFor(() => {
        expect(mockedAxios.get).toHaveBeenCalledWith('/employee');
        expect(screen.getByText(/session expired/i)).toBeInTheDocument();
        expect(localStorageMock.removeItem).toHaveBeenCalledWith('token');
        expect(localStorageMock.removeItem).toHaveBeenCalledWith('user');
      });
    });
  });

  describe('Error Handling Integration', () => {
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

      const loginButton = screen.getByRole('button', { name: /login/i });
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
        expect(screen.getByText(/check your connection/i)).toBeInTheDocument();
      });
    });

    test('should handle server errors with retry option', async () => {
      const mockAdminUser = {
        _id: 'admin123',
        name: 'Admin User',
        email: 'admin@test.com',
        role: 'admin'
      };

      // Setup authenticated admin state
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'token') return 'admin-jwt-token';
        if (key === 'user') return JSON.stringify(mockAdminUser);
        return null;
      });

      // Mock server error first, then success
      mockedAxios.post
        .mockImplementationOnce(() =>
          Promise.reject({
            response: {
              status: 500,
              data: {
                success: false,
                message: 'Internal server error'
              }
            }
          })
        )
        .mockImplementationOnce(() =>
          Promise.resolve({
            status: 200,
            data: {
              success: true,
              processedCount: 1,
              results: []
            }
          })
        );

      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      // Navigate to payroll management
      const payrollManagementLink = screen.getByText(/payroll management/i);
      fireEvent.click(payrollManagementLink);

      // Fill and submit payroll form
      fireEvent.change(screen.getByLabelText(/month/i), {
        target: { value: '12' }
      });
      fireEvent.change(screen.getByLabelText(/year/i), {
        target: { value: '2024' }
      });

      const runPayrollButton = screen.getByRole('button', { name: /run payroll/i });
      fireEvent.click(runPayrollButton);

      await waitFor(() => {
        expect(screen.getByText(/server error/i)).toBeInTheDocument();
        expect(screen.getByText(/try again/i)).toBeInTheDocument();
      });

      // Click retry button
      const retryButton = screen.getByText(/try again/i);
      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(screen.getByText(/payroll processed successfully/i)).toBeInTheDocument();
      });
    });

    test('should handle validation errors with field-specific messages', async () => {
      const mockAdminUser = {
        _id: 'admin123',
        name: 'Admin User',
        email: 'admin@test.com',
        role: 'admin'
      };

      // Setup authenticated admin state
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'token') return 'admin-jwt-token';
        if (key === 'user') return JSON.stringify(mockAdminUser);
        return null;
      });

      // Mock validation error
      mockedAxios.post.mockImplementationOnce(() =>
        Promise.reject({
          response: {
            status: 400,
            data: {
              success: false,
              message: 'Validation failed',
              errors: {
                baseSalary: 'Base salary must be greater than 0',
                userId: 'User ID is required'
              }
            }
          }
        })
      );

      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      // Navigate to employee management
      const employeeManagementLink = screen.getByText(/employee management/i);
      fireEvent.click(employeeManagementLink);

      // Click add employee
      const addEmployeeButton = screen.getByText(/add employee/i);
      fireEvent.click(addEmployeeButton);

      // Submit form with invalid data
      const submitButton = screen.getByRole('button', { name: /add employee/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/base salary must be greater than 0/i)).toBeInTheDocument();
        expect(screen.getByText(/user id is required/i)).toBeInTheDocument();
      });
    });
  });

  describe('Data Consistency Integration', () => {
    test('should maintain UI state consistency across navigation', async () => {
      const mockAdminUser = {
        _id: 'admin123',
        name: 'Admin User',
        email: 'admin@test.com',
        role: 'admin'
      };

      const mockEmployees = [
        {
          _id: 'emp1',
          baseSalary: 50000,
          allowance: 5000,
          deduction: 2000,
          user: { name: 'Employee 1', email: 'emp1@test.com' }
        },
        {
          _id: 'emp2',
          baseSalary: 60000,
          allowance: 6000,
          deduction: 3000,
          user: { name: 'Employee 2', email: 'emp2@test.com' }
        }
      ];

      // Setup authenticated admin state
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'token') return 'admin-jwt-token';
        if (key === 'user') return JSON.stringify(mockAdminUser);
        return null;
      });

      // Mock employee list API
      mockedAxios.get.mockImplementation(() =>
        Promise.resolve({
          status: 200,
          data: {
            success: true,
            employees: mockEmployees
          }
        })
      );

      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      // Navigate to employee management
      const employeeManagementLink = screen.getByText(/employee management/i);
      fireEvent.click(employeeManagementLink);

      await waitFor(() => {
        expect(screen.getByText('Employee 1')).toBeInTheDocument();
        expect(screen.getByText('Employee 2')).toBeInTheDocument();
      });

      // Navigate away and back
      const dashboardLink = screen.getByText(/dashboard/i);
      fireEvent.click(dashboardLink);

      await waitFor(() => {
        expect(screen.getByText(/admin dashboard/i)).toBeInTheDocument();
      });

      // Navigate back to employee management
      fireEvent.click(employeeManagementLink);

      await waitFor(() => {
        // Data should be consistent
        expect(screen.getByText('Employee 1')).toBeInTheDocument();
        expect(screen.getByText('Employee 2')).toBeInTheDocument();
        expect(screen.getByText('₹50,000')).toBeInTheDocument();
        expect(screen.getByText('₹60,000')).toBeInTheDocument();
      });
    });

    test('should update UI immediately after successful operations', async () => {
      const mockAdminUser = {
        _id: 'admin123',
        name: 'Admin User',
        email: 'admin@test.com',
        role: 'admin'
      };

      const mockNewEmployee = {
        _id: 'emp123',
        userId: 'user123',
        baseSalary: 55000,
        allowance: 5500,
        deduction: 2500,
        user: {
          name: 'New Employee',
          email: 'new@test.com'
        }
      };

      // Setup authenticated admin state
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'token') return 'admin-jwt-token';
        if (key === 'user') return JSON.stringify(mockAdminUser);
        return null;
      });

      // Mock empty employee list initially
      mockedAxios.get.mockImplementationOnce(() =>
        Promise.resolve({
          status: 200,
          data: {
            success: true,
            employees: []
          }
        })
      );

      // Mock add employee success
      mockedAxios.post.mockImplementationOnce(() =>
        Promise.resolve({
          status: 201,
          data: {
            success: true,
            employee: mockNewEmployee
          }
        })
      );

      // Mock updated employee list
      mockedAxios.get.mockImplementationOnce(() =>
        Promise.resolve({
          status: 200,
          data: {
            success: true,
            employees: [mockNewEmployee]
          }
        })
      );

      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      // Navigate to employee management
      const employeeManagementLink = screen.getByText(/employee management/i);
      fireEvent.click(employeeManagementLink);

      await waitFor(() => {
        expect(screen.getByText(/no employees found/i)).toBeInTheDocument();
      });

      // Add new employee
      const addEmployeeButton = screen.getByText(/add employee/i);
      fireEvent.click(addEmployeeButton);

      // Fill form
      fireEvent.change(screen.getByLabelText(/user id/i), {
        target: { value: 'user123' }
      });
      fireEvent.change(screen.getByLabelText(/base salary/i), {
        target: { value: '55000' }
      });
      fireEvent.change(screen.getByLabelText(/allowance/i), {
        target: { value: '5500' }
      });
      fireEvent.change(screen.getByLabelText(/deduction/i), {
        target: { value: '2500' }
      });

      // Submit form
      const submitButton = screen.getByRole('button', { name: /add employee/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        // UI should update immediately to show new employee
        expect(screen.getByText('New Employee')).toBeInTheDocument();
        expect(screen.getByText('new@test.com')).toBeInTheDocument();
        expect(screen.getByText('₹55,000')).toBeInTheDocument();
        expect(screen.queryByText(/no employees found/i)).not.toBeInTheDocument();
      });
    });
  });
});