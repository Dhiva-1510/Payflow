import mongoose from 'mongoose';

const employeeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    unique: true
  },
  baseSalary: {
    type: Number,
    required: [true, 'Base salary is required'],
    min: [0, 'Base salary cannot be negative'],
    validate: {
      validator: function(value) {
        return Number.isFinite(value) && value >= 0;
      },
      message: 'Base salary must be a valid positive number'
    }
  },
  allowance: {
    type: Number,
    default: 0,
    min: [0, 'Allowance cannot be negative'],
    validate: {
      validator: function(value) {
        return Number.isFinite(value) && value >= 0;
      },
      message: 'Allowance must be a valid positive number'
    }
  },
  deduction: {
    type: Number,
    default: 0,
    min: [0, 'Deduction cannot be negative'],
    validate: {
      validator: function(value) {
        return Number.isFinite(value) && value >= 0;
      },
      message: 'Deduction must be a valid positive number'
    }
  }
}, {
  timestamps: true
});

// Virtual for calculating gross salary
employeeSchema.virtual('grossSalary').get(function() {
  return this.baseSalary + this.allowance;
});

// Virtual for calculating net salary
employeeSchema.virtual('netSalary').get(function() {
  return this.grossSalary - this.deduction;
});

// Ensure virtual fields are serialized
employeeSchema.set('toJSON', { virtuals: true });
employeeSchema.set('toObject', { virtuals: true });

const Employee = mongoose.model('Employee', employeeSchema);

export default Employee;