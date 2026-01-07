import request from 'supertest';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

import authRoutes from '../routes/auth.js';
import employeeRoutes from '../routes/employee.js';
import payrollRoutes from '../routes/payroll.js';

import User from '../models/User.js';
import Employee from '../models/Employee.js';
import Payroll from '../models/Payroll.js';

dotenv.config();

const createTestApp = () => {
  const app = express();
  app.use(cors());
  app.use(express.json());
  
  app.use('/api/auth', authRoutes);
  app.use('/api/employee', employeeRoutes);
  app.use('/api/payroll', payrollRoutes);
  
  return app;
};

describe('Simple Integration Tests', () => {
  let app;
  let adminToken;

  beforeAll(async () => {
    const testDbUri = process.env.MONGO_URI?.replace('payrolldb', 'payrolldb_test') || 'mongodb://127.0.0.1:27017/payrolldb_test';
    await mongoose.connect(testDbUri);
    app = createTestApp();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Employee.deleteMany({});
    await Payroll.deleteMany({});
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Employee.deleteMany({});
    await Payroll.deleteMany({});
    await mongoose.connection.close();
  });

  test('should complete basic admin workflow', async () => {
    // Admin Registration
    const adminRegisterResponse = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Admin User',
        email: 'admin@test.com',
        password: 'password123',
        role: 'admin'
      });

    expect(adminRegisterResponse.status).toBe(201);
    expect(adminRegisterResponse.body.success).toBe(true);

    // Admin Login
    const adminLoginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@test.com',
        password: 'password123'
      });

    expect(adminLoginResponse.status).toBe(200);
    expect(adminLoginResponse.body.success).toBe(true);
    adminToken = adminLoginResponse.body.token;

    // Register Employee User
    const employeeRegisterResponse = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Employee User',
        email: 'employee@test.com',
        password: 'password123',
        role: 'employee'
      });

    expect(employeeRegisterResponse.status).toBe(201);
    const employeeUserId = employeeRegisterResponse.body.user.id;

    // Admin adds employee
    const addEmployeeResponse = await request(app)
      .post('/api/employee/add')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        userId: employeeUserId,
        baseSalary: 50000,
        allowance: 5000,
        deduction: 2000
      });

    expect(addEmployeeResponse.status).toBe(201);
    expect(addEmployeeResponse.body.success).toBe(true);

    // Admin runs payroll
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
  });

  test('should handle authentication errors', async () => {
    // Try to access protected route without token
    const noTokenResponse = await request(app)
      .get('/api/employee');

    expect(noTokenResponse.status).toBe(401);
    expect(noTokenResponse.body.success).toBe(false);
  });
});