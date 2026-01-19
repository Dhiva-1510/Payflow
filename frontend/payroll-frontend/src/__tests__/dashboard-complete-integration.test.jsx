/**
 * Complete Dashboard Integration Tests
 * 
 * Tests complete dashboard data flow from API to UI components
 * Tests real-time updates and user interactions
 * 
 * Requirements: 4.2, 4.3
 */

import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { SettingsProvider } from '../context/SettingsContext';
import { NotificationProvider } from '../context';
import DashboardPage from '../pages/DashboardPage';

// Mock the API module
jest.mock('../services/api', () => ({
  get: jest.fn()
}));

// Mock the token manager
jest.mock('../utils/tokenManager', () => ({
  getUser: () => ({ 
    id: 'admin-123',
    name: 'Integration Admin', 
    email: 'admin@example.com',
    role: 'admin' 
  })
}));

// Mock react-router-dom navigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate
}));

// Mock components to focus on integration logic
jest.mock('../components', () => ({
  MetricsGrid: ({ children, loading, error, onRetry }) => (
    <div data-testid="metrics-grid" data-loading={loading} data-error={error?.message}>
      {error && onRetry && (
        <button data-testid="metrics-retry" onClick={onRetry}>
          Retry Metrics
        </button>
      )}
      {children}
    </div>
  ),
  PayrollCard: ({ amount, employeeCount, month, year, loading, error }) => (
    <div 
      data-testid="payroll-card" 
      data-amount={amount}
      data-employee-count={employeeCount}
      data-month={month}
      data-year={year}
      data-loading={loading}
      data-error={error?.message}
    >
      Payroll: ${amount} ({employeeCount} employees) - {month}/{year}
    </div>
  ),
  EmployeeCard: ({ employeesPaid, totalEmployees, month, year, loading, error }) => (
    <div 
      data-testid="employee-card"
      data-employees-paid={employeesPaid}
      data-total-employees={totalEmployees}
      data-month={month}
      data-year={year}
      data-loading={loading}
      data-error={error?.message}
    >
      Employees: {employeesPaid}/{totalEmployees} - {month}/{year}
    </div>
  ),
  PendingCard: ({ pendingCount, approvalTypes, loading, error, onClick }) => (
    <div 
      data-testid="pending-card"
      data-pending-count={pendingCount}
      data-approval-types={approvalTypes?.join(',')}
      data-loading={loading}
      data-error={error?.message}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      Pending: {pendingCount} ({approvalTypes?.length || 0} types)
    </div>
  ),
  ErrorMessage: ({ message, type, onRetry }) => (
    <div data-testid="error-message" data-type={type}>
      {message}
      {onRetry && <button data-testid="error-retry" onClick={onRetry}>Retry</button>}
    </div>
  ),
  RetryMechanism: ({ onRetry, error, isRetryable, maxRetries, autoRetry }) => (
    <div data-testid="retry-mechanism" data-retryable={isRetryable} data-auto-retry={autoRetry}>
      Error: {error}
      {isRetryable && <button data-testid="retry-button" onClick={onRetry}>Retry ({maxRetries})</button>}
    </div>
  )
}));

const renderWithProviders = (component) => {
  return render(
    <BrowserRouter>
      <SettingsProvider>
        <NotificationProvider>
          {component}
        </NotificationProvider>
      </SettingsProvider>
    </BrowserRouter>
  );
};

// Helper to create mock dashboard data
const createMockDashboardData = (overrides = {}) => ({
  payrollTotal: {
    amount: 15000,
    employeeCount: 3,
    month: 1,
    year: 2026,
    currency: 'INR',
    ...overrides.payrollTotal
  },
  employeesPaid: {
    count: 3,
    totalEmployees: 5,
    month: 1,
    year: 2026,
    ...overrides.employeesPaid
  },
  pendingApprovals: {
    count: 2,
    types: ['payroll', 'leave'],
    ...overrides.pendingApprovals
  },
  lastUpdated: new Date().toISOString(),
  ...overrides
});

describe('Complete Dashboard Integration Tests', () => {
  const mockApi = require('../services/api');

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Default successful API response
    mockApi.get.mockResolvedValue({
      data: {
        success: true,
        data: createMockDashboardData()
      }
    });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Complete Data Flow - API to UI', () => {
    test('should load dashboard data and display in UI components correctly', async () => {
      const mockData = createMockDashboardData({
        payrollTotal: { amount: 25000, employeeCount: 4 },
        employeesPaid: { count: 4, totalEmployees: 6 }
      });

      mockApi.get.mockResolvedValue({
        data: { success: true, data: mockData }
      });

      renderWithProviders(<DashboardPage />);

      // Verify initial loading state
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Welcome back, Integration Admin')).toBeInTheDocument();

      // Wait for data to load and verify API call
      await waitFor(() => {
        expect(mockApi.get).toHaveBeenCalledWith('/dashboard/metrics', expect.any(Object));
      });

      // Verify data is displayed correctly in UI components
      await waitFor(() => {
        const payrollCard = screen.getByTestId('payroll-card');
        expect(payrollCard).toHaveAttribute('data-amount', '25000');
        expect(payrollCard).toHaveAttribute('data-employee-count', '4');
        expect(payrollCard).toHaveAttribute('data-month', '1');
        expect(payrollCard).toHaveAttribute('data-year', '2026');

        const employeeCard = screen.getByTestId('employee-card');
        expect(employeeCard).toHaveAttribute('data-employees-paid', '4');
        expect(employeeCard).toHaveAttribute('data-total-employees', '6');

        const pendingCard = screen.getByTestId('pending-card');
        expect(pendingCard).toHaveAttribute('data-pending-count', '2');
        expect(pendingCard).toHaveAttribute('data-approval-types', 'payroll,leave');
      });
    });

    test('should handle empty dashboard data correctly', async () => {
      const emptyData = createMockDashboardData({
        payrollTotal: { amount: 0, employeeCount: 0 },
        employeesPaid: { count: 0, totalEmployees: 0 },
        pendingApprovals: { count: 0, types: [] }
      });

      mockApi.get.mockResolvedValue({
        data: { success: true, data: emptyData }
      });

      renderWithProviders(<DashboardPage />);

      await waitFor(() => {
        const payrollCard = screen.getByTestId('payroll-card');
        expect(payrollCard).toHaveAttribute('data-amount', '0');
        expect(payrollCard).toHaveAttribute('data-employee-count', '0');

        const employeeCard = screen.getByTestId('employee-card');
        expect(employeeCard).toHaveAttribute('data-employees-paid', '0');
        expect(employeeCard).toHaveAttribute('data-total-employees', '0');

        const pendingCard = screen.getByTestId('pending-card');
        expect(pendingCard).toHaveAttribute('data-pending-count', '0');
        expect(pendingCard).toHaveAttribute('data-approval-types', '');
      });
    });

    test('should handle partial data correctly', async () => {
      const partialData = createMockDashboardData({
        payrollTotal: { amount: 12000, employeeCount: 2 },
        employeesPaid: { count: 2, totalEmployees: 8 }, // Only 2 out of 8 employees paid
        pendingApprovals: { count: 5, types: ['payroll', 'leave', 'expense'] }
      });

      mockApi.get.mockResolvedValue({
        data: { success: true, data: partialData }
      });

      renderWithProviders(<DashboardPage />);

      await waitFor(() => {
        const employeeCard = screen.getByTestId('employee-card');
        expect(employeeCard).toHaveAttribute('data-employees-paid', '2');
        expect(employeeCard).toHaveAttribute('data-total-employees', '8');
        expect(employeeCard).toHaveTextContent('Employees: 2/8');

        const pendingCard = screen.getByTestId('pending-card');
        expect(pendingCard).toHaveAttribute('data-pending-count', '5');
        expect(pendingCard).toHaveAttribute('data-approval-types', 'payroll,leave,expense');
      });
    });
  });

  describe('Real-time Updates and Polling', () => {
    test('should start automatic polling after initial load', async () => {
      renderWithProviders(<DashboardPage />);

      // Wait for initial load
      await waitFor(() => {
        expect(mockApi.get).toHaveBeenCalledTimes(1);
      });

      // Clear mock and advance timer to trigger polling
      mockApi.get.mockClear();
      
      act(() => {
        jest.advanceTimersByTime(31000); // 31 seconds to trigger 30-second polling
      });

      await waitFor(() => {
        expect(mockApi.get).toHaveBeenCalledTimes(1);
        expect(mockApi.get).toHaveBeenCalledWith('/dashboard/metrics', expect.any(Object));
      });
    });

    test('should update UI when polling returns new data', async () => {
      // Initial data
      const initialData = createMockDashboardData({
        payrollTotal: { amount: 10000, employeeCount: 2 }
      });

      // Updated data after polling
      const updatedData = createMockDashboardData({
        payrollTotal: { amount: 15000, employeeCount: 3 }
      });

      mockApi.get
        .mockResolvedValueOnce({ data: { success: true, data: initialData } })
        .mockResolvedValueOnce({ data: { success: true, data: updatedData } });

      renderWithProviders(<DashboardPage />);

      // Wait for initial data
      await waitFor(() => {
        const payrollCard = screen.getByTestId('payroll-card');
        expect(payrollCard).toHaveAttribute('data-amount', '10000');
        expect(payrollCard).toHaveAttribute('data-employee-count', '2');
      });

      // Trigger polling
      act(() => {
        jest.advanceTimersByTime(31000);
      });

      // Wait for updated data
      await waitFor(() => {
        const payrollCard = screen.getByTestId('payroll-card');
        expect(payrollCard).toHaveAttribute('data-amount', '15000');
        expect(payrollCard).toHaveAttribute('data-employee-count', '3');
      });
    });

    test('should handle polling errors gracefully without disrupting UI', async () => {
      // Initial successful load
      mockApi.get.mockResolvedValueOnce({
        data: { success: true, data: createMockDashboardData() }
      });

      renderWithProviders(<DashboardPage />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByTestId('payroll-card')).toHaveAttribute('data-amount', '15000');
      });

      // Mock polling failure
      mockApi.get.mockRejectedValueOnce(new Error('Network error'));

      // Trigger polling
      act(() => {
        jest.advanceTimersByTime(31000);
      });

      // UI should still show previous data, not error state
      await waitFor(() => {
        expect(screen.getByTestId('payroll-card')).toHaveAttribute('data-amount', '15000');
        expect(screen.queryByTestId('error-message')).not.toBeInTheDocument();
      });
    });

    test('should pause polling when page is hidden and resume when visible', async () => {
      renderWithProviders(<DashboardPage />);

      // Wait for initial load
      await waitFor(() => {
        expect(mockApi.get).toHaveBeenCalledTimes(1);
      });

      mockApi.get.mockClear();

      // Simulate page becoming hidden
      Object.defineProperty(document, 'hidden', {
        writable: true,
        value: true
      });

      act(() => {
        document.dispatchEvent(new Event('visibilitychange'));
      });

      // Advance timer - should not trigger polling when hidden
      act(() => {
        jest.advanceTimersByTime(31000);
      });

      expect(mockApi.get).not.toHaveBeenCalled();

      // Simulate page becoming visible again
      Object.defineProperty(document, 'hidden', {
        writable: true,
        value: false
      });

      act(() => {
        document.dispatchEvent(new Event('visibilitychange'));
      });

      // Should trigger immediate refresh and resume polling
      await waitFor(() => {
        expect(mockApi.get).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('User Interactions', () => {
    test('should handle manual refresh button click', async () => {
      renderWithProviders(<DashboardPage />);

      // Wait for initial load
      await waitFor(() => {
        expect(mockApi.get).toHaveBeenCalledTimes(1);
      });

      mockApi.get.mockClear();

      // Click refresh button
      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(mockApi.get).toHaveBeenCalledTimes(1);
        expect(mockApi.get).toHaveBeenCalledWith('/dashboard/metrics', expect.any(Object));
      });
    });

    test('should navigate to payroll page when pending card is clicked', async () => {
      renderWithProviders(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByTestId('pending-card')).toBeInTheDocument();
      });

      // Click pending card
      fireEvent.click(screen.getByTestId('pending-card'));

      expect(mockNavigate).toHaveBeenCalledWith('/admin/payroll');
    });

    test('should navigate to employees page when quick action is clicked', async () => {
      renderWithProviders(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Add New Employee')).toBeInTheDocument();
      });

      // Click add employee button
      fireEvent.click(screen.getByText('Add New Employee'));

      expect(mockNavigate).toHaveBeenCalledWith('/admin/employees');
    });

    test('should navigate to payroll page when run payroll quick action is clicked', async () => {
      renderWithProviders(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Run Payroll')).toBeInTheDocument();
      });

      // Click run payroll button
      fireEvent.click(screen.getByText('Run Payroll'));

      expect(mockNavigate).toHaveBeenCalledWith('/admin/payroll');
    });
  });

  describe('Error Handling and Recovery', () => {
    test('should display error message when initial load fails', async () => {
      mockApi.get.mockRejectedValue(new Error('API Error'));

      renderWithProviders(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByTestId('retry-mechanism')).toBeInTheDocument();
      });
    });

    test('should retry when retry button is clicked', async () => {
      // First call fails, second succeeds
      mockApi.get
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          data: { success: true, data: createMockDashboardData() }
        });

      renderWithProviders(<DashboardPage />);

      // Wait for error state
      await waitFor(() => {
        expect(screen.getByTestId('retry-mechanism')).toBeInTheDocument();
      });

      // Click retry button
      fireEvent.click(screen.getByTestId('retry-button'));

      // Wait for successful retry
      await waitFor(() => {
        expect(screen.getByTestId('payroll-card')).toHaveAttribute('data-amount', '15000');
        expect(screen.queryByTestId('retry-mechanism')).not.toBeInTheDocument();
      });

      expect(mockApi.get).toHaveBeenCalledTimes(2);
    });

    test('should show loading state during refresh', async () => {
      renderWithProviders(<DashboardPage />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByTestId('payroll-card')).toBeInTheDocument();
      });

      // Mock slow API response
      mockApi.get.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            data: { success: true, data: createMockDashboardData() }
          }), 1000)
        )
      );

      // Click refresh
      fireEvent.click(screen.getByRole('button', { name: /refresh/i }));

      // Should show loading state
      expect(screen.getByRole('button', { name: /refresh/i })).toBeDisabled();
    });

    test('should handle network connectivity changes', async () => {
      renderWithProviders(<DashboardPage />);

      // Wait for initial successful load
      await waitFor(() => {
        expect(screen.getByText('Connected')).toBeInTheDocument();
      });

      // Simulate network failure
      mockApi.get.mockRejectedValue(new Error('Network error'));

      // Trigger polling
      act(() => {
        jest.advanceTimersByTime(31000);
      });

      // Should show disconnected status
      await waitFor(() => {
        expect(screen.getByText('Disconnected')).toBeInTheDocument();
      });

      // Simulate network recovery
      mockApi.get.mockResolvedValue({
        data: { success: true, data: createMockDashboardData() }
      });

      // Click retry
      fireEvent.click(screen.getByRole('button', { name: /refresh/i }));

      // Should show connected status again
      await waitFor(() => {
        expect(screen.getByText('Connected')).toBeInTheDocument();
      });
    });
  });

  describe('Performance and Responsiveness', () => {
    test('should handle rapid user interactions without breaking', async () => {
      renderWithProviders(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
      });

      const refreshButton = screen.getByRole('button', { name: /refresh/i });

      // Rapidly click refresh button multiple times
      for (let i = 0; i < 5; i++) {
        fireEvent.click(refreshButton);
      }

      // Should not break the component
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByTestId('metrics-grid')).toBeInTheDocument();
    });

    test('should cleanup resources on unmount', async () => {
      const { unmount } = renderWithProviders(<DashboardPage />);

      // Wait for initial load and polling to start
      await waitFor(() => {
        expect(mockApi.get).toHaveBeenCalledTimes(1);
      });

      // Unmount component
      unmount();

      // Clear mock and advance timer
      mockApi.get.mockClear();
      act(() => {
        jest.advanceTimersByTime(31000);
      });

      // Should not make any more API calls after unmount
      expect(mockApi.get).not.toHaveBeenCalled();
    });

    test('should handle large datasets efficiently', async () => {
      const largeData = createMockDashboardData({
        payrollTotal: { amount: 1000000, employeeCount: 500 },
        employeesPaid: { count: 500, totalEmployees: 1000 },
        pendingApprovals: { count: 50, types: Array(20).fill().map((_, i) => `type-${i}`) }
      });

      mockApi.get.mockResolvedValue({
        data: { success: true, data: largeData }
      });

      const startTime = Date.now();
      renderWithProviders(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByTestId('payroll-card')).toHaveAttribute('data-amount', '1000000');
        expect(screen.getByTestId('employee-card')).toHaveAttribute('data-employees-paid', '500');
        expect(screen.getByTestId('pending-card')).toHaveAttribute('data-pending-count', '50');
      });

      const endTime = Date.now();
      
      // Should render efficiently even with large data
      expect(endTime - startTime).toBeLessThan(1000);
    });
  });
});