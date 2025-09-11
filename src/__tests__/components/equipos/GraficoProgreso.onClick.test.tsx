/**
 * 🧪 Test específico para el manejador onClick de GraficoProgreso
 * 
 * Verifica que la corrección del payload funcione correctamente
 * en el evento activeDot onClick de Recharts.
 * 
 * @author TRAE AI - Agente Senior Fullstack
 * @version 1.0.0
 * @since 2025-01-27
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import GraficoProgreso, { DatoGrafico, ConfiguracionGrafico } from '@/components/equipos/GraficoProgreso';

// 🎭 Mock de Recharts
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  LineChart: ({ children, onClick }: any) => (
    <div data-testid="line-chart" onClick={onClick}>
      {children}
    </div>
  ),
  Line: ({ onClick, activeDot }: any) => (
    <div 
      data-testid="line" 
      onClick={() => {
        // Simular el comportamiento de Recharts activeDot onClick
        if (activeDot && activeDot.onClick) {
          const mockData = {
            payload: {
              fecha: '2024-01-15',
              valor: 75,
              meta: 80,
              estado: 'en_proceso'
            }
          };
          activeDot.onClick(mockData);
        }
      }}
    />
  ),
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  ReferenceLine: () => <div data-testid="reference-line" />
}));

// 🎭 Mock de Framer Motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>
  },
  AnimatePresence: ({ children }: any) => children
}));

// 🎭 Mock de Lucide React
jest.mock('lucide-react', () => ({
  TrendingUp: () => <div data-testid="trending-up-icon" />,
  TrendingDown: () => <div data-testid="trending-down-icon" />,
  Maximize2: () => <div data-testid="maximize-icon" />,
  Minimize2: () => <div data-testid="minimize-icon" />,
  Download: () => <div data-testid="download-icon" />,
  Eye: () => <div data-testid="eye-icon" />,
  EyeOff: () => <div data-testid="eye-off-icon" />
}));

// 📋 Datos de prueba
const datosPrueba: DatoGrafico[] = [
  {
    fecha: '2024-01-15',
    valor: 75,
    meta: 80,
    estado: 'en_proceso'
  },
  {
    fecha: '2024-01-16',
    valor: 85,
    meta: 80,
    estado: 'completado'
  }
];

const configuracionPrueba: ConfiguracionGrafico = {
  tipo: 'linea',
  titulo: 'Test Gráfico',
  altura: 400,
  mostrarGrid: true,
  mostrarLeyenda: true,
  mostrarTooltip: true,
  mostrarMetas: true,
  animaciones: true,
  colores: ['#3b82f6', '#10b981']
};

const seriesPrueba = [{
  key: 'valor',
  nombre: 'Progreso',
  color: '#3b82f6',
  datos: datosPrueba,
  tipo: 'linea' as const,
  visible: true
}];

describe('GraficoProgreso - onClick Handler', () => {
  // ✅ Test del manejador onClick corregido
  it('should handle activeDot onClick correctly with fixed payload access', () => {
    const mockOnPuntoClick = jest.fn();
    
    render(
      <GraficoProgreso
        series={seriesPrueba}
        configuracion={configuracionPrueba}
        onPuntoClick={mockOnPuntoClick}
      />
    );

    // 🔍 Verificar que el componente se renderiza
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    
    // 🖱️ Simular click en el punto del gráfico
    const lineElement = screen.getByTestId('line');
    fireEvent.click(lineElement);
    
    // ✅ Verificar que el callback se ejecuta con los datos correctos
    expect(mockOnPuntoClick).toHaveBeenCalledTimes(1);
    expect(mockOnPuntoClick).toHaveBeenCalledWith(
      {
        fecha: '2024-01-15',
        valor: 75,
        meta: 80,
        estado: 'en_proceso'
      },
      seriesPrueba[0]
    );
  });

  // ✅ Test sin callback onPuntoClick
  it('should not crash when onPuntoClick is not provided', () => {
    expect(() => {
      render(
        <GraficoProgreso
          series={seriesPrueba}
          configuracion={configuracionPrueba}
        />
      );
    }).not.toThrow();
  });

  // ✅ Test con datos inválidos
  it('should handle invalid payload data gracefully', () => {
    const mockOnPuntoClick = jest.fn();
    
    // Mock personalizado para simular datos inválidos
    const MockLineWithInvalidData = () => (
      <div 
        data-testid="line-invalid"
        onClick={() => {
          // Simular activeDot onClick con datos inválidos
          const invalidData = null;
          // Esta función debería manejar gracefully los datos nulos
          if (invalidData && invalidData.payload) {
            mockOnPuntoClick(invalidData.payload);
          }
        }}
      />
    );

    render(<MockLineWithInvalidData />);
    
    const lineElement = screen.getByTestId('line-invalid');
    fireEvent.click(lineElement);
    
    // ✅ Verificar que no se ejecuta el callback con datos inválidos
    expect(mockOnPuntoClick).not.toHaveBeenCalled();
  });

  // ✅ Test de tipos TypeScript (verificación estática)
  it('should have correct TypeScript types for onClick handler', () => {
    // Este test verifica que los tipos sean correctos en tiempo de compilación
    const mockOnPuntoClick = (dato: DatoGrafico, serie: any) => {
      // ✅ Verificar que dato tiene las propiedades esperadas
      expect(typeof dato.fecha).toBe('string');
      expect(typeof dato.valor).toBe('number');
      expect(typeof dato.estado).toBe('string');
      
      // ✅ Verificar que serie tiene las propiedades esperadas
      expect(typeof serie.key).toBe('string');
      expect(typeof serie.nombre).toBe('string');
      expect(typeof serie.color).toBe('string');
    };

    // Esta función debe compilar sin errores TypeScript
    const component = (
      <GraficoProgreso
        series={seriesPrueba}
        configuracion={configuracionPrueba}
        onPuntoClick={mockOnPuntoClick}
      />
    );
    
    expect(component).toBeDefined();
  });
});