import mongoose from 'mongoose';

const payrollSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: [true, 'Employee ID is required']
  },
  month: {
    type: Number,
    required: [true, 'Month is required'],
    min: [1, 'Month must be between 1 and 12'],
    max: [12, 'Month must be between 1 and 12']
  },
  year: {
    type: Number,
    required: [true, 'Year is required'],
    min: [2020, 'Year must be 2020 or later'],
    max: [new Date().getFullYear() + 1, 'Year cannot be more than next year']
  },
  baseSalary: {
    type: Number,
    required: [true, 'Base salary is required'],
    min: [0, 'Base salary cannot be negative']
  },
  allowance: {
    type: Number,
    required: [true, 'Allowance is required'],
    min: [0, 'Allowance cannot be negative']
  },
  deduction: {
    type: Number,
    required: [true, 'Deduction is required'],
    min: [0, 'Deduction cannot be negative']
  },
  grossSalary: {
    type: Number,
    required: [true, 'Gross salary is required'],
    min: [0, 'Gross salary cannot be negative']
  },
  netSalary: {
    type: Number,
    required: [true, 'Net salary is required'],
    validate: {
      validator: function(value) {
        return Number.isFinite(value);
      },
      message: 'Net salary must be a valid number'
    }
  }
}, {
  timestamps: true
});

// Method to calculate salaries (can be called manually)
payrollSchema.methods.calculateSalaries = function() {
  this.grossSalary = this.baseSalary + this.allowance;
  this.netSalary = this.grossSalary - this.deduction;
  return this;
};

// Static method to find payroll by employee and date range
payrollSchema.statics.findByEmployeeAndDateRange = function(employeeId, startYear, startMonth, endYear, endMonth) {
  return this.find({
    employeeId,
    $or: [
      { year: { $gt: startYear } },
      { year: startYear, month: { $gte: startMonth } }
    ],
    $and: [
      {
        $or: [
          { year: { $lt: endYear } },
          { year: endYear, month: { $lte: endMonth } }
        ]
      }
    ]
  }).sort({ year: -1, month: -1 });
};

const Payroll = mongoose.model('Payroll', payrollSchema);

export default Payroll;