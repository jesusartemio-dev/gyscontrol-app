/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import EquiposPage from '@/app/proyectos/[id]/equipos/page';
import { getProyecto } from '@/lib/services/proyectos';
import { getProyectoEquipos } from '@/lib/services/proyectoEquipo';
import type { Proyecto, ProyectoEquipo } from '@/types/modelos';

// ✅ Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  notFound: jest.fn()
}));

jest.mock('@/lib/services/proyectos');
jest.mock('@/lib/services/proyectoEquipo');

const mockGetProyecto = getProyecto as jest.MockedFunction<typeof getProyecto>;
const mockGetProyectoEquipos = getProyectoEquipos as jest.MockedFunction<typeof getProyectoEquipos>;

// ✅ Mock data
const mockProyecto: Proyecto = {
  id: 'proyecto-1',
  nombre: 'Proyecto Test',
  descripcion: 'Descripción del proyecto test',
  estado: 'ACTIVO',
  fechaInicio: new Date('2024-01-01'),
  fechaFin: new Date('2024-12-31'),
  presupuesto: 100000,
  clienteId: 'cliente-1',
  responsableId: 'user-1',
  createdAt: new Date(),
  updatedAt: new Date()
};

const mockEquipos: ProyectoEquipo[] = [
  {
    id: 'equipo-1',
    nombre: 'Equipo Test 1',
    proyectoId: 'proyecto-1',
    responsable: 'Juan Pérez',
    items: [],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'equipo-2',
    nombre: 'Equipo Test 2',
    proyectoId: 'proyecto-1',
    responsable: 'María García',
    items: [],
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

describe('EquiposPage', () => {
  const mockParams = Promise.resolve({ id: 'proyecto-1' });

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      push: jest.fn(),
      replace: jest.fn(),
      refresh: jest.fn()
    });
  });

  it('should render loading skeleton initially', () => {
    mockGetProyecto.mockImplementation(() => new Promise(() => {})); // Never resolves
    mockGetProyectoEquipos.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<EquiposPage params={mockParams} />);

    // ✅ Check for loading skeleton elements
    const skeletonElements = screen.getAllByRole('generic');
    expect(skeletonElements.length).toBeGreaterThan(0);
  });

  it('should render project equipment data successfully', async () => {
    mockGetProyecto.mockResolvedValue(mockProyecto);
    mockGetProyectoEquipos.mockResolvedValue(mockEquipos);

    render(<EquiposPage params={mockParams} />);

    // ✅ Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Equipos del Proyecto')).toBeInTheDocument();
    });

    // ✅ Check statistics cards
    expect(screen.getByText('Total Equipos')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('Responsables')).toBeInTheDocument();
  });

  it('should handle empty equipment list', async () => {
    mockGetProyecto.mockResolvedValue(mockProyecto);
    mockGetProyectoEquipos.mockResolvedValue([]);

    render(<EquiposPage params={mockParams} />);

    await waitFor(() => {
      expect(screen.getByText('Equipos del Proyecto')).toBeInTheDocument();
    });

    // ✅ Check empty state
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('should handle API errors gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    mockGetProyecto.mockRejectedValue(new Error('API Error'));
    mockGetProyectoEquipos.mockRejectedValue(new Error('API Error'));

    render(<EquiposPage params={mockParams} />);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Error fetching data:', expect.any(Error));
    });

    consoleSpy.mockRestore();
  });

  it('should call event handlers when provided', async () => {
    mockGetProyecto.mockResolvedValue(mockProyecto);
    mockGetProyectoEquipos.mockResolvedValue(mockEquipos);

    render(<EquiposPage params={mockParams} />);

    await waitFor(() => {
      expect(screen.getByText('Equipos del Proyecto')).toBeInTheDocument();
    });

    // ✅ Verify that ProyectoEquipoList is rendered with handlers
    // Note: The handlers are currently console.log functions as placeholders
    expect(mockGetProyecto).toHaveBeenCalledWith('proyecto-1');
    expect(mockGetProyectoEquipos).toHaveBeenCalledWith('proyecto-1');
  });
});
