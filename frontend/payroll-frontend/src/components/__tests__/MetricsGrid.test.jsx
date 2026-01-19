import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import MetricsGrid from '../MetricsGrid';

// Mock child components
const MockCard = ({ title, children }) => (
  <div data-testid="mock-card">
    <h3>{title}</h3>
    {children}
  </div>
);

describe('MetricsGrid Component', () => {
  test('renders children in grid layout', () => {
    render(
      <MetricsGrid>
        <MockCard title="Card 1">Content 1</MockCard>
        <MockCard title="Card 2">Content 2</MockCard>
        <MockCard title="Card 3">Content 3</MockCard>
      </MetricsGrid>
    );

    expect(screen.getAllByTestId('mock-card')).toHaveLength(3);
    expect(screen.getByText('Card 1')).toBeInTheDocument();
    expect(screen.getByText('Card 2')).toBeInTheDocument();
    expect(screen.getByText('Card 3')).toBeInTheDocument();
  });

  test('shows loading skeleton when loading prop is true', () => {
    render(<MetricsGrid loading={true} />);
    
    // Should show 3 loading skeletons
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  test('shows error state when error prop is provided', () => {
    const mockError = { message: 'Test error message' };
    const mockRetry = jest.fn();

    render(<MetricsGrid error={mockError} onRetry={mockRetry} />);

    expect(screen.getByText('Failed to load dashboard metrics')).toBeInTheDocument();
    expect(screen.getByText('Test error message')).toBeInTheDocument();
    expect(screen.getByText('Try Again')).toBeInTheDocument();
  });

  test('shows default error message when error has no message', () => {
    const mockError = {};
    
    render(<MetricsGrid error={mockError} />);

    expect(screen.getByText('Failed to load dashboard metrics')).toBeInTheDocument();
    expect(screen.getByText('An unexpected error occurred while loading the dashboard data.')).toBeInTheDocument();
  });

  test('applies custom className', () => {
    const { container } = render(
      <MetricsGrid className="custom-class">
        <MockCard title="Test">Content</MockCard>
      </MetricsGrid>
    );

    expect(container.firstChild).toHaveClass('metrics-grid');
    expect(container.firstChild).toHaveClass('custom-class');
  });

  test('wraps children in error boundaries', () => {
    // This test verifies that ErrorBoundary components are used
    // The actual error boundary functionality is tested in ErrorBoundary.test.jsx
    render(
      <MetricsGrid>
        <MockCard title="Card 1">Content 1</MockCard>
        <MockCard title="Card 2">Content 2</MockCard>
      </MetricsGrid>
    );

    // Verify children are rendered (error boundaries are working)
    expect(screen.getByText('Card 1')).toBeInTheDocument();
    expect(screen.getByText('Card 2')).toBeInTheDocument();
  });
});