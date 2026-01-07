import { User, Employee, Payroll } from '../models/index.js';

/**
 * Create database indexes for optimal performance
 * This function ensures all required indexes are created
 */
const createIndexes = async () => {
  try {
    console.log('Creating database indexes...');

    // User indexes
    await User.collection.createIndex({ email: 1 }, { unique: true });
    console.log('✓ User email index created');

    // Employee indexes  
    await Employee.collection.createIndex({ userId: 1 }, { unique: true });
    console.log('✓ Employee userId index created');

    // Payroll indexes
    // Compound index for efficient payroll queries (employeeId, year desc, month desc)
    await Payroll.collection.createIndex({ employeeId: 1, year: -1, month: -1 });
    console.log('✓ Payroll compound index (employeeId, year, month) created');

    // Unique compound index to prevent duplicate payroll records
    await Payroll.collection.createIndex(
      { employeeId: 1, month: 1, year: 1 }, 
      { unique: true }
    );
    console.log('✓ Payroll unique constraint index created');

    console.log('All database indexes created successfully');
  } catch (error) {
    console.error('Error creating indexes:', error.message);
    
    // Don't exit process, just log the error
    // Indexes might already exist, which is fine
    if (error.code === 11000 || error.codeName === 'IndexOptionsConflict') {
      console.log('Indexes already exist, skipping creation');
    }
  }
};

/**
 * Drop all custom indexes (useful for testing or migration)
 */
const dropIndexes = async () => {
  try {
    console.log('Dropping custom indexes...');

    // Drop User indexes (except _id)
    await User.collection.dropIndex({ email: 1 });
    
    // Drop Employee indexes (except _id)
    await Employee.collection.dropIndex({ userId: 1 });
    
    // Drop Payroll indexes (except _id)
    await Payroll.collection.dropIndex({ employeeId: 1, year: -1, month: -1 });
    await Payroll.collection.dropIndex({ employeeId: 1, month: 1, year: 1 });

    console.log('Custom indexes dropped successfully');
  } catch (error) {
    console.error('Error dropping indexes:', error.message);
  }
};

/**
 * List all indexes for each collection
 */
const listIndexes = async () => {
  try {
    console.log('\n=== Database Indexes ===');
    
    const userIndexes = await User.collection.listIndexes().toArray();
    console.log('User indexes:', userIndexes.map(idx => idx.name));
    
    const employeeIndexes = await Employee.collection.listIndexes().toArray();
    console.log('Employee indexes:', employeeIndexes.map(idx => idx.name));
    
    const payrollIndexes = await Payroll.collection.listIndexes().toArray();
    console.log('Payroll indexes:', payrollIndexes.map(idx => idx.name));
    
    console.log('========================\n');
  } catch (error) {
    console.error('Error listing indexes:', error.message);
  }
};

export { createIndexes, dropIndexes, listIndexes };