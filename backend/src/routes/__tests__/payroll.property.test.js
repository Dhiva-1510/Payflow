import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import fc from 'fast-check';
import payrollRoutes from '../payroll.js';
import authRoutes from '../auth.js';
import employeeRoutes from '../employee.js';
import User from '../../models/User.js';
import Employee from '../../models/Employee.js';
import Payroll from '../../models/Payroll.js';

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/employee', employeeRoutes);
app.use('/api/payroll', payrollRoutes);

// Test database connection
beforeAll(async () => {
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/payrolldb_test';
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(mongoUri);
  }
});

afterAll(async () => {
  await mongoose.connection.close();
});

beforeEach(async () => {
  // Clear test data
  await User.deleteMany({});
  await Employee.deleteMany({});
  await Payroll.deleteMany({});
});

describe('Payroll Access Property-Based Tests', () => {

  // Helper function to create test users and employees
  const createTestData = async (numEmployees = 2) => {
    // Clear existing data first
    await User.deleteMany({});
    await Employee.deleteMany({});
    await Payroll.deleteMany({});

    const users = [];
    const employees = [];
    const tokens = [];
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(7);

    // Create admin user
    const adminUser = await User.create({
      name: 'Admin User',
      email: `admin-${timestamp}-${randomSuffix}@test.com`,
      password: 'password123',
      role: 'admin'
    });

    const adminToken = jwt.sign(
      {
        userId: adminUser._id,
        email: adminUser.email,
        role: adminUser.role,
        id: adminUser._id
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    users.push(adminUser);
    tokens.push({ user: adminUser, token: adminToken });

    // Create employee users and employees
    for (let i = 0; i < numEmployees; i++) {
      const employeeUser = await User.create({
        name: `Employee ${i + 1}`,
        email: `employee${i + 1}-${timestamp}-${randomSuffix}@test.com`,
        password: 'password123',
        role: 'employee'
      });

      const employee = await Employee.create({
        userId: employeeUser._id,
        baseSalary: 50000 + (i * 10000),
        allowance: 5000 + (i * 1000),
        deduction: 2000 + (i * 500)
      });

      const employeeToken = jwt.sign(
        {
          userId: employeeUser._id,
          email: employeeUser.email,
          role: employeeUser.role,
          id: employeeUser._id
        },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      users.push(employeeUser);
      employees.push(employee);
      tokens.push({ user: employeeUser, token: employeeToken, employee });
    }

    return { users, employees, tokens };
  };

  // Helper function to create payroll records
  const createPayrollRecords = async (employee, numRecords = 3) => {
    const records = [];
    const currentYear = new Date().getFullYear();
    
    for (let i = 0; i < numRecords; i++) {
      const month = (i % 12) + 1;
      const year = currentYear - Math.floor(i / 12);
      
      const record = await Payroll.create({
        employeeId: employee._id,
        month,
        year,
        baseSalary: employee.baseSalary,
        allowance: employee.allowance,
        deduction: employee.deduction,
        grossSalary: employee.baseSalary + employee.allowance,
        netSalary: employee.baseSalary + employee.allowance - employee.deduction
      });
      
      records.push(record);
    }
    
    return records;
  };

  /**
   * Property 13: Payroll Data Isolation
   * Feature: employee-payroll-system, Property 13: Payroll Data Isolation
   * Validates: Requirements 4.1, 4.3
   */
  test('Property 13: Payroll Data Isolation - For any employee requesting payroll data, the system should return only their own payroll records and deny access to other employees data', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2, max: 5 }), // Number of employees to create
        fc.integer({ min: 1, max: 5 }), // Number of payroll records per employee
        async (numEmployees, numRecords) => {
          // Create test data
          const { employees, tokens } = await createTestData(numEmployees);
          
          // Create payroll records for each employee
          const allPayrollRecords = [];
          for (const employee of employees) {
            const records = await createPayrollRecords(employee, numRecords);
            allPayrollRecords.push(...records);
          }

          // Test each employee can only access their own data
          for (let i = 0; i < employees.length; i++) {
            const employee = employees[i];
            const employeeToken = tokens[i + 1]; // +1 because index 0 is admin

            // Employee should be able to access their own payroll data
            const ownResponse = await request(app)
              .get(`/api/payroll/${employee._id}`)
              .set('Authorization', `Bearer ${employeeToken.token}`);

            expect(ownResponse.status).toBe(200);
            expect(ownResponse.body.success).toBe(true);
            expect(ownResponse.body.data.payrollRecords).toHaveLength(numRecords);
            
            // Verify all returned records belong to this employee
            ownResponse.body.data.payrollRecords.forEach(record => {
              expect(record.employeeId).toBe(employee._id.toString());
            });

            // Employee should NOT be able to access other employees' data
            for (let j = 0; j < employees.length; j++) {
              if (i !== j) {
                const otherEmployee = employees[j];
                const otherResponse = await request(app)
                  .get(`/api/payroll/${otherEmployee._id}`)
                  .set('Authorization', `Bearer ${employeeToken.token}`);

                expect(otherResponse.status).toBe(403);
                expect(otherResponse.body.success).toBe(false);
                expect(otherResponse.body.message).toBe('Access denied. You can only view your own payroll data');
              }
            }
          }

          // Admin should be able to access any employee's data
          const adminToken = tokens[0];
          for (const employee of employees) {
            const adminResponse = await request(app)
              .get(`/api/payroll/${employee._id}`)
              .set('Authorization', `Bearer ${adminToken.token}`);

            expect(adminResponse.status).toBe(200);
            expect(adminResponse.body.success).toBe(true);
            expect(adminResponse.body.data.payrollRecords).toHaveLength(numRecords);
          }
        }
      ),
      { numRuns: 5 }
    );
  }, 15000);

  /**
   * Property 14: Payroll Display Completeness
   * Feature: employee-payroll-system, Property 14: Payroll Display Completeness
   * Validates: Requirements 4.2
   */
  test('Property 14: Payroll Display Completeness - For any payroll record display, the system should show month, year, base salary, allowance, deductions, gross salary, and net salary', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          baseSalary: fc.integer({ min: 30000, max: 200000 }),
          allowance: fc.integer({ min: 0, max: 50000 }),
          deduction: fc.integer({ min: 0, max: 20000 })
        }),
        fc.integer({ min: 1, max: 12 }), // month
        fc.integer({ min: 2020, max: 2025 }), // year
        async (salaryData, month, year) => {
          // Create test data
          const { employees, tokens } = await createTestData(1);
          const employee = employees[0];
          const employeeToken = tokens[1]; // index 1 is the employee token

          // Update employee with test salary data
          await Employee.findByIdAndUpdate(employee._id, salaryData);

          // Create payroll record
          await Payroll.create({
            employeeId: employee._id,
            month,
            year,
            baseSalary: salaryData.baseSalary,
            allowance: salaryData.allowance,
            deduction: salaryData.deduction,
            grossSalary: salaryData.baseSalary + salaryData.allowance,
            netSalary: salaryData.baseSalary + salaryData.allowance - salaryData.deduction
          });

          // Request payroll data
          const response = await request(app)
            .get(`/api/payroll/${employee._id}`)
            .set('Authorization', `Bearer ${employeeToken.token}`);

          expect(response.status).toBe(200);
          expect(response.body.success).toBe(true);
          expect(response.body.data.payrollRecords).toHaveLength(1);

          const payrollRecord = response.body.data.payrollRecords[0];

          // Verify all required fields are present and correct
          expect(payrollRecord.month).toBe(month);
          expect(payrollRecord.year).toBe(year);
          expect(payrollRecord.baseSalary).toBe(salaryData.baseSalary);
          expect(payrollRecord.allowance).toBe(salaryData.allowance);
          expect(payrollRecord.deduction).toBe(salaryData.deduction);
          expect(payrollRecord.grossSalary).toBe(salaryData.baseSalary + salaryData.allowance);
          expect(payrollRecord.netSalary).toBe(salaryData.baseSalary + salaryData.allowance - salaryData.deduction);

          // Verify employee information is also present
          expect(response.body.data.employee.id).toBe(employee._id.toString());
          expect(response.body.data.employee.name).toBeDefined();
          expect(response.body.data.employee.email).toBeDefined();
        }
      ),
      { numRuns: 5 }
    );
  }, 10000);

  /**
   * Property 15: Payroll Record Ordering
   * Feature: employee-payroll-system, Property 15: Payroll Record Ordering
   * Validates: Requirements 4.5
   */
  test('Property 15: Payroll Record Ordering - For any payroll history request, the system should return records ordered by date with most recent first', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            month: fc.integer({ min: 1, max: 12 }),
            year: fc.integer({ min: 2020, max: 2025 })
          }),
          { minLength: 3, maxLength: 10 }
        ).filter(records => {
          // Ensure all records have unique month/year combinations
          const seen = new Set();
          return records.every(record => {
            const key = `${record.year}-${record.month}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
        }),
        async (payrollPeriods) => {
          // Create test data
          const { employees, tokens } = await createTestData(1);
          const employee = employees[0];
          const employeeToken = tokens[1]; // index 1 is the employee token

          // Create payroll records with the generated periods
          const createdRecords = [];
          for (const period of payrollPeriods) {
            const record = await Payroll.create({
              employeeId: employee._id,
              month: period.month,
              year: period.year,
              baseSalary: employee.baseSalary,
              allowance: employee.allowance,
              deduction: employee.deduction,
              grossSalary: employee.baseSalary + employee.allowance,
              netSalary: employee.baseSalary + employee.allowance - employee.deduction
            });
            createdRecords.push(record);
          }

          // Request payroll data
          const response = await request(app)
            .get(`/api/payroll/${employee._id}`)
            .set('Authorization', `Bearer ${employeeToken.token}`);

          expect(response.status).toBe(200);
          expect(response.body.success).toBe(true);
          expect(response.body.data.payrollRecords).toHaveLength(payrollPeriods.length);

          const returnedRecords = response.body.data.payrollRecords;

          // Verify records are ordered by date (most recent first)
          for (let i = 0; i < returnedRecords.length - 1; i++) {
            const current = returnedRecords[i];
            const next = returnedRecords[i + 1];

            // Current record should be more recent than or equal to next record
            const currentDate = new Date(current.year, current.month - 1);
            const nextDate = new Date(next.year, next.month - 1);

            expect(currentDate.getTime()).toBeGreaterThanOrEqual(nextDate.getTime());
          }

          // Verify all created records are present
          const returnedIds = new Set(returnedRecords.map(r => r._id));
          createdRecords.forEach(record => {
            expect(returnedIds.has(record._id.toString())).toBe(true);
          });
        }
      ),
      { numRuns: 5 }
    );
  }, 15000);
});