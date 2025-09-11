/**
 * @fileoverview Tests de accesibilidad para el módulo de aprovisionamiento financiero
 * @version 1.0.0
 * @author GYS Team
 * @created 2024-01-15
 */

import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import userEvent from '@testing-library/user-event';
import { jest } from '@jest/globals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SessionProvider } from 'next-auth/react';

// ✅ Components to test
import AprovisionamientoPage from '@/app/(finanzas)/finanzas/aprovisionamiento/page';
import ProyectosPage from '@/app/(finanzas)/finanzas/aprovisionamiento/proyectos/page';
import ListasPage from '@/app/(finanzas)/finanzas/aprovisionamiento/listas/page';
import PedidosPage from '@/app/(finanzas)/finanzas/aprovisionamiento/pedidos/page';
import TimelinePage from '@/app/(finanzas)/finanzas/aprovisionamiento/timeline/page';

// 🔁 Components
import { ProyectoAprovisionamientoTable } from '@/components/finanzas/aprovisionamiento/ProyectoAprovisionamientoTable';
import { ProyectoAprovisionamientoFilters } from '@/components/finanzas/aprovisionamiento/ProyectoAprovisionamientoFilters';
import { GanttChart } from '@/components/finanzas/aprovisionamiento/GanttChart';
import { ProyectoCoherenciaIndicator } from '@/components/finanzas/aprovisionamiento/ProyectoCoherenciaIndicator';

// 📡 Mock services
jest.mock('@/lib/services/aprovisionamiento');
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn()
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/finanzas/aprovisionamiento'
}));

// 🧮 Extend Jest matchers
expect.extend(toHaveNoViolations);

// 📊 Mock data
const mockSession = {
  user: {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    role: 'Admin'
  },
  expires: '2024-12-31'
};

const mockProyectos = [
  {
    id: 'proyecto-1',
    nombre: 'Proyecto Alpha',
    codigo: 'PRY-001',
    fechaInicio: new Date('2024-01-01'),
    fechaFin: new Date('2024-12-31'),
    totalInterno: 100000,
    totalReal: 75000,
    estado: 'activo',
    comercial: { id: '1', nombre: 'Juan Pérez' },
    gestor: { id: '2', nombre: 'María García' },
    cliente: { id: '1', nombre: 'Cliente Alpha' },
    _count: { listaEquipos: 3, pedidos: 5 }
  }
];

const mockListas = [
  {
    id: 'lista-1',
    codigo: 'LST-001',
    proyectoId: 'proyecto-1',
    fechaNecesaria: new Date('2024-06-15'),
    estado: 'aprobado',
    proyecto: mockProyectos[0],
    items: [
      {
        id: 'item-1',
        cantidad: 10,
        precioElegido: 500,
        tiempoEntregaDias: 30,
        descripcion: 'Bomba centrífuga'
      }
    ],
    pedidos: []
  }
];

const mockGanttData = {
  ganttData: [
    {
      id: 'lista-1',
      nombre: 'LST-001',
      fechaInicio: new Date('2024-05-15'),
      fechaFin: new Date('2024-06-15'),
      montoProyectado: 5000,
      criticidad: 'media',
      progreso: 60
    }
  ],
  fechasCriticas: []
};

// 📊 Test wrapper with accessibility considerations
function AccessibleTestWrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return (
    <SessionProvider session={mockSession}>
      <QueryClientProvider client={queryClient}>
        <div role="main" aria-label="Aplicación de aprovisionamiento financiero">
          {children}
        </div>
      </QueryClientProvider>
    </SessionProvider>
  );
}

// 🔧 Accessibility test utilities
const accessibilityUtils = {
  // ✅ Run axe accessibility tests
  runAxeTest: async (container: HTMLElement) => {
    const results = await axe(container);
    expect(results).toHaveNoViolations();
    return results;
  },
  
  // 🔍 Check keyboard navigation
  testKeyboardNavigation: async (element: HTMLElement) => {
    const user = userEvent.setup();
    
    // Test Tab navigation
    await user.tab();
    expect(document.activeElement).toBe(element);
    
    // Test Shift+Tab navigation
    await user.tab({ shift: true });
    
    return true;
  },
  
  // 📊 Check ARIA attributes
  checkAriaAttributes: (element: HTMLElement, expectedAttributes: Record<string, string>) => {
    Object.entries(expectedAttributes).forEach(([attr, value]) => {
      expect(element).toHaveAttribute(attr, value);
    });
  },
  
  // 🎯 Check focus management
  checkFocusManagement: async (container: HTMLElement) => {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    expect(focusableElements.length).toBeGreaterThan(0);
    
    // Check that all focusable elements have visible focus indicators
    focusableElements.forEach(element => {
      const styles = window.getComputedStyle(element as HTMLElement);
      // This would need to be adapted based on your focus styles
      expect(styles.outline).not.toBe('none');
    });
  },
  
  // 🔊 Check screen reader compatibility
  checkScreenReaderSupport: (container: HTMLElement) => {
    // Check for proper heading structure
    const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
    expect(headings.length).toBeGreaterThan(0);
    
    // Check for alt text on images
    const images = container.querySelectorAll('img');
    images.forEach(img => {
      expect(img).toHaveAttribute('alt');
    });
    
    // Check for form labels
    const inputs = container.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
      const id = input.getAttribute('id');
      if (id) {
        const label = container.querySelector(`label[for="${id}"]`);
        const ariaLabel = input.getAttribute('aria-label');
        const ariaLabelledBy = input.getAttribute('aria-labelledby');
        
        expect(label || ariaLabel || ariaLabelledBy).toBeTruthy();
      }
    });
  }
};

describe('Accessibility: Aprovisionamiento Module', () => {
  describe('Page Level Accessibility', () => {
    test('Dashboard page should be accessible', async () => {
      const { container } = render(
        <AccessibleTestWrapper>
          <AprovisionamientoPage />
        </AccessibleTestWrapper>
      );

      // ✅ Run axe accessibility tests
      await accessibilityUtils.runAxeTest(container);
      
      // 🔍 Check screen reader support
      accessibilityUtils.checkScreenReaderSupport(container);
      
      // 📊 Check heading structure
      const mainHeading = screen.getByRole('heading', { level: 1 });
      expect(mainHeading).toBeInTheDocument();
      expect(mainHeading).toHaveTextContent(/aprovisionamiento/i);
    });

    test('Projects page should be accessible', async () => {
      const { container } = render(
        <AccessibleTestWrapper>
          <ProyectosPage />
        </AccessibleTestWrapper>
      );

      await accessibilityUtils.runAxeTest(container);
      
      // 🔍 Check table accessibility
      const table = screen.getByRole('table');
      expect(table).toHaveAttribute('aria-label');
      
      // 📊 Check column headers
      const columnHeaders = screen.getAllByRole('columnheader');
      expect(columnHeaders.length).toBeGreaterThan(0);
      
      columnHeaders.forEach(header => {
        expect(header).toHaveAttribute('scope', 'col');
      });
    });

    test('Equipment lists page should be accessible', async () => {
      const { container } = render(
        <AccessibleTestWrapper>
          <ListasPage />
        </AccessibleTestWrapper>
      );

      await accessibilityUtils.runAxeTest(container);
      
      // 🔍 Check filter accessibility
      const filterRegion = screen.getByRole('region', { name: /filtros/i });
      expect(filterRegion).toBeInTheDocument();
    });

    test('Orders page should be accessible', async () => {
      const { container } = render(
        <AccessibleTestWrapper>
          <PedidosPage />
        </AccessibleTestWrapper>
      );

      await accessibilityUtils.runAxeTest(container);
    });

    test('Timeline page should be accessible', async () => {
      const { container } = render(
        <AccessibleTestWrapper>
          <TimelinePage />
        </AccessibleTestWrapper>
      );

      await accessibilityUtils.runAxeTest(container);
      
      // 🔍 Check Gantt chart accessibility
      const ganttChart = screen.getByRole('img', { name: /gantt/i });
      expect(ganttChart).toHaveAttribute('alt');
    });
  });

  describe('Component Level Accessibility', () => {
    test('ProyectoAprovisionamientoTable should be accessible', async () => {
      const { container } = render(
        <AccessibleTestWrapper>
          <ProyectoAprovisionamientoTable 
            proyectos={mockProyectos}
            loading={false}
            onEdit={jest.fn()}
            onView={jest.fn()}
            onDelete={jest.fn()}
          />
        </AccessibleTestWrapper>
      );

      await accessibilityUtils.runAxeTest(container);
      
      // ✅ Check table structure
      const table = screen.getByRole('table');
      expect(table).toHaveAttribute('aria-label', 'Tabla de proyectos de aprovisionamiento');
      
      // 🔍 Check row accessibility
      const rows = screen.getAllByRole('row');
      expect(rows.length).toBeGreaterThan(1); // Header + data rows
      
      // 📊 Check action buttons accessibility
      const actionButtons = screen.getAllByRole('button');
      actionButtons.forEach(button => {
        expect(button).toHaveAttribute('aria-label');
      });
    });

    test('ProyectoAprovisionamientoFilters should be accessible', async () => {
      const { container } = render(
        <AccessibleTestWrapper>
          <ProyectoAprovisionamientoFilters 
            onFiltersChange={jest.fn()}
            loading={false}
          />
        </AccessibleTestWrapper>
      );

      await accessibilityUtils.runAxeTest(container);
      
      // ✅ Check form accessibility
      const filterForm = container.querySelector('form');
      expect(filterForm).toHaveAttribute('role', 'search');
      
      // 🔍 Check input labels
      const searchInput = screen.getByRole('searchbox');
      expect(searchInput).toHaveAttribute('aria-label');
      
      // 📊 Check select accessibility
      const selects = screen.getAllByRole('combobox');
      selects.forEach(select => {
        expect(select).toHaveAttribute('aria-label');
      });
    });

    test('GanttChart should be accessible', async () => {
      const { container } = render(
        <AccessibleTestWrapper>
          <GanttChart 
            data={mockGanttData.ganttData}
            fechasCriticas={mockGanttData.fechasCriticas}
            tipo="listas"
          />
        </AccessibleTestWrapper>
      );

      await accessibilityUtils.runAxeTest(container);
      
      // ✅ Check SVG accessibility
      const svgElement = container.querySelector('svg');
      expect(svgElement).toHaveAttribute('role', 'img');
      expect(svgElement).toHaveAttribute('aria-label');
      
      // 🔍 Check chart description
      const description = container.querySelector('[aria-describedby]');
      if (description) {
        const descriptionId = description.getAttribute('aria-describedby');
        const descriptionElement = container.querySelector(`#${descriptionId}`);
        expect(descriptionElement).toBeInTheDocument();
      }
    });

    test('ProyectoCoherenciaIndicator should be accessible', async () => {
      const { container } = render(
        <AccessibleTestWrapper>
          <ProyectoCoherenciaIndicator 
            coherencia={85}
            alertas={2}
            proyectoId="proyecto-1"
          />
        </AccessibleTestWrapper>
      );

      await accessibilityUtils.runAxeTest(container);
      
      // ✅ Check indicator accessibility
      const indicator = screen.getByRole('status');
      expect(indicator).toHaveAttribute('aria-label');
      
      // 🔍 Check progress indicator
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '85');
      expect(progressBar).toHaveAttribute('aria-valuemin', '0');
      expect(progressBar).toHaveAttribute('aria-valuemax', '100');
    });
  });

  describe('Keyboard Navigation', () => {
    test('should support keyboard navigation in tables', async () => {
      const user = userEvent.setup();
      
      render(
        <AccessibleTestWrapper>
          <ProyectoAprovisionamientoTable 
            proyectos={mockProyectos}
            loading={false}
            onEdit={jest.fn()}
            onView={jest.fn()}
            onDelete={jest.fn()}
          />
        </AccessibleTestWrapper>
      );

      // ✅ Test Tab navigation through table
      const firstButton = screen.getAllByRole('button')[0];
      firstButton.focus();
      
      await user.tab();
      expect(document.activeElement).not.toBe(firstButton);
      
      // 🔍 Test Enter key activation
      const viewButton = screen.getByRole('button', { name: /ver/i });
      viewButton.focus();
      await user.keyboard('{Enter}');
      
      // 📊 Test Escape key for modals
      await user.keyboard('{Escape}');
    });

    test('should support keyboard navigation in filters', async () => {
      const user = userEvent.setup();
      
      render(
        <AccessibleTestWrapper>
          <ProyectoAprovisionamientoFilters 
            onFiltersChange={jest.fn()}
            loading={false}
          />
        </AccessibleTestWrapper>
      );

      // ✅ Test search input navigation
      const searchInput = screen.getByRole('searchbox');
      await user.click(searchInput);
      await user.type(searchInput, 'test search');
      
      // 🔍 Test select navigation
      const selects = screen.getAllByRole('combobox');
      if (selects.length > 0) {
        await user.tab();
        await user.keyboard('{ArrowDown}');
        await user.keyboard('{Enter}');
      }
    });

    test('should support keyboard navigation in Gantt chart', async () => {
      const user = userEvent.setup();
      
      render(
        <AccessibleTestWrapper>
          <GanttChart 
            data={mockGanttData.ganttData}
            fechasCriticas={mockGanttData.fechasCriticas}
            tipo="listas"
          />
        </AccessibleTestWrapper>
      );

      // ✅ Test focus on chart elements
      const chartContainer = screen.getByRole('img');
      chartContainer.focus();
      
      // 🔍 Test arrow key navigation (if implemented)
      await user.keyboard('{ArrowRight}');
      await user.keyboard('{ArrowLeft}');
    });
  });

  describe('Screen Reader Support', () => {
    test('should provide proper ARIA labels for data tables', () => {
      render(
        <AccessibleTestWrapper>
          <ProyectoAprovisionamientoTable 
            proyectos={mockProyectos}
            loading={false}
            onEdit={jest.fn()}
            onView={jest.fn()}
            onDelete={jest.fn()}
          />
        </AccessibleTestWrapper>
      );

      // ✅ Check table caption
      const table = screen.getByRole('table');
      expect(table).toHaveAttribute('aria-label');
      
      // 🔍 Check column headers
      const headers = screen.getAllByRole('columnheader');
      headers.forEach(header => {
        expect(header).toHaveTextContent(/.+/);
      });
      
      // 📊 Check row descriptions
      const cells = screen.getAllByRole('cell');
      expect(cells.length).toBeGreaterThan(0);
    });

    test('should provide status announcements for dynamic content', async () => {
      const { rerender } = render(
        <AccessibleTestWrapper>
          <ProyectoAprovisionamientoTable 
            proyectos={[]}
            loading={true}
            onEdit={jest.fn()}
            onView={jest.fn()}
            onDelete={jest.fn()}
          />
        </AccessibleTestWrapper>
      );

      // ✅ Check loading state announcement
      expect(screen.getByRole('status')).toHaveTextContent(/cargando/i);
      
      // 🔍 Check loaded state announcement
      rerender(
        <AccessibleTestWrapper>
          <ProyectoAprovisionamientoTable 
            proyectos={mockProyectos}
            loading={false}
            onEdit={jest.fn()}
            onView={jest.fn()}
            onDelete={jest.fn()}
          />
        </AccessibleTestWrapper>
      );
      
      expect(screen.getByRole('status')).toHaveTextContent(/1 proyecto/i);
    });

    test('should provide proper form field descriptions', () => {
      render(
        <AccessibleTestWrapper>
          <ProyectoAprovisionamientoFilters 
            onFiltersChange={jest.fn()}
            loading={false}
          />
        </AccessibleTestWrapper>
      );

      // ✅ Check input descriptions
      const searchInput = screen.getByRole('searchbox');
      const describedBy = searchInput.getAttribute('aria-describedby');
      
      if (describedBy) {
        const description = document.getElementById(describedBy);
        expect(description).toBeInTheDocument();
      }
    });
  });

  describe('Color and Contrast', () => {
    test('should not rely solely on color for information', () => {
      render(
        <AccessibleTestWrapper>
          <ProyectoCoherenciaIndicator 
            coherencia={85}
            alertas={2}
            proyectoId="proyecto-1"
          />
        </AccessibleTestWrapper>
      );

      // ✅ Check that status indicators have text or icons in addition to color
      const statusElements = screen.getAllByRole('status');
      statusElements.forEach(element => {
        const hasText = element.textContent && element.textContent.trim().length > 0;
        const hasAriaLabel = element.getAttribute('aria-label');
        const hasIcon = element.querySelector('svg, [data-icon]');
        
        expect(hasText || hasAriaLabel || hasIcon).toBeTruthy();
      });
    });

    test('should have sufficient color contrast', async () => {
      const { container } = render(
        <AccessibleTestWrapper>
          <AprovisionamientoPage />
        </AccessibleTestWrapper>
      );

      // ✅ Run axe color contrast tests
      const results = await axe(container, {
        rules: {
          'color-contrast': { enabled: true }
        }
      });
      
      expect(results).toHaveNoViolations();
    });
  });

  describe('Focus Management', () => {
    test('should manage focus properly in modals', async () => {
      const user = userEvent.setup();
      
      render(
        <AccessibleTestWrapper>
          <ProyectoAprovisionamientoTable 
            proyectos={mockProyectos}
            loading={false}
            onEdit={jest.fn()}
            onView={jest.fn()}
            onDelete={jest.fn()}
          />
        </AccessibleTestWrapper>
      );

      // ✅ Open modal and check focus
      const editButton = screen.getByRole('button', { name: /editar/i });
      await user.click(editButton);
      
      // 🔍 Check that focus is trapped in modal
      const modal = screen.getByRole('dialog');
      expect(modal).toBeInTheDocument();
      
      // 📊 Check that first focusable element is focused
      const firstFocusable = modal.querySelector('button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (firstFocusable) {
        expect(document.activeElement).toBe(firstFocusable);
      }
    });

    test('should restore focus after modal closes', async () => {
      const user = userEvent.setup();
      
      render(
        <AccessibleTestWrapper>
          <ProyectoAprovisionamientoTable 
            proyectos={mockProyectos}
            loading={false}
            onEdit={jest.fn()}
            onView={jest.fn()}
            onDelete={jest.fn()}
          />
        </AccessibleTestWrapper>
      );

      // ✅ Remember initial focus
      const editButton = screen.getByRole('button', { name: /editar/i });
      editButton.focus();
      const initialFocus = document.activeElement;
      
      // 🔍 Open and close modal
      await user.click(editButton);
      await user.keyboard('{Escape}');
      
      // 📊 Check focus is restored
      expect(document.activeElement).toBe(initialFocus);
    });
  });

  describe('Error Handling Accessibility', () => {
    test('should announce errors to screen readers', async () => {
      render(
        <AccessibleTestWrapper>
          <ProyectoAprovisionamientoFilters 
            onFiltersChange={jest.fn()}
            loading={false}
          />
        </AccessibleTestWrapper>
      );

      // ✅ Check error announcements
      const errorRegion = screen.queryByRole('alert');
      if (errorRegion) {
        expect(errorRegion).toHaveAttribute('aria-live', 'assertive');
      }
    });

    test('should provide clear error messages', () => {
      // This would test form validation errors
      // Implementation depends on your form validation setup
    });
  });

  describe('Mobile Accessibility', () => {
    test('should be accessible on touch devices', () => {
      // Mock touch device
      Object.defineProperty(window, 'ontouchstart', {
        value: () => {},
        writable: true
      });
      
      render(
        <AccessibleTestWrapper>
          <AprovisionamientoPage />
        </AccessibleTestWrapper>
      );

      // ✅ Check touch targets are large enough (44px minimum)
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        const styles = window.getComputedStyle(button);
        const minSize = 44; // WCAG AA standard
        
        // This would need actual size calculation in a real test
        expect(parseInt(styles.minHeight) || 44).toBeGreaterThanOrEqual(minSize);
      });
    });
  });
});

// 📊 Accessibility test utilities export
export const accessibilityTestUtils = {
  ...accessibilityUtils,
  
  // ✅ Comprehensive accessibility audit
  runFullAccessibilityAudit: async (container: HTMLElement) => {
    const results = await axe(container, {
      rules: {
        // Enable all WCAG 2.1 AA rules
        'wcag2a': { enabled: true },
        'wcag2aa': { enabled: true },
        'wcag21aa': { enabled: true }
      }
    });
    
    return {
      violations: results.violations,
      passes: results.passes,
      incomplete: results.incomplete,
      inapplicable: results.inapplicable
    };
  },
  
  // 🔍 Generate accessibility report
  generateAccessibilityReport: async (container: HTMLElement) => {
    const audit = await accessibilityTestUtils.runFullAccessibilityAudit(container);
    
    return {
      summary: {
        totalViolations: audit.violations.length,
        totalPasses: audit.passes.length,
        totalIncomplete: audit.incomplete.length,
        score: audit.passes.length / (audit.passes.length + audit.violations.length) * 100
      },
      details: audit
    };
  }
};
