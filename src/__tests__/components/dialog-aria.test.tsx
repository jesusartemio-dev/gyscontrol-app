/**
 * 🧪 Tests para Dialog - Prevención de conflictos aria-hidden
 * 
 * Verifica que el Dialog no genere warnings de "Blocked aria-hidden"
 * y maneje correctamente la accesibilidad.
 */

import React, { useState } from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

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

// 🔧 Componente de prueba
function TestDialog() {
  const [open, setOpen] = useState(false)
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="dialog-trigger">Open Dialog</Button>
      </DialogTrigger>
      <DialogContent data-testid="dialog-content">
        <DialogHeader>
          <DialogTitle>Test Dialog</DialogTitle>
        </DialogHeader>
        <div>
          <input data-testid="dialog-input" placeholder="Test input" />
          <Button data-testid="dialog-button">Test Button</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// 🔧 Componente de prueba controlado
function ControlledTestDialog({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent data-testid="controlled-dialog-content">
        <DialogHeader>
          <DialogTitle>Controlled Dialog</DialogTitle>
        </DialogHeader>
        <div>
          <input data-testid="controlled-input" placeholder="Controlled input" />
          <Button data-testid="controlled-button" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

describe('Dialog - Aria Hidden Prevention', () => {
  it('should not generate aria-hidden warnings when opened', async () => {
    render(<TestDialog />)
    
    const trigger = screen.getByTestId('dialog-trigger')
    
    // ✅ Abrir el dialog
    fireEvent.click(trigger)
    
    // ✅ Esperar a que el contenido aparezca
    await waitFor(() => {
      expect(screen.getByTestId('dialog-content')).toBeInTheDocument()
    })
    
    // ✅ Verificar que no se generaron warnings de aria-hidden
    const ariaHiddenWarnings = warnSpy.mock.calls.filter(call => 
      call[0]?.includes?.('aria-hidden') || 
      call[0]?.includes?.('Blocked')
    )
    
    expect(ariaHiddenWarnings).toHaveLength(0)
  })
  
  it('should handle focus correctly without aria-hidden conflicts', async () => {
    render(<TestDialog />)
    
    const trigger = screen.getByTestId('dialog-trigger')
    
    // ✅ Abrir el dialog
    fireEvent.click(trigger)
    
    // ✅ Esperar a que el contenido aparezca
    await waitFor(() => {
      expect(screen.getByTestId('dialog-content')).toBeInTheDocument()
    })
    
    // ✅ Interactuar con elementos focusables dentro del dialog
    const input = screen.getByTestId('dialog-input')
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'test' } })
    
    const button = screen.getByTestId('dialog-button')
    fireEvent.focus(button)
    
    // ✅ Verificar que no hay warnings relacionados con foco y aria-hidden
    const focusWarnings = warnSpy.mock.calls.filter(call => 
      (call[0]?.includes?.('aria-hidden') && call[0]?.includes?.('focus')) ||
      call[0]?.includes?.('Blocked aria-hidden')
    )
    
    expect(focusWarnings).toHaveLength(0)
  })
  
  it('should apply safe radix configuration', async () => {
    render(<TestDialog />)
    
    const trigger = screen.getByTestId('dialog-trigger')
    
    // ✅ Abrir el dialog
    fireEvent.click(trigger)
    
    // ✅ Esperar a que el contenido aparezca
    await waitFor(() => {
      expect(screen.getByTestId('dialog-content')).toBeInTheDocument()
    })
    
    // ✅ Verificar que el contenido tiene los atributos correctos
    const content = screen.getByTestId('dialog-content')
    expect(content).toHaveAttribute('data-slot', 'dialog-content')
    
    // ✅ Verificar que no hay conflictos de aria-hidden
    expect(warnSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('Blocked aria-hidden')
    )
  })
  
  it('should handle controlled dialog without aria-hidden conflicts', async () => {
    const mockOnClose = jest.fn()
    
    const { rerender } = render(
      <ControlledTestDialog isOpen={false} onClose={mockOnClose} />
    )
    
    // ✅ El dialog no debería estar visible inicialmente
    expect(screen.queryByTestId('controlled-dialog-content')).not.toBeInTheDocument()
    
    // ✅ Abrir el dialog
    rerender(<ControlledTestDialog isOpen={true} onClose={mockOnClose} />)
    
    // ✅ Esperar a que el contenido aparezca
    await waitFor(() => {
      expect(screen.getByTestId('controlled-dialog-content')).toBeInTheDocument()
    })
    
    // ✅ Interactuar con elementos dentro del dialog
    const input = screen.getByTestId('controlled-input')
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'controlled test' } })
    
    // ✅ Verificar que no hay warnings de aria-hidden
    const ariaWarnings = warnSpy.mock.calls.filter(call => 
      call[0]?.includes?.('aria-hidden') || call[0]?.includes?.('Blocked')
    )
    
    expect(ariaWarnings).toHaveLength(0)
  })
  
  it('should handle dialog close without aria-hidden warnings', async () => {
    render(<TestDialog />)
    
    const trigger = screen.getByTestId('dialog-trigger')
    
    // ✅ Abrir el dialog
    fireEvent.click(trigger)
    
    await waitFor(() => {
      expect(screen.getByTestId('dialog-content')).toBeInTheDocument()
    })
    
    // ✅ Cerrar el dialog usando Escape
    fireEvent.keyDown(document, { key: 'Escape' })
    
    await waitFor(() => {
      expect(screen.queryByTestId('dialog-content')).not.toBeInTheDocument()
    })
    
    // ✅ Verificar que no hay warnings durante el cierre
    const closeWarnings = warnSpy.mock.calls.filter(call => 
      call[0]?.includes?.('aria-hidden')
    )
    
    expect(closeWarnings).toHaveLength(0)
  })
  
  it('should handle multiple dialogs without conflicts', async () => {
    const mockOnClose1 = jest.fn()
    const mockOnClose2 = jest.fn()
    
    render(
      <div>
        <ControlledTestDialog isOpen={true} onClose={mockOnClose1} />
        <Dialog open={true} onOpenChange={mockOnClose2}>
          <DialogContent data-testid="second-dialog-content">
            <DialogHeader>
              <DialogTitle>Second Dialog</DialogTitle>
            </DialogHeader>
            <input data-testid="second-input" placeholder="Second input" />
          </DialogContent>
        </Dialog>
      </div>
    )
    
    // ✅ Esperar a que ambos dialogs aparezcan
    await waitFor(() => {
      expect(screen.getByTestId('controlled-dialog-content')).toBeInTheDocument()
      expect(screen.getByTestId('second-dialog-content')).toBeInTheDocument()
    })
    
    // ✅ Interactuar con elementos en ambos dialogs
    const input1 = screen.getByTestId('controlled-input')
    const input2 = screen.getByTestId('second-input')
    
    fireEvent.focus(input1)
    fireEvent.focus(input2)
    
    // ✅ Verificar que no hay warnings de aria-hidden
    const ariaWarnings = warnSpy.mock.calls.filter(call => 
      call[0]?.includes?.('aria-hidden') || call[0]?.includes?.('Blocked')
    )
    
    expect(ariaWarnings).toHaveLength(0)
  })
})
