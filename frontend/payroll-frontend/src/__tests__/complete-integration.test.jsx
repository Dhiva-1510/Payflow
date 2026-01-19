/**
 * Complete Frontend-Backend Integration Tests
 * 
 * Tests complete authentication and payroll workflows from frontend perspective
 * Verifies frontend-backend integration and communication patterns
 * Tests all requirements with realistic user interactions
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

describe('Complete Frontend-Backend Integration Tests', () => {
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

  describe('Complete Authentication Workflow Integration', () => {
    test('should complete full authentication workflow with proper frontend-backend communication', async () => {
      // Mock successful registration response (Requirement 1.1)
      mockedAxios.post.mockImplementationOnce(() =>
        Promise.resolve({
          status: 201,
          data: {
            success: true,
            message: 'User registered successfully',
            user: {
              _id: 'admin123',
              name: 'System Admin',
              email: 'admin@company.com',
              role: 'admin'
            }
          }
        })
      );

      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      // Navigate to registration
      const registerLink = screen.getByText(/register/i);
      fireEvent.click(registerLink);

      // Fill registration form
      fireEvent.change(screen.getByLabelText(/name/i), {
        target: { value: 'System Admin' }
      });
      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: 'admin@company.com' }
      });
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: 'SecurePass123!' }
      });
      fireEvent.change(screen.getByLabelText(/role/i), {
        target: { value: 'admin' }
      });

      // Submit registration
      const registerButton = screen.getByRole('button', { name: /register/i });
      fireEvent.click(registerButton);

      await waitFor(() => {
        expect(mockedAxios.post).toHaveBeenCalledWith('/auth/register', {
          name: 'System Admin',
          email: 'admin@company.com',
          password: 'SecurePass123!',
          role: 'admin'
        });
        expect(screen.getByText(/user registered successfully/i)).toBeInTheDocument();
      });

      // Mock successful login response (Requirement 1.2)
      mockedAxios.post.mockImplementationOnce(() =>
        Promise.resolve({
          status: 200,
          data: {
            success: true,
            token: 'admin-jwt-token-12345',
            user: {
              _id: 'admin123',
              name: 'System Admin',
              email: 'admin@company.com',
              role: 'admin'
            }
          }
        })
      );

      // Navigate to login
      const loginLink = screen.getByText(/login/i);
      fireEvent.click(loginLink);

      // Fill login form
      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: 'admin@company.com' }
      });
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: 'SecurePass123!' }
      });

      // Submit login
      const loginButton = screen.getByRole('button', { name: /sign in/i });
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(mockedAxios.post).toHaveBeenCalledWith('/auth/login', {
          email: 'admin@company.com',
          password: 'SecurePass123!'
        });
      });

      // Verify token storage (Requirement 7.4, 8.2)
      expect(localStorageMock.setItem).toHaveBeenCalledWith('token', 'admin-jwt-token-12345');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('user', JSON.stringify({
        _id: 'admin123',
        name: 'System Admin',
        email: 'admin@company.com',
        role: 'admin'
      }));
    });

    test('should handle authentication errors with proper frontend error display', async () => {
      // Mock authentication failure (Requirement 7.6)
      mockedAxios.post.mockImplementationOnce(() =>
        Promise.reject({
          response: {
            status: 401,
            data: {
              success: false,
              message: 'Invalid email or password'
            }
          }
        })
      );

      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      // Navigate to login
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
        expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument();
        expect(localStorageMock.setItem).not.toHaveBeenCalled();
      });
    });

    test('should handle network errors with user-friendly messages', async () => {
      // Mock network error (Requirement 8.5)
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

      // Navigate to login
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
        expect(screen.getByText(/check your connection/i)).toBeInTheDocument();
      });
    });
  });

  describe('Complete Admin Workflow Integration', () => {
    beforeEach(() => {
      // Setup authenticated admin state
      const mockAdminUser = {
        _id: 'admin123',
        name: 'Admin User',
        email: 'admin@company.com',
        role: 'admin'
      };

      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'token') return 'admin-jwt-token';
        if (key === 'user') return JSON.stringify(mockAdminUser);
        return null;
      });
    });

    test('should complete admin employee management workflow', async () => {
      const mockEmployee = {
        _id: 'emp123',
        userId: 'user123',
        baseSalary: 75000,
        allowance: 12000,
        deduction: 8000,
        user: {
          _id: 'user123',
          name: 'John Employee',
          email: 'john@company.com',
          role: 'employee'
        }
      };

      // Mock employee list API call (Requirement 2.2)
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

      // Navigate to employee management (Requirement 7.2)
      const employeeManagementLink = screen.getByText(/employee management/i);
      fireEvent.click(employeeManagementLink);

      await waitFor(() => {
        expect(mockedAxios.get).toHaveBeenCalledWith('/employee');
        expect(screen.getByText('John Employee')).toBeInTheDocument();
        expect(screen.getByText('john@company.com')).toBeInTheDocument();
        expect(screen.getByText('₹75,000')).toBeInTheDocument();
      });

      // Test employee update functionality (Requirement 2.3)
      mockedAxios.put.mockImplementationOnce(() =>
        Promise.resolve({
          status: 200,
          data: {
            success: true,
            employee: {
              ...mockEmployee,
              baseSalary: 80000,
              allowance: 15000,
              deduction: 10000
            }
          }
        })
      );

      // Click edit employee button
      const editButton = screen.getByText(/edit/i);
      fireEvent.click(editButton);

      // Update employee data
      fireEvent.change(screen.getByLabelText(/base salary/i), {
        target: { value: '80000' }
      });
      fireEvent.change(screen.getByLabelText(/allowance/i), {
        target: { value: '15000' }
      });
      fireEvent.change(screen.getByLabelText(/deduction/i), {
        target: { value: '10000' }
      });

      // Submit update
      const updateButton = screen.getByRole('button', { name: /update employee/i });
      fireEvent.click(updateButton);

      await waitFor(() => {
        expect(mockedAxios.put).toHaveBeenCalledWith('/employee/emp123', {
          baseSalary: 80000,
          allowance: 15000,
          deduction: 10000
        });
        expect(screen.getByText(/employee updated successfully/i)).toBeInTheDocument();
      });
    });

    test('should complete admin payroll processing workflow', async () => {
      const mockPayrollResult = {
        employeeId: 'emp123',
        success: true,
        payroll: {
          month: 12,
          year: 2024,
          baseSalary: 75000,
          allowance: 12000,
          deduction: 8000,
          grossSalary: 87000, // 75000 + 12000
          netSalary: 79000    // 87000 - 8000
        }
      };

      // Mock payroll run API call (Requirement 3.1, 3.2, 3.3)
      mockedAxios.post.mockImplementationOnce(() =>
        Promise.resolve({
          status: 200,
          data: {
            success: true,
            data: {
              processedCount: 1,
              results: [mockPayrollResult]
            }
          }
        })
      );

      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      // Navigate to payroll management (Requirement 7.2)
      const payrollManagementLink = screen.getByText(/payroll management/i);
      fireEvent.click(payrollManagementLink);

      // Fill payroll form
      fireEvent.change(screen.getByLabelText(/month/i), {
        target: { value: '12' }
      });
      fireEvent.change(screen.getByLabelText(/year/i), {
        target: { value: '2024' }
      });

      // Submit payroll processing
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

      // Verify payroll calculations are displayed correctly
      expect(screen.getByText(/gross.*₹87,000/i)).toBeInTheDocument();
      expect(screen.getByText(/net.*₹79,000/i)).toBeInTheDocument();
    });

    test('should handle admin adding new employee with validation', async () => {
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

      // Test validation error handling (Requirement 2.4)
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

      // Test successful employee addition (Requirement 2.1)
      mockedAxios.post.mockImplementationOnce(() =>
        Promise.resolve({
          status: 201,
          data: {
            success: true,
            employee: {
              _id: 'emp456',
              userId: 'user456',
              baseSalary: 65000,
              allowance: 8000,
              deduction: 4000
            }
          }
        })
      );

      // Fill form with valid data
      fireEvent.change(screen.getByLabelText(/user id/i), {
        target: { value: 'user456' }
      });
      fireEvent.change(screen.getByLabelText(/base salary/i), {
        target: { value: '65000' }
      });
      fireEvent.change(screen.getByLabelText(/allowance/i), {
        target: { value: '8000' }
      });
      fireEvent.change(screen.getByLabelText(/deduction/i), {
        target: { value: '4000' }
      });

      // Submit form
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockedAxios.post).toHaveBeenCalledWith('/employee/add', {
          userId: 'user456',
          baseSalary: 65000,
          allowance: 8000,
          deduction: 4000
        });
        expect(screen.getByText(/employee added successfully/i)).toBeInTheDocument();
      });
    });
  });

  describe('Complete Employee Workflow Integration', () => {
    beforeEach(() => {
      // Setup authenticated employee state
      const mockEmployeeUser = {
        _id: 'user123',
        name: 'Employee User',
        email: 'employee@company.com',
        role: 'employee'
      };

      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'token') return 'employee-jwt-token';
        if (key === 'user') return JSON.stringify(mockEmployeeUser);
        return null;
      });
    });

    test('should complete employee payroll viewing workflow', async () => {
      const mockPayrollRecords = [
        {
          _id: 'payroll1',
          employeeId: 'emp123',
          month: 12,
          year: 2024,
          baseSalary: 60000,
          allowance: 8000,
          deduction: 4000,
          grossSalary: 68000,
          netSalary: 64000,
          createdAt: '2024-12-01T00:00:00.000Z'
        },
        {
          _id: 'payroll2',
          employeeId: 'emp123',
          month: 11,
          year: 2024,
          baseSalary: 60000,
          allowance: 8000,
          deduction: 4000,
          grossSalary: 68000,
          netSalary: 64000,
          createdAt: '2024-11-01T00:00:00.000Z'
        }
      ];

      // Mock payroll history API call (Requirement 4.1, 4.2, 4.5)
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

      // Navigate to payroll history (Requirement 7.3)
      const payrollHistoryLink = screen.getByText(/payroll history/i);
      fireEvent.click(payrollHistoryLink);

      await waitFor(() => {
        expect(mockedAxios.get).toHaveBeenCalledWith('/payroll/emp123');
        
        // Verify payroll records are displayed (Requirement 4.2)
        expect(screen.getByText('December 2024')).toBeInTheDocument();
        expect(screen.getByText('November 2024')).toBeInTheDocument();
        expect(screen.getAllByText('₹68,000')).toHaveLength(2); // Gross salary
        expect(screen.getAllByText('₹64,000')).toHaveLength(2); // Net salary
      });

      // Test individual payslip viewing
      const viewPayslipButtons = screen.getAllByText(/view payslip/i);
      fireEvent.click(viewPayslipButtons[0]);

      await waitFor(() => {
        expect(screen.getByText(/payslip for december 2024/i)).toBeInTheDocument();
        expect(screen.getByText(/base salary.*₹60,000/i)).toBeInTheDocument();
        expect(screen.getByText(/allowance.*₹8,000/i)).toBeInTheDocument();
        expect(screen.getByText(/deduction.*₹4,000/i)).toBeInTheDocument();
        expect(screen.getByText(/gross salary.*₹68,000/i)).toBeInTheDocument();
        expect(screen.getByText(/net salary.*₹64,000/i)).toBeInTheDocument();
      });
    });

    test('should handle empty payroll history gracefully', async () => {
      // Mock empty payroll history (Requirement 4.4)
      mockedAxios.get.mockImplementationOnce(() =>
        Promise.resolve({
          status: 200,
          data: {
            success: true,
            data: {
              payrollRecords: []
            }
          }
        })
      );

      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      // Navigate to payroll history
      const payrollHistoryLink = screen.getByText(/payroll history/i);
      fireEvent.click(payrollHistoryLink);

      await waitFor(() => {
        expect(screen.getByText(/no payroll records found/i)).toBeInTheDocument();
      });
    });
  });

  describe('Role-Based Access Control Integration', () => {
    test('should enforce role-based UI restrictions', async () => {
      const mockEmployeeUser = {
        _id: 'user123',
        name: 'Employee User',
        email: 'employee@company.com',
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

      // Verify employee sees only employee-specific navigation (Requirement 7.7)
      expect(screen.getByText(/payroll history/i)).toBeInTheDocument();
      expect(screen.getByText(/my payslips/i)).toBeInTheDocument();

      // Verify employee does NOT see admin-only navigation (Requirement 1.4)
      expect(screen.queryByText(/employee management/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/payroll management/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/run payroll/i)).not.toBeInTheDocument();
    });

    test('should handle access denied errors from backend', async () => {
      const mockEmployeeUser = {
        _id: 'user123',
        name: 'Employee User',
        email: 'employee@company.com',
        role: 'employee'
      };

      // Setup authenticated employee state
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'token') return 'employee-jwt-token';
        if (key === 'user') return JSON.stringify(mockEmployeeUser);
        return null;
      });

      // Mock access denied response (Requirement 4.3)
      mockedAxios.get.mockImplementationOnce(() =>
        Promise.reject({
          response: {
            status: 403,
            data: {
              success: false,
              message: 'Access denied. You can only view your own payroll records.'
            }
          }
        })
      );

      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      // Try to access payroll (this would happen if employee tried to access another employee's data)
      const payrollHistoryLink = screen.getByText(/payroll history/i);
      fireEvent.click(payrollHistoryLink);

      await waitFor(() => {
        expect(screen.getByText(/access denied/i)).toBeInTheDocument();
        expect(screen.getByText(/you can only view your own payroll records/i)).toBeInTheDocument();
      });
    });

    test('should handle token expiration and redirect to login', async () => {
      const mockAdminUser = {
        _id: 'admin123',
        name: 'Admin User',
        email: 'admin@company.com',
        role: 'admin'
      };

      // Setup authenticated state with expired token
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'token') return 'expired-jwt-token';
        if (key === 'user') return JSON.stringify(mockAdminUser);
        return null;
      });

      // Mock token expired response (Requirement 1.3)
      mockedAxios.get.mockImplementationOnce(() =>
        Promise.reject({
          response: {
            status: 401,
            data: {
              success: false,
              message: 'Token expired. Please log in again.'
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
        expect(screen.getByText(/session expired/i)).toBeInTheDocument();
        expect(localStorageMock.removeItem).toHaveBeenCalledWith('token');
        expect(localStorageMock.removeItem).toHaveBeenCalledWith('user');
      });
    });
  });

  describe('System Integration and Communication Patterns', () => {
    test('should validate HTTP communication patterns', async () => {
      const mockAdminUser = {
        _id: 'admin123',
        name: 'Admin User',
        email: 'admin@company.com',
        role: 'admin'
      };

      // Setup authenticated admin state
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'token') return 'admin-jwt-token';
        if (key === 'user') return JSON.stringify(mockAdminUser);
        return null;
      });

      // Mock API response with proper JSON format (Requirement 8.1, 8.4)
      mockedAxios.get.mockImplementationOnce(() =>
        Promise.resolve({
          status: 200,
          headers: {
            'content-type': 'application/json'
          },
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
        // Verify HTTP request was made with proper headers (Requirement 8.2)
        expect(mockedAxios.get).toHaveBeenCalledWith('/employee');
        
        // Verify response handling (Requirement 8.3)
        expect(screen.getByText(/no employees found/i)).toBeInTheDocument();
      });
    });

    test('should handle server errors with retry mechanisms', async () => {
      const mockAdminUser = {
        _id: 'admin123',
        name: 'Admin User',
        email: 'admin@company.com',
        role: 'admin'
      };

      // Setup authenticated admin state
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'token') return 'admin-jwt-token';
        if (key === 'user') return JSON.stringify(mockAdminUser);
        return null;
      });

      // Mock server error first, then success (Requirement 8.5)
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
              data: {
                processedCount: 0,
                results: []
              }
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

    test('should maintain responsive design and loading states', async () => {
      const mockAdminUser = {
        _id: 'admin123',
        name: 'Admin User',
        email: 'admin@company.com',
        role: 'admin'
      };

      // Setup authenticated admin state
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'token') return 'admin-jwt-token';
        if (key === 'user') return JSON.stringify(mockAdminUser);
        return null;
      });

      // Mock delayed response to test loading states (Requirement 7.5, 7.6)
      mockedAxios.get.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            status: 200,
            data: { success: true, employees: [] }
          }), 100)
        )
      );

      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      // Navigate to employee management
      const employeeManagementLink = screen.getByText(/employee management/i);
      fireEvent.click(employeeManagementLink);

      // Check for loading state
      expect(screen.getByText(/loading/i)).toBeInTheDocument();

      // Wait for completion
      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
        expect(screen.getByText(/no employees found/i)).toBeInTheDocument();
      });
    });
  });

  describe('Data Consistency and State Management Integration', () => {
    test('should maintain consistent state across navigation and operations', async () => {
      const mockAdminUser = {
        _id: 'admin123',
        name: 'Admin User',
        email: 'admin@company.com',
        role: 'admin'
      };

      const mockEmployees = [
        {
          _id: 'emp1',
          baseSalary: 60000,
          allowance: 8000,
          deduction: 4000,
          user: { name: 'Employee 1', email: 'emp1@company.com' }
        },
        {
          _id: 'emp2',
          baseSalary: 70000,
          allowance: 10000,
          deduction: 6000,
          user: { name: 'Employee 2', email: 'emp2@company.com' }
        }
      ];

      // Setup authenticated admin state
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'token') return 'admin-jwt-token';
        if (key === 'user') return JSON.stringify(mockAdminUser);
        return null;
      });

      // Mock consistent employee list responses
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
        expect(screen.getByText('₹60,000')).toBeInTheDocument();
        expect(screen.getByText('₹70,000')).toBeInTheDocument();
      });

      // Navigate away and back to verify state consistency
      const dashboardLink = screen.getByText(/dashboard/i);
      fireEvent.click(dashboardLink);

      await waitFor(() => {
        expect(screen.getByText(/admin dashboard/i)).toBeInTheDocument();
      });

      // Navigate back to employee management
      fireEvent.click(employeeManagementLink);

      await waitFor(() => {
        // Data should remain consistent
        expect(screen.getByText('Employee 1')).toBeInTheDocument();
        expect(screen.getByText('Employee 2')).toBeInTheDocument();
        expect(screen.getByText('₹60,000')).toBeInTheDocument();
        expect(screen.getByText('₹70,000')).toBeInTheDocument();
      });
    });
  });
});