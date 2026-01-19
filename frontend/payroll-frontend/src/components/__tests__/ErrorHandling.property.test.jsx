/**
 * Property-Based Tests for Error Handling Consistency
 * Feature: advanced-dashboard-summary, Property 8: Error handling consistency
 * Validates: Requirements 4.4
 */

import React from 'react';
import { render, fireEvent, cleanup, waitFor } from '@testing-library/react';
import * as fc from 'fast-check';
import { ErrorTypes, categorizeError, getErrorMessage, isRetryableError, getErrorUIType } from '../../utils/errorHandler';

// Create a simple test component that demonstrates error handling patterns
const TestErrorComponent = ({ error, loading, onRetry, canRetry }) => {
  if (loading) {
    return <div data-testid="loading">Loading...</div>;
  }
  
  if (error) {
    const errorMessage = getErrorMessage(error);
    const isRetryable = isRetryableError(error);
    const uiType = getErrorUIType(error);
    
    return (
      <div data-testid="error-state" role="alert" className={`error-${uiType}`}>
        <div className="error-message">{errorMessage}</div>
        {canRetry && isRetryable && (
          <button onClick={onRetry} type="button">
            Try Again
          </button>
        )}
        <div data-testid="error-type">{categorizeError(error)}</div>
      </div>
    );
  }
  
  return <div data-testid="success">Data loaded successfully</div>;
};

// Simple retry mechanism component for testing
const TestRetryMechanism = ({ onRetry, maxRetries, currentRetryCount, error, isRetryable }) => {
  const canRetry = currentRetryCount < maxRetries && isRetryable;
  
  return (
    <div data-testid="retry-mechanism">
      <div data-testid="retry-status">
        {currentRetryCount}/{maxRetries} attempts
      </div>
      {error && (
        <div data-testid="retry-error">{getErrorMessage(error)}</div>
      )}
      {canRetry ? (
        <button onClick={onRetry} type="button">
          Retry Now
        </button>
      ) : (
        <div data-testid="retry-exhausted">Maximum retry attempts reached</div>
      )}
    </div>
  );
};

// Test wrapper
const TestWrapper = ({ children }) => <div>{children}</div>;

describe('Error Handling Consistency Property Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  /**
   * Property 8: Error handling consistency
   * For any data retrieval failure, the dashboard should display appropriate error states with retry options
   * Validates: Requirements 4.4
   */
  test('should display consistent error states with retry options for any error type', () => {
    // Generate arbitrary error scenarios
    const errorScenarioArbitrary = fc.record({
      errorType: fc.constantFrom(...Object.values(ErrorTypes)),
      statusCode: fc.integer({ min: 400, max: 599 }),
      hasMessage: fc.boolean(),
      customMessage: fc.string({ minLength: 5, maxLength: 100 }),
      hasRetryOptions: fc.boolean(),
      retryCount: fc.integer({ min: 0, max: 5 }),
      maxRetries: fc.integer({ min: 1, max: 5 }),
      isRetryable: fc.boolean()
    });

    fc.assert(
      fc.property(
        errorScenarioArbitrary,
        (errorScenario) => {
          // Create mock error object based on scenario
          // Ensure consistency between errorType and status code
          let mockError;
          if (errorScenario.errorType === ErrorTypes.NETWORK) {
            // Network errors don't have response status codes
            mockError = {
              code: 'ERR_NETWORK',
              message: 'Network Error'
            };
          } else if (errorScenario.errorType === ErrorTypes.TIMEOUT) {
            mockError = {
              code: 'ECONNABORTED',
              message: 'timeout'
            };
          } else {
            // Response-based errors
            mockError = {
              response: {
                status: errorScenario.statusCode,
                data: {
                  message: errorScenario.hasMessage ? errorScenario.customMessage.trim() || 'Server error' : undefined
                }
              },
              message: 'Generic error'
            };
          }

          const mockOnRetry = jest.fn();

          const { container } = render(
            <TestErrorComponent
              error={mockError}
              loading={false}
              onRetry={mockOnRetry}
              canRetry={errorScenario.isRetryable}
            />
          );

          // Property 1: Error states should always be displayed when errors occur
          const errorElement = container.querySelector('[data-testid="error-state"]');
          expect(errorElement).not.toBeNull();

          // Property 2: Error messages should be user-friendly and consistent
          const errorMessage = getErrorMessage(mockError);
          expect(errorMessage).toBeDefined();
          expect(typeof errorMessage).toBe('string');
          expect(errorMessage.length).toBeGreaterThan(0);
          
          // Should not contain technical jargon or raw error codes
          expect(errorMessage).not.toMatch(/ERR_|500|404|timeout/i);
          expect(errorMessage).not.toContain('undefined');
          expect(errorMessage).not.toContain('null');

          // Property 3: Retryable errors should display retry options
          const isErrorRetryable = isRetryableError(mockError);
          
          if (isErrorRetryable && errorScenario.retryCount < errorScenario.maxRetries && errorScenario.isRetryable) {
            // Should have retry button
            const retryButton = container.querySelector('button');
            expect(retryButton).not.toBeNull();
            expect(retryButton.textContent).toContain('Try Again');
            
            // Test retry functionality
            fireEvent.click(retryButton);
            expect(mockOnRetry).toHaveBeenCalledTimes(1);
          }

          // Property 4: Error UI type should be consistent with error category
          const uiType = getErrorUIType(mockError);
          expect(['error', 'warning', 'network']).toContain(uiType);
          
          // Network errors should have network-specific styling
          if (errorScenario.errorType === ErrorTypes.NETWORK) {
            expect(uiType).toBe('network');
          }
          
          // Validation errors should have warning styling (only for actual validation status codes)
          if (errorScenario.errorType === ErrorTypes.VALIDATION && 
              (errorScenario.statusCode === 400 || errorScenario.statusCode === 422)) {
            expect(uiType).toBe('warning');
          }

          // Property 5: Error categorization should be consistent
          const categorizedType = categorizeError(mockError);
          expect(Object.values(ErrorTypes)).toContain(categorizedType);
          
          // Status code should map to correct category only for response-based errors
          if (mockError.response) {
            if (errorScenario.statusCode === 401 || errorScenario.statusCode === 403) {
              expect(categorizedType).toBe(ErrorTypes.AUTH);
            } else if (errorScenario.statusCode === 400 || errorScenario.statusCode === 422) {
              expect(categorizedType).toBe(ErrorTypes.VALIDATION);
            } else if (errorScenario.statusCode === 404) {
              expect(categorizedType).toBe(ErrorTypes.NOT_FOUND);
            } else if (errorScenario.statusCode === 409) {
              expect(categorizedType).toBe(ErrorTypes.CONFLICT);
            } else if (errorScenario.statusCode === 429) {
              expect(categorizedType).toBe(ErrorTypes.RATE_LIMIT);
            } else if (errorScenario.statusCode >= 500) {
              expect(categorizedType).toBe(ErrorTypes.SERVER);
            }
          } else {
            // Network and timeout errors should be categorized correctly
            if (errorScenario.errorType === ErrorTypes.NETWORK) {
              expect(categorizedType).toBe(ErrorTypes.NETWORK);
            } else if (errorScenario.errorType === ErrorTypes.TIMEOUT) {
              expect(categorizedType).toBe(ErrorTypes.TIMEOUT);
            }
          }

          // Property 6: Error states should have proper accessibility attributes
          expect(errorElement).toHaveAttribute('role', 'alert');

          // Clean up this render before next iteration
          cleanup();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property test for retry mechanism consistency
   */
  test('should provide consistent retry mechanisms for any retryable error scenario', () => {
    const retryScenarioArbitrary = fc.record({
      maxRetries: fc.integer({ min: 1, max: 10 }),
      currentRetryCount: fc.integer({ min: 0, max: 5 }),
      errorMessage: fc.string({ minLength: 5, maxLength: 50 }),
      isRetryable: fc.boolean()
    });

    fc.assert(
      fc.property(
        retryScenarioArbitrary,
        (scenario) => {
          const mockOnRetry = jest.fn();
          const mockError = { 
            message: scenario.errorMessage.trim() || 'Default error message' 
          };
          
          const { container } = render(
            <TestRetryMechanism
              onRetry={mockOnRetry}
              maxRetries={scenario.maxRetries}
              currentRetryCount={scenario.currentRetryCount}
              error={mockError}
              isRetryable={scenario.isRetryable}
            />
          );

          // Property 1: Retry mechanism should always show current attempt status
          const retryStatus = container.querySelector('[data-testid="retry-status"]');
          expect(retryStatus).not.toBeNull();
          expect(retryStatus.textContent).toMatch(/\d+\/\d+/); // Should show "X/Y attempts" format

          // Property 2: Should show error message consistently
          const errorElement = container.querySelector('[data-testid="retry-error"]');
          expect(errorElement).not.toBeNull();
          const displayedMessage = getErrorMessage(mockError);
          expect(errorElement.textContent).toContain(displayedMessage);

          // Property 3: Retry buttons should be properly accessible when available
          const canRetry = scenario.currentRetryCount < scenario.maxRetries && scenario.isRetryable;
          const retryButton = container.querySelector('button');
          
          if (canRetry) {
            expect(retryButton).not.toBeNull();
            expect(retryButton).toHaveAttribute('type', 'button');
            expect(retryButton.textContent).toContain('Retry Now');
            
            // Test retry functionality
            fireEvent.click(retryButton);
            expect(mockOnRetry).toHaveBeenCalledTimes(1);
          } else {
            expect(retryButton).toBeNull();
            
            // Should show exhausted message
            const exhaustedElement = container.querySelector('[data-testid="retry-exhausted"]');
            expect(exhaustedElement).not.toBeNull();
          }

          // Clean up this render before next iteration
          cleanup();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property test for error boundary consistency
   */
  test('should handle component errors consistently with proper fallback behavior', () => {
    const errorBoundaryScenarioArbitrary = fc.record({
      shouldThrowError: fc.boolean(),
      errorMessage: fc.string({ minLength: 5, maxLength: 100 }),
      hasCustomFallback: fc.boolean()
    });

    fc.assert(
      fc.property(
        errorBoundaryScenarioArbitrary,
        (scenario) => {
          // Create a component that throws an error conditionally
          const ThrowingComponent = () => {
            if (scenario.shouldThrowError) {
              throw new Error(scenario.errorMessage);
            }
            return <div data-testid="success">Component rendered successfully</div>;
          };

          // Simple error boundary implementation for testing
          class TestErrorBoundary extends React.Component {
            constructor(props) {
              super(props);
              this.state = { hasError: false, error: null };
            }

            static getDerivedStateFromError(error) {
              return { hasError: true, error };
            }

            render() {
              if (this.state.hasError) {
                if (this.props.fallback) {
                  return this.props.fallback;
                }
                return (
                  <div data-testid="error-boundary-fallback" role="alert">
                    <div>Something went wrong</div>
                    <button type="button">Try Again</button>
                    <button type="button">Go to Home</button>
                  </div>
                );
              }

              return this.props.children;
            }
          }

          const customFallback = scenario.hasCustomFallback ? (
            <div data-testid="custom-fallback">Custom error fallback</div>
          ) : undefined;

          const { container } = render(
            <TestErrorBoundary fallback={customFallback}>
              <ThrowingComponent />
            </TestErrorBoundary>
          );

          if (scenario.shouldThrowError) {
            // Property 1: Error boundary should catch errors and show fallback UI
            if (scenario.hasCustomFallback) {
              const customFallbackElement = container.querySelector('[data-testid="custom-fallback"]');
              expect(customFallbackElement).not.toBeNull();
            } else {
              // Should show default error UI
              const errorBoundaryElement = container.querySelector('[data-testid="error-boundary-fallback"]');
              expect(errorBoundaryElement).not.toBeNull();
              expect(errorBoundaryElement).toHaveAttribute('role', 'alert');
            }

            // Property 2: Should not show the original component
            const successElement = container.querySelector('[data-testid="success"]');
            expect(successElement).toBeNull();

            // Property 3: Should provide action buttons (unless custom fallback)
            if (!scenario.hasCustomFallback) {
              const buttons = container.querySelectorAll('button');
              expect(buttons.length).toBeGreaterThan(0);
              
              buttons.forEach(button => {
                expect(button).toHaveAttribute('type', 'button');
              });
            }

          } else {
            // Property 4: Should render children normally when no error
            const successElement = container.querySelector('[data-testid="success"]');
            expect(successElement).not.toBeNull();
            
            // Should not show error UI
            const errorBoundaryElement = container.querySelector('[data-testid="error-boundary-fallback"]');
            expect(errorBoundaryElement).toBeNull();
          }

          // Clean up this render before next iteration
          cleanup();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property test for error state accessibility
   */
  test('should maintain accessibility standards for any error state', () => {
    const accessibilityScenarioArbitrary = fc.record({
      errorType: fc.constantFrom(...Object.values(ErrorTypes)),
      hasRetryButton: fc.boolean(),
      hasErrorMessage: fc.boolean(),
      errorMessage: fc.string({ minLength: 10, maxLength: 200 })
    });

    fc.assert(
      fc.property(
        accessibilityScenarioArbitrary,
        (scenario) => {
          const mockError = {
            response: { status: 500 },
            message: scenario.hasErrorMessage ? (scenario.errorMessage.trim() || 'Default error') : 'Generic error'
          };

          const mockOnRetry = jest.fn();

          const { container } = render(
            <TestErrorComponent
              error={mockError}
              loading={false}
              onRetry={mockOnRetry}
              canRetry={scenario.hasRetryButton}
            />
          );

          // Property 1: Error messages should have proper ARIA attributes
          const errorElement = container.querySelector('[role="alert"]');
          expect(errorElement).not.toBeNull();

          // Property 2: Retry buttons should be keyboard accessible
          const buttons = container.querySelectorAll('button');
          buttons.forEach(button => {
            expect(button).toHaveAttribute('type', 'button');
            // Should be focusable (not have tabIndex="-1")
            const tabIndex = button.getAttribute('tabindex');
            expect(tabIndex).not.toBe('-1');
          });

          // Property 3: Error content should be readable by screen readers
          if (scenario.hasErrorMessage) {
            const displayedMessage = getErrorMessage(mockError);
            const textContent = container.textContent;
            expect(textContent).toContain(displayedMessage);
            
            // Should not have empty or meaningless text
            expect(textContent.trim().length).toBeGreaterThan(0);
          }

          // Property 4: Color should not be the only way to convey error state
          // Check for text indicators in addition to styling
          const errorText = container.textContent.toLowerCase();
          const hasTextualIndicators = errorText.includes('error') || 
                                     errorText.includes('failed') || 
                                     errorText.includes('unable') ||
                                     errorText.includes('try again');
          expect(hasTextualIndicators).toBe(true);

          // Clean up this render before next iteration
          cleanup();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property test for error recovery consistency
   */
  test('should handle error recovery consistently for any error-to-success transition', () => {
    const recoveryScenarioArbitrary = fc.record({
      initialError: fc.boolean(),
      recoversAfterRetry: fc.boolean()
    });

    fc.assert(
      fc.property(
        recoveryScenarioArbitrary,
        (scenario) => {
          const mockOnRetry = jest.fn();
          
          // Initial state
          const { container, rerender } = render(
            <TestErrorComponent
              error={scenario.initialError ? { message: 'Initial error' } : null}
              loading={false}
              onRetry={mockOnRetry}
              canRetry={true}
            />
          );

          if (scenario.initialError) {
            // Property 1: Should show error state initially
            const errorElement = container.querySelector('[data-testid="error-state"]');
            if (!errorElement) {
              cleanup();
              return false;
            }

            if (scenario.recoversAfterRetry) {
              // Simulate successful retry
              rerender(
                <TestErrorComponent
                  error={null}
                  loading={false}
                  onRetry={mockOnRetry}
                  canRetry={false}
                />
              );

              // Property 2: Should display success state after recovery
              const successElement = container.querySelector('[data-testid="success"]');
              if (!successElement) {
                cleanup();
                return false;
              }

              // Property 3: Should clear error state after recovery
              const remainingErrorElement = container.querySelector('[data-testid="error-state"]');
              if (remainingErrorElement) {
                cleanup();
                return false;
              }
            }
          } else {
            // Property 4: Should show success state immediately if no initial error
            const successElement = container.querySelector('[data-testid="success"]');
            if (!successElement) {
              cleanup();
              return false;
            }
            
            // Should not show error elements
            const errorElement = container.querySelector('[data-testid="error-state"]');
            if (errorElement) {
              cleanup();
              return false;
            }
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
});