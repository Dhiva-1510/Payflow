import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import PendingCard from '../PendingCard';

// Test wrapper with router
const TestWrapper = ({ children }) => (
  <BrowserRouter>
    {children}
  </BrowserRouter>
);

describe('PendingCard Component', () => {
  test('renders zero state correctly', () => {
    render(
      <TestWrapper>
        <PendingCard pendingCount={0} />
      </TestWrapper>
    );

    expect(screen.getByText('Pending Approvals')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText('No items require approval')).toBeInTheDocument();
    expect(screen.getByText('All tasks are up to date')).toBeInTheDocument();
    expect(screen.getByText('All Clear')).toBeInTheDocument();
  });

  test('renders pending items correctly', () => {
    render(
      <TestWrapper>
        <PendingCard pendingCount={5} approvalTypes={['Payroll', 'Expenses']} />
      </TestWrapper>
    );

    expect(screen.getByText('Pending Approvals')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('5 items pending')).toBeInTheDocument();
    expect(screen.getByText('Payroll and Expenses')).toBeInTheDocument();
    expect(screen.getByText('Action Required')).toBeInTheDocument();
    expect(screen.getByText('Click to review')).toBeInTheDocument();
  });

  test('renders single pending item correctly', () => {
    render(
      <TestWrapper>
        <PendingCard pendingCount={1} approvalTypes={['Payroll']} />
      </TestWrapper>
    );

    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('1 item pending')).toBeInTheDocument();
    expect(screen.getByText('Payroll')).toBeInTheDocument();
  });

  test('handles multiple approval types correctly', () => {
    render(
      <TestWrapper>
        <PendingCard pendingCount={10} approvalTypes={['Payroll', 'Expenses', 'Timesheets', 'Bonuses']} />
      </TestWrapper>
    );

    expect(screen.getByText('Payroll and 3 others')).toBeInTheDocument();
  });

  test('renders loading state correctly', () => {
    render(
      <TestWrapper>
        <PendingCard loading={true} />
      </TestWrapper>
    );

    // Loading state should show skeleton animation
    const loadingElement = document.querySelector('.animate-pulse');
    expect(loadingElement).toBeInTheDocument();
    expect(loadingElement).toHaveClass('animate-pulse');
  });

  test('renders error state correctly', () => {
    const error = { message: 'Failed to load data' };
    render(
      <TestWrapper>
        <PendingCard error={error} />
      </TestWrapper>
    );

    expect(screen.getByText('Approval Data Error')).toBeInTheDocument();
    expect(screen.getByText('Unable to load pending approvals')).toBeInTheDocument();
  });

  test('handles click navigation', () => {
    const mockOnClick = jest.fn();
    render(
      <TestWrapper>
        <PendingCard pendingCount={3} onClick={mockOnClick} />
      </TestWrapper>
    );

    const card = screen.getByRole('button');
    fireEvent.click(card);
    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  test('handles keyboard navigation', () => {
    const mockOnClick = jest.fn();
    render(
      <TestWrapper>
        <PendingCard pendingCount={3} onClick={mockOnClick} />
      </TestWrapper>
    );

    const card = screen.getByRole('button');
    fireEvent.keyDown(card, { key: 'Enter' });
    expect(mockOnClick).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(card, { key: ' ' });
    expect(mockOnClick).toHaveBeenCalledTimes(2);
  });

  test('is not clickable in zero state without custom onClick', () => {
    render(
      <TestWrapper>
        <PendingCard pendingCount={0} />
      </TestWrapper>
    );

    // Should not have button role when not clickable
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  test('formats large numbers correctly', () => {
    render(
      <TestWrapper>
        <PendingCard pendingCount={1234} />
      </TestWrapper>
    );

    expect(screen.getByText('1,234')).toBeInTheDocument();
    expect(screen.getByText('1,234 items pending')).toBeInTheDocument();
  });
});