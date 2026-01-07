import fc from 'fast-check';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { authenticateToken, authorizeRole } from '../auth.js';
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

describe('Middleware Property-Based Tests', () => {
  /**
   * Property 3: Invalid Token Rejection
   * Feature: employee-payroll-system, Property 3: Invalid Token Rejection
   * Validates: Requirements 1.3
   */
  describe('Property 3: Invalid Token Rejection', () => {
    test('should reject all invalid or malformed JWT tokens', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            // Invalid token formats
            fc.string().filter(s => s !== '' && !s.startsWith('Bearer ')),
            fc.string().map(s => `Bearer ${s}`).filter(s => s !== 'Bearer '),
            // Malformed JWT tokens
            fc.string().map(s => `Bearer ${s}.invalid.token`),
            fc.string().map(s => `Bearer invalid.${s}.format`),
            // Empty or null tokens
            fc.constant('Bearer '),
            fc.constant('Bearer null'),
            fc.constant('Bearer undefined'),
            // Expired tokens (simulate by using past timestamp)
            fc.integer({ min: 1, max: 1000000 }).map(pastTime => {
              const expiredPayload = {
                userId: new mongoose.Types.ObjectId(),
                email: 'test@example.com',
                role: 'employee',
                exp: Math.floor(Date.now() / 1000) - pastTime // Past timestamp
              };
              return `Bearer ${jwt.sign(expiredPayload, process.env.JWT_SECRET || 'supersecretkey')}`;
            }),
            // Tokens with wrong secret
            fc.record({
              userId: fc.string(),
              email: fc.emailAddress(),
              role: fc.constantFrom('admin', 'employee')
            }).map(payload => {
              const wrongToken = jwt.sign(payload, 'wrongsecret');
              return `Bearer ${wrongToken}`;
            })
          ),
          async (invalidAuthHeader) => {
            const req = {
              headers: {
                authorization: invalidAuthHeader
              }
            };
            const res = mockResponse();
            mockNextCalled = false;

            await authenticateToken(req, res, mockNext);

            // Should always reject invalid tokens
            expect(res.statusCode).toBe(401);
            expect(res.data.success).toBe(false);
            expect(mockNextCalled).toBe(false);
            expect(req.user).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should reject requests with missing authorization header', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            fc.constant({}), // No headers
            fc.constant({ headers: {} }), // Empty headers
            fc.record({
              headers: fc.record({
                'content-type': fc.constantFrom('application/json', 'text/plain'),
                'user-agent': fc.string()
              })
            }) // Headers without authorization
          ),
          async (reqWithoutAuth) => {
            const res = mockResponse();
            mockNextCalled = false;

            await authenticateToken(reqWithoutAuth, res, mockNext);

            expect(res.statusCode).toBe(401);
            expect(res.data.success).toBe(false);
            expect(res.data.message).toBe('Access token is required');
            expect(mockNextCalled).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 4: Role-Based Access Control
   * Feature: employee-payroll-system, Property 4: Role-Based Access Control
   * Validates: Requirements 1.4
   */
  describe('Property 4: Role-Based Access Control', () => {
    test('should deny access to admin-only endpoints for employee JWT tokens', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            id: fc.string(),
            email: fc.emailAddress(),
            name: fc.string().filter(s => s.length > 0),
            role: fc.constant('employee') // Always employee role
          }),
          fc.constantFrom('admin'), // Admin-only role requirement
          async (employeeUser, requiredRole) => {
            const req = {
              user: employeeUser
            };
            const res = mockResponse();
            mockNextCalled = false;

            const adminMiddleware = authorizeRole(requiredRole);
            adminMiddleware(req, res, mockNext);

            // Should always deny access for employees trying to access admin endpoints
            expect(res.statusCode).toBe(403);
            expect(res.data.success).toBe(false);
            expect(res.data.message).toBe('Insufficient permissions - admin access required');
            expect(mockNextCalled).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should allow access when user role matches required role', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('admin', 'employee'),
          fc.record({
            id: fc.string(),
            email: fc.emailAddress(),
            name: fc.string().filter(s => s.length > 0)
          }),
          async (role, userBase) => {
            const user = { ...userBase, role };
            const req = { user };
            const res = mockResponse();
            mockNextCalled = false;

            const roleMiddleware = authorizeRole(role);
            roleMiddleware(req, res, mockNext);

            // Should always allow access when roles match
            expect(mockNextCalled).toBe(true);
            expect(res.statusCode).toBeUndefined(); // No error response
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should deny access when no user is present in request', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('admin', 'employee'),
          fc.oneof(
            fc.constant({}), // Empty request
            fc.constant({ user: null }), // Null user
            fc.constant({ user: undefined }), // Undefined user
            fc.record({
              headers: fc.record({
                'content-type': fc.string()
              })
            }) // Request without user property
          ),
          async (requiredRole, reqWithoutUser) => {
            const res = mockResponse();
            mockNextCalled = false;

            const roleMiddleware = authorizeRole(requiredRole);
            roleMiddleware(reqWithoutUser, res, mockNext);

            // Should always require authentication first
            expect(res.statusCode).toBe(401);
            expect(res.data.success).toBe(false);
            expect(res.data.message).toBe('Authentication required');
            expect(mockNextCalled).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should handle multiple role requirements correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('admin', 'employee'),
          fc.array(fc.constantFrom('admin', 'employee', 'manager'), { minLength: 1, maxLength: 3 }),
          fc.record({
            id: fc.string(),
            email: fc.emailAddress(),
            name: fc.string().filter(s => s.length > 0)
          }),
          async (userRole, allowedRoles, userBase) => {
            const user = { ...userBase, role: userRole };
            const req = { user };
            const res = mockResponse();
            mockNextCalled = false;

            const roleMiddleware = authorizeRole(...allowedRoles);
            roleMiddleware(req, res, mockNext);

            if (allowedRoles.includes(userRole)) {
              // Should allow access if user role is in allowed roles
              expect(mockNextCalled).toBe(true);
              expect(res.statusCode).toBeUndefined();
            } else {
              // Should deny access if user role is not in allowed roles
              expect(res.statusCode).toBe(403);
              expect(res.data.success).toBe(false);
              expect(res.data.message).toBe('Insufficient permissions - admin access required');
              expect(mockNextCalled).toBe(false);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});