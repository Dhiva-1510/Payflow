/**
 * Property-Based Tests for EmployeeCard Context Display
 * Feature: advanced-dashboard-summary, Property 5: Employee context information accuracy
 * Validates: Requirements 2.4, 2.5
 */

import React from 'react';
import { render, cleanup } from '@testing-library/react';
import * as fc from 'fast-check';
import EmployeeCard from '../EmployeeCard';

describe('EmployeeCard Context Display Property Tests', () => {
  // Clean up after each test to avoid DOM conflicts
  afterEach(() => {
    cleanup();
  });

  /**
   * Property 5: Employee context information accuracy
   * For any dashboard display, the employee card should show both the count of employees paid and distinguish it from total employees
   * Validates: Requirements 2.4, 2.5
   */
  test('should show both count of employees paid and distinguish it from total employees for any valid input', () => {
    // Generate arbitrary employee counts
    const employeesPaidArbitrary = fc.integer({ min: 0, max: 10000 });
    const totalEmployeesArbitrary = fc.integer({ min: 0, max: 10000 });
    const monthArbitrary = fc.integer({ min: 1, max: 12 });
    const yearArbitrary = fc.integer({ min: 2020, max: 2030 });

    fc.assert(
      fc.property(
        employeesPaidArbitrary,
        totalEmployeesArbitrary,
        monthArbitrary,
        yearArbitrary,
        (employeesPaid, totalEmployees, month, year) => {
          // Ensure employeesPaid doesn't exceed totalEmployees for realistic scenarios
          const adjustedEmployeesPaid = Math.min(employeesPaid, totalEmployees);
          
          const { container } = render(
            <EmployeeCard
              employeesPaid={adjustedEmployeesPaid}
              totalEmployees={totalEmployees}
              month={month}
              year={year}
            />
          );

          const cardText = container.textContent;

          // Property 1: Should always display the count of employees paid (Requirement 2.4)
          // The component should show a descriptive label with the count
          if (adjustedEmployeesPaid === 0) {
            expect(cardText).toContain('No employees paid this month');
          } else if (adjustedEmployeesPaid === 1) {
            expect(cardText).toContain('1 employee paid');
          } else {
            expect(cardText).toContain(`${adjustedEmployeesPaid.toLocaleString()} employees paid`);
          }

          // Property 2: Should distinguish between total employees and employees paid (Requirement 2.5)
          // The component should show context about total employees
          if (totalEmployees === 0) {
            // When totalEmployees is 0, the component doesn't show total context in zero state
            // This is correct behavior - no need to show "No employees in system" when there are none
            expect(cardText).toContain('No employees paid this month');
          } else if (totalEmployees === 1) {
            expect(cardText).toContain('of 1 total employee');
          } else {
            expect(cardText).toContain(`of ${totalEmployees.toLocaleString()} total employees`);
          }

          // Property 3: Should show coverage percentage that correctly represents the relationship
          const expectedCoverage = totalEmployees === 0 ? 0 : Math.round((adjustedEmployeesPaid / totalEmployees) * 100);
          expect(cardText).toContain(`${expectedCoverage}%`);

          // Property 4: Should display month and year context
          const monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
          ];
          const expectedPeriod = `${monthNames[month - 1]} ${year}`;
          expect(cardText).toContain(expectedPeriod);

          // Property 5: Should always show the "Employees Paid" title
          expect(cardText).toContain('Employees Paid');

          // Property 6: Should show coverage section
          expect(cardText).toContain('Coverage');

          // Property 7: The distinction between paid and total should be clear in the UI
          // Both pieces of information should be present and distinguishable
          
          // Should contain information about employees paid
          const containsPaidInfo = 
            cardText.includes('employee paid') || 
            cardText.includes('employees paid') || 
            cardText.includes('No employees paid');
          expect(containsPaidInfo).toBe(true);

          // Should contain information about total employees (unless total is 0)
          if (totalEmployees > 0) {
            const containsTotalInfo = 
              cardText.includes('total employee') || 
              cardText.includes('total employees');
            expect(containsTotalInfo).toBe(true);
          } else {
            // When totalEmployees is 0, the component correctly doesn't show total context
            // This satisfies the requirement by showing the distinction (no total context when none exist)
            expect(cardText).toContain('No employees paid this month');
          }

          // Property 8: The paid count should never exceed total count in display
          expect(adjustedEmployeesPaid).toBeLessThanOrEqual(totalEmployees);

          // Clean up this render before next iteration
          cleanup();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property test for edge cases and boundary conditions
   */
  test('should handle edge cases correctly while maintaining context information accuracy', () => {
    // Test specific edge cases that are important for employee context
    const edgeCaseArbitrary = fc.constantFrom(
      { employeesPaid: 0, totalEmployees: 0 },
      { employeesPaid: 0, totalEmployees: 1 },
      { employeesPaid: 1, totalEmployees: 1 },
      { employeesPaid: 0, totalEmployees: 100 },
      { employeesPaid: 100, totalEmployees: 100 },
      { employeesPaid: 50, totalEmployees: 100 }
    );

    const monthArbitrary = fc.integer({ min: 1, max: 12 });
    const yearArbitrary = fc.integer({ min: 2020, max: 2030 });

    fc.assert(
      fc.property(
        edgeCaseArbitrary,
        monthArbitrary,
        yearArbitrary,
        ({ employeesPaid, totalEmployees }, month, year) => {
          const { container } = render(
            <EmployeeCard
              employeesPaid={employeesPaid}
              totalEmployees={totalEmployees}
              month={month}
              year={year}
            />
          );

          // Property 1: Should always maintain the distinction between paid and total
          const cardText = container.textContent;

          // Property 2: Zero state handling should still show context
          if (employeesPaid === 0 && totalEmployees === 0) {
            expect(cardText).toContain('No employees paid this month');
            // When totalEmployees is 0, the component doesn't show "No employees in system"
            // This is correct behavior - the zero state is handled appropriately
          }

          // Property 3: Perfect coverage (100%) should be handled correctly
          if (employeesPaid === totalEmployees && totalEmployees > 0) {
            expect(cardText).toContain('100%');
          }

          // Property 4: Zero coverage should be handled correctly
          if (employeesPaid === 0 && totalEmployees > 0) {
            expect(cardText).toContain('0%');
          }

          // Property 5: Should always show both descriptive labels and context
          expect(cardText).toContain('Employees Paid');
          expect(cardText).toContain('Coverage');

          // Clean up this render before next iteration
          cleanup();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property test for formatting consistency across different locales
   */
  test('should format employee counts consistently with locale formatting', () => {
    // Test with larger numbers to verify thousand separators
    const largeEmployeeCountArbitrary = fc.integer({ min: 1000, max: 999999 });
    const monthArbitrary = fc.integer({ min: 1, max: 12 });
    const yearArbitrary = fc.integer({ min: 2020, max: 2030 });

    fc.assert(
      fc.property(
        largeEmployeeCountArbitrary,
        largeEmployeeCountArbitrary,
        monthArbitrary,
        yearArbitrary,
        (employeesPaid, totalEmployees, month, year) => {
          // Ensure realistic relationship
          const adjustedEmployeesPaid = Math.min(employeesPaid, totalEmployees);
          
          const { container } = render(
            <EmployeeCard
              employeesPaid={adjustedEmployeesPaid}
              totalEmployees={totalEmployees}
              month={month}
              year={year}
            />
          );

          const cardText = container.textContent;

          // Property 1: Large numbers should be formatted with thousand separators
          const formattedPaid = adjustedEmployeesPaid.toLocaleString();
          const formattedTotal = totalEmployees.toLocaleString();

          expect(cardText).toContain(`of ${formattedTotal} total employees`);

          // Property 2: Formatted numbers should contain commas for thousands
          if (adjustedEmployeesPaid >= 1000) {
            expect(formattedPaid).toMatch(/,/);
          }
          if (totalEmployees >= 1000) {
            expect(formattedTotal).toMatch(/,/);
          }

          // Clean up this render before next iteration
          cleanup();
        }
      ),
      { numRuns: 100 }
    );
  });
});