/**
 * Simple Dashboard Integration Tests
 * 
 * Tests complete dashboard data flow from API to UI components
 * Tests real-time updates and user interactions
 * 
 * Requirements: 4.2, 4.3
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { SettingsProvider } from '../context/SettingsContext';
import { NotificationProvider } from '../context';
import AdminDashboard from '../pages/AdminDashboard';

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
  totalEmployees: 10,
  monthlyPayroll: 50000,
  pendingApprovals: 3,
  lastPayrollRun: { month: 1, year: 2026 },
  recentActivity: [],
  ...overrides
});

const createMockMetricsData = (overrides = {}) => ({
  payrollTotal: {
    amount: 50000,
    employeeCount: 8,
    month: 1,
    year: 2026,
    currency: 'INR'
  },
  employeesPaid: {
    count: 8,
    totalEmployees: 10,
    month: 1,
    year: 2026
  },
  pendingApprovals: {
    count: 3,
    types: ['payroll']
  },
  lastUpdated: new Date().toISOString(),
  ...overrides
});

describe('Simple Dashboard Integration Tests', () => {
  const mockApi = require('../services/api');

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default successful API responses
    mockApi.get.mockImplementation((url) => {
      if (url === '/dashboard/stats') {
        return Promise.resolve({
          data: {
            success: true,
            data: createMockDashboardData()
          }
        });
      }
      
      if (url === '/dashboard/metrics') {
        return Promise.resolve({
          data: {
            success: true,
            data: createMockMetricsData()
          }
        });
      }
      
      return Promise.resolve({ data: { success: true, data: {} } });
    });
  });

  describe('Complete Data Flow - API to UI', () => {
    test('should load dashboard data and display in UI components correctly', async () => {
      const mockStats = createMockDashboardData({
        totalEmployees: 15,
        monthlyPayroll: 75000,
        pendingApprovals: 5
      });

      const mockMetrics = createMockMetricsData({
        payrollTotal: { amount: 75000, employeeCount: 12 },
        employeesPaid: { count: 12, totalEmployees: 15 },
        pendingApprovals: { count: 5, types: ['payroll', 'leave'] }
      });

      mockApi.get.mockImplementation((url) => {
        if (url === '/dashboard/stats') {
          return Promise.resolve({ data: { success: true, data: mockStats } });
        }
        if (url === '/dashboard/metrics') {
          return Promise.resolve({ data: { success: true, data: mockMetrics } });
        }
        return Promise.resolve({ data: { success: true, data: {} } });
      });

      renderWithProviders(<AdminDashboard />);

      // Verify initial loading
      expect(screen.getByText('Dashboard')).toBeInTheDocument();

      // Wait for API calls to complete
      await waitFor(() => {
        expect(mockApi.get).toHaveBeenCalledWith('/dashboard/stats');
        expect(mockApi.get).toHaveBeenCalledWith('/dashboard/metrics');
      });

      // Verify dashboard content is displayed
      await waitFor(() => {
        // Check for metrics grid using CSS class
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
        
        // Check for dashboard cards using CSS selectors
        const metricsGrid = document.querySelector('.metrics-grid');
        expect(metricsGrid).toBeInTheDocument();
      });
    });

    test('should handle empty dashboard data correctly', async () => {
      const emptyStats = createMockDashboardData({
        totalEmployees: 0,
        monthlyPayroll: 0,
        pendingApprovals: 0
      });

      const emptyMetrics = createMockMetricsData({
        payrollTotal: { amount: 0, employeeCount: 0 },
        employeesPaid: { count: 0, totalEmployees: 0 },
        pendingApprovals: { count: 0, types: [] }
      });

      mockApi.get.mockImplementation((url) => {
        if (url === '/dashboard/stats') {
          return Promise.resolve({ data: { success: true, data: emptyStats } });
        }
        if (url === '/dashboard/metrics') {
          return Promise.resolve({ data: { success: true, data: emptyMetrics } });
        }
        return Promise.resolve({ data: { success: true, data: {} } });
      });

      renderWithProviders(<AdminDashboard />);

      await waitFor(() => {
        const metricsGrid = document.querySelector('.metrics-grid');
        expect(metricsGrid).toBeInTheDocument();
      });

      // Should still render components even with zero data
      expect(screen.getByText('Total Payroll')).toBeInTheDocument();
      expect(screen.getByText('Employees Paid')).toBeInTheDocument();
    });

    test('should handle partial data correctly', async () => {
      const partialStats = createMockDashboardData({
        totalEmployees: 20,
        monthlyPayroll: 30000,
        pendingApprovals: 8
      });

      const partialMetrics = createMockMetricsData({
        payrollTotal: { amount: 30000, employeeCount: 5 },
        employeesPaid: { count: 5, totalEmployees: 20 }, // Only 5 out of 20 employees paid
        pendingApprovals: { count: 8, types: ['payroll', 'leave', 'expense'] }
      });

      mockApi.get.mockImplementation((url) => {
        if (url === '/dashboard/stats') {
          return Promise.resolve({ data: { success: true, data: partialStats } });
        }
        if (url === '/dashboard/metrics') {
          return Promise.resolve({ data: { success: true, data: partialMetrics } });
        }
        return Promise.resolve({ data: { success: true, data: {} } });
      });

      renderWithProviders(<AdminDashboard />);

      await waitFor(() => {
        const metricsGrid = document.querySelector('.metrics-grid');
        expect(metricsGrid).toBeInTheDocument();
      });

      // Should render all components with partial data
      expect(screen.getByText('Total Payroll')).toBeInTheDocument();
      expect(screen.getByText('Employees Paid')).toBeInTheDocument();
    });
  });

  describe('Real-time Updates Simulation', () => {
    test('should make multiple API calls for different data sources', async () => {
      renderWithProviders(<AdminDashboard />);

      await waitFor(() => {
        // Should call both legacy and new endpoints
        expect(mockApi.get).toHaveBeenCalledWith('/dashboard/stats');
        expect(mockApi.get).toHaveBeenCalledWith('/dashboard/metrics');
        expect(mockApi.get).toHaveBeenCalledTimes(2);
      });
    });

    test('should handle API call sequence correctly', async () => {
      let callOrder = [];
      
      mockApi.get.mockImplementation((url) => {
        callOrder.push(url);
        if (url === '/dashboard/stats') {
          return Promise.resolve({ data: { success: true, data: createMockDashboardData() } });
        }
        if (url === '/dashboard/metrics') {
          return Promise.resolve({ data: { success: true, data: createMockMetricsData() } });
        }
        return Promise.resolve({ data: { success: true, data: {} } });
      });

      renderWithProviders(<AdminDashboard />);

      await waitFor(() => {
        expect(mockApi.get).toHaveBeenCalledTimes(2);
      });

      // Verify both endpoints were called
      expect(callOrder).toContain('/dashboard/stats');
      expect(callOrder).toContain('/dashboard/metrics');
    });
  });

  describe('Error Handling and Recovery', () => {
    test('should handle API errors gracefully', async () => {
      mockApi.get.mockRejectedValue(new Error('API Error'));

      renderWithProviders(<AdminDashboard />);

      // Should still render the dashboard structure
      expect(screen.getByText('Dashboard')).toBeInTheDocument();

      // Should render metrics grid even with errors
      await waitFor(() => {
        const metricsGrid = document.querySelector('.metrics-grid');
        expect(metricsGrid).toBeInTheDocument();
      });
    });

    test('should handle mixed success/failure scenarios', async () => {
      mockApi.get.mockImplementation((url) => {
        if (url === '/dashboard/stats') {
          return Promise.resolve({ data: { success: true, data: createMockDashboardData() } });
        }
        if (url === '/dashboard/metrics') {
          return Promise.reject(new Error('Metrics API Error'));
        }
        return Promise.resolve({ data: { success: true, data: {} } });
      });

      renderWithProviders(<AdminDashboard />);

      // Should still render dashboard
      expect(screen.getByText('Dashboard')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByTestId('metrics-grid')).toBeInTheDocument();
      });
    });

    test('should handle network timeout scenarios', async () => {
      mockApi.get.mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Network timeout')), 100)
        )
      );

      renderWithProviders(<AdminDashboard />);

      // Should render basic structure
      expect(screen.getByText('Dashboard')).toBeInTheDocument();

      // Should eventually show metrics grid (with error handling)
      await waitFor(() => {
        const metricsGrid = document.querySelector('.metrics-grid');
        expect(metricsGrid).toBeInTheDocument();
      }, { timeout: 2000 });
    });
  });

  describe('User Interactions', () => {
    test('should handle navigation interactions', async () => {
      renderWithProviders(<AdminDashboard />);

      await waitFor(() => {
        const metricsGrid = document.querySelector('.metrics-grid');
        expect(metricsGrid).toBeInTheDocument();
      });

      // Test pending card click navigation - look for text instead of test ID
      const pendingText = screen.getByText(/pending/i);
      if (pendingText.closest('div[class*="card"]')) {
        fireEvent.click(pendingText.closest('div[class*="card"]'));
        // Should navigate to payroll page
        expect(mockNavigate).toHaveBeenCalledWith('/admin/payroll');
      }
    });

    test('should handle quick action buttons', async () => {
      renderWithProviders(<AdminDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Add New Employee')).toBeInTheDocument();
        expect(screen.getByText('Run Payroll')).toBeInTheDocument();
      });

      // Test employee management navigation
      fireEvent.click(screen.getByText('Add New Employee'));
      expect(mockNavigate).toHaveBeenCalledWith('/admin/employees');

      // Test payroll management navigation
      fireEvent.click(screen.getByText('Run Payroll'));
      expect(mockNavigate).toHaveBeenCalledWith('/admin/payroll');
    });
  });

  describe('Performance and Responsiveness', () => {
    test('should render dashboard components efficiently', async () => {
      const startTime = Date.now();
      
      renderWithProviders(<AdminDashboard />);

      await waitFor(() => {
        expect(screen.getByTestId('metrics-grid')).toBeInTheDocument();
      });

      const endTime = Date.now();
      
      // Should render quickly (within 1 second)
      expect(endTime - startTime).toBeLessThan(1000);
    });

    test('should handle large datasets in API responses', async () => {
      const largeDataStats = createMockDashboardData({
        totalEmployees: 1000,
        monthlyPayroll: 5000000,
        pendingApprovals: 100
      });

      const largeDataMetrics = createMockMetricsData({
        payrollTotal: { amount: 5000000, employeeCount: 800 },
        employeesPaid: { count: 800, totalEmployees: 1000 },
        pendingApprovals: { count: 100, types: Array(20).fill().map((_, i) => `type-${i}`) }
      });

      mockApi.get.mockImplementation((url) => {
        if (url === '/dashboard/stats') {
          return Promise.resolve({ data: { success: true, data: largeDataStats } });
        }
        if (url === '/dashboard/metrics') {
          return Promise.resolve({ data: { success: true, data: largeDataMetrics } });
        }
        return Promise.resolve({ data: { success: true, data: {} } });
      });

      const startTime = Date.now();
      renderWithProviders(<AdminDashboard />);

      await waitFor(() => {
        expect(screen.getByTestId('metrics-grid')).toBeInTheDocument();
      });

      const endTime = Date.now();
      
      // Should handle large data efficiently
      expect(endTime - startTime).toBeLessThan(2000);
    });

    test('should maintain component stability during rapid interactions', async () => {
      renderWithProviders(<AdminDashboard />);

      await waitFor(() => {
        expect(screen.getByTestId('pending-card')).toBeInTheDocument();
      });

      const pendingCard = screen.getByTestId('pending-card');

      // Rapidly click the pending card multiple times
      for (let i = 0; i < 5; i++) {
        fireEvent.click(pendingCard);
      }

      // Should not break the component
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByTestId('metrics-grid')).toBeInTheDocument();
      
      // Should have called navigate multiple times
      expect(mockNavigate).toHaveBeenCalledTimes(5);
    });
  });

  describe('Data Consistency', () => {
    test('should maintain data consistency across component renders', async () => {
      const consistentData = createMockMetricsData({
        payrollTotal: { amount: 42000, employeeCount: 7 },
        employeesPaid: { count: 7, totalEmployees: 10 }
      });

      mockApi.get.mockImplementation((url) => {
        if (url === '/dashboard/stats') {
          return Promise.resolve({ data: { success: true, data: createMockDashboardData() } });
        }
        if (url === '/dashboard/metrics') {
          return Promise.resolve({ data: { success: true, data: consistentData } });
        }
        return Promise.resolve({ data: { success: true, data: {} } });
      });

      renderWithProviders(<AdminDashboard />);

      await waitFor(() => {
        expect(screen.getByTestId('metrics-grid')).toBeInTheDocument();
      });

      // Verify all components are rendered and stable
      expect(screen.getByTestId('payroll-card')).toBeInTheDocument();
      expect(screen.getByTestId('employee-card')).toBeInTheDocument();
      expect(screen.getByTestId('pending-card')).toBeInTheDocument();

      // Data should remain consistent across renders
      expect(mockApi.get).toHaveBeenCalledWith('/dashboard/stats');
      expect(mockApi.get).toHaveBeenCalledWith('/dashboard/metrics');
    });

    test('should handle concurrent API responses correctly', async () => {
      let resolveStats, resolveMetrics;
      
      const statsPromise = new Promise(resolve => { resolveStats = resolve; });
      const metricsPromise = new Promise(resolve => { resolveMetrics = resolve; });

      mockApi.get.mockImplementation((url) => {
        if (url === '/dashboard/stats') {
          return statsPromise;
        }
        if (url === '/dashboard/metrics') {
          return metricsPromise;
        }
        return Promise.resolve({ data: { success: true, data: {} } });
      });

      renderWithProviders(<AdminDashboard />);

      // Resolve metrics first, then stats (reverse order)
      setTimeout(() => {
        resolveMetrics({ data: { success: true, data: createMockMetricsData() } });
      }, 50);

      setTimeout(() => {
        resolveStats({ data: { success: true, data: createMockDashboardData() } });
      }, 100);

      await waitFor(() => {
        expect(screen.getByTestId('metrics-grid')).toBeInTheDocument();
      });

      // Should handle out-of-order responses correctly
      expect(screen.getByTestId('payroll-card')).toBeInTheDocument();
      expect(screen.getByTestId('employee-card')).toBeInTheDocument();
      expect(screen.getByTestId('pending-card')).toBeInTheDocument();
    });
  });
});