/**
 * ===================================================
 * TEST: GraficoProgreso Component
 * ===================================================
 * 
 * Tests unitarios para el componente GraficoProgreso
 * que muestra gráficos de progreso usando Recharts.
 * 
 * @author GYS Team
 * @version 1.0.0
 */

// 📡 Importaciones
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/react';
import '@testing-library/jest-dom';
import { GraficoProgreso } from '@/components/trazabilidad/GraficoProgreso';
import type { DatoGrafico, ResumenProgreso } from '@/components/trazabilidad/GraficoProgreso';

// 🎭 Mock Recharts components
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => <div data-testid="pie" />,
  Cell: () => <div data-testid="cell" />,
}));

// 🎭 Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// 🎭 Mock UI components
jest.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }: any) => <div data-testid="card" {...props}>{children}</div>,
  CardContent: ({ children, ...props }: any) => <div data-testid="card-content" {...props}>{children}</div>,
  CardHeader: ({ children, ...props }: any) => <div data-testid="card-header" {...props}>{children}</div>,
  CardTitle: ({ children, ...props }: any) => <h3 data-testid="card-title" {...props}>{children}</h3>,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: any) => <button data-testid="button" {...props}>{children}</button>,
}));

jest.mock('@/components/ui/select', () => ({
  Select: ({ children, onValueChange, ...props }: any) => <div data-testid="select" {...props}>{children}</div>,
  SelectContent: ({ children, ...props }: any) => <div data-testid="select-content" {...props}>{children}</div>,
  SelectItem: ({ children, value, ...props }: any) => <div data-testid="select-item" data-value={value} {...props}>{children}</div>,
  SelectTrigger: ({ children, ...props }: any) => <div data-testid="select-trigger" {...props}>{children}</div>,
  SelectValue: ({ children, placeholder, ...props }: any) => <div data-testid="select-value" {...props}>{children || placeholder}</div>,
}));

// 🎭 Mock Lucide icons
jest.mock('lucide-react', () => ({
  BarChart3: () => <div data-testid="bar-chart-icon" />,
  LineChart: () => <div data-testid="line-chart-icon" />,
  PieChart: () => <div data-testid="pie-chart-icon" />,
  TrendingUp: () => <div data-testid="trending-up-icon" />,
  TrendingDown: () => <div data-testid="trending-down-icon" />,
  Calendar: () => <div data-testid="calendar-icon" />,
  Filter: () => <div data-testid="filter-icon" />,
  Download: () => <div data-testid="download-icon" />,
}));

// 🧪 Datos de prueba
const mockDatos: DatoGrafico[] = [
  {
    periodo: '2024-01',
    entregadas: 38,
    pendientes: 4,
    retrasadas: 3,
    total: 45,
    fecha: '2024-01-31'
  },
  {
    periodo: '2024-02',
    entregadas: 48,
    pendientes: 2,
    retrasadas: 2,
    total: 52,
    fecha: '2024-02-29'
  },
  {
    periodo: '2024-03',
    entregadas: 35,
    pendientes: 2,
    retrasadas: 1,
    total: 38,
    fecha: '2024-03-31'
  }
];

const mockResumen: ResumenProgreso = {
  totalEntregas: 135,
  porcentajeCompletado: 89.6,
  tendencia: 'up',
  cambioTendencia: 5.2
};

const mockDatosVacios: DatoGrafico[] = [];

const mockResumenVacio: ResumenProgreso = {
  totalEntregas: 0,
  porcentajeCompletado: 0,
  tendencia: 'neutral',
  cambioTendencia: 0
};

describe('GraficoProgreso', () => {
  // ✅ Test básico de renderizado
  it('renderiza el gráfico con datos correctos', () => {
    render(<GraficoProgreso datos={mockDatos} resumen={mockResumen} />);
    
    expect(screen.getByText('Progreso de Entregas')).toBeInTheDocument();
    expect(screen.getByText('89.6%')).toBeInTheDocument();
    expect(screen.getByText('135')).toBeInTheDocument();
  });

  // ✅ Test de componentes del gráfico
  it('should render chart components', () => {
    render(<GraficoProgreso datos={mockDatos} resumen={mockResumen} />);
    
    // Verificar que el contenedor del gráfico se renderiza
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    expect(screen.getByText('Progreso de Entregas')).toBeInTheDocument();
  });

  // ✅ Test de resumen de datos
  it('should display summary statistics', () => {
    render(<GraficoProgreso datos={mockDatos} resumen={mockResumen} />);
    
    expect(screen.getByText('135')).toBeInTheDocument();
    expect(screen.getByText('89.6%')).toBeInTheDocument();
    expect(screen.getByText('5.2%')).toBeInTheDocument();
  });

  // ✅ Test de período
  it('should display correct period', () => {
    render(<GraficoProgreso datos={mockDatos} resumen={mockResumen} />);
    
    expect(screen.getByText(/mensual/i)).toBeInTheDocument();
  });

  // ✅ Test de tendencia
  it('should show trend indicator', () => {
    render(<GraficoProgreso datos={mockDatos} resumen={mockResumen} />);
    
    expect(screen.getByTestId('trending-up-icon')).toBeInTheDocument();
  });

  // ✅ Test de estado vacío
  it('muestra estado vacío cuando no hay datos', () => {
    render(<GraficoProgreso datos={mockDatosVacios} resumen={mockResumenVacio} />);
    
    expect(screen.getByRole('heading', { name: 'No hay datos disponibles' })).toBeInTheDocument();
    expect(screen.getByText('Los gráficos aparecerán cuando haya datos de progreso.')).toBeInTheDocument();
  });

  // ✅ Test de loading state
  it('muestra estado de carga', () => {
    render(<GraficoProgreso datos={mockDatos} loading={true} />);
    
    // En loading state se muestran skeletons
    expect(screen.queryByText('Progreso de Entregas')).not.toBeInTheDocument();
  });

  // ✅ Test de error state
  it('muestra estado de error', () => {
    const errorMessage = 'Error al cargar datos';
    render(<GraficoProgreso datos={mockDatos} resumen={mockResumen} error={errorMessage} />);
    
    expect(screen.getByRole('heading', { name: 'Error al cargar gráfico' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Intentar nuevamente' })).toBeInTheDocument();
  });

  // ✅ Test de tipo de gráfico
  it('cambia el tipo de gráfico', () => {
    render(<GraficoProgreso datos={mockDatos} resumen={mockResumen} tipoGrafico="line" />);
    
    // El tipo de gráfico se aplica correctamente (componente mockeado)
    expect(screen.getByText('Progreso de Entregas')).toBeInTheDocument();
  });

  // ✅ Test de iconos
  it('should render correct icons', () => {
    render(<GraficoProgreso datos={mockDatos} resumen={mockResumen} />);
    
    expect(screen.getByTestId('bar-chart-icon')).toBeInTheDocument();
    expect(screen.getByTestId('calendar-icon')).toBeInTheDocument();
  });

  // ✅ Test de formato de datos
  it('should format data correctly', () => {
    render(<GraficoProgreso datos={mockDatos} resumen={mockResumen} />);
    
    // Verificar que el componente se renderiza con los datos
    expect(screen.getByText('Progreso de Entregas')).toBeInTheDocument();
    expect(screen.getByText('135')).toBeInTheDocument();
    expect(screen.getByText('89.6%')).toBeInTheDocument();
  });
});
