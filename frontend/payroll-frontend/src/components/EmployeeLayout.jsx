import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { clearAuth, getUser } from '../utils/tokenManager';

/**
 * EmployeeLayout Component
 * Main layout component for employee dashboard with sidebar navigation
 * Requirements: 7.3
 * 
 * Features:
 * - Top navigation bar with branding and user info
 * - Sidebar navigation with employee-specific menu items
 * - Main content area for nested routes
 */
const EmployeeLayout = () => {
  const navigate = useNavigate();
  const user = getUser();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  // Navigation items for employee users
  const navItems = [
    {
      name: 'Dashboard',
      path: '/employee/dashboard',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      name: 'My Payslips',
      path: '/employee/payslips',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      name: 'Account',
      path: '/employee/account',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-[#0F0F0F]">
      {/* Top Navigation Bar */}
      <nav className="bg-[#202020] border-b border-[#FFFFFF]/[0.08] fixed top-0 left-0 right-0 z-50">
        <div className="px-8">
          <div className="flex justify-between h-14">
            <div className="flex items-center">
              {/* Mobile menu button */}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="mr-4 p-2 text-[#F8F8F8]/60 hover:text-[#F8F8F8] hover:bg-[#0F0F0F] rounded-lg transition-colors lg:hidden"
                aria-label="Toggle sidebar"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <div className="flex items-center">
                <img src="/logo.png" alt="PayFlow Logo" className="w-10 h-10 mr-3" />
                <span className="text-[32px] font-bold text-[#5DD62C]">PayFlow</span>
              </div>
              <span className="ml-8 text-[#F8F8F8]/60 hidden sm:inline">|</span>
              <span className="ml-8 text-sm text-[#F8F8F8]/60 hidden sm:inline">Employee Portal</span>
            </div>
            <div className="flex items-center space-x-6">
              <span className="text-sm text-[#F8F8F8] hidden sm:inline">
                {user?.name || 'Employee'}
              </span>
              <span className="px-3 py-1 text-xs font-medium bg-[#5DD62C]/10 text-[#5DD62C] rounded-lg capitalize">
                {user?.role || 'employee'}
              </span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm text-[#F8F8F8]/60 hover:text-[#F8F8F8] hover:bg-[#0F0F0F] rounded-lg transition-colors"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex pt-14">
        {/* Sidebar */}
        <aside 
          className={`${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } fixed lg:static lg:translate-x-0 w-60 bg-[#202020] border-r border-[#FFFFFF]/[0.08] min-h-[calc(100vh-56px)] transition-transform duration-300 ease-in-out z-40`}
        >
          <nav className="mt-6 px-4">
            <div className="space-y-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `nav-link ${
                      isActive
                        ? 'nav-link-active'
                        : 'nav-link-inactive'
                    }`
                  }
                >
                  <span className="mr-3">{item.icon}</span>
                  {item.name}
                </NavLink>
              ))}
            </div>

            {/* Logout at bottom */}
            <div className="mt-8 pt-4 border-t border-[#FFFFFF]/[0.08]">
              <button
                onClick={handleLogout}
                className="nav-link nav-link-inactive w-full"
              >
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </button>
            </div>
          </nav>
        </aside>

        {/* Overlay for mobile sidebar */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content Area */}
        <main className="flex-1 p-6 lg:ml-0 min-h-[calc(100vh-56px)]">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default EmployeeLayout;
