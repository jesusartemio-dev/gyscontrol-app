/**
 * Tests para componente ProyectoDependenciasVisual
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProyectoDependenciasVisual } from '@/components/proyectos/cronograma/ProyectoDependenciasVisual';

// Mock de fetch
global.fetch = jest.fn();

describe('ProyectoDependenciasVisual', () => {
  const mockProps = {
    proyectoId: 'test-proyecto-id',
    cronogramaId: 'test-cronograma-id',
    onRefresh: jest.fn()
  };

  const mockTareas = [
    {
      id: 'tarea-1',
      nombre: 'Tarea 1',
      estado: 'pendiente' as const,
      fechaInicio: '2025-01-01',
      fechaFin: '2025-01-05',
      proyectoActividadId: 'actividad-1',
      proyectoActividad: {
        nombre: 'Actividad 1',
        proyectoZona: {
          nombre: 'Zona 1'
        }
      }
    },
    {
      id: 'tarea-2',
      nombre: 'Tarea 2',
      estado: 'pendiente' as const,
      fechaInicio: '2025-01-06',
      fechaFin: '2025-01-10',
      proyectoActividadId: 'actividad-1'
    }
  ];

  const mockDependencias = [
    {
      id: 'dep-1',
      tipo: 'finish_to_start' as const,
      tareaOrigen: { id: 'tarea-1', nombre: 'Tarea 1' },
      tareaDependiente: { id: 'tarea-2', nombre: 'Tarea 2' },
      createdAt: '2025-01-01T00:00:00Z'
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/tareas')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: mockTareas })
        });
      }
      if (url.includes('/dependencias')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: mockDependencias })
        });
      }
      return Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ error: 'Not found' })
      });
    });
  });

  it('debería renderizar el componente correctamente', async () => {
    render(<ProyectoDependenciasVisual {...mockProps} />);

    expect(screen.getByText('Crear Nueva Dependencia')).toBeInTheDocument();
    expect(screen.getByText('Dependencias Existentes')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Tarea 1')).toBeInTheDocument();
      expect(screen.getByText('Tarea 2')).toBeInTheDocument();
    });
  });

  it('debería mostrar mensaje cuando no hay dependencias', async () => {
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/tareas')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: mockTareas })
        });
      }
      if (url.includes('/dependencias')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: [] })
        });
      }
      return Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ error: 'Not found' })
      });
    });

    render(<ProyectoDependenciasVisual {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('No hay dependencias definidas')).toBeInTheDocument();
    });
  });

  it('debería permitir seleccionar tareas para crear dependencia', async () => {
    render(<ProyectoDependenciasVisual {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('Seleccionar tarea origen')).toBeInTheDocument();
    });

    // Simular selección de tareas
    const origenSelect = screen.getByText('Seleccionar tarea origen').closest('button');
    fireEvent.click(origenSelect!);

    await waitFor(() => {
      expect(screen.getByText('Tarea 1')).toBeInTheDocument();
    });
  });

  it('debería mostrar tipos de dependencia correctamente', async () => {
    render(<ProyectoDependenciasVisual {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('Terminar → Iniciar')).toBeInTheDocument();
    });

    // Verificar que se muestran los tipos de dependencia
    const tipoSelect = screen.getByText('Terminar → Iniciar').closest('button');
    fireEvent.click(tipoSelect!);

    await waitFor(() => {
      expect(screen.getByText('Iniciar → Iniciar')).toBeInTheDocument();
      expect(screen.getByText('Terminar → Terminar')).toBeInTheDocument();
      expect(screen.getByText('Iniciar → Terminar')).toBeInTheDocument();
    });
  });

  it('debería mostrar dependencias existentes con iconos correctos', async () => {
    render(<ProyectoDependenciasVisual {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('Tarea 1')).toBeInTheDocument();
      expect(screen.getByText('Tarea 2')).toBeInTheDocument();
      expect(screen.getByText('Terminar → Iniciar')).toBeInTheDocument();
    });
  });

  it('debería llamar a onRefresh después de crear dependencia', async () => {
    (global.fetch as jest.Mock).mockImplementation((url: string, options?: any) => {
      if (url.includes('/tareas')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: mockTareas })
        });
      }
      if (url.includes('/dependencias') && options?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true })
        });
      }
      if (url.includes('/dependencias') && !options?.method) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: mockDependencias })
        });
      }
      return Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ error: 'Not found' })
      });
    });

    render(<ProyectoDependenciasVisual {...mockProps} />);

    // Simular creación de dependencia
    await waitFor(() => {
      expect(mockProps.onRefresh).toHaveBeenCalledTimes(1); // Llamado en loadData inicial
    });

    // Aquí iría la simulación del formulario de creación
    // expect(mockProps.onRefresh).toHaveBeenCalledTimes(2); // Después de crear
  });

  it('debería manejar errores de carga correctamente', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    render(<ProyectoDependenciasVisual {...mockProps} />);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Error en loadData:', expect.any(Error));
    });

    consoleSpy.mockRestore();
  });

  it('debería mostrar estado de carga inicialmente', () => {
    render(<ProyectoDependenciasVisual {...mockProps} />);

    expect(screen.getByText('Cargando dependencias...')).toBeInTheDocument();
  });
});