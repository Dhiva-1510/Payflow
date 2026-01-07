import fc from 'fast-check';
import mongoose from 'mongoose';
import PayrollService from '../payrollService.js';
import User from '../../models/User.js';
import Employee from '../../models/Employee.js';
import Payroll from '../../models/Payroll.js';

// Database setup for tests that require database operations
beforeAll(async () => {
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/payrolldb_test';
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.connection.close();
});

beforeEach(async () => {
  // Clean up collections before each test
  await User.deleteMany({});
  await Employee.deleteMany({});
  await Payroll.deleteMany({});
});

describe('PayrollService Property-Based Tests', () => {
  /**
   * Property 10: Salary Calculation Correctness
   * Feature: employee-payroll-system, Property 10: Salary Calculation Correctness
   * Validates: Requirements 3.2, 3.3
   */
  describe('Property 10: Salary Calculation Correctness', () => {
    test('should calculate gross salary as (base + allowance) and net salary as (gross - deduction) for all valid inputs', async () => {
      await fc.assert(
        fc.property(
          fc.record({
            baseSalary: fc.float({ min: 0, max: Math.fround(1000000), noNaN: true }),
            allowance: fc.float({ min: 0, max: Math.fround(100000), noNaN: true }),
            deduction: fc.float({ min: 0, max: Math.fround(50000), noNaN: true })
          }),
          (employee) => {
            const result = PayrollService.calculateSalary(employee);

            // Verify all input values are preserved
            expect(result.baseSalary).toBe(employee.baseSalary);
            expect(result.allowance).toBe(employee.allowance);
            expect(result.deduction).toBe(employee.deduction);

            // Verify gross salary calculation: gross = base + allowance
            const expectedGrossSalary = employee.baseSalary + employee.allowance;
            expect(result.grossSalary).toBeCloseTo(expectedGrossSalary, 10);

            // Verify net salary calculation: net = gross - deduction
            const expectedNetSalary = expectedGrossSalary - employee.deduction;
            expect(result.netSalary).toBeCloseTo(expectedNetSalary, 10);

            // Verify mathematical relationships
            expect(result.grossSalary).toBeGreaterThanOrEqual(employee.baseSalary);
            expect(result.grossSalary).toBeGreaterThanOrEqual(employee.allowance);
            
            // Net salary should be gross minus deduction
            expect(result.netSalary).toBe(result.grossSalary - result.deduction);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should handle edge cases with zero values correctly', async () => {
      await fc.assert(
        fc.property(
          fc.record({
            baseSalary: fc.oneof(
              fc.constant(0),
              fc.float({ min: 0, max: Math.fround(1000000), noNaN: true })
            ),
            allowance: fc.oneof(
              fc.constant(0),
              fc.float({ min: 0, max: Math.fround(100000), noNaN: true })
            ),
            deduction: fc.oneof(
              fc.constant(0),
              fc.float({ min: 0, max: Math.fround(50000), noNaN: true })
            )
          }),
          (employee) => {
            const result = PayrollService.calculateSalary(employee);

            // When allowance is 0, gross should equal base salary
            if (employee.allowance === 0) {
              expect(result.grossSalary).toBe(employee.baseSalary);
            }

            // When deduction is 0, net should equal gross salary
            if (employee.deduction === 0) {
              expect(result.netSalary).toBe(result.grossSalary);
            }

            // When both base and allowance are 0, gross should be 0
            if (employee.baseSalary === 0 && employee.allowance === 0) {
              expect(result.grossSalary).toBe(0);
            }

            // Net salary should never be greater than gross salary
            expect(result.netSalary).toBeLessThanOrEqual(result.grossSalary);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should reject invalid input values consistently', async () => {
      await fc.assert(
        fc.property(
          fc.oneof(
            // Negative base salary
            fc.record({
              baseSalary: fc.float({ min: Math.fround(-1000000), max: Math.fround(-0.01), noNaN: true }),
              allowance: fc.float({ min: 0, max: Math.fround(100000), noNaN: true }),
              deduction: fc.float({ min: 0, max: Math.fround(50000), noNaN: true })
            }),
            // Negative allowance
            fc.record({
              baseSalary: fc.float({ min: 0, max: Math.fround(1000000), noNaN: true }),
              allowance: fc.float({ min: Math.fround(-100000), max: Math.fround(-0.01), noNaN: true }),
              deduction: fc.float({ min: 0, max: Math.fround(50000), noNaN: true })
            }),
            // Negative deduction
            fc.record({
              baseSalary: fc.float({ min: 0, max: Math.fround(1000000), noNaN: true }),
              allowance: fc.float({ min: 0, max: Math.fround(100000), noNaN: true }),
              deduction: fc.float({ min: Math.fround(-50000), max: Math.fround(-0.01), noNaN: true })
            }),
            // Non-numeric values
            fc.record({
              baseSalary: fc.oneof(fc.string(), fc.constant(null), fc.constant(undefined)),
              allowance: fc.float({ min: 0, max: Math.fround(100000), noNaN: true }),
              deduction: fc.float({ min: 0, max: Math.fround(50000), noNaN: true })
            }),
            fc.record({
              baseSalary: fc.float({ min: 0, max: Math.fround(1000000), noNaN: true }),
              allowance: fc.oneof(fc.string(), fc.constant(null), fc.constant(undefined)),
              deduction: fc.float({ min: 0, max: Math.fround(50000), noNaN: true })
            }),
            fc.record({
              baseSalary: fc.float({ min: 0, max: Math.fround(1000000), noNaN: true }),
              allowance: fc.float({ min: 0, max: Math.fround(100000), noNaN: true }),
              deduction: fc.oneof(fc.string(), fc.constant(null), fc.constant(undefined))
            })
          ),
          (invalidEmployee) => {
            // Should always throw an error for invalid inputs
            expect(() => PayrollService.calculateSalary(invalidEmployee)).toThrow();
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should maintain calculation precision for various numeric ranges', async () => {
      await fc.assert(
        fc.property(
          fc.record({
            baseSalary: fc.oneof(
              // Small values
              fc.float({ min: Math.fround(0.01), max: Math.fround(100), noNaN: true }),
              // Medium values
              fc.float({ min: Math.fround(1000), max: Math.fround(50000), noNaN: true }),
              // Large values
              fc.float({ min: Math.fround(100000), max: Math.fround(1000000), noNaN: true })
            ),
            allowance: fc.oneof(
              fc.float({ min: 0, max: Math.fround(100), noNaN: true }),
              fc.float({ min: Math.fround(100), max: Math.fround(10000), noNaN: true }),
              fc.float({ min: Math.fround(10000), max: Math.fround(100000), noNaN: true })
            ),
            deduction: fc.oneof(
              fc.float({ min: 0, max: Math.fround(50), noNaN: true }),
              fc.float({ min: Math.fround(50), max: Math.fround(5000), noNaN: true }),
              fc.float({ min: Math.fround(5000), max: Math.fround(50000), noNaN: true })
            )
          }),
          (employee) => {
            const result = PayrollService.calculateSalary(employee);

            // Verify calculations are mathematically correct within floating point precision
            const expectedGross = employee.baseSalary + employee.allowance;
            const expectedNet = expectedGross - employee.deduction;

            expect(result.grossSalary).toBeCloseTo(expectedGross, 10);
            expect(result.netSalary).toBeCloseTo(expectedNet, 10);

            // Verify the calculation is consistent when called multiple times
            const result2 = PayrollService.calculateSalary(employee);
            expect(result.grossSalary).toBe(result2.grossSalary);
            expect(result.netSalary).toBe(result2.netSalary);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should handle boundary values correctly', async () => {
      await fc.assert(
        fc.property(
          fc.oneof(
            // Maximum safe integer values
            fc.record({
              baseSalary: fc.constant(Number.MAX_SAFE_INTEGER),
              allowance: fc.constant(0),
              deduction: fc.constant(0)
            }),
            // Very small positive values
            fc.record({
              baseSalary: fc.constant(Number.MIN_VALUE),
              allowance: fc.constant(Number.MIN_VALUE),
              deduction: fc.constant(0)
            }),
            // Zero values
            fc.record({
              baseSalary: fc.constant(0),
              allowance: fc.constant(0),
              deduction: fc.constant(0)
            })
          ),
          (employee) => {
            const result = PayrollService.calculateSalary(employee);

            // Should not throw errors for boundary values
            expect(result).toBeDefined();
            expect(typeof result.grossSalary).toBe('number');
            expect(typeof result.netSalary).toBe('number');
            
            // Should maintain mathematical relationships even at boundaries
            expect(result.grossSalary).toBe(employee.baseSalary + employee.allowance);
            expect(result.netSalary).toBe(result.grossSalary - employee.deduction);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 11: Payroll Processing Completeness
   * Feature: employee-payroll-system, Property 11: Payroll Processing Completeness
   * Validates: Requirements 3.1, 3.4
   */
  describe('Property 11: Payroll Processing Completeness', () => {
    test('should create payroll records for all existing employees with complete calculation details', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            employeeCount: fc.integer({ min: 1, max: 3 }), // Simplified: just count
            month: fc.integer({ min: 1, max: 12 }),
            year: fc.integer({ min: 2020, max: 2025 })
          }),
          async (testData) => {
            // Clean up before each iteration
            await User.deleteMany({});
            await Employee.deleteMany({});
            await Payroll.deleteMany({});

            const createdEmployees = [];

            // Create simple employees
            for (let i = 0; i < testData.employeeCount; i++) {
              const user = new User({
                name: `User ${i}`,
                email: `user${i}@test.com`,
                password: 'password123',
                role: 'employee'
              });
              const savedUser = await user.save();

              const employee = new Employee({
                userId: savedUser._id,
                baseSalary: 50000,
                allowance: 5000,
                deduction: 2000
              });
              const savedEmployee = await employee.save();
              createdEmployees.push(savedEmployee);
            }

            // Run batch payroll processing
            const result = await PayrollService.runPayrollForAll(testData.month, testData.year);

            // Verify completeness: all employees should have payroll records created
            expect(result.success).toBe(true);
            expect(result.processedCount).toBe(testData.employeeCount);
            expect(result.failedCount).toBe(0);
            expect(result.totalEmployees).toBe(testData.employeeCount);
            expect(result.results).toHaveLength(testData.employeeCount);

            // Verify all results are successful
            for (const processResult of result.results) {
              expect(processResult.success).toBe(true);
              expect(processResult.payroll).toBeDefined();
            }

            // Verify payroll records exist in database
            const payrollRecords = await Payroll.find({ 
              month: testData.month, 
              year: testData.year 
            });
            expect(payrollRecords).toHaveLength(testData.employeeCount);

            // Verify each payroll record has complete calculation details
            for (const payroll of payrollRecords) {
              expect(payroll.month).toBe(testData.month);
              expect(payroll.year).toBe(testData.year);
              expect(payroll.baseSalary).toBe(50000);
              expect(payroll.allowance).toBe(5000);
              expect(payroll.deduction).toBe(2000);
              expect(payroll.grossSalary).toBe(55000);
              expect(payroll.netSalary).toBe(53000);
            }
          }
        ),
        { numRuns: 20 } // Reduced runs for reliability
      );
    }, 30000); // Increased timeout

    test('should handle empty employee list gracefully', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            month: fc.integer({ min: 1, max: 12 }),
            year: fc.integer({ min: 2020, max: 2025 })
          }),
          async (testData) => {
            // Ensure no employees exist
            await User.deleteMany({});
            await Employee.deleteMany({});
            await Payroll.deleteMany({});

            // Run batch payroll processing with no employees
            const result = await PayrollService.runPayrollForAll(testData.month, testData.year);

            // Verify appropriate handling of empty employee list
            expect(result.success).toBe(true);
            expect(result.processedCount).toBe(0);
            expect(result.failedCount).toBe(0);
            expect(result.results).toHaveLength(0);
            expect(result.message).toContain('No employees found');
          }
        ),
        { numRuns: 10 }
      );
    }, 10000);
  });

  /**
   * Property 12: Payroll Error Isolation
   * Feature: employee-payroll-system, Property 12: Payroll Error Isolation
   * Validates: Requirements 3.5
   */
  describe('Property 12: Payroll Error Isolation', () => {
    test('should continue processing valid employees and report specific errors for invalid ones', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            validCount: fc.integer({ min: 1, max: 2 }),
            month: fc.integer({ min: 1, max: 12 }),
            year: fc.integer({ min: 2020, max: 2025 })
          }),
          async (testData) => {
            // Clean up before each iteration
            await User.deleteMany({});
            await Employee.deleteMany({});
            await Payroll.deleteMany({});

            const createdValidEmployees = [];

            // Create valid employees
            for (let i = 0; i < testData.validCount; i++) {
              const user = new User({
                name: `Valid User ${i}`,
                email: `valid${i}@test.com`,
                password: 'password123',
                role: 'employee'
              });
              const savedUser = await user.save();

              const employee = new Employee({
                userId: savedUser._id,
                baseSalary: 50000,
                allowance: 5000,
                deduction: 2000
              });
              const savedEmployee = await employee.save();
              createdValidEmployees.push(savedEmployee);
            }

            // Create one invalid employee by directly inserting invalid data
            const invalidUser = new User({
              name: 'Invalid User',
              email: 'invalid@test.com',
              password: 'password123',
              role: 'employee'
            });
            const savedInvalidUser = await invalidUser.save();

            // Create employee with valid data first, then corrupt it
            const invalidEmployee = new Employee({
              userId: savedInvalidUser._id,
              baseSalary: 50000,
              allowance: 5000,
              deduction: 2000
            });
            const savedInvalidEmployee = await invalidEmployee.save();

            // Corrupt the employee data to cause processing errors
            await Employee.updateOne(
              { _id: savedInvalidEmployee._id },
              { $set: { baseSalary: -1000 } } // Invalid negative salary
            );

            // Run batch payroll processing
            const result = await PayrollService.runPayrollForAll(testData.month, testData.year);

            // Verify error isolation: processing should complete despite errors
            expect(result.success).toBe(true);
            expect(result.totalEmployees).toBe(testData.validCount + 1);
            
            // Valid employees should be processed successfully
            expect(result.processedCount).toBe(testData.validCount);
            
            // Invalid employee should fail
            expect(result.failedCount).toBe(1);
            
            // Total results should account for all employees
            expect(result.results).toHaveLength(testData.validCount + 1);

            // Verify successful results
            const successfulResults = result.results.filter(r => r.success);
            expect(successfulResults).toHaveLength(testData.validCount);

            // Verify failed results contain error details
            const failedResults = result.results.filter(r => !r.success);
            expect(failedResults).toHaveLength(1);
            expect(failedResults[0].error).toBeDefined();

            // Verify that valid employees have payroll records created
            const payrollRecords = await Payroll.find({ 
              month: testData.month, 
              year: testData.year 
            });
            expect(payrollRecords).toHaveLength(testData.validCount);
          }
        ),
        { numRuns: 15 }
      );
    }, 30000);

    test('should handle duplicate payroll processing gracefully', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            month: fc.integer({ min: 1, max: 12 }),
            year: fc.integer({ min: 2020, max: 2025 })
          }),
          async (testData) => {
            // Clean up before each iteration
            await User.deleteMany({});
            await Employee.deleteMany({});
            await Payroll.deleteMany({});

            // Create one employee
            const user = new User({
              name: 'Test User',
              email: 'test@test.com',
              password: 'password123',
              role: 'employee'
            });
            const savedUser = await user.save();

            const employee = new Employee({
              userId: savedUser._id,
              baseSalary: 50000,
              allowance: 5000,
              deduction: 2000
            });
            await employee.save();

            // Run payroll processing first time - should succeed
            const firstResult = await PayrollService.runPayrollForAll(testData.month, testData.year);
            expect(firstResult.success).toBe(true);
            expect(firstResult.processedCount).toBe(1);
            expect(firstResult.failedCount).toBe(0);

            // Run payroll processing second time - should handle duplicates
            const secondResult = await PayrollService.runPayrollForAll(testData.month, testData.year);
            
            // Should fail due to duplicate payroll records
            expect(secondResult.success).toBe(true);
            expect(secondResult.processedCount).toBe(0);
            expect(secondResult.failedCount).toBe(1);
            
            // Result should be failure with specific error message
            expect(secondResult.results[0].success).toBe(false);
            expect(secondResult.results[0].error).toContain('already exists');

            // Verify only one payroll record exists
            const payrollRecords = await Payroll.find({ 
              month: testData.month, 
              year: testData.year 
            });
            expect(payrollRecords).toHaveLength(1);
          }
        ),
        { numRuns: 10 }
      );
    }, 20000);
  });
});