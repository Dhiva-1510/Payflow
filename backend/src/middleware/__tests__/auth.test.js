import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { authenticateToken, authorizeRole, requireAdmin } from '../auth.js';
import User from '../../models/User.js';

// Mock response object
const mockResponse = () => {
  const res = {};
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (data) => {
    res.data = data;
    return res;
  };
  return res;
};

// Mock next function
let mockNextCalled = false;
const mockNext = () => {
  mockNextCalled = true;
};

beforeAll(async () => {
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/payrolldb_test';
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.connection.close();
});

beforeEach(async () => {
  await User.deleteMany({});
  mockNextCalled = false;
});

describe('Authentication Middleware', () => {
  describe('authenticateToken', () => {
    test('should authenticate valid token', async () => {
      // Create test user
      const user = new User({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        role: 'employee'
      });
      await user.save();

      // Generate token
      const token = jwt.sign(
        { userId: user._id, email: user.email, role: user.role },
        process.env.JWT_SECRET || 'supersecretkey',
        { expiresIn: '1h' }
      );

      const req = {
        headers: {
          authorization: `Bearer ${token}`
        }
      };
      const res = mockResponse();

      await authenticateToken(req, res, mockNext);

      expect(mockNextCalled).toBe(true);
      expect(req.user).toBeDefined();
      expect(req.user.email).toBe(user.email);
    });

    test('should reject missing token', async () => {
      const req = { headers: {} };
      const res = mockResponse();

      await authenticateToken(req, res, mockNext);

      expect(res.statusCode).toBe(401);
      expect(res.data.success).toBe(false);
      expect(res.data.message).toBe('Access token is required');
      expect(mockNextCalled).toBe(false);
    });
  });

  describe('authorizeRole', () => {
    test('should allow access for correct role', () => {
      const req = {
        user: { role: 'admin' }
      };
      const res = mockResponse();
      const adminMiddleware = authorizeRole('admin');

      adminMiddleware(req, res, mockNext);

      expect(mockNextCalled).toBe(true);
    });

    test('should deny access for incorrect role', () => {
      const req = {
        user: { role: 'employee' }
      };
      const res = mockResponse();
      const adminMiddleware = authorizeRole('admin');

      adminMiddleware(req, res, mockNext);

      expect(res.statusCode).toBe(403);
      expect(res.data.success).toBe(false);
      expect(res.data.message).toBe('Insufficient permissions - admin access required');
      expect(mockNextCalled).toBe(false);
    });
  });
});