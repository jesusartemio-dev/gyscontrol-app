/**
 * 🧪 Tests para ConfirmDialog - Componente de confirmación
 * 
 * Verifica funcionalidad básica, prop disabled y patrones de uso
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ConfirmDialog from '@/components/ConfirmDialog'

// 🔧 Mock de componentes UI
jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open, onOpenChange }: any) => 
    open ? <div role="dialog" data-testid="dialog">{children}</div> : null,
  DialogTrigger: ({ children, asChild }: any) => 
    asChild ? children : <div>{children}</div>,
  DialogContent: ({ children }: any) => 
    <div data-testid="dialog-content">{children}</div>,
  DialogHeader: ({ children }: any) => 
    <div data-testid="dialog-header">{children}</div>,
  DialogTitle: ({ children }: any) => 
    <h2 data-testid="dialog-title">{children}</h2>,
  DialogDescription: ({ children }: any) => 
    <p data-testid="dialog-description">{children}</p>,
  DialogFooter: ({ children }: any) => 
    <div data-testid="dialog-footer">{children}</div>,
}))

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, variant, type, ...props }: any) => (
    <button 
      onClick={onClick} 
      disabled={disabled} 
      className={variant === 'destructive' ? 'bg-destructive' : ''}
      type={type}
      {...props}
    >
      {children}
    </button>
  ),
}))

jest.mock('@radix-ui/react-dialog', () => ({
  DialogClose: ({ children, asChild }: any) => 
    asChild ? children : <div>{children}</div>,
}))

// 🔧 Mock de console.warn para capturar warnings
const originalWarn = console.warn
let warnSpy: jest.SpyInstance

beforeEach(() => {
  warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
  warnSpy.mockRestore()
})

afterAll(() => {
  console.warn = originalWarn
})

describe('ConfirmDialog', () => {
  const mockOnConfirm = jest.fn()
  const mockOnOpenChange = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('🧪 External Control Pattern', () => {
    const defaultProps = {
      title: 'Confirmar acción',
      description: '¿Estás seguro de que deseas continuar?',
      onConfirm: mockOnConfirm,
      open: true,
      onOpenChange: mockOnOpenChange,
    }

    it('should render dialog with title and description', () => {
      render(<ConfirmDialog {...defaultProps} />)
      
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText('Confirmar acción')).toBeInTheDocument()
      expect(screen.getByText('¿Estás seguro de que deseas continuar?')).toBeInTheDocument()
    })

    it('should render custom button texts', () => {
      render(
        <ConfirmDialog 
          {...defaultProps} 
          confirmText="Eliminar"
          cancelText="Cancelar operación"
        />
      )
      
      expect(screen.getByRole('button', { name: 'Eliminar' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Cancelar operación' })).toBeInTheDocument()
    })

    it('should call onConfirm when confirm button is clicked', async () => {
      const user = userEvent.setup()
      render(<ConfirmDialog {...defaultProps} />)
      
      const confirmButton = screen.getByRole('button', { name: 'Confirmar' })
      await user.click(confirmButton)
      
      expect(mockOnConfirm).toHaveBeenCalledTimes(1)
      expect(mockOnOpenChange).toHaveBeenCalledWith(false)
    })

    it('should call onOpenChange when cancel button is clicked', async () => {
      const user = userEvent.setup()
      render(<ConfirmDialog {...defaultProps} />)
      
      const cancelButton = screen.getByRole('button', { name: 'Cancelar' })
      await user.click(cancelButton)
      
      expect(mockOnConfirm).not.toHaveBeenCalled()
      expect(mockOnOpenChange).toHaveBeenCalledWith(false)
    })

    it('should disable confirm button when disabled prop is true', () => {
      render(<ConfirmDialog {...defaultProps} disabled={true} />)
      
      const confirmButton = screen.getByRole('button', { name: 'Confirmar' })
      expect(confirmButton).toBeDisabled()
    })

    it('should enable confirm button when disabled prop is false', () => {
      render(<ConfirmDialog {...defaultProps} disabled={false} />)
      
      const confirmButton = screen.getByRole('button', { name: 'Confirmar' })
      expect(confirmButton).toBeEnabled()
    })

    it('should not call onConfirm when disabled button is clicked', async () => {
      const user = userEvent.setup()
      render(<ConfirmDialog {...defaultProps} disabled={true} />)
      
      const confirmButton = screen.getByRole('button', { name: 'Confirmar' })
      
      // Try to click disabled button
      await user.click(confirmButton)
      
      expect(mockOnConfirm).not.toHaveBeenCalled()
    })

    it('should render JSX description correctly', () => {
      const jsxDescription = (
        <div>
          <span>Proveedor: </span>
          <strong>Test Provider</strong>
        </div>
      )
      
      render(
        <ConfirmDialog 
          {...defaultProps} 
          description={jsxDescription}
        />
      )
      
      expect(screen.getByText('Proveedor:')).toBeInTheDocument()
      expect(screen.getByText('Test Provider')).toBeInTheDocument()
    })

    it('should apply destructive variant by default', () => {
      render(<ConfirmDialog {...defaultProps} />)
      
      const confirmButton = screen.getByRole('button', { name: 'Confirmar' })
      expect(confirmButton).toHaveClass('bg-destructive')
    })

    it('should apply custom variant', () => {
      render(<ConfirmDialog {...defaultProps} variant="default" />)
      
      const confirmButton = screen.getByRole('button', { name: 'Confirmar' })
      expect(confirmButton).not.toHaveClass('bg-destructive')
    })
  })

  describe('🧪 Trigger Pattern', () => {
    const triggerProps = {
      title: 'Eliminar elemento',
      description: 'Esta acción no se puede deshacer',
      onConfirm: mockOnConfirm,
      trigger: <button>Eliminar</button>
    }

    it('should render trigger button', () => {
      render(<ConfirmDialog {...triggerProps} />)
      
      expect(screen.getByRole('button', { name: 'Eliminar' })).toBeInTheDocument()
    })

    it('should open dialog when trigger is clicked', async () => {
      const user = userEvent.setup()
      render(<ConfirmDialog {...triggerProps} />)
      
      const triggerButton = screen.getByRole('button', { name: 'Eliminar' })
      await user.click(triggerButton)
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
        expect(screen.getByText('Eliminar elemento')).toBeInTheDocument()
      })
    })

    it('should disable confirm button in trigger pattern when disabled', async () => {
      const user = userEvent.setup()
      render(<ConfirmDialog {...triggerProps} disabled={true} />)
      
      const triggerButton = screen.getByRole('button', { name: 'Eliminar' })
      await user.click(triggerButton)
      
      await waitFor(() => {
        const confirmButton = screen.getByRole('button', { name: 'Confirmar' })
        expect(confirmButton).toBeDisabled()
      })
    })
  })

  describe('🧪 Accessibility', () => {
    const defaultProps = {
      title: 'Confirmar acción',
      description: '¿Estás seguro?',
      onConfirm: mockOnConfirm,
      open: true,
      onOpenChange: mockOnOpenChange,
    }

    it('should have proper ARIA attributes', () => {
      render(<ConfirmDialog {...defaultProps} />)
      
      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveAttribute('aria-labelledby')
      expect(dialog).toHaveAttribute('aria-describedby')
    })

    it('should handle keyboard navigation', async () => {
      const user = userEvent.setup()
      render(<ConfirmDialog {...defaultProps} />)
      
      // Tab should move between buttons
      await user.tab()
      expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveFocus()
      
      await user.tab()
      expect(screen.getByRole('button', { name: 'Confirmar' })).toHaveFocus()
    })

    it('should close on Escape key', async () => {
      const user = userEvent.setup()
      render(<ConfirmDialog {...defaultProps} />)
      
      await user.keyboard('{Escape}')
      
      expect(mockOnOpenChange).toHaveBeenCalledWith(false)
    })
  })

  describe('🧪 Error Handling', () => {
    it('should not crash with invalid props', () => {
      expect(() => {
        render(
          <ConfirmDialog 
            title=""
            description=""
            onConfirm={() => {}}
            open={true}
            onOpenChange={() => {}}
          />
        )
      }).not.toThrow()
    })

    it('should handle async onConfirm without issues', async () => {
      const asyncOnConfirm = jest.fn().mockResolvedValue(undefined)
      const user = userEvent.setup()
      
      render(
        <ConfirmDialog 
          title="Test"
          description="Test description"
          onConfirm={asyncOnConfirm}
          open={true}
          onOpenChange={mockOnOpenChange}
        />
      )
      
      const confirmButton = screen.getByRole('button', { name: 'Confirmar' })
      await user.click(confirmButton)
      
      expect(asyncOnConfirm).toHaveBeenCalledTimes(1)
    })
  })
})