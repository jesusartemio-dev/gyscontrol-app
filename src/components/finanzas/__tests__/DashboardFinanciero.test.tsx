// ===================================================
// 📁 Archivo: DashboardFinanciero.test.tsx
// 📌 Ubicación: src/components/finanzas/__tests__/DashboardFinanciero.test.tsx
// 🔧 Descripción: Tests unitarios para DashboardFinanciero
//
// 🧠 Uso: Validar funcionalidad del dashboard financiero
// ✍️ Autor: Sistema GYS
// 📅 Última actualización: 2025-01-20
// ===================================================

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';
import DashboardFinanciero from '../DashboardFinanciero';

// 🎭 Mock de servicios
jest.mock('@/services/listaRequerimientosService', () => ({
  getAllListaRequerimientos: jest.fn(() => Promise.resolve([
    {
      id: '1',
      codigo: 'LR-001',
      proyecto: { nombre: 'Proyecto Test', id: '1' },
      createdAt: '2024-01-15T00:00:00Z',
      estado: 'enviado',
      total: 15000
    },
    {
      id: '2',
      codigo: 'LR-002',
      proyecto: { nombre: 'Proyecto Test 2', id: '2' },
      createdAt: '2024-01-20T00:00:00Z',
      estado: 'atendido',
      total: 25000
    }
  ]))
}));

jest.mock('@/services/pedidoEquipoService', () => ({
  getAllPedidoEquipos: jest.fn(() => Promise.resolve([
    {
      id: '1',
      codigo: 'PE-001',
      proyecto: { nombre: 'Proyecto Test', id: '1' },
      fechaPedido: new Date('2024-01-15'),
      estado: 'entregado',
      total: 12000,
      montoReal: 11500
    },
    {
      id: '2',
      codigo: 'PE-002',
      proyecto: { nombre: 'Proyecto Test 2', id: '2' },
      fechaPedido: new Date('2024-01-20'),
      estado: 'enviado',
      total: 8000,
      montoReal: 0
    }
  ]))
}));

jest.mock('@/services/proyectoService', () => ({
  getAllProyectos: jest.fn(() => Promise.resolve([
    {
      id: '1',
      nombre: 'Proyecto Test',
      descripcion: 'Descripción test',
      fechaInicio: new Date('2024-01-01'),
      fechaFin: new Date('2024-12-31'),
      estado: 'activo',
      presupuesto: 50000
    },
    {
      id: '2',
      nombre: 'Proyecto Test 2',
      descripcion: 'Descripción test 2',
      fechaInicio: new Date('2024-02-01'),
      fechaFin: new Date('2024-11-30'),
      estado: 'activo',
      presupuesto: 75000
    }
  ]))
}));

// 🎭 Mock de Framer Motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    section: ({ children, ...props }: any) => <section {...props}>{children}</section>
  }
}));

// 🎭 Mock de Recharts
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
  Cell: () => <div data-testid="cell" />
}));

describe('DashboardFinanciero', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('🧪 debe renderizar correctamente el componente', async () => {
    render(<DashboardFinanciero />);
    
    // Verificar título principal
    expect(screen.getByText('Dashboard Financiero')).toBeInTheDocument();
    
    // Verificar descripción
    expect(screen.getByText(/Análisis integral de métricas financieras/)).toBeInTheDocument();
  });

  it('🧪 debe mostrar loading inicialmente', () => {
    render(<DashboardFinanciero />);
    
    expect(screen.getByText('Cargando dashboard...')).toBeInTheDocument();
  });

  it('🧪 debe cargar y mostrar métricas principales', async () => {
    render(<DashboardFinanciero />);
    
    await waitFor(() => {
      // Verificar métricas principales
      expect(screen.getByText('Presupuesto Total')).toBeInTheDocument();
      expect(screen.getByText('Gastado Real')).toBeInTheDocument();
      expect(screen.getByText('Proyectado')).toBeInTheDocument();
      expect(screen.getByText('Ahorro Total')).toBeInTheDocument();
    });
  });

  it('🧪 debe calcular métricas correctamente', async () => {
    render(<DashboardFinanciero />);
    
    await waitFor(() => {
      // Verificar cálculos:
      // Presupuesto total: 50000 + 75000 = 125000
      expect(screen.getByText('S/ 125,000.00')).toBeInTheDocument();
      
      // Gastado real: 11500 (solo pedidos entregados)
      expect(screen.getByText('S/ 11,500.00')).toBeInTheDocument();
      
      // Proyectado: 15000 + 25000 = 40000
      expect(screen.getByText('S/ 40,000.00')).toBeInTheDocument();
      
      // Ahorro: 12000 - 11500 = 500
      expect(screen.getByText('S/ 500.00')).toBeInTheDocument();
    });
  });

  it('🧪 debe mostrar gráficos correctamente', async () => {
    render(<DashboardFinanciero />);
    
    await waitFor(() => {
      // Verificar que los gráficos están presentes
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
      expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
    });
  });

  it('🧪 debe mostrar alertas financieras', async () => {
    render(<DashboardFinanciero />);
    
    await waitFor(() => {
      // Verificar sección de alertas
      expect(screen.getByText('Alertas Financieras')).toBeInTheDocument();
    });
  });

  it('🧪 debe permitir filtrar por período', async () => {
    render(<DashboardFinanciero />);
    
    await waitFor(() => {
      const filtroPeriodo = screen.getByRole('combobox');
      fireEvent.click(filtroPeriodo);
    });
    
    // Verificar opciones de período
    await waitFor(() => {
      expect(screen.getByText('Último mes')).toBeInTheDocument();
      expect(screen.getByText('Últimos 3 meses')).toBeInTheDocument();
      expect(screen.getByText('Último año')).toBeInTheDocument();
    });
  });

  it('🧪 debe mostrar indicadores de rendimiento', async () => {
    render(<DashboardFinanciero />);
    
    await waitFor(() => {
      // Verificar indicadores de rendimiento
      expect(screen.getByText('Eficiencia Presupuestaria')).toBeInTheDocument();
      expect(screen.getByText('Tasa de Ahorro')).toBeInTheDocument();
    });
  });

  it('🧪 debe manejar estados de error correctamente', async () => {
    // Mock error en los servicios
    const { getAllListaRequerimientos } = require('@/services/listaRequerimientosService');
    getAllListaRequerimientos.mockRejectedValueOnce(new Error('Error de red'));
    
    render(<DashboardFinanciero />);
    
    await waitFor(() => {
      expect(screen.getByText(/Error al cargar/)).toBeInTheDocument();
    });
  });

  it('🧪 debe exportar dashboard correctamente', async () => {
    // Mock de la función de exportación
    const mockExport = jest.fn();
    Object.defineProperty(window, 'open', {
      value: mockExport,
      writable: true
    });
    
    render(<DashboardFinanciero />);
    
    await waitFor(() => {
      const botonExportar = screen.getByText('Exportar Dashboard');
      fireEvent.click(botonExportar);
    });
    
    // Verificar que se ejecuta la exportación
    expect(mockExport).toHaveBeenCalled();
  });

  it('🧪 debe actualizar datos al cambiar período', async () => {
    render(<DashboardFinanciero />);
    
    await waitFor(() => {
      const filtroPeriodo = screen.getByRole('combobox');
      fireEvent.click(filtroPeriodo);
    });
    
    // Simular selección de período específico
    await waitFor(() => {
      const opcionPeriodo = screen.getByText('Últimos 3 meses');
      fireEvent.click(opcionPeriodo);
    });
    
    // Verificar que los datos se actualizan
    await waitFor(() => {
      expect(screen.getByText('S/ 125,000.00')).toBeInTheDocument();
    });
  });

  it('🧪 debe mostrar comparativas mensuales', async () => {
    render(<DashboardFinanciero />);
    
    await waitFor(() => {
      // Verificar sección de comparativas
      expect(screen.getByText('Evolución Mensual')).toBeInTheDocument();
      expect(screen.getByText('Comparativa por Proyecto')).toBeInTheDocument();
    });
  });
});

// 🧪 Tests de integración
describe('DashboardFinanciero - Integración', () => {
  it('🧪 debe integrar correctamente con todos los servicios', async () => {
    const { getAllListaRequerimientos } = require('@/services/listaRequerimientosService');
    const { getAllPedidoEquipos } = require('@/services/pedidoEquipoService');
    const { getAllProyectos } = require('@/services/proyectoService');
    
    render(<DashboardFinanciero />);
    
    await waitFor(() => {
      expect(getAllListaRequerimientos).toHaveBeenCalled();
      expect(getAllPedidoEquipos).toHaveBeenCalled();
      expect(getAllProyectos).toHaveBeenCalled();
    });
  });

  it('🧪 debe calcular KPIs financieros correctamente', async () => {
    render(<DashboardFinanciero />);
    
    await waitFor(() => {
      // Verificar cálculos de KPIs
      const eficienciaElement = screen.getByText(/92%/); // (11500/12500) * 100
      expect(eficienciaElement).toBeInTheDocument();
      
      const tasaAhorroElement = screen.getByText(/4.17%/); // (500/12000) * 100
      expect(tasaAhorroElement).toBeInTheDocument();
    });
  });

  it('🧪 debe manejar datos en tiempo real', async () => {
    render(<DashboardFinanciero />);
    
    // Simular actualización de datos
    await waitFor(() => {
      expect(screen.getByText('Dashboard Financiero')).toBeInTheDocument();
    });
    
    // Verificar que se muestran datos actualizados
    await waitFor(() => {
      expect(screen.getByText('S/ 125,000.00')).toBeInTheDocument();
    });
  });

  it('🧪 debe generar alertas automáticas', async () => {
    // Mock datos que generen alertas
    const { getAllProyectos } = require('@/services/proyectoService');
    getAllProyectos.mockResolvedValueOnce([
      {
        id: '1',
        nombre: 'Proyecto Crítico',
        presupuesto: 10000,
        gastado: 9500, // 95% del presupuesto
        estado: 'activo'
      }
    ]);
    
    render(<DashboardFinanciero />);
    
    await waitFor(() => {
      // Verificar que se genera alerta por presupuesto crítico
      expect(screen.getByText(/Presupuesto crítico/)).toBeInTheDocument();
    });
  });
});