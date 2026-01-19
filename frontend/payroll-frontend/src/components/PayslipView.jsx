import { useState } from 'react';
import { useSettings } from '../context/SettingsContext';
import { generatePayslipPDF } from '../utils/pdfGenerator';

/**
 * PayslipView Component
 * Displays individual payslip details in a modal or card format
 * Requirements: 7.3
 * 
 * Features:
 * - Display all payslip fields: month, year, base salary, allowance, deductions, gross, net
 * - Clean presentation with clear breakdown
 * - Close/dismiss functionality
 */
const PayslipView = ({ payslip, onClose }) => {
  const { formatCurrency } = useSettings();
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  
  if (!payslip) return null;

  const getMonthName = (month) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[month - 1] || '';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleDownloadPDF = async () => {
    try {
      setIsGeneratingPDF(true);
      await generatePayslipPDF(payslip, formatCurrency);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      // You could add a toast notification here
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-[#202020] rounded-xl border border-[#FFFFFF]/[0.08] w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#FFFFFF]/[0.08] flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#F8F8F8]">Payslip Details</h2>
            <p className="text-sm text-[#F8F8F8]/60">
              {getMonthName(payslip.month)} {payslip.year}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[#F8F8F8]/60 hover:text-[#F8F8F8] hover:bg-[#0F0F0F] rounded-lg transition-colors"
            aria-label="Close payslip"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Period Badge */}
          <div className="flex items-center justify-center mb-6">
            <div className="px-4 py-2 bg-[#5DD62C]/10 rounded-lg">
              <span className="text-[#5DD62C] font-medium">
                {getMonthName(payslip.month)} {payslip.year}
              </span>
            </div>
          </div>

          {/* Salary Breakdown */}
          <div className="space-y-4">
            {/* Earnings Section */}
            <div className="bg-[#0F0F0F] rounded-lg p-4">
              <h3 className="text-xs font-medium text-[#F8F8F8]/60 uppercase tracking-wider mb-3">
                Earnings
              </h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#F8F8F8]/80">Base Salary</span>
                  <span className="text-sm font-medium text-[#F8F8F8]">
                    {formatCurrency(payslip.baseSalary)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#F8F8F8]/80">Allowance</span>
                  <span className="text-sm font-medium text-[#5DD62C]">
                    +{formatCurrency(payslip.allowance)}
                  </span>
                </div>
                <div className="pt-2 border-t border-[#FFFFFF]/[0.08] flex items-center justify-between">
                  <span className="text-sm font-medium text-[#F8F8F8]">Gross Salary</span>
                  <span className="text-sm font-semibold text-[#F8F8F8]">
                    {formatCurrency(payslip.grossSalary)}
                  </span>
                </div>
              </div>
            </div>

            {/* Deductions Section */}
            <div className="bg-[#0F0F0F] rounded-lg p-4">
              <h3 className="text-xs font-medium text-[#F8F8F8]/60 uppercase tracking-wider mb-3">
                Deductions
              </h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#F8F8F8]/80">Total Deductions</span>
                  <span className="text-sm font-medium text-red-400">
                    -{formatCurrency(payslip.deduction)}
                  </span>
                </div>
              </div>
            </div>

            {/* Net Salary */}
            <div className="bg-[#5DD62C]/10 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm text-[#F8F8F8]/60">Net Salary</span>
                  <p className="text-xs text-[#F8F8F8]/40 mt-1">Amount payable</p>
                </div>
                <span className="text-2xl font-bold text-[#5DD62C]">
                  {formatCurrency(payslip.netSalary)}
                </span>
              </div>
            </div>
          </div>

          {/* Footer Info */}
          <div className="mt-6 pt-4 border-t border-[#FFFFFF]/[0.08]">
            <div className="flex items-center justify-between text-xs text-[#F8F8F8]/40">
              <span>Generated on {formatDate(payslip.createdAt)}</span>
              <span>ID: {payslip._id?.slice(-8) || 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-[#FFFFFF]/[0.08] flex justify-between">
          <button
            onClick={handleDownloadPDF}
            disabled={isGeneratingPDF}
            className="px-4 py-2 text-sm font-medium text-[#F8F8F8] bg-[#5DD62C]/20 hover:bg-[#5DD62C]/30 border border-[#5DD62C]/50 rounded-lg transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGeneratingPDF ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#5DD62C] mr-2"></div>
                Generating...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download PDF
              </>
            )}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-[#0F0F0F] bg-[#5DD62C] hover:bg-[#5DD62C]/90 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default PayslipView;
