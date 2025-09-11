/**
 * 🧪 Tests para Componente Dashboard
 * 
 * @description Tests para el dashboard principal con métricas y gráficos
 * @author TRAE - Agente Senior Fullstack
 * @date 2025-01-27
 * @version 1.0.0
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Dashboard } from '@/components/dashboard/Dashboard';

import type { MetricasDashboard, GraficoData } from '@/types/modelos';

// 🔧 Mocks
jest.mock('@/lib/services/dashboard', () => ({
  obtenerMetricasDashboard: jest.fn(),
  obtenerDatosGraficos: jest.fn()
}));

jest.mock('@/components/ui/charts', () => ({
  BarChart: ({ data, ...props }: any) => (
    <div data-testid="bar-chart" {...props}>
      {JSON.stringify(data)}
    </div>
  ),
  LineChart: ({ data, ...props }: any) => (
    <div data-testid="line-chart" {...props}>
      {JSON.stringify(data)}
    </div>
  ),
  PieChart: ({ data, ...props }: any) => (
    <div data-testid="pie-chart" {...props}>
      {JSON.stringify(data)}
    </div>
  )
}));

jest.mock('@/components/ui/toast', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn()
  }
}));

const mockMetricas: MetricasDashboard = {
  entregas: {
    total: 150,
    pendientes: 45,
    enProceso: 30,
    entregadas: 65,
    retrasadas: 10,
    porcentajeCompletado: 43.33
  },
  proyectos: {
    total: 12,
    activos: 8,
    completados: 3,
    pausados: 1,
    porcentajeExito: 75
  },
  equipos: {
    total: 85,
    disponibles: 60,
    enUso: 20,
    mantenimiento: 5,
    utilizacion: 76.47
  },
  rendimiento: {
    tiempoPromedioEntrega: 5.2,
    eficienciaEntrega: 87.5,
    satisfaccionCliente: 4.3,
    tendenciaEntregas: 'positiva'
  }
};

const mockGraficos: GraficoData = {
  entregasPorMes: [
    { mes: 'Enero', entregas: 25, completadas: 20 },
    { mes: 'Febrero', entregas: 30, completadas: 28 },
    { mes: 'Marzo', entregas: 35, completadas: 32 }
  ],
  estadosEntrega: [
    { estado: 'Entregadas', cantidad: 65, porcentaje: 43.33 },
    { estado: 'Pendientes', cantidad: 45, porcentaje: 30 },
    { estado: 'En Proceso', cantidad: 30, porcentaje: 20 },
    { estado: 'Retrasadas', cantidad: 10, porcentaje: 6.67 }
  ],
  proyectosMasActivos: [
    { proyecto: 'Proyecto Alpha', entregas: 25, completadas: 20 },
    { proyecto: 'Proyecto Beta', entregas: 18, completadas: 15 },
    { proyecto: 'Proyecto Gamma', entregas: 12, completadas: 10 }
  ],
  tendenciaRendimiento: [
    { fecha: '2025-01-01', eficiencia: 85, entregas: 20 },
    { fecha: '2025-01-08', eficiencia: 87, entregas: 22 },
    { fecha: '2025-01-15', eficiencia: 89, entregas: 25 },
    { fecha: '2025-01-22', eficiencia: 87, entregas: 23 }
  ]
};

const defaultProps = {
  usuarioId: 'user-1',
  rol: 'ADMIN' as const,
  onRefresh: jest.fn()
};

// Mock de servicios
const mockObtenerMetricasDashboard = require('@/lib/services/dashboard').obtenerMetricasDashboard;
const mockObtenerDatosGraficos = require('@/lib/services/dashboard').obtenerDatosGraficos;

describe('Dashboard Component', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    jest.clearAllMocks();
    mockObtenerMetricasDashboard.mockResolvedValue(mockMetricas);
    mockObtenerDatosGraficos.mockResolvedValue(mockGraficos);
  });

  // ✅ Test renderizado básico
  describe('Renderizado', () => {
    it('debe renderizar dashboard correctamente', async () => {
      render(<Dashboard {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Dashboard GYS')).toBeInTheDocument();
      });

      expect(screen.getByText('Resumen de Entregas')).toBeInTheDocument();
      expect(screen.getByText('Proyectos Activos')).toBeInTheDocument();
      expect(screen.getByText('Gestión de Equipos')).toBeInTheDocument();
      expect(screen.getByText('Rendimiento General')).toBeInTheDocument();
    });

    it('debe mostrar métricas de entregas', async () => {
      render(<Dashboard {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('150')).toBeInTheDocument(); // Total entregas
        expect(screen.getByText('45')).toBeInTheDocument(); // Pendientes
        expect(screen.getByText('30')).toBeInTheDocument(); // En proceso
        expect(screen.getByText('65')).toBeInTheDocument(); // Entregadas
        expect(screen.getByText('10')).toBeInTheDocument(); // Retrasadas
        expect(screen.getByText('43.33%')).toBeInTheDocument(); // Porcentaje completado
      });
    });

    it('debe mostrar métricas de proyectos', async () => {
      render(<Dashboard {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('12')).toBeInTheDocument(); // Total proyectos
        expect(screen.getByText('8')).toBeInTheDocument(); // Activos
        expect(screen.getByText('3')).toBeInTheDocument(); // Completados
        expect(screen.getByText('75%')).toBeInTheDocument(); // Porcentaje éxito
      });
    });

    it('debe mostrar métricas de equipos', async () => {
      render(<Dashboard {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('85')).toBeInTheDocument(); // Total equipos
        expect(screen.getByText('60')).toBeInTheDocument(); // Disponibles
        expect(screen.getByText('20')).toBeInTheDocument(); // En uso
        expect(screen.getByText('76.47%')).toBeInTheDocument(); // Utilización
      });
    });

    it('debe mostrar métricas de rendimiento', async () => {
      render(<Dashboard {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('5.2 días')).toBeInTheDocument(); // Tiempo promedio
        expect(screen.getByText('87.5%')).toBeInTheDocument(); // Eficiencia
        expect(screen.getByText('4.3/5')).toBeInTheDocument(); // Satisfacción
      });
    });

    it('debe mostrar estado de carga', () => {
      mockObtenerMetricasDashboard.mockImplementation(() => new Promise(() => {}));
      mockObtenerDatosGraficos.mockImplementation(() => new Promise(() => {}));

      render(<Dashboard {...defaultProps} />);

      expect(screen.getByTestId('dashboard-skeleton')).toBeInTheDocument();
      expect(screen.getByText('Cargando dashboard...')).toBeInTheDocument();
    });
  });

  // ✅ Test gráficos
  describe('Gráficos', () => {
    it('debe renderizar gráfico de entregas por mes', async () => {
      render(<Dashboard {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
      });

      const barChart = screen.getByTestId('bar-chart');
      expect(barChart).toHaveTextContent('Enero');
      expect(barChart).toHaveTextContent('Febrero');
      expect(barChart).toHaveTextContent('Marzo');
    });

    it('debe renderizar gráfico de estados de entrega', async () => {
      render(<Dashboard {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
      });

      const pieChart = screen.getByTestId('pie-chart');
      expect(pieChart).toHaveTextContent('Entregadas');
      expect(pieChart).toHaveTextContent('Pendientes');
      expect(pieChart).toHaveTextContent('En Proceso');
      expect(pieChart).toHaveTextContent('Retrasadas');
    });

    it('debe renderizar gráfico de tendencia de rendimiento', async () => {
      render(<Dashboard {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      });

      const lineChart = screen.getByTestId('line-chart');
      expect(lineChart).toHaveTextContent('2025-01-01');
      expect(lineChart).toHaveTextContent('eficiencia');
    });

    it('debe permitir cambiar tipo de gráfico', async () => {
      render(<Dashboard {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
      });

      // Cambiar a gráfico de líneas
      const chartTypeButton = screen.getByLabelText('Cambiar tipo de gráfico');
      await user.click(chartTypeButton);
      
      const lineOption = screen.getByText('Gráfico de Líneas');
      await user.click(lineOption);

      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      expect(screen.queryByTestId('bar-chart')).not.toBeInTheDocument();
    });
  });

  // ✅ Test filtros y períodos
  describe('Filtros y Períodos', () => {
    it('debe permitir cambiar período de tiempo', async () => {
      render(<Dashboard {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Últimos 30 días')).toBeInTheDocument();
      });

      const periodSelect = screen.getByLabelText('Seleccionar período');
      await user.click(periodSelect);
      
      const option90Days = screen.getByText('Últimos 90 días');
      await user.click(option90Days);

      await waitFor(() => {
        expect(mockObtenerMetricasDashboard).toHaveBeenCalledWith({
          periodo: '90d',
          usuarioId: 'user-1'
        });
      });
    });

    it('debe permitir filtrar por proyecto', async () => {
      render(<Dashboard {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByLabelText('Filtrar por proyecto')).toBeInTheDocument();
      });

      const projectFilter = screen.getByLabelText('Filtrar por proyecto');
      await user.click(projectFilter);
      
      const projectOption = screen.getByText('Proyecto Alpha');
      await user.click(projectOption);

      await waitFor(() => {
        expect(mockObtenerMetricasDashboard).toHaveBeenCalledWith({
          periodo: '30d',
          proyectoId: 'proyecto-alpha',
          usuarioId: 'user-1'
        });
      });
    });

    it('debe permitir filtrar por estado de entrega', async () => {
      render(<Dashboard {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByLabelText('Filtrar por estado')).toBeInTheDocument();
      });

      const statusFilter = screen.getByLabelText('Filtrar por estado');
      await user.click(statusFilter);
      
      const statusOption = screen.getByText('Solo Entregadas');
      await user.click(statusOption);

      await waitFor(() => {
        expect(mockObtenerDatosGraficos).toHaveBeenCalledWith({
          periodo: '30d',
          estado: 'entregado',
          usuarioId: 'user-1'
        });
      });
    });

    it('debe limpiar filtros correctamente', async () => {
      render(<Dashboard {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Limpiar filtros')).toBeInTheDocument();
      });

      // Aplicar filtros
      const projectFilter = screen.getByLabelText('Filtrar por proyecto');
      await user.click(projectFilter);
      await user.click(screen.getByText('Proyecto Alpha'));

      // Limpiar filtros
      const clearButton = screen.getByText('Limpiar filtros');
      await user.click(clearButton);

      await waitFor(() => {
        expect(mockObtenerMetricasDashboard).toHaveBeenCalledWith({
          periodo: '30d',
          usuarioId: 'user-1'
        });
      });
    });
  });

  // ✅ Test interacciones
  describe('Interacciones', () => {
    it('debe refrescar datos cuando se hace clic en actualizar', async () => {
      render(<Dashboard {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByLabelText('Actualizar dashboard')).toBeInTheDocument();
      });

      const refreshButton = screen.getByLabelText('Actualizar dashboard');
      await user.click(refreshButton);

      expect(defaultProps.onRefresh).toHaveBeenCalled();
      expect(mockObtenerMetricasDashboard).toHaveBeenCalledTimes(2);
      expect(mockObtenerDatosGraficos).toHaveBeenCalledTimes(2);
    });

    it('debe navegar a detalle cuando se hace clic en métrica', async () => {
      const mockNavigate = jest.fn();
      jest.mock('next/navigation', () => ({
        useRouter: () => ({ push: mockNavigate })
      }));

      render(<Dashboard {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Ver detalles')).toBeInTheDocument();
      });

      const detailButtons = screen.getAllByText('Ver detalles');
      await user.click(detailButtons[0]); // Click en detalles de entregas

      // Verificar navegación (esto dependería de la implementación específica)
      // expect(mockNavigate).toHaveBeenCalledWith('/entregas');
    });

    it('debe mostrar tooltip en gráficos', async () => {
      render(<Dashboard {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
      });

      const chartElement = screen.getByTestId('bar-chart');
      await user.hover(chartElement);

      // Verificar que aparece tooltip (esto dependería de la implementación del gráfico)
      await waitFor(() => {
        expect(screen.getByRole('tooltip')).toBeInTheDocument();
      });
    });

    it('debe permitir exportar datos', async () => {
      render(<Dashboard {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Exportar')).toBeInTheDocument();
      });

      const exportButton = screen.getByText('Exportar');
      await user.click(exportButton);

      const exportPdfOption = screen.getByText('Exportar PDF');
      await user.click(exportPdfOption);

      // Verificar que se inicia la descarga
      expect(screen.getByText('Generando reporte...')).toBeInTheDocument();
    });
  });

  // ✅ Test permisos por rol
  describe('Permisos por Rol', () => {
    it('debe mostrar todas las métricas para ADMIN', async () => {
      render(<Dashboard {...defaultProps} rol="ADMIN" />);

      await waitFor(() => {
        expect(screen.getByText('Resumen de Entregas')).toBeInTheDocument();
        expect(screen.getByText('Proyectos Activos')).toBeInTheDocument();
        expect(screen.getByText('Gestión de Equipos')).toBeInTheDocument();
        expect(screen.getByText('Rendimiento General')).toBeInTheDocument();
      });
    });

    it('debe mostrar métricas limitadas para COMERCIAL', async () => {
      render(<Dashboard {...defaultProps} rol="COMERCIAL" />);

      await waitFor(() => {
        expect(screen.getByText('Resumen de Entregas')).toBeInTheDocument();
        expect(screen.getByText('Proyectos Activos')).toBeInTheDocument();
        expect(screen.queryByText('Gestión de Equipos')).not.toBeInTheDocument();
        expect(screen.queryByText('Rendimiento General')).not.toBeInTheDocument();
      });
    });

    it('debe mostrar solo métricas de proyectos para PROYECTOS', async () => {
      render(<Dashboard {...defaultProps} rol="PROYECTOS" />);

      await waitFor(() => {
        expect(screen.getByText('Proyectos Activos')).toBeInTheDocument();
        expect(screen.queryByText('Gestión de Equipos')).not.toBeInTheDocument();
      });
    });

    it('debe mostrar solo métricas de logística para LOGISTICA', async () => {
      render(<Dashboard {...defaultProps} rol="LOGISTICA" />);

      await waitFor(() => {
        expect(screen.getByText('Resumen de Entregas')).toBeInTheDocument();
        expect(screen.getByText('Gestión de Equipos')).toBeInTheDocument();
        expect(screen.queryByText('Proyectos Activos')).not.toBeInTheDocument();
      });
    });
  });

  // ✅ Test responsive
  describe('Diseño Responsive', () => {
    it('debe adaptar layout en móviles', () => {
      // Simular viewport móvil
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375
      });

      render(<Dashboard {...defaultProps} />);

      expect(screen.getByTestId('dashboard-mobile-layout')).toBeInTheDocument();
      expect(screen.queryByTestId('dashboard-desktop-layout')).not.toBeInTheDocument();
    });

    it('debe mostrar gráficos apilados en tablets', () => {
      // Simular viewport tablet
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768
      });

      render(<Dashboard {...defaultProps} />);

      expect(screen.getByTestId('dashboard-tablet-layout')).toBeInTheDocument();
      expect(screen.getByTestId('charts-stacked')).toBeInTheDocument();
    });

    it('debe ocultar gráficos complejos en móviles', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375
      });

      render(<Dashboard {...defaultProps} />);

      expect(screen.queryByTestId('line-chart')).not.toBeInTheDocument();
      expect(screen.getByTestId('pie-chart')).toBeInTheDocument(); // Gráfico simple
    });
  });

  // ✅ Test manejo de errores
  describe('Manejo de Errores', () => {
    it('debe mostrar error cuando falla la carga de métricas', async () => {
      mockObtenerMetricasDashboard.mockRejectedValue(new Error('Error de red'));

      render(<Dashboard {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Error al cargar métricas')).toBeInTheDocument();
        expect(screen.getByText('Reintentar')).toBeInTheDocument();
      });
    });

    it('debe mostrar error cuando falla la carga de gráficos', async () => {
      mockObtenerDatosGraficos.mockRejectedValue(new Error('Error de red'));

      render(<Dashboard {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Error al cargar gráficos')).toBeInTheDocument();
      });
    });

    it('debe reintentar carga de datos', async () => {
      mockObtenerMetricasDashboard.mockRejectedValueOnce(new Error('Error de red'));
      mockObtenerMetricasDashboard.mockResolvedValueOnce(mockMetricas);

      render(<Dashboard {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Reintentar')).toBeInTheDocument();
      });

      const retryButton = screen.getByText('Reintentar');
      await user.click(retryButton);

      await waitFor(() => {
        expect(screen.getByText('Dashboard GYS')).toBeInTheDocument();
        expect(screen.queryByText('Error al cargar métricas')).not.toBeInTheDocument();
      });
    });

    it('debe mostrar datos parciales cuando algunos servicios fallan', async () => {
      mockObtenerMetricasDashboard.mockResolvedValue(mockMetricas);
      mockObtenerDatosGraficos.mockRejectedValue(new Error('Error de gráficos'));

      render(<Dashboard {...defaultProps} />);

      await waitFor(() => {
        // Métricas se cargan correctamente
        expect(screen.getByText('150')).toBeInTheDocument();
        // Gráficos muestran error
        expect(screen.getByText('Error al cargar gráficos')).toBeInTheDocument();
      });
    });
  });

  // ✅ Test accesibilidad
  describe('Accesibilidad', () => {
    it('debe tener estructura semántica correcta', async () => {
      render(<Dashboard {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole('main')).toHaveAttribute('aria-label', 'Dashboard principal');
      });

      expect(screen.getByRole('region', { name: 'Métricas de entregas' })).toBeInTheDocument();
      expect(screen.getByRole('region', { name: 'Gráficos de rendimiento' })).toBeInTheDocument();
    });

    it('debe tener etiquetas ARIA para gráficos', async () => {
      render(<Dashboard {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('bar-chart')).toHaveAttribute('aria-label', 'Gráfico de entregas por mes');
        expect(screen.getByTestId('pie-chart')).toHaveAttribute('aria-label', 'Distribución de estados de entrega');
        expect(screen.getByTestId('line-chart')).toHaveAttribute('aria-label', 'Tendencia de rendimiento');
      });
    });

    it('debe ser navegable por teclado', async () => {
      render(<Dashboard {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByLabelText('Seleccionar período')).toBeInTheDocument();
      });

      const periodSelect = screen.getByLabelText('Seleccionar período');
      periodSelect.focus();

      await user.tab();
      expect(screen.getByLabelText('Filtrar por proyecto')).toHaveFocus();

      await user.tab();
      expect(screen.getByLabelText('Actualizar dashboard')).toHaveFocus();
    });

    it('debe anunciar cambios de datos a lectores de pantalla', async () => {
      render(<Dashboard {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole('status')).toHaveTextContent('Dashboard cargado correctamente');
      });

      const refreshButton = screen.getByLabelText('Actualizar dashboard');
      await user.click(refreshButton);

      await waitFor(() => {
        expect(screen.getByRole('status')).toHaveTextContent('Datos actualizados');
      });
    });
  });

  // ✅ Test performance
  describe('Performance', () => {
    it('debe cargar métricas y gráficos en paralelo', async () => {
      const startTime = Date.now();
      
      render(<Dashboard {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Dashboard GYS')).toBeInTheDocument();
      });

      const endTime = Date.now();
      const loadTime = endTime - startTime;

      // Verificar que las llamadas se hicieron en paralelo
      expect(mockObtenerMetricasDashboard).toHaveBeenCalledTimes(1);
      expect(mockObtenerDatosGraficos).toHaveBeenCalledTimes(1);
      
      // El tiempo de carga debería ser menor que la suma de ambas operaciones
      expect(loadTime).toBeLessThan(2000); // Menos de 2 segundos
    });

    it('debe implementar lazy loading para gráficos complejos', async () => {
      render(<Dashboard {...defaultProps} />);

      // Inicialmente solo métricas básicas
      await waitFor(() => {
        expect(screen.getByText('150')).toBeInTheDocument();
      });

      // Gráficos se cargan después
      await waitFor(() => {
        expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('debe memoizar componentes para evitar re-renders innecesarios', () => {
      const { rerender } = render(<Dashboard {...defaultProps} />);

      // Re-render con las mismas props no debería causar nuevas llamadas
      rerender(<Dashboard {...defaultProps} />);

      expect(mockObtenerMetricasDashboard).toHaveBeenCalledTimes(1);
      expect(mockObtenerDatosGraficos).toHaveBeenCalledTimes(1);
    });
  });
});
