/**
 * Property-Based Tests for Employee Dashboard - Role-Based Dashboard Display
 * 
 * Feature: employee-payroll-system, Property 17: Role-Based Dashboard Display
 * Validates: Requirements 7.3
 * 
 * Property 17: *For any* user login, the frontend should display the appropriate 
 * dashboard (admin or employee) based on the user's role
 */

import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import * as fc from 'fast-check';
import EmployeeDashboard from '../EmployeeDashboard';
import EmployeeLayout from '../../components/EmployeeLayout';
import * as tokenManager from '../../utils/tokenManager';

// Mock the tokenManager module
jest.mock('../../utils/tokenManager');

/**
 * Helper function to render EmployeeDashboard with router context
 */
const renderEmployeeDashboard = (initialEntries = ['/employee/dashboard']) => {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/employee/dashboard" element={<EmployeeDashboard />} />
        <Route path="/employee/payslips" element={<div data-testid="payslips-page">Payslips</div>} />
        <Route path="/login" element={<div data-testid="login-page">Login</div>} />
      </Routes>
    </MemoryRouter>
  );
};

/**
 * Helper function to render EmployeeLayout with router context
 */
const renderEmployeeLayout = (initialEntries = ['/employee/dashboard']) => {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/employee" element={<EmployeeLayout />}>
          <Route path="dashboard" element={<EmployeeDashboard />} />
          <Route path="payslips" element={<div data-testid="payslips-page">Payslips</div>} />
        </Route>
        <Route path="/login" element={<div data-testid="login-page">Login</div>} />
      </Routes>
    </MemoryRouter>
  );
};

describe('Property 17: Role-Based Dashboard Display (Employee)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Property Test: For any employee user, the employee dashboard should display employee-specific features
   * 
   * Feature: employee-payroll-system, Property 17: Role-Based Dashboard Display
   * Validates: Requirements 7.3
   */
  test('should display employee dashboard with employee features for any employee user', () => {
    // Generate arbitrary employee user data
    const employeeUserArbitrary = fc.record({
      name: fc.stringOf(
        fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 '),
        { minLength: 1, maxLength: 30 }
      ).filter(s => s.trim().length > 0),
      email: fc.emailAddress(),
      role: fc.constant('employee'),
      _id: fc.hexaString({ minLength: 24, maxLength: 24 })
    });

    fc.assert(
      fc.property(employeeUserArbitrary, (employeeUser) => {
        // Setup: Employee user is logged in
        tokenManager.getUser.mockReturnValue(employeeUser);
        tokenManager.getUserRole.mockReturnValue('employee');
        tokenManager.isAuthenticated.mockReturnValue(true);
        tokenManager.getToken.mockReturnValue('valid-employee-token');
        tokenManager.isTokenExpired.mockReturnValue(false);

        const { unmount, container } = renderEmployeeDashboard();

        // Verify: Employee dashboard should display using container queries
        const dashboardTitle = container.querySelector('h1');
        const welcomeMessage = container.querySelector('p.text-sm');
        
        // Employee dashboard should show employee-specific elements
        const viewPayslipsButton = screen.queryByRole('button', { name: /View My Payslips/i });

        const hasEmployeeDashboard = dashboardTitle !== null && dashboardTitle.textContent === 'Dashboard';
        const hasWelcome = welcomeMessage !== null && welcomeMessage.textContent.includes('Welcome back');
        const hasEmployeeFeatures = viewPayslipsButton !== null;

        unmount();

        return hasEmployeeDashboard && hasWelcome && hasEmployeeFeatures;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: For any employee user with any name, the dashboard should display their name
   * 
   * Feature: employee-payroll-system, Property 17: Role-Based Dashboard Display
   * Validates: Requirements 7.3
   */
  test('should display employee user name in welcome message for any employee', () => {
    // Generate arbitrary employee names (alphanumeric only to avoid regex issues)
    const employeeNameArbitrary = fc.stringOf(
      fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 '),
      { minLength: 1, maxLength: 30 }
    ).filter(s => s.trim().length > 0);

    fc.assert(
      fc.property(employeeNameArbitrary, (employeeName) => {
        const employeeUser = {
          name: employeeName,
          email: 'employee@test.com',
          role: 'employee',
          _id: '507f1f77bcf86cd799439011'
        };

        // Setup: Employee user is logged in
        tokenManager.getUser.mockReturnValue(employeeUser);
        tokenManager.getUserRole.mockReturnValue('employee');
        tokenManager.isAuthenticated.mockReturnValue(true);

        const { unmount, container } = renderEmployeeDashboard();

        // Verify: Welcome message should contain the employee's name
        const welcomeText = container.querySelector('p.text-sm');
        const nameDisplayed = welcomeText !== null && 
                              welcomeText.textContent.includes(employeeName);

        unmount();

        return nameDisplayed;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: For any employee user, the employee layout should show employee navigation items
   * 
   * Feature: employee-payroll-system, Property 17: Role-Based Dashboard Display
   * Validates: Requirements 7.3
   */
  test('should display employee navigation items in layout for any employee user', () => {
    const employeeUserArbitrary = fc.record({
      name: fc.stringOf(
        fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 '),
        { minLength: 1, maxLength: 30 }
      ).filter(s => s.trim().length > 0),
      email: fc.emailAddress(),
      role: fc.constant('employee'),
      _id: fc.hexaString({ minLength: 24, maxLength: 24 })
    });

    fc.assert(
      fc.property(employeeUserArbitrary, (employeeUser) => {
        // Setup: Employee user is logged in
        tokenManager.getUser.mockReturnValue(employeeUser);
        tokenManager.getUserRole.mockReturnValue('employee');
        tokenManager.isAuthenticated.mockReturnValue(true);
        tokenManager.getToken.mockReturnValue('valid-employee-token');
        tokenManager.isTokenExpired.mockReturnValue(false);
        tokenManager.clearAuth.mockImplementation(() => {});

        const { unmount, container } = renderEmployeeLayout();

        // Verify: Employee layout should show employee navigation items
        const dashboardNavItems = screen.getAllByText('Dashboard');
        const payslipsNavItems = screen.getAllByText('My Payslips');
        const brandNames = screen.getAllByText('PayFlow');
        const employeeLabels = screen.getAllByText(/Employee Portal/i);

        // Dashboard appears in both nav and page title, so we expect at least 1
        const hasEmployeeNavigation = dashboardNavItems.length >= 1 && 
                                      payslipsNavItems.length >= 1;
        const hasBranding = brandNames.length >= 1;
        const hasEmployeeLabel = employeeLabels.length >= 1;

        unmount();

        return hasEmployeeNavigation && hasBranding && hasEmployeeLabel;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: For any employee user, the layout should display their role badge
   * 
   * Feature: employee-payroll-system, Property 17: Role-Based Dashboard Display
   * Validates: Requirements 7.3
   */
  test('should display employee role badge for any employee user', () => {
    const employeeUserArbitrary = fc.record({
      name: fc.stringOf(
        fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 '),
        { minLength: 1, maxLength: 30 }
      ).filter(s => s.trim().length > 0),
      email: fc.emailAddress(),
      role: fc.constant('employee'),
      _id: fc.hexaString({ minLength: 24, maxLength: 24 })
    });

    fc.assert(
      fc.property(employeeUserArbitrary, (employeeUser) => {
        // Setup: Employee user is logged in
        tokenManager.getUser.mockReturnValue(employeeUser);
        tokenManager.getUserRole.mockReturnValue('employee');
        tokenManager.isAuthenticated.mockReturnValue(true);
        tokenManager.getToken.mockReturnValue('valid-employee-token');
        tokenManager.isTokenExpired.mockReturnValue(false);
        tokenManager.clearAuth.mockImplementation(() => {});

        const { unmount, container } = renderEmployeeLayout();

        // Verify: Employee role badge should be displayed (look for the badge element)
        const roleBadge = container.querySelector('.bg-\\[\\#5DD62C\\]\\/10');
        const hasRoleBadge = roleBadge !== null && roleBadge.textContent.includes('employee');

        unmount();

        return hasRoleBadge;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: For any employee user, stats cards should be displayed
   * 
   * Feature: employee-payroll-system, Property 17: Role-Based Dashboard Display
   * Validates: Requirements 7.3
   */
  test('should display stats cards for any employee user', () => {
    const employeeUserArbitrary = fc.record({
      name: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
      email: fc.emailAddress(),
      role: fc.constant('employee'),
      _id: fc.hexaString({ minLength: 24, maxLength: 24 })
    });

    fc.assert(
      fc.property(employeeUserArbitrary, (employeeUser) => {
        // Setup: Employee user is logged in
        tokenManager.getUser.mockReturnValue(employeeUser);
        tokenManager.getUserRole.mockReturnValue('employee');
        tokenManager.isAuthenticated.mockReturnValue(true);

        const { unmount } = renderEmployeeDashboard();

        // Verify: Stats cards should be displayed for employee
        const latestNetSalaryCard = screen.queryByText('Latest Net Salary');
        const totalPayslipsCard = screen.queryByText('Total Payslips');
        const lastPaymentDateCard = screen.queryByText('Last Payment Date');

        const hasStatsCards = latestNetSalaryCard !== null && 
                              totalPayslipsCard !== null && 
                              lastPaymentDateCard !== null;

        unmount();

        return hasStatsCards;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: For any employee user, account information should be displayed
   * 
   * Feature: employee-payroll-system, Property 17: Role-Based Dashboard Display
   * Validates: Requirements 7.3
   */
  test('should display account information for any employee user', () => {
    const employeeUserArbitrary = fc.record({
      name: fc.stringOf(
        fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 '),
        { minLength: 1, maxLength: 30 }
      ).filter(s => s.trim().length > 0),
      email: fc.emailAddress(),
      role: fc.constant('employee'),
      _id: fc.hexaString({ minLength: 24, maxLength: 24 })
    });

    fc.assert(
      fc.property(employeeUserArbitrary, (employeeUser) => {
        // Setup: Employee user is logged in
        tokenManager.getUser.mockReturnValue(employeeUser);
        tokenManager.getUserRole.mockReturnValue('employee');
        tokenManager.isAuthenticated.mockReturnValue(true);

        const { unmount } = renderEmployeeDashboard();

        // Verify: Account information section should be displayed
        const accountInfoSection = screen.queryByText('Account Information');
        const nameLabel = screen.queryByText('Name');
        const emailLabel = screen.queryByText('Email');
        const roleLabel = screen.queryByText('Role');

        const hasAccountInfo = accountInfoSection !== null && 
                               nameLabel !== null && 
                               emailLabel !== null && 
                               roleLabel !== null;

        unmount();

        return hasAccountInfo;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: Employee dashboard should NOT display admin-specific features
   * 
   * Feature: employee-payroll-system, Property 17: Role-Based Dashboard Display
   * Validates: Requirements 7.3
   */
  test('should NOT display admin features for any employee user', () => {
    const employeeUserArbitrary = fc.record({
      name: fc.stringOf(
        fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 '),
        { minLength: 1, maxLength: 30 }
      ).filter(s => s.trim().length > 0),
      email: fc.emailAddress(),
      role: fc.constant('employee'),
      _id: fc.hexaString({ minLength: 24, maxLength: 24 })
    });

    fc.assert(
      fc.property(employeeUserArbitrary, (employeeUser) => {
        // Setup: Employee user is logged in
        tokenManager.getUser.mockReturnValue(employeeUser);
        tokenManager.getUserRole.mockReturnValue('employee');
        tokenManager.isAuthenticated.mockReturnValue(true);

        const { unmount } = renderEmployeeDashboard();

        // Verify: Admin-specific features should NOT be present
        const addEmployeeButton = screen.queryByRole('button', { name: /Add New Employee/i });
        const runPayrollButton = screen.queryByRole('button', { name: /Run Payroll/i });
        const viewReportsButton = screen.queryByRole('button', { name: /View Reports/i });

        const noAdminFeatures = addEmployeeButton === null && 
                                runPayrollButton === null && 
                                viewReportsButton === null;

        unmount();

        return noAdminFeatures;
      }),
      { numRuns: 100 }
    );
  });
});
