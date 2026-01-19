/**
 * Property-Based Tests for Loading State Management
 * Feature: advanced-dashboard-summary, Property 9: Loading state management
 * Validates: Requirements 5.5
 */

import React from 'react';
import { render, cleanup, waitFor } from '@testing-library/react';
import * as fc from 'fast-check';
import { CardSkeleton, MetricsGridSkeleton, PageSkeleton } from '../LoadingSkeleton';

// Test component that demonstrates loading state patterns
const TestLoadingComponent = ({ loading, data, error, children }) => {
  if (loading) {
    return (
      <div data-testid="loading-state">
        <CardSkeleton />
      </div>
    );
  }
  
  if (error) {
    return (
      <div data-testid="error-state" role="alert">
        Error: {error.message}
      </div>
    );
  }
  
  if (data) {
    return (
      <div data-testid="loaded-state">
        {children || <div>Data loaded: {JSON.stringify(data)}</div>}
      </div>
    );
  }
  
  // Handle empty state (no loading, no error, no data)
  return (
    <div data-testid="empty-state">
      {children || <div>No data available</div>}
    </div>
  );
};

// Test component for metrics grid loading behavior
const TestMetricsGridLoading = ({ loading, error, children }) => {
  if (loading) {
    return (
      <div className="metrics-grid" data-testid="loading-grid">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="metrics-grid" data-testid="error-grid">
        <div role="alert">Dashboard Metrics Unavailable</div>
      </div>
    );
  }
  
  return (
    <div className="metrics-grid" data-testid="normal-grid">
      {children}
    </div>
  );
};

describe('Loading State Management Property Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  /**
   * Property 9: Loading state management
   * For any data fetching operation, the dashboard should display loading states while data is being retrieved
   * Validates: Requirements 5.5
   */
  test('should display consistent loading states for any data fetching scenario', () => {
    // Generate arbitrary loading scenarios
    const loadingScenarioArbitrary = fc.record({
      isLoading: fc.boolean(),
      hasData: fc.boolean(),
      hasError: fc.boolean(),
      loadingDuration: fc.integer({ min: 0, max: 5000 }),
      dataType: fc.constantFrom('payroll', 'employee', 'pending', 'metrics'),
      errorMessage: fc.string({ minLength: 5, maxLength: 100 })
    });

    fc.assert(
      fc.property(
        loadingScenarioArbitrary,
        (scenario) => {
          const mockData = scenario.hasData ? {
            payroll: { amount: 50000, employeeCount: 10 },
            employee: { count: 8, totalEmployees: 10 },
            pending: { count: 3, types: ['approval'] },
            metrics: { lastUpdated: new Date().toISOString() }
          }[scenario.dataType] : null;

          const mockError = scenario.hasError ? {
            message: scenario.errorMessage.trim() || 'Default error message'
          } : null;

          const { container } = render(
            <TestLoadingComponent
              loading={scenario.isLoading}
              data={mockData}
              error={mockError}
            />
          );

          // Property 1: Loading states should be displayed when loading is true
          if (scenario.isLoading) {
            const loadingElement = container.querySelector('[data-testid="loading-state"]');
            expect(loadingElement).not.toBeNull();
            
            // Should contain skeleton loader
            const skeletonElement = container.querySelector('.animate-pulse');
            expect(skeletonElement).not.toBeNull();
            
            // Should not show data or error states while loading
            const dataElement = container.querySelector('[data-testid="loaded-state"]');
            const errorElement = container.querySelector('[data-testid="error-state"]');
            expect(dataElement).toBeNull();
            expect(errorElement).toBeNull();
          }

          // Property 2: Error states should be displayed when error exists and not loading
          if (scenario.hasError && !scenario.isLoading) {
            const errorElement = container.querySelector('[data-testid="error-state"]');
            expect(errorElement).not.toBeNull();
            expect(errorElement).toHaveAttribute('role', 'alert');
            
            // Should not show loading or data states
            const loadingElement = container.querySelector('[data-testid="loading-state"]');
            const dataElement = container.querySelector('[data-testid="loaded-state"]');
            expect(loadingElement).toBeNull();
            expect(dataElement).toBeNull();
          }

          // Property 3: Data states should be displayed when data exists and not loading/error
          if (scenario.hasData && !scenario.isLoading && !scenario.hasError) {
            const dataElement = container.querySelector('[data-testid="loaded-state"]');
            expect(dataElement).not.toBeNull();
            
            // Should not show loading or error states
            const loadingElement = container.querySelector('[data-testid="loading-state"]');
            const errorElement = container.querySelector('[data-testid="error-state"]');
            expect(loadingElement).toBeNull();
            expect(errorElement).toBeNull();
          }

          // Property 3b: Empty states should be displayed when no data, loading, or error
          if (!scenario.hasData && !scenario.isLoading && !scenario.hasError) {
            const emptyElement = container.querySelector('[data-testid="empty-state"]');
            expect(emptyElement).not.toBeNull();
            
            // Should not show other states
            const loadingElement = container.querySelector('[data-testid="loading-state"]');
            const errorElement = container.querySelector('[data-testid="error-state"]');
            const dataElement = container.querySelector('[data-testid="loaded-state"]');
            expect(loadingElement).toBeNull();
            expect(errorElement).toBeNull();
            expect(dataElement).toBeNull();
          }

          // Property 4: Only one state should be active at a time
          const loadingElement = container.querySelector('[data-testid="loading-state"]');
          const dataElement = container.querySelector('[data-testid="loaded-state"]');
          const errorElement = container.querySelector('[data-testid="error-state"]');
          const emptyElement = container.querySelector('[data-testid="empty-state"]');
          
          const activeStates = [loadingElement, dataElement, errorElement, emptyElement].filter(el => el !== null);
          expect(activeStates.length).toBe(1); // Exactly one state should be active

          // Clean up this render before next iteration
          cleanup();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property test for skeleton loader consistency
   */
  test('should render consistent skeleton loaders for any loading configuration', () => {
    const skeletonConfigArbitrary = fc.record({
      skeletonType: fc.constantFrom('card', 'grid', 'page'),
      cardCount: fc.integer({ min: 1, max: 5 }),
      hasAnimation: fc.boolean(),
      customClassName: fc.string({ minLength: 0, maxLength: 50 })
    });

    fc.assert(
      fc.property(
        skeletonConfigArbitrary,
        (config) => {
          let SkeletonComponent;
          let props = {};

          switch (config.skeletonType) {
            case 'card':
              SkeletonComponent = CardSkeleton;
              props = { className: config.customClassName.trim() };
              break;
            case 'grid':
              SkeletonComponent = MetricsGridSkeleton;
              props = { 
                cardCount: config.cardCount,
                className: config.customClassName.trim()
              };
              break;
            case 'page':
              SkeletonComponent = PageSkeleton;
              props = { className: config.customClassName.trim() };
              break;
            default:
              SkeletonComponent = CardSkeleton;
              props = {};
          }

          const { container } = render(<SkeletonComponent {...props} />);

          // Property 1: All skeleton loaders should have pulse animation
          const animatedElements = container.querySelectorAll('.animate-pulse');
          expect(animatedElements.length).toBeGreaterThan(0);

          // Property 2: Skeleton structure should be consistent
          if (config.skeletonType === 'grid') {
            // Grid should contain multiple card skeletons
            const gridElement = container.querySelector('.metrics-grid');
            expect(gridElement).not.toBeNull();
            
            // Should have the correct number of cards
            const cardElements = container.querySelectorAll('.card');
            expect(cardElements.length).toBe(config.cardCount);
          }

          // Property 3: Skeleton elements should have proper styling classes
          const skeletonElements = container.querySelectorAll('[class*="animate-pulse"]');
          skeletonElements.forEach(element => {
            // Should have background styling for visibility
            const hasBackgroundClass = element.className.includes('bg-') || 
                                     element.className.includes('from-') ||
                                     element.className.includes('gradient');
            expect(hasBackgroundClass).toBe(true);
            
            // Should have rounded corners for visual consistency
            const hasRoundedClass = element.className.includes('rounded');
            expect(hasRoundedClass).toBe(true);
          });

          // Property 4: Custom classes should be applied correctly
          if (config.customClassName.trim()) {
            const rootElement = container.firstChild;
            expect(rootElement.className).toContain(config.customClassName.trim());
          }

          // Clean up this render before next iteration
          cleanup();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property test for metrics grid loading behavior
   */
  test('should handle metrics grid loading states consistently for any card configuration', () => {
    const metricsGridScenarioArbitrary = fc.record({
      loading: fc.boolean(),
      hasError: fc.boolean(),
      cardCount: fc.integer({ min: 1, max: 5 }),
      errorMessage: fc.string({ minLength: 5, maxLength: 100 }),
      cardTypes: fc.array(
        fc.constantFrom('payroll', 'employee', 'pending'),
        { minLength: 1, maxLength: 3 }
      )
    });

    fc.assert(
      fc.property(
        metricsGridScenarioArbitrary,
        (scenario) => {
          const mockError = scenario.hasError ? {
            message: scenario.errorMessage.trim() || 'Grid error'
          } : null;

          // Create mock card components
          const mockCards = scenario.cardTypes.map((type, index) => (
            <div key={index} data-testid={`${type}-card`} className="card">
              {type} card content
            </div>
          ));

          const { container } = render(
            <TestMetricsGridLoading
              loading={scenario.loading}
              error={mockError}
            >
              {mockCards}
            </TestMetricsGridLoading>
          );

          // Property 1: Loading state should show skeleton loaders
          if (scenario.loading) {
            const skeletonElements = container.querySelectorAll('.animate-pulse');
            expect(skeletonElements.length).toBeGreaterThan(0);
            
            // Should not show actual card content
            scenario.cardTypes.forEach(type => {
              const cardElement = container.querySelector(`[data-testid="${type}-card"]`);
              expect(cardElement).toBeNull();
            });
          }

          // Property 2: Error state should show error message
          if (scenario.hasError && !scenario.loading) {
            const errorElement = container.querySelector('[role="alert"]');
            expect(errorElement).not.toBeNull();
            
            // Should contain error message
            expect(container.textContent).toContain('Dashboard Metrics Unavailable');
            
            // Should not show cards or loading skeletons
            const skeletonElements = container.querySelectorAll('.animate-pulse');
            expect(skeletonElements.length).toBe(0);
          }

          // Property 3: Normal state should show all cards
          if (!scenario.loading && !scenario.hasError) {
            scenario.cardTypes.forEach(type => {
              const cardElement = container.querySelector(`[data-testid="${type}-card"]`);
              expect(cardElement).not.toBeNull();
            });
            
            // Should not show loading or error states
            const errorElement = container.querySelector('[role="alert"]');
            expect(errorElement).toBeNull();
          }

          // Property 4: Grid container should always be present
          const gridElement = container.querySelector('.metrics-grid');
          expect(gridElement).not.toBeNull();

          // Clean up this render before next iteration
          cleanup();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property test for individual card loading states
   */
  test('should handle individual card loading states consistently for any card type', () => {
    const cardLoadingScenarioArbitrary = fc.record({
      cardType: fc.constantFrom('payroll', 'employee', 'pending'),
      loading: fc.boolean(),
      hasError: fc.boolean(),
      hasData: fc.boolean(),
      errorMessage: fc.string({ minLength: 5, maxLength: 50 }),
      cardData: fc.record({
        amount: fc.integer({ min: 0, max: 1000000 }),
        count: fc.integer({ min: 0, max: 1000 }),
        month: fc.integer({ min: 1, max: 12 }),
        year: fc.integer({ min: 2020, max: 2030 })
      })
    });

    fc.assert(
      fc.property(
        cardLoadingScenarioArbitrary,
        (scenario) => {
          const mockError = scenario.hasError ? {
            message: scenario.errorMessage.trim() || 'Card error'
          } : null;

          // Simple card component for testing
          const TestCard = ({ loading, error, data, cardType }) => {
            if (loading) {
              return (
                <div className="card" data-testid={`${cardType}-card`}>
                  <div className="animate-pulse bg-gray-200 h-4 w-full rounded"></div>
                </div>
              );
            }
            
            if (error) {
              return (
                <div className="card" data-testid={`${cardType}-card`}>
                  <div role="alert">Error loading {cardType} data</div>
                </div>
              );
            }
            
            return (
              <div className="card" data-testid={`${cardType}-card`}>
                <div>Data: {JSON.stringify(data)}</div>
              </div>
            );
          };

          const cardData = scenario.hasData ? scenario.cardData : null;

          const { container } = render(
            <TestCard
              loading={scenario.loading}
              error={mockError}
              data={cardData}
              cardType={scenario.cardType}
            />
          );

          // Property 1: Loading state should show skeleton or loading indicator
          if (scenario.loading) {
            // Should have loading visual indicators
            const loadingIndicators = container.querySelectorAll('.animate-pulse');
            expect(loadingIndicators.length).toBeGreaterThan(0);
          }

          // Property 2: Error state should show error message when not loading
          if (scenario.hasError && !scenario.loading) {
            // Should contain error indication
            const alertElement = container.querySelector('[role="alert"]');
            expect(alertElement).not.toBeNull();
          }

          // Property 3: Normal state should show data when available and not loading/error
          if (scenario.hasData && !scenario.loading && !scenario.hasError) {
            // Should display actual data values
            const cardElement = container.querySelector('.card');
            expect(cardElement).not.toBeNull();
            
            // Should not have loading indicators
            const loadingIndicators = container.querySelectorAll('.animate-pulse');
            expect(loadingIndicators.length).toBe(0);
          }

          // Property 4: Card structure should be consistent regardless of state
          const cardElement = container.querySelector('.card');
          expect(cardElement).not.toBeNull();

          // Property 5: Card should have proper test id
          const cardWithTestId = container.querySelector(`[data-testid="${scenario.cardType}-card"]`);
          expect(cardWithTestId).not.toBeNull();

          // Clean up this render before next iteration
          cleanup();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property test for loading state transitions
   */
  test('should handle loading state transitions consistently for any sequence of state changes', () => {
    const stateTransitionArbitrary = fc.record({
      initialState: fc.record({
        loading: fc.boolean(),
        hasData: fc.boolean(),
        hasError: fc.boolean()
      }),
      transitions: fc.array(
        fc.record({
          loading: fc.boolean(),
          hasData: fc.boolean(),
          hasError: fc.boolean(),
          delay: fc.integer({ min: 0, max: 100 })
        }),
        { minLength: 1, maxLength: 3 } // Reduced for simpler testing
      )
    });

    fc.assert(
      fc.property(
        stateTransitionArbitrary,
        (scenario) => {
          const mockData = { test: 'data' };
          const mockError = { message: 'Test error' };

          // Start with initial state
          const { container, rerender } = render(
            <TestLoadingComponent
              loading={scenario.initialState.loading}
              data={scenario.initialState.hasData ? mockData : null}
              error={scenario.initialState.hasError ? mockError : null}
            />
          );

          // Verify initial state
          if (scenario.initialState.loading) {
            expect(container.querySelector('[data-testid="loading-state"]')).not.toBeNull();
          } else if (scenario.initialState.hasError) {
            expect(container.querySelector('[data-testid="error-state"]')).not.toBeNull();
          } else if (scenario.initialState.hasData) {
            expect(container.querySelector('[data-testid="loaded-state"]')).not.toBeNull();
          } else {
            // Handle the case where no state is active (empty state)
            expect(container.querySelector('[data-testid="empty-state"]')).not.toBeNull();
          }

          // Apply transitions
          for (const transition of scenario.transitions) {
            rerender(
              <TestLoadingComponent
                loading={transition.loading}
                data={transition.hasData ? mockData : null}
                error={transition.hasError ? mockError : null}
              />
            );

            // Property 1: State should update correctly after each transition
            if (transition.loading) {
              expect(container.querySelector('[data-testid="loading-state"]')).not.toBeNull();
              expect(container.querySelector('[data-testid="error-state"]')).toBeNull();
              expect(container.querySelector('[data-testid="loaded-state"]')).toBeNull();
              expect(container.querySelector('[data-testid="empty-state"]')).toBeNull();
            } else if (transition.hasError) {
              expect(container.querySelector('[data-testid="error-state"]')).not.toBeNull();
              expect(container.querySelector('[data-testid="loading-state"]')).toBeNull();
              expect(container.querySelector('[data-testid="loaded-state"]')).toBeNull();
              expect(container.querySelector('[data-testid="empty-state"]')).toBeNull();
            } else if (transition.hasData) {
              expect(container.querySelector('[data-testid="loaded-state"]')).not.toBeNull();
              expect(container.querySelector('[data-testid="loading-state"]')).toBeNull();
              expect(container.querySelector('[data-testid="error-state"]')).toBeNull();
              expect(container.querySelector('[data-testid="empty-state"]')).toBeNull();
            } else {
              // Handle empty state - no loading, no error, no data
              expect(container.querySelector('[data-testid="empty-state"]')).not.toBeNull();
              expect(container.querySelector('[data-testid="loading-state"]')).toBeNull();
              expect(container.querySelector('[data-testid="error-state"]')).toBeNull();
              expect(container.querySelector('[data-testid="loaded-state"]')).toBeNull();
            }

            // Property 2: Only one state should be active at any time
            const activeStates = [
              container.querySelector('[data-testid="loading-state"]'),
              container.querySelector('[data-testid="error-state"]'),
              container.querySelector('[data-testid="loaded-state"]'),
              container.querySelector('[data-testid="empty-state"]')
            ].filter(el => el !== null);
            
            expect(activeStates.length).toBe(1); // Exactly one state should be active
          }

          // Clean up this render before next iteration
          cleanup();
          
          // Return true to indicate property passed
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property test for loading state accessibility
   */
  test('should maintain accessibility standards for any loading state configuration', () => {
    const accessibilityScenarioArbitrary = fc.record({
      loading: fc.boolean(),
      hasScreenReaderText: fc.boolean(),
      hasAriaLabel: fc.boolean(),
      ariaLabel: fc.string({ minLength: 5, maxLength: 50 }),
      hasLiveRegion: fc.boolean()
    });

    fc.assert(
      fc.property(
        accessibilityScenarioArbitrary,
        (scenario) => {
          const LoadingComponentWithA11y = ({ loading, ariaLabel, hasLiveRegion }) => {
            if (loading) {
              return (
                <div 
                  data-testid="loading-state"
                  aria-label={ariaLabel}
                  aria-live={hasLiveRegion ? "polite" : undefined}
                  role="status"
                >
                  <CardSkeleton />
                  {scenario.hasScreenReaderText && (
                    <span className="sr-only">Loading dashboard data...</span>
                  )}
                </div>
              );
            }
            return <div data-testid="loaded-state">Content loaded</div>;
          };

          const { container } = render(
            <LoadingComponentWithA11y
              loading={scenario.loading}
              ariaLabel={scenario.hasAriaLabel ? (scenario.ariaLabel.trim() || 'Loading') : undefined}
              hasLiveRegion={scenario.hasLiveRegion}
            />
          );

          if (scenario.loading) {
            const loadingElement = container.querySelector('[data-testid="loading-state"]');
            expect(loadingElement).not.toBeNull();

            // Property 1: Loading states should have proper ARIA roles
            expect(loadingElement).toHaveAttribute('role', 'status');

            // Property 2: Should have aria-label when provided
            if (scenario.hasAriaLabel && scenario.ariaLabel.trim()) {
              expect(loadingElement).toHaveAttribute('aria-label');
            }

            // Property 3: Should have live region when specified
            if (scenario.hasLiveRegion) {
              expect(loadingElement).toHaveAttribute('aria-live', 'polite');
            }

            // Property 4: Should have screen reader text when provided
            if (scenario.hasScreenReaderText) {
              const srText = container.querySelector('.sr-only');
              expect(srText).not.toBeNull();
              expect(srText.textContent.trim().length).toBeGreaterThan(0);
            }

            // Property 5: Loading animations should not cause accessibility issues
            const animatedElements = container.querySelectorAll('.animate-pulse');
            animatedElements.forEach(element => {
              // Should not have reduced-motion conflicts
              expect(element.className).not.toContain('motion-reduce');
            });
          }

          // Clean up this render before next iteration
          cleanup();
        }
      ),
      { numRuns: 100 }
    );
  });
});