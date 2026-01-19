// Debug script to check payroll data
// Run this with: node debug-payroll.js from the backend directory

import mongoose from 'mongoose';
import Payroll from './src/models/Payroll.js';
import Employee from './src/models/Employee.js';
import dotenv from 'dotenv';

dotenv.config();

async function debugPayrollData() {
  try {
    // Connect to database
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/payrolldb';
    await mongoose.connect(mongoUri);
    console.log('Connected to database');

    // Get current month/year
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    
    console.log(`\n=== DEBUGGING PAYROLL DATA ===`);
    console.log(`Current Date: ${now.toDateString()}`);
    console.log(`Looking for payroll data for: ${currentMonth}/${currentYear}`);

    // Check total employees
    const totalEmployees = await Employee.countDocuments();
    console.log(`\nTotal Employees in Database: ${totalEmployees}`);

    // Check all payroll records
    const allPayrolls = await Payroll.find({}).sort({ year: -1, month: -1 });
    console.log(`\nTotal Payroll Records: ${allPayrolls.length}`);
    
    if (allPayrolls.length > 0) {
      console.log('\nRecent Payroll Records:');
      allPayrolls.slice(0, 10).forEach((payroll, index) => {
        console.log(`${index + 1}. Month: ${payroll.month}/${payroll.year}, Net Salary: ₹${payroll.netSalary}, Employee ID: ${payroll.employeeId}`);
      });
    }

    // Check payroll for current month
    const currentMonthPayrolls = await Payroll.find({
      month: currentMonth,
      year: currentYear
    });
    
    console.log(`\nPayroll Records for ${currentMonth}/${currentYear}: ${currentMonthPayrolls.length}`);
    
    if (currentMonthPayrolls.length > 0) {
      const total = currentMonthPayrolls.reduce((sum, payroll) => sum + payroll.netSalary, 0);
      console.log(`Total Amount for ${currentMonth}/${currentYear}: ₹${total}`);
      
      currentMonthPayrolls.forEach((payroll, index) => {
        console.log(`  ${index + 1}. Net Salary: ₹${payroll.netSalary}, Employee ID: ${payroll.employeeId}`);
      });
    } else {
      console.log(`No payroll records found for ${currentMonth}/${currentYear}`);
      
      // Show available months
      const availableMonths = await Payroll.aggregate([
        {
          $group: {
            _id: { month: '$month', year: '$year' },
            count: { $sum: 1 },
            total: { $sum: '$netSalary' }
          }
        },
        { $sort: { '_id.year': -1, '_id.month': -1 } }
      ]);
      
      console.log('\nAvailable Payroll Months:');
      availableMonths.forEach(item => {
        console.log(`  ${item._id.month}/${item._id.year}: ${item.count} records, Total: ₹${item.total}`);
      });
    }

    // Test the dashboard service calculation
    console.log('\n=== TESTING DASHBOARD SERVICE ===');
    
    // Import and test the service
    const DashboardService = (await import('./src/services/dashboardService.js')).default;
    
    try {
      const payrollTotal = await DashboardService.getPayrollTotal(currentMonth, currentYear);
      console.log('Dashboard Service Result:', payrollTotal);
    } catch (error) {
      console.log('Dashboard Service Error:', error.message);
    }

  } catch (error) {
    console.error('Debug Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
  }
}

debugPayrollData();