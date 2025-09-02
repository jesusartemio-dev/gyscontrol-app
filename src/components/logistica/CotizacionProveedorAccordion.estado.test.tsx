/**
 * @fileoverview Tests para verificar actualizaciones locales de estado en CotizacionProveedorAccordion
 * @author GYS Team
 * @version 1.0.0
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { toast } from 'sonner'
import CotizacionProveedorAccordion from './CotizacionProveedorAccordion'
import type { CotizacionProveedor, EstadoCotizacionProveedor } from '@/types/modelos'

// ✅ Mock de dependencias
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => children,
}))

const mockCotizacion: CotizacionProveedor = {
  id: 'cot-001',
  solicitudId: 'sol-001',
  proveedorId: 'prov-001',
  estado: 'PENDIENTE' as EstadoCotizacionProveedor,
  fechaEnvio: new Date('2024-01-15'),
  fechaRespuesta: null,
  observaciones: 'Cotización de prueba',
  createdAt: new Date('2024-01-15'),
  updatedAt: new Date('2024-01-15'),
  proveedor: {
    id: 'prov-001',
    nombre: 'Proveedor Test',
    email: 'test@proveedor.com',
    telefono: '123456789',
    direccion: 'Dirección Test',
    contacto: 'Contacto Test',
    activo: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  items: [],
}

describe('CotizacionProveedorAccordion - Estado Updates', () => {
  const mockOnUpdate = vi.fn()
  const mockOnEstadoUpdated = vi.fn()
  const mockOnDelete = vi.fn()
  const mockOnUpdatedItem = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should update estado locally when onEstadoUpdated is provided', async () => {
    render(
      <CotizacionProveedorAccordion
        cotizacion={mockCotizacion}
        onUpdate={mockOnUpdate}
        onEstadoUpdated={mockOnEstadoUpdated}
        onDelete={mockOnDelete}
        onUpdatedItem={mockOnUpdatedItem}
      />
    )

    // ✅ Verificar estado inicial
    expect(screen.getByText('PENDIENTE')).toBeInTheDocument()

    // ✅ Abrir el accordion
    const toggleButton = screen.getByRole('button', { name: /toggle accordion/i })
    fireEvent.click(toggleButton)

    // ✅ Cambiar estado a COTIZADO
    const cotizadoButton = screen.getByRole('button', { name: /COTIZADO/i })
    fireEvent.click(cotizadoButton)

    // ✅ Verificar que se llama onEstadoUpdated en lugar de onUpdate
    await waitFor(() => {
      expect(mockOnEstadoUpdated).toHaveBeenCalledWith('cot-001', 'COTIZADO')
      expect(mockOnUpdate).not.toHaveBeenCalled()
    })

    // ✅ Verificar toast de éxito
    expect(toast.success).toHaveBeenCalledWith('✅ Estado actualizado a COTIZADO')
  })

  it('should fallback to onUpdate when onEstadoUpdated is not provided', async () => {
    render(
      <CotizacionProveedorAccordion
        cotizacion={mockCotizacion}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        onUpdatedItem={mockOnUpdatedItem}
      />
    )

    // ✅ Abrir el accordion
    const toggleButton = screen.getByRole('button', { name: /toggle accordion/i })
    fireEvent.click(toggleButton)

    // ✅ Cambiar estado a SOLICITADO
    const solicitadoButton = screen.getByRole('button', { name: /SOLICITADO/i })
    fireEvent.click(solicitadoButton)

    // ✅ Verificar que se llama onUpdate como fallback
    await waitFor(() => {
      expect(mockOnUpdate).toHaveBeenCalledWith('cot-001', { estado: 'SOLICITADO' })
    })

    // ✅ Verificar toast de éxito
    expect(toast.success).toHaveBeenCalledWith('✅ Estado actualizado a SOLICITADO')
  })

  it('should not call any handler when estado is the same', async () => {
    render(
      <CotizacionProveedorAccordion
        cotizacion={mockCotizacion}
        onUpdate={mockOnUpdate}
        onEstadoUpdated={mockOnEstadoUpdated}
        onDelete={mockOnDelete}
        onUpdatedItem={mockOnUpdatedItem}
      />
    )

    // ✅ Abrir el accordion
    const toggleButton = screen.getByRole('button', { name: /toggle accordion/i })
    fireEvent.click(toggleButton)

    // ✅ Intentar cambiar al mismo estado (PENDIENTE)
    const pendienteButton = screen.getByRole('button', { name: /PENDIENTE/i })
    fireEvent.click(pendienteButton)

    // ✅ Verificar que no se llama ningún handler
    await waitFor(() => {
      expect(mockOnEstadoUpdated).not.toHaveBeenCalled()
      expect(mockOnUpdate).not.toHaveBeenCalled()
    })
  })

  it('should update local state immediately for better UX', async () => {
    render(
      <CotizacionProveedorAccordion
        cotizacion={mockCotizacion}
        onUpdate={mockOnUpdate}
        onEstadoUpdated={mockOnEstadoUpdated}
        onDelete={mockOnDelete}
        onUpdatedItem={mockOnUpdatedItem}
      />
    )

    // ✅ Verificar estado inicial
    expect(screen.getByText('PENDIENTE')).toBeInTheDocument()

    // ✅ Abrir el accordion
    const toggleButton = screen.getByRole('button', { name: /toggle accordion/i })
    fireEvent.click(toggleButton)

    // ✅ Cambiar estado a RECHAZADO
    const rechazadoButton = screen.getByRole('button', { name: /RECHAZADO/i })
    fireEvent.click(rechazadoButton)

    // ✅ Verificar que el estado se actualiza inmediatamente en la UI
    await waitFor(() => {
      expect(screen.getByText('RECHAZADO')).toBeInTheDocument()
      expect(screen.queryByText('PENDIENTE')).not.toBeInTheDocument()
    })
  })

  it('should show all available estado options', async () => {
    render(
      <CotizacionProveedorAccordion
        cotizacion={mockCotizacion}
        onUpdate={mockOnUpdate}
        onEstadoUpdated={mockOnEstadoUpdated}
        onDelete={mockOnDelete}
        onUpdatedItem={mockOnUpdatedItem}
      />
    )

    // ✅ Abrir el accordion
    const toggleButton = screen.getByRole('button', { name: /toggle accordion/i })
    fireEvent.click(toggleButton)

    // ✅ Verificar que todos los estados están disponibles
    const estadoOptions: EstadoCotizacionProveedor[] = [
      'PENDIENTE',
      'SOLICITADO', 
      'COTIZADO',
      'RECHAZADO',
      'SELECCIONADO'
    ]

    estadoOptions.forEach(estado => {
      expect(screen.getByRole('button', { name: new RegExp(estado, 'i') })).toBeInTheDocument()
    })
  })
})