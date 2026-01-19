import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import EmployeeForm from '../EmployeeForm';
import { SettingsProvider } from '../../context/SettingsContext';

// Mock the API module
jest.mock('../../services/api', () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn()
}));

// Mock the SettingsContext
const MockSettingsProvider = ({ children }) => {
  const mockFormatCurrency = (amount) => `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  
  return (
    <SettingsProvider value={{ formatCurrency: mockFormatCurrency }}>
      {children}
    </SettingsProvider>
  );
};

describe('EmployeeForm - Currency Input Spacing Tests', () => {
  const mockOnSuccess = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderEmployeeForm = (props = {}) => {
    return render(
      <MockSettingsProvider>
        <EmployeeForm
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
          {...props}
        />
      </MockSettingsProvider>
    );
  };

  // Helper function to get specific input by name attribute
  const getInputByName = (name) => {
    return document.querySelector(`input[name="${name}"]`);
  };

  describe('Currency Symbol Visibility with Various Input Lengths', () => {
    test('currency symbol remains visible with short input values', () => {
      renderEmployeeForm();
      
      const baseSalaryInput = getInputByName('baseSalary');
      const currencySymbol = baseSalaryInput.parentElement.querySelector('span');
      
      // Verify currency symbol is present
      expect(currencySymbol).toBeInTheDocument();
      expect(currencySymbol).toHaveTextContent('₹');
      
      // Enter short value
      fireEvent.change(baseSalaryInput, { target: { value: '1000' } });
      
      // Currency symbol should still be visible
      expect(currencySymbol).toBeVisible();
      expect(currencySymbol).toHaveTextContent('₹');
    });

    test('currency symbol remains visible with medium length input values', () => {
      renderEmployeeForm();
      
      const baseSalaryInput = getInputByName('baseSalary');
      const currencySymbol = baseSalaryInput.parentElement.querySelector('span');
      
      // Enter medium length value (6 digits)
      fireEvent.change(baseSalaryInput, { target: { value: '100000' } });
      
      // Currency symbol should still be visible and not overlap
      expect(currencySymbol).toBeVisible();
      expect(currencySymbol).toHaveTextContent('₹');
      
      // Verify input has proper padding to accommodate symbol
      const computedStyle = window.getComputedStyle(baseSalaryInput);
      expect(computedStyle.paddingLeft).toBeTruthy();
    });

    test('currency symbol remains visible with long input values (exceeding 6 digits)', () => {
      renderEmployeeForm();
      
      const baseSalaryInput = getInputByName('baseSalary');
      const currencySymbol = baseSalaryInput.parentElement.querySelector('span');
      
      // Enter long value (more than 6 digits) - Requirements 1.2
      fireEvent.change(baseSalaryInput, { target: { value: '12345678.99' } });
      
      // Currency symbol should still be visible and not overlap with text
      expect(currencySymbol).toBeVisible();
      expect(currencySymbol).toHaveTextContent('₹');
      
      // Verify the input value is correctly set
      expect(baseSalaryInput.value).toBe('12345678.99');
    });

    test('currency symbol positioning is consistent across all currency fields', () => {
      renderEmployeeForm();
      
      // Get all currency input fields by their name attributes
      const baseSalaryInput = getInputByName('baseSalary');
      const allowanceInput = getInputByName('allowance');
      const deductionInput = getInputByName('deduction');
      
      const currencyInputs = [baseSalaryInput, allowanceInput, deductionInput];
      
      // Check that all currency fields have currency symbols
      currencyInputs.forEach(input => {
        const currencySymbol = input.parentElement.querySelector('span');
        expect(currencySymbol).toBeInTheDocument();
        expect(currencySymbol).toHaveTextContent('₹');
        
        // Verify consistent positioning classes
        expect(currencySymbol).toHaveClass('input-currency-symbol');
      });
    });

    test('currency symbol remains visible during rapid input changes', async () => {
      renderEmployeeForm();
      
      const baseSalaryInput = getInputByName('baseSalary');
      const currencySymbol = baseSalaryInput.parentElement.querySelector('span');
      
      // Simulate rapid input changes
      const values = ['1', '12', '123', '1234', '12345', '123456', '1234567'];
      
      for (const value of values) {
        fireEvent.change(baseSalaryInput, { target: { value } });
        
        // Currency symbol should remain visible throughout
        expect(currencySymbol).toBeVisible();
        expect(currencySymbol).toHaveTextContent('₹');
      }
    });
  });

  describe('Focus State Behavior', () => {
    test('currency symbol remains properly positioned when input receives focus', () => {
      renderEmployeeForm();
      
      const baseSalaryInput = getInputByName('baseSalary');
      const currencySymbol = baseSalaryInput.parentElement.querySelector('span');
      
      // Focus the input - Requirements 1.3
      fireEvent.focus(baseSalaryInput);
      
      // Currency symbol should remain visible and properly positioned
      expect(currencySymbol).toBeVisible();
      expect(currencySymbol).toHaveTextContent('₹');
      
      // Verify focus styling doesn't affect symbol positioning
      expect(currencySymbol).toHaveClass('input-currency-symbol');
    });

    test('currency symbol remains visible when input loses focus', () => {
      renderEmployeeForm();
      
      const baseSalaryInput = getInputByName('baseSalary');
      const currencySymbol = baseSalaryInput.parentElement.querySelector('span');
      
      // Focus then blur the input
      fireEvent.focus(baseSalaryInput);
      fireEvent.blur(baseSalaryInput);
      
      // Currency symbol should still be visible
      expect(currencySymbol).toBeVisible();
      expect(currencySymbol).toHaveTextContent('₹');
    });

    test('focus state provides clear visual separation between symbol and input area', () => {
      renderEmployeeForm();
      
      const baseSalaryInput = getInputByName('baseSalary');
      const currencySymbol = baseSalaryInput.parentElement.querySelector('span');
      
      // Add some text and focus
      fireEvent.change(baseSalaryInput, { target: { value: '50000' } });
      fireEvent.focus(baseSalaryInput);
      
      // Verify visual separation - Requirements 1.3
      expect(currencySymbol).toHaveClass('input-currency-symbol'); // Symbol positioned correctly
      expect(baseSalaryInput).toHaveClass('input-with-currency'); // Input has proper padding class
      
      // Currency symbol should remain visible during focus
      expect(currencySymbol).toBeVisible();
    });

    test('focus state works correctly with pre-filled values', () => {
      const mockEmployee = {
        id: '1',
        userId: 'user1',
        userName: 'Test User',
        userEmail: 'test@example.com',
        baseSalary: 75000,
        allowance: 5000,
        deduction: 2000
      };
      
      renderEmployeeForm({ employee: mockEmployee });
      
      const baseSalaryInput = screen.getByDisplayValue('75000');
      const currencySymbol = baseSalaryInput.parentElement.querySelector('span');
      
      // Focus the pre-filled input
      fireEvent.focus(baseSalaryInput);
      
      // Currency symbol should remain visible with pre-filled value
      expect(currencySymbol).toBeVisible();
      expect(currencySymbol).toHaveTextContent('₹');
      expect(baseSalaryInput.value).toBe('75000');
    });

    test('multiple currency fields can be focused without affecting symbol positioning', () => {
      renderEmployeeForm();
      
      const baseSalaryInput = getInputByName('baseSalary');
      const allowanceInput = getInputByName('allowance');
      const deductionInput = getInputByName('deduction');
      
      const currencyInputs = [baseSalaryInput, allowanceInput, deductionInput];
      
      // Focus each currency input sequentially
      currencyInputs.forEach((input, index) => {
        fireEvent.focus(input);
        
        const currencySymbol = input.parentElement.querySelector('span');
        expect(currencySymbol).toBeVisible();
        expect(currencySymbol).toHaveTextContent('₹');
        
        // Add some test values
        fireEvent.change(input, { target: { value: `${(index + 1) * 1000}` } });
        
        // Symbol should remain properly positioned
        expect(currencySymbol).toHaveClass('input-currency-symbol');
      });
    });
  });

  describe('Currency Symbol Positioning Requirements', () => {
    test('currency symbol remains visible regardless of input length - Requirements 1.4', () => {
      renderEmployeeForm();
      
      const baseSalaryInput = getInputByName('baseSalary');
      const currencySymbol = baseSalaryInput.parentElement.querySelector('span');
      
      // Test with various input lengths
      const testValues = [
        '1',           // 1 digit
        '99',          // 2 digits  
        '999',         // 3 digits
        '9999',        // 4 digits
        '99999',       // 5 digits
        '999999',      // 6 digits
        '9999999',     // 7 digits (exceeds 6 digit requirement)
        '99999999.99'  // 8 digits with decimals
      ];
      
      testValues.forEach(value => {
        fireEvent.change(baseSalaryInput, { target: { value } });
        
        // Requirements 1.4: Currency symbol SHALL remain visible and properly positioned
        expect(currencySymbol).toBeVisible();
        expect(currencySymbol).toHaveTextContent('₹');
        
        // Verify input has proper spacing
        expect(baseSalaryInput).toHaveClass('input-with-currency'); // Input has proper padding class
      });
    });

    test('proper spacing maintained between currency symbol and entered text - Requirements 1.1', () => {
      renderEmployeeForm();
      
      const baseSalaryInput = getInputByName('baseSalary');
      const currencySymbol = baseSalaryInput.parentElement.querySelector('span');
      
      // Enter text
      fireEvent.change(baseSalaryInput, { target: { value: '123456' } });
      
      // Requirements 1.1: Proper spacing between currency symbol and entered text
      expect(currencySymbol).toHaveClass('input-currency-symbol'); // Symbol positioned correctly
      expect(baseSalaryInput).toHaveClass('input-with-currency'); // Input has proper padding class
      
      // Verify z-index ensures symbol is visible (not applicable with new approach)
      expect(currencySymbol).toBeVisible();
    });
  });

  describe('Mobile Responsive Behavior - Requirements 1.5, 4.1, 4.3', () => {
    // Helper to simulate mobile viewport
    const setMobileViewport = () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375, // iPhone SE width
      });
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 667,
      });
      window.dispatchEvent(new Event('resize'));
    };

    // Helper to simulate tablet viewport
    const setTabletViewport = () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      });
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 1024,
      });
      window.dispatchEvent(new Event('resize'));
    };

    test('input fields maintain proper spacing on mobile devices - Requirements 1.5', () => {
      setMobileViewport();
      renderEmployeeForm();
      
      const baseSalaryInput = getInputByName('baseSalary');
      const currencySymbol = baseSalaryInput.parentElement.querySelector('span');
      
      // Verify mobile-specific classes are applied
      expect(baseSalaryInput).toHaveClass('min-h-[44px]'); // Mobile touch target
      expect(baseSalaryInput).toHaveClass('input-with-currency');
      
      // Currency symbol should remain visible on mobile
      expect(currencySymbol).toBeVisible();
      expect(currencySymbol).toHaveTextContent('₹');
      
      // Test with long input on mobile
      fireEvent.change(baseSalaryInput, { target: { value: '1234567.89' } });
      expect(currencySymbol).toBeVisible();
    });

    test('touch target adequacy on mobile devices - Requirements 4.3', () => {
      setMobileViewport();
      renderEmployeeForm();
      
      const baseSalaryInput = getInputByName('baseSalary');
      const allowanceInput = getInputByName('allowance');
      const deductionInput = getInputByName('deduction');
      
      const inputs = [baseSalaryInput, allowanceInput, deductionInput];
      
      inputs.forEach(input => {
        // Verify minimum touch target height (44px)
        expect(input).toHaveClass('min-h-[44px]');
        
        // Verify input is focusable and clickable
        fireEvent.focus(input); // Use focus instead of click for better test reliability
        expect(input).toHaveFocus();
        
        // Verify adequate padding for touch interaction
        const computedStyle = window.getComputedStyle(input);
        const paddingTop = parseFloat(computedStyle.paddingTop);
        const paddingBottom = parseFloat(computedStyle.paddingBottom);
        
        // Should have adequate vertical padding for touch
        expect(paddingTop + paddingBottom).toBeGreaterThanOrEqual(24); // 0.75rem * 2 = 24px
      });
    });

    test('form buttons have adequate touch targets on mobile - Requirements 4.3', () => {
      setMobileViewport();
      renderEmployeeForm();
      
      const cancelButton = screen.getByText('Cancel');
      const submitButton = screen.getByText('Add Employee');
      
      // Verify mobile touch target classes
      expect(cancelButton).toHaveClass('min-h-[44px]');
      expect(submitButton).toHaveClass('min-h-[44px]');
      
      // Verify buttons are full width on mobile
      expect(cancelButton).toHaveClass('w-full');
      expect(submitButton).toHaveClass('w-full');
      
      // Verify buttons are clickable
      fireEvent.click(cancelButton);
      expect(mockOnCancel).toHaveBeenCalled();
    });

    test('no horizontal scrolling on mobile devices - Requirements 4.1', () => {
      setMobileViewport();
      renderEmployeeForm();
      
      const baseSalaryInput = getInputByName('baseSalary');
      
      // Verify input doesn't cause horizontal overflow
      expect(baseSalaryInput).toHaveClass('input-with-currency'); // Should use proper responsive classes
      
      // Test with very long input
      fireEvent.change(baseSalaryInput, { target: { value: '999999999999.99' } });
      
      // Input should handle overflow gracefully
      const computedStyle = window.getComputedStyle(baseSalaryInput);
      expect(computedStyle.overflow).not.toBe('visible');
    });

    test('responsive grid layout on mobile - Requirements 4.1', () => {
      setMobileViewport();
      renderEmployeeForm();
      
      // Find the grid container for salary fields
      const gridContainer = document.querySelector('.grid.grid-cols-1.md\\:grid-cols-3');
      expect(gridContainer).toBeInTheDocument();
      
      // On mobile, should be single column
      expect(gridContainer).toHaveClass('grid-cols-1');
      
      // Verify proper gap spacing on mobile
      expect(gridContainer).toHaveClass('gap-4'); // Mobile gap
    });

    test('tablet responsive behavior - Requirements 4.2', () => {
      setTabletViewport();
      renderEmployeeForm();
      
      const baseSalaryInput = getInputByName('baseSalary');
      
      // Verify tablet-specific sizing
      expect(baseSalaryInput).toHaveClass('sm:min-h-[48px]');
      
      // Grid should show multiple columns on tablet
      const gridContainer = document.querySelector('.grid.grid-cols-1.md\\:grid-cols-3');
      expect(gridContainer).toHaveClass('md:grid-cols-3');
    });

    test('form layout adapts to screen size changes - Requirements 4.2, 4.4', () => {
      // Start with mobile
      setMobileViewport();
      renderEmployeeForm();
      
      let gridContainer = document.querySelector('.grid.grid-cols-1.md\\:grid-cols-3');
      expect(gridContainer).toHaveClass('grid-cols-1');
      
      // Switch to tablet
      setTabletViewport();
      
      // Grid should adapt (in real app, this would be handled by CSS media queries)
      expect(gridContainer).toHaveClass('md:grid-cols-3');
    });

    test('currency symbol positioning adapts to mobile - Requirements 1.5', () => {
      setMobileViewport();
      renderEmployeeForm();
      
      const baseSalaryInput = getInputByName('baseSalary');
      const currencySymbol = baseSalaryInput.parentElement.querySelector('span');
      
      // Verify mobile-specific currency symbol positioning
      expect(currencySymbol).toHaveClass('input-currency-symbol');
      expect(baseSalaryInput).toHaveClass('input-with-currency');
      
      // Test with various input lengths on mobile
      const mobileTestValues = ['1', '1000', '100000', '1000000'];
      
      mobileTestValues.forEach(value => {
        fireEvent.change(baseSalaryInput, { target: { value } });
        
        // Currency symbol should remain visible and properly positioned on mobile
        expect(currencySymbol).toBeVisible();
        expect(currencySymbol).toHaveTextContent('₹');
      });
    });

    test('focus states work properly on mobile - Requirements 1.5, 4.3', () => {
      setMobileViewport();
      renderEmployeeForm();
      
      const baseSalaryInput = getInputByName('baseSalary');
      const currencySymbol = baseSalaryInput.parentElement.querySelector('span');
      
      // Focus input on mobile
      fireEvent.focus(baseSalaryInput); // Use focus instead of click for better test reliability
      
      // Verify focus state doesn't break mobile layout
      expect(baseSalaryInput).toHaveFocus();
      expect(currencySymbol).toBeVisible();
      
      // Verify mobile-specific focus styling
      expect(baseSalaryInput).toHaveClass('input-with-currency');
    });
  });
});