import { useState } from 'react';
import PayrollRunner from '../components/PayrollRunner';
import PayrollHistory from '../components/PayrollHistory';
import Notification from '../components/Notification';

/**
 * PayrollManagement Page
 * Main page for managing payroll (admin only)
 * Requirements: 7.2, 8.1, 8.3
 * 
 * Features:
 * - Run payroll for all employees
 * - View payroll history for all employees
 * - Tab-based navigation between runner and history
 * - Success feedback notifications
 */
const PayrollManagement = () => {
  const [activeTab, setActiveTab] = useState('run'); // 'run' | 'history'
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [notification, setNotification] = useState(null);

  const handlePayrollComplete = () => {
    // Trigger refresh of payroll history
    setRefreshTrigger(prev => prev + 1);
    // Show success notification
    setNotification({
      type: 'success',
      message: 'Payroll processed successfully!'
    });
  };

  const clearNotification = () => {
    setNotification(null);
  };

  return (
    <div>
      {/* Notification */}
      {notification && (
        <Notification
          type={notification.type}
          message={notification.message}
          onClose={clearNotification}
        />
      )}

      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#F8F8F8]">Payroll Management</h1>
        <p className="text-sm text-[#F8F8F8]/60 mt-1">
          Process payroll and view payment history
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="flex space-x-1 bg-[#202020] p-1 rounded-xl border border-[#FFFFFF]/[0.08] w-fit">
          <button
            onClick={() => setActiveTab('run')}
            className={`px-6 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === 'run'
                ? 'bg-[#5DD62C] text-[#0F0F0F]'
                : 'text-[#F8F8F8]/60 hover:text-[#F8F8F8] hover:bg-[#0F0F0F]/50'
            }`}
          >
            <div className="flex items-center">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Run Payroll
            </div>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-6 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === 'history'
                ? 'bg-[#5DD62C] text-[#0F0F0F]'
                : 'text-[#F8F8F8]/60 hover:text-[#F8F8F8] hover:bg-[#0F0F0F]/50'
            }`}
          >
            <div className="flex items-center">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Payroll History
            </div>
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'run' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PayrollRunner onPayrollComplete={handlePayrollComplete} />
          
          {/* Quick Info Card */}
          <div className="bg-[#202020] rounded-xl border border-[#FFFFFF]/[0.08] p-6">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0 w-10 h-10 bg-[#5DD62C]/10 rounded-xl flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-[#5DD62C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[#F8F8F8]">How Payroll Works</h3>
                <p className="text-sm text-[#F8F8F8]/60">Quick guide to running payroll</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="flex-shrink-0 w-6 h-6 bg-[#5DD62C]/10 rounded-full flex items-center justify-center mr-3 mt-0.5">
                  <span className="text-xs font-medium text-[#5DD62C]">1</span>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-[#F8F8F8]">Select Period</h4>
                  <p className="text-xs text-[#F8F8F8]/60">Choose the month and year for payroll processing</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="flex-shrink-0 w-6 h-6 bg-[#5DD62C]/10 rounded-full flex items-center justify-center mr-3 mt-0.5">
                  <span className="text-xs font-medium text-[#5DD62C]">2</span>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-[#F8F8F8]">Run Payroll</h4>
                  <p className="text-xs text-[#F8F8F8]/60">Click the button to process payroll for all employees</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="flex-shrink-0 w-6 h-6 bg-[#5DD62C]/10 rounded-full flex items-center justify-center mr-3 mt-0.5">
                  <span className="text-xs font-medium text-[#5DD62C]">3</span>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-[#F8F8F8]">Review Results</h4>
                  <p className="text-xs text-[#F8F8F8]/60">Check the processing summary and individual results</p>
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-[#0F0F0F] rounded-lg border border-[#FFFFFF]/[0.08]">
              <h4 className="text-sm font-medium text-[#F8F8F8] mb-2">Salary Calculation</h4>
              <div className="space-y-1 text-xs text-[#F8F8F8]/60">
                <p><span className="text-[#F8F8F8]">Gross Salary</span> = Base Salary + Allowance</p>
                <p><span className="text-[#F8F8F8]">Net Salary</span> = Gross Salary - Deduction</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <PayrollHistory refreshTrigger={refreshTrigger} />
      )}
    </div>
  );
};

export default PayrollManagement;
