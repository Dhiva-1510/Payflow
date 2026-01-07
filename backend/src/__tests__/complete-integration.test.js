/**
 * Complete System Integration Tests
 * 
 * Tests complete authentication and payroll workflows
 * Verifies frontend-backend integration patterns
 * Tests all requirements end-to-end
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

describe('Complete System Integration Tests', () => {
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
    test('should validate all authentication requirements end-to-end', async () => {
      // Requirement 1.1: User registration with role-based access
      const adminRegisterResponse = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'System Admin',
          email: 'admin@company.com',
          password: 'SecurePass123!',
          role: 'admin'
        });

      expect(adminRegisterResponse.status).toBe(201);
      expect(adminRegisterResponse.body.success).toBe(true);
      expect(adminRegisterResponse.body.user.role).toBe('admin');
      expect(adminRegisterResponse.body.user.password).toBeUndefined(); // Password should not be returned
      adminUserId = adminRegisterResponse.body.user.id;

      // Requirement 1.2: JWT token generation on login
      const adminLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@company.com',
          password: 'SecurePass123!'
        });

      expect(adminLoginResponse.status).toBe(200);
      expect(adminLoginResponse.body.success).toBe(true);
      expect(adminLoginResponse.body.token).toBeDefined();
      expect(typeof adminLoginResponse.body.token).toBe('string');
      expect(adminLoginResponse.body.user.role).toBe('admin');
      adminToken = adminLoginResponse.body.token;

      // Requirement 1.3: Invalid token rejection
      const invalidTokenResponse = await request(app)
        .get('/api/employee')
        .set('Authorization', 'Bearer invalid-token-here');

      expect(invalidTokenResponse.status).toBe(401);
      expect(invalidTokenResponse.body.success).toBe(false);
      expect(invalidTokenResponse.body.message).toContain('Invalid token');

      // Requirement 1.4: Role-based access control
      const employeeRegisterResponse = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Employee User',
          email: 'employee@company.com',
          password: 'EmpPass123!',
          role: 'employee'
        });

      const employeeLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'employee@company.com',
          password: 'EmpPass123!'
        });

      employeeToken = employeeLoginResponse.body.token;

      // Employee should be denied access to admin-only endpoints
      const employeeAccessDeniedResponse = await request(app)
        .get('/api/employee')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(employeeAccessDeniedResponse.status).toBe(403);
      expect(employeeAccessDeniedResponse.body.success).toBe(false);
      expect(employeeAccessDeniedResponse.body.message).toContain('admin access required');
    });

    test('should validate password security requirements', async () => {
      // Requirement 5.4: Password hashing
      const userRegisterResponse = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Security Test User',
          email: 'security@test.com',
          password: 'PlainTextPassword123',
          role: 'employee'
        });

      expect(userRegisterResponse.status).toBe(201);
      
      // Verify password is not returned in response
      expect(userRegisterResponse.body.user.password).toBeUndefined();

      // Verify password is hashed in database
      const userInDb = await User.findById(userRegisterResponse.body.user.id);
      expect(userInDb.password).toBeDefined();
      expect(userInDb.password).not.toBe('PlainTextPassword123');
      expect(userInDb.password.length).toBeGreaterThan(50); // Hashed password should be longer
    });
  });

  describe('Complete Employee Management Workflow Integration', () => {
    beforeEach(async () => {
      // Setup authenticated admin for employee management tests
      const adminRegisterResponse = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'HR Admin',
          email: 'hr@company.com',
          password: 'HRPass123',
          role: 'admin'
        });

      const adminLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'hr@company.com',
          password: 'HRPass123'
        });

      adminToken = adminLoginResponse.body.token;

      // Create employee user for linking
      const employeeRegisterResponse = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test Employee',
          email: 'test.employee@company.com',
          password: 'EmpPass123',
          role: 'employee'
        });

      employeeUserId = employeeRegisterResponse.body.user.id;
    });

    test('should validate all employee management requirements', async () => {
      // Requirement 2.1: Employee creation with valid data
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

      // Requirement 2.2: Employee list retrieval with user information
      const employeeListResponse = await request(app)
        .get('/api/employee')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(employeeListResponse.status).toBe(200);
      expect(employeeListResponse.body.success).toBe(true);
      expect(employeeListResponse.body.employees).toHaveLength(1);
      expect(employeeListResponse.body.employees[0]).toMatchObject({
        baseSalary: 75000,
        allowance: 12000,
        deduction: 8000,
        userEmail: 'test.employee@company.com',
        userName: 'Test Employee'
      });

      // Requirement 2.3: Employee update with valid data
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
      expect(updateEmployeeResponse.body.employee).toMatchObject({
        baseSalary: 80000,
        allowance: 15000,
        deduction: 10000
      });

      // Requirement 2.4: Data validation for invalid employee data
      const invalidDataResponse = await request(app)
        .post('/api/employee/add')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: employeeUserId,
          baseSalary: -5000, // Invalid negative salary
          allowance: 'invalid', // Invalid data type
          deduction: 2000
        });

      expect(invalidDataResponse.status).toBe(400);
      expect(invalidDataResponse.body.success).toBe(false);
    });
  });

  describe('Complete Payroll Processing Workflow Integration', () => {
    beforeEach(async () => {
      // Setup admin and employee for payroll tests
      const adminRegisterResponse = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Payroll Admin',
          email: 'payroll@company.com',
          password: 'PayrollPass123',
          role: 'admin'
        });

      const employeeRegisterResponse = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Payroll Employee',
          email: 'payroll.emp@company.com',
          password: 'EmpPass123',
          role: 'employee'
        });

      const adminLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'payroll@company.com',
          password: 'PayrollPass123'
        });

      const employeeLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'payroll.emp@company.com',
          password: 'EmpPass123'
        });

      adminToken = adminLoginResponse.body.token;
      employeeToken = employeeLoginResponse.body.token;
      employeeUserId = employeeRegisterResponse.body.user.id;

      // Create employee record
      const addEmployeeResponse = await request(app)
        .post('/api/employee/add')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: employeeUserId,
          baseSalary: 60000,
          allowance: 8000,
          deduction: 4000
        });

      employeeId = addEmployeeResponse.body.employee.id;
    });

    test('should validate all payroll processing requirements', async () => {
      // Requirement 3.1 & 3.4: Payroll processing for all employees
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

      const payrollResult = runPayrollResponse.body.data.results[0];
      expect(payrollResult.success).toBe(true);
      expect(payrollResult.payroll).toMatchObject({
        month: 12,
        year: 2024,
        baseSalary: 60000,
        allowance: 8000,
        deduction: 4000
      });

      // Requirement 3.2: Gross salary calculation (base + allowance)
      expect(payrollResult.payroll.grossSalary).toBe(68000); // 60000 + 8000

      // Requirement 3.3: Net salary calculation (gross - deduction)
      expect(payrollResult.payroll.netSalary).toBe(64000); // 68000 - 4000

      // Requirement 3.5: Error handling - test with no employees
      await Employee.deleteMany({});
      
      const noEmployeesPayrollResponse = await request(app)
        .post('/api/payroll/run')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          month: 1,
          year: 2025
        });

      expect(noEmployeesPayrollResponse.status).toBe(200);
      expect(noEmployeesPayrollResponse.body.data.processedCount).toBe(0);
      expect(noEmployeesPayrollResponse.body.data.results).toHaveLength(0);
    });
  });

  describe('Complete Payroll History and Access Control Integration', () => {
    beforeEach(async () => {
      // Setup multiple users for access control testing
      const adminRegisterResponse = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'History Admin',
          email: 'history.admin@company.com',
          password: 'AdminPass123',
          role: 'admin'
        });

      const employee1RegisterResponse = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Employee One',
          email: 'emp1@company.com',
          password: 'Emp1Pass123',
          role: 'employee'
        });

      const employee2RegisterResponse = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Employee Two',
          email: 'emp2@company.com',
          password: 'Emp2Pass123',
          role: 'employee'
        });

      const adminLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'history.admin@company.com',
          password: 'AdminPass123'
        });

      const employee1LoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'emp1@company.com',
          password: 'Emp1Pass123'
        });

      adminToken = adminLoginResponse.body.token;
      employeeToken = employee1LoginResponse.body.token;

      // Create employee records
      const addEmployee1Response = await request(app)
        .post('/api/employee/add')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: employee1RegisterResponse.body.user.id,
          baseSalary: 55000,
          allowance: 7000,
          deduction: 3000
        });

      const addEmployee2Response = await request(app)
        .post('/api/employee/add')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: employee2RegisterResponse.body.user.id,
          baseSalary: 65000,
          allowance: 9000,
          deduction: 5000
        });

      employeeId = addEmployee1Response.body.employee.id;
      const employee2Id = addEmployee2Response.body.employee.id;

      // Run payroll for multiple months
      const months = [
        { month: 10, year: 2024 },
        { month: 11, year: 2024 },
        { month: 12, year: 2024 }
      ];

      for (const period of months) {
        await request(app)
          .post('/api/payroll/run')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(period);
      }
    });

    test('should validate all payroll history and access requirements', async () => {
      // Requirement 4.1: Employee can only access their own payroll
      const ownPayrollResponse = await request(app)
        .get(`/api/payroll/${employeeId}`)
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(ownPayrollResponse.status).toBe(200);
      expect(ownPayrollResponse.body.success).toBe(true);
      expect(ownPayrollResponse.body.data.payrollRecords).toHaveLength(3);

      // Requirement 4.2: Payroll display includes all required fields
      const payrollRecord = ownPayrollResponse.body.data.payrollRecords[0];
      expect(payrollRecord).toHaveProperty('month');
      expect(payrollRecord).toHaveProperty('year');
      expect(payrollRecord).toHaveProperty('baseSalary');
      expect(payrollRecord).toHaveProperty('allowance');
      expect(payrollRecord).toHaveProperty('deduction');
      expect(payrollRecord).toHaveProperty('grossSalary');
      expect(payrollRecord).toHaveProperty('netSalary');

      // Requirement 4.3: Employee cannot access other employee's payroll
      // Create a second employee to test access control
      const employee2RegisterResponse = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Employee Two',
          email: 'emp2@company.com',
          password: 'Emp2Pass123',
          role: 'employee'
        });

      const addEmployee2Response = await request(app)
        .post('/api/employee/add')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: employee2RegisterResponse.body.user.id,
          baseSalary: 65000,
          allowance: 9000,
          deduction: 5000
        });

      const employee2Id = addEmployee2Response.body.employee.id;

      // Employee 1 should not be able to access Employee 2's payroll
      const otherEmployeePayrollResponse = await request(app)
        .get(`/api/payroll/${employee2Id}`)
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(otherEmployeePayrollResponse.status).toBe(403);
      expect(otherEmployeePayrollResponse.body.success).toBe(false);
      expect(otherEmployeePayrollResponse.body.message).toContain('Access denied');

      // Requirement 4.4: Empty result set when no payroll records exist
      // Create new employee with no payroll records
      const newEmployeeRegisterResponse = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'New Employee',
          email: 'new.emp@company.com',
          password: 'NewEmpPass123',
          role: 'employee'
        });

      const newEmployeeLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'new.emp@company.com',
          password: 'NewEmpPass123'
        });

      const addNewEmployeeResponse = await request(app)
        .post('/api/employee/add')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: newEmployeeRegisterResponse.body.user.id,
          baseSalary: 50000,
          allowance: 5000,
          deduction: 2000
        });

      const newEmployeePayrollResponse = await request(app)
        .get(`/api/payroll/${addNewEmployeeResponse.body.employee.id}`)
        .set('Authorization', `Bearer ${newEmployeeLoginResponse.body.token}`);

      expect(newEmployeePayrollResponse.status).toBe(200);
      expect(newEmployeePayrollResponse.body.data.payrollRecords).toHaveLength(0);

      // Requirement 4.5: Records ordered by date (most recent first)
      const records = ownPayrollResponse.body.data.payrollRecords;
      expect(records[0].year).toBe(2024);
      expect(records[0].month).toBe(12);
      expect(records[1].month).toBe(11);
      expect(records[2].month).toBe(10);
    });
  });

  describe('Data Persistence and Referential Integrity Integration', () => {
    test('should validate all data persistence requirements', async () => {
      // Setup admin
      const adminRegisterResponse = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Data Admin',
          email: 'data@company.com',
          password: 'DataPass123',
          role: 'admin'
        });

      const adminLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'data@company.com',
          password: 'DataPass123'
        });

      adminToken = adminLoginResponse.body.token;

      // Requirement 5.1: User information storage
      const userInDb = await User.findById(adminRegisterResponse.body.user.id);
      expect(userInDb).toMatchObject({
        name: 'Data Admin',
        email: 'data@company.com',
        role: 'admin'
      });
      expect(userInDb.password).toBeDefined();
      expect(userInDb.createdAt).toBeDefined();

      // Create employee user
      const employeeRegisterResponse = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Data Employee',
          email: 'data.emp@company.com',
          password: 'EmpPass123',
          role: 'employee'
        });

      // Requirement 5.2: Employee information storage with user reference
      const addEmployeeResponse = await request(app)
        .post('/api/employee/add')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: employeeRegisterResponse.body.user.id,
          baseSalary: 70000,
          allowance: 10000,
          deduction: 6000
        });

      const employeeInDb = await Employee.findById(addEmployeeResponse.body.employee.id);
      expect(employeeInDb.userId.toString()).toBe(employeeRegisterResponse.body.user.id);
      expect(employeeInDb.baseSalary).toBe(70000);
      expect(employeeInDb.allowance).toBe(10000);
      expect(employeeInDb.deduction).toBe(6000);
      expect(employeeInDb.createdAt).toBeDefined();

      // Requirement 5.3: Payroll records storage with employee reference
      const runPayrollResponse = await request(app)
        .post('/api/payroll/run')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          month: 12,
          year: 2024
        });

      const payrollInDb = await Payroll.findOne({
        employeeId: addEmployeeResponse.body.employee.id
      });

      expect(payrollInDb.employeeId.toString()).toBe(addEmployeeResponse.body.employee.id);
      expect(payrollInDb.month).toBe(12);
      expect(payrollInDb.year).toBe(2024);
      expect(payrollInDb.baseSalary).toBe(70000);
      expect(payrollInDb.allowance).toBe(10000);
      expect(payrollInDb.deduction).toBe(6000);
      expect(payrollInDb.grossSalary).toBe(80000);
      expect(payrollInDb.netSalary).toBe(74000);
      expect(payrollInDb.createdAt).toBeDefined();

      // Requirement 5.5: Referential integrity validation
      // Verify user-employee relationship
      const populatedEmployee = await Employee.findById(addEmployeeResponse.body.employee.id).populate('userId');
      expect(populatedEmployee.userId.email).toBe('data.emp@company.com');

      // Verify employee-payroll relationship
      const populatedPayroll = await Payroll.findById(payrollInDb._id).populate('employeeId');
      expect(populatedPayroll.employeeId.baseSalary).toBe(70000);
    });
  });

  describe('API Endpoints and Communication Integration', () => {
    test('should validate all API endpoint requirements', async () => {
      // Requirement 6.1: POST /api/auth/register
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'API Test User',
          email: 'api@test.com',
          password: 'ApiPass123',
          role: 'admin'
        });

      expect(registerResponse.status).toBe(201);
      expect(registerResponse.body.success).toBe(true);

      // Requirement 6.2: POST /api/auth/login
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'api@test.com',
          password: 'ApiPass123'
        });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body.success).toBe(true);
      expect(loginResponse.body.token).toBeDefined();
      adminToken = loginResponse.body.token;

      // Create employee user for testing
      const empRegisterResponse = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'API Employee',
          email: 'api.emp@test.com',
          password: 'EmpPass123',
          role: 'employee'
        });

      // Requirement 6.3: POST /api/employee/add (admin only)
      const addEmployeeResponse = await request(app)
        .post('/api/employee/add')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: empRegisterResponse.body.user.id,
          baseSalary: 55000,
          allowance: 7000,
          deduction: 3000
        });

      expect(addEmployeeResponse.status).toBe(201);
      expect(addEmployeeResponse.body.success).toBe(true);
      employeeId = addEmployeeResponse.body.employee.id;

      // Requirement 6.4: GET /api/employee (admin only)
      const employeeListResponse = await request(app)
        .get('/api/employee')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(employeeListResponse.status).toBe(200);
      expect(employeeListResponse.body.success).toBe(true);
      expect(employeeListResponse.body.employees).toHaveLength(1);

      // Requirement 6.5: PUT /api/employee/:id (admin only)
      const updateEmployeeResponse = await request(app)
        .put(`/api/employee/${employeeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          baseSalary: 60000,
          allowance: 8000,
          deduction: 4000
        });

      expect(updateEmployeeResponse.status).toBe(200);
      expect(updateEmployeeResponse.body.success).toBe(true);

      // Requirement 6.6: POST /api/payroll/run (admin only)
      const runPayrollResponse = await request(app)
        .post('/api/payroll/run')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          month: 12,
          year: 2024
        });

      expect(runPayrollResponse.status).toBe(200);
      expect(runPayrollResponse.body.success).toBe(true);

      // Requirement 6.7: GET /api/payroll/:employeeId
      const payrollHistoryResponse = await request(app)
        .get(`/api/payroll/${employeeId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(payrollHistoryResponse.status).toBe(200);
      expect(payrollHistoryResponse.body.success).toBe(true);
      expect(payrollHistoryResponse.body.data.payrollRecords).toHaveLength(1);
    });

    test('should validate JSON communication format', async () => {
      // Requirement 8.4: JSON format for all API requests and responses
      const response = await request(app)
        .post('/api/auth/register')
        .set('Content-Type', 'application/json')
        .send({
          name: 'JSON Test User',
          email: 'json@test.com',
          password: 'JsonPass123',
          role: 'employee'
        });

      expect(response.status).toBe(201);
      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.body).toBeInstanceOf(Object);
      expect(response.body.success).toBeDefined();
    });
  });

  describe('System Integration and Error Handling', () => {
    test('should handle comprehensive error scenarios', async () => {
      // Test duplicate user registration
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
          password: 'password456',
          role: 'admin'
        });

      expect(duplicateResponse.status).toBe(400);
      expect(duplicateResponse.body.success).toBe(false);
      expect(duplicateResponse.body.message).toContain('already exists');

      // Test invalid login credentials
      const invalidLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@test.com',
          password: 'wrongpassword'
        });

      expect(invalidLoginResponse.status).toBe(401);
      expect(invalidLoginResponse.body.success).toBe(false);

      // Test unauthorized access
      const unauthorizedResponse = await request(app)
        .get('/api/employee');

      expect(unauthorizedResponse.status).toBe(401);
      expect(unauthorizedResponse.body.success).toBe(false);

      // Test malformed requests
      const malformedResponse = await request(app)
        .post('/api/auth/register')
        .send({
          // Missing required fields
          name: 'Incomplete User'
        });

      expect(malformedResponse.status).toBe(400);
      expect(malformedResponse.body.success).toBe(false);
    });
  });
});