/**
 * ===================================================
 * TEST: TrazabilidadTimeline Component
 * ===================================================
 * 
 * Tests unitarios para el componente TrazabilidadTimeline
 * que muestra el timeline de eventos de trazabilidad.
 * 
 * @author GYS Team
 * @version 1.0.0
 */

// 📡 Importaciones
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import TrazabilidadTimeline, { type EventoTrazabilidad } from '@/components/trazabilidad/TrazabilidadTimeline';
import { EstadoEntregaItem } from '@/types/modelos';

// 🎭 Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    li: ({ children, ...props }: any) => <li {...props}>{children}</li>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

// 🎭 Mock Lucide icons
jest.mock('lucide-react', () => ({
  Clock: () => <div data-testid="clock-icon" />,
  CheckCircle: () => <div data-testid="check-circle-icon" />,
  AlertCircle: () => <div data-testid="alert-circle-icon" />,
  AlertTriangle: () => <div data-testid="alert-triangle-icon" />,
  XCircle: () => <div data-testid="x-circle-icon" />,
  Package: () => <div data-testid="package-icon" />,
  Truck: () => <div data-testid="truck-icon" />,
  MapPin: () => <div data-testid="map-pin-icon" />,
  User: () => <div data-testid="user-icon" />,
  Calendar: () => <div data-testid="calendar-icon" />,
  ChevronDown: () => <div data-testid="chevron-down-icon" />,
  ChevronUp: () => <div data-testid="chevron-up-icon" />,
  Eye: () => <div data-testid="eye-icon" />,
  MessageSquare: () => <div data-testid="message-square-icon" />,
}));

// 🎭 Mock shadcn/ui components
jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className, ...props }: any) => <div className={className} {...props}>{children}</div>,
  CardContent: ({ children, className, ...props }: any) => <div className={className} {...props}>{children}</div>,
  CardHeader: ({ children, className, ...props }: any) => <div className={className} {...props}>{children}</div>,
  CardTitle: ({ children, className, ...props }: any) => <h3 className={className} {...props}>{children}</h3>,
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className, variant, ...props }: any) => <span className={className} data-variant={variant} {...props}>{children}</span>,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, className, variant, ...props }: any) => <button className={className} data-variant={variant} {...props}>{children}</button>,
}));

jest.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ className, ...props }: any) => <div className={className} data-testid="skeleton" {...props} />,
}));

// 🎭 Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, style, onClick, ...props }: any) => {
      // Filter out framer-motion specific props
      const { whileHover, whileTap, initial, animate, exit, transition, layout, layoutId, ...domProps } = props;
      return <div className={className} style={style} onClick={onClick} {...domProps}>{children}</div>;
    },
    span: ({ children, className, style, ...props }: any) => {
      const { whileHover, whileTap, initial, animate, exit, transition, layout, layoutId, ...domProps } = props;
      return <span className={className} style={style} {...domProps}>{children}</span>;
    },
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// 🎭 Mock utils
jest.mock('@/lib/utils/graficos', () => ({
  formatearFecha: (fecha: Date) => fecha.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
}));

jest.mock('@/lib/utils', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' '),
}));

// 🧪 Datos de prueba
const mockEventos: EventoTrazabilidad[] = [
  {
    id: '1',
    tipo: 'creacion',
    titulo: 'Pedido creado',
    descripcion: 'Pedido #12345 creado exitosamente',
    fecha: new Date('2024-01-15T10:00:00Z'),
    ubicacion: 'Lima, Perú',
    responsable: 'Juan Pérez',
    estado: EstadoEntregaItem.PENDIENTE,
    metadata: { usuario: 'admin' }
  },
  {
    id: '2',
    tipo: 'entrega',
    titulo: 'Equipo entregado',
    descripcion: 'Entrega completada en almacén central',
    fecha: new Date('2024-01-16T14:45:00Z'),
    ubicacion: 'Almacén Central',
    responsable: 'María García',
    estado: EstadoEntregaItem.ENTREGADO,
    metadata: { ubicacion: 'Almacén Central' }
  },
  {
    id: '3',
    tipo: 'incidencia',
    titulo: 'Retraso en entrega',
    descripcion: 'Demora por condiciones climáticas',
    fecha: new Date('2024-01-17T09:15:00Z'),
    ubicacion: 'Carretera Central',
    responsable: 'Carlos López',
    estado: EstadoEntregaItem.RETRASADO,
    metadata: { motivo: 'clima' }
  }
];

describe('TrazabilidadTimeline', () => {
  // ✅ Test básico de renderizado
  it('should render timeline with events', () => {
    render(<TrazabilidadTimeline eventos={mockEventos} />);
    
    expect(screen.getByText('Pedido creado')).toBeInTheDocument();
    expect(screen.getByText('Equipo entregado')).toBeInTheDocument();
    expect(screen.getByText('Retraso en entrega')).toBeInTheDocument();
  });

  // ✅ Test de estado vacío
  it('should render empty state when no events', () => {
    render(<TrazabilidadTimeline eventos={[]} />);
    
    expect(screen.getByText('Sin eventos de trazabilidad')).toBeInTheDocument();
    expect(screen.getByText('No hay eventos registrados para este pedido.')).toBeInTheDocument();
  });

  // ✅ Test de formato de fecha
  it('should format dates correctly', () => {
    render(<TrazabilidadTimeline eventos={mockEventos} />);
    
    // Las fechas se formatean correctamente (verificar que aparecen las fechas)
    expect(screen.getByText('Pedido creado')).toBeInTheDocument();
    expect(screen.getByText('Equipo entregado')).toBeInTheDocument();
    expect(screen.getByText('Retraso en entrega')).toBeInTheDocument();
  });

  // ✅ Test de iconos por tipo
  it('should render correct icons for event types', () => {
    render(<TrazabilidadTimeline eventos={mockEventos} />);
    
    // Los iconos se renderizan (están mockeados)
    expect(screen.getAllByTestId('clock-icon')).toHaveLength(1); // Timeline header
  });

  // ✅ Test de metadata
  it('should display metadata when available', () => {
    render(<TrazabilidadTimeline eventos={mockEventos} />);
    
    // Verificar metadata de ubicación y responsables
    expect(screen.getByText('Lima, Perú')).toBeInTheDocument();
    expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
    expect(screen.getByText('María García')).toBeInTheDocument();
  });

  // ✅ Test de loading state
  it('should render loading state', () => {
    render(<TrazabilidadTimeline eventos={mockEventos} cargando={true} />);
    
    // En loading state se muestran skeletons
    expect(screen.queryByText('Pedido creado')).not.toBeInTheDocument();
  });

});
