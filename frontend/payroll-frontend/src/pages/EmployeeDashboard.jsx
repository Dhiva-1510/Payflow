import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUser } from '../utils/tokenManager';
import api from '../services/api';
import { getErrorMessage, isRetryableError, getErrorUIType } from '../utils/errorHandler';
import { ErrorMessage, EmployeeSalaryChart } from '../components';
import { useSettings } from '../context/SettingsContext';

/**
 * EmployeeDashboard Component
 * Main dashboard page for employee users
 * Requirements: 7.3, 7.6, 8.1, 8.3, 8.5
 * 
 * Displays:
 * - Welcome message
 * - Quick access to payslips
 * - Summary information with real data
 * - Error handling with retry
 */
const EmployeeDashboard = () => {
  const user = getUser();
  const navigate = useNavigate();
  const { formatCurrency } = useSettings();
  const [stats, setStats] = useState({
    latestNet: '--',
    totalPayslips: '--',
    lastPaymentDate: '--',
    loading: true
  });
  const [payrollRecords, setPayrollRecords] = useState([]);
  const [error, setError] = useState(null);
  const [errorType, setErrorType] = useState('error');

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setStats(prev => ({ ...prev, loading: true }));
      setError(null);
      
      const response = await api.get('/payroll/my-payroll');
      const payrollRecords = response.data.data?.payrollRecords || [];
      
      if (payrollRecords.length > 0) {
        const latestRecord = payrollRecords[0];
        setStats({
          latestNet: formatCurrency(latestRecord.netSalary),
          totalPayslips: payrollRecords.length,
          lastPaymentDate: formatDate(latestRecord.createdAt),
          loading: false
        });
        setPayrollRecords(payrollRecords);
      } else {
        setStats({
          latestNet: '--',
          totalPayslips: 0,
          lastPaymentDate: '--',
          loading: false
        });
        setPayrollRecords([]);
      }
    } catch (err) {
      console.error('Failed to fetch dashboard stats:', err);
      
      const errorMessage = getErrorMessage(err);
      const uiErrorType = getErrorUIType(err);
      
      setError(errorMessage);
      setErrorType(uiErrorType);
      setStats(prev => ({ ...prev, loading: false }));
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#F8F8F8]">Dashboard</h1>
        <p className="text-sm text-[#F8F8F8]/60 mt-1">Welcome back, {user?.name || 'Employee'}</p>
      </div>

      {/* Error Display */}
      {error && (
        <ErrorMessage
          message={error}
          type={errorType}
          onRetry={fetchDashboardStats}
          className="mb-6 rounded-xl"
        />
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-[#202020] p-5 rounded-xl border border-[#FFFFFF]/[0.08]">
          <div className="text-xs font-medium text-[#F8F8F8]/60">Latest Net Salary</div>
          <div className="mt-2 text-2xl font-bold text-[#5DD62C]">
            {stats.loading ? (
              <div className="animate-pulse bg-[#5DD62C]/10 h-8 w-24 rounded"></div>
            ) : stats.latestNet}
          </div>
        </div>
        <div className="bg-[#202020] p-5 rounded-xl border border-[#FFFFFF]/[0.08]">
          <div className="text-xs font-medium text-[#F8F8F8]/60">Total Payslips</div>
          <div className="mt-2 text-2xl font-bold text-[#F8F8F8]">
            {stats.loading ? (
              <div className="animate-pulse bg-[#F8F8F8]/10 h-8 w-12 rounded"></div>
            ) : stats.totalPayslips}
          </div>
        </div>
        <div className="bg-[#202020] p-5 rounded-xl border border-[#FFFFFF]/[0.08]">
          <div className="text-xs font-medium text-[#F8F8F8]/60">Last Payment Date</div>
          <div className="mt-2 text-2xl font-bold text-[#F8F8F8]">
            {stats.loading ? (
              <div className="animate-pulse bg-[#F8F8F8]/10 h-8 w-28 rounded"></div>
            ) : stats.lastPaymentDate}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-[#202020] rounded-xl border border-[#FFFFFF]/[0.08] p-6">
          <h2 className="text-lg font-semibold text-[#F8F8F8] mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <button 
              onClick={() => navigate('/employee/payslips')}
              className="w-full flex items-center px-4 py-3 text-sm font-medium text-[#F8F8F8] bg-[#5DD62C]/10 hover:bg-[#5DD62C]/20 rounded-xl transition-colors"
            >
              <svg className="w-5 h-5 mr-3 text-[#5DD62C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              View My Payslips
            </button>
          </div>
        </div>

        <div className="bg-[#202020] rounded-xl border border-[#FFFFFF]/[0.08] p-6">
          <h2 className="text-lg font-semibold text-[#F8F8F8] mb-4">Account Information</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#F8F8F8]/60">Name</span>
              <span className="text-[#F8F8F8]">{user?.name || '--'}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#F8F8F8]/60">Email</span>
              <span className="text-[#F8F8F8]">{user?.email || '--'}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#F8F8F8]/60">Role</span>
              <span className="px-3 py-1 text-xs font-medium bg-[#5DD62C]/10 text-[#5DD62C] rounded-lg capitalize">
                {user?.role || 'employee'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Salary History Chart */}
      <div className="bg-[#202020] rounded-xl border border-[#FFFFFF]/[0.08] p-6">
        <h2 className="text-lg font-semibold text-[#F8F8F8] mb-6">Salary History</h2>
        <EmployeeSalaryChart payrollData={payrollRecords} />
      </div>
    </div>
  );
};

export default EmployeeDashboard;
