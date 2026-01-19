// Script to add sample payroll data for different years
// Run this with: node add-sample-data.js

import mongoose from 'mongoose';
import Payroll from './src/models/Payroll.js';
import Employee from './src/models/Employee.js';
import dotenv from 'dotenv';

dotenv.config();

async function addSampleData() {
  try {
    // Connect to database
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/payrolldb';
    await mongoose.connect(mongoUri);
    console.log('Connected to database');

    // Get existing employee
    const employee = await Employee.findOne();
    if (!employee) {
      console.log('No employee found. Please create an employee first.');
      return;
    }

    console.log(`Found employee: ${employee._id}`);

    // Sample data for different years and months
    const sampleData = [
      // 2025 data
      { year: 2025, month: 12, netSalary: 15000 },
      { year: 2025, month: 11, netSalary: 14500 },
      { year: 2025, month: 10, netSalary: 14000 },
      { year: 2025, month: 9, netSalary: 13500 },
      { year: 2025, month: 8, netSalary: 13000 },
      
      // 2024 data
      { year: 2024, month: 12, netSalary: 12500 },
      { year: 2024, month: 11, netSalary: 12000 },
      { year: 2024, month: 10, netSalary: 11500 },
      { year: 2024, month: 9, netSalary: 11000 },
      { year: 2024, month: 8, netSalary: 10500 },
      { year: 2024, month: 7, netSalary: 10000 },
      
      // 2023 data
      { year: 2023, month: 12, netSalary: 9500 },
      { year: 2023, month: 11, netSalary: 9000 },
      { year: 2023, month: 10, netSalary: 8500 },
      { year: 2023, month: 9, netSalary: 8000 },
    ];

    console.log('Adding sample payroll data...');

    for (const data of sampleData) {
      // Check if record already exists
      const existing = await Payroll.findOne({
        employeeId: employee._id,
        month: data.month,
        year: data.year
      });

      if (!existing) {
        await Payroll.create({
          employeeId: employee._id,
          month: data.month,
          year: data.year,
          baseSalary: data.netSalary * 0.8, // Assume base salary is 80% of net
          allowance: data.netSalary * 0.3,  // Allowance is 30% of net
          deduction: data.netSalary * 0.1,  // Deduction is 10% of net
          grossSalary: data.netSalary * 1.1, // Gross is 110% of net
          netSalary: data.netSalary
        });
        console.log(`✓ Added payroll for ${data.month}/${data.year}: ₹${data.netSalary}`);
      } else {
        console.log(`- Skipped ${data.month}/${data.year} (already exists)`);
      }
    }

    console.log('\nSample data added successfully!');
    console.log('You can now use the year selector to view data from different years.');

  } catch (error) {
    console.error('Error adding sample data:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

addSampleData();