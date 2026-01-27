/**
 * Tests para componente ProyectoGanttView
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProyectoGanttView } from '@/components/proyectos/cronograma/ProyectoGanttView';

// Mock de date-fns
jest.mock('date-fns', () => ({
  format: jest.fn((date, formatStr) => `formatted-${date.toISOString()}`),
  differenceInDays: jest.fn((date1, date2) => 30),
  addDays: jest.fn((date, days) => new Date(date.getTime() + days * 24 * 60 * 60 * 1000)),
  startOfWeek: jest.fn((date) => date),
  endOfWeek: jest.fn((date) => date),
  es: {}
}));

// Mock de fetch
global.fetch = jest.fn();

describe('ProyectoGanttView', () => {
  const mockProps = {
    proyectoId: 'test-proyecto-id',
    cronogramaId: 'test-cronograma-id',
    onItemClick: jest.fn()
  };

  const mockProyecto = {
    id: 'test-proyecto-id',
    nombre: 'Proyecto Test',
    fechaInicio: '2025-01-01T00:00:00Z',
    fechaFin: '2025-12-31T00:00:00Z'
  };

  const mockFases = [
    {
      id: 'fase-1',
      nombre: 'Fase 1',
      fechaInicioPlan: '2025-01-01T00:00:00Z',
      fechaFinPlan: '2025-04-01T00:00:00Z',
      porcentajeAvance: 25,
      estado: 'en_progreso',
      orden: 1,
      edts: [
        {
          id: 'edt-1',
          nombre: 'EDT 1',
          fechaInicioPlan: '2025-01-01T00:00:00Z',
          fechaFinPlan: '2025-03-01T00:00:00Z',
          porcentajeAvance: 50,
          estado: 'en_progreso',
          zonas: [
            {
              id: 'zona-1',
              nombre: 'Zona 1',
              fechaInicioPlan: '2025-01-01T00:00:00Z',
              fechaFinPlan: '2025-02-01T00:00:00Z',
              porcentajeAvance: 75,
              estado: 'completado',
              actividades: [
                {
                  id: 'actividad-1',
                  nombre: 'Actividad 1',
                  fechaInicioPlan: '2025-01-01T00:00:00Z',
                  fechaFinPlan: '2025-01-15T00:00:00Z',
                  porcentajeAvance: 100,
                  estado: 'completado',
                  tareas: [
                    {
                      id: 'tarea-1',
                      nombre: 'Tarea 1',
                      fechaInicio: '2025-01-01T00:00:00Z',
                      fechaFin: '2025-01-10T00:00:00Z',
                      porcentajeCompletado: 100,
                      estado: 'completado'
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/proyectos/test-proyecto-id')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: mockProyecto })
        });
      }
      if (url.includes('/fases')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: mockFases })
        });
      }
      if (url.includes('/edt')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: mockFases[0].edts })
        });
      }
      if (url.includes('/zonas')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: mockFases[0].edts[0].zonas })
        });
      }
      if (url.includes('/actividades')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: mockFases[0].edts[0].zonas[0].actividades })
        });
      }
      if (url.includes('/tareas')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: mockFases[0].edts[0].zonas[0].actividades[0].tareas })
        });
      }
      return Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ error: 'Not found' })
      });
    });
  });

  it('debería renderizar el componente correctamente', async () => {
    render(<ProyectoGanttView {...mockProps} />);

    expect(screen.getByText('Diagrama de Gantt - 6 Niveles')).toBeInTheDocument();
    expect(screen.getByText('Cargando diagrama de Gantt...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Proyecto Test')).toBeInTheDocument();
      expect(screen.getByText('Fase 1')).toBeInTheDocument();
      expect(screen.getByText('EDT 1')).toBeInTheDocument();
    });
  });

  it('debería mostrar controles de zoom', async () => {
    render(<ProyectoGanttView {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    const zoomInButton = screen.getAllByRole('button').find(btn =>
      btn.querySelector('svg[data-testid="zoom-in"]') ||
      btn.textContent?.includes('+')
    );
    const zoomOutButton = screen.getAllByRole('button').find(btn =>
      btn.querySelector('svg[data-testid="zoom-out"]') ||
      btn.textContent?.includes('-')
    );

    expect(zoomInButton).toBeInTheDocument();
    expect(zoomOutButton).toBeInTheDocument();
  });

  it('debería mostrar filtros por tipo', async () => {
    render(<ProyectoGanttView {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('Todos los niveles')).toBeInTheDocument();
    });

    const filterSelect = screen.getByText('Todos los niveles').closest('button');
    fireEvent.click(filterSelect!);

    await waitFor(() => {
      expect(screen.getByText('Solo fases')).toBeInTheDocument();
      expect(screen.getByText('Solo EDTs')).toBeInTheDocument();
      expect(screen.getByText('Solo zonas')).toBeInTheDocument();
      expect(screen.getByText('Solo actividades')).toBeInTheDocument();
      expect(screen.getByText('Solo tareas')).toBeInTheDocument();
    });
  });

  it('debería mostrar elementos jerárquicos correctamente', async () => {
    render(<ProyectoGanttView {...mockProps} />);

    await waitFor(() => {
      // Verificar que se muestran todos los niveles
      expect(screen.getByText('Proyecto Test')).toBeInTheDocument();
      expect(screen.getByText('Fase 1')).toBeInTheDocument();
      expect(screen.getByText('EDT 1')).toBeInTheDocument();
      expect(screen.getByText('Zona 1')).toBeInTheDocument();
      expect(screen.getByText('Actividad 1')).toBeInTheDocument();
      expect(screen.getByText('Tarea 1')).toBeInTheDocument();
    });
  });

  it('debería mostrar leyendas de colores', async () => {
    render(<ProyectoGanttView {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('Proyecto')).toBeInTheDocument();
      expect(screen.getByText('Fase')).toBeInTheDocument();
      expect(screen.getByText('EDT')).toBeInTheDocument();
      expect(screen.getByText('Zona')).toBeInTheDocument();
      expect(screen.getByText('Actividad')).toBeInTheDocument();
      expect(screen.getByText('Tarea')).toBeInTheDocument();
    });
  });

  it('debería manejar expansión/colapso de elementos', async () => {
    render(<ProyectoGanttView {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('Proyecto Test')).toBeInTheDocument();
    });

    // Los elementos deberían estar expandidos por defecto
    expect(screen.getByText('Fase 1')).toBeInTheDocument();
  });

  it('debería llamar a onItemClick cuando se hace clic en un elemento', async () => {
    render(<ProyectoGanttView {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('Proyecto Test')).toBeInTheDocument();
    });

    const proyectoElement = screen.getByText('Proyecto Test');
    fireEvent.click(proyectoElement);

    expect(mockProps.onItemClick).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'test-proyecto-id',
        nombre: 'Proyecto Test',
        tipo: 'proyecto'
      })
    );
  });

  it('debería mostrar botón de exportar', async () => {
    render(<ProyectoGanttView {...mockProps} />);

    await waitFor(() => {
      const exportButton = screen.getByText('Exportar');
      expect(exportButton).toBeInTheDocument();
    });
  });

  it('debería manejar errores de carga correctamente', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    render(<ProyectoGanttView {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('Error al cargar el diagrama')).toBeInTheDocument();
    });

    consoleSpy.mockRestore();
  });

  it('debería mostrar estado de carga inicialmente', () => {
    render(<ProyectoGanttView {...mockProps} />);

    expect(screen.getByText('Cargando diagrama de Gantt...')).toBeInTheDocument();
  });

  it('debería calcular dimensiones del Gantt correctamente', async () => {
    render(<ProyectoGanttView {...mockProps} />);

    await waitFor(() => {
      // Verificar que se renderiza el diagrama
      expect(screen.getByText('Elemento')).toBeInTheDocument();
      expect(screen.getByText(/Cronograma/)).toBeInTheDocument();
    });
  });

  it('debería manejar jerarquía compleja correctamente', async () => {
    // Test con datos más complejos
    const complexFases = [
      {
        ...mockFases[0],
        edts: [
          ...mockFases[0].edts,
          {
            id: 'edt-2',
            nombre: 'EDT 2',
            fechaInicioPlan: '2025-03-01T00:00:00Z',
            fechaFinPlan: '2025-06-01T00:00:00Z',
            porcentajeAvance: 30,
            estado: 'planificado',
            zonas: []
          }
        ]
      }
    ];

    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/fases')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: complexFases })
        });
      }
      // ... otros mocks
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: [] })
      });
    });

    render(<ProyectoGanttView {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('EDT 1')).toBeInTheDocument();
      // EDT 2 debería estar presente también
    });
  });
});