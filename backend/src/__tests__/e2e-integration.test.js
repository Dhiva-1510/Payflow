/**
 * Comprehensive End-to-End Integration Tests
 * 
 * Tests complete user workflows from registration to payroll viewing
 * Verifies all role-based access controls work correctly
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

describe('Comprehensive End-to-End Integration Tests', () => {
  let app;
  let adminToken;
  let employeeToken;
  let employee2Token;
  let adminUserId;
  let employeeUserId;
  let employee2UserId;
  let employeeId;
  let employee2Id;

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

  describe('Complete Admin Workflow - Full System Test', () => {
    test('should complete comprehensive admin workflow: register → login → manage multiple employees → run payroll → view all results', async () => {
      // Step 1: Admin Registration
      const adminRegisterResponse = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'System Admin',
          email: 'admin@company.com',
          password: 'securePassword123',
          role: 'admin'
        });

      expect(adminRegisterResponse.status).toBe(201);
      expect(adminRegisterResponse.body.success).toBe(true);
      expect(adminRegisterResponse.body.user.role).toBe('admin');
      adminUserId = adminRegisterResponse.body.user.id;

      // Step 2: Admin Login
      const adminLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@company.com',
          password: 'securePassword123'
        });

      expect(adminLoginResponse.status).toBe(200);
      expect(adminLoginResponse.body.success).toBe(true);
      expect(adminLoginResponse.body.token).toBeDefined();
      adminToken = adminLoginResponse.body.token;

      // Step 3: Register Multiple Employee Users
      const employee1RegisterResponse = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'John Doe',
          email: 'john.doe@company.com',
          password: 'password123',
          role: 'employee'
        });

      const employee2RegisterResponse = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Jane Smith',
          email: 'jane.smith@company.com',
          password: 'password123',
          role: 'employee'
        });

      expect(employee1RegisterResponse.status).toBe(201);
      expect(employee2RegisterResponse.status).toBe(201);
      employeeUserId = employee1RegisterResponse.body.user.id;
      employee2UserId = employee2RegisterResponse.body.user.id;

      // Step 4: Admin adds multiple employees with different salary structures
      const addEmployee1Response = await request(app)
        .post('/api/employee/add')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: employeeUserId,
          baseSalary: 60000,
          allowance: 8000,
          deduction: 3000
        });

      const addEmployee2Response = await request(app)
        .post('/api/employee/add')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: employee2UserId,
          baseSalary: 75000,
          allowance: 10000,
          deduction: 5000
        });

      expect(addEmployee1Response.status).toBe(201);
      expect(addEmployee2Response.status).toBe(201);
      employeeId = addEmployee1Response.body.employee.id;
      employee2Id = addEmployee2Response.body.employee.id;

      // Step 5: Admin views complete employee list
      const employeeListResponse = await request(app)
        .get('/api/employee')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(employeeListResponse.status).toBe(200);
      expect(employeeListResponse.body.success).toBe(true);
      expect(employeeListResponse.body.employees).toHaveLength(2);
      
      // Verify employee details
      const employees = employeeListResponse.body.employees;
      const johnEmployee = employees.find(emp => emp.userEmail === 'john.doe@company.com');
      const janeEmployee = employees.find(emp => emp.userEmail === 'jane.smith@company.com');
      
      expect(johnEmployee).toBeDefined();
      expect(johnEmployee.baseSalary).toBe(60000);
      expect(janeEmployee).toBeDefined();
      expect(janeEmployee.baseSalary).toBe(75000);

      // Step 6: Admin runs payroll for all employees
      const runPayrollResponse = await request(app)
        .post('/api/payroll/run')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          month: 12,
          year: 2024
        });

      expect(runPayrollResponse.status).toBe(200);
      expect(runPayrollResponse.body.success).toBe(true);
      expect(runPayrollResponse.body.data.processedCount).toBe(2);
      expect(runPayrollResponse.body.data.results).toHaveLength(2);

      // Verify payroll calculations for both employees
      const payrollResults = runPayrollResponse.body.data.results;
      const johnPayroll = payrollResults.find(result => result.employeeId === employeeId);
      const janePayroll = payrollResults.find(result => result.employeeId === employee2Id);

      // John: 60000 + 8000 = 68000 gross, 68000 - 3000 = 65000 net
      expect(johnPayroll.payroll.grossSalary).toBe(68000);
      expect(johnPayroll.payroll.netSalary).toBe(65000);

      // Jane: 75000 + 10000 = 85000 gross, 85000 - 5000 = 80000 net
      expect(janePayroll.payroll.grossSalary).toBe(85000);
      expect(janePayroll.payroll.netSalary).toBe(80000);

      // Step 7: Admin views payroll history for each employee
      const johnPayrollHistoryResponse = await request(app)
        .get(`/api/payroll/${employeeId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      const janePayrollHistoryResponse = await request(app)
        .get(`/api/payroll/${employee2Id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(johnPayrollHistoryResponse.status).toBe(200);
      expect(johnPayrollHistoryResponse.body.data.payrollRecords).toHaveLength(1);
      expect(janePayrollHistoryResponse.status).toBe(200);
      expect(janePayrollHistoryResponse.body.data.payrollRecords).toHaveLength(1);

      // Step 8: Admin updates employee salary and runs payroll again
      const updateEmployeeResponse = await request(app)
        .put(`/api/employee/${employeeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          baseSalary: 65000,
          allowance: 9000,
          deduction: 3500
        });

      expect(updateEmployeeResponse.status).toBe(200);
      expect(updateEmployeeResponse.body.success).toBe(true);

      // Run payroll for next month
      const runPayroll2Response = await request(app)
        .post('/api/payroll/run')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          month: 1,
          year: 2025
        });

      expect(runPayroll2Response.status).toBe(200);
      expect(runPayroll2Response.body.data.processedCount).toBe(2);

      // Verify updated salary calculation for John
      const updatedPayrollResults = runPayroll2Response.body.data.results;
      const johnUpdatedPayroll = updatedPayrollResults.find(result => result.employeeId === employeeId);
      
      // John updated: 65000 + 9000 = 74000 gross, 74000 - 3500 = 70500 net
      expect(johnUpdatedPayroll.payroll.grossSalary).toBe(74000);
      expect(johnUpdatedPayroll.payroll.netSalary).toBe(70500);

      // Step 9: Verify John now has 2 payroll records
      const johnFinalHistoryResponse = await request(app)
        .get(`/api/payroll/${employeeId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(johnFinalHistoryResponse.status).toBe(200);
      expect(johnFinalHistoryResponse.body.data.payrollRecords).toHaveLength(2);
      
      // Verify records are ordered by date (most recent first)
      const records = johnFinalHistoryResponse.body.data.payrollRecords;
      expect(records[0].year).toBe(2025);
      expect(records[0].month).toBe(1);
      expect(records[1].year).toBe(2024);
      expect(records[1].month).toBe(12);
    });
  });

  describe('Complete Employee Workflow - Full System Test', () => {
    test('should complete comprehensive employee workflow: register → login → view payroll history → verify access restrictions', async () => {
      // Setup: Create admin and employees
      const adminRegisterResponse = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'HR Admin',
          email: 'hr@company.com',
          password: 'adminPass123',
          role: 'admin'
        });

      const adminLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'hr@company.com',
          password: 'adminPass123'
        });

      adminToken = adminLoginResponse.body.token;

      // Step 1: Employee Registration
      const employeeRegisterResponse = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Alice Johnson',
          email: 'alice.johnson@company.com',
          password: 'employeePass123',
          role: 'employee'
        });

      expect(employeeRegisterResponse.status).toBe(201);
      expect(employeeRegisterResponse.body.user.role).toBe('employee');
      employeeUserId = employeeRegisterResponse.body.user.id;

      // Step 2: Employee Login
      const employeeLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'alice.johnson@company.com',
          password: 'employeePass123'
        });

      expect(employeeLoginResponse.status).toBe(200);
      expect(employeeLoginResponse.body.success).toBe(true);
      employeeToken = employeeLoginResponse.body.token;

      // Step 3: Admin creates employee record
      const addEmployeeResponse = await request(app)
        .post('/api/employee/add')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: employeeUserId,
          baseSalary: 55000,
          allowance: 7000,
          deduction: 2500
        });

      expect(addEmployeeResponse.status).toBe(201);
      employeeId = addEmployeeResponse.body.employee.id;

      // Step 4: Admin runs payroll for multiple months
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
      }

      // Step 5: Employee views their complete payroll history
      const payrollHistoryResponse = await request(app)
        .get(`/api/payroll/${employeeId}`)
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(payrollHistoryResponse.status).toBe(200);
      expect(payrollHistoryResponse.body.success).toBe(true);
      expect(payrollHistoryResponse.body.data.payrollRecords).toHaveLength(3);

      // Verify payroll records are ordered correctly (most recent first)
      const records = payrollHistoryResponse.body.data.payrollRecords;
      expect(records[0].month).toBe(12);
      expect(records[1].month).toBe(11);
      expect(records[2].month).toBe(10);

      // Verify salary calculations are consistent
      records.forEach(record => {
        expect(record.baseSalary).toBe(55000);
        expect(record.allowance).toBe(7000);
        expect(record.deduction).toBe(2500);
        expect(record.grossSalary).toBe(62000); // 55000 + 7000
        expect(record.netSalary).toBe(59500); // 62000 - 2500
      });

      // Step 6: Verify employee cannot access admin functions
      const employeeListAttempt = await request(app)
        .get('/api/employee')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(employeeListAttempt.status).toBe(403);
      expect(employeeListAttempt.body.message).toContain('admin access required');

      const payrollRunAttempt = await request(app)
        .post('/api/payroll/run')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ month: 1, year: 2025 });

      expect(payrollRunAttempt.status).toBe(403);
      expect(payrollRunAttempt.body.message).toContain('admin access required');

      const addEmployeeAttempt = await request(app)
        .post('/api/employee/add')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          userId: employeeUserId,
          baseSalary: 50000,
          allowance: 5000,
          deduction: 2000
        });

      expect(addEmployeeAttempt.status).toBe(403);
      expect(addEmployeeAttempt.body.message).toContain('admin access required');
    });
  });

  describe('Role-Based Access Control - Comprehensive Tests', () => {
    beforeEach(async () => {
      // Setup multiple users for comprehensive access control testing
      const adminRegisterResponse = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'System Admin',
          email: 'admin@company.com',
          password: 'adminPass123',
          role: 'admin'
        });

      const employee1RegisterResponse = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Employee One',
          email: 'emp1@company.com',
          password: 'empPass123',
          role: 'employee'
        });

      const employee2RegisterResponse = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Employee Two',
          email: 'emp2@company.com',
          password: 'empPass123',
          role: 'employee'
        });

      const adminLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@company.com',
          password: 'adminPass123'
        });

      const employee1LoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'emp1@company.com',
          password: 'empPass123'
        });

      const employee2LoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'emp2@company.com',
          password: 'empPass123'
        });

      adminToken = adminLoginResponse.body.token;
      employeeToken = employee1LoginResponse.body.token;
      employee2Token = employee2LoginResponse.body.token;
      employeeUserId = employee1RegisterResponse.body.user.id;
      employee2UserId = employee2RegisterResponse.body.user.id;
    });

    test('should enforce strict data isolation between employees', async () => {
      // Admin creates both employee records
      const addEmployee1Response = await request(app)
        .post('/api/employee/add')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: employeeUserId,
          baseSalary: 50000,
          allowance: 5000,
          deduction: 2000
        });

      const addEmployee2Response = await request(app)
        .post('/api/employee/add')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: employee2UserId,
          baseSalary: 70000,
          allowance: 8000,
          deduction: 4000
        });

      employeeId = addEmployee1Response.body.employee.id;
      employee2Id = addEmployee2Response.body.employee.id;

      // Admin runs payroll for both
      await request(app)
        .post('/api/payroll/run')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ month: 12, year: 2024 });

      // Employee 1 can access their own payroll
      const emp1OwnPayrollResponse = await request(app)
        .get(`/api/payroll/${employeeId}`)
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(emp1OwnPayrollResponse.status).toBe(200);
      expect(emp1OwnPayrollResponse.body.success).toBe(true);
      expect(emp1OwnPayrollResponse.body.data.payrollRecords).toHaveLength(1);

      // Employee 1 CANNOT access Employee 2's payroll
      const emp1AccessEmp2Response = await request(app)
        .get(`/api/payroll/${employee2Id}`)
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(emp1AccessEmp2Response.status).toBe(403);
      expect(emp1AccessEmp2Response.body.success).toBe(false);
      expect(emp1AccessEmp2Response.body.message).toContain('Access denied');

      // Employee 2 can access their own payroll
      const emp2OwnPayrollResponse = await request(app)
        .get(`/api/payroll/${employee2Id}`)
        .set('Authorization', `Bearer ${employee2Token}`);

      expect(emp2OwnPayrollResponse.status).toBe(200);
      expect(emp2OwnPayrollResponse.body.success).toBe(true);

      // Employee 2 CANNOT access Employee 1's payroll
      const emp2AccessEmp1Response = await request(app)
        .get(`/api/payroll/${employeeId}`)
        .set('Authorization', `Bearer ${employee2Token}`);

      expect(emp2AccessEmp1Response.status).toBe(403);
      expect(emp2AccessEmp1Response.body.success).toBe(false);

      // Admin can access both employees' payroll
      const adminAccessEmp1Response = await request(app)
        .get(`/api/payroll/${employeeId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      const adminAccessEmp2Response = await request(app)
        .get(`/api/payroll/${employee2Id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(adminAccessEmp1Response.status).toBe(200);
      expect(adminAccessEmp2Response.status).toBe(200);
    });

    test('should verify all admin privileges work correctly', async () => {
      // Admin should have access to all employee management functions
      const employeeListResponse = await request(app)
        .get('/api/employee')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(employeeListResponse.status).toBe(200);

      // Admin can add employees
      const addEmployeeResponse = await request(app)
        .post('/api/employee/add')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: employeeUserId,
          baseSalary: 60000,
          allowance: 6000,
          deduction: 3000
        });

      expect(addEmployeeResponse.status).toBe(201);
      employeeId = addEmployeeResponse.body.employee.id;

      // Admin can update employees
      const updateEmployeeResponse = await request(app)
        .put(`/api/employee/${employeeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          baseSalary: 65000,
          allowance: 7000,
          deduction: 3500
        });

      expect(updateEmployeeResponse.status).toBe(200);

      // Admin can run payroll
      const runPayrollResponse = await request(app)
        .post('/api/payroll/run')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ month: 12, year: 2024 });

      expect(runPayrollResponse.status).toBe(200);

      // Admin can view any employee's payroll
      const viewPayrollResponse = await request(app)
        .get(`/api/payroll/${employeeId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(viewPayrollResponse.status).toBe(200);
    });

    test('should deny all admin functions to employees', async () => {
      // Employees cannot access employee list
      const emp1ListResponse = await request(app)
        .get('/api/employee')
        .set('Authorization', `Bearer ${employeeToken}`);

      const emp2ListResponse = await request(app)
        .get('/api/employee')
        .set('Authorization', `Bearer ${employee2Token}`);

      expect(emp1ListResponse.status).toBe(403);
      expect(emp2ListResponse.status).toBe(403);

      // Employees cannot add employees
      const emp1AddResponse = await request(app)
        .post('/api/employee/add')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          userId: employeeUserId,
          baseSalary: 50000,
          allowance: 5000,
          deduction: 2000
        });

      expect(emp1AddResponse.status).toBe(403);

      // Employees cannot run payroll
      const emp1PayrollResponse = await request(app)
        .post('/api/payroll/run')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ month: 12, year: 2024 });

      const emp2PayrollResponse = await request(app)
        .post('/api/payroll/run')
        .set('Authorization', `Bearer ${employee2Token}`)
        .send({ month: 12, year: 2024 });

      expect(emp1PayrollResponse.status).toBe(403);
      expect(emp2PayrollResponse.status).toBe(403);
    });
  });

  describe('Error Handling and Edge Cases - Comprehensive Tests', () => {
    beforeEach(async () => {
      // Setup admin for error handling tests
      const adminRegisterResponse = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test Admin',
          email: 'admin@test.com',
          password: 'testPass123',
          role: 'admin'
        });

      const adminLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@test.com',
          password: 'testPass123'
        });

      adminToken = adminLoginResponse.body.token;
    });

    test('should handle comprehensive authentication and authorization errors', async () => {
      // Test duplicate registration
      await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test User',
          email: 'duplicate@test.com',
          password: 'password123',
          role: 'employee'
        });

      const duplicateResponse = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Another User',
          email: 'duplicate@test.com',
          password: 'password456',
          role: 'admin'
        });

      expect(duplicateResponse.status).toBe(400);
      expect(duplicateResponse.body.message).toContain('already exists');

      // Test invalid login credentials
      const wrongPasswordResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'duplicate@test.com',
          password: 'wrongpassword'
        });

      expect(wrongPasswordResponse.status).toBe(401);

      const nonExistentUserResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@test.com',
          password: 'password123'
        });

      expect(nonExistentUserResponse.status).toBe(401);

      // Test unauthorized access (no token)
      const noTokenResponse = await request(app)
        .get('/api/employee');

      expect(noTokenResponse.status).toBe(401);

      // Test invalid token
      const invalidTokenResponse = await request(app)
        .get('/api/employee')
        .set('Authorization', 'Bearer invalid-token-here');

      expect(invalidTokenResponse.status).toBe(401);
    });

    test('should handle comprehensive validation errors', async () => {
      const employeeRegisterResponse = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test Employee',
          email: 'employee@test.com',
          password: 'password123',
          role: 'employee'
        });

      const employeeUserId = employeeRegisterResponse.body.user.id;

      // Test negative salary validation
      const negativeSalaryResponse = await request(app)
        .post('/api/employee/add')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: employeeUserId,
          baseSalary: -5000,
          allowance: 1000,
          deduction: 500
        });

      expect(negativeSalaryResponse.status).toBe(400);

      // Test missing required fields
      const missingFieldsResponse = await request(app)
        .post('/api/employee/add')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: employeeUserId,
          allowance: 1000,
          deduction: 500
          // Missing baseSalary
        });

      expect(missingFieldsResponse.status).toBe(400);

      // Test invalid user ID
      const invalidUserIdResponse = await request(app)
        .post('/api/employee/add')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: 'invalid-user-id',
          baseSalary: 50000,
          allowance: 5000,
          deduction: 2000
        });

      expect(invalidUserIdResponse.status).toBe(400);
    });

    test('should handle edge cases in payroll processing', async () => {
      // Test payroll with no employees
      const noEmployeesResponse = await request(app)
        .post('/api/payroll/run')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ month: 12, year: 2024 });

      expect(noEmployeesResponse.status).toBe(200);
      expect(noEmployeesResponse.body.data.processedCount).toBe(0);
      expect(noEmployeesResponse.body.data.results).toHaveLength(0);

      // Test viewing payroll for non-existent employee
      const nonExistentEmployeeResponse = await request(app)
        .get('/api/payroll/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(nonExistentEmployeeResponse.status).toBe(404);

      // Test invalid payroll parameters
      const invalidMonthResponse = await request(app)
        .post('/api/payroll/run')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ month: 13, year: 2024 });

      expect(invalidMonthResponse.status).toBe(500);
      expect(invalidMonthResponse.body.message).toContain('Month must be an integer between 1 and 12');

      const invalidYearResponse = await request(app)
        .post('/api/payroll/run')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ month: 12, year: 1999 });

      expect(invalidYearResponse.status).toBe(500);
      expect(invalidYearResponse.body.message).toContain('Year must be');
    });

    test('should handle database constraint violations', async () => {
      const employeeRegisterResponse = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test Employee',
          email: 'employee@test.com',
          password: 'password123',
          role: 'employee'
        });

      const employeeUserId = employeeRegisterResponse.body.user.id;

      // Add employee first time
      const firstAddResponse = await request(app)
        .post('/api/employee/add')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: employeeUserId,
          baseSalary: 50000,
          allowance: 5000,
          deduction: 2000
        });

      expect(firstAddResponse.status).toBe(201);

      // Try to add same user as employee again (should fail due to unique constraint)
      const duplicateEmployeeResponse = await request(app)
        .post('/api/employee/add')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: employeeUserId,
          baseSalary: 60000,
          allowance: 6000,
          deduction: 3000
        });

      expect(duplicateEmployeeResponse.status).toBe(409);
      expect(duplicateEmployeeResponse.body.message).toContain('already exists');
    });
  });

  describe('Data Consistency and Integrity Tests', () => {
    test('should maintain data consistency across multiple operations', async () => {
      // Setup admin and employees
      const adminRegisterResponse = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Data Admin',
          email: 'data.admin@test.com',
          password: 'dataPass123',
          role: 'admin'
        });

      const adminLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'data.admin@test.com',
          password: 'dataPass123'
        });

      adminToken = adminLoginResponse.body.token;

      // Create multiple employees
      const employees = [];
      for (let i = 1; i <= 5; i++) {
        const empRegisterResponse = await request(app)
          .post('/api/auth/register')
          .send({
            name: `Employee ${i}`,
            email: `emp${i}@test.com`,
            password: 'empPass123',
            role: 'employee'
          });

        const addEmpResponse = await request(app)
          .post('/api/employee/add')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            userId: empRegisterResponse.body.user.id,
            baseSalary: 50000 + (i * 5000),
            allowance: 5000 + (i * 1000),
            deduction: 2000 + (i * 500)
          });

        employees.push({
          userId: empRegisterResponse.body.user.id,
          employeeId: addEmpResponse.body.employee.id,
          baseSalary: 50000 + (i * 5000),
          allowance: 5000 + (i * 1000),
          deduction: 2000 + (i * 500)
        });
      }

      // Run payroll for multiple months
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
        expect(payrollResponse.body.data.processedCount).toBe(5);
        expect(payrollResponse.body.data.results).toHaveLength(5);

        // Verify calculations for each employee
        payrollResponse.body.data.results.forEach((result, index) => {
          const expectedGross = employees[index].baseSalary + employees[index].allowance;
          const expectedNet = expectedGross - employees[index].deduction;
          
          expect(result.payroll.grossSalary).toBe(expectedGross);
          expect(result.payroll.netSalary).toBe(expectedNet);
          expect(result.payroll.month).toBe(period.month);
          expect(result.payroll.year).toBe(period.year);
        });
      }

      // Verify each employee has exactly 3 payroll records
      for (const employee of employees) {
        const historyResponse = await request(app)
          .get(`/api/payroll/${employee.employeeId}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(historyResponse.status).toBe(200);
        expect(historyResponse.body.data.payrollRecords).toHaveLength(3);

        // Verify records are ordered correctly (most recent first)
        const records = historyResponse.body.data.payrollRecords;
        expect(records[0].month).toBe(12);
        expect(records[1].month).toBe(11);
        expect(records[2].month).toBe(10);
      }

      // Update one employee and verify only their records change
      const updateResponse = await request(app)
        .put(`/api/employee/${employees[0].employeeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          baseSalary: 80000,
          allowance: 10000,
          deduction: 5000
        });

      expect(updateResponse.status).toBe(200);

      // Run payroll for next month
      const nextPayrollResponse = await request(app)
        .post('/api/payroll/run')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ month: 1, year: 2025 });

      expect(nextPayrollResponse.status).toBe(200);

      // Verify updated employee has new calculation
      const updatedResult = nextPayrollResponse.body.data.results.find(
        result => result.employeeId === employees[0].employeeId
      );

      expect(updatedResult.payroll.grossSalary).toBe(90000); // 80000 + 10000
      expect(updatedResult.payroll.netSalary).toBe(85000); // 90000 - 5000

      // Verify other employees still have old calculations
      const otherResults = nextPayrollResponse.body.data.results.filter(
        result => result.employeeId !== employees[0].employeeId
      );

      otherResults.forEach((result, index) => {
        const empIndex = index + 1; // Since we skip the first employee
        const expectedGross = employees[empIndex].baseSalary + employees[empIndex].allowance;
        const expectedNet = expectedGross - employees[empIndex].deduction;
        
        expect(result.payroll.grossSalary).toBe(expectedGross);
        expect(result.payroll.netSalary).toBe(expectedNet);
      });
    });
  });
});