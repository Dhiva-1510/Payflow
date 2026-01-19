import fc from 'fast-check';
import mongoose from 'mongoose';
import DashboardService from '../dashboardService.js';
import User from '../../models/User.js';
import Employee from '../../models/Employee.js';
import Payroll from '../../models/Payroll.js';

// Database setup for tests that require database operations
beforeAll(async () => {
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/payrolldb_test';
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(mongoUri);
  }
}, 30000);

afterAll(async () => {
  await mongoose.connection.close();
}, 30000);

beforeEach(async () => {
  // Clean up collections before each test
  await User.deleteMany({});
  await Employee.deleteMany({});
  await Payroll.deleteMany({});
}, 30000);

describe('DashboardService Property-Based Tests', () => {
  /**
   * Property 1: Payroll total calculation accuracy
   * Feature: advanced-dashboard-summary, Property 1: Payroll total calculation accuracy
   * Validates: Requirements 1.1, 1.3
   */
  describe('Property 1: Payroll total calculation accuracy', () => {
    test('should calculate correct payroll total for any set of payroll records in a given month and year', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            month: fc.integer({ min: 1, max: 12 }),
            year: fc.integer({ min: 2020, max: 2025 }),
            payrollRecords: fc.array(
              fc.record({
                netSalary: fc.float({ min: Math.fround(0), max: Math.fround(100000), noNaN: true }),
                baseSalary: fc.float({ min: Math.fround(0), max: Math.fround(80000), noNaN: true }),
                allowance: fc.float({ min: Math.fround(0), max: Math.fround(20000), noNaN: true }),
                deduction: fc.float({ min: Math.fround(0), max: Math.fround(10000), noNaN: true })
              }),
              { minLength: 0, maxLength: 5 }
            )
          }),
          async (testData) => {
            // Clean up before each iteration
            await User.deleteMany({});
            await Employee.deleteMany({});
            await Payroll.deleteMany({});

            const createdEmployees = [];
            let expectedTotal = 0;

            // Create employees and payroll records
            for (let i = 0; i < testData.payrollRecords.length; i++) {
              const payrollData = testData.payrollRecords[i];
              
              // Create user
              const user = new User({
                name: `User ${i}`,
                email: `user${i}@test.com`,
                password: 'password123',
                role: 'employee'
              });
              const savedUser = await user.save();

              // Create employee
              const employee = new Employee({
                userId: savedUser._id,
                baseSalary: payrollData.baseSalary,
                allowance: payrollData.allowance,
                deduction: payrollData.deduction
              });
              const savedEmployee = await employee.save();
              createdEmployees.push(savedEmployee);

              // Create payroll record for the specified month/year
              await Payroll.create({
                employeeId: savedEmployee._id,
                month: testData.month,
                year: testData.year,
                baseSalary: payrollData.baseSalary,
                allowance: payrollData.allowance,
                deduction: payrollData.deduction,
                grossSalary: payrollData.baseSalary + payrollData.allowance,
                netSalary: payrollData.netSalary
              });

              expectedTotal += payrollData.netSalary;
            }

            // Test the dashboard service method
            const result = await DashboardService.getPayrollTotal(testData.month, testData.year);

            // Verify the payroll total calculation accuracy
            expect(result.amount).toBeCloseTo(expectedTotal, 2);
            expect(result.month).toBe(testData.month);
            expect(result.year).toBe(testData.year);
            expect(result.currency).toBe('INR');
            expect(result.employeeCount).toBe(testData.payrollRecords.length);

            // Verify that the calculation is consistent when called multiple times
            const result2 = await DashboardService.getPayrollTotal(testData.month, testData.year);
            expect(result2.amount).toBeCloseTo(result.amount, 10);
            expect(result2.employeeCount).toBe(result.employeeCount);
          }
        ),
        { numRuns: 20 }
      );
    }, 60000);

    test('should return zero total for months with no payroll records', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            month: fc.integer({ min: 1, max: 12 }),
            year: fc.integer({ min: 2020, max: 2025 }),
            otherMonth: fc.integer({ min: 1, max: 12 }),
            otherYear: fc.integer({ min: 2020, max: 2025 }),
            payrollRecords: fc.array(
              fc.record({
                netSalary: fc.float({ min: Math.fround(0.01), max: Math.fround(100000), noNaN: true }),
                baseSalary: fc.float({ min: Math.fround(0), max: Math.fround(80000), noNaN: true }),
                allowance: fc.float({ min: Math.fround(0), max: Math.fround(20000), noNaN: true }),
                deduction: fc.float({ min: Math.fround(0), max: Math.fround(10000), noNaN: true })
              }),
              { minLength: 1, maxLength: 5 }
            )
          }),
          async (testData) => {
            // Ensure we're testing different months/years
            if (testData.month === testData.otherMonth && testData.year === testData.otherYear) {
              return; // Skip this iteration
            }

            // Clean up before each iteration
            await User.deleteMany({});
            await Employee.deleteMany({});
            await Payroll.deleteMany({});

            // Create payroll records for a different month/year
            for (let i = 0; i < testData.payrollRecords.length; i++) {
              const payrollData = testData.payrollRecords[i];
              
              const user = new User({
                name: `User ${i}`,
                email: `user${i}@test.com`,
                password: 'password123',
                role: 'employee'
              });
              const savedUser = await user.save();

              const employee = new Employee({
                userId: savedUser._id,
                baseSalary: payrollData.baseSalary,
                allowance: payrollData.allowance,
                deduction: payrollData.deduction
              });
              const savedEmployee = await employee.save();

              // Create payroll record for the OTHER month/year (not the one we're testing)
              await Payroll.create({
                employeeId: savedEmployee._id,
                month: testData.otherMonth,
                year: testData.otherYear,
                baseSalary: payrollData.baseSalary,
                allowance: payrollData.allowance,
                deduction: payrollData.deduction,
                grossSalary: payrollData.baseSalary + payrollData.allowance,
                netSalary: payrollData.netSalary
              });
            }

            // Test the dashboard service method for the target month/year (should be zero)
            const result = await DashboardService.getPayrollTotal(testData.month, testData.year);

            // Verify zero total for month with no records
            expect(result.amount).toBe(0);
            expect(result.month).toBe(testData.month);
            expect(result.year).toBe(testData.year);
            expect(result.currency).toBe('INR');
            expect(result.employeeCount).toBe(0);
          }
        ),
        { numRuns: 20 }
      );
    }, 60000);

    test('should handle edge cases with zero and very small values correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            month: fc.integer({ min: 1, max: 12 }),
            year: fc.integer({ min: 2020, max: 2025 }),
            payrollRecords: fc.array(
              fc.record({
                netSalary: fc.oneof(
                  fc.constant(0),
                  fc.float({ min: Math.fround(0.01), max: Math.fround(1), noNaN: true }),
                  fc.float({ min: Math.fround(1), max: Math.fround(100000), noNaN: true })
                ),
                baseSalary: fc.float({ min: Math.fround(0), max: Math.fround(80000), noNaN: true }),
                allowance: fc.float({ min: Math.fround(0), max: Math.fround(20000), noNaN: true }),
                deduction: fc.float({ min: Math.fround(0), max: Math.fround(10000), noNaN: true })
              }),
              { minLength: 1, maxLength: 5 }
            )
          }),
          async (testData) => {
            // Clean up before each iteration
            await User.deleteMany({});
            await Employee.deleteMany({});
            await Payroll.deleteMany({});

            let expectedTotal = 0;

            // Create payroll records with edge case values
            for (let i = 0; i < testData.payrollRecords.length; i++) {
              const payrollData = testData.payrollRecords[i];
              
              const user = new User({
                name: `User ${i}`,
                email: `user${i}@test.com`,
                password: 'password123',
                role: 'employee'
              });
              const savedUser = await user.save();

              const employee = new Employee({
                userId: savedUser._id,
                baseSalary: payrollData.baseSalary,
                allowance: payrollData.allowance,
                deduction: payrollData.deduction
              });
              const savedEmployee = await employee.save();

              await Payroll.create({
                employeeId: savedEmployee._id,
                month: testData.month,
                year: testData.year,
                baseSalary: payrollData.baseSalary,
                allowance: payrollData.allowance,
                deduction: payrollData.deduction,
                grossSalary: payrollData.baseSalary + payrollData.allowance,
                netSalary: payrollData.netSalary
              });

              expectedTotal += payrollData.netSalary;
            }

            const result = await DashboardService.getPayrollTotal(testData.month, testData.year);

            // Verify calculation accuracy even with edge case values
            expect(result.amount).toBeCloseTo(expectedTotal, 2);
            expect(result.employeeCount).toBe(testData.payrollRecords.length);

            // Verify that zero values are handled correctly
            if (expectedTotal === 0) {
              expect(result.amount).toBe(0);
            }

            // Verify that very small values are preserved
            if (expectedTotal > 0 && expectedTotal < 1) {
              expect(result.amount).toBeGreaterThan(0);
              expect(result.amount).toBeLessThan(1);
            }
          }
        ),
        { numRuns: 20 }
      );
    }, 60000);

    test('should maintain calculation accuracy across different numeric ranges', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            month: fc.integer({ min: 1, max: 12 }),
            year: fc.integer({ min: 2020, max: 2025 }),
            payrollRecords: fc.array(
              fc.record({
                netSalary: fc.oneof(
                  // Small values
                  fc.float({ min: Math.fround(0.01), max: Math.fround(100), noNaN: true }),
                  // Medium values
                  fc.float({ min: Math.fround(1000), max: Math.fround(10000), noNaN: true }),
                  // Large values
                  fc.float({ min: Math.fround(50000), max: Math.fround(100000), noNaN: true })
                ),
                baseSalary: fc.float({ min: Math.fround(0), max: Math.fround(80000), noNaN: true }),
                allowance: fc.float({ min: Math.fround(0), max: Math.fround(20000), noNaN: true }),
                deduction: fc.float({ min: Math.fround(0), max: Math.fround(10000), noNaN: true })
              }),
              { minLength: 1, maxLength: 8 }
            )
          }),
          async (testData) => {
            // Clean up before each iteration
            await User.deleteMany({});
            await Employee.deleteMany({});
            await Payroll.deleteMany({});

            let expectedTotal = 0;

            // Create payroll records with various numeric ranges
            for (let i = 0; i < testData.payrollRecords.length; i++) {
              const payrollData = testData.payrollRecords[i];
              
              const user = new User({
                name: `User ${i}`,
                email: `user${i}@test.com`,
                password: 'password123',
                role: 'employee'
              });
              const savedUser = await user.save();

              const employee = new Employee({
                userId: savedUser._id,
                baseSalary: payrollData.baseSalary,
                allowance: payrollData.allowance,
                deduction: payrollData.deduction
              });
              const savedEmployee = await employee.save();

              await Payroll.create({
                employeeId: savedEmployee._id,
                month: testData.month,
                year: testData.year,
                baseSalary: payrollData.baseSalary,
                allowance: payrollData.allowance,
                deduction: payrollData.deduction,
                grossSalary: payrollData.baseSalary + payrollData.allowance,
                netSalary: payrollData.netSalary
              });

              expectedTotal += payrollData.netSalary;
            }

            const result = await DashboardService.getPayrollTotal(testData.month, testData.year);

            // Verify calculation maintains precision across different ranges
            expect(result.amount).toBeCloseTo(expectedTotal, 2);
            expect(result.employeeCount).toBe(testData.payrollRecords.length);

            // Verify the total is always non-negative
            expect(result.amount).toBeGreaterThanOrEqual(0);

            // Verify that the total is the sum of individual net salaries
            const individualSum = testData.payrollRecords.reduce((sum, record) => sum + record.netSalary, 0);
            expect(result.amount).toBeCloseTo(individualSum, 2);
          }
        ),
        { numRuns: 20 }
      );
    }, 60000);
  });

  /**
   * Property 2: Employee count accuracy
   * Feature: advanced-dashboard-summary, Property 2: Employee count accuracy
   * Validates: Requirements 2.1, 2.3
   */
  describe('Property 2: Employee count accuracy', () => {
    test('should count correct number of unique employees paid for any set of payroll records in a given month and year', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            month: fc.integer({ min: 1, max: 12 }),
            year: fc.integer({ min: 2020, max: 2025 }),
            employeeCount: fc.integer({ min: 0, max: 5 })
          }),
          async (testData) => {
            // Clean up before each iteration
            await User.deleteMany({});
            await Employee.deleteMany({});
            await Payroll.deleteMany({});

            const createdEmployees = [];

            // Create employees and their payroll records
            for (let i = 0; i < testData.employeeCount; i++) {
              // Create user
              const user = new User({
                name: `User ${i}`,
                email: `user${i}@test.com`,
                password: 'password123',
                role: 'employee'
              });
              const savedUser = await user.save();

              // Create employee
              const employee = new Employee({
                userId: savedUser._id,
                baseSalary: 5000,
                allowance: 1000,
                deduction: 500
              });
              const savedEmployee = await employee.save();
              createdEmployees.push(savedEmployee);

              // Create one payroll record for this employee in the target month/year
              await Payroll.create({
                employeeId: savedEmployee._id,
                month: testData.month,
                year: testData.year,
                baseSalary: 5000,
                allowance: 1000,
                deduction: 500,
                grossSalary: 6000,
                netSalary: 5500
              });
            }

            // Test the dashboard service method
            const result = await DashboardService.getEmployeesPaidCount(testData.month, testData.year);

            // Verify the employee count accuracy
            expect(result.count).toBe(testData.employeeCount);
            expect(result.month).toBe(testData.month);
            expect(result.year).toBe(testData.year);
            expect(result.totalEmployees).toBe(testData.employeeCount);

            // Verify consistency when called multiple times
            const result2 = await DashboardService.getEmployeesPaidCount(testData.month, testData.year);
            expect(result2.count).toBe(result.count);
            expect(result2.totalEmployees).toBe(result.totalEmployees);
          }
        ),
        { numRuns: 20 }
      );
    }, 60000);

    test('should return zero count for months with no payroll records', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            month: fc.integer({ min: 1, max: 12 }),
            year: fc.integer({ min: 2020, max: 2025 }),
            employeeCount: fc.integer({ min: 1, max: 3 })
          }),
          async (testData) => {
            // Clean up before each iteration
            await User.deleteMany({});
            await Employee.deleteMany({});
            await Payroll.deleteMany({});

            // Create employees but no payroll records for the target month/year
            for (let i = 0; i < testData.employeeCount; i++) {
              const user = new User({
                name: `User ${i}`,
                email: `user${i}@test.com`,
                password: 'password123',
                role: 'employee'
              });
              const savedUser = await user.save();

              await Employee.create({
                userId: savedUser._id,
                baseSalary: 5000,
                allowance: 1000,
                deduction: 500
              });
            }

            // Test the dashboard service method for the target month/year (should be zero)
            const result = await DashboardService.getEmployeesPaidCount(testData.month, testData.year);

            // Verify zero count for month with no payroll records
            expect(result.count).toBe(0);
            expect(result.month).toBe(testData.month);
            expect(result.year).toBe(testData.year);
            expect(result.totalEmployees).toBe(testData.employeeCount); // Employees exist but weren't paid in target month
          }
        ),
        { numRuns: 20 }
      );
    }, 60000);

    test('should distinguish between total employees and employees paid in specific month', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            month: fc.integer({ min: 1, max: 12 }),
            year: fc.integer({ min: 2020, max: 2025 }),
            totalEmployees: fc.integer({ min: 2, max: 5 }),
            employeesPaidCount: fc.integer({ min: 1, max: 3 })
          }),
          async (testData) => {
            // Ensure paid count doesn't exceed total
            const actualPaidCount = Math.min(testData.employeesPaidCount, testData.totalEmployees);

            // Clean up before each iteration
            await User.deleteMany({});
            await Employee.deleteMany({});
            await Payroll.deleteMany({});

            const createdEmployees = [];

            // Create all employees
            for (let i = 0; i < testData.totalEmployees; i++) {
              const user = new User({
                name: `User ${i}`,
                email: `user${i}@test.com`,
                password: 'password123',
                role: 'employee'
              });
              const savedUser = await user.save();

              const employee = new Employee({
                userId: savedUser._id,
                baseSalary: 5000,
                allowance: 1000,
                deduction: 500
              });
              const savedEmployee = await employee.save();
              createdEmployees.push(savedEmployee);
            }

            // Create payroll records for only some employees
            for (let i = 0; i < actualPaidCount; i++) {
              await Payroll.create({
                employeeId: createdEmployees[i]._id,
                month: testData.month,
                year: testData.year,
                baseSalary: 5000,
                allowance: 1000,
                deduction: 500,
                grossSalary: 6000,
                netSalary: 5500
              });
            }

            const result = await DashboardService.getEmployeesPaidCount(testData.month, testData.year);

            // Verify correct counts
            expect(result.count).toBe(actualPaidCount); // Only employees with payroll records
            expect(result.totalEmployees).toBe(testData.totalEmployees); // All employees in system
            expect(result.count).toBeLessThanOrEqual(result.totalEmployees); // Paid count should never exceed total
            expect(result.month).toBe(testData.month);
            expect(result.year).toBe(testData.year);
          }
        ),
        { numRuns: 20 }
      );
    }, 60000);
  });

  /**
   * Property 3: Pending approval count accuracy
   * Feature: advanced-dashboard-summary, Property 3: Pending approval count accuracy
   * Validates: Requirements 3.1, 3.3
   */
  describe('Property 3: Pending approval count accuracy', () => {
    test('should return correct count of pending payroll items for any set of employees and payroll records', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            month: fc.integer({ min: 1, max: 12 }),
            year: fc.integer({ min: 2020, max: 2026 }),
            employeeCount: fc.integer({ min: 0, max: 10 }),
            payrollCount: fc.integer({ min: 0, max: 10 })
          }),
          async (testData) => {
            // Clean up any existing data
            await Employee.deleteMany({});
            await Payroll.deleteMany({});

            // Create test employees
            const employees = [];
            for (let i = 0; i < testData.employeeCount; i++) {
              const employee = await Employee.create({
                userId: new mongoose.Types.ObjectId(),
                baseSalary: 50000 + i * 1000,
                allowance: 5000,
                deduction: 2000
              });
              employees.push(employee);
            }

            // Create payroll records for some employees (up to the number of employees)
            const actualPayrollCount = Math.min(testData.payrollCount, testData.employeeCount);
            for (let i = 0; i < actualPayrollCount; i++) {
              await Payroll.create({
                employeeId: employees[i]._id,
                month: testData.month,
                year: testData.year,
                baseSalary: 50000 + i * 1000,
                allowance: 5000,
                deduction: 2000,
                grossSalary: 55000 + i * 1000,
                netSalary: 53000 + i * 1000
              });
            }

            // Test the dashboard service method
            const result = await DashboardService.getPendingApprovalsCount(testData.month, testData.year);

            // Calculate expected pending count
            const expectedPendingCount = testData.employeeCount - actualPayrollCount;

            // Verify the pending approval count accuracy
            expect(result.count).toBe(expectedPendingCount);
            expect(result.types).toEqual(['payroll']);
            expect(result.month).toBe(testData.month);
            expect(result.year).toBe(testData.year);
            expect(result.totalEmployees).toBe(testData.employeeCount);
            expect(result.processedEmployees).toBe(actualPayrollCount);
            expect(typeof result.count).toBe('number');
            expect(Array.isArray(result.types)).toBe(true);

            // Verify consistency when called multiple times
            const result2 = await DashboardService.getPendingApprovalsCount(testData.month, testData.year);
            expect(result2.count).toBe(result.count);
            expect(result2.types).toEqual(result.types);
          }
        ),
        { numRuns: 100 }
      );
    }, 30000);

    test('should maintain consistent structure and data types across all calls', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 10 }), // Number of calls to make
          async (numCalls) => {
            const results = [];

            // Make multiple calls to the service
            for (let i = 0; i < numCalls; i++) {
              const result = await DashboardService.getPendingApprovalsCount();
              results.push(result);
            }

            // Verify all results have the same structure and values
            for (let i = 0; i < results.length; i++) {
              const result = results[i];
              
              // Verify structure
              expect(result).toHaveProperty('count');
              expect(result).toHaveProperty('types');
              
              // Verify data types
              expect(typeof result.count).toBe('number');
              expect(Array.isArray(result.types)).toBe(true);
              
              // Verify non-negative count
              expect(result.count).toBeGreaterThanOrEqual(0);
              
              // Verify consistency across all calls
              if (i > 0) {
                expect(result.count).toBe(results[0].count);
                expect(result.types).toEqual(results[0].types);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    }, 30000);

    test('should handle concurrent calls correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 2, max: 5 }), // Number of concurrent calls
          async (concurrentCalls) => {
            // Make concurrent calls to the service
            const promises = Array(concurrentCalls).fill().map(() => 
              DashboardService.getPendingApprovalsCount()
            );
            
            const results = await Promise.all(promises);

            // Verify all concurrent calls return the same result
            for (let i = 0; i < results.length; i++) {
              const result = results[i];
              
              // Verify structure and types
              expect(result).toHaveProperty('count');
              expect(result).toHaveProperty('types');
              expect(typeof result.count).toBe('number');
              expect(Array.isArray(result.types)).toBe(true);
              expect(result.count).toBeGreaterThanOrEqual(0);
              
              // Verify consistency across concurrent calls
              if (i > 0) {
                expect(result.count).toBe(results[0].count);
                expect(result.types).toEqual(results[0].types);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    }, 30000);

    test('should return valid response structure for future extensibility', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            month: fc.integer({ min: 1, max: 12 }),
            year: fc.integer({ min: 2020, max: 2026 })
          }),
          async (testData) => {
            const result = await DashboardService.getPendingApprovalsCount(testData.month, testData.year);

            // Verify the response structure is ready for future approval types
            expect(result).toHaveProperty('count');
            expect(result).toHaveProperty('types');
            expect(result).toHaveProperty('month');
            expect(result).toHaveProperty('year');
            expect(result).toHaveProperty('totalEmployees');
            expect(result).toHaveProperty('processedEmployees');
            
            // Verify current implementation values
            expect(result.types).toEqual(['payroll']);
            expect(result.month).toBe(testData.month);
            expect(result.year).toBe(testData.year);
            
            // Verify the structure can accommodate future approval workflows
            expect(typeof result.count).toBe('number');
            expect(Array.isArray(result.types)).toBe(true);
            expect(typeof result.totalEmployees).toBe('number');
            expect(typeof result.processedEmployees).toBe('number');
            
            // Verify the count is non-negative (important for UI display)
            expect(result.count).toBeGreaterThanOrEqual(0);
            expect(result.totalEmployees).toBeGreaterThanOrEqual(0);
            expect(result.processedEmployees).toBeGreaterThanOrEqual(0);
            
            // Verify logical consistency
            expect(result.processedEmployees).toBeLessThanOrEqual(result.totalEmployees);
            expect(result.count).toBe(result.totalEmployees - result.processedEmployees);
            
            // Verify types array contains strings
            expect(result.types.every(type => typeof type === 'string')).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    }, 30000);
  });
});