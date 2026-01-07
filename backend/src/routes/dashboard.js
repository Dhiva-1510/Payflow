import express from 'express';
import Employee from '../models/Employee.js';
import Payroll from '../models/Payroll.js';
import User from '../models/User.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/dashboard/stats
 * Get dashboard statistics for admin
 */
router.get('/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Get total employees count
    const totalEmployees = await Employee.countDocuments();
    
    // Get all employees with their salary data
    const employees = await Employee.find({});
    const monthlyPayroll = employees.reduce((sum, emp) => sum + (emp.netSalary || 0), 0);
    
    // Get last payroll run information
    const lastPayrollRun = await Payroll.findOne()
      .sort({ createdAt: -1 })
      .populate('employeeId', 'userId')
      .populate({
        path: 'employeeId',
        populate: {
          path: 'userId',
          select: 'name email'
        }
      });

    // Get pending approvals count (for now, this is placeholder - could be leave requests, etc.)
    const pendingApprovals = 0; // TODO: Implement approval system

    // Get recent payroll runs (last 5)
    const recentPayrollRuns = await Payroll.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('employeeId', 'userId')
      .populate({
        path: 'employeeId',
        populate: {
          path: 'userId',
          select: 'name email'
        }
      });

    res.json({
      success: true,
      data: {
        totalEmployees,
        monthlyPayroll,
        pendingApprovals,
        lastPayrollRun: lastPayrollRun ? {
          id: lastPayrollRun._id,
          month: lastPayrollRun.month,
          year: lastPayrollRun.year,
          employeeName: lastPayrollRun.employeeId?.userId?.name || 'Unknown',
          netSalary: lastPayrollRun.netSalary,
          createdAt: lastPayrollRun.createdAt
        } : null,
        recentActivity: recentPayrollRuns.map(payroll => ({
          id: payroll._id,
          type: 'payroll_processed',
          description: `Payroll processed for ${payroll.employeeId?.userId?.name || 'Unknown'}`,
          amount: payroll.netSalary,
          month: payroll.month,
          year: payroll.year,
          createdAt: payroll.createdAt
        }))
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * GET /api/dashboard/payroll-summary
 * Get payroll summary by month/year
 */
router.get('/payroll-summary', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { year, month } = req.query;
    
    // Build query
    const query = {};
    if (year) query.year = parseInt(year);
    if (month) query.month = parseInt(month);

    // Get payroll records with employee details
    const payrollRecords = await Payroll.find(query)
      .populate('employeeId', 'userId')
      .populate({
        path: 'employeeId',
        populate: {
          path: 'userId',
          select: 'name email'
        }
      })
      .sort({ createdAt: -1 });

    // Calculate summary statistics
    const totalAmount = payrollRecords.reduce((sum, record) => sum + record.netSalary, 0);
    const totalEmployees = payrollRecords.length;
    const averageSalary = totalEmployees > 0 ? totalAmount / totalEmployees : 0;

    res.json({
      success: true,
      data: {
        summary: {
          totalAmount,
          totalEmployees,
          averageSalary,
          period: { year: parseInt(year) || null, month: parseInt(month) || null }
        },
        records: payrollRecords.map(record => ({
          id: record._id,
          employeeName: record.employeeId?.userId?.name || 'Unknown',
          employeeEmail: record.employeeId?.userId?.email || 'Unknown',
          baseSalary: record.baseSalary,
          allowance: record.allowance,
          deduction: record.deduction,
          grossSalary: record.grossSalary,
          netSalary: record.netSalary,
          month: record.month,
          year: record.year,
          createdAt: record.createdAt
        }))
      }
    });
  } catch (error) {
    console.error('Payroll summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * GET /api/dashboard/reports
 * Get various reports for admin
 */
router.get('/reports', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { type = 'monthly', year, month } = req.query;
    
    let reportData = {};

    if (type === 'monthly') {
      // Monthly payroll report
      const currentYear = year ? parseInt(year) : new Date().getFullYear();
      const monthlyData = [];

      for (let m = 1; m <= 12; m++) {
        const payrollRecords = await Payroll.find({ year: currentYear, month: m });
        const totalAmount = payrollRecords.reduce((sum, record) => sum + record.netSalary, 0);
        const employeeCount = payrollRecords.length;

        monthlyData.push({
          month: m,
          monthName: new Date(currentYear, m - 1).toLocaleString('default', { month: 'long' }),
          totalAmount,
          employeeCount,
          averageSalary: employeeCount > 0 ? totalAmount / employeeCount : 0
        });
      }

      reportData = {
        type: 'monthly',
        year: currentYear,
        data: monthlyData
      };
    } else if (type === 'employee') {
      // Employee salary report
      const employees = await Employee.find()
        .populate('userId', 'name email')
        .sort({ 'userId.name': 1 });

      reportData = {
        type: 'employee',
        data: employees.map(emp => ({
          id: emp._id,
          name: emp.userId?.name || 'Unknown',
          email: emp.userId?.email || 'Unknown',
          baseSalary: emp.baseSalary,
          allowance: emp.allowance,
          deduction: emp.deduction,
          grossSalary: emp.grossSalary,
          netSalary: emp.netSalary
        }))
      };
    }

    res.json({
      success: true,
      data: reportData
    });
  } catch (error) {
    console.error('Reports error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

export default router;