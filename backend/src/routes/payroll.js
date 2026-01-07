import express from 'express';
import { PayrollService } from '../services/index.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import Employee from '../models/Employee.js';

const router = express.Router();

/**
 * GET /api/payroll/my-payroll
 * Get payroll history for the authenticated employee
 * Employees can only access their own data
 */
router.get('/my-payroll', authenticateToken, async (req, res) => {
  try {
    const { limit = 50, skip = 0 } = req.query;

    // Find the employee record for the authenticated user
    const employee = await Employee.findOne({ userId: req.user.id }).populate('userId');
    
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee record not found for this user'
      });
    }

    // Get payroll history
    const payrollRecords = await PayrollService.getEmployeePayrollHistory(
      employee._id.toString(), 
      { 
        limit: parseInt(limit), 
        skip: parseInt(skip) 
      }
    );

    res.status(200).json({
      success: true,
      message: 'Payroll history retrieved successfully',
      data: {
        employee: {
          id: employee._id,
          name: employee.userId.name,
          email: employee.userId.email
        },
        payrollRecords,
        count: payrollRecords.length
      }
    });

  } catch (error) {
    console.error('My payroll history error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error while retrieving payroll history'
    });
  }
});

/**
 * POST /api/payroll/run
 * Run payroll processing for all employees (Admin only)
 */
router.post('/run', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { month, year } = req.body;

    // Validate required fields
    if (!month || !year) {
      return res.status(400).json({
        success: false,
        message: 'Month and year are required'
      });
    }

    // Convert to numbers
    const monthNum = parseInt(month);
    const yearNum = parseInt(year);

    // Run batch payroll processing
    const result = await PayrollService.runPayrollForAll(monthNum, yearNum);

    res.status(200).json({
      success: true,
      message: result.message,
      data: {
        processedCount: result.processedCount,
        failedCount: result.failedCount,
        totalEmployees: result.totalEmployees,
        results: result.results
      }
    });

  } catch (error) {
    console.error('Payroll processing error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error during payroll processing'
    });
  }
});

/**
 * GET /api/payroll/:employeeId
 * Get payroll history for a specific employee
 * Employees can only access their own data, admins can access any employee's data
 */
router.get('/:employeeId', authenticateToken, async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { limit = 50, skip = 0 } = req.query;

    // Validate employeeId format
    if (!employeeId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid employee ID format'
      });
    }

    // Find the employee to get the associated userId
    const employee = await Employee.findById(employeeId).populate('userId');
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Check access control: employees can only access their own data
    if (req.user.role !== 'admin' && req.user.id.toString() !== employee.userId._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only view your own payroll data'
      });
    }

    // Get payroll history
    const payrollRecords = await PayrollService.getEmployeePayrollHistory(
      employeeId, 
      { 
        limit: parseInt(limit), 
        skip: parseInt(skip) 
      }
    );

    res.status(200).json({
      success: true,
      message: 'Payroll history retrieved successfully',
      data: {
        employee: {
          id: employee._id,
          name: employee.userId.name,
          email: employee.userId.email
        },
        payrollRecords,
        count: payrollRecords.length
      }
    });

  } catch (error) {
    console.error('Payroll history error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error while retrieving payroll history'
    });
  }
});

export default router;