import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import ListaEstadoFlujoBanner from '../ListaEstadoFlujoBanner'
import { updateListaEstado } from '@/lib/services/listaEquipo'
import type { EstadoListaEquipo } from '@/types/modelos'

// 🧪 Mock dependencies
jest.mock('next-auth/react')
jest.mock('sonner')
jest.mock('@/lib/services/listaEquipo')
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>
  }
}))

const mockUseSession = useSession as jest.MockedFunction<typeof useSession>
const mockToast = toast as jest.Mocked<typeof toast>
const mockUpdateListaEstado = updateListaEstado as jest.MockedFunction<typeof updateListaEstado>

describe('ListaEstadoFlujoBanner', () => {
  const mockOnUpdated = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockToast.success = jest.fn()
    mockToast.error = jest.fn()
  })

  const renderComponent = (estado: EstadoListaEquipo, role = 'admin') => {
    mockUseSession.mockReturnValue({
      data: {
        user: { role },
        expires: ''
      },
      status: 'authenticated'
    })

    return render(
      <ListaEstadoFlujoBanner
        estado={estado}
        listaId="test-lista-id"
        onUpdated={mockOnUpdated}
      />
    )
  }

  describe('Status Display', () => {
    it('should display current status correctly', () => {
      renderComponent('por_revisar')
      
      expect(screen.getByText('Por revisar')).toBeInTheDocument()
      expect(screen.getByText('Pendiente revisión')).toBeInTheDocument()
    })

    it('should show progress indicator', () => {
      renderComponent('por_cotizar')
      
      expect(screen.getByText('3 de 7')).toBeInTheDocument()
    })

    it('should display correct badge styling for different states', () => {
      const { rerender } = renderComponent('borrador')
      expect(screen.getByText('Borrador')).toBeInTheDocument()
      
      rerender(
        <ListaEstadoFlujoBanner
          estado="aprobado"
          listaId="test-lista-id"
          onUpdated={mockOnUpdated}
        />
      )
      expect(screen.getByText('Aprobado')).toBeInTheDocument()
    })
  })

  describe('Action Buttons', () => {
    it('should show advance button when user has permission', () => {
      renderComponent('borrador', 'proyectos')
      
      expect(screen.getByText(/Avanzar a/)).toBeInTheDocument()
      expect(screen.getByText('Por revisar')).toBeInTheDocument()
    })

    it('should show reject button when user has permission', () => {
      renderComponent('por_revisar', 'coordinador')
      
      expect(screen.getByText('Rechazar')).toBeInTheDocument()
    })

    it('should show reset button for rejected state', () => {
      renderComponent('rechazado', 'proyectos')
      
      expect(screen.getByText('Restaurar')).toBeInTheDocument()
    })

    it('should not show buttons when user lacks permission', () => {
      renderComponent('por_revisar', 'colaborador')
      
      expect(screen.queryByText(/Avanzar/)).not.toBeInTheDocument()
      expect(screen.queryByText('Rechazar')).not.toBeInTheDocument()
    })
  })

  describe('State Changes', () => {
    it('should advance state successfully', async () => {
      mockUpdateListaEstado.mockResolvedValue(true)
      renderComponent('borrador', 'proyectos')
      
      const advanceButton = screen.getByText(/Avanzar a/)
      fireEvent.click(advanceButton)
      
      await waitFor(() => {
        expect(mockUpdateListaEstado).toHaveBeenCalledWith('test-lista-id', 'por_revisar')
        expect(mockToast.success).toHaveBeenCalled()
        expect(mockOnUpdated).toHaveBeenCalledWith('por_revisar')
      })
    })

    it('should handle rejection with justification', async () => {
      mockUpdateListaEstado.mockResolvedValue(true)
      renderComponent('por_revisar', 'coordinador')
      
      // Open reject dialog
      const rejectButton = screen.getByText('Rechazar')
      fireEvent.click(rejectButton)
      
      // Fill justification
      const textarea = screen.getByPlaceholderText('Describe las razones del rechazo...')
      fireEvent.change(textarea, { target: { value: 'Documentación incompleta' } })
      
      // Confirm rejection
      const confirmButton = screen.getByText('Sí, rechazar')
      fireEvent.click(confirmButton)
      
      await waitFor(() => {
        expect(mockUpdateListaEstado).toHaveBeenCalledWith('test-lista-id', 'rechazado')
        expect(mockToast.success).toHaveBeenCalled()
      })
    })

    it('should prevent rejection without sufficient justification', () => {
      renderComponent('por_revisar', 'coordinador')
      
      // Open reject dialog
      const rejectButton = screen.getByText('Rechazar')
      fireEvent.click(rejectButton)
      
      // Try to confirm without justification
      const confirmButton = screen.getByText('Sí, rechazar')
      expect(confirmButton).toBeDisabled()
      
      // Add insufficient justification
      const textarea = screen.getByPlaceholderText('Describe las razones del rechazo...')
      fireEvent.change(textarea, { target: { value: 'Corto' } })
      
      fireEvent.click(confirmButton)
      expect(mockToast.error).toHaveBeenCalledWith('❗ La justificación debe tener al menos 10 caracteres')
    })

    it('should handle reset action', async () => {
      mockUpdateListaEstado.mockResolvedValue(true)
      renderComponent('rechazado', 'proyectos')
      
      // Open reset dialog
      const resetButton = screen.getByText('Restaurar')
      fireEvent.click(resetButton)
      
      // Confirm reset
      const confirmButton = screen.getByText('Sí, restaurar')
      fireEvent.click(confirmButton)
      
      await waitFor(() => {
        expect(mockUpdateListaEstado).toHaveBeenCalledWith('test-lista-id', 'borrador')
        expect(mockToast.success).toHaveBeenCalled()
      })
    })

    it('should handle API errors gracefully', async () => {
      mockUpdateListaEstado.mockRejectedValue(new Error('API Error'))
      renderComponent('borrador', 'proyectos')
      
      const advanceButton = screen.getByText(/Avanzar a/)
      fireEvent.click(advanceButton)
      
      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('❌ Error al cambiar el estado')
      })
    })
  })

  describe('Loading States', () => {
    it('should show loading state during state change', async () => {
      mockUpdateListaEstado.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))
      renderComponent('borrador', 'proyectos')
      
      const advanceButton = screen.getByText(/Avanzar a/)
      fireEvent.click(advanceButton)
      
      expect(screen.getByText('Actualizando...')).toBeInTheDocument()
      expect(advanceButton).toBeDisabled()
    })
  })

  describe('Responsive Design', () => {
    it('should hide text on small screens', () => {
      renderComponent('borrador', 'proyectos')
      
      // Check for responsive classes
      const hiddenText = screen.getByText('Pendiente revisión')
      expect(hiddenText).toHaveClass('hidden', 'sm:inline')
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      renderComponent('por_revisar', 'coordinador')
      
      const rejectButton = screen.getByText('Rechazar')
      expect(rejectButton).toHaveAttribute('type', 'button')
    })

    it('should support keyboard navigation', () => {
      renderComponent('borrador', 'proyectos')
      
      const advanceButton = screen.getByText(/Avanzar a/)
      advanceButton.focus()
      expect(document.activeElement).toBe(advanceButton)
    })
  })

  describe('Edge Cases', () => {
    it('should handle missing listaId gracefully', () => {
      mockUseSession.mockReturnValue({
        data: { user: { role: 'admin' }, expires: '' },
        status: 'authenticated'
      })

      render(
        <ListaEstadoFlujoBanner
          estado="borrador"
          onUpdated={mockOnUpdated}
        />
      )
      
      // Should not show action buttons without listaId
      expect(screen.queryByText(/Avanzar/)).not.toBeInTheDocument()
    })

    it('should handle unauthenticated user', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated'
      })

      render(
        <ListaEstadoFlujoBanner
          estado="borrador"
          listaId="test-lista-id"
          onUpdated={mockOnUpdated}
        />
      )
      
      // Should not show action buttons for unauthenticated user
      expect(screen.queryByText(/Avanzar/)).not.toBeInTheDocument()
    })
  })
})