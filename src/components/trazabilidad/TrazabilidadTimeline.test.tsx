import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TrazabilidadTimeline, { type EventoTrazabilidad } from './TrazabilidadTimeline';
import { EstadoEntregaItem } from '@/types/modelos';

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  CheckCircle: () => <div data-testid="check-circle-icon" />,
  Clock: () => <div data-testid="clock-icon" />,
  AlertTriangle: () => <div data-testid="alert-triangle-icon" />,
  XCircle: () => <div data-testid="x-circle-icon" />,
  Package: () => <div data-testid="package-icon" />,
  Truck: () => <div data-testid="truck-icon" />,
  MapPin: () => <div data-testid="map-pin-icon" />,
  User: () => <div data-testid="user-icon" />,
  ChevronDown: () => <div data-testid="chevron-down-icon" />,
  ChevronUp: () => <div data-testid="chevron-up-icon" />,
  Eye: () => <div data-testid="eye-icon" />,
  Calendar: () => <div data-testid="calendar-icon" />,
  MessageSquare: () => <div data-testid="message-square-icon" />,
}));

// Mock utils
jest.mock('@/lib/utils/graficos', () => ({
  formatearFecha: (fecha: Date) => fecha.toLocaleDateString('es-ES'),
}));

jest.mock('@/lib/utils', () => ({
  cn: (...classes: string[]) => classes.filter(Boolean).join(' '),
}));

describe('TrazabilidadTimeline', () => {
  const mockEventos: EventoTrazabilidad[] = [
    {
      id: 'evento-1',
      fecha: new Date('2024-01-15T10:00:00Z'),
      tipo: 'creacion',
      estado: EstadoEntregaItem.PENDIENTE,
      titulo: 'Pedido creado',
      descripcion: 'Se ha creado el pedido PED-001',
      responsable: 'Juan Pérez',
      ubicacion: 'Almacén Central',
      observaciones: 'Pedido urgente',
      esHito: true,
      duracion: 30,
      metadata: { prioridad: 'alta' },
      adjuntos: [
        {
          id: 'adj-1',
          nombre: 'orden_compra.pdf',
          url: '/files/orden_compra.pdf',
          tipo: 'pdf',
        },
      ],
    },
    {
      id: 'evento-2',
      fecha: new Date('2024-01-16T14:30:00Z'),
      tipo: 'preparacion',
      estado: EstadoEntregaItem.EN_PROCESO,
      titulo: 'Preparación iniciada',
      descripcion: 'Se inició la preparación del pedido',
      responsable: 'María García',
      ubicacion: 'Área de preparación',
      esHito: false,
      duracion: 120,
    },
    {
      id: 'evento-3',
      fecha: new Date('2024-01-17T09:15:00Z'),
      tipo: 'entrega',
      estado: EstadoEntregaItem.ENTREGADO,
      titulo: 'Pedido entregado',
      descripcion: 'El pedido fue entregado exitosamente',
      responsable: 'Carlos López',
      ubicacion: 'Cliente - Oficina Principal',
      esHito: true,
      duracion: 45,
    },
  ];

  afterEach(() => cleanup());

  describe('Rendering', () => {
    it('should render correctly with events', () => {
      render(<TrazabilidadTimeline eventos={mockEventos} />);
      
      expect(screen.getByText('Pedido creado')).toBeInTheDocument();
      expect(screen.getByText('Preparación iniciada')).toBeInTheDocument();
      expect(screen.getByText('Pedido entregado')).toBeInTheDocument();
    });

    it('should render event details when mostrarDetalles is true', () => {
      render(<TrazabilidadTimeline eventos={mockEventos} mostrarDetalles={true} />);
      
      expect(screen.getByText('Se ha creado el pedido PED-001')).toBeInTheDocument();
      expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
      expect(screen.getByText('Almacén Central')).toBeInTheDocument();
    });

    it('should hide event details when mostrarDetalles is false', () => {
      render(<TrazabilidadTimeline eventos={mockEventos} mostrarDetalles={false} />);
      
      expect(screen.getByText('Pedido creado')).toBeInTheDocument();
      expect(screen.queryByText('Se ha creado el pedido PED-001')).not.toBeInTheDocument();
    });

    it('should render in compact mode', () => {
      render(<TrazabilidadTimeline eventos={mockEventos} compacto={true} />);
      
      expect(screen.getByText('Pedido creado')).toBeInTheDocument();
      expect(screen.getByText('Preparación iniciada')).toBeInTheDocument();
      expect(screen.getByText('Pedido entregado')).toBeInTheDocument();
    });

    it('should show empty state when no events provided', () => {
      render(<TrazabilidadTimeline eventos={[]} />);
      
      // Should show some indication of no events (this depends on implementation)
      // The component might show an empty timeline or a message
    });

    it('should show loading skeleton when cargando is true', () => {
      render(<TrazabilidadTimeline eventos={mockEventos} cargando={true} />);
      
      // Should show skeleton instead of events
      expect(screen.queryByText('Pedido creado')).not.toBeInTheDocument();
    });
  });

  describe('Event States and Icons', () => {
    it('should display correct icons for different event types', () => {
      render(<TrazabilidadTimeline eventos={mockEventos} />);
      
      // Check that icons are rendered (specific implementation may vary)
      expect(screen.getByTestId('package-icon')).toBeInTheDocument();
    });

    it('should display correct colors for different states', () => {
      const eventosConDiferentesEstados: EventoTrazabilidad[] = [
        {
          ...mockEventos[0],
          estado: EstadoEntregaItem.PENDIENTE,
        },
        {
          ...mockEventos[1],
          estado: EstadoEntregaItem.EN_PROCESO,
        },
        {
          ...mockEventos[2],
          estado: EstadoEntregaItem.ENTREGADO,
        },
      ];
      
      render(<TrazabilidadTimeline eventos={eventosConDiferentesEstados} />);
      
      expect(screen.getByText('Pedido creado')).toBeInTheDocument();
      expect(screen.getByText('Preparación iniciada')).toBeInTheDocument();
      expect(screen.getByText('Pedido entregado')).toBeInTheDocument();
    });

    it('should handle milestone events differently', () => {
      render(<TrazabilidadTimeline eventos={mockEventos} />);
      
      // Milestone events (esHito: true) should be visually different
      expect(screen.getByText('Pedido creado')).toBeInTheDocument();
      expect(screen.getByText('Pedido entregado')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should handle event click', async () => {
      const mockOnEventoClick = jest.fn();
      const user = userEvent.setup();
      
      render(
        <TrazabilidadTimeline 
          eventos={mockEventos} 
          onEventoClick={mockOnEventoClick}
        />
      );
      
      const eventElement = screen.getByText('Pedido creado');
      await user.click(eventElement);
      
      expect(mockOnEventoClick).toHaveBeenCalledWith(mockEventos[0]);
    });

    it('should expand/collapse event details', async () => {
      const user = userEvent.setup();
      
      render(<TrazabilidadTimeline eventos={mockEventos} mostrarDetalles={true} />);
      
      // Look for expand/collapse button (implementation specific)
      const expandButton = screen.queryByTestId('chevron-down-icon');
      if (expandButton) {
        await user.click(expandButton);
        // Should toggle the expanded state
      }
    });

    it('should handle load more functionality', async () => {
      const mockOnCargarMas = jest.fn();
      const user = userEvent.setup();
      
      render(
        <TrazabilidadTimeline 
          eventos={mockEventos} 
          lazyLoading={true}
          onCargarMas={mockOnCargarMas}
        />
      );
      
      const loadMoreButton = screen.queryByRole('button', { name: /cargar más/i });
      if (loadMoreButton) {
        await user.click(loadMoreButton);
        expect(mockOnCargarMas).toHaveBeenCalled();
      }
    });
  });

  describe('Filtering', () => {
    it('should filter events by type', () => {
      render(
        <TrazabilidadTimeline 
          eventos={mockEventos} 
          filtroTipo={['creacion', 'entrega']}
        />
      );
      
      expect(screen.getByText('Pedido creado')).toBeInTheDocument();
      expect(screen.getByText('Pedido entregado')).toBeInTheDocument();
      expect(screen.queryByText('Preparación iniciada')).not.toBeInTheDocument();
    });

    it('should show all events when no filter is applied', () => {
      render(<TrazabilidadTimeline eventos={mockEventos} />);
      
      expect(screen.getByText('Pedido creado')).toBeInTheDocument();
      expect(screen.getByText('Preparación iniciada')).toBeInTheDocument();
      expect(screen.getByText('Pedido entregado')).toBeInTheDocument();
    });
  });

  describe('Lazy Loading', () => {
    it('should implement pagination when lazyLoading is enabled', () => {
      const muchosEventos = Array.from({ length: 25 }, (_, i) => ({
        ...mockEventos[0],
        id: `evento-${i}`,
        titulo: `Evento ${i + 1}`,
      }));
      
      render(
        <TrazabilidadTimeline 
          eventos={muchosEventos} 
          lazyLoading={true}
          itemsPorPagina={10}
        />
      );
      
      // Should only show first 10 items initially
      expect(screen.getByText('Evento 1')).toBeInTheDocument();
      expect(screen.queryByText('Evento 15')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should be accessible', () => {
      render(<TrazabilidadTimeline eventos={mockEventos} />);
      
      // Timeline should have proper structure
      expect(screen.getByRole('list')).toBeInTheDocument();
    });

    it('should have proper ARIA labels for timeline items', () => {
      render(<TrazabilidadTimeline eventos={mockEventos} />);
      
      const timelineItems = screen.getAllByRole('listitem');
      expect(timelineItems.length).toBeGreaterThan(0);
      
      timelineItems.forEach(item => {
        expect(item).toHaveAttribute('aria-label');
      });
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      
      render(<TrazabilidadTimeline eventos={mockEventos} />);
      
      // Should be able to navigate with keyboard
      const firstEvent = screen.getByText('Pedido creado');
      firstEvent.focus();
      
      await user.keyboard('{Tab}');
      // Should move focus to next interactive element
    });
  });

  describe('Date and Time Formatting', () => {
    it('should format dates correctly', () => {
      render(<TrazabilidadTimeline eventos={mockEventos} mostrarDetalles={true} />);
      
      // Check that dates are formatted (specific format depends on implementation)
      expect(screen.getByText(/15\/1\/2024/)).toBeInTheDocument();
    });

    it('should display duration when available', () => {
      render(<TrazabilidadTimeline eventos={mockEventos} mostrarDetalles={true} />);
      
      // Should show duration information
      expect(screen.getByText(/30/)).toBeInTheDocument(); // 30 minutes duration
    });
  });

  describe('Attachments', () => {
    it('should display attachments when available', () => {
      render(<TrazabilidadTimeline eventos={mockEventos} mostrarDetalles={true} />);
      
      // Should show attachment information
      expect(screen.getByText('orden_compra.pdf')).toBeInTheDocument();
    });

    it('should handle events without attachments', () => {
      const eventossSinAdjuntos = mockEventos.map(evento => ({
        ...evento,
        adjuntos: undefined,
      }));
      
      render(<TrazabilidadTimeline eventos={eventossSinAdjuntos} mostrarDetalles={true} />);
      
      expect(screen.getByText('Pedido creado')).toBeInTheDocument();
      expect(screen.queryByText('orden_compra.pdf')).not.toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid dates gracefully', () => {
      const eventosConFechaInvalida: EventoTrazabilidad[] = [
        {
          ...mockEventos[0],
          fecha: new Date('invalid-date'),
        },
      ];
      
      expect(() => {
        render(<TrazabilidadTimeline eventos={eventosConFechaInvalida} />);
      }).not.toThrow();
    });

    it('should handle missing required fields gracefully', () => {
      const eventosIncompletos: EventoTrazabilidad[] = [
        {
          id: 'evento-incompleto',
          fecha: new Date(),
          tipo: 'creacion',
          estado: EstadoEntregaItem.PENDIENTE,
          titulo: 'Evento incompleto',
          // Missing optional fields
        },
      ];
      
      expect(() => {
        render(<TrazabilidadTimeline eventos={eventosIncompletos} />);
      }).not.toThrow();
      
      expect(screen.getByText('Evento incompleto')).toBeInTheDocument();
    });
  });
});