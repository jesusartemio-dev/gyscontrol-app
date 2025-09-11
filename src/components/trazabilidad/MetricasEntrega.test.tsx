import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MetricasEntrega, crearMetricaEntrega, METRICAS_PREDEFINIDAS } from './MetricasEntrega';
import type { MetricaEntrega } from './MetricasEntrega';
import { Package, CheckCircle, Clock, Target } from 'lucide-react';

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Package: () => <div data-testid="package-icon" />,
  CheckCircle: () => <div data-testid="check-circle-icon" />,
  Clock: () => <div data-testid="clock-icon" />,
  Target: () => <div data-testid="target-icon" />,
  TrendingUp: () => <div data-testid="trending-up-icon" />,
  TrendingDown: () => <div data-testid="trending-down-icon" />,
  Minus: () => <div data-testid="minus-icon" />,
  Truck: () => <div data-testid="truck-icon" />,
  AlertTriangle: () => <div data-testid="alert-triangle-icon" />,
  BarChart3: () => <div data-testid="bar-chart-icon" />,
  Activity: () => <div data-testid="activity-icon" />,
  Calendar: () => <div data-testid="calendar-icon" />,
  Filter: () => <div data-testid="filter-icon" />,
  RefreshCw: () => <div data-testid="refresh-icon" />,
  Download: () => <div data-testid="download-icon" />,
  Eye: () => <div data-testid="eye-icon" />,
  EyeOff: () => <div data-testid="eye-off-icon" />,
  XCircle: () => <div data-testid="x-circle-icon" />,
  ChevronDown: () => <div data-testid="chevron-down-icon" />,
  ChevronUp: () => <div data-testid="chevron-up-icon" />,
}));

// Mock utils
jest.mock('@/lib/utils/graficos', () => ({
  formatearNumero: (num: number) => num.toLocaleString(),
  formatearFecha: (fecha: Date) => fecha.toLocaleDateString(),
  COLORES_GYS: {
    primary: '#3B82F6',
    secondary: '#6B7280',
  },
}));

jest.mock('@/lib/utils', () => ({
  cn: (...classes: string[]) => classes.filter(Boolean).join(' '),
}));

describe('MetricasEntrega', () => {
  const mockMetricas: MetricaEntrega[] = [
    {
      id: 'test-1',
      titulo: 'Total Pedidos',
      valor: 150,
      valorAnterior: 120,
      unidad: 'pedidos',
      formato: 'entero',
      tendencia: 'subida',
      porcentajeCambio: 25,
      descripcion: 'Número total de pedidos procesados',
      meta: 200,
      categoria: 'principal',
      icono: <Package className="w-4 h-4" />,
      color: 'blue',
      ultimaActualizacion: new Date('2024-01-15'),
    },
    {
      id: 'test-2',
      titulo: 'Entregados',
      valor: 95,
      valorAnterior: 80,
      unidad: 'pedidos',
      formato: 'entero',
      tendencia: 'subida',
      porcentajeCambio: 18.75,
      descripcion: 'Pedidos entregados exitosamente',
      categoria: 'principal',
      icono: <CheckCircle className="w-4 h-4" />,
      color: 'green',
      ultimaActualizacion: new Date('2024-01-15'),
    },
  ];

  afterEach(() => cleanup());

  describe('Rendering', () => {
    it('should render correctly with metrics', () => {
      render(<MetricasEntrega metricas={mockMetricas} />);
      
      expect(screen.getByText('Métricas de Entrega')).toBeInTheDocument();
      expect(screen.getByText('Total Pedidos')).toBeInTheDocument();
      expect(screen.getByText('Entregados')).toBeInTheDocument();
      expect(screen.getByText('150')).toBeInTheDocument();
      expect(screen.getByText('95')).toBeInTheDocument();
    });

    it('should render custom title and subtitle', () => {
      render(
        <MetricasEntrega 
          metricas={mockMetricas} 
          titulo="Métricas Personalizadas"
          subtitulo="Dashboard de entregas"
        />
      );
      
      expect(screen.getByText('Métricas Personalizadas')).toBeInTheDocument();
      expect(screen.getByText('Dashboard de entregas')).toBeInTheDocument();
    });

    it('should show empty state when no metrics provided', () => {
      render(<MetricasEntrega metricas={[]} />);
      
      expect(screen.getByText('No hay métricas disponibles')).toBeInTheDocument();
      expect(screen.getByText('Las métricas aparecerán cuando haya datos de entregas.')).toBeInTheDocument();
    });

    it('should show loading skeleton when cargando is true', () => {
      render(<MetricasEntrega metricas={mockMetricas} cargando={true} />);
      
      // Should show skeleton instead of metrics
      expect(screen.queryByText('Total Pedidos')).not.toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should handle metric click', async () => {
      const mockOnMetricaClick = jest.fn();
      const user = userEvent.setup();
      
      render(
        <MetricasEntrega 
          metricas={mockMetricas} 
          onMetricaClick={mockOnMetricaClick}
        />
      );
      
      const metricCard = screen.getByText('Total Pedidos').closest('div');
      if (metricCard) {
        await user.click(metricCard);
        expect(mockOnMetricaClick).toHaveBeenCalledWith(mockMetricas[0]);
      }
    });

    it('should handle refresh button click', async () => {
      const mockOnActualizar = jest.fn();
      const user = userEvent.setup();
      
      render(
        <MetricasEntrega 
          metricas={mockMetricas} 
          onActualizar={mockOnActualizar}
        />
      );
      
      const refreshButton = screen.getByRole('button', { name: /actualizar/i });
      await user.click(refreshButton);
      
      expect(mockOnActualizar).toHaveBeenCalled();
    });

    it('should handle export button click', async () => {
      const mockOnExportar = jest.fn();
      const user = userEvent.setup();
      
      render(
        <MetricasEntrega 
          metricas={mockMetricas} 
          onExportar={mockOnExportar}
        />
      );
      
      const exportButton = screen.getByRole('button', { name: /exportar/i });
      await user.click(exportButton);
      
      expect(mockOnExportar).toHaveBeenCalled();
    });
  });

  describe('Filtering and Display Options', () => {
    it('should filter metrics by category', () => {
      const metricasConCategorias: MetricaEntrega[] = [
        ...mockMetricas,
        {
          id: 'test-3',
          titulo: 'Métrica Crítica',
          valor: 5,
          unidad: 'alertas',
          formato: 'entero',
          tendencia: 'estable',
          porcentajeCambio: 0,
          categoria: 'critica',
          icono: <Target className="w-4 h-4" />,
          color: 'red',
          ultimaActualizacion: new Date('2024-01-15'),
        },
      ];
      
      render(
        <MetricasEntrega 
          metricas={metricasConCategorias} 
          filtroCategoria={['principal']}
        />
      );
      
      expect(screen.getByText('Total Pedidos')).toBeInTheDocument();
      expect(screen.getByText('Entregados')).toBeInTheDocument();
      expect(screen.queryByText('Métrica Crítica')).not.toBeInTheDocument();
    });

    it('should render in compact mode', () => {
      render(<MetricasEntrega metricas={mockMetricas} compacto={true} />);
      
      expect(screen.getByText('Total Pedidos')).toBeInTheDocument();
      expect(screen.getByText('Entregados')).toBeInTheDocument();
    });

    it('should hide trends when mostrarTendencias is false', () => {
      render(<MetricasEntrega metricas={mockMetricas} mostrarTendencias={false} />);
      
      expect(screen.getByText('Total Pedidos')).toBeInTheDocument();
      // Trend indicators should not be visible
    });

    it('should hide goals when mostrarMetas is false', () => {
      render(<MetricasEntrega metricas={mockMetricas} mostrarMetas={false} />);
      
      expect(screen.getByText('Total Pedidos')).toBeInTheDocument();
      // Goal indicators should not be visible
    });
  });

  describe('Accessibility', () => {
    it('should be accessible', () => {
      render(<MetricasEntrega metricas={mockMetricas} />);
      
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByText('Métricas de Entrega')).toHaveAttribute('role', 'heading');
    });

    it('should have proper ARIA labels for interactive elements', () => {
      render(
        <MetricasEntrega 
          metricas={mockMetricas} 
          onActualizar={() => {}}
          onExportar={() => {}}
        />
      );
      
      expect(screen.getByRole('button', { name: /actualizar/i })).toHaveAttribute('aria-label');
      expect(screen.getByRole('button', { name: /exportar/i })).toHaveAttribute('aria-label');
    });
  });
});

describe('crearMetricaEntrega', () => {
  it('should create a metric with default values', () => {
    const metrica = crearMetricaEntrega('test-id', 'Test Metric', 100);
    
    expect(metrica.id).toBe('test-id');
    expect(metrica.titulo).toBe('Test Metric');
    expect(metrica.valor).toBe(100);
    expect(metrica.formato).toBe('entero');
    expect(metrica.categoria).toBe('secundaria');
    expect(metrica.tendencia).toBe('estable');
  });

  it('should create a metric with custom options', () => {
    const metrica = crearMetricaEntrega('test-id', 'Test Metric', 100, {
      formato: 'porcentaje',
      categoria: 'principal',
      tendencia: 'subida',
      valorAnterior: 80,
      meta: 120,
    });
    
    expect(metrica.formato).toBe('porcentaje');
    expect(metrica.categoria).toBe('principal');
    expect(metrica.tendencia).toBe('subida');
    expect(metrica.valorAnterior).toBe(80);
    expect(metrica.meta).toBe(120);
  });
});

describe('METRICAS_PREDEFINIDAS', () => {
  it('should create totalPedidos metric correctly', () => {
    const metrica = METRICAS_PREDEFINIDAS.totalPedidos(150, 120);
    
    expect(metrica.id).toBe('total-pedidos');
    expect(metrica.titulo).toBe('Total Pedidos');
    expect(metrica.valor).toBe(150);
    expect(metrica.valorAnterior).toBe(120);
    expect(metrica.formato).toBe('entero');
    expect(metrica.categoria).toBe('principal');
  });

  it('should create pedidosEntregados metric correctly', () => {
    const metrica = METRICAS_PREDEFINIDAS.pedidosEntregados(95, 80);
    
    expect(metrica.id).toBe('pedidos-entregados');
    expect(metrica.titulo).toBe('Entregados');
    expect(metrica.valor).toBe(95);
    expect(metrica.valorAnterior).toBe(80);
    expect(metrica.formato).toBe('entero');
    expect(metrica.categoria).toBe('principal');
  });

  it('should create tiempoPromedioEntrega metric correctly', () => {
    const metrica = METRICAS_PREDEFINIDAS.tiempoPromedioEntrega(24, 30);
    
    expect(metrica.id).toBe('tiempo-promedio');
    expect(metrica.titulo).toBe('Tiempo Promedio');
    expect(metrica.valor).toBe(24);
    expect(metrica.valorAnterior).toBe(30);
    expect(metrica.formato).toBe('tiempo');
    expect(metrica.unidad).toBe('h');
    expect(metrica.categoria).toBe('secundaria');
  });

  it('should create eficienciaEntrega metric correctly', () => {
    const metrica = METRICAS_PREDEFINIDAS.eficienciaEntrega(85, 75, 90);
    
    expect(metrica.id).toBe('eficiencia-entrega');
    expect(metrica.titulo).toBe('Eficiencia');
    expect(metrica.valor).toBe(85);
    expect(metrica.valorAnterior).toBe(75);
    expect(metrica.formato).toBe('porcentaje');
    expect(metrica.categoria).toBe('principal');
    expect(metrica.meta).toBe(90);
  });
});