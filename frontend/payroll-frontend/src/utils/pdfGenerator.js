/**
 * PDF Generator Utility
 * Generates PDF documents for payslips using client-side rendering
 */

/**
 * Generate PDF from payslip data
 * @param {Object} payslip - Payslip data object
 * @param {Function} formatCurrency - Currency formatting function
 * @returns {Promise} - Promise that resolves when PDF is generated
 */
export const generatePayslipPDF = async (payslip, formatCurrency) => {
  try {
    // Create a temporary container for PDF content
    const pdfContainer = document.createElement('div');
    pdfContainer.style.position = 'absolute';
    pdfContainer.style.left = '-9999px';
    pdfContainer.style.top = '-9999px';
    pdfContainer.style.width = '210mm'; // A4 width
    pdfContainer.style.backgroundColor = 'white';
    pdfContainer.style.color = 'black';
    pdfContainer.style.fontFamily = 'Arial, sans-serif';
    pdfContainer.style.padding = '20mm';
    
    // Get month name
    const getMonthName = (month) => {
      const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      return months[month - 1] || '';
    };

    // Format date
    const formatDate = (dateString) => {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    };

    // Create PDF content
    pdfContainer.innerHTML = `
      <div style="max-width: 170mm; margin: 0 auto; font-size: 14px; line-height: 1.5;">
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #5DD62C; padding-bottom: 20px;">
          <h1 style="color: #5DD62C; font-size: 28px; margin: 0; font-weight: bold;">PayFlow</h1>
          <p style="color: #666; margin: 5px 0 0 0; font-size: 16px;">Employee Payroll System</p>
        </div>

        <!-- Payslip Title -->
        <div style="text-align: center; margin-bottom: 30px;">
          <h2 style="color: #333; font-size: 24px; margin: 0; font-weight: bold;">PAYSLIP</h2>
          <p style="color: #666; margin: 10px 0 0 0; font-size: 18px;">
            ${getMonthName(payslip.month)} ${payslip.year}
          </p>
        </div>

        <!-- Employee Info -->
        <div style="margin-bottom: 30px; background-color: #f8f9fa; padding: 15px; border-radius: 8px;">
          <h3 style="color: #333; font-size: 16px; margin: 0 0 10px 0; font-weight: bold;">Employee Information</h3>
          <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
            <span style="color: #666;">Employee ID:</span>
            <span style="color: #333; font-weight: 500;">${payslip.employeeId || payslip._id?.slice(-8) || 'N/A'}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
            <span style="color: #666;">Pay Period:</span>
            <span style="color: #333; font-weight: 500;">${getMonthName(payslip.month)} ${payslip.year}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #666;">Generated On:</span>
            <span style="color: #333; font-weight: 500;">${formatDate(payslip.createdAt)}</span>
          </div>
        </div>

        <!-- Earnings Section -->
        <div style="margin-bottom: 20px;">
          <h3 style="color: #333; font-size: 16px; margin: 0 0 15px 0; font-weight: bold; 
                     border-bottom: 1px solid #ddd; padding-bottom: 5px;">EARNINGS</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr style="background-color: #f8f9fa;">
              <td style="padding: 10px; border: 1px solid #ddd; font-weight: 500;">Description</td>
              <td style="padding: 10px; border: 1px solid #ddd; text-align: right; font-weight: 500;">Amount</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;">Base Salary</td>
              <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">${formatCurrency(payslip.baseSalary)}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;">Allowance</td>
              <td style="padding: 10px; border: 1px solid #ddd; text-align: right; color: #28a745;">+${formatCurrency(payslip.allowance)}</td>
            </tr>
            <tr style="background-color: #f8f9fa; font-weight: bold;">
              <td style="padding: 10px; border: 1px solid #ddd;">Gross Salary</td>
              <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">${formatCurrency(payslip.grossSalary)}</td>
            </tr>
          </table>
        </div>

        <!-- Deductions Section -->
        <div style="margin-bottom: 20px;">
          <h3 style="color: #333; font-size: 16px; margin: 0 0 15px 0; font-weight: bold; 
                     border-bottom: 1px solid #ddd; padding-bottom: 5px;">DEDUCTIONS</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr style="background-color: #f8f9fa;">
              <td style="padding: 10px; border: 1px solid #ddd; font-weight: 500;">Description</td>
              <td style="padding: 10px; border: 1px solid #ddd; text-align: right; font-weight: 500;">Amount</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;">Total Deductions</td>
              <td style="padding: 10px; border: 1px solid #ddd; text-align: right; color: #dc3545;">-${formatCurrency(payslip.deduction)}</td>
            </tr>
          </table>
        </div>

        <!-- Net Salary -->
        <div style="margin-bottom: 30px; background-color: #e8f5e8; padding: 20px; border-radius: 8px; border: 2px solid #5DD62C;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <h3 style="color: #333; font-size: 18px; margin: 0; font-weight: bold;">NET SALARY</h3>
              <p style="color: #666; margin: 5px 0 0 0; font-size: 14px;">Amount Payable</p>
            </div>
            <div style="text-align: right;">
              <span style="color: #5DD62C; font-size: 24px; font-weight: bold;">${formatCurrency(payslip.netSalary)}</span>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center;">
          <p style="color: #666; margin: 0; font-size: 12px;">
            This is a computer-generated payslip and does not require a signature.
          </p>
          <p style="color: #666; margin: 5px 0 0 0; font-size: 12px;">
            Generated by PayFlow Employee Payroll System
          </p>
        </div>
      </div>
    `;

    // Add to document temporarily
    document.body.appendChild(pdfContainer);

    // Use modern browser printing API
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Payslip - ${getMonthName(payslip.month)} ${payslip.year}</title>
          <style>
            @media print {
              body { margin: 0; }
              @page { margin: 0.5in; }
            }
            body { 
              font-family: Arial, sans-serif; 
              margin: 0; 
              padding: 20px;
              background: white;
              color: black;
            }
          </style>
        </head>
        <body>
          ${pdfContainer.innerHTML}
        </body>
      </html>
    `);
    
    printWindow.document.close();
    
    // Clean up
    document.body.removeChild(pdfContainer);
    
    // Focus and print
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);

    return Promise.resolve();
    
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('Failed to generate PDF. Please try again.');
  }
};

/**
 * Alternative method using canvas-based PDF generation
 * This can be used if a more sophisticated PDF is needed
 */
export const generateAdvancedPayslipPDF = async (payslip, formatCurrency) => {
  // This would require jsPDF and html2canvas libraries
  // For now, we'll use the simpler print-based approach above
  return generatePayslipPDF(payslip, formatCurrency);
};