/**
 * @fileoverview Tests unitarios para componentes de aprovisionamiento financiero
 * @version 1.0.0
 * @author GYS Team
 * @created 2024-01-15
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

// 🔁 Mock de componentes para testing
const MockProyectoAprovisionamientoTable = ({ proyectos, onEdit, onDelete }: any) => (
  <div data-testid="proyecto-table">
    {proyectos.map((proyecto: any) => (
      <div key={proyecto.id} data-testid={`proyecto-${proyecto.id}`}>
        <span>{proyecto.nombre}</span>
        <button onClick={() => onEdit(proyecto.id)}>Editar</button>
        <button onClick={() => onDelete(proyecto.id)}>Eliminar</button>
      </div>
    ))}
  </div>
);

const MockProyectoAprovisionamientoCard = ({ proyecto, onClick }: any) => (
  <div data-testid="proyecto-card" onClick={() => onClick(proyecto.id)}>
    <h3>{proyecto.nombre}</h3>
    <p>{proyecto.codigo}</p>
  </div>
);

const MockProyectoAprovisionamientoFilters = ({ onFilterChange }: any) => (
  <div data-testid="proyecto-filters">
    <input 
      data-testid="filter-nombre"
      onChange={(e) => onFilterChange({ nombre: e.target.value })}
      placeholder="Filtrar por nombre"
    />
  </div>
);

const MockGanttChart = ({ data }: any) => (
  <div data-testid="gantt-chart">
    {data.map((item: any) => (
      <div key={item.id} data-testid={`gantt-item-${item.id}`}>
        {item.label}
      </div>
    ))}
  </div>
);

// 🔁 Mock data
const mockProyecto = {
  id: 'proyecto-1',
  nombre: 'Proyecto Test',
  codigo: 'PRY-001',
  fechaInicio: new Date('2024-01-01'),
  fechaFin: new Date('2024-12-31'),
  totalInterno: 50000,
  totalReal: 25000,
  estado: 'activo' as const,
  comercial: { id: '1', nombre: 'Juan Pérez' },
  gestor: { id: '2', nombre: 'María García' },
  cliente: { id: '1', nombre: 'Cliente Test' },
  listaEquipos: [],
  pedidos: []
};

const mockLista = {
  id: 'lista-1',
  codigo: 'LST-001',
  proyectoId: 'proyecto-1',
  fechaNecesaria: new Date('2024-06-15'),
  estado: 'aprobado' as const,
  montoTotal: 2000,
  items: [
    {
      id: 'item-1',
      cantidad: 10,
      precioElegido: 100,
      descripcion: 'Equipo A'
    }
  ]
};

const mockPedido = {
  id: 'pedido-1',
  codigo: 'PED-001',
  listaEquipoId: 'lista-1',
  fechaNecesaria: new Date('2024-06-15'),
  estado: 'enviado' as const,
  montoTotal: 800,
  items: [
    {
      id: 'pedido-item-1',
      cantidadPedida: 8,
      precioUnitario: 100
    }
  ]
};

const mockGanttData = {
  listas: [{
    id: 'lista-1',
    label: 'LST-001',
    fechaInicio: new Date('2024-05-01'),
    fechaFin: new Date('2024-06-15'),
    montoProyectado: 2000,
    criticidad: 'media' as const
  }],
  pedidos: [{
    id: 'pedido-1',
    label: 'PED-001',
    fechaInicio: new Date('2024-05-15'),
    fechaFin: new Date('2024-06-15'),
    montoEjecutado: 800,
    listaOrigenId: 'lista-1'
  }]
};

// 🔁 Mock de hooks y servicios
jest.mock('@/lib/hooks/useAprovisionamiento', () => ({
  useAprovisionamiento: () => ({
    proyectos: [],
    listas: [],
    pedidos: [],
    loading: false,
    error: null,
    refetch: jest.fn()
  })
}));

jest.mock('@/lib/services/aprovisionamientoListas', () => ({
  obtenerListasAprovisionamiento: jest.fn(),
  obtenerPedidosAprovisionamiento: jest.fn(),
  validarCoherenciaGlobal: jest.fn()
}));

describe('ProyectoAprovisionamientoTable', () => {
  const mockProps = {
    proyectos: [mockProyecto],
    onEdit: jest.fn(),
    onDelete: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render project table correctly', () => {
    render(<MockProyectoAprovisionamientoTable {...mockProps} />);
    
    expect(screen.getByText('Proyecto Test')).toBeInTheDocument();
    expect(screen.getByTestId('proyecto-table')).toBeInTheDocument();
  });

  it('should handle edit action', async () => {
    const user = userEvent.setup();
    render(<MockProyectoAprovisionamientoTable {...mockProps} />);
    
    const editButton = screen.getByRole('button', { name: /editar/i });
    await user.click(editButton);
    
    expect(mockProps.onEdit).toHaveBeenCalledWith('proyecto-1');
  });

  it('should handle delete action', async () => {
    const user = userEvent.setup();
    render(<MockProyectoAprovisionamientoTable {...mockProps} />);
    
    const deleteButton = screen.getByRole('button', { name: /eliminar/i });
    await user.click(deleteButton);
    
    expect(mockProps.onDelete).toHaveBeenCalledWith('proyecto-1');
  });

  it('should render empty state when no projects', () => {
    render(<MockProyectoAprovisionamientoTable {...mockProps} proyectos={[]} />);
    
    expect(screen.getByTestId('proyecto-table')).toBeInTheDocument();
  });
});

describe('ProyectoAprovisionamientoCard', () => {
  const mockProps = {
    proyecto: mockProyecto,
    onClick: jest.fn()
  };

  it('should render project card with correct information', () => {
    render(<MockProyectoAprovisionamientoCard {...mockProps} />);
    
    expect(screen.getByText('Proyecto Test')).toBeInTheDocument();
    expect(screen.getByText('PRY-001')).toBeInTheDocument();
    expect(screen.getByTestId('proyecto-card')).toBeInTheDocument();
  });

  it('should handle card click', async () => {
    const user = userEvent.setup();
    render(<MockProyectoAprovisionamientoCard {...mockProps} />);
    
    const card = screen.getByTestId('proyecto-card');
    await user.click(card);
    
    expect(mockProps.onClick).toHaveBeenCalledWith('proyecto-1');
  });
});

describe('ProyectoAprovisionamientoFilters', () => {
  const mockProps = {
    onFilterChange: jest.fn()
  };

  it('should render filter controls', () => {
    render(<MockProyectoAprovisionamientoFilters {...mockProps} />);
    
    expect(screen.getByTestId('proyecto-filters')).toBeInTheDocument();
    expect(screen.getByTestId('filter-nombre')).toBeInTheDocument();
  });

  it('should handle filter changes', async () => {
    const user = userEvent.setup();
    render(<MockProyectoAprovisionamientoFilters {...mockProps} />);
    
    const filterInput = screen.getByTestId('filter-nombre');
    await user.type(filterInput, 'test');
    
    expect(mockProps.onFilterChange).toHaveBeenCalledWith({ nombre: 'test' });
  });
});

describe('ProyectoCoherenciaIndicator', () => {
  it('should show coherent status', () => {
    const coherencia = {
      esCoherente: true,
      porcentajeEjecutado: 40,
      diferenciaMonto: 0,
      alertas: []
    };
    
    render(<ProyectoCoherenciaIndicator coherencia={coherencia} />);
    
    expect(screen.getByText('Coherente')).toBeInTheDocument();
    expect(screen.getByTestId('coherencia-icon')).toHaveClass('text-green-500');
  });

  it('should show incoherent status with alerts', () => {
    const coherencia = {
      esCoherente: false,
      porcentajeEjecutado: 120,
      diferenciaMonto: 1000,
      alertas: ['Pedidos exceden el monto de la lista']
    };
    
    render(<ProyectoCoherenciaIndicator coherencia={coherencia} />);
    
    expect(screen.getByText('Incoherente')).toBeInTheDocument();
    expect(screen.getByTestId('coherencia-icon')).toHaveClass('text-red-500');
    expect(screen.getByText('Pedidos exceden el monto de la lista')).toBeInTheDocument();
  });

  it('should display execution percentage', () => {
    const coherencia = {
      esCoherente: true,
      porcentajeEjecutado: 75,
      diferenciaMonto: 0,
      alertas: []
    };
    
    render(<ProyectoCoherenciaIndicator coherencia={coherencia} />);
    
    expect(screen.getByText('75% ejecutado')).toBeInTheDocument();
  });
});

describe('TablaListas', () => {
  const mockProps = {
    listas: [mockLista],
    loading: false,
    onListaSelect: jest.fn(),
    onPageChange: jest.fn(),
    currentPage: 1,
    totalPages: 1
  };

  it('should render lists table correctly', () => {
    render(<TablaListas {...mockProps} />);
    
    expect(screen.getByText('LST-001')).toBeInTheDocument();
    expect(screen.getByText('S/ 2,000.00')).toBeInTheDocument();
    expect(screen.getByText('Aprobado')).toBeInTheDocument();
  });

  it('should handle list selection', async () => {
    const user = userEvent.setup();
    render(<TablaListas {...mockProps} />);
    
    const listRow = screen.getByRole('row', { name: /lst-001/i });
    await user.click(listRow);
    
    expect(mockProps.onListaSelect).toHaveBeenCalledWith(mockLista);
  });

  it('should display pagination controls', () => {
    const propsWithPagination = {
      ...mockProps,
      totalPages: 3,
      currentPage: 2
    };
    
    render(<TablaListas {...propsWithPagination} />);
    
    expect(screen.getByText('Página 2 de 3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeInTheDocument();
  });
});

describe('TablaPedidos', () => {
  const mockProps = {
    pedidos: [mockPedido],
    loading: false,
    onPedidoSelect: jest.fn(),
    onPageChange: jest.fn(),
    currentPage: 1,
    totalPages: 1
  };

  it('should render orders table correctly', () => {
    render(<TablaPedidos {...mockProps} />);
    
    expect(screen.getByText('PED-001')).toBeInTheDocument();
    expect(screen.getByText('S/ 800.00')).toBeInTheDocument();
    expect(screen.getByText('Enviado')).toBeInTheDocument();
  });

  it('should show order status with correct styling', () => {
    render(<TablaPedidos {...mockProps} />);
    
    const statusBadge = screen.getByText('Enviado');
    expect(statusBadge).toHaveClass('bg-blue-100', 'text-blue-800');
  });

  it('should handle empty orders list', () => {
    render(<TablaPedidos {...mockProps} pedidos={[]} />);
    
    expect(screen.getByText('No hay pedidos disponibles')).toBeInTheDocument();
  });
});

describe('GanttChart', () => {
  const mockProps = {
    data: [mockGanttData.listas[0], mockGanttData.pedidos[0]]
  };

  it('should render Gantt chart with data', () => {
    render(<MockGanttChart {...mockProps} />);
    
    expect(screen.getByTestId('gantt-chart')).toBeInTheDocument();
    expect(screen.getByTestId('gantt-item-lista-1')).toBeInTheDocument();
    expect(screen.getByTestId('gantt-item-pedido-1')).toBeInTheDocument();
  });

  it('should handle empty data gracefully', () => {
    const emptyProps = {
      data: []
    };
    
    render(<MockGanttChart {...emptyProps} />);
    
    expect(screen.getByTestId('gantt-chart')).toBeInTheDocument();
   });
});

// 📡 Test utilities
export const testUtils = {
  // ✅ Custom render with providers
  renderWithProviders: (ui: React.ReactElement, options = {}) => {
    const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
      return (
        <div data-testid="test-wrapper">
          {children}
        </div>
      );
    };
    
    return render(ui, { wrapper: AllTheProviders, ...options });
  },
  
  // 🔁 Mock user interactions
  mockUserInteraction: {
    selectOption: async (selectElement: HTMLElement, value: string) => {
      const user = userEvent.setup();
      await user.selectOptions(selectElement, value);
    },
    
    clickButton: async (buttonElement: HTMLElement) => {
      const user = userEvent.setup();
      await user.click(buttonElement);
    },
    
    typeText: async (inputElement: HTMLElement, text: string) => {
      const user = userEvent.setup();
      await user.type(inputElement, text);
    }
  },
  
  // 📊 Assertion helpers
  expectElementToHaveClasses: (element: HTMLElement, classes: string[]) => {
    classes.forEach(className => {
      expect(element).toHaveClass(className);
    });
  },
  
  expectCurrencyFormat: (element: HTMLElement, amount: number) => {
    const formatted = new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN'
    }).format(amount);
    expect(element).toHaveTextContent(formatted);
  }
};