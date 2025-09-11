/**
 * 🧪 Tests para MetricasSkeleton - Sistema GYS
 * 
 * Verifica que el componente skeleton se renderice correctamente
 * durante los estados de carga.
 * 
 * @author TRAE AI - Agente Senior Fullstack
 * @version 1.0.0
 * @since 2025-01-27
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import MetricasEntrega from '../../components/trazabilidad/MetricasEntrega';

// 🎭 Mock de componentes UI
jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => (
    <div data-testid="card" className={className}>{children}</div>
  ),
  CardContent: ({ children, className }: any) => (
    <div data-testid="card-content" className={className}>{children}</div>
  ),
  CardHeader: ({ children }: any) => <div data-testid="card-header">{children}</div>,
  CardTitle: ({ children }: any) => <div data-testid="card-title">{children}</div>
}));

jest.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ className }: any) => (
    <div data-testid="skeleton" className={className} />
  )
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className }: any) => (
    <span data-testid="badge" className={className}>{children}</span>
  )
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, className }: any) => (
    <button data-testid="button" onClick={onClick} className={className}>
      {children}
    </button>
  )
}));

// 🎭 Mock de utilidades
jest.mock('@/lib/utils/graficos', () => ({
  formatearNumero: (num: number) => num.toString(),
  formatearFecha: (fecha: Date) => fecha.toISOString(),
  COLORES_GYS: {
    azul: '#1e40af',
    verde: '#16a34a',
    rojo: '#dc2626'
  }
}));

jest.mock('@/lib/utils', () => ({
  cn: (...classes: string[]) => classes.filter(Boolean).join(' ')
}));

// 🎭 Mock de Framer Motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>
  },
  AnimatePresence: ({ children }: any) => <>{children}</>
}));

describe('MetricasSkeleton', () => {
  it('should render skeleton when loading', () => {
    render(
      <MetricasEntrega
        metricas={[]}
        cargando={true}
      />
    );

    // ✅ Verificar que se muestran los skeletons
    const skeletons = screen.getAllByTestId('skeleton');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('should render correct number of skeleton cards', () => {
    render(
      <MetricasEntrega
        metricas={[]}
        cargando={true}
      />
    );

    // ✅ Verificar que se renderizan las cards skeleton
    const cards = screen.getAllByTestId('card');
    expect(cards.length).toBeGreaterThanOrEqual(4); // Default cantidad
  });

  it('should not render skeleton when not loading', () => {
    const mockMetricas = [
      {
        id: 'test-1',
        titulo: 'Test Métrica',
        valor: 100,
        unidad: 'unidades',
        formato: 'entero' as const,
        tendencia: 'estable' as const,
        porcentajeCambio: 0,
        categoria: 'principal' as const,
        icono: <div>icon</div>,
        color: '#1e40af',
        ultimaActualizacion: new Date()
      }
    ];

    render(
      <MetricasEntrega
        metricas={mockMetricas}
        cargando={false}
      />
    );

    // ✅ Verificar que NO se muestran skeletons cuando no está cargando
    const skeletons = screen.queryAllByTestId('skeleton');
    expect(skeletons).toHaveLength(0);
  });
});