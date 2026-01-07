import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Employee from '../models/Employee.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// POST /api/auth/register - User registration
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Create new user
    const user = new User({
      name,
      email,
      password,
      role: role || 'employee'
    });

    await user.save();

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// POST /api/auth/login - User login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// GET /api/auth/users - Get all users (admin only) for employee selection
router.get('/users', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    // Get all users with employee role
    const users = await User.find({ role: 'employee' }).select('_id name email');
    
    // Get all existing employee records to check which users already have employee records
    const existingEmployees = await Employee.find().select('userId');
    const existingUserIds = existingEmployees.map(emp => emp.userId.toString());
    
    // Mark users who don't have employee records yet
    const usersWithStatus = users.map(user => ({
      _id: user._id,
      name: user.name,
      email: user.email,
      hasEmployeeRecord: existingUserIds.includes(user._id.toString())
    }));

    res.json({
      success: true,
      users: usersWithStatus
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// PUT /api/auth/profile - Update user profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Name is required'
      });
    }

    // Update user profile
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { name: name.trim() },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// PUT /api/auth/change-password - Change user password
router.put('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long'
      });
    }

    // Get user with password
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// GET /api/auth/settings - Get user settings
router.get('/settings', authenticateToken, async (req, res) => {
  try {
    // For now, return default settings
    // In a real app, you might store these in a separate UserSettings model
    const defaultSettings = {
      currency: 'USD',
      theme: 'dark',
      language: 'en',
      timezone: 'UTC',
      notifications: {
        email: true,
        payroll: true,
        system: false
      }
    };

    res.json({
      success: true,
      settings: defaultSettings
    });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// PUT /api/auth/settings - Update user settings
router.put('/settings', authenticateToken, async (req, res) => {
  try {
    const { currency, theme, language, timezone, notifications } = req.body;

    // Validate settings
    const validCurrencies = ['USD', 'EUR', 'GBP', 'JPY', 'INR', 'CAD', 'AUD', 'CHF'];
    const validThemes = ['dark', 'light', 'auto'];
    const validLanguages = ['en', 'es', 'fr', 'de', 'ja', 'hi'];

    if (currency && !validCurrencies.includes(currency)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid currency'
      });
    }

    if (theme && !validThemes.includes(theme)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid theme'
      });
    }

    if (language && !validLanguages.includes(language)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid language'
      });
    }

    // In a real app, you would save these settings to a database
    // For now, we'll just return success
    res.json({
      success: true,
      message: 'Settings updated successfully',
      settings: {
        currency,
        theme,
        language,
        timezone,
        notifications
      }
    });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

export default router;