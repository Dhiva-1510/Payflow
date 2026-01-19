/**
 * Complete Dashboard Flow Integration Tests
 * Task 6.1: Write integration tests for complete dashboard flow
 * 
 * Tests complete data flow from database to UI components
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

// Mock the entire API service
jest.mock('../services/api', () => {
  const mockApi = {
    get: jest.fn()
  };
  return {
    __esModule: true,
    default: mockApi,
    withRetry: jest.fn((requestFn) => requestFn()),
    retryConfig: {
      maxRetries: 3,
      retryDelay: 1000,
      maxDelay: 10000,
      retryableStatuses: [408, 429, 500, 502, 503, 504]
    }
  };
});

// Mock the token manager
jest.mock('../utils/tokenManager', () => ({
  getUser: () => ({ 
    id: 'admin-123',
    name: 'Flow Test Admin', 
    email: 'flowtest@example.com',
    role: 'admin' 
  })
}));

// Mock react-router-dom navigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate
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

// Helper to create realistic dashboard data
const createDashboardData = (overrides = {}) => ({
  payrollTotal: {
    amount: 45000,
    employeeCount: 5,
    month: 1,
    year: 2026,
    currency: 'INR',
    ...overrides.payrollTotal
  },
  employeesPaid: {
    count: 5,
    totalEmployees: 8,
    month: 1,
    year: 2026,
    ...overrides.employeesPaid
  },
  pendingApprovals: {
    count: 3,
    types: ['payroll', 'leave'],
    ...overrides.pendingApprovals
  },
  lastUpdated: new Date().toISOString(),
  ...overrides
});

describe('Complete Dashboard Flow Integration Tests', () => {
  const mockApi = require('../services/api').default;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Default successful API response
    mockApi.get.mockResolvedValue({
      data: {
        success: true,
        data: createDashboardData()
      }
    });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Complete Data Flow - Database to UI Components', () => {
    test('should complete full data flow from API call to UI component rendering', async () => {
      const testData = createDashboardData({
        payrollTotal: { amount: 75000, employeeCount: 6 },
        employeesPaid: { count: 6, totalEmployees: 10 },
        pendingApprovals: { count: 4, types: ['payroll', 'leave', 'expense'] }
      });

      mockApi.get.mockResolvedValue({
        data: { success: true, data: testData }
      });

      renderWithProviders(<DashboardPage />);

      // Verify initial page structure
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Welcome back, Flow Test Admin')).toBeInTheDocument();

      // Wait for API call and data loading
      await waitFor(() => {
        expect(mockApi.get).toHaveBeenCalledWith('/dashboard/metrics', expect.any(Object));
      });

      // Verify complete data flow to UI components
      await waitFor(() => {
        // Check PayrollCard displays correct data
        const payrollElements = screen.getAllByText(/75,000/);
        expect(payrollElements.length).toBeGreaterThan(0);
        
        // Check EmployeeCard displays correct data
        expect(screen.getByText(/6.*employees/i)).toBeInTheDocument();
        
        // Check PendingCard displays correct data
        expect(screen.getByText(/4.*pending/i)).toBeInTheDocument();
      });

      // Verify system status shows connected
      await waitFor(() => {
        expect(screen.getByText('Connected')).toBeInTheDocument();
      });
    });

    test('should handle data transformation correctly through the flow', async () => {
      const rawData = createDashboardData({
        payrollTotal: { amount: 123456.78, employeeCount: 12 },
        employeesPaid: { count: 12, totalEmployees: 15 }
      });

      mockApi.get.mockResolvedValue({
        data: { success: true, data: rawData }
      });

      renderWithProviders(<DashboardPage />);

      await waitFor(() => {
        // Verify currency formatting is applied
        expect(screen.getByText(/1,23,456/)).toBeInTheDocument();
        
        // Verify employee ratio is displayed
        expect(screen.getByText(/12.*15/)).toBeInTheDocument();
      });
    });

    test('should handle empty data correctly through the complete flow', async () => {
      const emptyData = createDashboardData({
        payrollTotal: { amount: 0, employeeCount: 0 },
        employeesPaid: { count: 0, totalEmployees: 0 },
        pendingApprovals: { count: 0, types: [] }
      });

      mockApi.get.mockResolvedValue({
        data: { success: true, data: emptyData }
      });

      renderWithProviders(<DashboardPage />);

      await waitFor(() => {
        // Verify zero states are handled properly
        expect(screen.getByText(/₹0/)).toBeInTheDocument();
        expect(screen.getByText(/0.*employees/i)).toBeInTheDocument();
        expect(screen.getByText(/0.*pending/i)).toBeInTheDocument();
      });
    });

    test('should handle partial data scenarios in the complete flow', async () => {
      const partialData = createDashboardData({
        payrollTotal: { amount: 25000, employeeCount: 3 },
        employeesPaid: { count: 3, totalEmployees: 12 }, // Only 3 out of 12 paid
        pendingApprovals: { count: 8, types: ['payroll', 'leave', 'expense', 'overtime'] }
      });

      mockApi.get.mockResolvedValue({
        data: { success: true, data: partialData }
      });

      renderWithProviders(<DashboardPage />);

      await waitFor(() => {
        // Verify partial payment scenario is displayed correctly
        expect(screen.getByText(/25,000/)).toBeInTheDocument();
        expect(screen.getByText(/3.*12/)).toBeInTheDocument(); // 3 out of 12 employees
        expect(screen.getByText(/8.*pending/i)).toBeInTheDocument();
      });
    });
  });

  describe('Real-time Updates and Polling (Requirements 4.2, 4.3)', () => {
    test('should start automatic polling after initial load', async () => {
      renderWithProviders(<DashboardPage />);

      // Wait for initial load
      await waitFor(() => {
        expect(mockApi.get).toHaveBeenCalledTimes(1);
      });

      // Clear mock and advance timer to trigger 30-second polling
      mockApi.get.mockClear();
      
      act(() => {
        jest.advanceTimersByTime(31000); // 31 seconds
      });

      await waitFor(() => {
        expect(mockApi.get).toHaveBeenCalledTimes(1);
        expect(mockApi.get).toHaveBeenCalledWith('/dashboard/metrics', expect.any(Object));
      });

      // Verify polling indicator is active
      expect(screen.getByText('Live Updates')).toBeInTheDocument();
    });

    test('should update UI components when polling returns new data', async () => {
      // Initial data
      const initialData = createDashboardData({
        payrollTotal: { amount: 30000, employeeCount: 4 }
      });

      // Updated data after polling
      const updatedData = createDashboardData({
        payrollTotal: { amount: 45000, employeeCount: 6 }
      });

      mockApi.get
        .mockResolvedValueOnce({ data: { success: true, data: initialData } })
        .mockResolvedValueOnce({ data: { success: true, data: updatedData } });

      renderWithProviders(<DashboardPage />);

      // Wait for initial data
      await waitFor(() => {
        expect(screen.getByText(/30,000/)).toBeInTheDocument();
      });

      // Trigger polling
      act(() => {
        jest.advanceTimersByTime(31000);
      });

      // Wait for updated data
      await waitFor(() => {
        expect(screen.getByText(/45,000/)).toBeInTheDocument();
        expect(screen.getByText(/6.*employees/i)).toBeInTheDocument();
      });
    });

    test('should handle multiple consecutive polling updates', async () => {
      const dataSequence = [
        createDashboardData({ payrollTotal: { amount: 10000, employeeCount: 2 } }),
        createDashboardData({ payrollTotal: { amount: 20000, employeeCount: 3 } }),
        createDashboardData({ payrollTotal: { amount: 30000, employeeCount: 4 } })
      ];

      mockApi.get
        .mockResolvedValueOnce({ data: { success: true, data: dataSequence[0] } })
        .mockResolvedValueOnce({ data: { success: true, data: dataSequence[1] } })
        .mockResolvedValueOnce({ data: { success: true, data: dataSequence[2] } });

      renderWithProviders(<DashboardPage />);

      // Initial load
      await waitFor(() => {
        expect(screen.getByText(/10,000/)).toBeInTheDocument();
      });

      // First polling update
      act(() => {
        jest.advanceTimersByTime(31000);
      });

      await waitFor(() => {
        expect(screen.getByText(/20,000/)).toBeInTheDocument();
      });

      // Second polling update
      act(() => {
        jest.advanceTimersByTime(31000);
      });

      await waitFor(() => {
        expect(screen.getByText(/30,000/)).toBeInTheDocument();
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

    test('should handle polling errors gracefully without disrupting UI', async () => {
      // Initial successful load
      mockApi.get.mockResolvedValueOnce({
        data: { success: true, data: createDashboardData() }
      });

      renderWithProviders(<DashboardPage />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText(/45,000/)).toBeInTheDocument();
        expect(screen.getByText('Connected')).toBeInTheDocument();
      });

      // Mock polling failure
      mockApi.get.mockRejectedValueOnce(new Error('Network timeout'));

      // Trigger polling
      act(() => {
        jest.advanceTimersByTime(31000);
      });

      // UI should still show previous data and update connection status
      await waitFor(() => {
        expect(screen.getByText(/45,000/)).toBeInTheDocument(); // Previous data preserved
        expect(screen.getByText('Disconnected')).toBeInTheDocument();
      });
    });
  });

  describe('User Interactions and Navigation', () => {
    test('should handle manual refresh interaction', async () => {
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

    test('should handle pending card click navigation', async () => {
      renderWithProviders(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText(/pending/i)).toBeInTheDocument();
      });

      // Find and click the pending card
      const pendingCard = screen.getByText(/3.*pending/i).closest('div');
      fireEvent.click(pendingCard);

      expect(mockNavigate).toHaveBeenCalledWith('/admin/payroll');
    });

    test('should handle quick action navigation', async () => {
      renderWithProviders(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Add New Employee')).toBeInTheDocument();
      });

      // Click add employee quick action
      fireEvent.click(screen.getByText('Add New Employee'));
      expect(mockNavigate).toHaveBeenCalledWith('/admin/employees');

      // Click run payroll quick action
      fireEvent.click(screen.getByText('Run Payroll'));
      expect(mockNavigate).toHaveBeenCalledWith('/admin/payroll');
    });

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

      // Component should remain stable
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Welcome back, Flow Test Admin')).toBeInTheDocument();
    });
  });

  describe('Error Handling and Recovery Flow', () => {
    test('should handle initial load failure with retry mechanism', async () => {
      mockApi.get.mockRejectedValue(new Error('Initial load failed'));

      renderWithProviders(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText(/retry/i)).toBeInTheDocument();
      });

      // Mock successful retry
      mockApi.get.mockResolvedValue({
        data: { success: true, data: createDashboardData() }
      });

      // Click retry
      fireEvent.click(screen.getByRole('button', { name: /try again/i }));

      await waitFor(() => {
        expect(screen.getByText(/45,000/)).toBeInTheDocument();
        expect(screen.getByText('Connected')).toBeInTheDocument();
      });
    });

    test('should handle network connectivity changes in real-time', async () => {
      renderWithProviders(<DashboardPage />);

      // Wait for initial successful load
      await waitFor(() => {
        expect(screen.getByText('Connected')).toBeInTheDocument();
      });

      // Simulate network failure during polling
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
        data: { success: true, data: createDashboardData() }
      });

      // Manual refresh to test recovery
      fireEvent.click(screen.getByRole('button', { name: /refresh/i }));

      // Should show connected status again
      await waitFor(() => {
        expect(screen.getByText('Connected')).toBeInTheDocument();
      });
    });

    test('should maintain data integrity during error recovery', async () => {
      const initialData = createDashboardData({
        payrollTotal: { amount: 50000, employeeCount: 5 }
      });

      // Initial successful load
      mockApi.get.mockResolvedValueOnce({
        data: { success: true, data: initialData }
      });

      renderWithProviders(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText(/50,000/)).toBeInTheDocument();
      });

      // Simulate polling failure
      mockApi.get.mockRejectedValueOnce(new Error('Polling failed'));

      act(() => {
        jest.advanceTimersByTime(31000);
      });

      // Data should be preserved during error
      expect(screen.getByText(/50,000/)).toBeInTheDocument();

      // Simulate recovery with new data
      const recoveryData = createDashboardData({
        payrollTotal: { amount: 60000, employeeCount: 6 }
      });

      mockApi.get.mockResolvedValue({
        data: { success: true, data: recoveryData }
      });

      // Trigger recovery
      fireEvent.click(screen.getByRole('button', { name: /refresh/i }));

      await waitFor(() => {
        expect(screen.getByText(/60,000/)).toBeInTheDocument();
      });
    });
  });

  describe('Performance and Resource Management', () => {
    test('should cleanup resources on component unmount', async () => {
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

    test('should handle large datasets efficiently in the complete flow', async () => {
      const largeData = createDashboardData({
        payrollTotal: { amount: 5000000, employeeCount: 1000 },
        employeesPaid: { count: 1000, totalEmployees: 1200 },
        pendingApprovals: { count: 150, types: Array(50).fill().map((_, i) => `type-${i}`) }
      });

      mockApi.get.mockResolvedValue({
        data: { success: true, data: largeData }
      });

      const startTime = Date.now();
      renderWithProviders(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText(/50,00,000/)).toBeInTheDocument(); // Indian number format
        expect(screen.getByText(/1000.*employees/i)).toBeInTheDocument();
        expect(screen.getByText(/150.*pending/i)).toBeInTheDocument();
      });

      const endTime = Date.now();
      
      // Should render efficiently even with large data
      expect(endTime - startTime).toBeLessThan(2000);
    });

    test('should handle concurrent polling and user interactions', async () => {
      renderWithProviders(<DashboardPage />);

      // Wait for initial load
      await waitFor(() => {
        expect(mockApi.get).toHaveBeenCalledTimes(1);
      });

      // Start polling
      act(() => {
        jest.advanceTimersByTime(31000);
      });

      // Simultaneously trigger manual refresh
      fireEvent.click(screen.getByRole('button', { name: /refresh/i }));

      // Should handle concurrent requests gracefully
      await waitFor(() => {
        expect(mockApi.get).toHaveBeenCalledTimes(3); // Initial + polling + manual
      });

      // UI should remain stable
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });
  });

  describe('Data Consistency and State Management', () => {
    test('should maintain consistent state across multiple updates', async () => {
      const dataSequence = [
        createDashboardData({ payrollTotal: { amount: 10000 } }),
        createDashboardData({ payrollTotal: { amount: 20000 } }),
        createDashboardData({ payrollTotal: { amount: 15000 } }) // Decrease
      ];

      mockApi.get
        .mockResolvedValueOnce({ data: { success: true, data: dataSequence[0] } })
        .mockResolvedValueOnce({ data: { success: true, data: dataSequence[1] } })
        .mockResolvedValueOnce({ data: { success: true, data: dataSequence[2] } });

      renderWithProviders(<DashboardPage />);

      // Track state changes
      await waitFor(() => {
        expect(screen.getByText(/10,000/)).toBeInTheDocument();
      });

      act(() => {
        jest.advanceTimersByTime(31000);
      });

      await waitFor(() => {
        expect(screen.getByText(/20,000/)).toBeInTheDocument();
      });

      act(() => {
        jest.advanceTimersByTime(31000);
      });

      await waitFor(() => {
        expect(screen.getByText(/15,000/)).toBeInTheDocument();
      });

      // Verify last updated timestamp is recent
      expect(screen.getByText(/Updated.*ago/)).toBeInTheDocument();
    });

    test('should handle timestamp updates correctly', async () => {
      const baseTime = new Date('2026-01-10T10:00:00Z');
      const updatedTime = new Date('2026-01-10T10:05:00Z');

      mockApi.get
        .mockResolvedValueOnce({
          data: { 
            success: true, 
            data: { ...createDashboardData(), lastUpdated: baseTime.toISOString() }
          }
        })
        .mockResolvedValueOnce({
          data: { 
            success: true, 
            data: { ...createDashboardData(), lastUpdated: updatedTime.toISOString() }
          }
        });

      renderWithProviders(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText(/45,000/)).toBeInTheDocument();
      });

      // Trigger update
      act(() => {
        jest.advanceTimersByTime(31000);
      });

      // Verify timestamp is updated
      await waitFor(() => {
        expect(screen.getByText(/Updated.*ago/)).toBeInTheDocument();
      });
    });
  });
});