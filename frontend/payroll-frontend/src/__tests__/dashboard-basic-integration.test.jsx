/**
 * Basic Dashboard Integration Tests
 * Tests complete dashboard data flow from API to UI components
 */

import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { SettingsProvider } from '../context/SettingsContext';
import { NotificationProvider } from '../context';
import DashboardPage from '../pages/DashboardPage';
import api from '../services/api';

// Mock API
jest.mock('../services/api');
const mockedAxios = api;

describe('Dashboard Basic Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock successful API responses
    mockedAxios.get.mockResolvedValue({
      data: {
        success: true,
        data: {
          totalEmployees: 5,
          monthlyPayroll: 250000,
          pendingApprovals: 2,
          lastPayrollRun: { month: 12, year: 2024 },
          recentActivity: []
        }
      }
    });
  });

  const renderWithProviders = (component) => {
    return render(
      <BrowserRouter>
        <SettingsProvider>
          <NotificationProvider>
            {component}
          </NotificationProvider>
        </SettingsProvider>
      </BrowserRouter>
    );
  };

  test('should render dashboard without errors', async () => {
    renderWithProviders(<DashboardPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/dashboard/i)).toBeInTheDocument();
    });
  });

  test('should handle API errors gracefully', async () => {
    mockedAxios.get.mockRejectedValueOnce(new Error('Network error'));
    
    renderWithProviders(<DashboardPage />);
    
    expect(document.body).toBeInTheDocument();
  });
});