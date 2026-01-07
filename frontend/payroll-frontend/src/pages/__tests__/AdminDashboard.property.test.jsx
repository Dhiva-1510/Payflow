/**
 * Property-Based Tests for Admin Dashboard - Role-Based Dashboard Display
 * 
 * Feature: employee-payroll-system, Property 17: Role-Based Dashboard Display
 * Validates: Requirements 7.2
 * 
 * Property 17: *For any* user login, the frontend should display the appropriate 
 * dashboard (admin or employee) based on the user's role
 */

import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import * as fc from 'fast-check';
import AdminDashboard from '../AdminDashboard';
import AdminLayout from '../../components/AdminLayout';
import * as tokenManager from '../../utils/tokenManager';

// Mock the tokenManager module
jest.mock('../../utils/tokenManager');

/**
 * Helper function to render AdminDashboard with router context
 */
const renderAdminDashboard = (initialEntries = ['/admin/dashboard']) => {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/employees" element={<div data-testid="employees-page">Employees</div>} />
        <Route path="/admin/payroll" element={<div data-testid="payroll-page">Payroll</div>} />
        <Route path="/login" element={<div data-testid="login-page">Login</div>} />
      </Routes>
    </MemoryRouter>
  );
};

/**
 * Helper function to render AdminLayout with router context
 */
const renderAdminLayout = (initialEntries = ['/admin/dashboard']) => {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/admin" element={<AdminLayout />}>
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="employees" element={<div data-testid="employees-page">Employees</div>} />
          <Route path="payroll" element={<div data-testid="payroll-page">Payroll</div>} />
        </Route>
        <Route path="/login" element={<div data-testid="login-page">Login</div>} />
      </Routes>
    </MemoryRouter>
  );
};

describe('Property 17: Role-Based Dashboard Display', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Property Test: For any admin user, the admin dashboard should display admin-specific features
   * 
   * Feature: employee-payroll-system, Property 17: Role-Based Dashboard Display
   * Validates: Requirements 7.2
   */
  test('should display admin dashboard with admin features for any admin user', () => {
    // Generate arbitrary admin user data
    const adminUserArbitrary = fc.record({
      name: fc.stringOf(
        fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 '),
        { minLength: 1, maxLength: 30 }
      ).filter(s => s.trim().length > 0),
      email: fc.emailAddress(),
      role: fc.constant('admin'),
      _id: fc.hexaString({ minLength: 24, maxLength: 24 })
    });

    fc.assert(
      fc.property(adminUserArbitrary, (adminUser) => {
        // Setup: Admin user is logged in
        tokenManager.getUser.mockReturnValue(adminUser);
        tokenManager.getUserRole.mockReturnValue('admin');
        tokenManager.isAuthenticated.mockReturnValue(true);
        tokenManager.getToken.mockReturnValue('valid-admin-token');
        tokenManager.isTokenExpired.mockReturnValue(false);

        const { unmount, container } = renderAdminDashboard();

        // Verify: Admin dashboard should display using container queries
        const dashboardTitle = container.querySelector('h1');
        const welcomeMessage = container.querySelector('p.text-sm');
        
        // Admin dashboard should show admin-specific elements
        const addEmployeeButton = screen.queryByRole('button', { name: /Add New Employee/i });
        const runPayrollButton = screen.queryByRole('button', { name: /Run Payroll/i });
        const viewReportsButton = screen.queryByRole('button', { name: /View Reports/i });

        const hasAdminDashboard = dashboardTitle !== null && dashboardTitle.textContent === 'Dashboard';
        const hasWelcome = welcomeMessage !== null && welcomeMessage.textContent.includes('Welcome back');
        const hasAdminFeatures = addEmployeeButton !== null && 
                                 runPayrollButton !== null && 
                                 viewReportsButton !== null;

        unmount();

        return hasAdminDashboard && hasWelcome && hasAdminFeatures;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: For any admin user with any name, the dashboard should display their name
   * 
   * Feature: employee-payroll-system, Property 17: Role-Based Dashboard Display
   * Validates: Requirements 7.2
   */
  test('should display admin user name in welcome message for any admin', () => {
    // Generate arbitrary admin names (alphanumeric only to avoid regex issues)
    const adminNameArbitrary = fc.stringOf(
      fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 '),
      { minLength: 1, maxLength: 30 }
    ).filter(s => s.trim().length > 0);

    fc.assert(
      fc.property(adminNameArbitrary, (adminName) => {
        const adminUser = {
          name: adminName,
          email: 'admin@test.com',
          role: 'admin',
          _id: '507f1f77bcf86cd799439011'
        };

        // Setup: Admin user is logged in
        tokenManager.getUser.mockReturnValue(adminUser);
        tokenManager.getUserRole.mockReturnValue('admin');
        tokenManager.isAuthenticated.mockReturnValue(true);

        const { unmount, container } = renderAdminDashboard();

        // Verify: Welcome message should contain the admin's name
        const welcomeText = container.querySelector('p.text-sm');
        const nameDisplayed = welcomeText !== null && 
                              welcomeText.textContent.includes(adminName);

        unmount();

        return nameDisplayed;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: For any admin user, the admin layout should show admin navigation items
   * 
   * Feature: employee-payroll-system, Property 17: Role-Based Dashboard Display
   * Validates: Requirements 7.2
   */
  test('should display admin navigation items in layout for any admin user', () => {
    const adminUserArbitrary = fc.record({
      name: fc.stringOf(
        fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 '),
        { minLength: 1, maxLength: 30 }
      ).filter(s => s.trim().length > 0),
      email: fc.emailAddress(),
      role: fc.constant('admin'),
      _id: fc.hexaString({ minLength: 24, maxLength: 24 })
    });

    fc.assert(
      fc.property(adminUserArbitrary, (adminUser) => {
        // Setup: Admin user is logged in
        tokenManager.getUser.mockReturnValue(adminUser);
        tokenManager.getUserRole.mockReturnValue('admin');
        tokenManager.isAuthenticated.mockReturnValue(true);
        tokenManager.getToken.mockReturnValue('valid-admin-token');
        tokenManager.isTokenExpired.mockReturnValue(false);
        tokenManager.clearAuth.mockImplementation(() => {});

        const { unmount, container } = renderAdminLayout();

        // Verify: Admin layout should show admin navigation items using getAllByText
        const dashboardNavItems = screen.getAllByText('Dashboard');
        const employeesNavItems = screen.getAllByText('Employees');
        const payrollNavItems = screen.getAllByText('Payroll');
        const brandNames = screen.getAllByText('PayFlow');
        const adminLabels = screen.getAllByText(/Admin Dashboard/i);

        // Dashboard appears in both nav and page title, so we expect at least 1
        const hasAdminNavigation = dashboardNavItems.length >= 1 && 
                                   employeesNavItems.length >= 1 && 
                                   payrollNavItems.length >= 1;
        const hasBranding = brandNames.length >= 1;
        const hasAdminLabel = adminLabels.length >= 1;

        unmount();

        return hasAdminNavigation && hasBranding && hasAdminLabel;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: For any admin user, the layout should display their role badge
   * 
   * Feature: employee-payroll-system, Property 17: Role-Based Dashboard Display
   * Validates: Requirements 7.2
   */
  test('should display admin role badge for any admin user', () => {
    const adminUserArbitrary = fc.record({
      name: fc.stringOf(
        fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 '),
        { minLength: 1, maxLength: 30 }
      ).filter(s => s.trim().length > 0),
      email: fc.emailAddress(),
      role: fc.constant('admin'),
      _id: fc.hexaString({ minLength: 24, maxLength: 24 })
    });

    fc.assert(
      fc.property(adminUserArbitrary, (adminUser) => {
        // Setup: Admin user is logged in
        tokenManager.getUser.mockReturnValue(adminUser);
        tokenManager.getUserRole.mockReturnValue('admin');
        tokenManager.isAuthenticated.mockReturnValue(true);
        tokenManager.getToken.mockReturnValue('valid-admin-token');
        tokenManager.isTokenExpired.mockReturnValue(false);
        tokenManager.clearAuth.mockImplementation(() => {});

        const { unmount, container } = renderAdminLayout();

        // Verify: Admin role badge should be displayed (look for the badge element)
        const roleBadge = container.querySelector('.bg-\\[\\#5DD62C\\]\\/10');
        const hasRoleBadge = roleBadge !== null && roleBadge.textContent.includes('admin');

        unmount();

        return hasRoleBadge;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: For any admin user, quick action buttons should be present and functional
   * 
   * Feature: employee-payroll-system, Property 17: Role-Based Dashboard Display
   * Validates: Requirements 7.2
   */
  test('should display quick action buttons for any admin user', () => {
    const adminUserArbitrary = fc.record({
      name: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
      email: fc.emailAddress(),
      role: fc.constant('admin'),
      _id: fc.hexaString({ minLength: 24, maxLength: 24 })
    });

    fc.assert(
      fc.property(adminUserArbitrary, (adminUser) => {
        // Setup: Admin user is logged in
        tokenManager.getUser.mockReturnValue(adminUser);
        tokenManager.getUserRole.mockReturnValue('admin');
        tokenManager.isAuthenticated.mockReturnValue(true);

        const { unmount } = renderAdminDashboard();

        // Verify: Quick action buttons should be present
        const quickActionsSection = screen.queryByText('Quick Actions');
        const addEmployeeBtn = screen.queryByRole('button', { name: /Add New Employee/i });
        const runPayrollBtn = screen.queryByRole('button', { name: /Run Payroll/i });
        const viewReportsBtn = screen.queryByRole('button', { name: /View Reports/i });

        const hasQuickActions = quickActionsSection !== null;
        const hasActionButtons = addEmployeeBtn !== null && 
                                 runPayrollBtn !== null && 
                                 viewReportsBtn !== null;

        unmount();

        return hasQuickActions && hasActionButtons;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: For any admin user, stats cards should be displayed
   * 
   * Feature: employee-payroll-system, Property 17: Role-Based Dashboard Display
   * Validates: Requirements 7.2
   */
  test('should display stats cards for any admin user', () => {
    const adminUserArbitrary = fc.record({
      name: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
      email: fc.emailAddress(),
      role: fc.constant('admin'),
      _id: fc.hexaString({ minLength: 24, maxLength: 24 })
    });

    fc.assert(
      fc.property(adminUserArbitrary, (adminUser) => {
        // Setup: Admin user is logged in
        tokenManager.getUser.mockReturnValue(adminUser);
        tokenManager.getUserRole.mockReturnValue('admin');
        tokenManager.isAuthenticated.mockReturnValue(true);

        const { unmount } = renderAdminDashboard();

        // Verify: Stats cards should be displayed
        const totalEmployeesCard = screen.queryByText('Total Employees');
        const monthlyPayrollCard = screen.queryByText('Monthly Payroll');
        const pendingApprovalsCard = screen.queryByText('Pending Approvals');
        const lastPayrollRunCard = screen.queryByText('Last Payroll Run');

        const hasStatsCards = totalEmployeesCard !== null && 
                              monthlyPayrollCard !== null && 
                              pendingApprovalsCard !== null && 
                              lastPayrollRunCard !== null;

        unmount();

        return hasStatsCards;
      }),
      { numRuns: 100 }
    );
  });
});
