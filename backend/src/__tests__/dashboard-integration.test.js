/**
 * Dashboard Integration Tests
 * 
 * Tests complete dashboard data flow from database to UI components
 * Tests real-time updates and user interactions
 * 
 * Requirements: 4.2, 4.3
 */

import request from 'supertest';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

// Import routes
import authRoutes from '../routes/auth.js';
import employeeRoutes from '../routes/employee.js';
import payrollRoutes from '../routes/payroll.js';
import dashboardRoutes from '../routes/dashboard.js';

// Import models
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
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/payrolldb_integration_test';
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
  const adminUser = new User({
    name: 'Integration Admin',
    email: 'integration.admin@example.com',
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

// Helper function to create test employees
const createTestEmployees = async (count = 3) => {
  const employees = [];
  for (let i = 0; i < count; i++) {
    const user = new User({
      name: `Employee ${i + 1}`,
      email: `employee${i + 1}@example.com`,
      password: 'password123',
      role: 'employee'
    });
    await user.save();

    const employee = new Employee({
      userId: user._id,
      baseSalary: 3000 + (i * 1000), // 3000, 4000, 5000
      allowance: 500 + (i * 100),    // 500, 600, 700
      deduction: 200 + (i * 50)      // 200, 250, 300
    });
    await employee.save();
    employees.push({ user, employee });
  }
  return employees;
};

// Helper function to create payroll records
const createPayrollRecords = async (employees, month, year) => {
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

describe('Dashboard Integration Tests', () => {
  describe('Complete Data Flow - Database to API', () => {
    test('should handle complete dashboard data flow from database creation to API response', async () => {
      const { token } = await createAdminUserAndToken();
      
      // Step 1: Create employees in database
      const employees = await createTestEmployees(3);
      expect(employees).toHaveLength(3);
      
      // Step 2: Create payroll records for current month
      const currentMonth = 1;
      const currentYear = 2026;
      const payrollRecords = await createPayrollRecords(employees, currentMonth, currentYear);
      expect(payrollRecords).toHaveLength(3);
      
      // Step 3: Verify data exists in database
      const employeeCount = await Employee.countDocuments();
      const payrollCount = await Payroll.countDocuments({ month: currentMonth, year: currentYear });
      expect(employeeCount).toBe(3);
      expect(payrollCount).toBe(3);
      
      // Step 4: Test dashboard metrics API endpoint
      const response = await request(app)
        .get('/api/dashboard/metrics')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      
      // Step 5: Verify complete data flow
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      
      // Verify payroll total calculation
      const expectedTotal = payrollRecords.reduce((sum, record) => sum + record.netSalary, 0);
      expect(response.body.data.payrollTotal.amount).toBe(expectedTotal);
      expect(response.body.data.payrollTotal.employeeCount).toBe(3);
      
      // Verify employee count calculation
      expect(response.body.data.employeesPaid.count).toBe(3);
      expect(response.body.data.employeesPaid.totalEmployees).toBe(3);
      
      // Verify pending approvals
      expect(response.body.data.pendingApprovals.count).toBe(0);
      expect(response.body.data.pendingApprovals.types).toEqual([]);
      
      // Verify metadata
      expect(response.body.data.lastUpdated).toBeDefined();
      expect(new Date(response.body.data.lastUpdated)).toBeInstanceOf(Date);
    });

    test('should handle partial payroll data correctly', async () => {
      const { token } = await createAdminUserAndToken();
      
      // Create 5 employees but only pay 3 of them
      const employees = await createTestEmployees(5);
      const paidEmployees = employees.slice(0, 3); // Only first 3 employees get paid
      
      const currentMonth = 1;
      const currentYear = 2026;
      await createPayrollRecords(paidEmployees, currentMonth, currentYear);
      
      const response = await request(app)
        .get('/api/dashboard/metrics')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      
      // Should show 3 employees paid out of 5 total
      expect(response.body.data.employeesPaid.count).toBe(3);
      expect(response.body.data.employeesPaid.totalEmployees).toBe(5);
      expect(response.body.data.payrollTotal.employeeCount).toBe(3);
    });

    test('should handle empty database correctly', async () => {
      const { token } = await createAdminUserAndToken();
      
      const response = await request(app)
        .get('/api/dashboard/metrics')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      
      // Should return zero values for empty database
      expect(response.body.data.payrollTotal.amount).toBe(0);
      expect(response.body.data.payrollTotal.employeeCount).toBe(0);
      expect(response.body.data.employeesPaid.count).toBe(0);
      expect(response.body.data.employeesPaid.totalEmployees).toBe(0);
      expect(response.body.data.pendingApprovals.count).toBe(0);
    });
  });

  describe('Real-time Data Updates Simulation', () => {
    test('should reflect database changes in subsequent API calls', async () => {
      const { token } = await createAdminUserAndToken();
      const currentMonth = 1;
      const currentYear = 2026;
      
      // Initial state - no data
      let response = await request(app)
        .get('/api/dashboard/metrics')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      
      expect(response.body.data.payrollTotal.amount).toBe(0);
      expect(response.body.data.employeesPaid.count).toBe(0);
      
      // Simulate real-time update: Add first employee and payroll
      const employees1 = await createTestEmployees(1);
      await createPayrollRecords(employees1, currentMonth, currentYear);
      
      response = await request(app)
        .get('/api/dashboard/metrics')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      
      expect(response.body.data.payrollTotal.amount).toBeGreaterThan(0);
      expect(response.body.data.employeesPaid.count).toBe(1);
      expect(response.body.data.employeesPaid.totalEmployees).toBe(1);
      
      const firstTotal = response.body.data.payrollTotal.amount;
      
      // Simulate another real-time update: Add second employee and payroll
      const employees2 = await createTestEmployees(1);
      await createPayrollRecords(employees2, currentMonth, currentYear);
      
      response = await request(app)
        .get('/api/dashboard/metrics')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      
      expect(response.body.data.payrollTotal.amount).toBeGreaterThan(firstTotal);
      expect(response.body.data.employeesPaid.count).toBe(2);
      expect(response.body.data.employeesPaid.totalEmployees).toBe(2);
      
      // Simulate adding employee without payroll (affects total employees but not paid count)
      await createTestEmployees(1);
      
      response = await request(app)
        .get('/api/dashboard/metrics')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      
      expect(response.body.data.employeesPaid.count).toBe(2); // Still 2 paid
      expect(response.body.data.employeesPaid.totalEmployees).toBe(3); // Now 3 total
    });

    test('should handle concurrent data modifications correctly', async () => {
      const { token } = await createAdminUserAndToken();
      const currentMonth = 1;
      const currentYear = 2026;
      
      // Create multiple employees and payroll records concurrently
      const employeePromises = [
        createTestEmployees(2),
        createTestEmployees(2),
        createTestEmployees(1)
      ];
      
      const allEmployees = await Promise.all(employeePromises);
      const flatEmployees = allEmployees.flat();
      
      // Create payroll records concurrently
      const payrollPromises = flatEmployees.map(employeeGroup => 
        createPayrollRecords([employeeGroup], currentMonth, currentYear)
      );
      
      await Promise.all(payrollPromises);
      
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

  describe('Multi-month Data Handling', () => {
    test('should correctly filter data by month and year', async () => {
      const { token } = await createAdminUserAndToken();
      
      const employees = await createTestEmployees(2);
      
      // Create payroll for different months
      await createPayrollRecords(employees, 12, 2025); // December 2025
      await createPayrollRecords(employees, 1, 2026);  // January 2026
      
      // Test December 2025 data
      let response = await request(app)
        .get('/api/dashboard/metrics?month=12&year=2025')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      
      expect(response.body.data.payrollTotal.month).toBe(12);
      expect(response.body.data.payrollTotal.year).toBe(2025);
      expect(response.body.data.employeesPaid.count).toBe(2);
      
      // Test January 2026 data
      response = await request(app)
        .get('/api/dashboard/metrics?month=1&year=2026')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      
      expect(response.body.data.payrollTotal.month).toBe(1);
      expect(response.body.data.payrollTotal.year).toBe(2026);
      expect(response.body.data.employeesPaid.count).toBe(2);
      
      // Test month with no data
      response = await request(app)
        .get('/api/dashboard/metrics?month=6&year=2025')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      
      expect(response.body.data.payrollTotal.amount).toBe(0);
      expect(response.body.data.employeesPaid.count).toBe(0);
      expect(response.body.data.employeesPaid.totalEmployees).toBe(2); // Total employees still exists
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle database connection issues gracefully', async () => {
      const { token } = await createAdminUserAndToken();
      
      // Temporarily close database connection to simulate connection issue
      await mongoose.connection.close();
      
      const response = await request(app)
        .get('/api/dashboard/metrics')
        .set('Authorization', `Bearer ${token}`)
        .expect(500);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      
      // Reconnect for cleanup
      const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/payrolldb_integration_test';
      await mongoose.connect(mongoUri);
    });

    test('should handle large datasets efficiently', async () => {
      const { token } = await createAdminUserAndToken();
      
      // Create a larger dataset to test performance
      const employees = await createTestEmployees(50);
      await createPayrollRecords(employees, 1, 2026);
      
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
    });

    test('should handle invalid data gracefully', async () => {
      const { token } = await createAdminUserAndToken();
      
      // Create employee with invalid payroll data
      const employees = await createTestEmployees(1);
      const employee = employees[0].employee;
      
      // Create payroll with negative values (edge case)
      const payroll = new Payroll({
        employeeId: employee._id,
        month: 1,
        year: 2026,
        baseSalary: -1000, // Invalid negative salary
        allowance: 0,
        deduction: 0,
        grossSalary: -1000,
        netSalary: -1000
      });
      await payroll.save();
      
      const response = await request(app)
        .get('/api/dashboard/metrics')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      
      // Should still return response, even with negative values
      expect(response.body.success).toBe(true);
      expect(response.body.data.payrollTotal.amount).toBe(-1000);
      expect(response.body.data.employeesPaid.count).toBe(1);
    });
  });

  describe('Performance and Scalability', () => {
    test('should handle multiple concurrent requests efficiently', async () => {
      const { token } = await createAdminUserAndToken();
      
      // Create test data
      const employees = await createTestEmployees(10);
      await createPayrollRecords(employees, 1, 2026);
      
      // Make multiple concurrent requests
      const requestPromises = Array(10).fill().map(() =>
        request(app)
          .get('/api/dashboard/metrics')
          .set('Authorization', `Bearer ${token}`)
      );
      
      const startTime = Date.now();
      const responses = await Promise.all(requestPromises);
      const endTime = Date.now();
      
      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.employeesPaid.count).toBe(10);
      });
      
      // Should handle concurrent requests efficiently
      expect(endTime - startTime).toBeLessThan(5000);
    });

    test('should maintain consistent data across rapid sequential requests', async () => {
      const { token } = await createAdminUserAndToken();
      
      const employees = await createTestEmployees(5);
      await createPayrollRecords(employees, 1, 2026);
      
      // Make rapid sequential requests
      const responses = [];
      for (let i = 0; i < 5; i++) {
        const response = await request(app)
          .get('/api/dashboard/metrics')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);
        responses.push(response.body.data);
      }
      
      // All responses should be identical
      const firstResponse = responses[0];
      responses.forEach(response => {
        expect(response.payrollTotal.amount).toBe(firstResponse.payrollTotal.amount);
        expect(response.employeesPaid.count).toBe(firstResponse.employeesPaid.count);
        expect(response.employeesPaid.totalEmployees).toBe(firstResponse.employeesPaid.totalEmployees);
      });
    });
  });
});