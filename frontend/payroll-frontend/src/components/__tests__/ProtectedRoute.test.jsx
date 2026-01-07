import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from '../ProtectedRoute';
import * as tokenManager from '../../utils/tokenManager';

// Mock the tokenManager module
jest.mock('../../utils/tokenManager');

describe('ProtectedRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderWithRouter = (ui, { initialEntries = ['/protected'] } = {}) => {
    return render(
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route path="/login" element={<div>Login Page</div>} />
          <Route path="/unauthorized" element={<div>Unauthorized Page</div>} />
          <Route
            path="/protected"
            element={ui}
          />
          <Route
            path="/admin"
            element={ui}
          />
        </Routes>
      </MemoryRouter>
    );
  };

  describe('Authentication checks', () => {
    it('should render children when user is authenticated', () => {
      tokenManager.isAuthenticated.mockReturnValue(true);
      tokenManager.getToken.mockReturnValue('valid-token');
      tokenManager.isTokenExpired.mockReturnValue(false);
      tokenManager.getUserRole.mockReturnValue('employee');

      renderWithRouter(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      );

      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    it('should redirect to login when user is not authenticated', () => {
      tokenManager.isAuthenticated.mockReturnValue(false);
      tokenManager.getToken.mockReturnValue(null);

      renderWithRouter(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      );

      expect(screen.getByText('Login Page')).toBeInTheDocument();
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('should redirect to login when token is expired', () => {
      tokenManager.isAuthenticated.mockReturnValue(true);
      tokenManager.getToken.mockReturnValue('expired-token');
      tokenManager.isTokenExpired.mockReturnValue(true);

      renderWithRouter(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      );

      expect(screen.getByText('Login Page')).toBeInTheDocument();
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });
  });

  describe('Role-based access control', () => {
    it('should allow access when user has required role', () => {
      tokenManager.isAuthenticated.mockReturnValue(true);
      tokenManager.getToken.mockReturnValue('valid-token');
      tokenManager.isTokenExpired.mockReturnValue(false);
      tokenManager.getUserRole.mockReturnValue('admin');

      renderWithRouter(
        <ProtectedRoute allowedRoles={['admin']}>
          <div>Admin Content</div>
        </ProtectedRoute>,
        { initialEntries: ['/admin'] }
      );

      expect(screen.getByText('Admin Content')).toBeInTheDocument();
    });

    it('should redirect to unauthorized when user lacks required role', () => {
      tokenManager.isAuthenticated.mockReturnValue(true);
      tokenManager.getToken.mockReturnValue('valid-token');
      tokenManager.isTokenExpired.mockReturnValue(false);
      tokenManager.getUserRole.mockReturnValue('employee');

      renderWithRouter(
        <ProtectedRoute allowedRoles={['admin']}>
          <div>Admin Content</div>
        </ProtectedRoute>,
        { initialEntries: ['/admin'] }
      );

      expect(screen.getByText('Unauthorized Page')).toBeInTheDocument();
      expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
    });

    it('should allow access when user has one of multiple allowed roles', () => {
      tokenManager.isAuthenticated.mockReturnValue(true);
      tokenManager.getToken.mockReturnValue('valid-token');
      tokenManager.isTokenExpired.mockReturnValue(false);
      tokenManager.getUserRole.mockReturnValue('employee');

      renderWithRouter(
        <ProtectedRoute allowedRoles={['admin', 'employee']}>
          <div>Shared Content</div>
        </ProtectedRoute>
      );

      expect(screen.getByText('Shared Content')).toBeInTheDocument();
    });

    it('should allow access when no roles are specified (authentication only)', () => {
      tokenManager.isAuthenticated.mockReturnValue(true);
      tokenManager.getToken.mockReturnValue('valid-token');
      tokenManager.isTokenExpired.mockReturnValue(false);
      tokenManager.getUserRole.mockReturnValue('employee');

      renderWithRouter(
        <ProtectedRoute>
          <div>Any Authenticated User Content</div>
        </ProtectedRoute>
      );

      expect(screen.getByText('Any Authenticated User Content')).toBeInTheDocument();
    });
  });

  describe('Custom redirect paths', () => {
    it('should redirect to custom path when specified', () => {
      tokenManager.isAuthenticated.mockReturnValue(false);
      tokenManager.getToken.mockReturnValue(null);

      render(
        <MemoryRouter initialEntries={['/protected']}>
          <Routes>
            <Route path="/custom-login" element={<div>Custom Login</div>} />
            <Route
              path="/protected"
              element={
                <ProtectedRoute redirectTo="/custom-login">
                  <div>Protected Content</div>
                </ProtectedRoute>
              }
            />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByText('Custom Login')).toBeInTheDocument();
    });
  });
});
