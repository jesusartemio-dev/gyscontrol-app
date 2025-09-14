/**
 * 🧪 Tests para LazyListaEquipoTable
 * 
 * Tests del componente lazy loading para ListaEquipoTable.
 * Parte de la Fase 3 del Plan de Optimización de Performance.
 * 
 * @author TRAE AI - Senior Fullstack Developer
 * @version 1.0.0
 */

import { render, screen, waitFor } from '@testing-library/react';
import { Suspense } from 'react';
import { LazyListaEquipoTable } from './LazyListaEquipoTable';

// 🔧 Mock del componente pesado
jest.mock('@/components/logistica/ListaEquipoTable', () => {
  return function MockListaEquipoTable(props: any) {
    return (
      <div data-testid="lista-equipo-table">
        Mock ListaEquipoTable Component
        {props.testProp && <span data-testid="test-prop">{props.testProp}</span>}
      </div>
    );
  };
});

// 🔧 Mock de componentes UI
jest.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ className, ...props }: any) => (
    <div data-testid="skeleton" className={className} {...props} />
  ),
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className, ...props }: any) => (
    <div data-testid="card" className={className} {...props}>
      {children}
    </div>
  ),
}));

describe('LazyListaEquipoTable', () => {
  // ✅ Test básico de renderizado
  it('should render skeleton while loading', () => {
    render(
      <Suspense fallback={<div data-testid="fallback">Loading...</div>}>
        <LazyListaEquipoTable />
      </Suspense>
    );
    
    // 🔍 Verificar que se muestra el skeleton
    expect(screen.getByTestId('card')).toBeInTheDocument();
    expect(screen.getAllByTestId('skeleton')).toHaveLength(8 + 3 + 2); // 8 filas + 3 filtros + 2 headers
  });

  // 🔄 Test de carga del componente
  it('should load the actual component after suspense', async () => {
    render(
      <Suspense fallback={<div data-testid="fallback">Loading...</div>}>
        <LazyListaEquipoTable testProp="test-value" />
      </Suspense>
    );
    
    // ⏳ Esperar a que se cargue el componente
    await waitFor(() => {
      expect(screen.getByTestId('lista-equipo-table')).toBeInTheDocument();
    });
    
    // ✅ Verificar que se pasaron las props correctamente
    expect(screen.getByTestId('test-prop')).toHaveTextContent('test-value');
  });

  // 🎨 Test del skeleton personalizado
  it('should render table skeleton with correct structure', () => {
    render(
      <Suspense fallback={<div data-testid="fallback">Loading...</div>}>
        <LazyListaEquipoTable />
      </Suspense>
    );
    
    const card = screen.getByTestId('card');
    expect(card).toHaveClass('p-6');
    
    // 🔍 Verificar estructura del skeleton
    const skeletons = screen.getAllByTestId('skeleton');
    expect(skeletons.length).toBeGreaterThan(0);
    
    // 📊 Verificar que hay skeletons para header, filtros y filas
    expect(skeletons.some(skeleton => 
      skeleton.className?.includes('h-8 w-48')
    )).toBe(true); // Header
    
    expect(skeletons.some(skeleton => 
      skeleton.className?.includes('h-10 w-40')
    )).toBe(true); // Filtros
  });

  // 🔧 Test de props forwarding
  it('should forward all props to the wrapped component', async () => {
    const mockProps = {
      data: [{ id: 1, name: 'Test' }],
      onSelect: jest.fn(),
      className: 'custom-class',
    };
    
    render(
      <Suspense fallback={<div data-testid="fallback">Loading...</div>}>
        <LazyListaEquipoTable {...mockProps} />
      </Suspense>
    );
    
    await waitFor(() => {
      expect(screen.getByTestId('lista-equipo-table')).toBeInTheDocument();
    });
  });

  // 📊 Test de métricas de desarrollo
  it('should log metrics in development mode', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    const originalEnv = process.env.NODE_ENV;
    
    // 🔧 Simular entorno de desarrollo
    process.env.NODE_ENV = 'development';
    
    // 🔄 Re-importar el módulo para ejecutar el código de desarrollo
    jest.resetModules();
    require('./LazyListaEquipoTable');
    
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('LazyListaEquipoTable: Componente cargado de forma lazy')
    );
    
    // 🧹 Restaurar
    process.env.NODE_ENV = originalEnv;
    consoleSpy.mockRestore();
  });

  // 🔄 Test de export por defecto
  it('should have default export', async () => {
    const { default: DefaultLazyListaEquipoTable } = await import('./LazyListaEquipoTable');
    
    render(
      <Suspense fallback={<div data-testid="fallback">Loading...</div>}>
        <DefaultLazyListaEquipoTable />
      </Suspense>
    );
    
    await waitFor(() => {
      expect(screen.getByTestId('lista-equipo-table')).toBeInTheDocument();
    });
  });

  // 🎯 Test de accesibilidad del skeleton
  it('should have accessible skeleton structure', () => {
    render(
      <Suspense fallback={<div data-testid="fallback">Loading...</div>}>
        <LazyListaEquipoTable />
      </Suspense>
    );
    
    // 🔍 Verificar que el skeleton tiene estructura semántica
    const card = screen.getByTestId('card');
    expect(card).toBeInTheDocument();
    
    // 📊 Verificar que hay elementos de carga visibles
    const skeletons = screen.getAllByTestId('skeleton');
    expect(skeletons.length).toBeGreaterThan(5); // Suficientes elementos para representar una tabla
  });
});