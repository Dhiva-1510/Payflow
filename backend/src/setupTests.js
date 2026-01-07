import dotenv from 'dotenv';

// Load environment variables for testing
dotenv.config();

// Set test environment variables
process.env.JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';
process.env.MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/payrolldb_test';