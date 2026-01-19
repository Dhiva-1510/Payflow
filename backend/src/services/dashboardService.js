import Employee from '../models/Employee.js';
import Payroll from '../models/Payroll.js';

/**
 * Dashboard Service
 * Handles dashboard metrics calculation and aggregation
 */
class DashboardService {
  /**
   * Validate month and year parameters
   * @param {Number} month - Month (1-12)
   * @param {Number} year - Year
   * @throws {Error} - If parameters are invalid
   */
  static validateDateParameters(month, year) {
    if (!Number.isInteger(month) || month < 1 || month > 12) {
      throw new Error('Month must be an integer between 1 and 12');
    }

    const currentYear = new Date().getFullYear();
    if (!Number.isInteger(year) || year < 2020 || year > currentYear + 1) {
      throw new Error(`Year must be an integer between 2020 and ${currentYear + 1}`);
    }
  }

  /**
   * Get total payroll amount for a specific month and year
   * @param {Number} month - Month (1-12)
   * @param {Number} year - Year
   * @returns {Object} - Payroll total with metadata
   */
  static async getPayrollTotal(month, year) {
    try {
      this.validateDateParameters(month, year);

      // MongoDB aggregation pipeline for payroll totals
      const pipeline = [
        { 
          $match: { 
            month: month, 
            year: year 
          } 
        },
        { 
          $group: { 
            _id: null, 
            total: { $sum: "$netSalary" },
            count: { $sum: 1 }
          }
        }
      ];

      const result = await Payroll.aggregate(pipeline);
      
      if (result.length === 0) {
        return {
          amount: 0,
          currency: 'INR',
          month: month,
          year: year,
          employeeCount: 0
        };
      }

      return {
        amount: result[0].total || 0,
        currency: 'INR',
        month: month,
        year: year,
        employeeCount: result[0].count || 0
      };
    } catch (error) {
      throw new Error(`Failed to get payroll total: ${error.message}`);
    }
  }

  /**
   * Get count of unique employees who received payment in a specific month and year
   * @param {Number} month - Month (1-12)
   * @param {Number} year - Year
   * @returns {Object} - Employee count with metadata
   */
  static async getEmployeesPaidCount(month, year) {
    try {
      this.validateDateParameters(month, year);

      // MongoDB aggregation pipeline for unique employees paid
      const pipeline = [
        { 
          $match: { 
            month: month, 
            year: year 
          } 
        },
        { 
          $group: { 
            _id: "$employeeId" 
          } 
        },
        { 
          $count: "employeesPaid" 
        }
      ];

      const result = await Payroll.aggregate(pipeline);
      const employeesPaidCount = result.length > 0 ? result[0].employeesPaid : 0;

      // Get total employee count for context
      const totalEmployees = await Employee.countDocuments();

      return {
        count: employeesPaidCount,
        totalEmployees: totalEmployees,
        month: month,
        year: year
      };
    } catch (error) {
      throw new Error(`Failed to get employees paid count: ${error.message}`);
    }
  }

  /**
   * Get count of pending payroll items (employees without payroll for current month)
   * @param {Number} month - Month (1-12, optional - defaults to current month)
   * @param {Number} year - Year (optional - defaults to current year)
   * @returns {Object} - Pending payroll count
   */
  static async getPendingApprovalsCount(month = null, year = null) {
    try {
      // Default to current month/year if not provided
      const now = new Date();
      const targetMonth = month !== null ? month : now.getMonth() + 1;
      const targetYear = year !== null ? year : now.getFullYear();

      this.validateDateParameters(targetMonth, targetYear);

      // Get all employees
      const totalEmployees = await Employee.countDocuments();

      // Get employees who already have payroll for this month/year
      const employeesWithPayroll = await Payroll.distinct('employeeId', {
        month: targetMonth,
        year: targetYear
      });

      // Calculate pending payroll count
      const pendingCount = totalEmployees - employeesWithPayroll.length;

      return {
        count: Math.max(0, pendingCount), // Ensure non-negative
        types: ['payroll'],
        month: targetMonth,
        year: targetYear,
        totalEmployees: totalEmployees,
        processedEmployees: employeesWithPayroll.length
      };
    } catch (error) {
      throw new Error(`Failed to get pending approvals count: ${error.message}`);
    }
  }

  /**
   * Get recent payroll activity
   * @param {Number} limit - Number of recent activities to return
   * @returns {Array} - Array of recent payroll activities
   */
  static async getRecentActivity(limit = 5) {
    try {
      // Get recent payroll records with employee information
      const recentPayrolls = await Payroll.find({})
        .populate({
          path: 'employeeId',
          populate: {
            path: 'userId',
            select: 'name email'
          }
        })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      // Transform to activity format
      const activities = recentPayrolls.map(payroll => ({
        id: payroll._id,
        description: `Payroll processed for ${payroll.employeeId?.userId?.name || 'Unknown Employee'}`,
        amount: payroll.netSalary,
        month: payroll.month,
        year: payroll.year,
        createdAt: payroll.createdAt,
        type: 'payroll'
      }));

      return activities;
    } catch (error) {
      throw new Error(`Failed to get recent activity: ${error.message}`);
    }
  }

  /**
   * Get monthly report data for a specific year
   * @param {Number} year - Year for the report
   * @returns {Object} - Monthly report data
   */
  static async getMonthlyReport(year) {
    try {
      this.validateDateParameters(1, year); // Validate year only

      // Get payroll data for all months in the year
      const monthlyData = await Payroll.aggregate([
        {
          $match: { year: year }
        },
        {
          $group: {
            _id: '$month',
            totalAmount: { $sum: '$netSalary' },
            employeeCount: { $sum: 1 },
            averageSalary: { $avg: '$netSalary' }
          }
        },
        {
          $sort: { _id: 1 }
        }
      ]);

      // Create array for all 12 months with data or defaults
      const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];

      const reportData = months.map((monthName, index) => {
        const monthNum = index + 1;
        const monthData = monthlyData.find(data => data._id === monthNum);
        
        return {
          month: monthNum,
          monthName: monthName,
          totalAmount: monthData?.totalAmount || 0,
          employeeCount: monthData?.employeeCount || 0,
          averageSalary: monthData?.averageSalary || 0
        };
      });

      return {
        year: year,
        data: reportData,
        summary: {
          totalAmount: reportData.reduce((sum, month) => sum + month.totalAmount, 0),
          totalEmployeePayments: reportData.reduce((sum, month) => sum + month.employeeCount, 0),
          averageMonthlyPayroll: reportData.reduce((sum, month) => sum + month.totalAmount, 0) / 12
        }
      };
    } catch (error) {
      throw new Error(`Failed to get monthly report: ${error.message}`);
    }
  }

  /**
   * Get all dashboard metrics for a specific month and year
   * @param {Number} month - Month (1-12, optional - defaults to current month)
   * @param {Number} year - Year (optional - defaults to current year)
   * @returns {Object} - Complete dashboard metrics
   */
  static async getDashboardMetrics(month = null, year = null) {
    try {
      // Default to current month/year if not provided
      const now = new Date();
      const targetMonth = month !== null ? month : now.getMonth() + 1;
      const targetYear = year !== null ? year : now.getFullYear();

      // Validate parameters
      this.validateDateParameters(targetMonth, targetYear);

      // Get all metrics concurrently for better performance
      const [payrollTotal, employeesPaid, pendingApprovals] = await Promise.all([
        this.getPayrollTotal(targetMonth, targetYear),
        this.getEmployeesPaidCount(targetMonth, targetYear),
        this.getPendingApprovalsCount(targetMonth, targetYear)
      ]);

      return {
        payrollTotal,
        employeesPaid,
        pendingApprovals,
        lastUpdated: new Date()
      };
    } catch (error) {
      throw new Error(`Failed to get dashboard metrics: ${error.message}`);
    }
  }
}

export default DashboardService;