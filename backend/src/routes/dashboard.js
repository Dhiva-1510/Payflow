import express from 'express';
import DashboardService from '../services/dashboardService.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

/**
 * Error response helper
 */
const sendErrorResponse = (res, error, statusCode = 500) => {
  console.error('Dashboard API error:', error);
  
  // Determine if it's a validation error (400) or server error (500)
  const isValidationError = error.message.includes('Month must be') || 
                           error.message.includes('Year must be') ||
                           error.message.includes('between');
  
  const status = isValidationError ? 400 : statusCode;
  
  res.status(status).json({
    success: false,
    error: {
      code: 'DASHBOARD_ERROR',
      message: error.message,
      details: error.stack
    },
    timestamp: new Date()
  });
};

/**
 * GET /api/dashboard/metrics
 * Get all dashboard metrics for the current or specified month/year
 */
router.get('/metrics', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { month, year } = req.query;
    
    // Parse parameters if provided
    const parsedMonth = month ? parseInt(month) : null;
    const parsedYear = year ? parseInt(year) : null;
    
    const metrics = await DashboardService.getDashboardMetrics(parsedMonth, parsedYear);
    
    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    sendErrorResponse(res, error);
  }
});

/**
 * GET /api/dashboard/payroll-total/:month/:year
 * Get payroll total for a specific month and year
 */
router.get('/payroll-total/:month/:year', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const month = parseInt(req.params.month);
    const year = parseInt(req.params.year);
    
    const payrollTotal = await DashboardService.getPayrollTotal(month, year);
    
    res.json({
      success: true,
      data: payrollTotal
    });
  } catch (error) {
    sendErrorResponse(res, error);
  }
});

/**
 * GET /api/dashboard/employees-paid/:month/:year
 * Get count of employees paid in a specific month and year
 */
router.get('/employees-paid/:month/:year', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const month = parseInt(req.params.month);
    const year = parseInt(req.params.year);
    
    const employeesPaid = await DashboardService.getEmployeesPaidCount(month, year);
    
    res.json({
      success: true,
      data: employeesPaid
    });
  } catch (error) {
    sendErrorResponse(res, error);
  }
});

/**
 * GET /api/dashboard/pending-approvals
 * Get count of pending approval items
 */
router.get('/pending-approvals', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const pendingApprovals = await DashboardService.getPendingApprovalsCount();
    
    res.json({
      success: true,
      data: pendingApprovals
    });
  } catch (error) {
    sendErrorResponse(res, error);
  }
});

// Legacy endpoints for backward compatibility
// These can be removed once frontend is updated to use new endpoints

/**
 * GET /api/dashboard/stats
 * Legacy endpoint - provides dashboard statistics with recent activity
 */
router.get('/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const metrics = await DashboardService.getDashboardMetrics();
    
    // Get recent payroll activity (last 5 payroll records)
    const recentActivity = await DashboardService.getRecentActivity(5);
    
    // Transform to legacy format for backward compatibility
    const legacyResponse = {
      totalEmployees: metrics.employeesPaid.totalEmployees,
      monthlyPayroll: metrics.payrollTotal.amount,
      pendingApprovals: metrics.pendingApprovals.count,
      lastPayrollRun: {
        month: metrics.payrollTotal.month,
        year: metrics.payrollTotal.year
      },
      recentActivity: recentActivity
    };
    
    res.json({
      success: true,
      data: legacyResponse
    });
  } catch (error) {
    sendErrorResponse(res, error);
  }
});

/**
 * GET /api/dashboard/reports
 * Get dashboard reports data
 */
router.get('/reports', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { type = 'monthly', year } = req.query;
    const targetYear = year ? parseInt(year) : new Date().getFullYear();
    
    if (type === 'monthly') {
      const monthlyReport = await DashboardService.getMonthlyReport(targetYear);
      
      res.json({
        success: true,
        data: monthlyReport
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Unsupported report type. Currently only "monthly" is supported.'
      });
    }
  } catch (error) {
    sendErrorResponse(res, error);
  }
});

export default router;