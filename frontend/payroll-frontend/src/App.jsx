import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import './App.css';
import { LoginForm, RegisterForm, ProtectedRoute, AdminLayout, EmployeeLayout, EmployeePayrollHistory, NetworkStatus, ErrorBoundary } from './components';
import { AdminDashboard, EmployeeDashboard, EmployeeManagement, PayrollManagement, AccountSettings } from './pages';
import { clearAuth, getUser, isAuthenticated, getUserRole } from './utils/tokenManager';
import { NotificationProvider } from './context';
import { SettingsProvider } from './context/SettingsContext';

/**
 * LoginPage Component
 * Handles login/register views with PayFlow dark theme
 */
const LoginPage = () => {
  const [currentView, setCurrentView] = useState('login');
  const navigate = useNavigate();

  const handleLoginSuccess = (userData) => {
    console.log('Login successful:', userData);
    // Redirect based on role
    if (userData.role === 'admin') {
      navigate('/admin/dashboard');
    } else {
      navigate('/employee/dashboard');
    }
  };

  const handleRegisterSuccess = (userData) => {
    console.log('Registration successful:', userData);
    setCurrentView('login');
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Form on surface background */}
      <div className="w-full lg:w-1/2 bg-[#202020] flex items-center justify-center p-12">
        <div className="w-full max-w-md">
          <div className="mb-10">
            <div className="flex items-center mb-4">
              <img src="/logo.png" alt="PayFlow Logo" className="w-16 h-16 mr-4" />
              <h1 className="text-[32px] font-bold text-[#5DD62C]">PayFlow</h1>
            </div>
            <h2 className="text-2xl font-bold text-[#F8F8F8]">
              {currentView === 'login' ? 'Welcome back' : 'Create account'}
            </h2>
            <p className="mt-2 text-sm text-[#F8F8F8]/60">
              {currentView === 'login' 
                ? 'Enter your credentials to access your account' 
                : 'Fill in the details to get started'}
            </p>
          </div>

          {currentView === 'login' ? (
            <LoginForm
              onLoginSuccess={handleLoginSuccess}
              onSwitchToRegister={() => setCurrentView('register')}
            />
          ) : (
            <RegisterForm
              onRegisterSuccess={handleRegisterSuccess}
              onSwitchToLogin={() => setCurrentView('login')}
            />
          )}
        </div>
      </div>

      {/* Right side - Branding on main background */}
      <div className="hidden lg:flex w-1/2 bg-[#0F0F0F] items-center justify-center p-12 border-l border-[#FFFFFF]/[0.08]">
        <div className="max-w-lg">
          <div className="flex items-center mb-6">
            <img src="/logo.png" alt="PayFlow Logo" className="w-20 h-20 mr-4" />
            <div>
              <h2 className="text-4xl font-bold text-[#F8F8F8] mb-2">
                Payroll Made Simple
              </h2>
            </div>
          </div>
          <p className="text-xl text-[#F8F8F8]/60 mb-10">
            Streamline your payroll management with our comprehensive solution for businesses of all sizes.
          </p>
          
          <div className="space-y-6">
            <div className="flex items-start">
              <div className="flex-shrink-0 w-10 h-10 bg-[#5DD62C]/10 rounded-xl flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-[#5DD62C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-lg text-[#F8F8F8]">Employee Management</h3>
                <p className="text-sm text-[#F8F8F8]/60">Manage employee records, salaries, and deductions</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="flex-shrink-0 w-10 h-10 bg-[#5DD62C]/10 rounded-xl flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-[#5DD62C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-lg text-[#F8F8F8]">Automated Payroll</h3>
                <p className="text-sm text-[#F8F8F8]/60">Process payroll with automatic calculations</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="flex-shrink-0 w-10 h-10 bg-[#5DD62C]/10 rounded-xl flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-[#5DD62C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-lg text-[#F8F8F8]">Secure & Reliable</h3>
                <p className="text-sm text-[#F8F8F8]/60">Role-based access control and data protection</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * UnauthorizedPage Component
 * Displayed when user tries to access a route they don't have permission for
 */
const UnauthorizedPage = () => {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen bg-[#0F0F0F] flex items-center justify-center p-6">
      <div className="text-center">
        <div className="flex items-center justify-center mb-6">
          <img src="/logo.png" alt="PayFlow Logo" className="w-16 h-16 mr-4" />
          <span className="text-2xl font-bold text-[#5DD62C]">PayFlow</span>
        </div>
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-500/10 mb-4">
          <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-[#F8F8F8] mb-2">Access Denied</h1>
        <p className="text-sm text-[#F8F8F8]/60 mb-6">
          You don't have permission to access this page.
        </p>
        <button
          onClick={() => navigate(-1)}
          className="px-6 py-2 text-sm font-medium text-[#0F0F0F] bg-[#5DD62C] hover:bg-[#5DD62C]/90 rounded-lg transition-colors"
        >
          Go Back
        </button>
      </div>
    </div>
  );
};

/**
 * RoleBasedRedirect Component
 * Redirects authenticated users to their appropriate dashboard
 */
const RoleBasedRedirect = () => {
  const role = getUserRole();
  
  if (role === 'admin') {
    return <Navigate to="/admin/dashboard" replace />;
  } else if (role === 'employee') {
    return <Navigate to="/employee/dashboard" replace />;
  }
  
  return <Navigate to="/login" replace />;
};

/**
 * App Component
 * Main application component with routing configuration
 */
function App() {
  return (
    <ErrorBoundary>
      <SettingsProvider>
        <NotificationProvider>
          <BrowserRouter>
            {/* Global Network Status Banner */}
            <NetworkStatus />
            
            <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/unauthorized" element={<UnauthorizedPage />} />
            
            {/* Admin routes - protected with role check */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="employees" element={<EmployeeManagement />} />
              <Route path="payroll" element={<PayrollManagement />} />
              <Route path="account" element={<AccountSettings />} />
            </Route>
            
            {/* Employee routes - protected with role check */}
            <Route
              path="/employee"
              element={
                <ProtectedRoute allowedRoles={['employee']}>
                  <EmployeeLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/employee/dashboard" replace />} />
              <Route path="dashboard" element={<EmployeeDashboard />} />
              <Route path="payslips" element={<EmployeePayrollHistory />} />
              <Route path="account" element={<AccountSettings />} />
            </Route>
            
            {/* Root redirect based on authentication and role */}
            <Route
              path="/"
              element={
                isAuthenticated() ? <RoleBasedRedirect /> : <Navigate to="/login" replace />
              }
            />
            
            {/* Catch all - redirect to login */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </NotificationProvider>
    </SettingsProvider>
  </ErrorBoundary>
  );
}

export default App;
