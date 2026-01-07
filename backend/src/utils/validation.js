// Employee data validation utilities

/**
 * Validates employee salary data
 * @param {Object} data - Employee data to validate
 * @param {number} data.baseSalary - Base salary amount
 * @param {number} [data.allowance] - Allowance amount (optional)
 * @param {number} [data.deduction] - Deduction amount (optional)
 * @returns {Object} Validation result with isValid flag and errors array
 */
export const validateEmployeeData = (data) => {
  const errors = [];
  const { baseSalary, allowance, deduction } = data;

  // Validate base salary (required)
  if (baseSalary === undefined || baseSalary === null) {
    errors.push('Base salary is required');
  } else if (typeof baseSalary !== 'number') {
    errors.push('Base salary must be a number');
  } else if (!Number.isFinite(baseSalary)) {
    errors.push('Base salary must be a valid number');
  } else if (baseSalary < 0) {
    errors.push('Base salary cannot be negative');
  }

  // Validate allowance (optional)
  if (allowance !== undefined && allowance !== null) {
    if (typeof allowance !== 'number') {
      errors.push('Allowance must be a number');
    } else if (!Number.isFinite(allowance)) {
      errors.push('Allowance must be a valid number');
    } else if (allowance < 0) {
      errors.push('Allowance cannot be negative');
    }
  }

  // Validate deduction (optional)
  if (deduction !== undefined && deduction !== null) {
    if (typeof deduction !== 'number') {
      errors.push('Deduction must be a number');
    } else if (!Number.isFinite(deduction)) {
      errors.push('Deduction must be a valid number');
    } else if (deduction < 0) {
      errors.push('Deduction cannot be negative');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validates employee update data (all fields optional)
 * @param {Object} data - Employee update data to validate
 * @returns {Object} Validation result with isValid flag and errors array
 */
export const validateEmployeeUpdateData = (data) => {
  const errors = [];
  const { baseSalary, allowance, deduction } = data;

  // Check if at least one field is provided
  if (baseSalary === undefined && allowance === undefined && deduction === undefined) {
    errors.push('At least one field (baseSalary, allowance, deduction) must be provided');
    return { isValid: false, errors };
  }

  // Validate base salary (optional for updates)
  if (baseSalary !== undefined && baseSalary !== null) {
    if (typeof baseSalary !== 'number') {
      errors.push('Base salary must be a number');
    } else if (!Number.isFinite(baseSalary)) {
      errors.push('Base salary must be a valid number');
    } else if (baseSalary < 0) {
      errors.push('Base salary cannot be negative');
    }
  }

  // Validate allowance (optional)
  if (allowance !== undefined && allowance !== null) {
    if (typeof allowance !== 'number') {
      errors.push('Allowance must be a number');
    } else if (!Number.isFinite(allowance)) {
      errors.push('Allowance must be a valid number');
    } else if (allowance < 0) {
      errors.push('Allowance cannot be negative');
    }
  }

  // Validate deduction (optional)
  if (deduction !== undefined && deduction !== null) {
    if (typeof deduction !== 'number') {
      errors.push('Deduction must be a number');
    } else if (!Number.isFinite(deduction)) {
      errors.push('Deduction must be a valid number');
    } else if (deduction < 0) {
      errors.push('Deduction cannot be negative');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validates MongoDB ObjectId format
 * @param {string} id - ID to validate
 * @returns {boolean} True if valid ObjectId format
 */
export const isValidObjectId = (id) => {
  return /^[0-9a-fA-F]{24}$/.test(id);
};