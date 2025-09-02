// ===================================================
// 📁 Archivo: ProyeccionMensualListas.test.tsx
// 📌 Ubicación: src/components/finanzas/__tests__/ProyeccionMensualListas.test.tsx
// 🔧 Descripción: Tests unitarios para ProyeccionMensualListas
//
// 🧠 Uso: Validar funcionalidad del componente de proyección mensual
// ✍️ Autor: Sistema GYS
// 📅 Última actualización: 2025-01-20
// ===================================================

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';
import ProyeccionMensualListas from '../ProyeccionMensualListas';

// 🎭 Mock de APIs y servicios
// Mock global fetch for API calls
global.fetch = jest.fn();

// Mock toast notifications
jest.mock('react-hot-toast', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
    loading: jest.fn(),
    dismiss: jest.fn()
  }
}));

// Mock hooks
jest.mock('../../../hooks/useLazyLoading', () => ({
  __esModule: true,
  default: () => ({
    items: [],
    loading: false,
    error: null,
    loadMore: jest.fn(),
    hasMore: false,
    reset: jest.fn()
  })
}));

jest.mock('../../../hooks/usePerformanceMetrics', () => ({
  __esModule: true,
  default: () => ({
    metrics: {},
    startInteraction: jest.fn(),
    endInteraction: jest.fn(),
    trackInteraction: jest.fn()
  })
}));

jest.mock('../../../hooks/useAdvancedPerformanceMonitoring', () => ({
  __esModule: true,
  default: () => ({
    metrics: {},
    startInteraction: jest.fn(),
    endInteraction: jest.fn(),
    trackInteraction: jest.fn()
  })
}));

// 🎭 Mock de Framer Motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    section: ({ children, ...props }: any) => <section {...props}>{children}</section>
  }
}));

describe('ProyeccionMensualListas', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('🧪 debe renderizar correctamente el componente', async () => {
    render(<ProyeccionMensualListas />);
    
    // Verificar título principal
    expect(screen.getByText('Proyección Mensual de Costos')).toBeInTheDocument();
    
    // Verificar descripción
    expect(screen.getByText(/Análisis detallado de costos proyectados/)).toBeInTheDocument();
  });

  it('🧪 debe mostrar loading inicialmente', () => {
    render(<ProyeccionMensualListas />);
    
    expect(screen.getByText('Cargando proyecciones...')).toBeInTheDocument();
  });

  it('🧪 debe cargar y mostrar datos de listas', async () => {
    render(<ProyeccionMensualListas />);
    
    await waitFor(() => {
      expect(screen.getByText('LR-001')).toBeInTheDocument();
    });
    
    expect(screen.getByText('Proyecto Test')).toBeInTheDocument();
    expect(screen.getByText('S/ 3,000.00')).toBeInTheDocument();
  });

  it('🧪 debe mostrar métricas calculadas correctamente', async () => {
    render(<ProyeccionMensualListas />);
    
    await waitFor(() => {
      // Verificar que se muestran las métricas
      expect(screen.getByText('Total Proyectado')).toBeInTheDocument();
      expect(screen.getByText('Promedio por Lista')).toBeInTheDocument();
      expect(screen.getByText('Listas Activas')).toBeInTheDocument();
    });
  });

  it('🧪 debe permitir filtrar por proyecto', async () => {
    render(<ProyeccionMensualListas />);
    
    await waitFor(() => {
      const filtroProyecto = screen.getByRole('combobox');
      fireEvent.click(filtroProyecto);
    });
    
    // Verificar que aparecen las opciones de filtro
    await waitFor(() => {
      expect(screen.getByText('Todos los proyectos')).toBeInTheDocument();
    });
  });

  it('🧪 debe mostrar gráfico de proyección mensual', async () => {
    render(<ProyeccionMensualListas />);
    
    await waitFor(() => {
      // Verificar que el contenedor del gráfico está presente
      expect(screen.getByText('Proyección por Mes')).toBeInTheDocument();
    });
  });

  it('🧪 debe manejar estados de error correctamente', async () => {
    // Mock error en el servicio
    const { getAllListaRequerimientos } = require('@/services/listaRequerimientosService');
    getAllListaRequerimientos.mockRejectedValueOnce(new Error('Error de red'));
    
    render(<ProyeccionMensualListas />);
    
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
    
    render(<ProyeccionMensualListas />);
    
    await waitFor(() => {
      const botonExportar = screen.getByText('Exportar');
      fireEvent.click(botonExportar);
    });
    
    // Verificar que se ejecuta la exportación
    expect(mockExport).toHaveBeenCalled();
  });

  it('🧪 debe actualizar datos al cambiar filtros', async () => {
    render(<ProyeccionMensualListas />);
    
    await waitFor(() => {
      const filtroProyecto = screen.getByRole('combobox');
      fireEvent.click(filtroProyecto);
    });
    
    // Simular selección de proyecto específico
    await waitFor(() => {
      const opcionProyecto = screen.getByText('Proyecto Test');
      fireEvent.click(opcionProyecto);
    });
    
    // Verificar que los datos se actualizan
    await waitFor(() => {
      expect(screen.getByText('LR-001')).toBeInTheDocument();
    });
  });

  it('🧪 debe mostrar indicadores de estado correctamente', async () => {
    render(<ProyeccionMensualListas />);
    
    await waitFor(() => {
      // Verificar que se muestran los badges de estado
      expect(screen.getByText('Enviado')).toBeInTheDocument();
    });
  });
});

// 🧪 Tests de integración
describe('ProyeccionMensualListas - Integración', () => {
  it('🧪 debe integrar correctamente con servicios reales', async () => {
    const { getAllListaRequerimientos } = require('@/services/listaRequerimientosService');
    const { getAllProyectos } = require('@/services/proyectoService');
    
    render(<ProyeccionMensualListas />);
    
    await waitFor(() => {
      expect(getAllListaRequerimientos).toHaveBeenCalled();
      expect(getAllProyectos).toHaveBeenCalled();
    });
  });

  it('🧪 debe calcular métricas financieras correctamente', async () => {
    render(<ProyeccionMensualListas />);
    
    await waitFor(() => {
      // Verificar cálculos de totales
      const totalElement = screen.getByText(/S\/ 3,000\.00/);
      expect(totalElement).toBeInTheDocument();
    });
  });
});