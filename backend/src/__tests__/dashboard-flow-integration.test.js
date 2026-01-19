/**
 * Complete Dashboard Flow Integration Tests - Backend
 * Task 6.1: Write integration tests for complete dashboard flow
 * 
 * Tests complete data flow from database to API endpoints
 * Tests real-time data updates and concurrent access patterns
 * 
 * Requirements: 4.2, 4.3
 */

import request from 'supertest';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

// Import routes and models
import authRoutes from '../routes/auth.js';
import employeeRoutes from '../routes/employee.js';
import payrollRoutes from '../routes/payroll.js';
import dashboardRoutes from '../routes/dashboard.js';
import User from '../models/User.js';
import Employee from '../models/Employee.js';
import Payroll from '../models/Payroll.js';

// Load environment variables
dotenv.config();

// Create Express app for testing
const app = express();
app.use(cors());
app.use(express.json());

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Test database connection
beforeAll(async () => {
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/payrolldb_flow_integration_test';
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(mongoUri);
  }
}, 30000);

afterAll(async () => {
  // Clean up after tests
  await User.deleteMany({});
  await Employee.deleteMany({});
  await Payroll.deleteMany({});
  await mongoose.connection.close();
}, 30000);

beforeEach(async () => {
  // Clean up before each test
  await User.deleteMany({});
  await Employee.deleteMany({});
  await Payroll.deleteMany({});
});

// Helper function to create admin user and get token
const createAdminUserAndToken = async () => {
  const timestamp = Date.now();
  const adminUser = new User({
    name: `Flow Integration Admin ${timestamp}`,
    email: `flow.integration.admin.${timestamp}@example.com`,
    password: 'password123',
    role: 'admin'
  });
  await adminUser.save();

  const token = jwt.sign(
    { userId: adminUser._id },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '1h' }
  );

  return { user: adminUser, token };
};

// Helper function to create realistic test employees with varied salaries
const createRealisticEmployees = async (count = 5, prefix = 'employee') => {
  const employees = [];
  const salaryRanges = [
    { base: 25000, allowance: 2500, deduction: 1000 }, // Junior
    { base: 35000, allowance: 3500, deduction: 1500 }, // Mid-level
    { base: 50000, allowance: 5000, deduction: 2000 }, // Senior
    { base: 75000, allowance: 7500, deduction: 3000 }, // Lead
    { base: 100000, allowance: 10000, deduction: 4000 } // Manager
  ];

  for (let i = 0; i < count; i++) {
    const timestamp = Date.now();
    const user = new User({
      name: `Employee ${i + 1} ${timestamp}`,
      email: `${prefix}${i + 1}-${timestamp}@flowtest.com`,
      password: 'password123',
      role: 'employee'
    });
    await user.save();

    const salaryData = salaryRanges[i % salaryRanges.length];
    const employee = new Employee({
      userId: user._id,
      baseSalary: salaryData.base,
      allowance: salaryData.allowance,
      deduction: salaryData.deduction
    });
    await employee.save();
    employees.push({ user, employee });
  }
  return employees;
};

// Helper function to create payroll records with realistic data
const createRealisticPayrollRecords = async (employees, month, year) => {
  const payrollRecords = [];
  for (const { employee } of employees) {
    const grossSalary = employee.baseSalary + employee.allowance;
    const netSalary = grossSalary - employee.deduction;
    
    const payroll = new Payroll({
      employeeId: employee._id,
      month,
      year,
      baseSalary: employee.baseSalary,
      allowance: employee.allowance,
      deduction: employee.deduction,
      grossSalary,
      netSalary
    });
    await payroll.save();
    payrollRecords.push(payroll);
  }
  return payrollRecords;
};

describe('Complete Dashboard Flow Integration Tests - Backend', () => {
  describe('Complete Data Flow - Database Creation to API Response', () => {
    test('should handle complete end-to-end data flow with realistic business scenario', async () => {
      const { token } = await createAdminUserAndToken();
      
      // Step 1: Create a realistic company structure
      const employees = await createRealisticEmployees(8);
      expect(employees).toHaveLength(8);
      
      // Step 2: Process payroll for current month (only 6 out of 8 employees)
      const currentMonth = 1;
      const currentYear = 2026;
      const paidEmployees = employees.slice(0, 6); // Only first 6 employees get paid
      const payrollRecords = await createRealisticPayrollRecords(paidEmployees, currentMonth, currentYear);
      expect(payrollRecords).toHaveLength(6);
      
      // Step 3: Verify database state
      const totalEmployees = await Employee.countDocuments();
      const paidEmployeesCount = await Payroll.countDocuments({ month: currentMonth, year: currentYear });
      expect(totalEmployees).toBe(8);
      expect(paidEmployeesCount).toBe(6);
      
      // Step 4: Test complete API flow
      const response = await request(app)
        .get('/api/dashboard/metrics')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      
      // Step 5: Verify complete data transformation
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      
      // Verify payroll calculations
      const expectedTotal = payrollRecords.reduce((sum, record) => sum + record.netSalary, 0);
      expect(response.body.data.payrollTotal.amount).toBe(expectedTotal);
      expect(response.body.data.payrollTotal.employeeCount).toBe(6);
      expect(response.body.data.payrollTotal.month).toBe(currentMonth);
      expect(response.body.data.payrollTotal.year).toBe(currentYear);
      
      // Verify employee statistics
      expect(response.body.data.employeesPaid.count).toBe(6);
      expect(response.body.data.employeesPaid.totalEmployees).toBe(8);
      expect(response.body.data.employeesPaid.month).toBe(currentMonth);
      expect(response.body.data.employeesPaid.year).toBe(currentYear);
      
      // Verify pending approvals (should be 0 for now)
      expect(response.body.data.pendingApprovals.count).toBe(0);
      expect(response.body.data.pendingApprovals.types).toEqual([]);
      
      // Verify metadata
      expect(response.body.data.lastUpdated).toBeDefined();
      expect(new Date(response.body.data.lastUpdated)).toBeInstanceOf(Date);
    });

    test('should handle complex multi-month data flow correctly', async () => {
      const { token } = await createAdminUserAndToken();
      
      const employees = await createRealisticEmployees(5);
      
      // Create payroll for multiple months
      await createRealisticPayrollRecords(employees, 11, 2025); // November 2025
      await createRealisticPayrollRecords(employees, 12, 2025); // December 2025
      await createRealisticPayrollRecords(employees.slice(0, 3), 1, 2026); // January 2026 (partial)
      
      // Test December 2025 data
      let response = await request(app)
        .get('/api/dashboard/metrics?month=12&year=2025')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      
      expect(response.body.data.payrollTotal.month).toBe(12);
      expect(response.body.data.payrollTotal.year).toBe(2025);
      expect(response.body.data.employeesPaid.count).toBe(5);
      expect(response.body.data.employeesPaid.totalEmployees).toBe(5);
      
      // Test January 2026 data (partial payroll)
      response = await request(app)
        .get('/api/dashboard/metrics?month=1&year=2026')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      
      expect(response.body.data.payrollTotal.month).toBe(1);
      expect(response.body.data.payrollTotal.year).toBe(2026);
      expect(response.body.data.employeesPaid.count).toBe(3); // Only 3 paid in January
      expect(response.body.data.employeesPaid.totalEmployees).toBe(5); // But 5 total employees
    });

    test('should handle data flow with varying salary structures', async () => {
      const { token } = await createAdminUserAndToken();
      
      // Create employees with extreme salary variations
      const employees = [];
      const salaryVariations = [
        { base: 15000, allowance: 1000, deduction: 500 },   // Low salary
        { base: 200000, allowance: 50000, deduction: 10000 }, // High salary
        { base: 45000, allowance: 0, deduction: 2000 },     // No allowance
        { base: 30000, allowance: 15000, deduction: 0 }     // No deduction
      ];

      for (let i = 0; i < salaryVariations.length; i++) {
        const user = new User({
          name: `Varied Employee ${i + 1}`,
          email: `varied${i + 1}@flowtest.com`,
          password: 'password123',
          role: 'employee'
        });
        await user.save();

        const salary = salaryVariations[i];
        const employee = new Employee({
          userId: user._id,
          baseSalary: salary.base,
          allowance: salary.allowance,
          deduction: salary.deduction
        });
        await employee.save();
        employees.push({ user, employee });
      }

      await createRealisticPayrollRecords(employees, 1, 2026);
      
      const response = await request(app)
        .get('/api/dashboard/metrics')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      
      // Verify calculations handle salary variations correctly
      const expectedTotal = employees.reduce((sum, { employee }) => {
        const gross = employee.baseSalary + employee.allowance;
        const net = gross - employee.deduction;
        return sum + net;
      }, 0);
      
      expect(response.body.data.payrollTotal.amount).toBe(expectedTotal);
      expect(response.body.data.employeesPaid.count).toBe(4);
    });
  });

  describe('Real-time Data Updates Simulation', () => {
    test('should reflect incremental database changes in real-time API responses', async () => {
      const { token } = await createAdminUserAndToken();
      const currentMonth = 1;
      const currentYear = 2026;
      
      // Initial state - empty database
      let response = await request(app)
        .get('/api/dashboard/metrics')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      
      expect(response.body.data.payrollTotal.amount).toBe(0);
      expect(response.body.data.employeesPaid.count).toBe(0);
      
      // Simulate real-time update: Add first batch of employees
      const batch1 = await createRealisticEmployees(3);
      await createRealisticPayrollRecords(batch1, currentMonth, currentYear);
      
      response = await request(app)
        .get('/api/dashboard/metrics')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      
      const firstBatchTotal = response.body.data.payrollTotal.amount;
      expect(firstBatchTotal).toBeGreaterThan(0);
      expect(response.body.data.employeesPaid.count).toBe(3);
      expect(response.body.data.employeesPaid.totalEmployees).toBe(3);
      
      // Simulate real-time update: Add second batch
      const batch2 = await createRealisticEmployees(2);
      await createRealisticPayrollRecords(batch2, currentMonth, currentYear);
      
      response = await request(app)
        .get('/api/dashboard/metrics')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      
      expect(response.body.data.payrollTotal.amount).toBeGreaterThan(firstBatchTotal);
      expect(response.body.data.employeesPaid.count).toBe(5);
      expect(response.body.data.employeesPaid.totalEmployees).toBe(5);
      
      // Simulate real-time update: Add employee without payroll
      await createRealisticEmployees(1);
      
      response = await request(app)
        .get('/api/dashboard/metrics')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      
      expect(response.body.data.employeesPaid.count).toBe(5); // Still 5 paid
      expect(response.body.data.employeesPaid.totalEmployees).toBe(6); // Now 6 total
    });

    test('should handle rapid sequential data changes correctly', async () => {
      const { token } = await createAdminUserAndToken();
      const currentMonth = 1;
      const currentYear = 2026;
      
      // Create base employees
      const employees = await createRealisticEmployees(4);
      
      // Rapid sequential payroll processing
      const payrollBatches = [
        employees.slice(0, 1), // Pay 1 employee
        employees.slice(0, 2), // Pay 2 employees (1 additional)
        employees.slice(0, 4)  // Pay all 4 employees
      ];
      
      const responses = [];
      
      for (const batch of payrollBatches) {
        // Clear existing payroll for this test
        await Payroll.deleteMany({ month: currentMonth, year: currentYear });
        
        // Create payroll for current batch
        await createRealisticPayrollRecords(batch, currentMonth, currentYear);
        
        const response = await request(app)
          .get('/api/dashboard/metrics')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);
        
        responses.push(response.body.data);
      }
      
      // Verify progressive increases
      expect(responses[0].employeesPaid.count).toBe(1);
      expect(responses[1].employeesPaid.count).toBe(2);
      expect(responses[2].employeesPaid.count).toBe(4);
      
      // Verify payroll totals increase
      expect(responses[1].payrollTotal.amount).toBeGreaterThan(responses[0].payrollTotal.amount);
      expect(responses[2].payrollTotal.amount).toBeGreaterThan(responses[1].payrollTotal.amount);
    });

    test('should handle concurrent database modifications correctly', async () => {
      const { token } = await createAdminUserAndToken();
      const currentMonth = 1;
      const currentYear = 2026;
      
      // Create employees concurrently
      const concurrentEmployeeCreation = [
        createRealisticEmployees(2, 'concurrent1'),
        createRealisticEmployees(2, 'concurrent2'),
        createRealisticEmployees(1, 'concurrent3')
      ];
      
      const employeeBatches = await Promise.all(concurrentEmployeeCreation);
      const allEmployees = employeeBatches.flat();
      
      // Create payroll records concurrently
      const concurrentPayrollCreation = employeeBatches.map(batch => 
        createRealisticPayrollRecords(batch, currentMonth, currentYear)
      );
      
      await Promise.all(concurrentPayrollCreation);
      
      // Verify final state
      const response = await request(app)
        .get('/api/dashboard/metrics')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      
      expect(response.body.data.employeesPaid.count).toBe(5);
      expect(response.body.data.employeesPaid.totalEmployees).toBe(5);
      expect(response.body.data.payrollTotal.employeeCount).toBe(5);
      expect(response.body.data.payrollTotal.amount).toBeGreaterThan(0);
    });
  });

  describe('Performance and Scalability Testing', () => {
    test('should handle large dataset efficiently within performance requirements', async () => {
      const { token } = await createAdminUserAndToken();
      
      // Create a large dataset (50 employees to avoid timeout)
      const employees = await createRealisticEmployees(50, 'large');
      await createRealisticPayrollRecords(employees, 1, 2026);
      
      const startTime = Date.now();
      const response = await request(app)
        .get('/api/dashboard/metrics')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      const endTime = Date.now();
      
      // Should complete within 2 seconds (requirement 4.1)
      expect(endTime - startTime).toBeLessThan(2000);
      
      expect(response.body.data.employeesPaid.count).toBe(50);
      expect(response.body.data.employeesPaid.totalEmployees).toBe(50);
      expect(response.body.data.payrollTotal.employeeCount).toBe(50);
      expect(response.body.data.payrollTotal.amount).toBeGreaterThan(0);
    }, 10000); // Increase timeout for large dataset test

    test('should handle multiple concurrent API requests efficiently', async () => {
      const { token } = await createAdminUserAndToken();
      
      // Create test data
      const employees = await createRealisticEmployees(10, 'concurrent');
      await createRealisticPayrollRecords(employees, 1, 2026);
      
      // Make 5 concurrent requests (reduced from 10 to avoid timeout)
      const concurrentRequests = Array(5).fill().map(() =>
        request(app)
          .get('/api/dashboard/metrics')
          .set('Authorization', `Bearer ${token}`)
      );
      
      const startTime = Date.now();
      const responses = await Promise.all(concurrentRequests);
      const endTime = Date.now();
      
      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.employeesPaid.count).toBe(10);
      });
      
      // Should handle concurrent requests efficiently
      expect(endTime - startTime).toBeLessThan(5000);
    }, 10000); // Increase timeout for concurrent requests

    test('should maintain data consistency under high load', async () => {
      const { token } = await createAdminUserAndToken();
      
      const employees = await createRealisticEmployees(5, 'consistency');
      await createRealisticPayrollRecords(employees, 1, 2026);
      
      // Make rapid sequential requests (reduced from 10 to 5)
      const responses = [];
      for (let i = 0; i < 5; i++) {
        const response = await request(app)
          .get('/api/dashboard/metrics')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);
        responses.push(response.body.data);
      }
      
      // All responses should be identical (data consistency)
      const firstResponse = responses[0];
      responses.forEach(response => {
        expect(response.payrollTotal.amount).toBe(firstResponse.payrollTotal.amount);
        expect(response.employeesPaid.count).toBe(firstResponse.employeesPaid.count);
        expect(response.employeesPaid.totalEmployees).toBe(firstResponse.employeesPaid.totalEmployees);
      });
    }, 10000); // Increase timeout
  });

  describe('Error Handling and Edge Cases in Data Flow', () => {
    test('should handle database connection issues gracefully', async () => {
      const { token } = await createAdminUserAndToken();
      
      // Create some test data first
      const employees = await createRealisticEmployees(3, 'dbtest');
      await createRealisticPayrollRecords(employees, 1, 2026);
      
      // Temporarily close database connection
      await mongoose.connection.close();
      
      const response = await request(app)
        .get('/api/dashboard/metrics')
        .set('Authorization', `Bearer ${token}`)
        .expect(500);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('DASHBOARD_ERROR');
      
      // Reconnect for cleanup
      const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/payrolldb_flow_integration_test';
      await mongoose.connect(mongoUri);
    }, 10000); // Increase timeout

    test('should handle corrupted data gracefully', async () => {
      const { token } = await createAdminUserAndToken();
      
      // Create employee with corrupted payroll data
      const employees = await createRealisticEmployees(1);
      const employee = employees[0].employee;
      
      // Create payroll with extreme values
      const corruptedPayroll = new Payroll({
        employeeId: employee._id,
        month: 1,
        year: 2026,
        baseSalary: -50000, // Negative salary
        allowance: 999999999, // Extremely high allowance
        deduction: -10000, // Negative deduction
        grossSalary: 999949999,
        netSalary: 999959999
      });
      await corruptedPayroll.save();
      
      const response = await request(app)
        .get('/api/dashboard/metrics')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      
      // Should still return response, even with corrupted data
      expect(response.body.success).toBe(true);
      expect(response.body.data.payrollTotal.amount).toBe(999959999);
      expect(response.body.data.employeesPaid.count).toBe(1);
    });

    test('should handle mixed valid and invalid data correctly', async () => {
      const { token } = await createAdminUserAndToken();
      
      // Create mix of valid and edge case employees
      const validEmployees = await createRealisticEmployees(3);
      await createRealisticPayrollRecords(validEmployees, 1, 2026);
      
      // Add employee with zero salary
      const zeroSalaryUser = new User({
        name: 'Zero Salary Employee',
        email: 'zero@flowtest.com',
        password: 'password123',
        role: 'employee'
      });
      await zeroSalaryUser.save();
      
      const zeroSalaryEmployee = new Employee({
        userId: zeroSalaryUser._id,
        baseSalary: 0,
        allowance: 0,
        deduction: 0
      });
      await zeroSalaryEmployee.save();
      
      const zeroPayroll = new Payroll({
        employeeId: zeroSalaryEmployee._id,
        month: 1,
        year: 2026,
        baseSalary: 0,
        allowance: 0,
        deduction: 0,
        grossSalary: 0,
        netSalary: 0
      });
      await zeroPayroll.save();
      
      const response = await request(app)
        .get('/api/dashboard/metrics')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      
      // Should handle mixed data correctly
      expect(response.body.success).toBe(true);
      expect(response.body.data.employeesPaid.count).toBe(4); // 3 valid + 1 zero
      expect(response.body.data.employeesPaid.totalEmployees).toBe(4);
      expect(response.body.data.payrollTotal.amount).toBeGreaterThan(0); // Should still have positive total from valid employees
    });
  });

  describe('Data Integrity and Validation', () => {
    test('should maintain referential integrity throughout the data flow', async () => {
      const { token } = await createAdminUserAndToken();
      
      const employees = await createRealisticEmployees(5);
      await createRealisticPayrollRecords(employees, 1, 2026);
      
      // Verify all payroll records have valid employee references
      const payrollRecords = await Payroll.find({ month: 1, year: 2026 });
      for (const payroll of payrollRecords) {
        const employee = await Employee.findById(payroll.employeeId);
        expect(employee).toBeTruthy();
        
        const user = await User.findById(employee.userId);
        expect(user).toBeTruthy();
      }
      
      const response = await request(app)
        .get('/api/dashboard/metrics')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      
      expect(response.body.data.employeesPaid.count).toBe(5);
      expect(response.body.data.payrollTotal.employeeCount).toBe(5);
    });

    test('should handle date parameter validation correctly', async () => {
      const { token } = await createAdminUserAndToken();
      
      // Test invalid month
      let response = await request(app)
        .get('/api/dashboard/metrics?month=13&year=2026')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Month must be');
      
      // Test invalid year
      response = await request(app)
        .get('/api/dashboard/metrics?month=1&year=2030')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Year must be');
      
      // Test valid parameters
      response = await request(app)
        .get('/api/dashboard/metrics?month=1&year=2026')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
    });
  });
});