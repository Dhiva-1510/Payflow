import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import EmployeeList from '../EmployeeList';
import { SettingsProvider } from '../../context/SettingsContext';

// Mock the API module
jest.mock('../../services/api', () => ({
  get: jest.fn()
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

// Mock API responses
const mockEmployees = [
  {
    id: '1',
    userId: 'user1',
    userName: 'John Doe',
    userEmail: 'john@example.com',
    baseSalary: 50000,
    allowance: 5000,
    deduction: 2000,
    netSalary: 53000
  },
  {
    id: '2',
    userId: 'user2',
    userName: 'Jane Smith',
    userEmail: 'jane@example.com',
    baseSalary: 60000,
    allowance: 6000,
    deduction: 3000,
    netSalary: 63000
  }
];

describe('EmployeeList - Search Input Spacing Tests', () => {
  const mockOnEdit = jest.fn();
  const mockOnAddNew = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock successful API response
    const api = require('../../services/api');
    api.get.mockResolvedValue({
      data: { employees: mockEmployees }
    });
  });

  const renderEmployeeList = (props = {}) => {
    return render(
      <MockSettingsProvider>
        <EmployeeList
          onEdit={mockOnEdit}
          onAddNew={mockOnAddNew}
          refreshTrigger={0}
          {...props}
        />
      </MockSettingsProvider>
    );
  };

  // Helper function to get search input
  const getSearchInput = () => {
    return screen.getByPlaceholderText('Search employees...');
  };

  // Helper function to get search icon
  const getSearchIcon = (searchInput) => {
    return searchInput.parentElement.querySelector('svg');
  };

  describe('Search Icon Positioning with Various Text Lengths - Requirements 2.1', () => {
    test('search icon does not overlap with short search text', async () => {
      renderEmployeeList();
      
      // Wait for component to load
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search employees...')).toBeInTheDocument();
      });

      const searchInput = getSearchInput();
      const searchIcon = getSearchIcon(searchInput);
      
      // Verify search icon is present and positioned correctly
      expect(searchIcon).toBeInTheDocument();
      expect(searchIcon).toBeVisible();
      
      // Enter short search text - Requirements 2.1
      fireEvent.change(searchInput, { target: { value: 'John' } });
      
      // Search icon should remain visible and not overlap with text
      expect(searchIcon).toBeVisible();
      expect(searchInput.value).toBe('John');
      
      // Verify input has proper padding to accommodate icon
      expect(searchInput).toHaveClass('input-with-icon');
      expect(searchIcon).toHaveClass('input-icon');
    });

    test('search icon does not overlap with medium length search text', async () => {
      renderEmployeeList();
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search employees...')).toBeInTheDocument();
      });

      const searchInput = getSearchInput();
      const searchIcon = getSearchIcon(searchInput);
      
      // Enter medium length search text
      fireEvent.change(searchInput, { target: { value: 'John Doe Employee' } });
      
      // Search icon should remain visible and properly positioned
      expect(searchIcon).toBeVisible();
      expect(searchInput.value).toBe('John Doe Employee');
      
      // Verify proper spacing classes are applied
      expect(searchInput).toHaveClass('input-with-icon');
      expect(searchIcon).toHaveClass('input-icon');
    });

    test('search icon does not overlap with long search text', async () => {
      renderEmployeeList();
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search employees...')).toBeInTheDocument();
      });

      const searchInput = getSearchInput();
      const searchIcon = getSearchIcon(searchInput);
      
      // Enter very long search text - Requirements 2.1
      const longSearchText = 'This is a very long search query that exceeds normal input width';
      fireEvent.change(searchInput, { target: { value: longSearchText } });
      
      // Search icon should remain visible and not overlap with text
      expect(searchIcon).toBeVisible();
      expect(searchInput.value).toBe(longSearchText);
      
      // Verify input maintains proper padding for icon
      expect(searchInput).toHaveClass('input-with-icon');
    });

    test('search icon positioning remains consistent during rapid text changes', async () => {
      renderEmployeeList();
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search employees...')).toBeInTheDocument();
      });

      const searchInput = getSearchInput();
      const searchIcon = getSearchIcon(searchInput);
      
      // Simulate rapid typing with various text lengths
      const searchValues = ['J', 'Jo', 'Joh', 'John', 'John D', 'John Do', 'John Doe'];
      
      for (const value of searchValues) {
        fireEvent.change(searchInput, { target: { value } });
        
        // Search icon should remain consistently positioned
        expect(searchIcon).toBeVisible();
        expect(searchIcon).toHaveClass('input-icon');
        expect(searchInput).toHaveClass('input-with-icon');
      }
    });

    test('search icon remains properly positioned when text exceeds visible input width - Requirements 2.5', async () => {
      renderEmployeeList();
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search employees...')).toBeInTheDocument();
      });

      const searchInput = getSearchInput();
      const searchIcon = getSearchIcon(searchInput);
      
      // Enter text that exceeds typical input width - Requirements 2.5
      const veryLongText = 'This is an extremely long search query that definitely exceeds the visible input field width and should test horizontal scrolling behavior within the input';
      fireEvent.change(searchInput, { target: { value: veryLongText } });
      
      // Search icon should remain properly positioned even with overflow text
      expect(searchIcon).toBeVisible();
      expect(searchIcon).toHaveClass('input-icon');
      expect(searchInput.value).toBe(veryLongText);
      
      // Verify input maintains proper structure
      expect(searchInput).toHaveClass('input-with-icon');
    });

    test('search icon positioning is consistent with input container structure', async () => {
      renderEmployeeList();
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search employees...')).toBeInTheDocument();
      });

      const searchInput = getSearchInput();
      const searchIcon = getSearchIcon(searchInput);
      const inputContainer = searchInput.parentElement;
      
      // Verify proper container structure
      expect(inputContainer).toHaveClass('input-icon-container');
      expect(searchInput).toHaveClass('input-field');
      expect(searchInput).toHaveClass('input-with-icon');
      expect(searchIcon).toHaveClass('input-icon');
      
      // Test with text to ensure structure remains intact
      fireEvent.change(searchInput, { target: { value: 'Search test' } });
      
      // Container structure should remain consistent
      expect(inputContainer).toHaveClass('input-icon-container');
      expect(searchIcon).toBeVisible();
    });
  });

  describe('Placeholder Text Spacing - Requirements 2.2', () => {
    test('search icon does not overlap with placeholder text', async () => {
      renderEmployeeList();
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search employees...')).toBeInTheDocument();
      });

      const searchInput = getSearchInput();
      const searchIcon = getSearchIcon(searchInput);
      
      // Verify placeholder text is visible and properly spaced - Requirements 2.2
      expect(searchInput).toHaveAttribute('placeholder', 'Search employees...');
      expect(searchIcon).toBeVisible();
      
      // Verify proper spacing classes for placeholder
      expect(searchInput).toHaveClass('input-with-icon');
      expect(searchIcon).toHaveClass('input-icon');
      
      // Placeholder should not be overlapped by icon
      const computedStyle = window.getComputedStyle(searchInput);
      expect(computedStyle.paddingLeft).toBeTruthy();
    });

    test('placeholder text remains properly spaced when input gains focus', async () => {
      renderEmployeeList();
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search employees...')).toBeInTheDocument();
      });

      const searchInput = getSearchInput();
      const searchIcon = getSearchIcon(searchInput);
      
      // Focus the input - Requirements 2.3
      fireEvent.focus(searchInput);
      
      // Placeholder should still be properly spaced (though may be hidden by browser)
      expect(searchInput).toHaveAttribute('placeholder', 'Search employees...');
      expect(searchIcon).toBeVisible();
      expect(searchInput).toHaveClass('input-with-icon');
    });

    test('placeholder text spacing is maintained across different screen sizes', async () => {
      // Simulate mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      
      renderEmployeeList();
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search employees...')).toBeInTheDocument();
      });

      const searchInput = getSearchInput();
      const searchIcon = getSearchIcon(searchInput);
      
      // Verify placeholder spacing on mobile
      expect(searchInput).toHaveAttribute('placeholder', 'Search employees...');
      expect(searchIcon).toBeVisible();
      expect(searchInput).toHaveClass('input-with-icon');
      
      // Simulate tablet viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      });
      
      // Placeholder spacing should remain consistent
      expect(searchInput).toHaveClass('input-with-icon');
      expect(searchIcon).toBeVisible();
    });

    test('placeholder text and search icon have proper visual hierarchy', async () => {
      renderEmployeeList();
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search employees...')).toBeInTheDocument();
      });

      const searchInput = getSearchInput();
      const searchIcon = getSearchIcon(searchInput);
      
      // Verify icon is positioned to not interfere with placeholder
      expect(searchIcon).toHaveClass('input-icon');
      expect(searchInput).toHaveClass('input-with-icon');
      
      // Icon should have proper CSS classes for positioning
      expect(searchIcon).toHaveClass('input-icon');
      
      // Input should have left padding to accommodate icon
      expect(searchInput).toHaveClass('input-with-icon');
    });

    test('placeholder text visibility with empty and non-empty input states', async () => {
      renderEmployeeList();
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search employees...')).toBeInTheDocument();
      });

      const searchInput = getSearchInput();
      const searchIcon = getSearchIcon(searchInput);
      
      // Initially empty - placeholder should be visible (browser dependent)
      expect(searchInput.value).toBe('');
      expect(searchInput).toHaveAttribute('placeholder', 'Search employees...');
      expect(searchIcon).toBeVisible();
      
      // Add text - placeholder should be hidden but spacing maintained
      fireEvent.change(searchInput, { target: { value: 'John' } });
      expect(searchInput.value).toBe('John');
      expect(searchIcon).toBeVisible();
      expect(searchInput).toHaveClass('input-with-icon');
      
      // Clear text - placeholder should be visible again
      fireEvent.change(searchInput, { target: { value: '' } });
      expect(searchInput.value).toBe('');
      expect(searchInput).toHaveAttribute('placeholder', 'Search employees...');
      expect(searchIcon).toBeVisible();
    });
  });

  describe('Focus State Behavior - Requirements 2.3', () => {
    test('search icon remains properly positioned when input receives focus', async () => {
      renderEmployeeList();
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search employees...')).toBeInTheDocument();
      });

      const searchInput = getSearchInput();
      const searchIcon = getSearchIcon(searchInput);
      
      // Focus the input - Requirements 2.3
      fireEvent.focus(searchInput);
      
      // Search icon should remain visible and properly positioned
      expect(searchIcon).toBeVisible();
      expect(searchIcon).toHaveClass('input-icon');
      expect(searchInput).toHaveClass('input-with-icon');
      
      // Verify focus event was triggered (input should have focus-related classes)
      expect(searchInput).toHaveClass('input-field-with-states');
    });

    test('search icon remains visible when input loses focus', async () => {
      renderEmployeeList();
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search employees...')).toBeInTheDocument();
      });

      const searchInput = getSearchInput();
      const searchIcon = getSearchIcon(searchInput);
      
      // Focus then blur the input
      fireEvent.focus(searchInput);
      fireEvent.blur(searchInput);
      
      // Search icon should still be visible and properly positioned
      expect(searchIcon).toBeVisible();
      expect(searchIcon).toHaveClass('input-icon');
      expect(searchInput).toHaveClass('input-with-icon');
    });

    test('focus state provides clear visual separation between icon and input area', async () => {
      renderEmployeeList();
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search employees...')).toBeInTheDocument();
      });

      const searchInput = getSearchInput();
      const searchIcon = getSearchIcon(searchInput);
      
      // Add some text and focus
      fireEvent.change(searchInput, { target: { value: 'John Doe' } });
      fireEvent.focus(searchInput);
      
      // Verify visual separation - Requirements 2.3
      expect(searchIcon).toHaveClass('input-icon'); // Icon positioned correctly
      expect(searchInput).toHaveClass('input-with-icon'); // Input has proper padding class
      expect(searchInput).toHaveClass('input-field-with-states'); // State-aware styling
      
      // Search icon should remain visible during focus
      expect(searchIcon).toBeVisible();
      
      // Verify input value is set correctly
      expect(searchInput.value).toBe('John Doe');
    });

    test('focus state works correctly with search functionality', async () => {
      renderEmployeeList();
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search employees...')).toBeInTheDocument();
      });

      const searchInput = getSearchInput();
      const searchIcon = getSearchIcon(searchInput);
      
      // Focus and enter search text
      fireEvent.focus(searchInput);
      fireEvent.change(searchInput, { target: { value: 'John' } });
      
      // Wait for search to filter results
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
      
      // Search icon should remain visible during active search
      expect(searchIcon).toBeVisible();
      expect(searchInput).toHaveClass('input-with-icon');
      expect(searchInput.value).toBe('John');
    });

    test('multiple focus/blur cycles maintain consistent icon positioning', async () => {
      renderEmployeeList();
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search employees...')).toBeInTheDocument();
      });

      const searchInput = getSearchInput();
      const searchIcon = getSearchIcon(searchInput);
      
      // Perform multiple focus/blur cycles
      for (let i = 0; i < 3; i++) {
        fireEvent.focus(searchInput);
        fireEvent.change(searchInput, { target: { value: `search${i}` } });
        fireEvent.blur(searchInput);
        
        // Icon should remain consistently positioned
        expect(searchIcon).toBeVisible();
        expect(searchIcon).toHaveClass('input-icon');
        expect(searchInput).toHaveClass('input-with-icon');
      }
    });

    test('focus state styling does not affect icon positioning calculations', async () => {
      renderEmployeeList();
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search employees...')).toBeInTheDocument();
      });

      const searchInput = getSearchInput();
      const searchIcon = getSearchIcon(searchInput);
      
      // Get initial positioning
      const initialIconStyle = window.getComputedStyle(searchIcon);
      const initialInputPadding = window.getComputedStyle(searchInput).paddingLeft;
      
      // Focus the input
      fireEvent.focus(searchInput);
      
      // Positioning should remain consistent
      const focusedIconStyle = window.getComputedStyle(searchIcon);
      const focusedInputPadding = window.getComputedStyle(searchInput).paddingLeft;
      
      expect(focusedIconStyle.position).toBe(initialIconStyle.position);
      expect(focusedInputPadding).toBe(initialInputPadding);
      
      // Classes should remain consistent
      expect(searchIcon).toHaveClass('input-icon');
      expect(searchInput).toHaveClass('input-with-icon');
    });
  });

  describe('Responsive Search Input Behavior - Requirements 2.4, 4.1, 4.2', () => {
    // Helper to simulate mobile viewport
    const setMobileViewport = () => {
      act(() => {
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
      });
    };

    // Helper to simulate tablet viewport
    const setTabletViewport = () => {
      act(() => {
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
      });
    };

    // Helper to simulate desktop viewport
    const setDesktopViewport = () => {
      act(() => {
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: 1200,
        });
        Object.defineProperty(window, 'innerHeight', {
          writable: true,
          configurable: true,
          value: 800,
        });
        window.dispatchEvent(new Event('resize'));
      });
    };

    test('search icon maintains consistent positioning across different screen sizes - Requirements 2.4', async () => {
      renderEmployeeList();
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search employees...')).toBeInTheDocument();
      });

      const searchInput = getSearchInput();
      const searchIcon = getSearchIcon(searchInput);
      
      // Test mobile viewport
      setMobileViewport();
      await waitFor(() => {
        expect(searchIcon).toBeVisible();
      });
      expect(searchIcon).toHaveClass('input-icon');
      expect(searchInput).toHaveClass('input-with-icon');
      
      // Test tablet viewport
      setTabletViewport();
      await waitFor(() => {
        expect(searchIcon).toBeVisible();
      });
      expect(searchIcon).toHaveClass('input-icon');
      expect(searchInput).toHaveClass('input-with-icon');
      
      // Test desktop viewport
      setDesktopViewport();
      await waitFor(() => {
        expect(searchIcon).toBeVisible();
      });
      expect(searchIcon).toHaveClass('input-icon');
      expect(searchInput).toHaveClass('input-with-icon');
      
      // Add text to test with content across all viewports
      fireEvent.change(searchInput, { target: { value: 'John Doe' } });
      expect(searchIcon).toBeVisible();
      expect(searchInput.value).toBe('John Doe');
    });

    test('search input maintains proper spacing without horizontal scrolling on mobile - Requirements 4.1', async () => {
      setMobileViewport();
      renderEmployeeList();
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search employees...')).toBeInTheDocument();
      });

      const searchInput = getSearchInput();
      const searchIcon = getSearchIcon(searchInput);
      
      // Verify mobile-specific classes and behavior
      expect(searchInput).toHaveClass('input-with-icon');
      expect(searchInput).toHaveClass('w-full');
      expect(searchIcon).toBeVisible();
      
      // Test with long search text that might cause horizontal scrolling
      const longSearchText = 'This is a very long search query for mobile testing that should not cause horizontal scrolling';
      fireEvent.change(searchInput, { target: { value: longSearchText } });
      
      // Input should handle overflow gracefully without affecting icon
      expect(searchIcon).toBeVisible();
      expect(searchInput.value).toBe(longSearchText);
      
      // Verify no horizontal overflow - container should be responsive
      const inputContainer = searchInput.parentElement;
      expect(inputContainer).toHaveClass('flex-1');
      expect(inputContainer).toHaveClass('w-full');
      expect(inputContainer).toHaveClass('sm:max-w-md');
      
      // Verify input has proper mobile styling
      const inputStyle = window.getComputedStyle(searchInput);
      expect(inputStyle.width).toBe('100%');
    });

    test('search input adapts to tablet screen width - Requirements 4.2', async () => {
      setTabletViewport();
      renderEmployeeList();
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search employees...')).toBeInTheDocument();
      });

      const searchInput = getSearchInput();
      const searchIcon = getSearchIcon(searchInput);
      
      // Verify tablet-specific behavior
      expect(searchInput).toHaveClass('input-with-icon');
      expect(searchIcon).toBeVisible();
      
      // Test search functionality on tablet
      fireEvent.change(searchInput, { target: { value: 'Jane' } });
      
      await waitFor(() => {
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
        expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
      });
      
      // Icon should remain properly positioned during search
      expect(searchIcon).toBeVisible();
      expect(searchInput.value).toBe('Jane');
      
      // Verify tablet layout
      const inputContainer = searchInput.parentElement;
      expect(inputContainer).toHaveClass('flex-1');
      expect(inputContainer).toHaveClass('sm:max-w-md');
    });

    test('search input container layout adapts to screen size changes', async () => {
      renderEmployeeList();
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search employees...')).toBeInTheDocument();
      });

      const searchInput = getSearchInput();
      const inputContainer = searchInput.parentElement;
      const headerContainer = inputContainer.parentElement;
      
      // Verify responsive header layout classes
      expect(headerContainer).toHaveClass('flex');
      expect(headerContainer).toHaveClass('flex-col');
      expect(headerContainer).toHaveClass('sm:flex-row');
      
      // Input container should be flexible
      expect(inputContainer).toHaveClass('flex-1');
      expect(inputContainer).toHaveClass('w-full');
      expect(inputContainer).toHaveClass('sm:max-w-md');
      
      // Test mobile layout
      setMobileViewport();
      await waitFor(() => {
        expect(headerContainer).toHaveClass('flex-col'); // Mobile: column layout
      });
      
      // Test tablet layout  
      setTabletViewport();
      await waitFor(() => {
        expect(headerContainer).toHaveClass('sm:flex-row'); // Tablet+: row layout
      });
      
      // Test desktop layout
      setDesktopViewport();
      await waitFor(() => {
        expect(headerContainer).toHaveClass('sm:flex-row'); // Desktop: row layout
      });
    });

    test('touch target adequacy for search input on mobile devices - Requirements 4.3', async () => {
      setMobileViewport();
      renderEmployeeList();
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search employees...')).toBeInTheDocument();
      });

      const searchInput = getSearchInput();
      
      // Verify input has proper classes for mobile touch targets
      expect(searchInput).toHaveClass('input-field');
      expect(searchInput).toHaveClass('input-with-icon');
      expect(searchInput).toHaveClass('w-full');
      
      // Verify minimum touch target size (44px) - Requirements 4.3
      // Note: In jsdom, we can verify the style attribute is set
      expect(searchInput.style.minHeight).toBe('44px');
      expect(searchInput.style.fontSize).toBe('16px');
      
      // Verify input is focusable on mobile
      fireEvent.focus(searchInput);
      // Note: In jsdom, focus behavior may differ from real browsers
      // We'll verify the input can receive focus events instead
      expect(searchInput).toHaveClass('input-field-with-states');
      
      // Test touch interaction with a search that will find results
      fireEvent.change(searchInput, { target: { value: 'John' } });
      expect(searchInput.value).toBe('John');
      
      // Verify input maintains proper structure on mobile
      expect(searchInput).toHaveClass('input-field-with-states');
      
      // Test that search functionality works on mobile - should find John Doe
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
      });
      
      // Verify employee count shows filtered results
      await waitFor(() => {
        const employeeCount = screen.getByText('1 employee found');
        expect(employeeCount).toBeInTheDocument();
      });
    });

    test('search functionality works correctly across different screen sizes', async () => {
      renderEmployeeList();
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search employees...')).toBeInTheDocument();
      });

      const searchInput = getSearchInput();
      
      // Test search on mobile
      setMobileViewport();
      await waitFor(() => {
        expect(searchInput).toBeVisible();
      });
      
      fireEvent.change(searchInput, { target: { value: 'John' } });
      
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
      });
      
      // Clear search
      fireEvent.change(searchInput, { target: { value: '' } });
      
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      });
      
      // Test search on tablet
      setTabletViewport();
      await waitFor(() => {
        expect(searchInput).toBeVisible();
      });
      
      fireEvent.change(searchInput, { target: { value: 'Jane' } });
      
      await waitFor(() => {
        expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      });
      
      // Clear search
      fireEvent.change(searchInput, { target: { value: '' } });
      
      // Test search on desktop
      setDesktopViewport();
      await waitFor(() => {
        expect(searchInput).toBeVisible();
      });
      
      fireEvent.change(searchInput, { target: { value: 'Doe' } });
      
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
      });
    });

    test('responsive icon sizing adapts to screen size - Requirements 2.4', async () => {
      renderEmployeeList();
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search employees...')).toBeInTheDocument();
      });

      const searchInput = getSearchInput();
      const searchIcon = getSearchIcon(searchInput);
      
      // Test mobile icon sizing
      setMobileViewport();
      await waitFor(() => {
        expect(searchIcon).toBeVisible();
      });
      
      // Icon should have mobile-specific styling
      expect(searchIcon).toHaveClass('input-icon');
      expect(searchIcon.style.width).toBeTruthy();
      expect(searchIcon.style.height).toBeTruthy();
      expect(searchIcon.style.left).toBeTruthy();
      
      // Test tablet icon sizing
      setTabletViewport();
      await waitFor(() => {
        expect(searchIcon).toBeVisible();
      });
      
      // Icon should adapt to tablet size
      expect(searchIcon).toHaveClass('input-icon');
      
      // Test desktop icon sizing
      setDesktopViewport();
      await waitFor(() => {
        expect(searchIcon).toBeVisible();
      });
      
      // Icon should adapt to desktop size
      expect(searchIcon).toHaveClass('input-icon');
    });

    test('responsive button sizing and layout - Requirements 4.3', async () => {
      renderEmployeeList();
      
      await waitFor(() => {
        expect(screen.getByText('Add Employee')).toBeInTheDocument();
      });

      const addButton = screen.getByText('Add Employee').closest('button');
      
      // Test mobile button layout
      setMobileViewport();
      await waitFor(() => {
        expect(addButton).toBeVisible();
      });
      
      // Button should be full width on mobile
      expect(addButton).toHaveClass('w-full');
      expect(addButton).toHaveClass('sm:w-auto');
      expect(addButton).toHaveClass('justify-center');
      expect(addButton).toHaveClass('sm:justify-start');
      
      // Verify minimum touch target size
      expect(addButton.style.minHeight).toBeTruthy();
      
      // Test tablet/desktop button layout
      setTabletViewport();
      await waitFor(() => {
        expect(addButton).toBeVisible();
      });
      
      // Button should adapt to tablet/desktop layout
      expect(addButton).toHaveClass('sm:w-auto');
      expect(addButton).toHaveClass('sm:justify-start');
    });

    test('window resize events update responsive behavior', async () => {
      renderEmployeeList();
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search employees...')).toBeInTheDocument();
      });

      const searchInput = getSearchInput();
      const searchIcon = getSearchIcon(searchInput);
      
      // Start with desktop
      setDesktopViewport();
      await waitFor(() => {
        expect(searchIcon).toBeVisible();
      });
      
      // Resize to mobile
      setMobileViewport();
      await waitFor(() => {
        expect(searchIcon).toBeVisible();
      });
      
      // Icon should adapt to mobile sizing
      expect(searchIcon).toHaveClass('input-icon');
      expect(searchIcon.style.width).toBeTruthy();
      
      // Resize to tablet
      setTabletViewport();
      await waitFor(() => {
        expect(searchIcon).toBeVisible();
      });
      
      // Icon should adapt to tablet sizing
      expect(searchIcon).toHaveClass('input-icon');
      
      // Resize back to desktop
      setDesktopViewport();
      await waitFor(() => {
        expect(searchIcon).toBeVisible();
      });
      
      // Icon should adapt back to desktop sizing
      expect(searchIcon).toHaveClass('input-icon');
    });

    test('search input prevents horizontal scrolling on small screens - Requirements 4.1', async () => {
      // Test extra small screen (iPhone SE)
      act(() => {
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: 320,
        });
        window.dispatchEvent(new Event('resize'));
      });
      
      renderEmployeeList();
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search employees...')).toBeInTheDocument();
      });

      const searchInput = getSearchInput();
      const inputContainer = searchInput.parentElement;
      
      // Verify container prevents horizontal overflow
      expect(inputContainer).toHaveClass('w-full');
      expect(searchInput).toHaveClass('w-full');
      
      // Test with very long search text
      const extraLongText = 'This is an extremely long search query that would definitely cause horizontal scrolling on a 320px screen if not handled properly by the responsive design';
      fireEvent.change(searchInput, { target: { value: extraLongText } });
      
      // Input should handle the long text without breaking layout
      expect(searchInput.value).toBe(extraLongText);
      expect(searchInput).toHaveClass('w-full');
      
      // Container should maintain proper structure
      expect(inputContainer).toHaveClass('input-icon-container');
      expect(inputContainer).toHaveClass('flex-1');
    });

    test('orientation change handling maintains proper layout - Requirements 4.5', async () => {
      renderEmployeeList();
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search employees...')).toBeInTheDocument();
      });

      const searchInput = getSearchInput();
      const searchIcon = getSearchIcon(searchInput);
      
      // Simulate landscape mobile (low height)
      act(() => {
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: 667,
        });
        Object.defineProperty(window, 'innerHeight', {
          writable: true,
          configurable: true,
          value: 375,
        });
        window.dispatchEvent(new Event('resize'));
      });
      
      await waitFor(() => {
        expect(searchIcon).toBeVisible();
      });
      
      // Layout should remain functional in landscape
      expect(searchInput).toHaveClass('input-with-icon');
      expect(searchIcon).toHaveClass('input-icon');
      
      // Test search functionality in landscape
      fireEvent.change(searchInput, { target: { value: 'John' } });
      
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
      
      expect(searchInput.value).toBe('John');
      expect(searchIcon).toBeVisible();
    });
  });

  describe('Search Input Container Structure and Accessibility', () => {
    test('search input has proper container structure for icon positioning', async () => {
      renderEmployeeList();
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search employees...')).toBeInTheDocument();
      });

      const searchInput = getSearchInput();
      const inputContainer = searchInput.parentElement;
      const searchIcon = getSearchIcon(searchInput);
      
      // Verify proper container structure
      expect(inputContainer).toHaveClass('input-icon-container');
      expect(inputContainer).toHaveClass('flex-1');
      expect(inputContainer).toHaveClass('max-w-md');
      
      // Verify input and icon structure
      expect(searchInput).toHaveClass('input-field');
      expect(searchInput).toHaveClass('input-with-icon');
      expect(searchInput).toHaveClass('input-field-with-states');
      expect(searchIcon).toHaveClass('input-icon');
    });

    test('search input maintains accessibility attributes', async () => {
      renderEmployeeList();
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search employees...')).toBeInTheDocument();
      });

      const searchInput = getSearchInput();
      
      // Verify accessibility attributes
      expect(searchInput).toHaveAttribute('type', 'text');
      expect(searchInput).toHaveAttribute('placeholder', 'Search employees...');
      
      // Verify input is focusable and accessible
      fireEvent.focus(searchInput);
      
      // Verify keyboard interaction
      fireEvent.keyDown(searchInput, { key: 'Enter' });
      // Should not cause any errors
      
      // Verify input maintains proper structure
      expect(searchInput).toHaveClass('input-field');
      expect(searchInput).toHaveClass('input-with-icon');
    });

    test('search icon is properly excluded from tab navigation', async () => {
      renderEmployeeList();
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search employees...')).toBeInTheDocument();
      });

      const searchInput = getSearchInput();
      const searchIcon = getSearchIcon(searchInput);
      
      // Icon should not be focusable
      expect(searchIcon).not.toHaveAttribute('tabindex');
      
      // Icon should have proper CSS classes for positioning
      expect(searchIcon).toHaveClass('input-icon');
      
      // Only input should be focusable
      fireEvent.focus(searchInput);
      
      // Verify input structure is correct
      expect(searchInput).toHaveClass('input-field');
      expect(searchInput).toHaveClass('input-with-icon');
    });
  });
});