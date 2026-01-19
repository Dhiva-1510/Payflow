import React from 'react';
import { render, screen } from '@testing-library/react';
import PayrollCard from '../PayrollCard';

// Mock the currency utility
jest.mock('../../utils/currency', () => ({
  formatCurrency: jest.fn((amount) => `₹${amount.toLocaleString()}`)
}));

describe('PayrollCard', () => {
  it('renders without crashing', () => {
    render(<PayrollCard />);
    expect(screen.getByText('Total Payroll')).toBeInTheDocument();
  });

  it('displays payroll amount with currency formatting', () => {
    render(<PayrollCard amount={50000} employeeCount={10} />);
    expect(screen.getByText('₹50,000')).toBeInTheDocument();
  });

  it('displays employee count information', () => {
    render(<PayrollCard amount={50000} employeeCount={10} />);
    expect(screen.getByText('10 employees paid')).toBeInTheDocument();
  });

  it('displays month and year context', () => {
    render(<PayrollCard amount={50000} employeeCount={10} month={12} year={2023} />);
    expect(screen.getByText('December 2023')).toBeInTheDocument();
  });

  it('handles zero state appropriately', () => {
    render(<PayrollCard amount={0} employeeCount={0} />);
    expect(screen.getByText('No payroll processed this month')).toBeInTheDocument();
  });

  it('handles singular employee count', () => {
    render(<PayrollCard amount={5000} employeeCount={1} />);
    expect(screen.getByText('1 employee paid')).toBeInTheDocument();
  });

  it('displays loading state', () => {
    render(<PayrollCard loading={true} />);
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
    expect(document.querySelector('.card')).toBeInTheDocument();
  });

  it('displays error state', () => {
    render(<PayrollCard error={{ message: 'Test error' }} />);
    expect(screen.getByText('Payroll Data Error')).toBeInTheDocument();
    expect(screen.getByText('Unable to load payroll information')).toBeInTheDocument();
  });
});