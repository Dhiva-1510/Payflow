import PayrollService from '../payrollService.js';
import Employee from '../../models/Employee.js';
import Payroll from '../../models/Payroll.js';
import User from '../../models/User.js';
import mongoose from 'mongoose';

describe('PayrollService', () => {
  beforeAll(async () => {
    // Connect to test database
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/payrolldb_test';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Employee.deleteMany({});
    await Payroll.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('calculateSalary', () => {
    it('should calculate gross and net salary correctly', () => {
      const employee = {
        baseSalary: 5000,
        allowance: 1000,
        deduction: 500
      };

      const result = PayrollService.calculateSalary(employee);

      expect(result).toEqual({
        baseSalary: 5000,
        allowance: 1000,
        deduction: 500,
        grossSalary: 6000, // 5000 + 1000
        netSalary: 5500    // 6000 - 500
      });
    });

    it('should handle zero allowance and deduction', () => {
      const employee = {
        baseSalary: 5000,
        allowance: 0,
        deduction: 0
      };

      const result = PayrollService.calculateSalary(employee);

      expect(result.grossSalary).toBe(5000);
      expect(result.netSalary).toBe(5000);
    });

    it('should throw error for negative values', () => {
      const employee = {
        baseSalary: -1000,
        allowance: 500,
        deduction: 200
      };

      expect(() => PayrollService.calculateSalary(employee))
        .toThrow('Base salary must be a non-negative number');
    });
  });

  describe('processEmployeePayroll', () => {
    let user, employee;

    beforeEach(async () => {
      user = await User.create({
        name: 'Test Employee',
        email: 'test@example.com',
        password: 'hashedpassword',
        role: 'employee'
      });

      employee = await Employee.create({
        userId: user._id,
        baseSalary: 5000,
        allowance: 1000,
        deduction: 500
      });
    });

    it('should create payroll record for employee', async () => {
      const result = await PayrollService.processEmployeePayroll(
        employee._id.toString(),
        12,
        2024
      );

      expect(result.employeeId.toString()).toBe(employee._id.toString());
      expect(result.month).toBe(12);
      expect(result.year).toBe(2024);
      expect(result.grossSalary).toBe(6000);
      expect(result.netSalary).toBe(5500);
    });

    it('should throw error for non-existent employee', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      
      await expect(PayrollService.processEmployeePayroll(fakeId.toString(), 12, 2024))
        .rejects.toThrow(`Employee with ID ${fakeId} not found`);
    });

    it('should throw error for duplicate payroll period', async () => {
      // Create first payroll
      await PayrollService.processEmployeePayroll(employee._id.toString(), 12, 2024);

      // Try to create duplicate
      await expect(PayrollService.processEmployeePayroll(employee._id.toString(), 12, 2024))
        .rejects.toThrow(`Payroll already exists for employee ${employee._id} for 12/2024`);
    });
  });

  describe('validatePayrollPeriod', () => {
    it('should validate correct month and year', () => {
      expect(() => PayrollService.validatePayrollPeriod(12, 2024)).not.toThrow();
    });

    it('should throw error for invalid month', () => {
      expect(() => PayrollService.validatePayrollPeriod(13, 2024))
        .toThrow('Month must be an integer between 1 and 12');
    });

    it('should throw error for invalid year', () => {
      expect(() => PayrollService.validatePayrollPeriod(12, 2019))
        .toThrow('Year must be an integer between 2020 and');
    });
  });
});