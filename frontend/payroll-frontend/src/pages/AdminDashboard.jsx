import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUser } from '../utils/tokenManager';
import api from '../services/api';
import { getErrorMessage, isRetryableError, getErrorUIType } from '../utils/errorHandler';
import { 
  ErrorMessage, 
  PayrollChart, 
  MetricsGrid, 
  PayrollCard, 
  EmployeeCard, 
  PendingCard,
  YearSelector 
} from '../components';
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
  const [dashboardMetrics, setDashboardMetrics] = useState({
    payrollTotal: null,
    employeesPaid: null,
    pendingApprovals: null,
    lastUpdated: null
  });
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [metricsError, setMetricsError] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [showReports, setShowReports] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [availableYears, setAvailableYears] = useState([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [error, setError] = useState(null);
  const [errorType, setErrorType] = useState('error');
  const [canRetry, setCanRetry] = useState(false);

  useEffect(() => {
    fetchDashboardStats();
    fetchDashboardMetrics();
    fetchReportData();
    
    // Initialize available years (from 2000 to current year)
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let year = currentYear; year >= 2000; year--) {
      years.push(year);
    }
    setAvailableYears(years);
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

  const fetchDashboardMetrics = async () => {
    try {
      setMetricsLoading(true);
      setMetricsError(null);
      
      // Fetch enhanced dashboard metrics
      const response = await api.get('/dashboard/metrics');
      const data = response.data.data;
      
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth() + 1;
      const currentYear = currentDate.getFullYear();
      
      setDashboardMetrics({
        payrollTotal: data.payrollTotal || { 
          amount: 0, 
          employeeCount: 0, 
          month: currentMonth, 
          year: currentYear 
        },
        employeesPaid: data.employeesPaid || { 
          count: 0, 
          totalEmployees: 0, 
          month: currentMonth, 
          year: currentYear 
        },
        pendingApprovals: data.pendingApprovals || { 
          count: 0, 
          types: [] 
        },
        lastUpdated: data.lastUpdated || new Date().toISOString()
      });
      
    } catch (err) {
      console.error('Failed to fetch dashboard metrics:', err);
      setMetricsError(getErrorMessage(err));
    } finally {
      setMetricsLoading(false);
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

  const handleYearChange = async (year) => {
    setSelectedYear(year);
    await fetchReportData(year);
  };

  const handleMetricsRetry = async () => {
    await fetchDashboardMetrics();
  };

  const handlePendingClick = () => {
    navigate('/admin/payroll');
  };

  const fetchReportData = async (year = null) => {
    try {
      setLoadingReports(true);
      // Use provided year or selected year
      const targetYear = year || selectedYear;
      const response = await api.get(`/dashboard/reports?type=monthly&year=${targetYear}`);
      setReportData(response.data.data);
      
      // Update available years if this is a new year (avoid duplicates)
      setAvailableYears(prev => {
        const uniqueYears = [...new Set([...prev, targetYear])];
        return uniqueYears.sort((a, b) => b - a);
      });
    } catch (err) {
      console.error('Failed to fetch report data:', err);
      // Don't set error here as it's called from useEffect
    } finally {
      setLoadingReports(false);
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

      {/* Enhanced Dashboard Metrics Grid */}
      <MetricsGrid 
        loading={metricsLoading}
        error={metricsError ? { message: metricsError } : null}
        onRetry={handleMetricsRetry}
        className="mb-8"
      >
        <PayrollCard
          amount={dashboardMetrics.payrollTotal?.amount || 0}
          employeeCount={dashboardMetrics.payrollTotal?.employeeCount || 0}
          month={dashboardMetrics.payrollTotal?.month || new Date().getMonth() + 1}
          year={dashboardMetrics.payrollTotal?.year || new Date().getFullYear()}
          loading={metricsLoading}
          error={metricsError ? { message: metricsError } : null}
        />
        
        <EmployeeCard
          employeesPaid={dashboardMetrics.employeesPaid?.count || 0}
          totalEmployees={dashboardMetrics.employeesPaid?.totalEmployees || 0}
          month={dashboardMetrics.employeesPaid?.month || new Date().getMonth() + 1}
          year={dashboardMetrics.employeesPaid?.year || new Date().getFullYear()}
          loading={metricsLoading}
          error={metricsError ? { message: metricsError } : null}
        />
        
        <PendingCard
          pendingCount={dashboardMetrics.pendingApprovals?.count || 0}
          approvalTypes={dashboardMetrics.pendingApprovals?.types || []}
          loading={metricsLoading}
          error={metricsError ? { message: metricsError } : null}
          onClick={handlePendingClick}
        />
      </MetricsGrid>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="card-elevated p-6">
          <h2 className="text-lg font-semibold text-[#F8F8F8] mb-4">Quick Actions</h2>
          <div className="space-y-4">
            <button 
              onClick={() => navigate('/admin/employees')}
              className="btn-secondary w-full flex items-center justify-start py-4 text-base"
            >
              <svg className="w-6 h-6 mr-3 text-[#5DD62C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              Add New Employee
            </button>
            <button 
              onClick={() => navigate('/admin/payroll')}
              className="btn-secondary w-full flex items-center justify-start py-4 text-base"
            >
              <svg className="w-6 h-6 mr-3 text-[#5DD62C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              Run Payroll
            </button>
            <button 
              onClick={handleViewReports}
              className="btn-secondary w-full flex items-center justify-start py-4 text-base"
            >
              <svg className="w-6 h-6 mr-3 text-[#5DD62C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-[#F8F8F8]">Monthly Payroll Trends</h2>
          <div className="flex items-center space-x-3">
            <span className="text-sm text-[#F8F8F8]/60">Year:</span>
            <YearSelector
              selectedYear={selectedYear}
              onYearChange={handleYearChange}
              availableYears={availableYears}
              loading={loadingReports}
              className="w-28"
            />
          </div>
        </div>
        <PayrollChart reportData={reportData} selectedYear={selectedYear} />
      </div>

      {/* Reports Modal */}
      {showReports && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#202020] rounded-xl border border-[#FFFFFF]/[0.08] p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-[#F8F8F8]">Monthly Payroll Report</h2>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-[#F8F8F8]/60">Year:</span>
                  <YearSelector
                    selectedYear={selectedYear}
                    onYearChange={handleYearChange}
                    availableYears={availableYears}
                    loading={loadingReports}
                    className="w-28"
                  />
                </div>
                <button
                  onClick={() => setShowReports(false)}
                  className="text-[#F8F8F8]/60 hover:text-[#F8F8F8] transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
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
