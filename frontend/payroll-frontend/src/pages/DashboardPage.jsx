import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUser } from '../utils/tokenManager';
import useApi from '../hooks/useApi';
import { getErrorMessage, isRetryableError, getErrorUIType } from '../utils/errorHandler';
import { 
  MetricsGrid, 
  PayrollCard, 
  EmployeeCard, 
  PendingCard, 
  ErrorMessage,
  LoadingSpinner,
  RetryMechanism,
  PageSkeleton
} from '../components';

/**
 * Enhanced DashboardPage Component
 * Main dashboard page with comprehensive metrics, error handling, and retry mechanisms
 * Requirements: 4.1, 4.4, 5.5
 * 
 * Features:
 * - Data fetching with exponential backoff retry mechanisms
 * - Comprehensive error handling with user-friendly messages
 * - Enhanced loading states with skeleton loaders
 * - Real-time data updates with intelligent polling
 * - Responsive design with MetricsGrid layout
 * - Integration with existing dashboard cards
 * - Error boundaries for component failures
 */
const DashboardPage = () => {
  const user = getUser();
  const navigate = useNavigate();
  
  // API hook for dashboard metrics with enhanced retry configuration
  const {
    loading,
    error,
    errorType,
    data: metricsData,
    retry,
    clearError,
    get: fetchMetrics,
    canRetry,
    retryCount,
    isRetrying
  } = useApi({ 
    maxRetries: 5, // Increased for better reliability
    retryDelay: 1000, 
    autoRetry: true 
  });

  // Enhanced state for better error tracking
  const [dashboardData, setDashboardData] = useState({
    payrollTotal: null,
    employeesPaid: null,
    pendingApprovals: null,
    lastUpdated: null
  });

  // Enhanced polling and error state
  const [isPolling, setIsPolling] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('connected'); // connected, disconnected, reconnecting
  const [criticalError, setCriticalError] = useState(null); // For non-retryable errors
  const pollingIntervalRef = useRef(null);
  const mountedRef = useRef(true);
  const retryTimeoutRef = useRef(null);

  // Current month/year for display
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  /**
   * Enhanced fetch dashboard metrics with better error handling
   * Requirements: 4.1 - Data retrieval within 2 seconds, 4.4 - Retry mechanisms
   */
  const loadDashboardMetrics = useCallback(async (showLoading = true) => {
    try {
      clearError();
      setCriticalError(null);
      setConnectionStatus('connected');
      
      const response = await fetchMetrics('/dashboard/metrics', {
        onSuccess: (data) => {
          if (mountedRef.current) {
            setDashboardData({
              payrollTotal: data.payrollTotal || { amount: 0, employeeCount: 0, month: currentMonth, year: currentYear },
              employeesPaid: data.employeesPaid || { count: 0, totalEmployees: 0, month: currentMonth, year: currentYear },
              pendingApprovals: data.pendingApprovals || { count: 0, types: [] },
              lastUpdated: data.lastUpdated || new Date().toISOString()
            });
            setLastRefresh(new Date());
            setConnectionStatus('connected');
          }
        },
        onError: (err, message) => {
          console.error('Failed to fetch dashboard metrics:', err);
          setConnectionStatus('disconnected');
          
          // Check if this is a critical error that shouldn't be retried
          if (!isRetryableError(err)) {
            setCriticalError({
              message,
              type: getErrorUIType(err),
              timestamp: new Date()
            });
          }
        },
        onRetry: (attempt, maxAttempts, delay, err) => {
          console.log(`Retrying dashboard metrics fetch (attempt ${attempt}/${maxAttempts}) after ${delay}ms:`, err.message);
          setConnectionStatus('reconnecting');
        }
      });

      return response;
    } catch (err) {
      setConnectionStatus('disconnected');
      throw err;
    }
  }, [fetchMetrics, clearError, currentMonth, currentYear]);

  /**
   * Manual refresh handler
   * Requirements: 4.4 - Manual refresh capability
   */
  const handleManualRefresh = useCallback(async () => {
    try {
      await loadDashboardMetrics(true);
    } catch (err) {
      // Error is handled by loadDashboardMetrics
    }
  }, [loadDashboardMetrics]);

  /**
   * Enhanced retry handler with exponential backoff
   * Requirements: 4.4 - Retry mechanisms for failed requests
   */
  const handleRetry = useCallback(async () => {
    try {
      setConnectionStatus('reconnecting');
      await retry();
      setConnectionStatus('connected');
    } catch (err) {
      setConnectionStatus('disconnected');
      console.error('Retry failed:', err);
    }
  }, [retry]);

  /**
   * Handle critical errors that require user intervention
   */
  const handleCriticalError = useCallback(() => {
    setCriticalError(null);
    clearError();
    loadDashboardMetrics(true);
  }, [clearError, loadDashboardMetrics]);

  /**
   * Start automatic polling
   * Requirements: 4.2, 4.3 - 30-second polling mechanism
   */
  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    setIsPolling(true);
    pollingIntervalRef.current = setInterval(async () => {
      if (mountedRef.current && !loading) {
        try {
          await loadDashboardMetrics(false); // Silent refresh
        } catch (err) {
          // Silent failure - don't interrupt user experience
          console.warn('Background refresh failed:', err.message);
        }
      }
    }, 30000); // 30 seconds
  }, [loadDashboardMetrics, loading]);

  /**
   * Stop automatic polling
   */
  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    setIsPolling(false);
  }, []);

  /**
   * Enhanced cleanup on unmount
   */
  useEffect(() => {
    mountedRef.current = true;
    
    // Initial data load
    loadDashboardMetrics(true);
    
    // Start polling after initial load
    const pollTimer = setTimeout(() => {
      if (mountedRef.current) {
        startPolling();
      }
    }, 1000);

    // Cleanup on unmount
    return () => {
      mountedRef.current = false;
      clearTimeout(pollTimer);
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      stopPolling();
    };
  }, [loadDashboardMetrics, startPolling, stopPolling]);

  /**
   * Handle visibility change to pause/resume polling
   * Requirements: 4.3 - Efficient polling management
   */
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling();
      } else if (mountedRef.current) {
        startPolling();
        // Refresh data when page becomes visible
        loadDashboardMetrics(false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [startPolling, stopPolling, loadDashboardMetrics]);

  /**
   * Handle pending approvals click
   */
  const handlePendingClick = useCallback(() => {
    navigate('/admin/payroll');
  }, [navigate]);

  /**
   * Enhanced connection status indicator
   */
  const getConnectionStatusDisplay = () => {
    switch (connectionStatus) {
      case 'connected':
        return {
          color: 'bg-[#5DD62C]',
          text: 'Connected',
          animate: 'animate-pulse'
        };
      case 'reconnecting':
        return {
          color: 'bg-yellow-500',
          text: 'Reconnecting...',
          animate: 'animate-pulse'
        };
      case 'disconnected':
        return {
          color: 'bg-red-500',
          text: 'Disconnected',
          animate: ''
        };
      default:
        return {
          color: 'bg-gray-500',
          text: 'Unknown',
          animate: ''
        };
    }
  };

  const connectionDisplay = getConnectionStatusDisplay();
  const formatLastRefresh = () => {
    if (!lastRefresh) return '';
    const now = new Date();
    const diff = Math.floor((now - lastRefresh) / 1000);
    
    if (diff < 60) return `Updated ${diff}s ago`;
    if (diff < 3600) return `Updated ${Math.floor(diff / 60)}m ago`;
    return `Updated ${Math.floor(diff / 3600)}h ago`;
  };

  return (
    <div className="dashboard-page">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#F8F8F8]">Dashboard</h1>
            <p className="text-sm text-[#F8F8F8]/60 mt-1">
              Welcome back, {user?.name || 'Admin'}
            </p>
          </div>
          
          {/* Refresh controls */}
          <div className="flex items-center space-x-4">
            {lastRefresh && (
              <span className="text-xs text-[#F8F8F8]/60">
                {formatLastRefresh()}
              </span>
            )}
            
            {isPolling && (
              <div className="flex items-center space-x-2 text-xs text-[#F8F8F8]/60">
                <div className="w-2 h-2 rounded-full bg-[#5DD62C] animate-pulse"></div>
                <span>Live Updates</span>
              </div>
            )}
            
            <button
              onClick={handleManualRefresh}
              disabled={loading}
              className="btn-secondary text-sm px-3 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Refresh dashboard data"
            >
              <svg 
                className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
                />
              </svg>
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Enhanced Global Error Display with Retry Mechanism */}
      {(error || criticalError) && !loading && (
        <div className="mb-6">
          {criticalError ? (
            <ErrorMessage
              message={criticalError.message}
              type={criticalError.type}
              onRetry={handleCriticalError}
              className="rounded-xl"
            />
          ) : (
            <RetryMechanism
              onRetry={handleRetry}
              maxRetries={5}
              autoRetry={false}
              error={error}
              isRetryable={canRetry}
              className="rounded-xl"
            />
          )}
        </div>
      )}

      {/* Enhanced Dashboard Metrics Grid */}
      <MetricsGrid 
        loading={loading && !dashboardData.payrollTotal}
        error={error && !dashboardData.payrollTotal ? { message: error } : null}
        onRetry={canRetry ? handleRetry : null}
        maxRetries={5}
        autoRetry={false}
        className="mb-8"
      >
        <PayrollCard
          amount={dashboardData.payrollTotal?.amount || 0}
          employeeCount={dashboardData.payrollTotal?.employeeCount || 0}
          month={dashboardData.payrollTotal?.month || currentMonth}
          year={dashboardData.payrollTotal?.year || currentYear}
          loading={loading && !dashboardData.payrollTotal}
          error={error && !dashboardData.payrollTotal ? { message: error } : null}
        />
        
        <EmployeeCard
          employeesPaid={dashboardData.employeesPaid?.count || 0}
          totalEmployees={dashboardData.employeesPaid?.totalEmployees || 0}
          month={dashboardData.employeesPaid?.month || currentMonth}
          year={dashboardData.employeesPaid?.year || currentYear}
          loading={loading && !dashboardData.employeesPaid}
          error={error && !dashboardData.employeesPaid ? { message: error } : null}
        />
        
        <PendingCard
          pendingCount={dashboardData.pendingApprovals?.count || 0}
          approvalTypes={dashboardData.pendingApprovals?.types || []}
          loading={loading && !dashboardData.pendingApprovals}
          error={error && !dashboardData.pendingApprovals ? { message: error } : null}
          onClick={handlePendingClick}
        />
      </MetricsGrid>

      {/* Additional Dashboard Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
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
          </div>
        </div>

        {/* System Status */}
        <div className="card-elevated p-6">
          <h2 className="text-lg font-semibold text-[#F8F8F8] mb-4">System Status</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#F8F8F8]/60">Connection Status</span>
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${connectionDisplay.color} ${connectionDisplay.animate}`}></div>
                <span className="text-[#F8F8F8]">
                  {connectionDisplay.text}
                </span>
              </div>
            </div>
            
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#F8F8F8]/60">Auto Refresh</span>
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${isPolling ? 'bg-[#5DD62C] animate-pulse' : 'bg-gray-400'}`}></div>
                <span className="text-[#F8F8F8]">
                  {isPolling ? 'Active' : 'Paused'}
                </span>
              </div>
            </div>
            
            {/* Enhanced retry status display */}
            {(isRetrying || retryCount > 0) && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#F8F8F8]/60">Retry Status</span>
                <div className="flex items-center space-x-2">
                  {isRetrying && (
                    <div className="w-2 h-2 rounded-full bg-orange-400 animate-pulse"></div>
                  )}
                  <span className="text-[#F8F8F8] text-xs">
                    {isRetrying ? 'Retrying...' : `${retryCount} attempts`}
                  </span>
                </div>
              </div>
            )}
            
            {dashboardData.lastUpdated && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#F8F8F8]/60">Last Updated</span>
                <span className="text-[#F8F8F8]">
                  {new Date(dashboardData.lastUpdated).toLocaleTimeString()}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;