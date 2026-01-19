import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { SettingsProvider } from '../../context/SettingsContext';
import { NotificationProvider } from '../../context';
import AdminDashboard from '../AdminDashboard';

// Mock the API module
jest.mock('../../services/api', () => ({
  get: jest.fn()
}));

// Mock the token manager
jest.mock('../../utils/tokenManager', () => ({
  getUser: () => ({ name: 'Test Admin', role: 'admin' })
}));

// Mock the components to avoid complex rendering issues
jest.mock('../../components', () => ({
  ErrorMessage: ({ message }) => <div data-testid="error-message">{message}</div>,
  PayrollChart: () => <div data-testid="payroll-chart">Chart</div>,
  MetricsGrid: ({ children }) => <div data-testid="metrics-grid">{children}</div>,
  PayrollCard: ({ amount }) => <div data-testid="payroll-card">Payroll: ${amount}</div>,
  EmployeeCard: ({ employeesPaid }) => <div data-testid="employee-card">Employees: {employeesPaid}</div>,
  PendingCard: ({ pendingCount }) => <div data-testid="pending-card">Pending: {pendingCount}</div>
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

describe('AdminDashboard Integration', () => {
  const mockApi = require('../../services/api');

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock successful API responses
    mockApi.get.mockImplementation((url) => {
      if (url === '/dashboard/stats') {
        return Promise.resolve({
          data: {
            data: {
              totalEmployees: 10,
              monthlyPayroll: 50000,
              pendingApprovals: 3,
              lastPayrollRun: { month: 1, year: 2026 },
              recentActivity: []
            }
          }
        });
      }
      
      if (url === '/dashboard/metrics') {
        return Promise.resolve({
          data: {
            data: {
              payrollTotal: {
                amount: 50000,
                employeeCount: 8,
                month: 1,
                year: 2026
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
              lastUpdated: new Date().toISOString()
            }
          }
        });
      }
      
      return Promise.resolve({ data: { data: {} } });
    });
  });

  test('renders dashboard with new metrics grid', async () => {
    renderWithProviders(<AdminDashboard />);
    
    // Check that the dashboard title is rendered
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    
    // Wait for the metrics grid to be rendered
    await waitFor(() => {
      expect(screen.getByTestId('metrics-grid')).toBeInTheDocument();
    });
    
    // Check that the new dashboard cards are rendered
    expect(screen.getByTestId('payroll-card')).toBeInTheDocument();
    expect(screen.getByTestId('employee-card')).toBeInTheDocument();
    expect(screen.getByTestId('pending-card')).toBeInTheDocument();
  });

  test('displays correct data in dashboard cards', async () => {
    renderWithProviders(<AdminDashboard />);
    
    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Payroll: $50000')).toBeInTheDocument();
      expect(screen.getByText('Employees: 8')).toBeInTheDocument();
      expect(screen.getByText('Pending: 3')).toBeInTheDocument();
    });
  });

  test('calls both legacy and new API endpoints', async () => {
    renderWithProviders(<AdminDashboard />);
    
    await waitFor(() => {
      expect(mockApi.get).toHaveBeenCalledWith('/dashboard/stats');
      expect(mockApi.get).toHaveBeenCalledWith('/dashboard/metrics');
    });
  });

  test('handles API errors gracefully', async () => {
    mockApi.get.mockRejectedValue(new Error('API Error'));
    
    renderWithProviders(<AdminDashboard />);
    
    // Should still render the dashboard structure
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    
    // Should render metrics grid even with errors
    await waitFor(() => {
      expect(screen.getByTestId('metrics-grid')).toBeInTheDocument();
    });
  });
});