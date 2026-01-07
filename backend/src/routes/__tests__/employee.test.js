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

describe('Employee Routes', () => {
  let adminUser, employeeUser, adminToken;

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

    // Generate admin token
    adminToken = jwt.sign(
      {
        userId: adminUser._id,
        email: adminUser.email,
        role: adminUser.role
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('POST /api/employee/add', () => {
    it('should create a new employee with valid data', async () => {
      const employeeData = {
        userId: employeeUser._id.toString(),
        baseSalary: 50000,
        allowance: 5000,
        deduction: 2000
      };

      const response = await request(app)
        .post('/api/employee/add')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(employeeData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.employee).toBeDefined();
      expect(response.body.employee.baseSalary).toBe(50000);
      expect(response.body.employee.allowance).toBe(5000);
      expect(response.body.employee.deduction).toBe(2000);
      expect(response.body.employee.grossSalary).toBe(55000);
      expect(response.body.employee.netSalary).toBe(53000);
    });

    it('should reject invalid salary data', async () => {
      const employeeData = {
        userId: employeeUser._id.toString(),
        baseSalary: -1000, // Invalid negative salary
        allowance: 5000,
        deduction: 2000
      };

      const response = await request(app)
        .post('/api/employee/add')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(employeeData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toContain('Base salary cannot be negative');
    });

    it('should reject missing required fields', async () => {
      const employeeData = {
        userId: employeeUser._id.toString()
        // Missing baseSalary
      };

      const response = await request(app)
        .post('/api/employee/add')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(employeeData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toContain('Base salary is required');
    });

    it('should reject requests without admin token', async () => {
      const employeeData = {
        userId: employeeUser._id.toString(),
        baseSalary: 50000
      };

      const response = await request(app)
        .post('/api/employee/add')
        .send(employeeData)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/employee', () => {
    beforeEach(async () => {
      // Create test employee
      await Employee.create({
        userId: employeeUser._id,
        baseSalary: 50000,
        allowance: 5000,
        deduction: 2000
      });
    });

    it('should return all employees for admin', async () => {
      const response = await request(app)
        .get('/api/employee')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.employees).toHaveLength(1);
      expect(response.body.employees[0].baseSalary).toBe(50000);
      expect(response.body.count).toBe(1);
    });

    it('should reject requests without admin token', async () => {
      const response = await request(app)
        .get('/api/employee')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/employee/:id', () => {
    let testEmployee;

    beforeEach(async () => {
      // Create test employee
      testEmployee = await Employee.create({
        userId: employeeUser._id,
        baseSalary: 50000,
        allowance: 5000,
        deduction: 2000
      });
    });

    it('should update employee with valid data', async () => {
      const updateData = {
        baseSalary: 60000,
        allowance: 6000
      };

      const response = await request(app)
        .put(`/api/employee/${testEmployee._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.employee.baseSalary).toBe(60000);
      expect(response.body.employee.allowance).toBe(6000);
      expect(response.body.employee.deduction).toBe(2000); // Should remain unchanged
    });

    it('should reject invalid update data', async () => {
      const updateData = {
        baseSalary: -5000 // Invalid negative salary
      };

      const response = await request(app)
        .put(`/api/employee/${testEmployee._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toContain('Base salary cannot be negative');
    });

    it('should reject empty update data', async () => {
      const response = await request(app)
        .put(`/api/employee/${testEmployee._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toContain('At least one field (baseSalary, allowance, deduction) must be provided');
    });

    it('should reject requests without admin token', async () => {
      const updateData = {
        baseSalary: 60000
      };

      const response = await request(app)
        .put(`/api/employee/${testEmployee._id}`)
        .send(updateData)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});