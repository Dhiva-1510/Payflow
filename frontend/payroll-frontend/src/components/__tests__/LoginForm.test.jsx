import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import LoginForm from '../LoginForm';

// Mock the API module
jest.mock('../../services/api', () => ({
  post: jest.fn()
}));

describe('LoginForm', () => {
  const mockOnLoginSuccess = jest.fn();
  const mockOnSwitchToRegister = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders login form with all required fields', () => {
    render(
      <LoginForm 
        onLoginSuccess={mockOnLoginSuccess}
        onSwitchToRegister={mockOnSwitchToRegister}
      />
    );

    expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.getByText('Sign up')).toBeInTheDocument();
  });

  test('validates required fields on form submission', async () => {
    render(
      <LoginForm 
        onLoginSuccess={mockOnLoginSuccess}
        onSwitchToRegister={mockOnSwitchToRegister}
      />
    );

    // Submit the form without filling any fields
    const form = screen.getByRole('button', { name: 'Sign in' }).closest('form');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('Email is required')).toBeInTheDocument();
      expect(screen.getByText('Password is required')).toBeInTheDocument();
    });
  });

  test('validates email format on form submission', async () => {
    render(
      <LoginForm 
        onLoginSuccess={mockOnLoginSuccess}
        onSwitchToRegister={mockOnSwitchToRegister}
      />
    );

    const emailInput = screen.getByLabelText('Email Address');
    const passwordInput = screen.getByLabelText('Password');

    // Fill in invalid email and valid password
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    // Submit the form
    const form = screen.getByRole('button', { name: 'Sign in' }).closest('form');
    fireEvent.submit(form);

    // Check if email validation error message is displayed
    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
    });
  });

  test('validates password length on form submission', async () => {
    render(
      <LoginForm 
        onLoginSuccess={mockOnLoginSuccess}
        onSwitchToRegister={mockOnSwitchToRegister}
      />
    );

    const emailInput = screen.getByLabelText('Email Address');
    const passwordInput = screen.getByLabelText('Password');

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: '123' } });

    // Submit the form
    const form = screen.getByRole('button', { name: 'Sign in' }).closest('form');
    fireEvent.submit(form);

    // Check if password validation error message is displayed
    await waitFor(() => {
      expect(screen.getByText('Password must be at least 6 characters')).toBeInTheDocument();
    });
  });

  test('calls onSwitchToRegister when register link is clicked', () => {
    render(
      <LoginForm 
        onLoginSuccess={mockOnLoginSuccess}
        onSwitchToRegister={mockOnSwitchToRegister}
      />
    );

    const registerLink = screen.getByText('Sign up');
    fireEvent.click(registerLink);

    expect(mockOnSwitchToRegister).toHaveBeenCalledTimes(1);
  });
});
