import React from 'react';
import { render, screen } from '@testing-library/react';
import EmployeeCard from '../EmployeeCard';

describe('EmployeeCard', () => {
  it('renders with default props', () => {
    render(<EmployeeCard />);
    expect(screen.getByText('Employees Paid')).toBeInTheDocument();
  });

  it('displays employee count correctly', () => {
    render(<EmployeeCard employeesPaid={5} totalEmployees={10} />);
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('5 employees paid')).toBeInTheDocument();
    expect(screen.getByText('of 10 total employees')).toBeInTheDocument();
  });

  it('displays zero state correctly', () => {
    render(<EmployeeCard employeesPaid={0} totalEmployees={10} />);
    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText('No employees paid this month')).toBeInTheDocument();
    expect(screen.getByText('of 10 total employees')).toBeInTheDocument();
  });

  it('displays coverage percentage', () => {
    render(<EmployeeCard employeesPaid={8} totalEmployees={10} />);
    expect(screen.getByText('80%')).toBeInTheDocument();
  });

  it('displays loading state', () => {
    render(<EmployeeCard loading={true} />);
    // Check for loading skeleton
    const loadingElements = document.querySelectorAll('.animate-pulse');
    expect(loadingElements.length).toBeGreaterThan(0);
  });

  it('displays error state', () => {
    const error = { message: 'Test error' };
    render(<EmployeeCard error={error} />);
    expect(screen.getByText('Employee Data Error')).toBeInTheDocument();
    expect(screen.getByText('Unable to load employee information')).toBeInTheDocument();
  });

  it('formats month and year correctly', () => {
    render(<EmployeeCard month={12} year={2023} />);
    expect(screen.getByText('December 2023')).toBeInTheDocument();
  });

  it('handles single employee correctly', () => {
    render(<EmployeeCard employeesPaid={1} totalEmployees={1} />);
    expect(screen.getByText('1 employee paid')).toBeInTheDocument();
    expect(screen.getByText('of 1 total employee')).toBeInTheDocument();
  });
});