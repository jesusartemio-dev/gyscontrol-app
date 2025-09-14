// ===================================================
// 🧪 Tests para PerformanceAlerts Component - Sistema GYS
// ===================================================
// Tests de integración para el componente de alertas de performance
// Validación de UI, filtros, interacciones y estados

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PerformanceAlerts } from './PerformanceAlerts';
import { useSystemPerformanceAlerts } from '@/lib/hooks/usePerformanceAlerts';
import type { PerformanceAlert, SystemHealth } from '@/lib/hooks/usePerformanceAlerts';

// 🎯 Mock del hook de alertas
jest.mock('@/lib/hooks/usePerformanceAlerts');
const mockUseSystemPerformanceAlerts = useSystemPerformanceAlerts as jest.MockedFunction<typeof useSystemPerformanceAlerts>;

// 🎭 Mock de Framer Motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// 🔔 Mock para toast
jest.mock('@/components/ui/use-toast', () => ({
  toast: jest.fn(),
}));

// 📊 Datos de prueba
const mockAlerts: PerformanceAlert[] = [
  {
    id: 'alert-1',
    type: 'critical',
    category: 'render',
    message: 'Critical render time detected: 150ms',
    component: 'TestComponent',
    timestamp: Date.now() - 5000,
    resolved: false,
    duration: 0,
    metrics: {
      renderTime: 150,
      memoryUsage: 45,
      reRenderCount: 3,
      apiResponseTime: 800,
      fps: 60,
      timestamp: Date.now() - 5000,
    },
  },
  {
    id: 'alert-2',
    type: 'error',
    category: 'memory',
    message: 'High memory usage detected: 85MB',
    component: 'DataTable',
    timestamp: Date.now() - 3000,
    resolved: false,
    duration: 0,
    metrics: {
      renderTime: 25,
      memoryUsage: 85,
      reRenderCount: 2,
      apiResponseTime: 600,
      fps: 58,
      timestamp: Date.now() - 3000,
    },
  },
  {
    id: 'alert-3',
    type: 'warning',
    category: 'network',
    message: 'Slow API response: 2.5s',
    component: null,
    timestamp: Date.now() - 1000,
    resolved: true,
    duration: 2000,
    metrics: {
      renderTime: 15,
      memoryUsage: 30,
      reRenderCount: 1,
      apiResponseTime: 2500,
      fps: 60,
      timestamp: Date.now() - 1000,
    },
  },
];

const mockSystemHealth: SystemHealth = {
  score: 65,
  status: 'good',
  criticalIssues: 1,
  totalIssues: 3,
};

const mockHookReturn = {
  alerts: mockAlerts,
  activeAlerts: mockAlerts.filter(a => !a.resolved),
  alertCount: mockAlerts.length,
  hasActiveAlerts: true,
  currentMetrics: mockAlerts[0].metrics,
  addMetrics: jest.fn(),
  resolveAlert: jest.fn(),
  clearAlerts: jest.fn(),
  toggleAlerts: jest.fn(),
  updateThresholds: jest.fn(),
  getAlertStats: jest.fn(() => ({
    total: 3,
    byType: { critical: 1, error: 1, warning: 1 },
    byCategory: { render: 1, memory: 1, network: 1, rerender: 0, fps: 0 },
    resolved: 1,
    avgResolutionTime: 2000,
  })),
  getSystemHealth: jest.fn(() => mockSystemHealth),
};

describe('🚨 PerformanceAlerts Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSystemPerformanceAlerts.mockReturnValue(mockHookReturn);
  });

  describe('📊 Basic Rendering', () => {
    it('should render performance alerts dashboard', () => {
      render(<PerformanceAlerts />);

      // ✅ Verificar elementos principales
      expect(screen.getByText('Performance Alerts')).toBeInTheDocument();
      expect(screen.getByText('System Health')).toBeInTheDocument();
      expect(screen.getByText('Active Alerts')).toBeInTheDocument();
      expect(screen.getByText('Alert History')).toBeInTheDocument();
    });

    it('should display system health correctly', () => {
      render(<PerformanceAlerts />);

      // ✅ Verificar métricas de salud del sistema
      expect(screen.getByText('65')).toBeInTheDocument(); // Score
      expect(screen.getByText('Good')).toBeInTheDocument(); // Status
      expect(screen.getByText('1 Critical')).toBeInTheDocument();
      expect(screen.getByText('3 Total Issues')).toBeInTheDocument();
    });

    it('should show alert counts in tabs', () => {
      render(<PerformanceAlerts />);

      // ✅ Verificar contadores en tabs
      expect(screen.getByText('Active Alerts (2)')).toBeInTheDocument();
      expect(screen.getByText('Alert History (3)')).toBeInTheDocument();
    });
  });

  describe('🔍 Alert Filtering', () => {
    it('should filter alerts by type', async () => {
      render(<PerformanceAlerts />);

      // 🔍 Abrir filtro de tipo
      const typeFilter = screen.getByText('All Types');
      fireEvent.click(typeFilter);

      // ✅ Seleccionar filtro crítico
      const criticalOption = screen.getByText('Critical');
      fireEvent.click(criticalOption);

      // 📊 Verificar que solo se muestran alertas críticas
      await waitFor(() => {
        expect(screen.getByText('Critical render time detected: 150ms')).toBeInTheDocument();
        expect(screen.queryByText('High memory usage detected: 85MB')).not.toBeInTheDocument();
      });
    });

    it('should filter alerts by category', async () => {
      render(<PerformanceAlerts />);

      // 🔍 Abrir filtro de categoría
      const categoryFilter = screen.getByText('All Categories');
      fireEvent.click(categoryFilter);

      // ✅ Seleccionar filtro de memoria
      const memoryOption = screen.getByText('Memory');
      fireEvent.click(memoryOption);

      // 📊 Verificar que solo se muestran alertas de memoria
      await waitFor(() => {
        expect(screen.getByText('High memory usage detected: 85MB')).toBeInTheDocument();
        expect(screen.queryByText('Critical render time detected: 150ms')).not.toBeInTheDocument();
      });
    });

    it('should filter alerts by component', async () => {
      render(<PerformanceAlerts />);

      // 🔍 Usar filtro de búsqueda por componente
      const searchInput = screen.getByPlaceholderText('Search alerts...');
      fireEvent.change(searchInput, { target: { value: 'TestComponent' } });

      // 📊 Verificar que solo se muestran alertas del componente
      await waitFor(() => {
        expect(screen.getByText('Critical render time detected: 150ms')).toBeInTheDocument();
        expect(screen.queryByText('High memory usage detected: 85MB')).not.toBeInTheDocument();
      });
    });

    it('should clear all filters', async () => {
      render(<PerformanceAlerts />);

      // 🔍 Aplicar filtros
      const typeFilter = screen.getByText('All Types');
      fireEvent.click(typeFilter);
      fireEvent.click(screen.getByText('Critical'));

      // 🧹 Limpiar filtros
      const clearButton = screen.getByText('Clear Filters');
      fireEvent.click(clearButton);

      // ✅ Verificar que se muestran todas las alertas
      await waitFor(() => {
        expect(screen.getByText('All Types')).toBeInTheDocument();
        expect(screen.getByText('All Categories')).toBeInTheDocument();
      });
    });
  });

  describe('⚡ Alert Actions', () => {
    it('should resolve individual alert', async () => {
      render(<PerformanceAlerts />);

      // ✅ Encontrar y hacer clic en botón de resolver
      const resolveButtons = screen.getAllByLabelText('Resolve alert');
      fireEvent.click(resolveButtons[0]);

      // 📡 Verificar que se llamó la función de resolver
      expect(mockHookReturn.resolveAlert).toHaveBeenCalledWith('alert-1');
    });

    it('should clear all alerts', async () => {
      render(<PerformanceAlerts />);

      // 🧹 Hacer clic en limpiar todas las alertas
      const clearAllButton = screen.getByText('Clear All');
      fireEvent.click(clearAllButton);

      // 📡 Verificar que se llamó la función de limpiar
      expect(mockHookReturn.clearAlerts).toHaveBeenCalled();
    });

    it('should toggle alerts on/off', async () => {
      render(<PerformanceAlerts />);

      // 🔄 Hacer clic en toggle de alertas
      const toggleButton = screen.getByLabelText('Toggle alerts');
      fireEvent.click(toggleButton);

      // 📡 Verificar que se llamó la función de toggle
      expect(mockHookReturn.toggleAlerts).toHaveBeenCalledWith(false);
    });
  });

  describe('📈 Alert Details', () => {
    it('should expand alert details', async () => {
      render(<PerformanceAlerts />);

      // 📊 Hacer clic en una alerta para expandir detalles
      const alertItem = screen.getByText('Critical render time detected: 150ms');
      fireEvent.click(alertItem);

      // ✅ Verificar que se muestran los detalles
      await waitFor(() => {
        expect(screen.getByText('Render Time:')).toBeInTheDocument();
        expect(screen.getByText('150ms')).toBeInTheDocument();
        expect(screen.getByText('Memory Usage:')).toBeInTheDocument();
        expect(screen.getByText('45MB')).toBeInTheDocument();
        expect(screen.getByText('Re-renders:')).toBeInTheDocument();
        expect(screen.getByText('3')).toBeInTheDocument();
      });
    });

    it('should show alert timestamps correctly', () => {
      render(<PerformanceAlerts />);

      // ✅ Verificar que se muestran los timestamps relativos
      expect(screen.getByText(/5 seconds ago/)).toBeInTheDocument();
      expect(screen.getByText(/3 seconds ago/)).toBeInTheDocument();
      expect(screen.getByText(/1 second ago/)).toBeInTheDocument();
    });

    it('should display component names correctly', () => {
      render(<PerformanceAlerts />);

      // ✅ Verificar nombres de componentes
      expect(screen.getByText('TestComponent')).toBeInTheDocument();
      expect(screen.getByText('DataTable')).toBeInTheDocument();
      expect(screen.getByText('System')).toBeInTheDocument(); // Para alertas sin componente
    });
  });

  describe('🎨 Visual States', () => {
    it('should show correct alert type badges', () => {
      render(<PerformanceAlerts />);

      // ✅ Verificar badges de tipo
      expect(screen.getByText('CRITICAL')).toBeInTheDocument();
      expect(screen.getByText('ERROR')).toBeInTheDocument();
      expect(screen.getByText('WARNING')).toBeInTheDocument();
    });

    it('should show correct category icons', () => {
      render(<PerformanceAlerts />);

      // ✅ Verificar que se renderizan los iconos (por aria-label)
      expect(screen.getByLabelText('Render alert')).toBeInTheDocument();
      expect(screen.getByLabelText('Memory alert')).toBeInTheDocument();
      expect(screen.getByLabelText('Network alert')).toBeInTheDocument();
    });

    it('should show resolved alerts differently', () => {
      render(<PerformanceAlerts />);

      // 📊 Cambiar a tab de historial
      const historyTab = screen.getByText('Alert History (3)');
      fireEvent.click(historyTab);

      // ✅ Verificar que las alertas resueltas se muestran diferente
      const resolvedAlert = screen.getByText('Slow API response: 2.5s');
      expect(resolvedAlert.closest('[data-resolved="true"]')).toBeInTheDocument();
    });
  });

  describe('📱 Responsive Behavior', () => {
    it('should handle mobile layout', () => {
      // 📱 Simular viewport móvil
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(<PerformanceAlerts />);

      // ✅ Verificar que el componente se renderiza correctamente
      expect(screen.getByText('Performance Alerts')).toBeInTheDocument();
    });
  });

  describe('🔄 Tab Navigation', () => {
    it('should switch between active and history tabs', async () => {
      render(<PerformanceAlerts />);

      // 📊 Por defecto debería mostrar alertas activas
      expect(screen.getByText('Critical render time detected: 150ms')).toBeInTheDocument();
      expect(screen.getByText('High memory usage detected: 85MB')).toBeInTheDocument();

      // 🔄 Cambiar a tab de historial
      const historyTab = screen.getByText('Alert History (3)');
      fireEvent.click(historyTab);

      // ✅ Verificar que se muestran todas las alertas incluyendo resueltas
      await waitFor(() => {
        expect(screen.getByText('Slow API response: 2.5s')).toBeInTheDocument();
      });
    });
  });

  describe('📊 Export Functionality', () => {
    it('should export alerts data', async () => {
      // 📋 Mock del clipboard
      const mockWriteText = jest.fn();
      Object.assign(navigator, {
        clipboard: {
          writeText: mockWriteText,
        },
      });

      render(<PerformanceAlerts />);

      // 📤 Hacer clic en exportar
      const exportButton = screen.getByText('Export');
      fireEvent.click(exportButton);

      // ✅ Verificar que se copió al clipboard
      await waitFor(() => {
        expect(mockWriteText).toHaveBeenCalled();
      });
    });
  });

  describe('🚫 Empty States', () => {
    it('should show empty state when no alerts', () => {
      // 📊 Mock sin alertas
      mockUseSystemPerformanceAlerts.mockReturnValue({
        ...mockHookReturn,
        alerts: [],
        activeAlerts: [],
        alertCount: 0,
        hasActiveAlerts: false,
      });

      render(<PerformanceAlerts />);

      // ✅ Verificar estado vacío
      expect(screen.getByText('No active alerts')).toBeInTheDocument();
      expect(screen.getByText('System is running smoothly')).toBeInTheDocument();
    });

    it('should show empty history when no resolved alerts', () => {
      // 📊 Mock solo con alertas activas
      mockUseSystemPerformanceAlerts.mockReturnValue({
        ...mockHookReturn,
        alerts: mockAlerts.filter(a => !a.resolved),
      });

      render(<PerformanceAlerts />);

      // 🔄 Cambiar a tab de historial
      const historyTab = screen.getByText('Alert History (2)');
      fireEvent.click(historyTab);

      // ✅ Verificar estado vacío en historial
      expect(screen.getByText('No alert history')).toBeInTheDocument();
    });
  });

  describe('⚠️ Error Handling', () => {
    it('should handle hook errors gracefully', () => {
      // 💥 Mock error en el hook
      mockUseSystemPerformanceAlerts.mockImplementation(() => {
        throw new Error('Hook error');
      });

      // ✅ No debería crashear
      expect(() => render(<PerformanceAlerts />)).not.toThrow();
    });
  });

  describe('♿ Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<PerformanceAlerts />);

      // ✅ Verificar labels de accesibilidad
      expect(screen.getByLabelText('Toggle alerts')).toBeInTheDocument();
      expect(screen.getByLabelText('Search alerts')).toBeInTheDocument();
      expect(screen.getAllByLabelText('Resolve alert')).toHaveLength(2); // Solo alertas activas
    });

    it('should support keyboard navigation', () => {
      render(<PerformanceAlerts />);

      // ⌨️ Verificar que los elementos son focusables
      const toggleButton = screen.getByLabelText('Toggle alerts');
      const searchInput = screen.getByLabelText('Search alerts');
      
      expect(toggleButton).toHaveAttribute('tabIndex', '0');
      expect(searchInput).toHaveAttribute('type', 'text');
    });
  });
});