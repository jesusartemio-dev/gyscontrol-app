/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import ListaEstadoFlujo from '../ListaEstadoFlujo'
import { updateListaEstado } from '@/lib/services/listaEquipo'
import type { EstadoListaEquipo } from '@/types/modelos'

// ✅ Mock dependencies
jest.mock('next-auth/react')
jest.mock('sonner')
jest.mock('@/lib/services/listaEquipo')
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}))

const mockUseSession = useSession as jest.MockedFunction<typeof useSession>
const mockToast = toast as jest.Mocked<typeof toast>
const mockUpdateListaEstado = updateListaEstado as jest.MockedFunction<typeof updateListaEstado>

describe('ListaEstadoFlujo', () => {
  const mockOnUpdated = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockToast.success = jest.fn()
    mockToast.error = jest.fn()
  })

  const renderComponent = (estado: EstadoListaEquipo, listaId?: string, role = 'admin') => {
    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: '1',
          name: 'Test User',
          email: 'test@example.com',
          role: role,
        },
      },
      status: 'authenticated',
    })

    return render(
      <ListaEstadoFlujo
        estado={estado}
        listaId={listaId}
        onUpdated={mockOnUpdated}
      />
    )
  }

  describe('Estado Display', () => {
    it('should display current estado with badge and description', () => {
      renderComponent('borrador', 'lista-1')
      
      expect(screen.getByText('Borrador')).toBeInTheDocument()
      expect(screen.getByText('Lista en proceso de creación')).toBeInTheDocument()
    })

    it('should show aprobado estado with correct variant', () => {
      renderComponent('aprobado', 'lista-1')
      
      const badge = screen.getByText('Aprobado')
      expect(badge).toBeInTheDocument()
      expect(screen.getByText('Lista aprobada y lista para uso')).toBeInTheDocument()
    })

    it('should show rechazado estado with destructive variant', () => {
      renderComponent('rechazado', 'lista-1')
      
      const badge = screen.getByText('Rechazado')
      expect(badge).toBeInTheDocument()
      expect(screen.getByText('Lista rechazada, requiere correcciones')).toBeInTheDocument()
    })
  })

  describe('Estado Flow Visualization', () => {
    it('should render all estados in the flow', () => {
      renderComponent('por_revisar', 'lista-1')
      
      expect(screen.getByText('Borrador')).toBeInTheDocument()
      expect(screen.getByText('Por revisar')).toBeInTheDocument()
      expect(screen.getByText('Por cotizar')).toBeInTheDocument()
      expect(screen.getByText('Por validar')).toBeInTheDocument()
      expect(screen.getByText('Por aprobar')).toBeInTheDocument()
      expect(screen.getByText('Aprobado')).toBeInTheDocument()
      expect(screen.getByText('Rechazado')).toBeInTheDocument()
    })

    it('should highlight current estado', () => {
      renderComponent('por_validar', 'lista-1')
      
      const currentEstado = screen.getAllByText('Por validar')[0] // First one is in the badge
      expect(currentEstado).toBeInTheDocument()
    })
  })

  describe('Action Buttons - Permissions', () => {
    it('should show advance button for admin role', () => {
      renderComponent('borrador', 'lista-1', 'admin')
      
      expect(screen.getByText('Avanzar a Por revisar')).toBeInTheDocument()
    })

    it('should show advance button for proyectos role on borrador', () => {
      renderComponent('borrador', 'lista-1', 'proyectos')
      
      expect(screen.getByText('Avanzar a Por revisar')).toBeInTheDocument()
    })

    it('should not show advance button for unauthorized role', () => {
      renderComponent('borrador', 'lista-1', 'comercial')
      
      expect(screen.queryByText('Avanzar a Por revisar')).not.toBeInTheDocument()
    })

    it('should show reject button when applicable', () => {
      renderComponent('por_revisar', 'lista-1', 'coordinador')
      
      expect(screen.getByText('Rechazar')).toBeInTheDocument()
    })

    it('should show restore button for rechazado estado', () => {
      renderComponent('rechazado', 'lista-1', 'proyectos')
      
      expect(screen.getByText('Restaurar')).toBeInTheDocument()
    })
  })

  describe('Estado Changes', () => {
    it('should advance estado successfully', async () => {
      mockUpdateListaEstado.mockResolvedValue(true)
      renderComponent('borrador', 'lista-1', 'admin')
      
      const advanceButton = screen.getByText('Avanzar a Por revisar')
      fireEvent.click(advanceButton)
      
      await waitFor(() => {
        expect(mockUpdateListaEstado).toHaveBeenCalledWith('lista-1', 'por_revisar')
        expect(mockToast.success).toHaveBeenCalledWith('➡️ Estado actualizado a "Por revisar"')
        expect(mockOnUpdated).toHaveBeenCalledWith('por_revisar')
      })
    })

    it('should handle estado change error', async () => {
      mockUpdateListaEstado.mockRejectedValue(new Error('Network error'))
      renderComponent('borrador', 'lista-1', 'admin')
      
      const advanceButton = screen.getByText('Avanzar a Por revisar')
      fireEvent.click(advanceButton)
      
      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('❌ Error al cambiar el estado')
      })
    })

    it('should show loading state during estado change', async () => {
      mockUpdateListaEstado.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))
      renderComponent('borrador', 'lista-1', 'admin')
      
      const advanceButton = screen.getByText('Avanzar a Por revisar')
      fireEvent.click(advanceButton)
      
      expect(screen.getByText('Actualizando...')).toBeInTheDocument()
    })
  })

  describe('Reject Dialog', () => {
    it('should open reject dialog when reject button is clicked', () => {
      renderComponent('por_revisar', 'lista-1', 'coordinador')
      
      const rejectButton = screen.getByText('Rechazar')
      fireEvent.click(rejectButton)
      
      expect(screen.getByText('¿Deseas rechazar esta lista?')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Describe las razones del rechazo y las correcciones necesarias...')).toBeInTheDocument()
    })

    it('should require justification with minimum length', () => {
      renderComponent('por_revisar', 'lista-1', 'coordinador')
      
      const rejectButton = screen.getByText('Rechazar')
      fireEvent.click(rejectButton)
      
      const textarea = screen.getByPlaceholderText('Describe las razones del rechazo y las correcciones necesarias...')
      fireEvent.change(textarea, { target: { value: 'short' } })
      
      expect(screen.getByText('La justificación debe tener al menos 10 caracteres')).toBeInTheDocument()
    })

    it('should reject with valid justification', async () => {
      mockUpdateListaEstado.mockResolvedValue(true)
      renderComponent('por_revisar', 'lista-1', 'coordinador')
      
      const rejectButton = screen.getByText('Rechazar')
      fireEvent.click(rejectButton)
      
      const textarea = screen.getByPlaceholderText('Describe las razones del rechazo y las correcciones necesarias...')
      fireEvent.change(textarea, { target: { value: 'Esta lista necesita correcciones importantes' } })
      
      const confirmButton = screen.getByText('Sí, rechazar')
      fireEvent.click(confirmButton)
      
      await waitFor(() => {
        expect(mockUpdateListaEstado).toHaveBeenCalledWith('lista-1', 'rechazado')
        expect(mockToast.success).toHaveBeenCalledWith('❌ Lista rechazada')
      })
    })
  })

  describe('Reset Dialog', () => {
    it('should open reset dialog when restore button is clicked', () => {
      renderComponent('rechazado', 'lista-1', 'proyectos')
      
      const restoreButton = screen.getByText('Restaurar')
      fireEvent.click(restoreButton)
      
      expect(screen.getByText('¿Restaurar esta lista a "Borrador"?')).toBeInTheDocument()
      expect(screen.getByText('Consecuencias de esta acción:')).toBeInTheDocument()
    })

    it('should reset estado to borrador', async () => {
      mockUpdateListaEstado.mockResolvedValue(true)
      renderComponent('rechazado', 'lista-1', 'proyectos')
      
      const restoreButton = screen.getByText('Restaurar')
      fireEvent.click(restoreButton)
      
      const confirmButton = screen.getByText('Sí, restaurar')
      fireEvent.click(confirmButton)
      
      await waitFor(() => {
        expect(mockUpdateListaEstado).toHaveBeenCalledWith('lista-1', 'borrador')
        expect(mockToast.success).toHaveBeenCalledWith('🔄 Estado devuelto a "Borrador"')
      })
    })
  })

  describe('No Lista ID', () => {
    it('should not show action buttons when listaId is not provided', () => {
      renderComponent('borrador', undefined, 'admin')
      
      expect(screen.queryByText('Avanzar a Por revisar')).not.toBeInTheDocument()
      expect(screen.queryByText('Rechazar')).not.toBeInTheDocument()
      expect(screen.queryByText('Restaurar')).not.toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      renderComponent('borrador', 'lista-1', 'admin')
      
      const advanceButton = screen.getByText('Avanzar a Por revisar')
      expect(advanceButton).toBeInTheDocument()
      expect(advanceButton.tagName).toBe('BUTTON')
    })

    it('should disable buttons during loading', async () => {
      mockUpdateListaEstado.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))
      renderComponent('borrador', 'lista-1', 'admin')
      
      const advanceButton = screen.getByText('Avanzar a Por revisar')
      fireEvent.click(advanceButton)
      
      expect(advanceButton).toBeDisabled()
    })
  })

  describe('Responsive Design', () => {
    it('should render properly on different screen sizes', () => {
      renderComponent('por_validar', 'lista-1', 'admin')
      
      // Check that the flow visualization is scrollable
      const flowContainer = screen.getByText('Borrador').closest('.overflow-x-auto')
      expect(flowContainer).toBeInTheDocument()
    })
  })
})