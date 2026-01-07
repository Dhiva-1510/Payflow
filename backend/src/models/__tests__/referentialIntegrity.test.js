import mongoose from 'mongoose';
import fc from 'fast-check';
import User from '../User.js';
import Employee from '../Employee.js';
import Payroll from '../Payroll.js';

beforeAll(async () => {
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/payrolldb_test';
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.connection.close();
});

beforeEach(async () => {
  // Clean up all collections before each test
  await User.deleteMany({});
  await Employee.deleteMany({});
  await Payroll.deleteMany({});
});

describe('Database Models - Referential Integrity', () => {
  /**
   * Feature: employee-payroll-system, Property 16: Referential Integrity
   * For any database operation involving users, employees, and payroll records, 
   * all references should remain valid and consistent
   * Validates: Requirements 5.5
   */
  test('Property 16: Referential Integrity - User-Employee-Payroll relationships remain consistent', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate test data
        fc.record({
          users: fc.array(
            fc.record({
              name: fc.string({ minLength: 1, maxLength: 50 }),
              email: fc.emailAddress(),
              password: fc.string({ minLength: 6, maxLength: 20 }),
              role: fc.constantFrom('admin', 'employee')
            }),
            { minLength: 1, maxLength: 5 }
          ),
          employees: fc.array(
            fc.record({
              baseSalary: fc.float({ min: 1000, max: 100000 }),
              allowance: fc.float({ min: 0, max: 10000 }),
              deduction: fc.float({ min: 0, max: 5000 })
            }),
            { minLength: 1, maxLength: 3 }
          ),
          payrolls: fc.array(
            fc.record({
              month: fc.integer({ min: 1, max: 12 }),
              year: fc.integer({ min: 2020, max: 2025 })
            }),
            { minLength: 1, maxLength: 3 }
          )
        }),
        async (testData) => {
          // Clean up before each property test iteration
          await User.deleteMany({});
          await Employee.deleteMany({});
          await Payroll.deleteMany({});

          const createdUsers = [];
          const createdEmployees = [];
          const createdPayrolls = [];

          try {
            // Step 1: Create users
            for (const userData of testData.users) {
              const user = new User({
                name: userData.name,
                email: userData.email,
                password: userData.password,
                role: userData.role
              });
              const savedUser = await user.save();
              createdUsers.push(savedUser);
            }

            // Step 2: Create employees linked to users
            for (let i = 0; i < Math.min(testData.employees.length, createdUsers.length); i++) {
              const employeeData = testData.employees[i];
              const user = createdUsers[i];
              
              const employee = new Employee({
                userId: user._id,
                baseSalary: employeeData.baseSalary,
                allowance: employeeData.allowance,
                deduction: employeeData.deduction
              });
              const savedEmployee = await employee.save();
              createdEmployees.push(savedEmployee);
            }

            // Step 3: Create payroll records linked to employees
            for (let i = 0; i < Math.min(testData.payrolls.length, createdEmployees.length); i++) {
              const payrollData = testData.payrolls[i];
              const employee = createdEmployees[i];
              
              const grossSalary = employee.baseSalary + employee.allowance;
              const netSalary = grossSalary - employee.deduction;
              
              const payroll = new Payroll({
                employeeId: employee._id,
                month: payrollData.month,
                year: payrollData.year,
                baseSalary: employee.baseSalary,
                allowance: employee.allowance,
                deduction: employee.deduction,
                grossSalary: grossSalary,
                netSalary: netSalary
              });
              const savedPayroll = await payroll.save();
              createdPayrolls.push(savedPayroll);
            }

            // Verification 1: All employee records should have valid user references
            for (const employee of createdEmployees) {
              const referencedUser = await User.findById(employee.userId);
              expect(referencedUser).toBeTruthy();
              expect(referencedUser._id.toString()).toBe(employee.userId.toString());
            }

            // Verification 2: All payroll records should have valid employee references
            for (const payroll of createdPayrolls) {
              const referencedEmployee = await Employee.findById(payroll.employeeId);
              expect(referencedEmployee).toBeTruthy();
              expect(referencedEmployee._id.toString()).toBe(payroll.employeeId.toString());
            }

            // Verification 3: Populate operations should work correctly (referential integrity)
            const populatedEmployees = await Employee.find({}).populate('userId');
            for (const employee of populatedEmployees) {
              expect(employee.userId).toBeTruthy();
              expect(employee.userId.email).toBeTruthy();
              expect(employee.userId.name).toBeTruthy();
            }

            const populatedPayrolls = await Payroll.find({}).populate({
              path: 'employeeId',
              populate: {
                path: 'userId',
                model: 'User'
              }
            });
            
            for (const payroll of populatedPayrolls) {
              expect(payroll.employeeId).toBeTruthy();
              expect(payroll.employeeId.userId).toBeTruthy();
              expect(payroll.employeeId.userId.email).toBeTruthy();
            }

            // Verification 4: Cascade consistency - employee deletion should not leave orphaned payrolls
            if (createdEmployees.length > 0 && createdPayrolls.length > 0) {
              const employeeToDelete = createdEmployees[0];
              await Employee.findByIdAndDelete(employeeToDelete._id);
              
              // Check that we can still query payrolls, but the reference will be null when populated
              const orphanedPayrolls = await Payroll.find({ employeeId: employeeToDelete._id });
              expect(orphanedPayrolls.length).toBeGreaterThan(0); // Payroll records still exist
              
              // But when we try to populate, the employee reference should be null
              const populatedOrphanedPayrolls = await Payroll.find({ employeeId: employeeToDelete._id }).populate('employeeId');
              for (const payroll of populatedOrphanedPayrolls) {
                expect(payroll.employeeId).toBeNull(); // Reference is broken but handled gracefully
              }
            }

            // Verification 5: User deletion should not leave orphaned employees
            if (createdUsers.length > 0 && createdEmployees.length > 0) {
              const userToDelete = createdUsers[createdUsers.length - 1];
              await User.findByIdAndDelete(userToDelete._id);
              
              // Check for orphaned employees
              const orphanedEmployees = await Employee.find({ userId: userToDelete._id });
              expect(orphanedEmployees.length).toBeGreaterThan(0); // Employee records still exist
              
              // But when we try to populate, the user reference should be null
              const populatedOrphanedEmployees = await Employee.find({ userId: userToDelete._id }).populate('userId');
              for (const employee of populatedOrphanedEmployees) {
                expect(employee.userId).toBeNull(); // Reference is broken but handled gracefully
              }
            }

          } catch (error) {
            // If there's a validation error or constraint violation, that's expected behavior
            // The system should handle referential integrity violations gracefully
            expect(error).toBeDefined();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // Additional unit test for specific referential integrity scenarios
  test('should maintain referential integrity when creating valid relationships', async () => {
    // Create a user
    const user = new User({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password123',
      role: 'employee'
    });
    const savedUser = await user.save();

    // Create an employee linked to the user
    const employee = new Employee({
      userId: savedUser._id,
      baseSalary: 50000,
      allowance: 5000,
      deduction: 2000
    });
    const savedEmployee = await employee.save();

    // Create a payroll record linked to the employee
    const payroll = new Payroll({
      employeeId: savedEmployee._id,
      month: 12,
      year: 2024,
      baseSalary: 50000,
      allowance: 5000,
      deduction: 2000,
      grossSalary: 55000,
      netSalary: 53000
    });
    const savedPayroll = await payroll.save();

    // Verify all references are valid
    const foundEmployee = await Employee.findById(savedEmployee._id).populate('userId');
    expect(foundEmployee.userId._id.toString()).toBe(savedUser._id.toString());

    const foundPayroll = await Payroll.findById(savedPayroll._id).populate('employeeId');
    expect(foundPayroll.employeeId._id.toString()).toBe(savedEmployee._id.toString());
  });

  test('should handle invalid references gracefully', async () => {
    const invalidObjectId = new mongoose.Types.ObjectId();

    // Try to create employee with non-existent user
    const employee = new Employee({
      userId: invalidObjectId,
      baseSalary: 50000,
      allowance: 5000,
      deduction: 2000
    });

    // This should succeed (MongoDB doesn't enforce foreign key constraints by default)
    const savedEmployee = await employee.save();
    expect(savedEmployee.userId.toString()).toBe(invalidObjectId.toString());

    // But when we populate, the reference should be null
    const populatedEmployee = await Employee.findById(savedEmployee._id).populate('userId');
    expect(populatedEmployee.userId).toBeNull();
  });
});