import express from 'express';
import Employee from '../models/Employee.js';
import User from '../models/User.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { validateEmployeeData, validateEmployeeUpdateData, isValidObjectId } from '../utils/validation.js';

const router = express.Router();

// GET /api/employee/me - Get current user's employee record
router.get('/me', authenticateToken, async (req, res) => {
  try {
    // Find employee record for the authenticated user
    const employee = await Employee.findOne({ userId: req.user.id })
      .populate('userId', 'name email role');

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee record not found for this user'
      });
    }

    res.json({
      success: true,
      employee: {
        id: employee._id,
        userId: employee.userId._id,
        userName: employee.userId.name,
        userEmail: employee.userId.email,
        userRole: employee.userId.role,
        baseSalary: employee.baseSalary,
        allowance: employee.allowance,
        deduction: employee.deduction,
        grossSalary: employee.grossSalary,
        netSalary: employee.netSalary,
        createdAt: employee.createdAt,
        updatedAt: employee.updatedAt
      }
    });
  } catch (error) {
    console.error('Get employee error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// POST /api/employee/add - Add new employee (admin only)
router.post('/add', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId, baseSalary, allowance, deduction } = req.body;

    // Validate required fields
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    // Validate ObjectId format
    if (!isValidObjectId(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format'
      });
    }

    // Validate employee data
    const validation = validateEmployeeData({ baseSalary, allowance, deduction });
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.errors
      });
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if employee record already exists for this user
    const existingEmployee = await Employee.findOne({ userId });
    if (existingEmployee) {
      return res.status(409).json({
        success: false,
        message: 'Employee record already exists for this user'
      });
    }

    // Create new employee
    const employee = new Employee({
      userId,
      baseSalary,
      allowance: allowance || 0,
      deduction: deduction || 0
    });

    await employee.save();

    // Populate user information for response
    await employee.populate('userId', 'name email role');

    res.status(201).json({
      success: true,
      employee: {
        id: employee._id,
        userId: employee.userId._id,
        userName: employee.userId.name,
        userEmail: employee.userId.email,
        userRole: employee.userId.role,
        baseSalary: employee.baseSalary,
        allowance: employee.allowance,
        deduction: employee.deduction,
        grossSalary: employee.grossSalary,
        netSalary: employee.netSalary,
        createdAt: employee.createdAt,
        updatedAt: employee.updatedAt
      }
    });
  } catch (error) {
    console.error('Employee creation error:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }

    // Handle duplicate key errors
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Employee record already exists for this user'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// GET /api/employee - Get all employees (admin only)
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Get all employees with populated user information
    const employees = await Employee.find()
      .populate('userId', 'name email role')
      .sort({ createdAt: -1 });

    const employeeList = employees.map(employee => ({
      id: employee._id,
      userId: employee.userId._id,
      userName: employee.userId.name,
      userEmail: employee.userId.email,
      userRole: employee.userId.role,
      baseSalary: employee.baseSalary,
      allowance: employee.allowance,
      deduction: employee.deduction,
      grossSalary: employee.grossSalary,
      netSalary: employee.netSalary,
      createdAt: employee.createdAt,
      updatedAt: employee.updatedAt
    }));

    res.json({
      success: true,
      employees: employeeList,
      count: employeeList.length
    });
  } catch (error) {
    console.error('Employee list error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// PUT /api/employee/:id - Update employee (admin only)
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { baseSalary, allowance, deduction } = req.body;

    // Validate employee ID
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID is required'
      });
    }

    // Validate ObjectId format
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid employee ID format'
      });
    }

    // Validate update data
    const validation = validateEmployeeUpdateData({ baseSalary, allowance, deduction });
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.errors
      });
    }

    // Build update object with only provided fields
    const updateData = {};
    
    if (baseSalary !== undefined) {
      updateData.baseSalary = baseSalary;
    }

    if (allowance !== undefined) {
      updateData.allowance = allowance;
    }

    if (deduction !== undefined) {
      updateData.deduction = deduction;
    }

    // Find and update employee
    const employee = await Employee.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('userId', 'name email role');

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    res.json({
      success: true,
      employee: {
        id: employee._id,
        userId: employee.userId._id,
        userName: employee.userId.name,
        userEmail: employee.userId.email,
        userRole: employee.userId.role,
        baseSalary: employee.baseSalary,
        allowance: employee.allowance,
        deduction: employee.deduction,
        grossSalary: employee.grossSalary,
        netSalary: employee.netSalary,
        createdAt: employee.createdAt,
        updatedAt: employee.updatedAt
      }
    });
  } catch (error) {
    console.error('Employee update error:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }

    // Handle invalid ObjectId
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid employee ID format'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

export default router;