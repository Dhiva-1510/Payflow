import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import fc from 'fast-check';
import authRoutes from '../auth.js';
import User from '../../models/User.js';

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

// Test database connection
beforeAll(async () => {
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/payrolldb_test';
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.connection.close();
});

beforeEach(async () => {
  await User.deleteMany({});
});

describe('Authentication Property-Based Tests', () => {
  
  // Custom email generator that matches Mongoose validation regex
  const validEmail = () => fc.tuple(
    fc.stringOf(fc.char().filter(c => /\w/.test(c)), { minLength: 1, maxLength: 10 }),
    fc.stringOf(fc.char().filter(c => /\w/.test(c)), { minLength: 1, maxLength: 10 }),
    fc.constantFrom('com', 'org', 'net', 'edu')
  ).map(([local, domain, tld]) => `${local}@${domain}.${tld}`);

  /**
   * Property 1: User Registration Correctness
   * Feature: employee-payroll-system, Property 1: User Registration Correctness
   * Validates: Requirements 1.1
   */
  test('Property 1: User Registration Correctness - For any valid user registration data, the system should create a user record with the specified role and hashed password', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          email: validEmail(),
          password: fc.string({ minLength: 6, maxLength: 50 }),
          role: fc.constantFrom('admin', 'employee')
        }),
        async (userData) => {
          // Clean up any existing user with this email
          await User.deleteOne({ email: userData.email });
          
          const response = await request(app)
            .post('/api/auth/register')
            .send(userData);

          // Should successfully create user
          expect(response.status).toBe(201);
          expect(response.body.success).toBe(true);
          expect(response.body.user.email).toBe(userData.email.toLowerCase());
          expect(response.body.user.role).toBe(userData.role);
          expect(response.body.user.name).toBe(userData.name.trim());
          
          // Verify user was created in database
          const createdUser = await User.findOne({ email: userData.email });
          expect(createdUser).toBeTruthy();
          expect(createdUser.role).toBe(userData.role);
          
          // Verify password is hashed (not stored in plain text)
          expect(createdUser.password).not.toBe(userData.password);
          expect(createdUser.password.length).toBeGreaterThan(userData.password.length);
          
          // Verify password can be validated
          const isPasswordValid = await createdUser.comparePassword(userData.password);
          expect(isPasswordValid).toBe(true);
        }
      ),
      { numRuns: 5 }
    );
  }, 10000);

  /**
   * Property 2: JWT Token Generation
   * Feature: employee-payroll-system, Property 2: JWT Token Generation
   * Validates: Requirements 1.2
   */
  test('Property 2: JWT Token Generation - For any valid login credentials, the authentication service should return a JWT token containing the correct user information and role', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          email: validEmail(),
          password: fc.string({ minLength: 6, maxLength: 50 }),
          role: fc.constantFrom('admin', 'employee')
        }),
        async (userData) => {
          // First create a user
          const user = new User(userData);
          await user.save();
          
          // Now login with the credentials
          const loginResponse = await request(app)
            .post('/api/auth/login')
            .send({
              email: userData.email,
              password: userData.password
            });

          // Should successfully login
          expect(loginResponse.status).toBe(200);
          expect(loginResponse.body.success).toBe(true);
          expect(loginResponse.body.token).toBeDefined();
          
          // Verify JWT token contains correct information
          const decoded = jwt.verify(loginResponse.body.token, process.env.JWT_SECRET);
          expect(decoded.userId).toBe(user._id.toString());
          expect(decoded.email).toBe(userData.email.toLowerCase());
          expect(decoded.role).toBe(userData.role);
          
          // Verify user information in response
          expect(loginResponse.body.user.email).toBe(userData.email.toLowerCase());
          expect(loginResponse.body.user.role).toBe(userData.role);
          expect(loginResponse.body.user.name).toBe(userData.name.trim());
        }
      ),
      { numRuns: 5 }
    );
  }, 10000);

  /**
   * Property 5: Password Security
   * Feature: employee-payroll-system, Property 5: Password Security
   * Validates: Requirements 5.4
   */
  test('Property 5: Password Security - For any user registration, the stored password should be hashed and never stored in plain text', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          email: validEmail(),
          password: fc.string({ minLength: 6, maxLength: 50 }),
          role: fc.constantFrom('admin', 'employee')
        }),
        async (userData) => {
          // Clean up any existing user with this email
          await User.deleteOne({ email: userData.email });
          
          // Register user
          await request(app)
            .post('/api/auth/register')
            .send(userData);

          // Retrieve user from database
          const storedUser = await User.findOne({ email: userData.email });
          expect(storedUser).toBeTruthy();
          
          // Verify password is hashed (not plain text)
          expect(storedUser.password).not.toBe(userData.password);
          
          // Verify password hash format (bcrypt hash should start with $2a$, $2b$, or $2y$)
          expect(storedUser.password).toMatch(/^\$2[aby]\$\d+\$/);
          
          // Verify hash length (bcrypt hashes are typically 60 characters)
          expect(storedUser.password.length).toBe(60);
          
          // Verify original password can be validated against hash
          const isValid = await bcrypt.compare(userData.password, storedUser.password);
          expect(isValid).toBe(true);
          
          // Verify wrong password fails validation
          const isInvalid = await bcrypt.compare(userData.password + 'wrong', storedUser.password);
          expect(isInvalid).toBe(false);
          
          // Verify password is not exposed in JSON serialization
          const userJson = storedUser.toJSON();
          expect(userJson.password).toBeUndefined();
        }
      ),
      { numRuns: 5 }
    );
  }, 10000);
});