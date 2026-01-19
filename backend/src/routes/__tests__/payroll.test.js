import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
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

describe('Payroll Routes', () => {
  let adminUser, employeeUser, adminToken, employeeToken, testEmployee;

  beforeAll(async () => {
    // Connect to test database
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/payrolldb_test';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }
  });

  beforeEach(async () => {
    // Clear test data
    await User.deleteMany({});
    await Employee.deleteMany({});
    await Payroll.deleteMany({});

    // Create admin user
    adminUser = await User.create({
      name: 'Admin User',
      email: 'admin@test.com',
      password: 'password123',
      role: 'admin'
    });

    // Create employee user
    employeeUser = await User.create({
      name: 'Employee User',
      email: 'employee@test.com',
      password: 'password123',
      role: 'employee'
    });

    // Create test employee
    testEmployee = await Employee.create({
      userId: employeeUser._id,
      baseSalary: 50000,
      allowance: 5000,
      deduction: 2000
    });

    // Generate tokens
    adminToken = jwt.sign(
      {
        userId: adminUser._id,
        email: adminUser.email,
        role: adminUser.role
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    employeeToken = jwt.sign(
      {
        userId: employeeUser._id,
        email: employeeUser.email,
        role: employeeUser.role
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('POST /api/payroll/run', () => {
    it('should process payroll for all employees as admin', async () => {
      const payrollData = {
        month: 12,
        year: 2024
      };

      const response = await request(app)
        .post('/api/payroll/run')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(payrollData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.processedCount).toBe(1);
      expect(response.body.data.failedCount).toBe(0);
      expect(response.body.data.totalEmployees).toBe(1);
      expect(response.body.data.results).toHaveLength(1);
      expect(response.body.data.results[0].success).toBe(true);
    });

    it('should reject payroll processing without admin token', async () => {
      const payrollData = {
        month: 12,
        year: 2024
      };

      const response = await request(app)
        .post('/api/payroll/run')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send(payrollData)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should reject payroll processing with missing data', async () => {
      const response = await request(app)
        .post('/api/payroll/run')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Month and year are required');
    });

    it('should handle duplicate payroll processing gracefully', async () => {
      const payrollData = {
        month: 12,
        year: 2024
      };

      // First run should succeed
      await request(app)
        .post('/api/payroll/run')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(payrollData)
        .expect(200);

      // Second run should report failure for duplicate
      const response = await request(app)
        .post('/api/payroll/run')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(payrollData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.processedCount).toBe(0);
      expect(response.body.data.failedCount).toBe(1);
      expect(response.body.data.results[0].success).toBe(false);
      expect(response.body.data.results[0].error).toContain('Payroll already exists');
    });
  });

  describe('GET /api/payroll/:employeeId', () => {
    beforeEach(async () => {
      // Create some payroll records
      await Payroll.create({
        employeeId: testEmployee._id,
        month: 11,
        year: 2024,
        baseSalary: 50000,
        allowance: 5000,
        deduction: 2000,
        grossSalary: 55000,
        netSalary: 53000
      });

      await Payroll.create({
        employeeId: testEmployee._id,
        month: 12,
        year: 2024,
        baseSalary: 50000,
        allowance: 5000,
        deduction: 2000,
        grossSalary: 55000,
        netSalary: 53000
      });
    });

    it('should allow employee to view their own payroll history', async () => {
      const response = await request(app)
        .get(`/api/payroll/${testEmployee._id}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.payrollRecords).toHaveLength(2);
      expect(response.body.data.employee.name).toBe('Employee User');
      expect(response.body.data.count).toBe(2);
      
      // Check ordering (most recent first)
      expect(response.body.data.payrollRecords[0].month).toBe(12);
      expect(response.body.data.payrollRecords[1].month).toBe(11);
    });

    it('should allow admin to view any employee payroll history', async () => {
      const response = await request(app)
        .get(`/api/payroll/${testEmployee._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.payrollRecords).toHaveLength(2);
    });

    it('should reject employee viewing other employee payroll', async () => {
      // Create another employee
      const otherUser = await User.create({
        name: 'Other Employee',
        email: 'other@test.com',
        password: 'password123',
        role: 'employee'
      });

      const otherEmployee = await Employee.create({
        userId: otherUser._id,
        baseSalary: 40000,
        allowance: 3000,
        deduction: 1500
      });

      const response = await request(app)
        .get(`/api/payroll/${otherEmployee._id}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Access denied. You can only view your own payroll data');
    });

    it('should reject invalid employee ID format', async () => {
      const response = await request(app)
        .get('/api/payroll/invalid-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid employee ID format');
    });

    it('should return 404 for non-existent employee', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      
      const response = await request(app)
        .get(`/api/payroll/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Employee not found');
    });

    it('should reject requests without authentication', async () => {
      const response = await request(app)
        .get(`/api/payroll/${testEmployee._id}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/payroll/run/:employeeId', () => {
    it('should process payroll for individual employee (admin only)', async () => {
      const response = await request(app)
        .post(`/api/payroll/run/${testEmployee._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ month: 11, year: 2024 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Payroll processed successfully');
      expect(response.body.data.employee.name).toBe('Employee User');
      expect(response.body.data.payroll.netSalary).toBe(53000);
      expect(response.body.data.payroll.month).toBe(11);
      expect(response.body.data.payroll.year).toBe(2024);
    });

    it('should prevent duplicate payroll for same employee and period', async () => {
      // First payroll should succeed
      await request(app)
        .post(`/api/payroll/run/${testEmployee._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ month: 11, year: 2024 })
        .expect(200);

      // Second payroll for same period should fail
      const response = await request(app)
        .post(`/api/payroll/run/${testEmployee._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ month: 11, year: 2024 })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Payroll already exists');
    });

    it('should require admin role for individual payroll processing', async () => {
      const response = await request(app)
        .post(`/api/payroll/run/${testEmployee._id}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ month: 11, year: 2024 })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Insufficient permissions - admin access required');
    });

    it('should validate required fields for individual payroll', async () => {
      const response = await request(app)
        .post(`/api/payroll/run/${testEmployee._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({}) // Missing month and year
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Month and year are required');
    });

    it('should validate employee ID format', async () => {
      const response = await request(app)
        .post('/api/payroll/run/invalid-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ month: 11, year: 2024 })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid employee ID format');
    });
  });
});