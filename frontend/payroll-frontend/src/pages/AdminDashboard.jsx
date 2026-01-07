import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUser } from '../utils/tokenManager';
import api from '../services/api';
import { getErrorMessage, isRetryableError, getErrorUIType } from '../utils/errorHandler';
import { ErrorMessage, PayrollChart } from '../components';
import { useSettings } from '../context/SettingsContext';

/**
 * AdminDashboard Component
 * Main dashboard page for admin users
 * Requirements: 7.2, 7.6, 8.1, 8.3, 8.5
 * 
 * Displays:
 * - Welcome message
 * - Stats cards with real data
 * - Quick actions
 * - Error handling with retry
 */
const AdminDashboard = () => {
  const user = getUser();
  const navigate = useNavigate();
  const { formatCurrency } = useSettings();
  const [stats, setStats] = useState({
    totalEmployees: '--',
    monthlyPayroll: '--',
    pendingApprovals: '--',
    lastPayrollRun: '--',
    loading: true
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [showReports, setShowReports] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [loadingReports, setLoadingReports] = useState(false);
  const [error, setError] = useState(null);
  const [errorType, setErrorType] = useState('error');
  const [canRetry, setCanRetry] = useState(false);

  useEffect(() => {
    fetchDashboardStats();
    fetchReportData();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setStats(prev => ({ ...prev, loading: true }));
      setError(null);
      
      // Fetch dashboard statistics from the new endpoint
      const response = await api.get('/dashboard/stats');
      const data = response.data.data;
      
      setStats({
        totalEmployees: data.totalEmployees,
        monthlyPayroll: formatCurrency(data.monthlyPayroll),
        pendingApprovals: data.pendingApprovals,
        lastPayrollRun: data.lastPayrollRun ? 
          `${data.lastPayrollRun.month}/${data.lastPayrollRun.year}` : 
          'Never',
        loading: false
      });

      // Set recent activity
      setRecentActivity(data.recentActivity || []);
      
    } catch (err) {
      console.error('Failed to fetch dashboard stats:', err);
      
      const errorMessage = getErrorMessage(err);
      const uiErrorType = getErrorUIType(err);
      const retryable = isRetryableError(err);
      
      setError(errorMessage);
      setErrorType(uiErrorType);
      setCanRetry(retryable);
      setStats(prev => ({ ...prev, loading: false }));
    }
  };

  const handleViewReports = async () => {
    try {
      setLoadingReports(true);
      setShowReports(true);
      
      // Use existing report data if available, otherwise fetch it
      if (!reportData) {
        await fetchReportData();
      }
    } catch (err) {
      console.error('Failed to fetch reports:', err);
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
    } finally {
      setLoadingReports(false);
    }
  };

  const fetchReportData = async () => {
    try {
      // Fetch monthly report for current year
      const currentYear = new Date().getFullYear();
      const response = await api.get(`/dashboard/reports?type=monthly&year=${currentYear}`);
      setReportData(response.data.data);
    } catch (err) {
      console.error('Failed to fetch report data:', err);
      // Don't set error here as it's called from useEffect
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#F8F8F8]">Dashboard</h1>
        <p className="text-sm text-[#F8F8F8]/60 mt-1">Welcome back, {user?.name || 'Admin'}</p>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="card-elevated p-5">
          <div className="text-xs font-medium text-[#F8F8F8]/60">Total Employees</div>
          <div className="mt-2 text-2xl font-bold text-[#F8F8F8]">
            {stats.loading ? (
              <div className="loading-skeleton h-8 w-16 rounded"></div>
            ) : stats.totalEmployees}
          </div>
        </div>
        <div className="card-elevated p-5">
          <div className="text-xs font-medium text-[#F8F8F8]/60">Monthly Payroll</div>
          <div className="mt-2 text-2xl font-bold text-[#5DD62C]">
            {stats.loading ? (
              <div className="loading-skeleton h-8 w-24 rounded"></div>
            ) : stats.monthlyPayroll}
          </div>
        </div>
        <div className="card-elevated p-5">
          <div className="text-xs font-medium text-[#F8F8F8]/60">Pending Approvals</div>
          <div className="mt-2 text-2xl font-bold text-[#F8F8F8]">
            {stats.loading ? (
              <div className="loading-skeleton h-8 w-16 rounded"></div>
            ) : stats.pendingApprovals}
          </div>
        </div>
        <div className="card-elevated p-5">
          <div className="text-xs font-medium text-[#F8F8F8]/60">Last Payroll Run</div>
          <div className="mt-2 text-2xl font-bold text-[#F8F8F8]">
            {stats.loading ? (
              <div className="loading-skeleton h-8 w-20 rounded"></div>
            ) : stats.lastPayrollRun}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="card-elevated p-6">
          <h2 className="text-lg font-semibold text-[#F8F8F8] mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <button 
              onClick={() => navigate('/admin/employees')}
              className="btn-secondary w-full justify-start"
            >
              <svg className="w-5 h-5 mr-3 text-[#5DD62C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              Add New Employee
            </button>
            <button 
              onClick={() => navigate('/admin/payroll')}
              className="btn-secondary w-full justify-start"
            >
              <svg className="w-5 h-5 mr-3 text-[#5DD62C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              Run Payroll
            </button>
            <button 
              onClick={handleViewReports}
              className="btn-secondary w-full justify-start"
            >
              <svg className="w-5 h-5 mr-3 text-[#5DD62C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              View Reports
            </button>
          </div>
        </div>

        <div className="card-elevated p-6">
          <h2 className="text-lg font-semibold text-[#F8F8F8] mb-4">Recent Activity</h2>
          <div className="space-y-4">
            {recentActivity.length > 0 ? (
              recentActivity.map((activity, index) => (
                <div key={activity.id || index} className="flex items-center text-sm">
                  <div className="status-online mr-3"></div>
                  <div className="flex-1">
                    <div className="text-[#F8F8F8]">{activity.description}</div>
                    <div className="text-[#F8F8F8]/60 text-xs">
                      {formatCurrency(activity.amount)} • {activity.month}/{activity.year} • {new Date(activity.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex items-center text-sm">
                <div className="status-offline mr-3"></div>
                <span className="text-[#F8F8F8]/60">No recent activity</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Payroll Trends Chart */}
      <div className="card-elevated p-6">
        <h2 className="text-lg font-semibold text-[#F8F8F8] mb-6">Monthly Payroll Trends</h2>
        <PayrollChart reportData={reportData} />
      </div>

      {/* Reports Modal */}
      {showReports && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#202020] rounded-xl border border-[#FFFFFF]/[0.08] p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-[#F8F8F8]">Monthly Payroll Report</h2>
              <button
                onClick={() => setShowReports(false)}
                className="text-[#F8F8F8]/60 hover:text-[#F8F8F8] transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {loadingReports ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#5DD62C]"></div>
                <span className="ml-3 text-[#F8F8F8]/60">Loading reports...</span>
              </div>
            ) : reportData ? (
              <div>
                <div className="mb-4">
                  <h3 className="text-lg font-medium text-[#F8F8F8] mb-2">
                    Year {reportData.year} Summary
                  </h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {reportData.data.map((monthData) => (
                    <div key={monthData.month} className="bg-[#0F0F0F] rounded-lg border border-[#FFFFFF]/[0.08] p-4">
                      <div className="text-sm font-medium text-[#F8F8F8] mb-2">
                        {monthData.monthName}
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-[#F8F8F8]/60">Total Amount:</span>
                          <span className="text-[#5DD62C] font-medium">
                            {formatCurrency(monthData.totalAmount)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-[#F8F8F8]/60">Employees:</span>
                          <span className="text-[#F8F8F8]">{monthData.employeeCount}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-[#F8F8F8]/60">Average:</span>
                          <span className="text-[#F8F8F8]">
                            {formatCurrency(monthData.averageSalary)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-[#F8F8F8]/60">No report data available</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
