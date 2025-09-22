/**
 * 🧪 Sidebar Navigation Highlighting Tests
 * 
 * Tests to verify that navigation highlighting works correctly
 * and prevents false positives when URLs share prefixes.
 * 
 * @author GYS Team
 * @version 1.0.0
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Sidebar from '../Sidebar';

// Mock dependencies
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
}));

jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}));

jest.mock('@/lib/hooks/useNotifications', () => ({
  useNotifications: () => ({
    getBadgeCount: jest.fn(() => 0),
    hasNotifications: false,
  }),
}));

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    aside: ({ children, ...props }: any) => <aside {...props}>{children}</aside>,
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

const mockUsePathname = usePathname as jest.MockedFunction<typeof usePathname>;
const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;

describe('Sidebar Navigation Highlighting', () => {
  beforeEach(() => {
    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: '1',
          name: 'Test User',
          email: 'test@example.com',
          role: 'admin',
        },
      },
      status: 'authenticated',
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('URL prefix collision prevention', () => {
    it('should only highlight "Unidades Servicio" when on /catalogo/unidades-servicio', () => {
      mockUsePathname.mockReturnValue('/catalogo/unidades-servicio');
      
      render(<Sidebar />);
      
      // Should find "Unidades Servicio" link
      const unidadesServicioLink = screen.getByText('Unidades Servicio');
      expect(unidadesServicioLink).toBeInTheDocument();
      
      // Should find "Unidades Equipos" link
      const unidadesEquiposLink = screen.getByText('Unidades Equipos');
      expect(unidadesEquiposLink).toBeInTheDocument();
      
      // Check that only "Unidades Servicio" has active styling
      const unidadesServicioContainer = unidadesServicioLink.closest('a');
      const unidadesEquiposContainer = unidadesEquiposLink.closest('a');
      
      // "Unidades Servicio" should have active classes
      expect(unidadesServicioContainer).toHaveClass('bg-gradient-to-r');
      expect(unidadesServicioContainer).toHaveClass('from-blue-600/20');
      
      // "Unidades Equipos" should NOT have active classes
      expect(unidadesEquiposContainer).not.toHaveClass('bg-gradient-to-r');
      expect(unidadesEquiposContainer).not.toHaveClass('from-blue-600/20');
    });

    it('should only highlight "Unidades Equipos" when on /catalogo/unidades', () => {
      mockUsePathname.mockReturnValue('/catalogo/unidades');
      
      render(<Sidebar />);
      
      const unidadesServicioLink = screen.getByText('Unidades Servicio');
      const unidadesEquiposLink = screen.getByText('Unidades Equipos');
      
      const unidadesServicioContainer = unidadesServicioLink.closest('a');
      const unidadesEquiposContainer = unidadesEquiposLink.closest('a');
      
      // "Unidades Equipos" should have active classes
      expect(unidadesEquiposContainer).toHaveClass('bg-gradient-to-r');
      expect(unidadesEquiposContainer).toHaveClass('from-blue-600/20');
      
      // "Unidades Servicio" should NOT have active classes
      expect(unidadesServicioContainer).not.toHaveClass('bg-gradient-to-r');
      expect(unidadesServicioContainer).not.toHaveClass('from-blue-600/20');
    });

    it('should handle exact matches correctly', () => {
      mockUsePathname.mockReturnValue('/catalogo/unidades-servicio');
      
      render(<Sidebar />);
      
      const unidadesServicioLink = screen.getByText('Unidades Servicio');
      const unidadesServicioContainer = unidadesServicioLink.closest('a');
      
      expect(unidadesServicioContainer).toHaveClass('bg-gradient-to-r');
    });

    it('should handle sub-routes correctly', () => {
      mockUsePathname.mockReturnValue('/catalogo/unidades-servicio/create');
      
      render(<Sidebar />);
      
      const unidadesServicioLink = screen.getByText('Unidades Servicio');
      const unidadesEquiposLink = screen.getByText('Unidades Equipos');
      
      const unidadesServicioContainer = unidadesServicioLink.closest('a');
      const unidadesEquiposContainer = unidadesEquiposLink.closest('a');
      
      // "Unidades Servicio" should be active for sub-routes
      expect(unidadesServicioContainer).toHaveClass('bg-gradient-to-r');
      
      // "Unidades Equipos" should NOT be active
      expect(unidadesEquiposContainer).not.toHaveClass('bg-gradient-to-r');
    });

    it('should handle query parameters correctly', () => {
      mockUsePathname.mockReturnValue('/catalogo/unidades-servicio?page=1');
      
      render(<Sidebar />);
      
      const unidadesServicioLink = screen.getByText('Unidades Servicio');
      const unidadesServicioContainer = unidadesServicioLink.closest('a');
      
      expect(unidadesServicioContainer).toHaveClass('bg-gradient-to-r');
    });

    it('should handle hash fragments correctly', () => {
      mockUsePathname.mockReturnValue('/catalogo/unidades-servicio#section1');
      
      render(<Sidebar />);
      
      const unidadesServicioLink = screen.getByText('Unidades Servicio');
      const unidadesServicioContainer = unidadesServicioLink.closest('a');
      
      expect(unidadesServicioContainer).toHaveClass('bg-gradient-to-r');
    });
  });

  describe('Other navigation items', () => {
    it('should not affect other navigation items', () => {
      mockUsePathname.mockReturnValue('/catalogo/equipos');
      
      render(<Sidebar />);
      
      const catalogoEquiposLink = screen.getByText('Catálogo Equipos');
      const catalogoEquiposContainer = catalogoEquiposLink.closest('a');
      
      expect(catalogoEquiposContainer).toHaveClass('bg-gradient-to-r');
    });
  });
});