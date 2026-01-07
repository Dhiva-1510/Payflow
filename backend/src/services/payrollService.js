import Employee from '../models/Employee.js';
import Payroll from '../models/Payroll.js';

/**
 * Payroll Service
 * Handles salary calculations and payroll processing
 */
class PayrollService {
  /**
   * Calculate salary for an employee
   * @param {Object} employee - Employee object with baseSalary, allowance, deduction
   * @returns {Object} - Calculated salary details
   */
  static calculateSalary(employee) {
    const { baseSalary, allowance, deduction } = employee;
    
    // Validate input values
    if (typeof baseSalary !== 'number' || baseSalary < 0) {
      throw new Error('Base salary must be a non-negative number');
    }
    if (typeof allowance !== 'number' || allowance < 0) {
      throw new Error('Allowance must be a non-negative number');
    }
    if (typeof deduction !== 'number' || deduction < 0) {
      throw new Error('Deduction must be a non-negative number');
    }

    // Calculate gross salary (base + allowance)
    const grossSalary = baseSalary + allowance;
    
    // Calculate net salary (gross - deduction)
    const netSalary = grossSalary - deduction;

    return {
      baseSalary,
      allowance,
      deduction,
      grossSalary,
      netSalary
    };
  }

  /**
   * Process payroll for a single employee
   * @param {String} employeeId - Employee ID
   * @param {Number} month - Month (1-12)
   * @param {Number} year - Year
   * @returns {Object} - Created payroll record
   */
  static async processEmployeePayroll(employeeId, month, year) {
    try {
      // Find the employee
      const employee = await Employee.findById(employeeId);
      if (!employee) {
        throw new Error(`Employee with ID ${employeeId} not found`);
      }

      // Check if payroll already exists for this employee and period
      const existingPayroll = await Payroll.findOne({
        employeeId,
        month,
        year
      });

      if (existingPayroll) {
        throw new Error(`Payroll already exists for employee ${employeeId} for ${month}/${year}`);
      }

      // Calculate salary
      const salaryCalculation = this.calculateSalary(employee);

      // Create payroll record
      const payrollData = {
        employeeId,
        month,
        year,
        ...salaryCalculation
      };

      const payroll = new Payroll(payrollData);
      await payroll.save();

      return payroll;
    } catch (error) {
      throw new Error(`Failed to process payroll for employee ${employeeId}: ${error.message}`);
    }
  }

  /**
   * Get payroll history for an employee
   * @param {String} employeeId - Employee ID
   * @param {Object} options - Query options (limit, skip, etc.)
   * @returns {Array} - Array of payroll records
   */
  static async getEmployeePayrollHistory(employeeId, options = {}) {
    try {
      const { limit = 50, skip = 0 } = options;

      // Verify employee exists
      const employee = await Employee.findById(employeeId);
      if (!employee) {
        throw new Error(`Employee with ID ${employeeId} not found`);
      }

      // Get payroll records ordered by date (most recent first)
      const payrollRecords = await Payroll.find({ employeeId })
        .sort({ year: -1, month: -1 })
        .limit(limit)
        .skip(skip)
        .lean();

      return payrollRecords;
    } catch (error) {
      throw new Error(`Failed to get payroll history for employee ${employeeId}: ${error.message}`);
    }
  }

  /**
   * Process payroll for all employees (batch processing)
   * @param {Number} month - Month (1-12)
   * @param {Number} year - Year
   * @returns {Object} - Processing results with success/failure details
   */
  static async runPayrollForAll(month, year) {
    try {
      // Validate payroll period
      this.validatePayrollPeriod(month, year);

      // Get all employees
      const employees = await Employee.find({});
      
      if (employees.length === 0) {
        return {
          success: true,
          message: 'No employees found to process payroll',
          processedCount: 0,
          failedCount: 0,
          results: []
        };
      }

      const results = [];
      let processedCount = 0;
      let failedCount = 0;

      // Process each employee individually
      for (const employee of employees) {
        try {
          const payroll = await this.processEmployeePayroll(employee._id, month, year);
          results.push({
            employeeId: employee._id,
            success: true,
            payroll: payroll,
            message: 'Payroll processed successfully'
          });
          processedCount++;
        } catch (error) {
          results.push({
            employeeId: employee._id,
            success: false,
            error: error.message,
            message: `Failed to process payroll: ${error.message}`
          });
          failedCount++;
        }
      }

      return {
        success: true,
        message: `Payroll processing completed. ${processedCount} successful, ${failedCount} failed.`,
        processedCount,
        failedCount,
        totalEmployees: employees.length,
        results
      };

    } catch (error) {
      throw new Error(`Batch payroll processing failed: ${error.message}`);
    }
  }

  /**
   * Validate payroll processing parameters
   * @param {Number} month - Month (1-12)
   * @param {Number} year - Year
   * @throws {Error} - If parameters are invalid
   */
  static validatePayrollPeriod(month, year) {
    if (!Number.isInteger(month) || month < 1 || month > 12) {
      throw new Error('Month must be an integer between 1 and 12');
    }

    const currentYear = new Date().getFullYear();
    if (!Number.isInteger(year) || year < 2020 || year > currentYear + 1) {
      throw new Error(`Year must be an integer between 2020 and ${currentYear + 1}`);
    }
  }
}

export default PayrollService;