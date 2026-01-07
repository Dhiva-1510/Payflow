import { useState } from 'react';
import EmployeeList from '../components/EmployeeList';
import EmployeeForm from '../components/EmployeeForm';
import Notification from '../components/Notification';

/**
 * EmployeeManagement Page
 * Main page for managing employees (admin only)
 * Requirements: 7.2, 8.1, 8.3
 * 
 * Features:
 * - List all employees
 * - Add new employees
 * - Edit existing employees
 * - Success feedback notifications
 */
const EmployeeManagement = () => {
  const [view, setView] = useState('list'); // 'list' | 'add' | 'edit'
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [notification, setNotification] = useState(null);

  const handleAddNew = () => {
    setSelectedEmployee(null);
    setView('add');
  };

  const handleEdit = (employee) => {
    setSelectedEmployee(employee);
    setView('edit');
  };

  const handleSuccess = () => {
    const isEdit = view === 'edit';
    setView('list');
    setSelectedEmployee(null);
    // Trigger refresh of employee list
    setRefreshTrigger(prev => prev + 1);
    // Show success notification
    setNotification({
      type: 'success',
      message: isEdit ? 'Employee updated successfully!' : 'Employee added successfully!'
    });
  };

  const handleCancel = () => {
    setView('list');
    setSelectedEmployee(null);
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#F8F8F8]">Employee Management</h1>
            <p className="text-sm text-[#F8F8F8]/60 mt-1">
              {view === 'list' && 'Manage your organization\'s employees'}
              {view === 'add' && 'Add a new employee to the system'}
              {view === 'edit' && 'Update employee information'}
            </p>
          </div>
          {view !== 'list' && (
            <button
              onClick={handleCancel}
              className="flex items-center px-4 py-2 text-sm font-medium text-[#F8F8F8]/60 hover:text-[#F8F8F8] transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to List
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {view === 'list' && (
        <EmployeeList
          onEdit={handleEdit}
          onAddNew={handleAddNew}
          refreshTrigger={refreshTrigger}
        />
      )}

      {(view === 'add' || view === 'edit') && (
        <EmployeeForm
          employee={selectedEmployee}
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
};

export default EmployeeManagement;
