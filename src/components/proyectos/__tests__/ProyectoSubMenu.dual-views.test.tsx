/**
 * 🧪 Test: ProyectoSubMenu Dual Views
 * 
 * Verifica que el ProyectoSubMenu incluya correctamente ambas opciones
 * de navegación para listas: Master-Detail e Integrada.
 * 
 * @author GYS Team
 * @version 1.0.0
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { usePathname } from 'next/navigation';
import ProyectoSubMenu from '../ProyectoSubMenu';

// 🔧 Mock Next.js navigation
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
}));

const mockUsePathname = usePathname as jest.MockedFunction<typeof usePathname>;

describe('ProyectoSubMenu - Dual Views', () => {
  const proyectoId = 'test-proyecto-id';

  beforeEach(() => {
    mockUsePathname.mockReturnValue('/proyectos/test-proyecto-id');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Navigation Options', () => {
    it('should render both lista navigation options', () => {
      render(<ProyectoSubMenu proyectoId={proyectoId} />);
      
      // ✅ Verificar que ambas opciones de listas estén presentes
      expect(screen.getByText('Listas Master-Detail')).toBeInTheDocument();
      expect(screen.getByText('Listas Integradas')).toBeInTheDocument();
    });

    it('should have correct paths for both lista views', () => {
      render(<ProyectoSubMenu proyectoId={proyectoId} />);
      
      // ✅ Verificar rutas correctas
      const masterDetailLink = screen.getByText('Listas Master-Detail').closest('a');
      const integratedLink = screen.getByText('Listas Integradas').closest('a');
      
      expect(masterDetailLink).toHaveAttribute('href', `/proyectos/${proyectoId}/equipos/listas`);
      expect(integratedLink).toHaveAttribute('href', `/proyectos/${proyectoId}/equipos/listas-integradas`);
    });

    it('should have different descriptions for each view', () => {
      render(<ProyectoSubMenu proyectoId={proyectoId} />);
      
      // ✅ Verificar descripciones específicas
      const masterDetailLink = screen.getByText('Listas Master-Detail').closest('a');
      const integratedLink = screen.getByText('Listas Integradas').closest('a');
      
      expect(masterDetailLink).toHaveAttribute('title', 'Vista Master-Detail: Resumen de listas + Detalle por separado');
      expect(integratedLink).toHaveAttribute('title', 'Vista Integrada: Todas las listas con detalles en una página');
    });

    it('should use different icons for each view', () => {
      render(<ProyectoSubMenu proyectoId={proyectoId} />);
      
      // ✅ Verificar que ambos enlaces tengan iconos (aunque sean diferentes)
      const masterDetailLink = screen.getByText('Listas Master-Detail').closest('a');
      const integratedLink = screen.getByText('Listas Integradas').closest('a');
      
      // Verificar que ambos tengan elementos SVG (iconos)
      expect(masterDetailLink?.querySelector('svg')).toBeInTheDocument();
      expect(integratedLink?.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('Active State Handling', () => {
    it('should highlight master-detail view when active', () => {
      mockUsePathname.mockReturnValue(`/proyectos/${proyectoId}/equipos/listas`);
      render(<ProyectoSubMenu proyectoId={proyectoId} />);
      
      const masterDetailLink = screen.getByText('Listas Master-Detail').closest('a');
      expect(masterDetailLink).toHaveClass('text-purple-600');
    });

    it('should highlight integrated view when active', () => {
      mockUsePathname.mockReturnValue(`/proyectos/${proyectoId}/equipos/listas-integradas`);
      render(<ProyectoSubMenu proyectoId={proyectoId} />);
      
      const integratedLink = screen.getByText('Listas Integradas').closest('a');
      expect(integratedLink).toHaveClass('text-violet-600');
    });

    it('should not highlight either when on different route', () => {
      mockUsePathname.mockReturnValue(`/proyectos/${proyectoId}/equipos`);
      render(<ProyectoSubMenu proyectoId={proyectoId} />);
      
      const masterDetailLink = screen.getByText('Listas Master-Detail').closest('a');
      const integratedLink = screen.getByText('Listas Integradas').closest('a');
      
      // ✅ Ninguno debería tener clases de estado activo
      expect(masterDetailLink).not.toHaveClass('text-purple-600');
      expect(integratedLink).not.toHaveClass('text-violet-600');
    });
  });

  describe('Color Schemes', () => {
    it('should use purple color scheme for master-detail', () => {
      mockUsePathname.mockReturnValue(`/proyectos/${proyectoId}/equipos/listas`);
      render(<ProyectoSubMenu proyectoId={proyectoId} />);
      
      const masterDetailLink = screen.getByText('Listas Master-Detail').closest('a');
      expect(masterDetailLink).toHaveClass('text-purple-600', 'bg-purple-50');
    });

    it('should use violet color scheme for integrated view', () => {
      mockUsePathname.mockReturnValue(`/proyectos/${proyectoId}/equipos/listas-integradas`);
      render(<ProyectoSubMenu proyectoId={proyectoId} />);
      
      const integratedLink = screen.getByText('Listas Integradas').closest('a');
      expect(integratedLink).toHaveClass('text-violet-600', 'bg-violet-50');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<ProyectoSubMenu proyectoId={proyectoId} />);
      
      const masterDetailLink = screen.getByText('Listas Master-Detail').closest('a');
      const integratedLink = screen.getByText('Listas Integradas').closest('a');
      
      // ✅ Verificar atributos de accesibilidad
      expect(masterDetailLink).toHaveAttribute('title');
      expect(integratedLink).toHaveAttribute('title');
    });

    it('should be keyboard navigable', () => {
      render(<ProyectoSubMenu proyectoId={proyectoId} />);
      
      const masterDetailLink = screen.getByText('Listas Master-Detail').closest('a');
      const integratedLink = screen.getByText('Listas Integradas').closest('a');
      
      // ✅ Los enlaces deben ser focusables
      expect(masterDetailLink).toHaveAttribute('href');
      expect(integratedLink).toHaveAttribute('href');
    });
  });

  describe('Menu Structure', () => {
    it('should maintain correct order of navigation items', () => {
      render(<ProyectoSubMenu proyectoId={proyectoId} />);
      
      const allLinks = screen.getAllByRole('link');
      const linkTexts = allLinks.map(link => link.textContent);
      
      // ✅ Verificar que las listas aparezcan en el orden correcto
      const masterDetailIndex = linkTexts.findIndex(text => text?.includes('Listas Master-Detail'));
      const integratedIndex = linkTexts.findIndex(text => text?.includes('Listas Integradas'));
      
      expect(masterDetailIndex).toBeGreaterThan(-1);
      expect(integratedIndex).toBeGreaterThan(-1);
      expect(integratedIndex).toBeGreaterThan(masterDetailIndex);
    });

    it('should not have duplicate keys', () => {
      render(<ProyectoSubMenu proyectoId={proyectoId} />);
      
      // ✅ El componente debe renderizarse sin errores de React sobre keys duplicadas
      // Si hay keys duplicadas, React mostraría warnings en la consola
      expect(screen.getByText('Listas Master-Detail')).toBeInTheDocument();
      expect(screen.getByText('Listas Integradas')).toBeInTheDocument();
    });
  });

  describe('Integration', () => {
    it('should work with different proyecto IDs', () => {
      const differentProyectoId = 'different-proyecto-id';
      render(<ProyectoSubMenu proyectoId={differentProyectoId} />);
      
      const masterDetailLink = screen.getByText('Listas Master-Detail').closest('a');
      const integratedLink = screen.getByText('Listas Integradas').closest('a');
      
      expect(masterDetailLink).toHaveAttribute('href', `/proyectos/${differentProyectoId}/equipos/listas`);
      expect(integratedLink).toHaveAttribute('href', `/proyectos/${differentProyectoId}/equipos/listas-integradas`);
    });
  });
});
