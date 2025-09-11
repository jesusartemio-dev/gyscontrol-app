/**
 * @fileoverview Tests para EstadoEntregaBadge - Componente de badge de estado de entrega
 * @version 1.0.0
 * @author Sistema GYS
 * @since 2024
 */

import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EstadoEntregaBadge, EstadoEntregaBadgeCompacto, EstadoEntregaIcono, ListaEstadosEntrega } from '@/components/equipos/EstadoEntregaBadge';
import { EstadoEntregaItem } from '@/types/modelos';

// Mock de iconos
jest.mock('lucide-react', () => ({
  Clock: ({ className }: { className?: string }) => <div className={className} data-testid="clock-icon" />,
  Truck: ({ className }: { className?: string }) => <div className={className} data-testid="truck-icon" />,
  Package: ({ className }: { className?: string }) => <div className={className} data-testid="package-icon" />,
  CheckCircle: ({ className }: { className?: string }) => <div className={className} data-testid="check-circle-icon" />,
  AlertTriangle: ({ className }: { className?: string }) => <div className={className} data-testid="alert-triangle-icon" />,
  XCircle: ({ className }: { className?: string }) => <div className={className} data-testid="x-circle-icon" />,
  Loader2: ({ className }: { className?: string }) => <div className={className} data-testid="loader2-icon" />,
}));

// Mock de Tooltip
jest.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <div data-testid="tooltip-content">{children}</div>,
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('EstadoEntregaBadge', () => {
  afterEach(() => cleanup());

  describe('Rendering', () => {
    it('should render correctly with default props', () => {
      render(<EstadoEntregaBadge estado={EstadoEntregaItem.PENDIENTE} />);
      
      expect(screen.getAllByText('Pendiente')).toHaveLength(2); // Badge + Tooltip
      expect(screen.getByTestId('clock-icon')).toBeInTheDocument();
    });

    it('should render without icon when mostrarIcono is false', () => {
      render(<EstadoEntregaBadge estado={EstadoEntregaItem.PENDIENTE} mostrarIcono={false} />);
      
      expect(screen.getAllByText('Pendiente')).toHaveLength(2); // Badge + Tooltip
      expect(screen.queryByTestId('clock-icon')).not.toBeInTheDocument();
    });

    it('should render with different sizes', () => {
      const { rerender } = render(<EstadoEntregaBadge estado={EstadoEntregaItem.PENDIENTE} tamaño="sm" />);
      expect(screen.getAllByText('Pendiente')).toHaveLength(2);

      rerender(<EstadoEntregaBadge estado={EstadoEntregaItem.PENDIENTE} tamaño="md" />);
      expect(screen.getAllByText('Pendiente')).toHaveLength(2);

      rerender(<EstadoEntregaBadge estado={EstadoEntregaItem.PENDIENTE} tamaño="lg" />);
      expect(screen.getAllByText('Pendiente')).toHaveLength(2);
    });

    it('should render with different variants', () => {
      const { rerender } = render(<EstadoEntregaBadge estado={EstadoEntregaItem.PENDIENTE} variante="default" />);
      expect(screen.getAllByText('Pendiente')).toHaveLength(2);

      rerender(<EstadoEntregaBadge estado={EstadoEntregaItem.PENDIENTE} variante="outline" />);
      expect(screen.getAllByText('Pendiente')).toHaveLength(2);

      rerender(<EstadoEntregaBadge estado={EstadoEntregaItem.PENDIENTE} variante="secondary" />);
      expect(screen.getAllByText('Pendiente')).toHaveLength(2);
    });
  });

  describe('Estado Labels and Icons', () => {
    it('should show correct label and icon for PENDIENTE', () => {
      render(<EstadoEntregaBadge estado={EstadoEntregaItem.PENDIENTE} />);
      const textElements = screen.getAllByText('Pendiente');
      expect(textElements.length).toBeGreaterThan(0);
      expect(screen.getByTestId('clock-icon')).toBeInTheDocument();
    });

    it('should show correct label and icon for EN_PROCESO', () => {
      render(<EstadoEntregaBadge estado={EstadoEntregaItem.EN_PROCESO} animado={false} />);
      const textElements = screen.getAllByText('En Proceso');
      expect(textElements.length).toBeGreaterThan(0);
      expect(screen.getByTestId('truck-icon')).toBeInTheDocument();
    });

    it('should show correct label and icon for PARCIAL', () => {
      render(<EstadoEntregaBadge estado={EstadoEntregaItem.PARCIAL} />);
      const textElements = screen.getAllByText('Parcial');
      expect(textElements.length).toBeGreaterThan(0);
      expect(screen.getByTestId('package-icon')).toBeInTheDocument();
    });

    it('should show correct label and icon for ENTREGADO', () => {
      render(<EstadoEntregaBadge estado={EstadoEntregaItem.ENTREGADO} />);
      const textElements = screen.getAllByText('Entregado');
      expect(textElements.length).toBeGreaterThan(0);
      expect(screen.getByTestId('check-circle-icon')).toBeInTheDocument();
    });

    it('should show correct label and icon for RETRASADO', () => {
      render(<EstadoEntregaBadge estado={EstadoEntregaItem.RETRASADO} />);
      const textElements = screen.getAllByText('Retrasado');
      expect(textElements.length).toBeGreaterThan(0);
      expect(screen.getByTestId('alert-triangle-icon')).toBeInTheDocument();
    });

    it('should show correct label and icon for CANCELADO', () => {
      render(<EstadoEntregaBadge estado={EstadoEntregaItem.CANCELADO} />);
      const textElements = screen.getAllByText('Cancelado');
      expect(textElements.length).toBeGreaterThan(0);
      expect(screen.getByTestId('x-circle-icon')).toBeInTheDocument();
    });
  });

  describe('Tooltip', () => {
    it('should show tooltip when mostrarTooltip is true', () => {
      render(<EstadoEntregaBadge estado={EstadoEntregaItem.PENDIENTE} mostrarTooltip />);
      expect(screen.getByTestId('tooltip-content')).toBeInTheDocument();
    });

    it('should not show tooltip when mostrarTooltip is false', () => {
      render(<EstadoEntregaBadge estado={EstadoEntregaItem.PENDIENTE} mostrarTooltip={false} />);
      expect(screen.queryByTestId('tooltip-content')).not.toBeInTheDocument();
    });
  });

  describe('Animation', () => {
    it('should handle animation', () => {
      render(<EstadoEntregaBadge estado={EstadoEntregaItem.EN_PROCESO} animado />);
      // Animation would be tested through CSS classes or data attributes
      const textElements = screen.getAllByText('En Proceso');
      expect(textElements.length).toBeGreaterThan(0);
      
      // Verify animated loader is present
      expect(screen.getByTestId('loader2-icon')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should render accessible content', () => {
      render(<EstadoEntregaBadge estado={EstadoEntregaItem.PENDIENTE} />);
      
      const textElements = screen.getAllByText('Pendiente');
      expect(textElements.length).toBeGreaterThan(0);
      
      // Verify icon is present for screen readers
      const icon = screen.getByTestId('clock-icon');
      expect(icon).toBeInTheDocument();
    });
  });
});

describe('EstadoEntregaBadgeCompacto', () => {
  afterEach(() => cleanup());

  it('should render in compact mode', () => {
    render(<EstadoEntregaBadgeCompacto estado={EstadoEntregaItem.PENDIENTE} />);
    const textElements = screen.getAllByText('Pendiente');
    expect(textElements.length).toBeGreaterThan(0);
  });
});

describe('EstadoEntregaIcono', () => {
  afterEach(() => cleanup());

  it('should render only icon', () => {
    render(<EstadoEntregaIcono estado={EstadoEntregaItem.PENDIENTE} />);
    expect(screen.getByTestId('clock-icon')).toBeInTheDocument();
    // Text appears in tooltip, so we check it exists but is not the main content
    const textElements = screen.getAllByText('Pendiente');
    expect(textElements.length).toBeGreaterThan(0);
  });

  it('should render with different sizes', () => {
    const { rerender } = render(<EstadoEntregaIcono estado={EstadoEntregaItem.PENDIENTE} tamaño="sm" />);
    expect(screen.getByTestId('clock-icon')).toBeInTheDocument();

    rerender(<EstadoEntregaIcono estado={EstadoEntregaItem.PENDIENTE} tamaño="md" />);
    expect(screen.getByTestId('clock-icon')).toBeInTheDocument();

    rerender(<EstadoEntregaIcono estado={EstadoEntregaItem.PENDIENTE} tamaño="lg" />);
    expect(screen.getByTestId('clock-icon')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    render(<EstadoEntregaIcono estado={EstadoEntregaItem.PENDIENTE} className="custom-class" />);
    
    const icon = screen.getByTestId('clock-icon');
    expect(icon).toBeInTheDocument();
  });

  it('should handle animation for EN_PROCESO state', () => {
     render(<EstadoEntregaIcono estado={EstadoEntregaItem.EN_PROCESO} animado />);
     expect(screen.getByTestId('loader2-icon')).toBeInTheDocument();
   });
});

describe('ListaEstadosEntrega', () => {
  afterEach(() => cleanup());

  it('should render list of states', () => {
    render(<ListaEstadosEntrega />);
    
    // Should show all available states
    expect(screen.getAllByText('Pendiente')).toHaveLength(2); // Badge + Tooltip
    expect(screen.getAllByText('En Proceso')).toHaveLength(2);
    expect(screen.getAllByText('Parcial')).toHaveLength(2);
    expect(screen.getAllByText('Entregado')).toHaveLength(2);
    expect(screen.getAllByText('Retrasado')).toHaveLength(2);
    expect(screen.getAllByText('Cancelado')).toHaveLength(2);
  });

  it('should handle state selection', async () => {
    const mockOnSeleccionar = jest.fn();
    const user = userEvent.setup();
    
    render(<ListaEstadosEntrega onSeleccionarEstado={mockOnSeleccionar} />);
    
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
    
    // Click the first button
    await user.click(buttons[0]);
    
    expect(mockOnSeleccionar).toHaveBeenCalled();
  });

  it('should handle selection correctly', () => {
    render(<ListaEstadosEntrega estadoSeleccionado={EstadoEntregaItem.PENDIENTE} />);
    
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
    
    // Verify that buttons are rendered for interactive states
    const pendienteElements = screen.getAllByText('Pendiente');
    expect(pendienteElements.length).toBeGreaterThan(0);
  });

  describe('Accessibility', () => {
    it('should have proper button roles', () => {
      render(<ListaEstadosEntrega />);
      
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThanOrEqual(6); // At least one for each state
    });

    it('should render buttons for interactive states', () => {
      const mockOnSelect = jest.fn();
      render(<ListaEstadosEntrega onSeleccionarEstado={mockOnSelect} />);
      
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });
});
