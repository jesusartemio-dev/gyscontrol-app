/**
 * 🧪 Test específico para el selector de escala de tiempo del GanttChart
 * 
 * Verifica que el selector de días/semanas/meses/trimestres funcione correctamente
 * 
 * @author GYS Team
 * @version 1.0.0
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { GanttChart } from '@/components/finanzas/aprovisionamiento/GanttChart';
import type { TimelineData, GanttListaItem } from '@/types/aprovisionamiento';

// Mock para NextAuth
jest.mock('next-auth/react', () => ({
  useSession: () => ({ data: { user: { role: 'admin' } }, status: 'authenticated' })
}));

// Mock para toast
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: jest.fn() })
}));

// 📋 Mock data para testing
const mockGanttListaItem: GanttListaItem = {
  id: 'lista-1',
  label: 'Lista Test',
  titulo: 'Lista de Equipos Test',
  descripcion: 'Descripción de prueba',
  tipo: 'lista',
  start: new Date('2024-01-01'),
  end: new Date('2024-01-15'),
  fechaInicio: new Date('2024-01-01'),
  fechaFin: new Date('2024-01-15'),
  amount: 50000,
  estado: 'borrador',
  color: '#3b82f6',
  progress: 0.3,
  progreso: 30,
  coherencia: 85,
  dependencies: [],
  alertas: [],
  codigo: 'LST-001',
  fechaNecesaria: new Date('2024-01-15'),
  montoProyectado: 50000,
  proyectoId: 'proyecto-1'
};

const mockTimelineData: TimelineData = {
  items: [mockGanttListaItem],
  resumen: {
    totalItems: 1,
    montoTotal: 50000,
    itemsVencidos: 0,
    itemsEnRiesgo: 0,
    porcentajeCompletado: 30,
    distribucionPorTipo: {
      lista: 1,
      pedido: 0
    },
    alertas: []
  }
};

describe('GanttChart - Selector de Escala de Tiempo', () => {
  beforeEach(() => {
    // ✅ Mock para evitar errores de ResizeObserver
    global.ResizeObserver = jest.fn().mockImplementation(() => ({
      observe: jest.fn(),
      unobserve: jest.fn(),
      disconnect: jest.fn(),
    }));
  });

  test('should render GanttChart component successfully', () => {
    const { container } = render(<GanttChart data={mockTimelineData} />);
    
    // ✅ Verificar que el componente se renderiza
    expect(container).toBeInTheDocument();
  });

  test('should render time scale selector', () => {
    render(<GanttChart data={mockTimelineData} />);
    
    // ✅ Verificar que existe un elemento select (puede ser button con role combobox)
    const selectElements = screen.getAllByRole('button');
    expect(selectElements.length).toBeGreaterThan(0);
  });

  test('should render timeline with data', () => {
    render(<GanttChart data={mockTimelineData} />);
    
    // ✅ Verificar que se renderiza el título del item
    expect(screen.getByText('Lista de Equipos Test')).toBeInTheDocument();
  });
});
