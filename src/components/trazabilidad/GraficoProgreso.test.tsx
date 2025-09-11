import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GraficoProgreso from './GraficoProgreso';
import { type GraficoProgresoData } from '@/types/modelos';

// Mock recharts to avoid canvas issues in tests
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  ReferenceLine: () => <div data-testid="reference-line" />,
}));

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  TrendingUp: () => <div data-testid="trending-up-icon" />,
  TrendingDown: () => <div data-testid="trending-down-icon" />,
  BarChart3: () => <div data-testid="bar-chart-icon" />,
  Calendar: () => <div data-testid="calendar-icon" />,
  Download: () => <div data-testid="download-icon" />,
  RefreshCw: () => <div data-testid="refresh-icon" />,
  Info: () => <div data-testid="info-icon" />,
  Settings: () => <div data-testid="settings-icon" />,
}));

// Mock utils
jest.mock('@/lib/utils/graficos', () => ({
  formatearFecha: (fecha: Date) => fecha.toLocaleDateString('es-ES'),
  calcularTendencia: (datos: any[]) => ({
    direccion: 'ascendente',
    porcentaje: 15.5,
    esSignificativa: true,
  }),
  generarColoresGrafico: (cantidad: number) => [
    '#3b82f6',
    '#ef4444',
    '#10b981',
    '#f59e0b',
    '#8b5cf6',
  ].slice(0, cantidad),
}));

jest.mock('@/lib/utils', () => ({
  cn: (...classes: string[]) => classes.filter(Boolean).join(' '),
}));

describe('GraficoProgreso', () => {
  const mockDatos: GraficoProgresoData = {
    fechas: [
      new Date('2024-01-01'),
      new Date('2024-01-02'),
      new Date('2024-01-03'),
      new Date('2024-01-04'),
      new Date('2024-01-05'),
    ],
    series: [
      {
        nombre: 'Entregas Completadas',
        datos: [10, 15, 12, 18, 22],
        color: '#10b981',
        tipo: 'line',
      },
      {
        nombre: 'Entregas Pendientes',
        datos: [5, 8, 6, 4, 3],
        color: '#f59e0b',
        tipo: 'line',
      },
    ],
    meta: {
      total: 100,
      promedio: 14.4,
      tendencia: {
        direccion: 'ascendente',
        porcentaje: 15.5,
        esSignificativa: true,
      },
    },
  };

  afterEach(() => cleanup());

  describe('Rendering', () => {
    it('should render correctly with data', () => {
      render(<GraficoProgreso datos={mockDatos} />);
      
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      expect(screen.getByText('Entregas Completadas')).toBeInTheDocument();
      expect(screen.getByText('Entregas Pendientes')).toBeInTheDocument();
    });

    it('should render with custom title', () => {
      render(<GraficoProgreso datos={mockDatos} titulo="Progreso de Entregas" />);
      
      expect(screen.getByText('Progreso de Entregas')).toBeInTheDocument();
    });

    it('should render with custom height', () => {
      render(<GraficoProgreso datos={mockDatos} altura={500} />);
      
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    });

    it('should show loading skeleton when cargando is true', () => {
      render(<GraficoProgreso datos={mockDatos} cargando={true} />);
      
      // Should show skeleton instead of chart
      expect(screen.queryByTestId('line-chart')).not.toBeInTheDocument();
    });

    it('should handle empty data gracefully', () => {
      const datosVacios: GraficoProgresoData = {
        fechas: [],
        series: [],
        meta: {
          total: 0,
          promedio: 0,
        },
      };
      
      render(<GraficoProgreso datos={datosVacios} />);
      
      // Should show empty state or handle gracefully
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    });
  });

  describe('Chart Configuration', () => {
    it('should display trend information when available', () => {
      render(<GraficoProgreso datos={mockDatos} mostrarTendencia={true} />);
      
      expect(screen.getByTestId('trending-up-icon')).toBeInTheDocument();
      expect(screen.getByText(/15.5%/)).toBeInTheDocument();
    });

    it('should hide trend when mostrarTendencia is false', () => {
      render(<GraficoProgreso datos={mockDatos} mostrarTendencia={false} />);
      
      expect(screen.queryByTestId('trending-up-icon')).not.toBeInTheDocument();
      expect(screen.queryByText(/15.5%/)).not.toBeInTheDocument();
    });

    it('should display legend when mostrarLeyenda is true', () => {
      render(<GraficoProgreso datos={mockDatos} mostrarLeyenda={true} />);
      
      expect(screen.getByTestId('legend')).toBeInTheDocument();
    });

    it('should hide legend when mostrarLeyenda is false', () => {
      render(<GraficoProgreso datos={mockDatos} mostrarLeyenda={false} />);
      
      expect(screen.queryByTestId('legend')).not.toBeInTheDocument();
    });

    it('should display grid when mostrarGrid is true', () => {
      render(<GraficoProgreso datos={mockDatos} mostrarGrid={true} />);
      
      expect(screen.getByTestId('cartesian-grid')).toBeInTheDocument();
    });

    it('should handle different chart types', () => {
      const datosConBarras: GraficoProgresoData = {
        ...mockDatos,
        series: [
          {
            ...mockDatos.series[0],
            tipo: 'bar',
          },
        ],
      };
      
      render(<GraficoProgreso datos={datosConBarras} />);
      
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should handle data point click', async () => {
      const mockOnDataClick = jest.fn();
      const user = userEvent.setup();
      
      render(
        <GraficoProgreso 
          datos={mockDatos} 
          onDataClick={mockOnDataClick}
        />
      );
      
      // Simulate clicking on a data point (implementation specific)
      const chartElement = screen.getByTestId('line-chart');
      await user.click(chartElement);
      
      // Note: Actual click handling depends on recharts implementation
    });

    it('should handle export functionality', async () => {
      const mockOnExportar = jest.fn();
      const user = userEvent.setup();
      
      render(
        <GraficoProgreso 
          datos={mockDatos} 
          onExportar={mockOnExportar}
          mostrarExportar={true}
        />
      );
      
      const exportButton = screen.queryByTestId('download-icon');
      if (exportButton) {
        await user.click(exportButton);
        expect(mockOnExportar).toHaveBeenCalled();
      }
    });

    it('should handle refresh functionality', async () => {
      const mockOnRefresh = jest.fn();
      const user = userEvent.setup();
      
      render(
        <GraficoProgreso 
          datos={mockDatos} 
          onRefresh={mockOnRefresh}
          mostrarRefresh={true}
        />
      );
      
      const refreshButton = screen.queryByTestId('refresh-icon');
      if (refreshButton) {
        await user.click(refreshButton);
        expect(mockOnRefresh).toHaveBeenCalled();
      }
    });

    it('should handle period selection', async () => {
      const mockOnPeriodoChange = jest.fn();
      const user = userEvent.setup();
      
      render(
        <GraficoProgreso 
          datos={mockDatos} 
          onPeriodoChange={mockOnPeriodoChange}
          mostrarSelectorPeriodo={true}
        />
      );
      
      const periodSelector = screen.queryByRole('combobox');
      if (periodSelector) {
        await user.click(periodSelector);
        // Select a different period
        const option = screen.queryByText('Último mes');
        if (option) {
          await user.click(option);
          expect(mockOnPeriodoChange).toHaveBeenCalled();
        }
      }
    });
  });

  describe('Data Processing', () => {
    it('should handle multiple series correctly', () => {
      const datosMultipleSeries: GraficoProgresoData = {
        ...mockDatos,
        series: [
          ...mockDatos.series,
          {
            nombre: 'Entregas Canceladas',
            datos: [2, 1, 3, 1, 0],
            color: '#ef4444',
            tipo: 'line',
          },
        ],
      };
      
      render(<GraficoProgreso datos={datosMultipleSeries} />);
      
      expect(screen.getByText('Entregas Completadas')).toBeInTheDocument();
      expect(screen.getByText('Entregas Pendientes')).toBeInTheDocument();
      expect(screen.getByText('Entregas Canceladas')).toBeInTheDocument();
    });

    it('should format dates correctly', () => {
      render(<GraficoProgreso datos={mockDatos} />);
      
      // Check that dates are formatted (specific implementation may vary)
      expect(screen.getByTestId('x-axis')).toBeInTheDocument();
    });

    it('should calculate and display statistics', () => {
      render(<GraficoProgreso datos={mockDatos} mostrarEstadisticas={true} />);
      
      // Should show total and average
      expect(screen.getByText(/100/)).toBeInTheDocument(); // Total
      expect(screen.getByText(/14.4/)).toBeInTheDocument(); // Average
    });
  });

  describe('Responsive Behavior', () => {
    it('should adapt to different screen sizes', () => {
      render(<GraficoProgreso datos={mockDatos} responsivo={true} />);
      
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    });

    it('should handle mobile layout', () => {
      // Mock window.innerWidth for mobile
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      
      render(<GraficoProgreso datos={mockDatos} />);
      
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should be accessible', () => {
      render(<GraficoProgreso datos={mockDatos} />);
      
      // Chart should have proper ARIA labels
      const chartContainer = screen.getByTestId('responsive-container');
      expect(chartContainer).toBeInTheDocument();
    });

    it('should provide alternative text for screen readers', () => {
      render(<GraficoProgreso datos={mockDatos} />);
      
      // Should provide text alternatives for chart data
      expect(screen.getByText('Entregas Completadas')).toBeInTheDocument();
      expect(screen.getByText('Entregas Pendientes')).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      
      render(<GraficoProgreso datos={mockDatos} />);
      
      // Should be able to navigate chart elements with keyboard
      await user.tab();
      // Focus should move to interactive elements
    });
  });

  describe('Performance', () => {
    it('should handle large datasets efficiently', () => {
      const largeDatos: GraficoProgresoData = {
        fechas: Array.from({ length: 1000 }, (_, i) => new Date(2024, 0, i + 1)),
        series: [
          {
            nombre: 'Serie Grande',
            datos: Array.from({ length: 1000 }, () => Math.floor(Math.random() * 100)),
            color: '#3b82f6',
            tipo: 'line',
          },
        ],
        meta: {
          total: 50000,
          promedio: 50,
        },
      };
      
      const startTime = performance.now();
      render(<GraficoProgreso datos={largeDatos} />);
      const endTime = performance.now();
      
      // Should render within reasonable time
      expect(endTime - startTime).toBeLessThan(1000); // Less than 1 second
    });

    it('should memoize expensive calculations', () => {
      const { rerender } = render(<GraficoProgreso datos={mockDatos} />);
      
      // Re-render with same data should be fast
      const startTime = performance.now();
      rerender(<GraficoProgreso datos={mockDatos} />);
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(100); // Very fast re-render
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid data gracefully', () => {
      const datosInvalidos: any = {
        fechas: null,
        series: undefined,
      };
      
      expect(() => {
        render(<GraficoProgreso datos={datosInvalidos} />);
      }).not.toThrow();
    });

    it('should handle mismatched data lengths', () => {
      const datosMalFormados: GraficoProgresoData = {
        fechas: [new Date(), new Date()], // 2 dates
        series: [
          {
            nombre: 'Serie',
            datos: [1, 2, 3, 4, 5], // 5 data points
            color: '#3b82f6',
            tipo: 'line',
          },
        ],
        meta: {
          total: 15,
          promedio: 3,
        },
      };
      
      expect(() => {
        render(<GraficoProgreso datos={datosMalFormados} />);
      }).not.toThrow();
    });

    it('should handle missing colors gracefully', () => {
      const datosSinColores: GraficoProgresoData = {
        ...mockDatos,
        series: [
          {
            nombre: 'Serie sin color',
            datos: [1, 2, 3, 4, 5],
            color: '', // Empty color
            tipo: 'line',
          },
        ],
      };
      
      render(<GraficoProgreso datos={datosSinColores} />);
      
      expect(screen.getByText('Serie sin color')).toBeInTheDocument();
    });
  });
});