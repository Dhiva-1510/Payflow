import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import dashboardRoutes from '../dashboard.js';
import User from '../../models/User.js';
import Employee from '../../models/Employee.js';
import Payroll from '../../models/Payroll.js';

const app = express();
app.use(express.json());
app.use('/api/dashboard', dashboardRoutes);

// Test database connection
beforeAll(async () => {
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/payrolldb_test';
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
  await User.deleteMany({});
  await Employee.deleteMany({});
  await Payroll.deleteMany({});
});

// Helper function to create a test admin user and get auth token
const createAdminUserAndToken = async () => {
  const adminUser = new User({
    name: 'Admin User',
    email: 'admin@example.com',
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

// Helper function to create a test employee user and get auth token
const createEmployeeUserAndToken = async () => {
  const employeeUser = new User({
    name: 'Employee User',
    email: 'employee@example.com',
    password: 'password123',
    role: 'employee'
  });
  await employeeUser.save();

  const token = jwt.sign(
    { userId: employeeUser._id },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '1h' }
  );

  return { user: employeeUser, token };
};

describe('Dashboard API Endpoints', () => {
  describe('GET /api/dashboard/metrics', () => {
    test('should return dashboard metrics successfully for admin', async () => {
      const { token } = await createAdminUserAndToken();
      
      // Create test data
      const employee = await Employee.create({
        userId: new mongoose.Types.ObjectId(),
        baseSalary: 5000,
        allowance: 1000,
        deduction: 500
      });

      await Payroll.create({
        employeeId: employee._id,
        month: 12,
        year: 2024,
        baseSalary: 5000,
        allowance: 1000,
        deduction: 500,
        grossSalary: 6000,
        netSalary: 5500
      });

      const response = await request(app)
        .get('/api/dashboard/metrics')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.payrollTotal).toBeDefined();
      expect(response.body.data.employeesPaid).toBeDefined();
      expect(response.body.data.pendingApprovals).toBeDefined();
      expect(response.body.data.lastUpdated).toBeDefined();
    });

    test('should return dashboard metrics with query parameters', async () => {
      const { token } = await createAdminUserAndToken();
      
      // Create test data for November 2024
      const employee = await Employee.create({
        userId: new mongoose.Types.ObjectId(),
        baseSalary: 4500,
        allowance: 800,
        deduction: 300
      });

      await Payroll.create({
        employeeId: employee._id,
        month: 11,
        year: 2024,
        baseSalary: 4500,
        allowance: 800,
        deduction: 300,
        grossSalary: 5300,
        netSalary: 5000
      });

      const response = await request(app)
        .get('/api/dashboard/metrics?month=11&year=2024')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.payrollTotal.month).toBe(11);
      expect(response.body.data.payrollTotal.year).toBe(2024);
      expect(response.body.data.payrollTotal.amount).toBe(5000);
    });

    test('should reject request without authentication', async () => {
      const response = await request(app)
        .get('/api/dashboard/metrics')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Access token is required');
    });

    test('should reject request from non-admin user', async () => {
      const { token } = await createEmployeeUserAndToken();

      const response = await request(app)
        .get('/api/dashboard/metrics')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Insufficient permissions');
    });

    test('should handle invalid month parameter in query', async () => {
      const { token } = await createAdminUserAndToken();

      const response = await request(app)
        .get('/api/dashboard/metrics?month=13&year=2024')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Month must be');
    });
  });

  describe('GET /api/dashboard/payroll-total/:month/:year', () => {
    test('should return payroll total successfully', async () => {
      const { token } = await createAdminUserAndToken();
      
      // Create test data
      const employee1 = await Employee.create({
        userId: new mongoose.Types.ObjectId(),
        baseSalary: 3000,
        allowance: 500,
        deduction: 200
      });

      const employee2 = await Employee.create({
        userId: new mongoose.Types.ObjectId(),
        baseSalary: 4000,
        allowance: 600,
        deduction: 300
      });

      await Payroll.create({
        employeeId: employee1._id,
        month: 12,
        year: 2024,
        baseSalary: 3000,
        allowance: 500,
        deduction: 200,
        grossSalary: 3500,
        netSalary: 3300
      });

      await Payroll.create({
        employeeId: employee2._id,
        month: 12,
        year: 2024,
        baseSalary: 4000,
        allowance: 600,
        deduction: 300,
        grossSalary: 4600,
        netSalary: 4300
      });

      const response = await request(app)
        .get('/api/dashboard/payroll-total/12/2024')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.amount).toBe(7600); // 3300 + 4300
      expect(response.body.data.currency).toBe('INR');
      expect(response.body.data.month).toBe(12);
      expect(response.body.data.year).toBe(2024);
      expect(response.body.data.employeeCount).toBe(2);
    });

    test('should return zero for month with no payroll records', async () => {
      const { token } = await createAdminUserAndToken();

      const response = await request(app)
        .get('/api/dashboard/payroll-total/6/2024')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.amount).toBe(0);
      expect(response.body.data.employeeCount).toBe(0);
    });

    test('should handle invalid month parameter', async () => {
      const { token } = await createAdminUserAndToken();

      const response = await request(app)
        .get('/api/dashboard/payroll-total/13/2024')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Month must be');
    });

    test('should handle invalid year parameter', async () => {
      const { token } = await createAdminUserAndToken();

      const response = await request(app)
        .get('/api/dashboard/payroll-total/12/2030')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Year must be');
    });
  });

  describe('GET /api/dashboard/employees-paid/:month/:year', () => {
    test('should return employees paid count successfully', async () => {
      const { token } = await createAdminUserAndToken();
      
      // Create 3 employees
      const employee1 = await Employee.create({
        userId: new mongoose.Types.ObjectId(),
        baseSalary: 3000
      });

      const employee2 = await Employee.create({
        userId: new mongoose.Types.ObjectId(),
        baseSalary: 4000
      });

      await Employee.create({
        userId: new mongoose.Types.ObjectId(),
        baseSalary: 5000
      });

      // Create payroll records for only 2 employees
      await Payroll.create({
        employeeId: employee1._id,
        month: 12,
        year: 2024,
        baseSalary: 3000,
        allowance: 0,
        deduction: 0,
        grossSalary: 3000,
        netSalary: 3000
      });

      await Payroll.create({
        employeeId: employee2._id,
        month: 12,
        year: 2024,
        baseSalary: 4000,
        allowance: 0,
        deduction: 0,
        grossSalary: 4000,
        netSalary: 4000
      });

      const response = await request(app)
        .get('/api/dashboard/employees-paid/12/2024')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.count).toBe(2); // 2 employees paid
      expect(response.body.data.totalEmployees).toBe(3); // 3 total employees
      expect(response.body.data.month).toBe(12);
      expect(response.body.data.year).toBe(2024);
    });

    test('should return zero for month with no payroll records', async () => {
      const { token } = await createAdminUserAndToken();
      
      // Create employee but no payroll records
      await Employee.create({
        userId: new mongoose.Types.ObjectId(),
        baseSalary: 3000
      });

      const response = await request(app)
        .get('/api/dashboard/employees-paid/6/2024')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.count).toBe(0);
      expect(response.body.data.totalEmployees).toBe(1);
    });

    test('should handle invalid parameters', async () => {
      const { token } = await createAdminUserAndToken();

      const response = await request(app)
        .get('/api/dashboard/employees-paid/0/2024')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Month must be');
    });
  });

  describe('GET /api/dashboard/pending-approvals', () => {
    test('should return pending approvals count successfully', async () => {
      const { token, user } = await createAdminUserAndToken();

      // Create an employee without payroll to have pending count
      const employee = await Employee.create({
        userId: user._id,
        baseSalary: 50000,
        allowance: 5000,
        deduction: 2000
      });

      const response = await request(app)
        .get('/api/dashboard/pending-approvals')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.count).toBe(1); // One employee without payroll
      expect(response.body.data.types).toEqual(['payroll']);
    });

    test('should require authentication', async () => {
      const response = await request(app)
        .get('/api/dashboard/pending-approvals')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Access token is required');
    });
  });

  describe('GET /api/dashboard/stats (Legacy endpoint)', () => {
    test('should return legacy format successfully', async () => {
      const { token } = await createAdminUserAndToken();
      
      // Create test data
      const employee = await Employee.create({
        userId: new mongoose.Types.ObjectId(),
        baseSalary: 5000
      });

      await Payroll.create({
        employeeId: employee._id,
        month: 12,
        year: 2024,
        baseSalary: 5000,
        allowance: 0,
        deduction: 0,
        grossSalary: 5000,
        netSalary: 5000
      });

      const response = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.totalEmployees).toBe(1);
      expect(response.body.data.monthlyPayroll).toBeDefined();
      expect(response.body.data.pendingApprovals).toBe(1); // Now returns actual pending count
      expect(response.body.data.lastPayrollRun).toEqual({
        month: expect.any(Number),
        year: expect.any(Number)
      });
      expect(Array.isArray(response.body.data.recentActivity)).toBe(true);
    });
  });

  describe('GET /api/dashboard/reports', () => {
    test('should return monthly report successfully', async () => {
      const { token } = await createAdminUserAndToken();
      
      // Create test data for multiple months
      const employee1 = await Employee.create({
        userId: new mongoose.Types.ObjectId(),
        baseSalary: 5000
      });

      const employee2 = await Employee.create({
        userId: new mongoose.Types.ObjectId(),
        baseSalary: 4000
      });

      // Create payroll records for different months
      await Payroll.create({
        employeeId: employee1._id,
        month: 1,
        year: 2024,
        baseSalary: 5000,
        allowance: 0,
        deduction: 0,
        grossSalary: 5000,
        netSalary: 5000
      });

      await Payroll.create({
        employeeId: employee2._id,
        month: 1,
        year: 2024,
        baseSalary: 4000,
        allowance: 0,
        deduction: 0,
        grossSalary: 4000,
        netSalary: 4000
      });

      await Payroll.create({
        employeeId: employee1._id,
        month: 2,
        year: 2024,
        baseSalary: 5000,
        allowance: 0,
        deduction: 0,
        grossSalary: 5000,
        netSalary: 5000
      });

      const response = await request(app)
        .get('/api/dashboard/reports?type=monthly&year=2024')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.year).toBe(2024);
      expect(Array.isArray(response.body.data.data)).toBe(true);
      expect(response.body.data.data).toHaveLength(12); // All 12 months
      
      // Check January data (should have 2 employees)
      const januaryData = response.body.data.data[0];
      expect(januaryData.month).toBe(1);
      expect(januaryData.monthName).toBe('January');
      expect(januaryData.totalAmount).toBe(9000); // 5000 + 4000
      expect(januaryData.employeeCount).toBe(2);
      expect(januaryData.averageSalary).toBe(4500); // (5000 + 4000) / 2
      
      // Check February data (should have 1 employee)
      const februaryData = response.body.data.data[1];
      expect(februaryData.month).toBe(2);
      expect(februaryData.monthName).toBe('February');
      expect(februaryData.totalAmount).toBe(5000);
      expect(februaryData.employeeCount).toBe(1);
      expect(februaryData.averageSalary).toBe(5000);
      
      // Check March data (should be empty)
      const marchData = response.body.data.data[2];
      expect(marchData.month).toBe(3);
      expect(marchData.monthName).toBe('March');
      expect(marchData.totalAmount).toBe(0);
      expect(marchData.employeeCount).toBe(0);
      expect(marchData.averageSalary).toBe(0);
      
      // Check summary
      expect(response.body.data.summary.totalAmount).toBe(14000); // 9000 + 5000
      expect(response.body.data.summary.totalEmployeePayments).toBe(3); // 2 + 1
      expect(response.body.data.summary.averageMonthlyPayroll).toBe(14000 / 12);
    });

    test('should return monthly report for current year when no year specified', async () => {
      const { token } = await createAdminUserAndToken();
      
      const response = await request(app)
        .get('/api/dashboard/reports?type=monthly')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.year).toBe(new Date().getFullYear());
      expect(Array.isArray(response.body.data.data)).toBe(true);
      expect(response.body.data.data).toHaveLength(12);
    });

    test('should return error for unsupported report type', async () => {
      const { token } = await createAdminUserAndToken();
      
      const response = await request(app)
        .get('/api/dashboard/reports?type=weekly')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Unsupported report type');
    });

    test('should handle invalid year parameter', async () => {
      const { token } = await createAdminUserAndToken();
      
      const response = await request(app)
        .get('/api/dashboard/reports?type=monthly&year=2030')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Year must be');
    });

    test('should require authentication', async () => {
      const response = await request(app)
        .get('/api/dashboard/reports')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Access token is required');
    });

    test('should require admin role', async () => {
      const { token } = await createEmployeeUserAndToken();
      
      const response = await request(app)
        .get('/api/dashboard/reports')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Insufficient permissions');
    });
  });

  describe('Error handling edge cases', () => {
    test('should handle invalid JWT token', async () => {
      const response = await request(app)
        .get('/api/dashboard/metrics')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid token');
    });

    test('should handle missing Bearer prefix', async () => {
      const { token } = await createAdminUserAndToken();

      const response = await request(app)
        .get('/api/dashboard/metrics')
        .set('Authorization', token) // Missing "Bearer " prefix
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Access token is required');
    });

    test('should handle non-integer month/year parameters', async () => {
      const { token } = await createAdminUserAndToken();

      const response = await request(app)
        .get('/api/dashboard/payroll-total/abc/2024')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('DASHBOARD_ERROR');
    });

    test('should handle expired JWT token', async () => {
      const { user } = await createAdminUserAndToken();
      
      // Create an expired token
      const expiredToken = jwt.sign(
        { userId: user._id },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '-1h' } // Expired 1 hour ago
      );

      const response = await request(app)
        .get('/api/dashboard/metrics')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Token expired');
    });

    test('should handle deleted user with valid token', async () => {
      const { user, token } = await createAdminUserAndToken();
      
      // Delete the user
      await User.findByIdAndDelete(user._id);

      const response = await request(app)
        .get('/api/dashboard/metrics')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid token - user not found');
    });
  });
});