import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import RegisterForm from '../RegisterForm';

// Mock the API module
jest.mock('../../services/api', () => ({
  post: jest.fn()
}));

describe('RegisterForm', () => {
  const mockOnRegisterSuccess = jest.fn();
  const mockOnSwitchToLogin = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders registration form with all required fields', () => {
    render(
      <RegisterForm 
        onRegisterSuccess={mockOnRegisterSuccess}
        onSwitchToLogin={mockOnSwitchToLogin}
      />
    );

    expect(screen.getByLabelText('Full Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm Password')).toBeInTheDocument();
    expect(screen.getByLabelText('Role')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create Account' })).toBeInTheDocument();
    expect(screen.getByText('Sign in')).toBeInTheDocument();
  });

  test('has role selection with employee and admin options', () => {
    render(
      <RegisterForm 
        onRegisterSuccess={mockOnRegisterSuccess}
        onSwitchToLogin={mockOnSwitchToLogin}
      />
    );

    const roleSelect = screen.getByLabelText('Role');
    expect(roleSelect).toBeInTheDocument();
    
    const employeeOption = screen.getByRole('option', { name: 'Employee' });
    const adminOption = screen.getByRole('option', { name: 'Administrator' });
    
    expect(employeeOption).toBeInTheDocument();
    expect(adminOption).toBeInTheDocument();
    expect(employeeOption.selected).toBe(true); // Default selection
  });

  test('validates required fields', async () => {
    render(
      <RegisterForm 
        onRegisterSuccess={mockOnRegisterSuccess}
        onSwitchToLogin={mockOnSwitchToLogin}
      />
    );

    const submitButton = screen.getByRole('button', { name: 'Create Account' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Name is required')).toBeInTheDocument();
      expect(screen.getByText('Email is required')).toBeInTheDocument();
      expect(screen.getByText('Password is required')).toBeInTheDocument();
      expect(screen.getByText('Please confirm your password')).toBeInTheDocument();
    });
  });

  test('validates password confirmation match', async () => {
    render(
      <RegisterForm 
        onRegisterSuccess={mockOnRegisterSuccess}
        onSwitchToLogin={mockOnSwitchToLogin}
      />
    );

    const passwordInput = screen.getByLabelText('Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm Password');

    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'different123' } });

    const submitButton = screen.getByRole('button', { name: 'Create Account' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
    });
  });

  test('calls onSwitchToLogin when login link is clicked', () => {
    render(
      <RegisterForm 
        onRegisterSuccess={mockOnRegisterSuccess}
        onSwitchToLogin={mockOnSwitchToLogin}
      />
    );

    const loginLink = screen.getByText('Sign in');
    fireEvent.click(loginLink);

    expect(mockOnSwitchToLogin).toHaveBeenCalledTimes(1);
  });
});
