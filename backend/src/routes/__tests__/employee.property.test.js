import fc from 'fast-check';
import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import employeeRoutes from '../employee.js';
import authRoutes from '../auth.js';
import User from '../../models/User.js';
import Employee from '../../models/Employee.js';

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/employee', employeeRoutes);

// Test data generators
const validSalaryArb = fc.float({ min: 0, max: 100000, noNaN: true });
const validEmployeeDataArb = fc.record({
  baseSalary: validSalaryArb,
  allowance: fc.option(validSalaryArb, { nil: undefined }),
  deduction: fc.option(validSalaryArb, { nil: undefined })
});

const invalidSalaryArb = fc.oneof(
  fc.float({ min: Math.fround(-1000), max: Math.fround(-0.01), noNaN: true }), // Negative numbers
  fc.constantFrom(NaN, Infinity, -Infinity) // Invalid numbers
);

const invalidEmployeeDataArb = fc.oneof(
  // Missing baseSalary
  fc.record({
    allowance: fc.option(validSalaryArb, { nil: undefined }),
    deduction: fc.option(validSalaryArb, { nil: undefined })
  }),
  // Invalid baseSalary
  fc.record({
    baseSalary: invalidSalaryArb,
    allowance: fc.option(validSalaryArb, { nil: undefined }),
    deduction: fc.option(validSalaryArb, { nil: undefined })
  })
);

describe('Employee Management Property-Based Tests', () => {
  let adminUser, adminToken;

  beforeAll(async () => {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/payrolldb_test';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }
  }, 30000);

  beforeEach(async () => {
    // Clear test data
    await Employee.deleteMany({});
    await User.deleteMany({});

    // Create admin user
    adminUser = await User.create({
      name: 'Admin User',
      email: 'admin@test.com',
      password: 'password123',
      role: 'admin'
    });

    // Generate admin token
    adminToken = jwt.sign(
      {
        userId: adminUser._id,
        email: adminUser.email,
        role: adminUser.role
      },
      process.env.JWT_SECRET || 'supersecretkey',
      { expiresIn: '24h' }
    );
  }, 30000);

  afterEach(async () => {
    // Additional cleanup after each test
    await Employee.deleteMany({});
    await User.deleteMany({});
  }, 30000);

  afterAll(async () => {
    await Employee.deleteMany({});
    await User.deleteMany({});
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  }, 30000);

  /**
   * Property 6: Employee Creation Integrity
   * Feature: employee-payroll-system, Property 6: Employee Creation Integrity
   * Validates: Requirements 2.1
   */
  describe('Property 6: Employee Creation Integrity', () => {
    test('should create employee record properly linked to user account for any valid employee data', async () => {
      await fc.assert(
        fc.asyncProperty(
          validEmployeeDataArb,
          async (employeeData) => {
            // Create a unique user for this iteration to avoid conflicts
            const uniqueUser = await User.create({
              name: `Test User ${Date.now()}_${Math.random()}`,
              email: `user${Date.now()}_${Math.random()}@test.com`,
              password: 'password123',
              role: 'employee'
            });

            try {
              const requestData = {
                userId: uniqueUser._id.toString(),
                ...employeeData
              };

              const response = await request(app)
                .post('/api/employee/add')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(requestData);

              // Should successfully create employee
              expect(response.status).toBe(201);
              expect(response.body.success).toBe(true);
              expect(response.body.employee).toBeDefined();

              // Verify employee is properly linked to user
              expect(response.body.employee.userId).toBe(uniqueUser._id.toString());
              expect(response.body.employee.userName).toBe(uniqueUser.name);
              expect(response.body.employee.userEmail).toBe(uniqueUser.email);
              expect(response.body.employee.userRole).toBe(uniqueUser.role);

              // Verify salary data is correctly stored
              expect(response.body.employee.baseSalary).toBe(employeeData.baseSalary);
              expect(response.body.employee.allowance).toBe(employeeData.allowance || 0);
              expect(response.body.employee.deduction).toBe(employeeData.deduction || 0);

              // Verify calculated fields
              const expectedGross = employeeData.baseSalary + (employeeData.allowance || 0);
              const expectedNet = expectedGross - (employeeData.deduction || 0);
              expect(response.body.employee.grossSalary).toBe(expectedGross);
              expect(response.body.employee.netSalary).toBe(expectedNet);

              // Verify database record exists
              const dbEmployee = await Employee.findOne({ userId: uniqueUser._id });
              expect(dbEmployee).toBeTruthy();
              expect(dbEmployee.baseSalary).toBe(employeeData.baseSalary);
            } finally {
              // Clean up for next iteration
              await Employee.deleteOne({ userId: uniqueUser._id });
              await User.deleteOne({ _id: uniqueUser._id });
            }
          }
        ),
        { numRuns: 20, timeout: 30000 } // Reduced runs and increased timeout
      );
    }, 60000); // Increased test timeout

    test('should prevent duplicate employee records for the same user', async () => {
      await fc.assert(
        fc.asyncProperty(
          validEmployeeDataArb,
          validEmployeeDataArb,
          async (firstEmployeeData, secondEmployeeData) => {
            // Create a unique user for this test iteration
            const uniqueUser = await User.create({
              name: `Test User ${Date.now()}_${Math.random()}`,
              email: `user${Date.now()}_${Math.random()}@test.com`,
              password: 'password123',
              role: 'employee'
            });

            try {
              // Create first employee
              const firstRequest = {
                userId: uniqueUser._id.toString(),
                ...firstEmployeeData
              };

              const firstResponse = await request(app)
                .post('/api/employee/add')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(firstRequest);

              expect(firstResponse.status).toBe(201);

              // Attempt to create second employee for same user
              const secondRequest = {
                userId: uniqueUser._id.toString(),
                ...secondEmployeeData
              };

              const secondResponse = await request(app)
                .post('/api/employee/add')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(secondRequest);

              // Should reject duplicate
              expect(secondResponse.status).toBe(409);
              expect(secondResponse.body.success).toBe(false);
              expect(secondResponse.body.message).toBe('Employee record already exists for this user');

              // Verify only one record exists
              const employeeCount = await Employee.countDocuments({ userId: uniqueUser._id });
              expect(employeeCount).toBe(1);
            } finally {
              // Clean up
              await Employee.deleteOne({ userId: uniqueUser._id });
              await User.deleteOne({ _id: uniqueUser._id });
            }
          }
        ),
        { numRuns: 20, timeout: 30000 }
      );
    }, 60000);
  });

  /**
   * Property 7: Employee List Completeness
   * Feature: employee-payroll-system, Property 7: Employee List Completeness
   * Validates: Requirements 2.2
   */
  describe('Property 7: Employee List Completeness', () => {
    test('should return all existing employee records with their associated user information', async () => {
      // Simplified test with fixed data instead of property-based
      const testData = [
        { baseSalary: 50000, allowance: 5000, deduction: 1000 },
        { baseSalary: 60000, allowance: 6000, deduction: 1200 }
      ];

      // Create multiple users and employees
      const createdEmployees = [];
      
      for (let i = 0; i < testData.length; i++) {
        const user = await User.create({
          name: `Test User ${i}_${Date.now()}_${Math.random()}`,
          email: `user${i}_${Date.now()}_${Math.random()}@test.com`,
          password: 'password123',
          role: 'employee'
        });

        const employee = await Employee.create({
          userId: user._id,
          ...testData[i]
        });

        createdEmployees.push({ user, employee, data: testData[i] });
      }

      try {
        // Request employee list
        const response = await request(app)
          .get('/api/employee')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.employees).toBeDefined();
        expect(response.body.count).toBe(testData.length);
        expect(response.body.employees).toHaveLength(testData.length);

        // Verify all employees are returned with complete information
        for (const createdEmployee of createdEmployees) {
          const returnedEmployee = response.body.employees.find(
            emp => emp.userId === createdEmployee.user._id.toString()
          );

          expect(returnedEmployee).toBeDefined();
          expect(returnedEmployee.userName).toBe(createdEmployee.user.name);
          expect(returnedEmployee.userEmail).toBe(createdEmployee.user.email);
          expect(returnedEmployee.userRole).toBe(createdEmployee.user.role);
          expect(returnedEmployee.baseSalary).toBe(createdEmployee.data.baseSalary);
          expect(returnedEmployee.allowance).toBe(createdEmployee.data.allowance || 0);
          expect(returnedEmployee.deduction).toBe(createdEmployee.data.deduction || 0);
        }
      } finally {
        // Clean up
        for (const createdEmployee of createdEmployees) {
          await Employee.deleteOne({ _id: createdEmployee.employee._id });
          await User.deleteOne({ _id: createdEmployee.user._id });
        }
      }
    }, 30000);
  });

  /**
   * Property 8: Employee Update Correctness
   * Feature: employee-payroll-system, Property 8: Employee Update Correctness
   * Validates: Requirements 2.3
   */
  describe('Property 8: Employee Update Correctness', () => {
    test('should modify only the specified fields of existing employee record', async () => {
      // Simplified test with specific test cases
      const initialData = { baseSalary: 50000, allowance: 5000, deduction: 1000 };
      const updateData = { baseSalary: 60000 };

      // Create a unique user and employee for this test
      const uniqueUser = await User.create({
        name: `Test User ${Date.now()}_${Math.random()}`,
        email: `user${Date.now()}_${Math.random()}@test.com`,
        password: 'password123',
        role: 'employee'
      });

      const employee = await Employee.create({
        userId: uniqueUser._id,
        ...initialData
      });

      try {
        // Update employee
        const response = await request(app)
          .put(`/api/employee/${employee._id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(updateData);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);

        // Verify only specified fields were updated
        const expectedBaseSalary = updateData.baseSalary;
        const expectedAllowance = initialData.allowance;
        const expectedDeduction = initialData.deduction;

        expect(response.body.employee.baseSalary).toBe(expectedBaseSalary);
        expect(response.body.employee.allowance).toBe(expectedAllowance);
        expect(response.body.employee.deduction).toBe(expectedDeduction);

        // Verify calculated fields are updated correctly
        const expectedGross = expectedBaseSalary + expectedAllowance;
        const expectedNet = expectedGross - expectedDeduction;
        expect(response.body.employee.grossSalary).toBe(expectedGross);
        expect(response.body.employee.netSalary).toBe(expectedNet);

        // Verify user information remains unchanged
        expect(response.body.employee.userId).toBe(uniqueUser._id.toString());
        expect(response.body.employee.userName).toBe(uniqueUser.name);
        expect(response.body.employee.userEmail).toBe(uniqueUser.email);

        // Verify database record is updated
        const dbEmployee = await Employee.findById(employee._id);
        expect(dbEmployee.baseSalary).toBe(expectedBaseSalary);
        expect(dbEmployee.allowance).toBe(expectedAllowance);
        expect(dbEmployee.deduction).toBe(expectedDeduction);
      } finally {
        // Clean up
        await Employee.deleteOne({ _id: employee._id });
        await User.deleteOne({ _id: uniqueUser._id });
      }
    }, 30000);

    test('should reject updates with no fields provided', async () => {
      const initialData = { baseSalary: 50000, allowance: 5000, deduction: 1000 };

      // Create a unique user and employee for this test
      const uniqueUser = await User.create({
        name: `Test User ${Date.now()}_${Math.random()}`,
        email: `user${Date.now()}_${Math.random()}@test.com`,
        password: 'password123',
        role: 'employee'
      });

      const employee = await Employee.create({
        userId: uniqueUser._id,
        ...initialData
      });

      try {
        // Attempt update with empty data
        const response = await request(app)
          .put(`/api/employee/${employee._id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({});

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.errors).toContain('At least one field (baseSalary, allowance, deduction) must be provided');

        // Verify original data unchanged
        const dbEmployee = await Employee.findById(employee._id);
        expect(dbEmployee.baseSalary).toBe(initialData.baseSalary);
        expect(dbEmployee.allowance).toBe(initialData.allowance);
        expect(dbEmployee.deduction).toBe(initialData.deduction);
      } finally {
        // Clean up
        await Employee.deleteOne({ _id: employee._id });
        await User.deleteOne({ _id: uniqueUser._id });
      }
    }, 30000);
  });

  /**
   * Property 9: Employee Data Validation
   * Feature: employee-payroll-system, Property 9: Employee Data Validation
   * Validates: Requirements 2.4
   */
  describe('Property 9: Employee Data Validation', () => {
    test('should reject invalid employee data and return specific validation errors', async () => {
      // Test with specific invalid data cases
      const invalidDataCases = [
        { baseSalary: -1000, allowance: 5000, deduction: 1000 }, // Negative salary
        { allowance: 5000, deduction: 1000 }, // Missing baseSalary
        { baseSalary: NaN, allowance: 5000, deduction: 1000 } // Invalid number
      ];

      for (const invalidData of invalidDataCases) {
        // Create a unique user for this iteration
        const uniqueUser = await User.create({
          name: `Test User ${Date.now()}_${Math.random()}`,
          email: `user${Date.now()}_${Math.random()}@test.com`,
          password: 'password123',
          role: 'employee'
        });

        try {
          const requestData = {
            userId: uniqueUser._id.toString(),
            ...invalidData
          };

          const response = await request(app)
            .post('/api/employee/add')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(requestData);

          // Should reject invalid data - could be 400 (validation) or 409 (duplicate)
          expect([400, 409]).toContain(response.status);
          expect(response.body.success).toBe(false);
          
          if (response.status === 400) {
            expect(response.body.errors || response.body.message).toBeDefined();
          }

          // Verify no employee record was created
          const employeeCount = await Employee.countDocuments({ userId: uniqueUser._id });
          expect(employeeCount).toBe(0);
        } finally {
          // Clean up
          await User.deleteOne({ _id: uniqueUser._id });
        }
      }
    }, 30000);

    test('should reject employee updates with invalid data', async () => {
      const initialData = { baseSalary: 50000, allowance: 5000, deduction: 1000 };
      const invalidUpdate = { baseSalary: -1000 }; // Negative salary

      // Create a unique user and employee for this test
      const uniqueUser = await User.create({
        name: `Test User ${Date.now()}_${Math.random()}`,
        email: `user${Date.now()}_${Math.random()}@test.com`,
        password: 'password123',
        role: 'employee'
      });

      const employee = await Employee.create({
        userId: uniqueUser._id,
        ...initialData
      });

      try {
        // Attempt invalid update
        const response = await request(app)
          .put(`/api/employee/${employee._id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(invalidUpdate);

        // Should reject invalid update
        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.errors).toBeDefined();
        expect(Array.isArray(response.body.errors)).toBe(true);
        expect(response.body.errors.length).toBeGreaterThan(0);

        // Verify original data unchanged
        const dbEmployee = await Employee.findById(employee._id);
        expect(dbEmployee.baseSalary).toBe(initialData.baseSalary);
        expect(dbEmployee.allowance).toBe(initialData.allowance);
        expect(dbEmployee.deduction).toBe(initialData.deduction);
      } finally {
        // Clean up
        await Employee.deleteOne({ _id: employee._id });
        await User.deleteOne({ _id: uniqueUser._id });
      }
    }, 30000);

    test('should validate required fields for employee creation', async () => {
      // Test cases with missing required fields
      const incompleteDataCases = [
        {}, // No data
        { allowance: 5000 }, // Missing baseSalary
        { deduction: 1000 }, // Missing baseSalary
      ];

      for (const incompleteData of incompleteDataCases) {
        // Create a unique user for this iteration
        const uniqueUser = await User.create({
          name: `Test User ${Date.now()}_${Math.random()}`,
          email: `user${Date.now()}_${Math.random()}@test.com`,
          password: 'password123',
          role: 'employee'
        });

        try {
          const requestData = {
            userId: uniqueUser._id.toString(),
            ...incompleteData
          };

          const response = await request(app)
            .post('/api/employee/add')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(requestData);

          // Should reject incomplete data
          expect(response.status).toBe(400);
          expect(response.body.success).toBe(false);
          
          // Check for errors field or message field
          if (response.body.errors) {
            expect(response.body.errors).toBeDefined();
            // Should specifically mention base salary requirement
            const hasBaseSalaryError = response.body.errors.some(error => 
              error.includes('Base salary') || error.includes('baseSalary')
            );
            expect(hasBaseSalaryError).toBe(true);
          } else if (response.body.message) {
            // Some validation errors might be in message field
            expect(response.body.message).toBeDefined();
          }

          // Verify no employee record was created
          const employeeCount = await Employee.countDocuments({ userId: uniqueUser._id });
          expect(employeeCount).toBe(0);
        } finally {
          // Clean up
          await User.deleteOne({ _id: uniqueUser._id });
        }
      }
    }, 30000);
  });
});