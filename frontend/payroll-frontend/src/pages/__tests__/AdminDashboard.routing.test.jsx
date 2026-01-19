import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { SettingsProvider } from '../../context/SettingsContext';
import { NotificationProvider } from '../../context';
import AdminDashboard from '../AdminDashboard';
import ProtectedRoute from '../../components/ProtectedRoute';

// Mock the API module
jest.mock('../../services/api', () => ({
  get: jest.fn(() => Promise.resolve({ data: { data: {} } }))
}));

// Mock the token manager
jest.mock('../../utils/tokenManager', () => ({
  getUser: () => ({ name: 'Test Admin', role: 'admin' }),
  isAuthenticated: () => true,
  getUserRole: () => 'admin',
  isTokenExpired: () => false,
  getToken: () => 'mock-token'
}));

// Mock the components to avoid complex rendering issues
jest.mock('../../components', () => ({
  ...jest.requireActual('../../components'),
  ErrorMessage: ({ message }) => <div data-testid="error-message">{message}</div>,
  PayrollChart: () => <div data-testid="payroll-chart">Chart</div>,
  MetricsGrid: ({ children }) => <div data-testid="metrics-grid">{children}</div>,
  PayrollCard: ({ amount }) => <div data-testid="payroll-card">Payroll: ${amount}</div>,
  EmployeeCard: ({ employeesPaid }) => <div data-testid="employee-card">Employees: {employeesPaid}</div>,
  PendingCard: ({ pendingCount }) => <div data-testid="pending-card">Pending: {pendingCount}</div>
}));

const renderWithRouting = (initialRoute = '/admin/dashboard') => {
  window.history.pushState({}, 'Test page', initialRoute);
  
  return render(
    <BrowserRouter>
      <SettingsProvider>
        <NotificationProvider>
          <Routes>
            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route path="/unauthorized" element={<div>Unauthorized</div>} />
            <Route path="/login" element={<div>Login</div>} />
          </Routes>
        </NotificationProvider>
      </SettingsProvider>
    </BrowserRouter>
  );
};

describe('AdminDashboard Routing Integration', () => {
  test('renders dashboard when user is authenticated admin', () => {
    renderWithRouting('/admin/dashboard');
    
    // Should render the dashboard
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByTestId('metrics-grid')).toBeInTheDocument();
  });

  test('dashboard is protected by authentication', () => {
    // Mock unauthenticated user
    const tokenManager = require('../../utils/tokenManager');
    tokenManager.isAuthenticated.mockReturnValue(false);
    
    renderWithRouting('/admin/dashboard');
    
    // Should redirect to login (in a real app, this would show login page)
    // Since we're testing routing, we just verify the dashboard doesn't render
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
  });

  test('dashboard requires admin role', () => {
    // Mock employee user
    const tokenManager = require('../../utils/tokenManager');
    tokenManager.isAuthenticated.mockReturnValue(true);
    tokenManager.getUserRole.mockReturnValue('employee');
    
    renderWithRouting('/admin/dashboard');
    
    // Should not render dashboard for non-admin users
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
  });
});