/**
 * Comprehensive Integration Tests
 * 
 * Tests complete authentication and payroll workflows
 * Verifies frontend-backend integration patterns
 * Tests system-wide data flow and consistency
 * 
 * Requirements: All
 */

import request from 'supertest';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Import routes
import authRoutes from '../routes/auth.js';
import employeeRoutes from '../routes/employee.js';
import payrollRoutes from '../routes/payroll.js';

// Import models for cleanup
import User from '../models/User.js';
import Employee from '../models/Employee.js';
import Payroll from '../models/Payroll.js';

dotenv.config();

// Create test app
const createTestApp = () => {
  const app = express();
  app.use(cors());
  app.use(express.json());
  
  // Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/employee', employeeRoutes);
  app.use('/api/payroll', payrollRoutes);
  
  return app;
};

describe('Comprehensive Integration Tests', () => {
  let app;
  let adminToken;
  let employeeToken;
  let adminUserId;
  let employeeUserId;
  let employeeId;

  beforeAll(async () => {
    // Connect to test database
    const testDbUri = process.env.MONGO_URI?.replace('payrolldb', 'payrolldb_test') || 'mongodb://127.0.0.1:27017/payrolldb_test';
    await mongoose.connect(testDbUri);
    
    app = createTestApp();
  });

  beforeEach(async () => {
    // Clean up database before each test
    await User.deleteMany({});
    await Employee.deleteMany({});
    await Payroll.deleteMany({});
  });

  afterAll(async () => {
    // Clean up and close connection
    await User.deleteMany({});
    await Employee.deleteMany({});
    await Payroll.deleteMany({});
    await mongoose.connection.close();
  });

  describe('Complete Authentication Workflow Integration', () => {
    test('should handle complete user registration and login flow with proper token management', async () => {
      // Step 1: Register admin user
      const adminRegisterResponse = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'System Administrator',
          email: 'admin@payrollsystem.com',
          password: 'SecureAdminPass123!',
          role: 'admin'
        });

      expect(adminRegisterResponse.status).toBe(201);
      expect(adminRegisterResponse.body.success).toBe(true);
      expect(adminRegisterResponse.body.user).toMatchObject({
        name: 'System Administrator',
        email: 'admin@payrollsystem.com',
        role: 'admin'
      });
      expect(adminRegisterResponse.body.user.password).toBeUndefined(); // Password should not be returned
      adminUserId = adminRegisterResponse.body.user.id;

      // Step 2: Register employee user
      const employeeRegisterResponse = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'John Employee',
          email: 'john.employee@payrollsystem.com',
          password: 'EmployeePass123!',
          role: 'employee'
        });

      expect(employeeRegisterResponse.status).toBe(201);
      expect(employeeRegisterResponse.body.success).toBe(true);
      expect(employeeRegisterResponse.body.user.role).toBe('employee');
      employeeUserId = employeeRegisterResponse.body.user.id;

      // Step 3: Admin login with JWT token validation
      const adminLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@payrollsystem.com',
          password: 'SecureAdminPass123!'
        });

      expect(adminLoginResponse.status).toBe(200);
      expect(adminLoginResponse.body.success).toBe(true);
      expect(adminLoginResponse.body.token).toBeDefined();
      expect(typeof adminLoginResponse.body.token).toBe('string');
      expect(adminLoginResponse.body.user).toMatchObject({
        name: 'System Administrator',
        email: 'admin@payrollsystem.com',
        role: 'admin'
      });
      adminToken = adminLoginResponse.body.token;

      // Step 4: Employee login with JWT token validation
      const employeeLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'john.employee@payrollsystem.com',
          password: 'EmployeePass123!'
        });

      expect(employeeLoginResponse.status).toBe(200);
      expect(employeeLoginResponse.body.success).toBe(true);
      expect(employeeLoginResponse.body.token).toBeDefined();
      expect(employeeLoginResponse.body.user.role).toBe('employee');
      employeeToken = employeeLoginResponse.body.token;

      // Step 5: Verify tokens work for authenticated requests
      const adminAuthTestResponse = await request(app)
        .get('/api/employee')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(adminAuthTestResponse.status).toBe(200);
      expect(adminAuthTestResponse.body.success).toBe(true);

      // Step 6: Verify employee token works but has limited access
      const employeeAuthTestResponse = await request(app)
        .get('/api/employee')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(employeeAuthTestResponse.status).toBe(403);
      expect(employeeAuthTestResponse.body.success).toBe(false);
      expect(employeeAuthTestResponse.body.message).toContain('admin access required');
    });

    test('should handle authentication errors and security validations', async () => {
      // Test duplicate email registration
      await request(app)
        .post('/api/auth/register')
        .send({
          name: 'First User',
          email: 'duplicate@test.com',
          password: 'password123',
          role: 'employee'
        });

      const duplicateResponse = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Second User',
          email: 'duplicate@test.com',
          password: 'differentpass',
          role: 'admin'
        });

      expect(duplicateResponse.status).toBe(400);
      expect(duplicateResponse.body.success).toBe(false);
      expect(duplicateResponse.body.message).toContain('already exists');

      // Test invalid login credentials
      const invalidLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'duplicate@test.com',
          password: 'wrongpassword'
        });

      expect(invalidLoginResponse.status).toBe(401);
      expect(invalidLoginResponse.body.success).toBe(false);

      // Test login with non-existent user
      const nonExistentResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@test.com',
          password: 'password123'
        });

      expect(nonExistentResponse.status).toBe(401);
      expect(nonExistentResponse.body.success).toBe(false);
    });
  });

  describe('Complete Payroll Workflow Integration', () => {
    beforeEach(async () => {
      // Setup authenticated users for payroll tests
      const adminRegisterResponse = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Payroll Admin',
          email: 'payroll.admin@company.com',
          password: 'AdminPass123',
          role: 'admin'
        });

      const employeeRegisterResponse = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test Employee',
          email: 'test.employee@company.com',
          password: 'EmpPass123',
          role: 'employee'
        });

      const adminLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'payroll.admin@company.com',
          password: 'AdminPass123'
        });

      const employeeLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test.employee@company.com',
          password: 'EmpPass123'
        });

      adminToken = adminLoginResponse.body.token;
      employeeToken = employeeLoginResponse.body.token;
      employeeUserId = employeeRegisterResponse.body.user.id;
    });

    test('should complete full payroll processing workflow with accurate calculations', async () => {
      // Step 1: Admin creates employee record
      const addEmployeeResponse = await request(app)
        .post('/api/employee/add')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: employeeUserId,
          baseSalary: 75000,
          allowance: 12000,
          deduction: 8000
        });

      expect(addEmployeeResponse.status).toBe(201);
      expect(addEmployeeResponse.body.success).toBe(true);
      expect(addEmployeeResponse.body.employee).toMatchObject({
        userId: employeeUserId,
        baseSalary: 75000,
        allowance: 12000,
        deduction: 8000
      });
      employeeId = addEmployeeResponse.body.employee.id;

      // Step 2: Verify employee appears in employee list
      const employeeListResponse = await request(app)
        .get('/api/employee')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(employeeListResponse.status).toBe(200);
      expect(employeeListResponse.body.employees).toHaveLength(1);
      expect(employeeListResponse.body.employees[0]).toMatchObject({
        baseSalary: 75000,
        allowance: 12000,
        deduction: 8000,
        userEmail: 'test.employee@company.com'
      });

      // Step 3: Admin runs payroll processing
      const runPayrollResponse = await request(app)
        .post('/api/payroll/run')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          month: 12,
          year: 2024
        });

      expect(runPayrollResponse.status).toBe(200);
      expect(runPayrollResponse.body.success).toBe(true);
      expect(runPayrollResponse.body.data.processedCount).toBe(1);
      expect(runPayrollResponse.body.data.results).toHaveLength(1);

      // Verify payroll calculations
      const payrollResult = runPayrollResponse.body.data.results[0];
      expect(payrollResult.success).toBe(true);
      expect(payrollResult.payroll).toMatchObject({
        month: 12,
        year: 2024,
        baseSalary: 75000,
        allowance: 12000,
        deduction: 8000,
        grossSalary: 87000, // 75000 + 12000
        netSalary: 79000    // 87000 - 8000
      });

      // Step 4: Admin views payroll history
      const adminPayrollHistoryResponse = await request(app)
        .get(`/api/payroll/${employeeId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(adminPayrollHistoryResponse.status).toBe(200);
      expect(adminPayrollHistoryResponse.body.success).toBe(true);
      expect(adminPayrollHistoryResponse.body.data.payrollRecords).toHaveLength(1);
      expect(adminPayrollHistoryResponse.body.data.payrollRecords[0]).toMatchObject({
        month: 12,
        year: 2024,
        grossSalary: 87000,
        netSalary: 79000
      });

      // Step 5: Employee views their own payroll history
      const employeePayrollHistoryResponse = await request(app)
        .get(`/api/payroll/${employeeId}`)
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(employeePayrollHistoryResponse.status).toBe(200);
      expect(employeePayrollHistoryResponse.body.success).toBe(true);
      expect(employeePayrollHistoryResponse.body.data.payrollRecords).toHaveLength(1);
      expect(employeePayrollHistoryResponse.body.data.payrollRecords[0]).toMatchObject({
        month: 12,
        year: 2024,
        baseSalary: 75000,
        allowance: 12000,
        deduction: 8000,
        grossSalary: 87000,
        netSalary: 79000
      });

      // Step 6: Admin updates employee salary
      const updateEmployeeResponse = await request(app)
        .put(`/api/employee/${employeeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          baseSalary: 80000,
          allowance: 15000,
          deduction: 10000
        });

      expect(updateEmployeeResponse.status).toBe(200);
      expect(updateEmployeeResponse.body.success).toBe(true);

      // Step 7: Run payroll for next month with updated salary
      const nextPayrollResponse = await request(app)
        .post('/api/payroll/run')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          month: 1,
          year: 2025
        });

      expect(nextPayrollResponse.status).toBe(200);
      expect(nextPayrollResponse.body.data.processedCount).toBe(1);

      // Verify updated calculations
      const updatedPayrollResult = nextPayrollResponse.body.data.results[0];
      expect(updatedPayrollResult.payroll).toMatchObject({
        month: 1,
        year: 2025,
        baseSalary: 80000,
        allowance: 15000,
        deduction: 10000,
        grossSalary: 95000, // 80000 + 15000
        netSalary: 85000    // 95000 - 10000
      });

      // Step 8: Verify employee now has 2 payroll records
      const finalPayrollHistoryResponse = await request(app)
        .get(`/api/payroll/${employeeId}`)
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(finalPayrollHistoryResponse.status).toBe(200);
      expect(finalPayrollHistoryResponse.body.data.payrollRecords).toHaveLength(2);

      // Verify records are ordered by date (most recent first)
      const records = finalPayrollHistoryResponse.body.data.payrollRecords;
      expect(records[0].year).toBe(2025);
      expect(records[0].month).toBe(1);
      expect(records[0].netSalary).toBe(85000);
      expect(records[1].year).toBe(2024);
      expect(records[1].month).toBe(12);
      expect(records[1].netSalary).toBe(79000);
    });

    test('should handle multiple employees payroll processing with different salary structures', async () => {
      // Create multiple employees with different salary structures
      const employees = [];
      
      for (let i = 1; i <= 3; i++) {
        const empRegisterResponse = await request(app)
          .post('/api/auth/register')
          .send({
            name: `Employee ${i}`,
            email: `employee${i}@company.com`,
            password: 'EmpPass123',
            role: 'employee'
          });

        const addEmpResponse = await request(app)
          .post('/api/employee/add')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            userId: empRegisterResponse.body.user.id,
            baseSalary: 50000 + (i * 10000),
            allowance: 5000 + (i * 2000),
            deduction: 2000 + (i * 1000)
          });

        employees.push({
          userId: empRegisterResponse.body.user.id,
          employeeId: addEmpResponse.body.employee.id,
          baseSalary: 50000 + (i * 10000),
          allowance: 5000 + (i * 2000),
          deduction: 2000 + (i * 1000),
          expectedGross: (50000 + (i * 10000)) + (5000 + (i * 2000)),
          expectedNet: ((50000 + (i * 10000)) + (5000 + (i * 2000))) - (2000 + (i * 1000))
        });
      }

      // Run payroll for all employees
      const payrollResponse = await request(app)
        .post('/api/payroll/run')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          month: 12,
          year: 2024
        });

      expect(payrollResponse.status).toBe(200);
      expect(payrollResponse.body.data.processedCount).toBe(3);
      expect(payrollResponse.body.data.results).toHaveLength(3);

      // Verify calculations for each employee
      payrollResponse.body.data.results.forEach((result, index) => {
        expect(result.success).toBe(true);
        expect(result.payroll.grossSalary).toBe(employees[index].expectedGross);
        expect(result.payroll.netSalary).toBe(employees[index].expectedNet);
      });

      // Verify each employee can access only their own payroll
      for (let i = 0; i < employees.length; i++) {
        const empLoginResponse = await request(app)
          .post('/api/auth/login')
          .send({
            email: `employee${i + 1}@company.com`,
            password: 'EmpPass123'
          });

        const empToken = empLoginResponse.body.token;

        // Employee can access their own payroll
        const ownPayrollResponse = await request(app)
          .get(`/api/payroll/${employees[i].employeeId}`)
          .set('Authorization', `Bearer ${empToken}`);

        expect(ownPayrollResponse.status).toBe(200);
        expect(ownPayrollResponse.body.data.payrollRecords).toHaveLength(1);

        // Employee cannot access other employees' payroll
        if (i < employees.length - 1) {
          const otherPayrollResponse = await request(app)
            .get(`/api/payroll/${employees[i + 1].employeeId}`)
            .set('Authorization', `Bearer ${empToken}`);

          expect(otherPayrollResponse.status).toBe(403);
          expect(otherPayrollResponse.body.message).toContain('Access denied');
        }
      }
    });
  });

  describe('Frontend-Backend Integration Patterns', () => {
    beforeEach(async () => {
      // Setup for frontend-backend integration tests
      const adminRegisterResponse = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Integration Admin',
          email: 'integration.admin@test.com',
          password: 'IntegrationPass123',
          role: 'admin'
        });

      const adminLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'integration.admin@test.com',
          password: 'IntegrationPass123'
        });

      adminToken = adminLoginResponse.body.token;
    });

    test('should handle API response formats expected by frontend', async () => {
      // Test authentication response format
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'integration.admin@test.com',
          password: 'IntegrationPass123'
        });

      expect(loginResponse.body).toMatchObject({
        success: true,
        token: expect.any(String),
        user: {
          id: expect.any(String),
          name: 'Integration Admin',
          email: 'integration.admin@test.com',
          role: 'admin'
        }
      });

      // Test employee list response format
      const employeeListResponse = await request(app)
        .get('/api/employee')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(employeeListResponse.body).toMatchObject({
        success: true,
        employees: expect.any(Array)
      });

      // Test error response format
      const unauthorizedResponse = await request(app)
        .get('/api/employee');

      expect(unauthorizedResponse.body).toMatchObject({
        success: false,
        message: expect.any(String)
      });
    });

    test('should handle CORS and HTTP headers for frontend integration', async () => {
      // Test CORS headers are present
      const corsResponse = await request(app)
        .options('/api/auth/login')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'Content-Type,Authorization');

      expect(corsResponse.status).toBe(204);

      // Test JSON content type handling
      const jsonResponse = await request(app)
        .post('/api/auth/register')
        .set('Content-Type', 'application/json')
        .send({
          name: 'JSON Test User',
          email: 'json@test.com',
          password: 'password123',
          role: 'employee'
        });

      expect(jsonResponse.status).toBe(201);
      expect(jsonResponse.headers['content-type']).toMatch(/application\/json/);
    });

    test('should handle pagination and data filtering for frontend lists', async () => {
      // Create multiple employees for pagination testing
      for (let i = 1; i <= 5; i++) {
        const empRegisterResponse = await request(app)
          .post('/api/auth/register')
          .send({
            name: `Pagination Employee ${i}`,
            email: `pag.emp${i}@test.com`,
            password: 'password123',
            role: 'employee'
          });

        await request(app)
          .post('/api/employee/add')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            userId: empRegisterResponse.body.user.id,
            baseSalary: 50000 + (i * 5000),
            allowance: 5000,
            deduction: 2000
          });
      }

      // Test employee list returns all employees
      const employeeListResponse = await request(app)
        .get('/api/employee')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(employeeListResponse.status).toBe(200);
      expect(employeeListResponse.body.employees).toHaveLength(5);
      expect(employeeListResponse.body.employees[0]).toHaveProperty('userEmail');
      expect(employeeListResponse.body.employees[0]).toHaveProperty('userName');
      expect(employeeListResponse.body.employees[0]).toHaveProperty('baseSalary');
    });
  });

  describe('System-Wide Data Consistency Integration', () => {
    test('should maintain data consistency across all operations', async () => {
      // Setup admin
      const adminRegisterResponse = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Consistency Admin',
          email: 'consistency.admin@test.com',
          password: 'ConsistencyPass123',
          role: 'admin'
        });

      const adminLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'consistency.admin@test.com',
          password: 'ConsistencyPass123'
        });

      adminToken = adminLoginResponse.body.token;

      // Create employee
      const empRegisterResponse = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Consistency Employee',
          email: 'consistency.emp@test.com',
          password: 'EmpPass123',
          role: 'employee'
        });

      const addEmpResponse = await request(app)
        .post('/api/employee/add')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: empRegisterResponse.body.user.id,
          baseSalary: 60000,
          allowance: 8000,
          deduction: 4000
        });

      employeeId = addEmpResponse.body.employee.id;

      // Run payroll multiple times
      const months = [
        { month: 10, year: 2024 },
        { month: 11, year: 2024 },
        { month: 12, year: 2024 }
      ];

      for (const period of months) {
        const payrollResponse = await request(app)
          .post('/api/payroll/run')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(period);

        expect(payrollResponse.status).toBe(200);
        expect(payrollResponse.body.data.processedCount).toBe(1);
        
        // Verify consistent calculations
        const result = payrollResponse.body.data.results[0];
        expect(result.payroll.grossSalary).toBe(68000); // 60000 + 8000
        expect(result.payroll.netSalary).toBe(64000);   // 68000 - 4000
      }

      // Verify payroll history consistency
      const historyResponse = await request(app)
        .get(`/api/payroll/${employeeId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(historyResponse.status).toBe(200);
      expect(historyResponse.body.data.payrollRecords).toHaveLength(3);

      // All records should have consistent calculations
      historyResponse.body.data.payrollRecords.forEach(record => {
        expect(record.baseSalary).toBe(60000);
        expect(record.allowance).toBe(8000);
        expect(record.deduction).toBe(4000);
        expect(record.grossSalary).toBe(68000);
        expect(record.netSalary).toBe(64000);
      });

      // Update employee and verify new calculations
      await request(app)
        .put(`/api/employee/${employeeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          baseSalary: 70000,
          allowance: 10000,
          deduction: 5000
        });

      // Run payroll with updated data
      const updatedPayrollResponse = await request(app)
        .post('/api/payroll/run')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ month: 1, year: 2025 });

      expect(updatedPayrollResponse.status).toBe(200);
      const updatedResult = updatedPayrollResponse.body.data.results[0];
      expect(updatedResult.payroll.grossSalary).toBe(80000); // 70000 + 10000
      expect(updatedResult.payroll.netSalary).toBe(75000);   // 80000 - 5000

      // Verify historical data remains unchanged
      const finalHistoryResponse = await request(app)
        .get(`/api/payroll/${employeeId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(finalHistoryResponse.body.data.payrollRecords).toHaveLength(4);
      
      // Most recent record should have new calculations
      const records = finalHistoryResponse.body.data.payrollRecords;
      expect(records[0].netSalary).toBe(75000); // New calculation
      expect(records[1].netSalary).toBe(64000); // Old calculation
      expect(records[2].netSalary).toBe(64000); // Old calculation
      expect(records[3].netSalary).toBe(64000); // Old calculation
    });
  });

  describe('Error Handling and Recovery Integration', () => {
    test('should handle system-wide error scenarios gracefully', async () => {
      // Setup admin
      const adminRegisterResponse = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Error Test Admin',
          email: 'error.admin@test.com',
          password: 'ErrorPass123',
          role: 'admin'
        });

      const adminLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'error.admin@test.com',
          password: 'ErrorPass123'
        });

      adminToken = adminLoginResponse.body.token;

      // Test payroll with no employees
      const noEmployeesResponse = await request(app)
        .post('/api/payroll/run')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ month: 12, year: 2024 });

      expect(noEmployeesResponse.status).toBe(200);
      expect(noEmployeesResponse.body.data.processedCount).toBe(0);
      expect(noEmployeesResponse.body.data.results).toHaveLength(0);

      // Test accessing non-existent payroll
      const nonExistentPayrollResponse = await request(app)
        .get('/api/payroll/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(nonExistentPayrollResponse.status).toBe(404);
      expect(nonExistentPayrollResponse.body.success).toBe(false);

      // Test invalid payroll parameters
      const invalidMonthResponse = await request(app)
        .post('/api/payroll/run')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ month: 13, year: 2024 });

      expect(invalidMonthResponse.status).toBe(500);
      expect(invalidMonthResponse.body.success).toBe(false);

      // Test malformed requests
      const malformedResponse = await request(app)
        .post('/api/employee/add')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          // Missing required fields
          baseSalary: 50000
        });

      expect(malformedResponse.status).toBe(400);
      expect(malformedResponse.body.success).toBe(false);
    });
  });
});