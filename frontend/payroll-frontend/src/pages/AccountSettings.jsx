import { useState, useEffect } from 'react';
import { getUser, setUser } from '../utils/tokenManager';
import api from '../services/api';
import { getErrorMessage, isRetryableError, getErrorUIType } from '../utils/errorHandler';
import { ErrorMessage, SuccessMessage } from '../components';
import { useSettings } from '../context/SettingsContext';

/**
 * AccountSettings Component
 * User profile and application settings management
 * Features:
 * - User profile information (name, email, role)
 * - Currency preference settings
 * - Theme preferences
 * - Password change
 * - Account activity log
 */
const AccountSettings = () => {
  const user = getUser();
  const { settings, updateSettings } = useSettings();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [errorType, setErrorType] = useState('error');

  // Profile form state
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    role: user?.role || ''
  });

  // Local settings state (initialized from context)
  const [localSettings, setLocalSettings] = useState(settings);

  // Password change state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [passwordErrors, setPasswordErrors] = useState({});

  useEffect(() => {
    fetchUserSettings();
  }, []);

  // Update local settings when context settings change
  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const fetchUserSettings = async () => {
    try {
      const response = await api.get('/auth/settings');
      if (response.data.success) {
        const serverSettings = response.data.settings;
        setLocalSettings(prev => ({ ...prev, ...serverSettings }));
        // Update global settings context
        updateSettings(serverSettings);
      }
    } catch (err) {
      // Settings are optional, don't show error if they don't exist
      console.log('Settings not found, using defaults');
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await api.put('/auth/profile', {
        name: profileData.name
      });

      if (response.data.success) {
        // Update local storage
        const updatedUser = { ...user, name: profileData.name };
        setUser(updatedUser);
        setSuccess('Profile updated successfully!');
      }
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      const uiErrorType = getErrorUIType(err);
      setError(errorMessage);
      setErrorType(uiErrorType);
    } finally {
      setLoading(false);
    }
  };

  const handleSettingsSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await api.put('/auth/settings', localSettings);
      if (response.data.success) {
        // Update global settings context
        updateSettings(localSettings);
        setSuccess('Settings updated successfully! Changes will be applied immediately.');
      }
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      const uiErrorType = getErrorUIType(err);
      setError(errorMessage);
      setErrorType(uiErrorType);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    
    // Validate passwords
    const errors = {};
    if (!passwordData.currentPassword) {
      errors.currentPassword = 'Current password is required';
    }
    if (!passwordData.newPassword) {
      errors.newPassword = 'New password is required';
    } else if (passwordData.newPassword.length < 6) {
      errors.newPassword = 'Password must be at least 6 characters';
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setPasswordErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await api.put('/auth/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });

      if (response.data.success) {
        setSuccess('Password changed successfully!');
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      }
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      const uiErrorType = getErrorUIType(err);
      setError(errorMessage);
      setErrorType(uiErrorType);
    } finally {
      setLoading(false);
    }
  };

  const currencies = [
    { code: 'USD', name: 'US Dollar', symbol: '$' },
    { code: 'EUR', name: 'Euro', symbol: '€' },
    { code: 'GBP', name: 'British Pound', symbol: '£' },
    { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
    { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
    { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
    { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
    { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' }
  ];

  const timezones = [
    'UTC',
    'America/New_York',
    'America/Los_Angeles',
    'Europe/London',
    'Europe/Paris',
    'Asia/Tokyo',
    'Asia/Kolkata',
    'Australia/Sydney'
  ];

  const tabs = [
    { id: 'profile', name: 'Profile', icon: 'user' },
    { id: 'settings', name: 'Preferences', icon: 'cog' },
    { id: 'security', name: 'Security', icon: 'shield' },
    { id: 'activity', name: 'Activity', icon: 'clock' }
  ];

  const getTabIcon = (iconName) => {
    const icons = {
      user: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      ),
      cog: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      ),
      shield: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      ),
      clock: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      )
    };
    return icons[iconName] || icons.user;
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#F8F8F8]">Account Settings</h1>
        <p className="text-sm text-[#F8F8F8]/60 mt-1">Manage your profile and application preferences</p>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <ErrorMessage
          message={error}
          type={errorType}
          dismissible={true}
          onDismiss={() => setError(null)}
          className="mb-6"
        />
      )}

      {success && (
        <SuccessMessage
          message={success}
          dismissible={true}
          onDismiss={() => setSuccess(null)}
          className="mb-6"
        />
      )}

      {/* Tab Navigation */}
      <div className="card-elevated mb-6">
        <div className="border-b border-[#FFFFFF]/[0.08]">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-[#5DD62C] text-[#5DD62C]'
                    : 'border-transparent text-[#F8F8F8]/60 hover:text-[#F8F8F8] hover:border-[#F8F8F8]/20'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {getTabIcon(tab.icon)}
                </svg>
                <span>{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div>
              <h2 className="text-lg font-semibold text-[#F8F8F8] mb-6">Profile Information</h2>
              
              <form onSubmit={handleProfileSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="form-label">Full Name</label>
                    <input
                      type="text"
                      value={profileData.name}
                      onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                      className="input-field"
                      required
                    />
                  </div>

                  <div>
                    <label className="form-label">Email Address</label>
                    <input
                      type="email"
                      value={profileData.email}
                      className="input-field bg-[#F8F8F8]/5 cursor-not-allowed"
                      disabled
                    />
                    <p className="text-xs text-[#F8F8F8]/40 mt-1">Email cannot be changed</p>
                  </div>

                  <div>
                    <label className="form-label">Role</label>
                    <input
                      type="text"
                      value={profileData.role}
                      className="input-field bg-[#F8F8F8]/5 cursor-not-allowed capitalize"
                      disabled
                    />
                  </div>

                  <div>
                    <label className="form-label">Member Since</label>
                    <input
                      type="text"
                      value={new Date().toLocaleDateString()}
                      className="input-field bg-[#F8F8F8]/5 cursor-not-allowed"
                      disabled
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary"
                  >
                    {loading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#0F0F0F] mr-2"></div>}
                    Update Profile
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div>
              <h2 className="text-lg font-semibold text-[#F8F8F8] mb-6">Application Preferences</h2>
              
              <form onSubmit={handleSettingsSubmit} className="space-y-8">
                {/* Currency Settings */}
                <div>
                  <h3 className="text-md font-medium text-[#F8F8F8] mb-4">Currency & Localization</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="form-label">Default Currency</label>
                      <select
                        value={localSettings.currency}
                        onChange={(e) => setLocalSettings(prev => ({ ...prev, currency: e.target.value }))}
                        className="input-field"
                      >
                        {currencies.map(currency => (
                          <option key={currency.code} value={currency.code}>
                            {currency.symbol} {currency.name} ({currency.code})
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-[#F8F8F8]/40 mt-1">All monetary values will be displayed in this currency</p>
                    </div>

                    <div>
                      <label className="form-label">Timezone</label>
                      <select
                        value={localSettings.timezone}
                        onChange={(e) => setLocalSettings(prev => ({ ...prev, timezone: e.target.value }))}
                        className="input-field"
                      >
                        {timezones.map(tz => (
                          <option key={tz} value={tz}>{tz}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>



                {/* Notification Settings */}
                <div>
                  <h3 className="text-md font-medium text-[#F8F8F8] mb-4">Notifications</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-[#F8F8F8]">Email Notifications</div>
                        <div className="text-xs text-[#F8F8F8]/60">Receive important updates via email</div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={localSettings.notifications.email}
                          onChange={(e) => setLocalSettings(prev => ({
                            ...prev,
                            notifications: { ...prev.notifications, email: e.target.checked }
                          }))}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-[#F8F8F8]/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#5DD62C]"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-[#F8F8F8]">Payroll Notifications</div>
                        <div className="text-xs text-[#F8F8F8]/60">Get notified when payroll is processed</div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={localSettings.notifications.payroll}
                          onChange={(e) => setLocalSettings(prev => ({
                            ...prev,
                            notifications: { ...prev.notifications, payroll: e.target.checked }
                          }))}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-[#F8F8F8]/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#5DD62C]"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-[#F8F8F8]">System Notifications</div>
                        <div className="text-xs text-[#F8F8F8]/60">Maintenance and system updates</div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={localSettings.notifications.system}
                          onChange={(e) => setLocalSettings(prev => ({
                            ...prev,
                            notifications: { ...prev.notifications, system: e.target.checked }
                          }))}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-[#F8F8F8]/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#5DD62C]"></div>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary"
                  >
                    {loading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#0F0F0F] mr-2"></div>}
                    Save Preferences
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div>
              <h2 className="text-lg font-semibold text-[#F8F8F8] mb-6">Security Settings</h2>
              
              <form onSubmit={handlePasswordSubmit} className="space-y-6">
                <div className="max-w-md">
                  <div>
                    <label className="form-label">Current Password</label>
                    <input
                      type="password"
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                      className={`input-field ${passwordErrors.currentPassword ? 'input-error' : ''}`}
                    />
                    {passwordErrors.currentPassword && (
                      <p className="form-error">{passwordErrors.currentPassword}</p>
                    )}
                  </div>

                  <div>
                    <label className="form-label">New Password</label>
                    <input
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                      className={`input-field ${passwordErrors.newPassword ? 'input-error' : ''}`}
                    />
                    {passwordErrors.newPassword && (
                      <p className="form-error">{passwordErrors.newPassword}</p>
                    )}
                  </div>

                  <div>
                    <label className="form-label">Confirm New Password</label>
                    <input
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      className={`input-field ${passwordErrors.confirmPassword ? 'input-error' : ''}`}
                    />
                    {passwordErrors.confirmPassword && (
                      <p className="form-error">{passwordErrors.confirmPassword}</p>
                    )}
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary"
                  >
                    {loading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#0F0F0F] mr-2"></div>}
                    Change Password
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Activity Tab */}
          {activeTab === 'activity' && (
            <div>
              <h2 className="text-lg font-semibold text-[#F8F8F8] mb-6">Account Activity</h2>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-[#0F0F0F] rounded-lg border border-[#FFFFFF]/[0.08]">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-[#5DD62C] rounded-full"></div>
                    <div>
                      <div className="text-sm font-medium text-[#F8F8F8]">Logged in</div>
                      <div className="text-xs text-[#F8F8F8]/60">Current session</div>
                    </div>
                  </div>
                  <div className="text-xs text-[#F8F8F8]/60">
                    {new Date().toLocaleString()}
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-[#0F0F0F] rounded-lg border border-[#FFFFFF]/[0.08]">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-[#F8F8F8]/40 rounded-full"></div>
                    <div>
                      <div className="text-sm font-medium text-[#F8F8F8]">Profile updated</div>
                      <div className="text-xs text-[#F8F8F8]/60">Name changed</div>
                    </div>
                  </div>
                  <div className="text-xs text-[#F8F8F8]/60">
                    2 days ago
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-[#0F0F0F] rounded-lg border border-[#FFFFFF]/[0.08]">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-[#F8F8F8]/40 rounded-full"></div>
                    <div>
                      <div className="text-sm font-medium text-[#F8F8F8]">Password changed</div>
                      <div className="text-xs text-[#F8F8F8]/60">Security update</div>
                    </div>
                  </div>
                  <div className="text-xs text-[#F8F8F8]/60">
                    1 week ago
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AccountSettings;