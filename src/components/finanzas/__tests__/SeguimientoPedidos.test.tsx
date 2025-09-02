// ===================================================
// 📁 Archivo: SeguimientoPedidos.test.tsx
// 📌 Ubicación: src/components/finanzas/__tests__/SeguimientoPedidos.test.tsx
// 🔧 Descripción: Tests unitarios para SeguimientoPedidos
//
// 🧠 Uso: Validar funcionalidad del componente de seguimiento de pedidos
// ✍️ Autor: Sistema GYS
// 📅 Última actualización: 2025-01-20
// ===================================================

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';
import SeguimientoPedidos from '../SeguimientoPedidos';

// 🎭 Mock de servicios
jest.mock('@/services/pedidoEquipoService', () => ({
  getAllPedidoEquipos: jest.fn(() => Promise.resolve([
    {
      id: '1',
      codigo: 'PE-001',
      proyecto: { nombre: 'Proyecto Test', id: '1' },
      proveedor: { nombre: 'Proveedor Test', id: '1' },
      fechaPedido: new Date('2024-01-15'),
      fechaEntregaEstimada: new Date('2024-02-15'),
      fechaEntregaReal: new Date('2024-02-10'),
      estado: 'entregado',
      equipos: [
        {
          id: '1',
          nombre: 'Equipo Test',
          cantidad: 2,
          precioUnitario: 1500,
          total: 3000
        }
      ],
      total: 3000,
      montoReal: 2800
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
      estado: 'activo'
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

describe('SeguimientoPedidos', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('🧪 debe renderizar correctamente el componente', async () => {
    render(<SeguimientoPedidos />);
    
    // Verificar título principal
    expect(screen.getByText('Seguimiento de Pedidos en Tiempo Real')).toBeInTheDocument();
    
    // Verificar descripción
    expect(screen.getByText(/Monitoreo de costos reales y tiempos de entrega/)).toBeInTheDocument();
  });

  it('🧪 debe mostrar loading inicialmente', () => {
    render(<SeguimientoPedidos />);
    
    expect(screen.getByText('Cargando pedidos...')).toBeInTheDocument();
  });

  it('🧪 debe cargar y mostrar datos de pedidos', async () => {
    render(<SeguimientoPedidos />);
    
    await waitFor(() => {
      expect(screen.getByText('PE-001')).toBeInTheDocument();
    });
    
    expect(screen.getByText('Proyecto Test')).toBeInTheDocument();
    expect(screen.getByText('Proveedor Test')).toBeInTheDocument();
    expect(screen.getByText('S/ 2,800.00')).toBeInTheDocument();
  });

  it('🧪 debe mostrar métricas de seguimiento correctamente', async () => {
    render(<SeguimientoPedidos />);
    
    await waitFor(() => {
      // Verificar que se muestran las métricas
      expect(screen.getByText('Total Gastado')).toBeInTheDocument();
      expect(screen.getByText('Pedidos Activos')).toBeInTheDocument();
      expect(screen.getByText('Entregas a Tiempo')).toBeInTheDocument();
      expect(screen.getByText('Ahorro Promedio')).toBeInTheDocument();
    });
  });

  it('🧪 debe mostrar indicadores de estado correctamente', async () => {
    render(<SeguimientoPedidos />);
    
    await waitFor(() => {
      // Verificar que se muestran los badges de estado
      expect(screen.getByText('Entregado')).toBeInTheDocument();
    });
  });

  it('🧪 debe calcular diferencias de tiempo correctamente', async () => {
    render(<SeguimientoPedidos />);
    
    await waitFor(() => {
      // Verificar que se muestra la diferencia de días
      expect(screen.getByText(/5 días antes/)).toBeInTheDocument();
    });
  });

  it('🧪 debe calcular ahorros correctamente', async () => {
    render(<SeguimientoPedidos />);
    
    await waitFor(() => {
      // Verificar que se muestra el ahorro (3000 - 2800 = 200)
      expect(screen.getByText('S/ 200.00')).toBeInTheDocument();
    });
  });

  it('🧪 debe permitir filtrar por estado', async () => {
    render(<SeguimientoPedidos />);
    
    await waitFor(() => {
      const filtroEstado = screen.getByRole('combobox');
      fireEvent.click(filtroEstado);
    });
    
    // Verificar que aparecen las opciones de filtro
    await waitFor(() => {
      expect(screen.getByText('Todos los estados')).toBeInTheDocument();
    });
  });

  it('🧪 debe mostrar gráfico de seguimiento', async () => {
    render(<SeguimientoPedidos />);
    
    await waitFor(() => {
      // Verificar que el contenedor del gráfico está presente
      expect(screen.getByText('Evolución de Pedidos')).toBeInTheDocument();
    });
  });

  it('🧪 debe manejar estados de error correctamente', async () => {
    // Mock error en el servicio
    const { getAllPedidoEquipos } = require('@/services/pedidoEquipoService');
    getAllPedidoEquipos.mockRejectedValueOnce(new Error('Error de red'));
    
    render(<SeguimientoPedidos />);
    
    await waitFor(() => {
      expect(screen.getByText(/Error al cargar/)).toBeInTheDocument();
    });
  });

  it('🧪 debe exportar datos correctamente', async () => {
    // Mock de la función de exportación
    const mockExport = jest.fn();
    Object.defineProperty(window, 'open', {
      value: mockExport,
      writable: true
    });
    
    render(<SeguimientoPedidos />);
    
    await waitFor(() => {
      const botonExportar = screen.getByText('Exportar');
      fireEvent.click(botonExportar);
    });
    
    // Verificar que se ejecuta la exportación
    expect(mockExport).toHaveBeenCalled();
  });

  it('🧪 debe mostrar alertas para pedidos retrasados', async () => {
    // Mock pedido retrasado
    const { getAllPedidoEquipos } = require('@/services/pedidoEquipoService');
    getAllPedidoEquipos.mockResolvedValueOnce([
      {
        id: '2',
        codigo: 'PE-002',
        proyecto: { nombre: 'Proyecto Test 2', id: '2' },
        proveedor: { nombre: 'Proveedor Test 2', id: '2' },
        fechaPedido: new Date('2024-01-15'),
        fechaEntregaEstimada: new Date('2024-02-15'),
        fechaEntregaReal: null,
        estado: 'retrasado',
        equipos: [],
        total: 5000,
        montoReal: 0
      }
    ]);
    
    render(<SeguimientoPedidos />);
    
    await waitFor(() => {
      expect(screen.getByText('Retrasado')).toBeInTheDocument();
    });
  });

  it('🧪 debe actualizar datos al cambiar filtros', async () => {
    render(<SeguimientoPedidos />);
    
    await waitFor(() => {
      const filtroEstado = screen.getByRole('combobox');
      fireEvent.click(filtroEstado);
    });
    
    // Simular selección de estado específico
    await waitFor(() => {
      const opcionEstado = screen.getByText('Entregado');
      fireEvent.click(opcionEstado);
    });
    
    // Verificar que los datos se actualizan
    await waitFor(() => {
      expect(screen.getByText('PE-001')).toBeInTheDocument();
    });
  });
});

// 🧪 Tests de integración
describe('SeguimientoPedidos - Integración', () => {
  it('🧪 debe integrar correctamente con servicios reales', async () => {
    const { getAllPedidoEquipos } = require('@/services/pedidoEquipoService');
    const { getAllProyectos } = require('@/services/proyectoService');
    
    render(<SeguimientoPedidos />);
    
    await waitFor(() => {
      expect(getAllPedidoEquipos).toHaveBeenCalled();
      expect(getAllProyectos).toHaveBeenCalled();
    });
  });

  it('🧪 debe calcular métricas financieras correctamente', async () => {
    render(<SeguimientoPedidos />);
    
    await waitFor(() => {
      // Verificar cálculos de totales y ahorros
      const totalElement = screen.getByText(/S\/ 2,800\.00/);
      expect(totalElement).toBeInTheDocument();
      
      const ahorroElement = screen.getByText(/S\/ 200\.00/);
      expect(ahorroElement).toBeInTheDocument();
    });
  });

  it('🧪 debe manejar múltiples estados de pedidos', async () => {
    // Mock múltiples pedidos con diferentes estados
    const { getAllPedidoEquipos } = require('@/services/pedidoEquipoService');
    getAllPedidoEquipos.mockResolvedValueOnce([
      {
        id: '1',
        codigo: 'PE-001',
        estado: 'entregado',
        total: 3000,
        montoReal: 2800
      },
      {
        id: '2',
        codigo: 'PE-002',
        estado: 'enviado',
        total: 2000,
        montoReal: 0
      },
      {
        id: '3',
        codigo: 'PE-003',
        estado: 'retrasado',
        total: 1500,
        montoReal: 0
      }
    ]);
    
    render(<SeguimientoPedidos />);
    
    await waitFor(() => {
      expect(screen.getByText('Entregado')).toBeInTheDocument();
      expect(screen.getByText('Enviado')).toBeInTheDocument();
      expect(screen.getByText('Retrasado')).toBeInTheDocument();
    });
  });
});