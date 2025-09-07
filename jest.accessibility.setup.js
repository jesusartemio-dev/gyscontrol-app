/**
 * @fileoverview Configuración específica para tests de accesibilidad
 * @version 1.0.0
 * @author GYS Team
 * @created 2024-01-15
 */

import 'jest-axe/extend-expect';
import { toHaveNoViolations } from 'jest-axe';

// ✅ Extend Jest matchers with accessibility matchers
expect.extend(toHaveNoViolations);

// 🔍 Configure axe-core for accessibility testing
import { configureAxe } from 'jest-axe';

// 📊 Global axe configuration
const axe = configureAxe({
  rules: {
    // ✅ Enable WCAG 2.1 AA rules
    'wcag2a': { enabled: true },
    'wcag2aa': { enabled: true },
    'wcag21aa': { enabled: true },
    
    // 🔍 Color contrast rules
    'color-contrast': { enabled: true },
    'color-contrast-enhanced': { enabled: false }, // AAA level, optional
    
    // 📊 Keyboard navigation rules
    'focus-order-semantics': { enabled: true },
    'tabindex': { enabled: true },
    
    // ✅ ARIA rules
    'aria-allowed-attr': { enabled: true },
    'aria-required-attr': { enabled: true },
    'aria-valid-attr': { enabled: true },
    'aria-valid-attr-value': { enabled: true },
    
    // 🔁 Form rules
    'label': { enabled: true },
    'form-field-multiple-labels': { enabled: true },
    
    // 📡 Image rules
    'image-alt': { enabled: true },
    'image-redundant-alt': { enabled: true },
    
    // 🧮 Heading rules
    'heading-order': { enabled: true },
    'empty-heading': { enabled: true },
    
    // 📊 Link rules
    'link-name': { enabled: true },
    'link-in-text-block': { enabled: true },
    
    // ✅ Table rules
    'table-fake-caption': { enabled: true },
    'td-headers-attr': { enabled: true },
    'th-has-data-cells': { enabled: true },
    
    // 🔍 Custom rules for GYS App
    'landmark-one-main': { enabled: true },
    'landmark-complementary-is-top-level': { enabled: true },
    'page-has-heading-one': { enabled: true },
    'region': { enabled: true }
  },
  
  // 📊 Tags to include
  tags: [
    'wcag2a',
    'wcag2aa',
    'wcag21aa',
    'best-practice'
  ],
  
  // ✅ Disable rules that might be too strict for development
  disableOtherRules: false,
  
  // 🔁 Reporter configuration
  reporter: 'v2'
});

// 📡 Global test utilities for accessibility
global.accessibilityTestUtils = {
  // ✅ Run basic accessibility test
  runBasicA11yTest: async (container) => {
    const results = await axe(container);
    expect(results).toHaveNoViolations();
    return results;
  },
  
  // 🔍 Run comprehensive accessibility test
  runComprehensiveA11yTest: async (container) => {
    const results = await axe(container, {
      rules: {
        'wcag2a': { enabled: true },
        'wcag2aa': { enabled: true },
        'wcag21aa': { enabled: true },
        'best-practice': { enabled: true }
      }
    });
    
    expect(results).toHaveNoViolations();
    
    return {
      violations: results.violations,
      passes: results.passes,
      incomplete: results.incomplete,
      score: results.passes.length / (results.passes.length + results.violations.length) * 100
    };
  },
  
  // 📊 Check keyboard navigation
  checkKeyboardNavigation: (container) => {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    expect(focusableElements.length).toBeGreaterThan(0);
    
    // Check that all focusable elements are properly accessible
    focusableElements.forEach(element => {
      // Should have visible focus indicator
      const styles = window.getComputedStyle(element);
      expect(styles.outline).not.toBe('none');
      
      // Should not have negative tabindex unless intentional
      const tabIndex = element.getAttribute('tabindex');
      if (tabIndex && parseInt(tabIndex) < 0) {
        // Only allow -1 for programmatically focusable elements
        expect(element).toHaveAttribute('aria-hidden', 'true');
      }
    });
    
    return focusableElements;
  },
  
  // ✅ Check ARIA attributes
  checkAriaAttributes: (container) => {
    // Check for proper ARIA labels
    const elementsWithAriaLabel = container.querySelectorAll('[aria-label]');
    elementsWithAriaLabel.forEach(element => {
      const ariaLabel = element.getAttribute('aria-label');
      expect(ariaLabel).toBeTruthy();
      expect(ariaLabel.trim().length).toBeGreaterThan(0);
    });
    
    // Check for proper ARIA labelledby references
    const elementsWithAriaLabelledBy = container.querySelectorAll('[aria-labelledby]');
    elementsWithAriaLabelledBy.forEach(element => {
      const labelledBy = element.getAttribute('aria-labelledby');
      const referencedElement = container.querySelector(`#${labelledBy}`);
      expect(referencedElement).toBeInTheDocument();
    });
    
    // Check for proper ARIA describedby references
    const elementsWithAriaDescribedBy = container.querySelectorAll('[aria-describedby]');
    elementsWithAriaDescribedBy.forEach(element => {
      const describedBy = element.getAttribute('aria-describedby');
      const referencedElement = container.querySelector(`#${describedBy}`);
      expect(referencedElement).toBeInTheDocument();
    });
  },
  
  // 🔁 Check color contrast
  checkColorContrast: async (container) => {
    const results = await axe(container, {
      rules: {
        'color-contrast': { enabled: true }
      }
    });
    
    expect(results).toHaveNoViolations();
    return results;
  },
  
  // 📡 Check form accessibility
  checkFormAccessibility: (container) => {
    const forms = container.querySelectorAll('form');
    
    forms.forEach(form => {
      // Check that form has proper labeling
      const inputs = form.querySelectorAll('input, select, textarea');
      
      inputs.forEach(input => {
        const id = input.getAttribute('id');
        const ariaLabel = input.getAttribute('aria-label');
        const ariaLabelledBy = input.getAttribute('aria-labelledby');
        const label = form.querySelector(`label[for="${id}"]`);
        
        // Input should have at least one form of labeling
        expect(label || ariaLabel || ariaLabelledBy).toBeTruthy();
        
        // Required fields should be properly marked
        if (input.hasAttribute('required')) {
          const ariaRequired = input.getAttribute('aria-required');
          expect(ariaRequired).toBe('true');
        }
      });
      
      // Check for error messages
      const errorElements = form.querySelectorAll('[role="alert"], .error, [aria-invalid="true"]');
      errorElements.forEach(errorElement => {
        if (errorElement.hasAttribute('aria-invalid')) {
          const describedBy = errorElement.getAttribute('aria-describedby');
          if (describedBy) {
            const errorMessage = form.querySelector(`#${describedBy}`);
            expect(errorMessage).toBeInTheDocument();
          }
        }
      });
    });
  },
  
  // 🧮 Check table accessibility
  checkTableAccessibility: (container) => {
    const tables = container.querySelectorAll('table');
    
    tables.forEach(table => {
      // Table should have caption or aria-label
      const caption = table.querySelector('caption');
      const ariaLabel = table.getAttribute('aria-label');
      const ariaLabelledBy = table.getAttribute('aria-labelledby');
      
      expect(caption || ariaLabel || ariaLabelledBy).toBeTruthy();
      
      // Check column headers
      const columnHeaders = table.querySelectorAll('th[scope="col"]');
      expect(columnHeaders.length).toBeGreaterThan(0);
      
      // Check row headers if applicable
      const rowHeaders = table.querySelectorAll('th[scope="row"]');
      
      // Check that data cells are properly associated
      const dataCells = table.querySelectorAll('td');
      dataCells.forEach(cell => {
        const headers = cell.getAttribute('headers');
        if (headers) {
          headers.split(' ').forEach(headerId => {
            const headerElement = table.querySelector(`#${headerId}`);
            expect(headerElement).toBeInTheDocument();
          });
        }
      });
    });
  }
};

// 📊 Console warnings for accessibility issues during development
if (process.env.NODE_ENV === 'development') {
  const originalWarn = console.warn;
  console.warn = (...args) => {
    if (args[0] && typeof args[0] === 'string') {
      // Highlight accessibility-related warnings
      if (args[0].includes('accessibility') || args[0].includes('a11y') || args[0].includes('ARIA')) {
        console.log('🚨 ACCESSIBILITY WARNING:', ...args);
        return;
      }
    }
    originalWarn.apply(console, args);
  };
}

// ✅ Setup global accessibility testing environment
beforeEach(() => {
  // Reset any accessibility-related state
  document.body.innerHTML = '';
  
  // Ensure proper document structure for testing
  if (!document.querySelector('main')) {
    const main = document.createElement('main');
    main.setAttribute('role', 'main');
    document.body.appendChild(main);
  }
});

// 🔍 Cleanup after each test
afterEach(() => {
  // Clean up any accessibility testing artifacts
  const testElements = document.querySelectorAll('[data-testid], [data-test]');
  testElements.forEach(element => {
    if (element.parentNode) {
      element.parentNode.removeChild(element);
    }
  });
});

// 📊 Export axe configuration for use in tests
export { axe };
export default axe;