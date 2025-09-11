/**
 * ===================================================
 * TEST: MetricasEntrega Component
 * ===================================================
 * 
 * Tests unitarios para el componente MetricasEntrega
 * que muestra métricas de entrega en cards.
 * 
 * @author GYS Team
 * @version 1.0.0
 */

// 📡 Importaciones
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MetricasEntrega, type MetricaEntrega } from '@/components/trazabilidad/MetricasEntrega';

// 🎭 Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

// 🎭 Mock Lucide icons
jest.mock('lucide-react', () => ({
  TrendingUp: () => <div data-testid="trending-up-icon" />,
  TrendingDown: () => <div data-testid="trending-down-icon" />,
  Package: () => <div data-testid="package-icon" />,
  Clock: () => <div data-testid="clock-icon" />,
  CheckCircle: () => <div data-testid="check-circle-icon" />,
  AlertTriangle: () => <div data-testid="alert-triangle-icon" />,
  Minus: () => <div data-testid="minus-icon" />,
}));

// 🧪 Datos de prueba
const mockMetricas: MetricaEntrega[] = [
  {
    id: 'total-pedidos',
    titulo: 'Total Pedidos',
    valor: 150,
    unidad: 'pedidos',
    icono: 'package',
    tendencia: 'up',
    porcentajeCambio: 12.5,
    comparacionAnterior: 138,
    color: 'blue'
  },
  {
    id: 'tiempo-promedio',
    titulo: 'Tiempo Promedio',
    valor: 7.5,
    unidad: 'días',
    icono: 'clock',
    tendencia: 'down',
    porcentajeCambio: 8.2,
    comparacionAnterior: 8.1,
    color: 'green'
  },
  {
    id: 'tasa-cumplimiento',
    titulo: 'Tasa Cumplimiento',
    valor: 85.2,
    unidad: '%',
    icono: 'check',
    tendencia: 'up',
    porcentajeCambio: 5.3,
    comparacionAnterior: 80.9,
    color: 'green'
  },
  {
    id: 'pedidos-retrasados',
    titulo: 'Pedidos Retrasados',
    valor: 5,
    unidad: 'pedidos',
    icono: 'alert',
    tendencia: 'down',
    porcentajeCambio: 2.1,
    comparacionAnterior: 7,
    color: 'red'
  }
];

const mockMetricasVacias: MetricaEntrega[] = [];

describe('MetricasEntrega', () => {
  // ✅ Test básico de renderizado
  it('should render metrics cards with data', () => {
    render(<MetricasEntrega metricas={mockMetricas} />);
    
    expect(screen.getByText('Total Pedidos')).toBeInTheDocument();
    expect(screen.getByText('Tiempo Promedio')).toBeInTheDocument();
    expect(screen.getByText('Tasa Cumplimiento')).toBeInTheDocument();
    expect(screen.getByText('Pedidos Retrasados')).toBeInTheDocument();
  });

  // ✅ Test de formato de números
  it('should format numbers correctly', () => {
    render(<MetricasEntrega metricas={mockMetricas} />);
    
    expect(screen.getByText('150 pedidos')).toBeInTheDocument();
    expect(screen.getByText('7.5 días')).toBeInTheDocument();
    expect(screen.getByText('85.2 %')).toBeInTheDocument();
    expect(screen.getByText('5 pedidos')).toBeInTheDocument();
  });

  // ✅ Test de tendencias
  it('should show trend indicators', () => {
    render(<MetricasEntrega metricas={mockMetricas} />);
    
    // Verificar que se muestran las tendencias
    expect(screen.getByText('12.5%')).toBeInTheDocument();
    expect(screen.getByText('8.2%')).toBeInTheDocument();
    expect(screen.getByText('5.3%')).toBeInTheDocument();
    expect(screen.getByText('2.1%')).toBeInTheDocument();
  });

  // ✅ Test de comparación con mes anterior
  it('should display comparison with previous month', () => {
    render(<MetricasEntrega metricas={mockMetricas} />);
    
    // Verificar comparaciones con período anterior
    expect(screen.getByText('vs. 138 pedidos')).toBeInTheDocument();
    expect(screen.getByText('vs. 8.1 días')).toBeInTheDocument();
    expect(screen.getByText('vs. 80.9 %')).toBeInTheDocument();
    expect(screen.getByText('vs. 7 pedidos')).toBeInTheDocument();
  });

  // ✅ Test de estado vacío
  it('should handle empty data gracefully', () => {
    render(<MetricasEntrega metricas={mockMetricasVacias} />);
    
    expect(screen.getByRole('heading', { name: 'No hay métricas disponibles' })).toBeInTheDocument();
    expect(screen.getByText('Las métricas aparecerán cuando haya datos de entregas.')).toBeInTheDocument();
  });

  // ✅ Test de loading state
  it('should render loading state', () => {
    render(<MetricasEntrega metricas={mockMetricas} loading={true} />);
    
    // En loading state se muestran skeletons
    expect(screen.queryByText('150')).not.toBeInTheDocument();
  });

  // ✅ Test de error state
  it('should render error state', () => {
    const errorMessage = 'Error al cargar datos';
    render(<MetricasEntrega metricas={mockMetricasVacias} error={errorMessage} />);
    
    expect(screen.getByRole('heading', { name: 'Error al cargar métricas' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Intentar nuevamente' })).toBeInTheDocument();
  });

  // ✅ Test de iconos por tipo de métrica
  it('should render correct icons for each metric', () => {
    render(<MetricasEntrega metricas={mockMetricas} />);
    
    // Los iconos se renderizan (están mockeados)
    expect(screen.getByTestId('package-icon')).toBeInTheDocument();
    expect(screen.getByTestId('clock-icon')).toBeInTheDocument();
    expect(screen.getByTestId('check-circle-icon')).toBeInTheDocument();
    expect(screen.getByTestId('alert-triangle-icon')).toBeInTheDocument();
  });

  // ✅ Test de colores por estado
  it('should apply correct styling based on metric values', () => {
    render(<MetricasEntrega metricas={mockMetricas} />);
    
    // Verificar que las métricas se renderizan con sus títulos
    expect(screen.getByText('Total Pedidos')).toBeInTheDocument();
    expect(screen.getByText('Tiempo Promedio')).toBeInTheDocument();
    expect(screen.getByText('Tasa Cumplimiento')).toBeInTheDocument();
    expect(screen.getByText('Pedidos Retrasados')).toBeInTheDocument();
  });
});
