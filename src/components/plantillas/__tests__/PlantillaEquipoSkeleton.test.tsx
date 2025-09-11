import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import {
  PlantillaEquipoAccordionSkeleton,
  PlantillaEquipoItemFormSkeleton,
  PlantillaEquipoItemListSkeleton,
  PlantillaEquipoEmptyState,
  PlantillaEquipoErrorState
} from '../PlantillaEquipoSkeleton'

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>
  }
}))

describe('PlantillaEquipoSkeleton Components', () => {
  describe('PlantillaEquipoAccordionSkeleton', () => {
    it('renders skeleton structure correctly', () => {
      render(<PlantillaEquipoAccordionSkeleton />)
      
      // Should render skeleton elements
      const skeletons = document.querySelectorAll('[data-testid="skeleton"]')
      expect(skeletons.length).toBeGreaterThan(0)
    })

    it('has correct accessibility attributes', () => {
      render(<PlantillaEquipoAccordionSkeleton />)
      
      const container = screen.getByRole('status')
      expect(container).toHaveAttribute('aria-label', 'Cargando plantilla de equipos...')
    })
  })

  describe('PlantillaEquipoItemFormSkeleton', () => {
    it('renders form skeleton correctly', () => {
      render(<PlantillaEquipoItemFormSkeleton />)
      
      // Should render skeleton elements for form fields
      const skeletons = document.querySelectorAll('[data-testid="skeleton"]')
      expect(skeletons.length).toBeGreaterThan(0)
    })

    it('has correct accessibility attributes', () => {
      render(<PlantillaEquipoItemFormSkeleton />)
      
      const container = screen.getByRole('status')
      expect(container).toHaveAttribute('aria-label', 'Cargando formulario...')
    })
  })

  describe('PlantillaEquipoItemListSkeleton', () => {
    it('renders list skeleton correctly', () => {
      render(<PlantillaEquipoItemListSkeleton />)
      
      // Should render skeleton table structure
      const table = screen.getByRole('table')
      expect(table).toBeInTheDocument()
      
      // Should have skeleton rows
      const rows = screen.getAllByRole('row')
      expect(rows.length).toBeGreaterThan(1) // Header + skeleton rows
    })

    it('renders correct number of skeleton rows', () => {
      render(<PlantillaEquipoItemListSkeleton rows={5} />)
      
      const rows = screen.getAllByRole('row')
      expect(rows.length).toBe(6) // 1 header + 5 skeleton rows
    })

    it('uses default number of rows when not specified', () => {
      render(<PlantillaEquipoItemListSkeleton />)
      
      const rows = screen.getAllByRole('row')
      expect(rows.length).toBe(4) // 1 header + 3 default skeleton rows
    })

    it('has correct accessibility attributes', () => {
      render(<PlantillaEquipoItemListSkeleton />)
      
      const container = screen.getByRole('status')
      expect(container).toHaveAttribute('aria-label', 'Cargando lista de equipos...')
    })
  })

  describe('PlantillaEquipoEmptyState', () => {
    it('renders empty state correctly', () => {
      render(<PlantillaEquipoEmptyState />)
      
      expect(screen.getByText(/no hay equipos agregados/i)).toBeInTheDocument()
      expect(screen.getByText(/agrega el primer equipo/i)).toBeInTheDocument()
    })

    it('renders custom title and description', () => {
      const customTitle = 'Título personalizado'
      const customDescription = 'Descripción personalizada'
      
      render(
        <PlantillaEquipoEmptyState 
          title={customTitle} 
          description={customDescription} 
        />
      )
      
      expect(screen.getByText(customTitle)).toBeInTheDocument()
      expect(screen.getByText(customDescription)).toBeInTheDocument()
    })

    it('renders action button when provided', () => {
      const mockAction = vi.fn()
      
      render(
        <PlantillaEquipoEmptyState 
          action={{
            label: 'Agregar equipo',
            onClick: mockAction
          }}
        />
      )
      
      const button = screen.getByRole('button', { name: /agregar equipo/i })
      expect(button).toBeInTheDocument()
    })

    it('calls action function when button is clicked', async () => {
      const mockAction = vi.fn()
      
      render(
        <PlantillaEquipoEmptyState 
          action={{
            label: 'Agregar equipo',
            onClick: mockAction
          }}
        />
      )
      
      const button = screen.getByRole('button', { name: /agregar equipo/i })
      button.click()
      
      expect(mockAction).toHaveBeenCalledTimes(1)
    })

    it('has correct icon', () => {
      render(<PlantillaEquipoEmptyState />)
      
      // Should render Package icon (we can't test the actual icon, but we can test its container)
      const iconContainer = document.querySelector('svg')
      expect(iconContainer).toBeInTheDocument()
    })
  })

  describe('PlantillaEquipoErrorState', () => {
    it('renders error state correctly', () => {
      render(<PlantillaEquipoErrorState />)
      
      expect(screen.getByText(/algo salió mal/i)).toBeInTheDocument()
      expect(screen.getByText(/ocurrió un error/i)).toBeInTheDocument()
    })

    it('renders custom title and description', () => {
      const customTitle = 'Error personalizado'
      const customDescription = 'Descripción del error'
      
      render(
        <PlantillaEquipoErrorState 
          title={customTitle} 
          description={customDescription} 
        />
      )
      
      expect(screen.getByText(customTitle)).toBeInTheDocument()
      expect(screen.getByText(customDescription)).toBeInTheDocument()
    })

    it('renders retry button when provided', () => {
      const mockRetry = vi.fn()
      
      render(
        <PlantillaEquipoErrorState 
          onRetry={mockRetry}
        />
      )
      
      const button = screen.getByRole('button', { name: /intentar nuevamente/i })
      expect(button).toBeInTheDocument()
    })

    it('calls retry function when button is clicked', async () => {
      const mockRetry = vi.fn()
      
      render(
        <PlantillaEquipoErrorState 
          onRetry={mockRetry}
        />
      )
      
      const button = screen.getByRole('button', { name: /intentar nuevamente/i })
      button.click()
      
      expect(mockRetry).toHaveBeenCalledTimes(1)
    })

    it('has correct icon', () => {
      render(<PlantillaEquipoErrorState />)
      
      // Should render AlertCircle icon
      const iconContainer = document.querySelector('svg')
      expect(iconContainer).toBeInTheDocument()
    })

    it('has error styling', () => {
      render(<PlantillaEquipoErrorState />)
      
      const container = screen.getByRole('alert')
      expect(container).toHaveClass('border-red-200')
    })
  })

  describe('Accessibility', () => {
    it('all skeleton components have proper ARIA labels', () => {
      const { rerender } = render(<PlantillaEquipoAccordionSkeleton />)
      expect(screen.getByRole('status')).toHaveAttribute('aria-label')
      
      rerender(<PlantillaEquipoItemFormSkeleton />)
      expect(screen.getByRole('status')).toHaveAttribute('aria-label')
      
      rerender(<PlantillaEquipoItemListSkeleton />)
      expect(screen.getByRole('status')).toHaveAttribute('aria-label')
    })

    it('empty state has proper semantic structure', () => {
      render(<PlantillaEquipoEmptyState />)
      
      // Should have proper heading structure
      const heading = screen.getByRole('heading')
      expect(heading).toBeInTheDocument()
    })

    it('error state has proper alert role', () => {
      render(<PlantillaEquipoErrorState />)
      
      const alert = screen.getByRole('alert')
      expect(alert).toBeInTheDocument()
    })
  })

  describe('Animation and Styling', () => {
    it('skeleton components have animation classes', () => {
      render(<PlantillaEquipoAccordionSkeleton />)
      
      const skeletons = document.querySelectorAll('[data-testid="skeleton"]')
      skeletons.forEach(skeleton => {
        expect(skeleton).toHaveClass('animate-pulse')
      })
    })

    it('empty state has proper styling classes', () => {
      render(<PlantillaEquipoEmptyState />)
      
      const container = document.querySelector('.text-center')
      expect(container).toBeInTheDocument()
    })

    it('error state has proper styling classes', () => {
      render(<PlantillaEquipoErrorState />)
      
      const container = screen.getByRole('alert')
      expect(container).toHaveClass('border-red-200', 'bg-red-50')
    })
  })
})
