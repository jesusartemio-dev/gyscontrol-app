/**
 * @fileoverview Test para verificar las mejoras UX/UI en la sección de distribución por estado
 * @version 1.0.0
 * @author Sistema GYS
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { motion } from 'framer-motion';
import ListaEquipoMasterView from '../ListaEquipoMasterView';
import { useListasEquipo } from '@/lib/hooks/useListasEquipo';
import { toast } from 'sonner';

// 🔧 Mocks
jest.mock('@/lib/hooks/useListasEquipo');
jest.mock('sonner');
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

const mockUseListasEquipo = useListasEquipo as jest.MockedFunction<typeof useListasEquipo>;
const mockToast = toast as jest.MockedFunction<typeof toast>;

// 📊 Mock data with status distribution
const mockStats = {
  totalListas: 10,
  listasPorEstado: {
    aprobado: 4,
    por_aprobar: 3,
    por_revisar: 2,
    rechazado: 1,
  },
};

const mockData = {
  listas: [
    {
      id: '1',
      nombre: 'Lista Test 1',
      estado: 'aprobado' as const,
      fechaCreacion: new Date('2024-01-15'),
      fechaNecesaria: new Date('2024-02-15'),
      responsable: { nombre: 'Juan Pérez' },
      items: [],
    },
  ],
  stats: mockStats,
  isLoading: false,
  error: null,
  refetch: jest.fn(),
};

describe('ListaEquipoMasterView - Enhanced Status Distribution', () => {
  const defaultProps = {
    proyectoId: 'test-proyecto-id',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseListasEquipo.mockReturnValue(mockData);
  });

  describe('📊 Visual Enhancements', () => {
    it('should render enhanced status distribution with gradient header', () => {
      render(<ListaEquipoMasterView {...defaultProps} />);
      
      // ✅ Check for enhanced header with gradient
      const header = screen.getByText('Distribución por Estado');
      expect(header).toBeInTheDocument();
      
      // ✅ Check for gradient classes in header
      const headerContainer = header.closest('.bg-gradient-to-r');
      expect(headerContainer).toHaveClass('from-blue-600', 'to-indigo-600', 'text-white');
    });

    it('should render status cards with proper gradient backgrounds', () => {
      render(<ListaEquipoMasterView {...defaultProps} />);
      
      // ✅ Aprobadas - Green gradient
      const aprobadasCard = screen.getByText('Aprobadas').closest('.bg-gradient-to-br');
      expect(aprobadasCard).toHaveClass('from-green-50', 'to-emerald-50');
      
      // 🔄 Por Aprobar - Yellow gradient
      const porAprobarCard = screen.getByText('Por Aprobar').closest('.bg-gradient-to-br');
      expect(porAprobarCard).toHaveClass('from-yellow-50', 'to-amber-50');
      
      // 📝 Por Revisar - Blue gradient
      const porRevisarCard = screen.getByText('Por Revisar').closest('.bg-gradient-to-br');
      expect(porRevisarCard).toHaveClass('from-blue-50', 'to-cyan-50');
      
      // ❌ Rechazadas - Red gradient
      const rechazadasCard = screen.getByText('Rechazadas').closest('.bg-gradient-to-br');
      expect(rechazadasCard).toHaveClass('from-red-50', 'to-rose-50');
    });

    it('should display correct status counts with enhanced badges', () => {
      render(<ListaEquipoMasterView {...defaultProps} />);
      
      // ✅ Check status counts
      expect(screen.getByText('4')).toBeInTheDocument(); // Aprobadas
      expect(screen.getByText('3')).toBeInTheDocument(); // Por Aprobar
      expect(screen.getByText('2')).toBeInTheDocument(); // Por Revisar
      expect(screen.getByText('1')).toBeInTheDocument(); // Rechazadas
      
      // ✅ Check enhanced badge styling
      const badges = screen.getAllByText(/[0-9]+/).filter(el => 
        el.classList.contains('font-bold') && el.classList.contains('text-lg')
      );
      expect(badges).toHaveLength(4);
    });

    it('should render progress bar with correct percentage', () => {
      render(<ListaEquipoMasterView {...defaultProps} />);
      
      // ✅ Check progress percentage calculation (4/10 * 100 = 40%)
      const progressText = screen.getByText('40% completado');
      expect(progressText).toBeInTheDocument();
      
      // ✅ Check progress bar container
      const progressBar = screen.getByText('Progreso General');
      expect(progressBar).toBeInTheDocument();
    });

    it('should render icons with proper sizes and colors', () => {
      render(<ListaEquipoMasterView {...defaultProps} />);
      
      // ✅ Check for icon containers with proper styling
      const iconContainers = document.querySelectorAll('.p-2.rounded-full');
      expect(iconContainers.length).toBeGreaterThan(0);
      
      // ✅ Check for hover effects
      iconContainers.forEach(container => {
        expect(container).toHaveClass('transition-colors');
      });
    });
  });

  describe('🎨 Responsive Design', () => {
    it('should have responsive grid layout', () => {
      render(<ListaEquipoMasterView {...defaultProps} />);
      
      // ✅ Check responsive grid classes
      const gridContainer = document.querySelector('.grid.grid-cols-1.md\\:grid-cols-2.lg\\:grid-cols-4');
      expect(gridContainer).toBeInTheDocument();
    });

    it('should render with proper spacing and padding', () => {
      render(<ListaEquipoMasterView {...defaultProps} />);
      
      // ✅ Check card padding
      const cardContent = document.querySelector('.p-6');
      expect(cardContent).toBeInTheDocument();
      
      // ✅ Check gap spacing
      const gapContainer = document.querySelector('.gap-4');
      expect(gapContainer).toBeInTheDocument();
    });
  });

  describe('🌙 Dark Mode Support', () => {
    it('should have dark mode classes for all status cards', () => {
      render(<ListaEquipoMasterView {...defaultProps} />);
      
      // ✅ Check dark mode gradient classes
      const darkGradients = document.querySelectorAll('[class*="dark:from-"]');
      expect(darkGradients.length).toBeGreaterThan(0);
      
      // ✅ Check dark mode text colors
      const darkTextElements = document.querySelectorAll('[class*="dark:text-"]');
      expect(darkTextElements.length).toBeGreaterThan(0);
    });
  });

  describe('⚡ Performance & Accessibility', () => {
    it('should render with proper semantic structure', () => {
      render(<ListaEquipoMasterView {...defaultProps} />);
      
      // ✅ Check for proper heading structure
      const heading = screen.getByText('Distribución por Estado');
      expect(heading).toBeInTheDocument();
      
      // ✅ Check for proper card structure
      const cards = document.querySelectorAll('[class*="cursor-pointer"]');
      expect(cards.length).toBe(4); // One for each status
    });

    it('should have hover and focus states', () => {
      render(<ListaEquipoMasterView {...defaultProps} />);
      
      // ✅ Check for hover classes
      const hoverElements = document.querySelectorAll('[class*="hover:shadow-lg"]');
      expect(hoverElements.length).toBe(4);
      
      // ✅ Check for transition classes
      const transitionElements = document.querySelectorAll('[class*="transition-all"]');
      expect(transitionElements.length).toBe(4);
    });
  });

  describe('📱 Loading States', () => {
    it('should render enhanced loading skeleton', () => {
      mockUseListasEquipo.mockReturnValue({
        ...mockData,
        isLoading: true,
      });
      
      render(<ListaEquipoMasterView {...defaultProps} />);
      
      // ✅ Check for enhanced loading skeleton
      const skeletonCards = document.querySelectorAll('.animate-pulse');
      expect(skeletonCards.length).toBeGreaterThan(0);
      
      // ✅ Check for gradient loading header
      const loadingHeader = document.querySelector('.bg-gradient-to-r.from-blue-50');
      expect(loadingHeader).toBeInTheDocument();
    });
  });

  describe('🔢 Edge Cases', () => {
    it('should handle zero counts gracefully', () => {
      const zeroStats = {
        totalListas: 0,
        listasPorEstado: {
          aprobado: 0,
          por_aprobar: 0,
          por_revisar: 0,
          rechazado: 0,
        },
      };
      
      mockUseListasEquipo.mockReturnValue({
        ...mockData,
        stats: zeroStats,
      });
      
      render(<ListaEquipoMasterView {...defaultProps} />);
      
      // ✅ Should not render status distribution when no lists
      const statusSection = screen.queryByText('Distribución por Estado');
      expect(statusSection).not.toBeInTheDocument();
    });

    it('should calculate progress correctly with different values', () => {
      const customStats = {
        totalListas: 7,
        listasPorEstado: {
          aprobado: 3,
          por_aprobar: 2,
          por_revisar: 1,
          rechazado: 1,
        },
      };
      
      mockUseListasEquipo.mockReturnValue({
        ...mockData,
        stats: customStats,
      });
      
      render(<ListaEquipoMasterView {...defaultProps} />);
      
      // ✅ Check progress percentage (3/7 * 100 ≈ 43%)
      const progressText = screen.getByText('43% completado');
      expect(progressText).toBeInTheDocument();
    });
  });
});