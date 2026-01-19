import DashboardService from '../dashboardService.js';
import Employee from '../../models/Employee.js';
import Payroll from '../../models/Payroll.js';
import User from '../../models/User.js';
import mongoose from 'mongoose';

describe('DashboardService', () => {
  beforeAll(async () => {
    // Connect to test database
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/payrolldb_test';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }
  }, 30000);

  beforeEach(async () => {
    // Clear test data
    await User.deleteMany({});
    await Employee.deleteMany({});
    await Payroll.deleteMany({});
  }, 30000);

  afterAll(async () => {
    // Clean up after tests
    await User.deleteMany({});
    await Employee.deleteMany({});
    await Payroll.deleteMany({});
    await mongoose.connection.close();
  }, 30000);

  describe('validateDateParameters', () => {
    test('should accept valid month and year', () => {
      expect(() => DashboardService.validateDateParameters(6, 2024)).not.toThrow();
    });

    test('should reject invalid month', () => {
      expect(() => DashboardService.validateDateParameters(0, 2024)).toThrow('Month must be an integer between 1 and 12');
      expect(() => DashboardService.validateDateParameters(13, 2024)).toThrow('Month must be an integer between 1 and 12');
    });

    test('should reject invalid year', () => {
      expect(() => DashboardService.validateDateParameters(6, 2019)).toThrow('Year must be an integer between 2020');
      expect(() => DashboardService.validateDateParameters(6, 2030)).toThrow('Year must be an integer between 2020');
    });
  });

  describe('getPayrollTotal', () => {
    test('should return zero for month with no payroll records', async () => {
      const result = await DashboardService.getPayrollTotal(6, 2024);
      
      expect(result).toEqual({
        amount: 0,
        currency: 'INR',
        month: 6,
        year: 2024,
        employeeCount: 0
      });
    });

    test('should calculate correct payroll total with multiple records', async () => {
      // Create test employees
      const employee1 = await Employee.create({
        userId: new mongoose.Types.ObjectId(),
        baseSalary: 5000,
        allowance: 1000,
        deduction: 500
      });

      const employee2 = await Employee.create({
        userId: new mongoose.Types.ObjectId(),
        baseSalary: 4000,
        allowance: 800,
        deduction: 300
      });

      // Create payroll records for June 2024
      await Payroll.create({
        employeeId: employee1._id,
        month: 6,
        year: 2024,
        baseSalary: 5000,
        allowance: 1000,
        deduction: 500,
        grossSalary: 6000,
        netSalary: 5500
      });

      await Payroll.create({
        employeeId: employee2._id,
        month: 6,
        year: 2024,
        baseSalary: 4000,
        allowance: 800,
        deduction: 300,
        grossSalary: 4800,
        netSalary: 4500
      });

      const result = await DashboardService.getPayrollTotal(6, 2024);
      
      expect(result).toEqual({
        amount: 10000, // 5500 + 4500
        currency: 'INR',
        month: 6,
        year: 2024,
        employeeCount: 2
      });
    });
  });

  describe('getEmployeesPaidCount', () => {
    test('should return zero for month with no payroll records', async () => {
      // Create employees but no payroll records
      await Employee.create({
        userId: new mongoose.Types.ObjectId(),
        baseSalary: 5000
      });

      const result = await DashboardService.getEmployeesPaidCount(6, 2024);
      
      expect(result.count).toBe(0);
      expect(result.totalEmployees).toBe(1);
      expect(result.month).toBe(6);
      expect(result.year).toBe(2024);
    });

    test('should count unique employees paid in a month', async () => {
      // Create test employees
      const employee1 = await Employee.create({
        userId: new mongoose.Types.ObjectId(),
        baseSalary: 5000
      });

      const employee2 = await Employee.create({
        userId: new mongoose.Types.ObjectId(),
        baseSalary: 4000
      });

      const employee3 = await Employee.create({
        userId: new mongoose.Types.ObjectId(),
        baseSalary: 3000
      });

      // Create payroll records for only 2 employees in June 2024
      await Payroll.create({
        employeeId: employee1._id,
        month: 6,
        year: 2024,
        baseSalary: 5000,
        allowance: 0,
        deduction: 0,
        grossSalary: 5000,
        netSalary: 5000
      });

      await Payroll.create({
        employeeId: employee2._id,
        month: 6,
        year: 2024,
        baseSalary: 4000,
        allowance: 0,
        deduction: 0,
        grossSalary: 4000,
        netSalary: 4000
      });

      const result = await DashboardService.getEmployeesPaidCount(6, 2024);
      
      expect(result.count).toBe(2); // Only 2 employees paid
      expect(result.totalEmployees).toBe(3); // Total 3 employees exist
      expect(result.month).toBe(6);
      expect(result.year).toBe(2024);
    });
  });

  describe('getPendingApprovalsCount', () => {
    test('should return correct pending payroll count', async () => {
      // Create test employees
      const employee1 = await Employee.create({
        userId: new mongoose.Types.ObjectId(),
        baseSalary: 50000,
        allowance: 5000,
        deduction: 2000
      });

      const employee2 = await Employee.create({
        userId: new mongoose.Types.ObjectId(),
        baseSalary: 60000,
        allowance: 6000,
        deduction: 3000
      });

      // Create payroll for only one employee
      await Payroll.create({
        employeeId: employee1._id,
        month: 1,
        year: 2024,
        baseSalary: 50000,
        allowance: 5000,
        deduction: 2000,
        grossSalary: 55000,
        netSalary: 53000
      });

      const result = await DashboardService.getPendingApprovalsCount(1, 2024);
      
      expect(result).toEqual({
        count: 1, // One employee without payroll
        types: ['payroll'],
        month: 1,
        year: 2024,
        totalEmployees: 2,
        processedEmployees: 1
      });
    });

    test('should return zero when all employees have payroll', async () => {
      // Create test employee
      const employee = await Employee.create({
        userId: new mongoose.Types.ObjectId(),
        baseSalary: 50000,
        allowance: 5000,
        deduction: 2000
      });

      // Create payroll for the employee
      await Payroll.create({
        employeeId: employee._id,
        month: 2,
        year: 2024,
        baseSalary: 50000,
        allowance: 5000,
        deduction: 2000,
        grossSalary: 55000,
        netSalary: 53000
      });

      const result = await DashboardService.getPendingApprovalsCount(2, 2024);
      
      expect(result).toEqual({
        count: 0,
        types: ['payroll'],
        month: 2,
        year: 2024,
        totalEmployees: 1,
        processedEmployees: 1
      });
    });
  });

  describe('getDashboardMetrics', () => {
    test('should return complete dashboard metrics', async () => {
      // Create test data
      const employee = await Employee.create({
        userId: new mongoose.Types.ObjectId(),
        baseSalary: 5000
      });

      await Payroll.create({
        employeeId: employee._id,
        month: 6,
        year: 2024,
        baseSalary: 5000,
        allowance: 0,
        deduction: 0,
        grossSalary: 5000,
        netSalary: 5000
      });

      const result = await DashboardService.getDashboardMetrics(6, 2024);
      
      expect(result.payrollTotal.amount).toBe(5000);
      expect(result.employeesPaid.count).toBe(1);
      expect(result.pendingApprovals.count).toBe(0);
      expect(result.lastUpdated).toBeInstanceOf(Date);
    });

    test('should use current month/year when not provided', async () => {
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();

      const result = await DashboardService.getDashboardMetrics();
      
      expect(result.payrollTotal.month).toBe(currentMonth);
      expect(result.payrollTotal.year).toBe(currentYear);
      expect(result.employeesPaid.month).toBe(currentMonth);
      expect(result.employeesPaid.year).toBe(currentYear);
    });
  });
});