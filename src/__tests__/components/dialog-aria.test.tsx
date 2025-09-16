/**
 * ✅ Dialog Aria Hidden Prevention Tests
 * 
 * Tests para verificar que los componentes Dialog no generen warnings
 * de aria-hidden cuando se abren y manejan el foco correctamente.
 */

import React, { useState } from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

// 🔧 Mock console.warn para capturar warnings
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

// 🔧 Componente de prueba básico
function TestDialog() {
  return (
    <Dialog>
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
  
  it('should handle controlled dialog state without warnings', async () => {
    const mockOnClose = jest.fn()
    
    const { rerender } = render(
      <ControlledTestDialog isOpen={false} onClose={mockOnClose} />
    )
    
    // ✅ Verificar que el dialog no está visible inicialmente
    expect(screen.queryByTestId('controlled-dialog-content')).not.toBeInTheDocument()
    
    // ✅ Abrir el dialog
    rerender(<ControlledTestDialog isOpen={true} onClose={mockOnClose} />)
    
    // ✅ Esperar a que aparezca
    await waitFor(() => {
      expect(screen.getByTestId('controlled-dialog-content')).toBeInTheDocument()
    })
    
    // ✅ Interactuar con elementos
    const input = screen.getByTestId('controlled-input')
    fireEvent.change(input, { target: { value: 'controlled test' } })
    
    const closeButton = screen.getByTestId('controlled-button')
    fireEvent.click(closeButton)
    
    expect(mockOnClose).toHaveBeenCalled()
    
    // ✅ Verificar que no hay warnings de aria-hidden
    const controlledWarnings = warnSpy.mock.calls.filter(call => 
      call[0]?.includes?.('aria-hidden') || call[0]?.includes?.('Blocked')
    )
    
    expect(controlledWarnings).toHaveLength(0)
  })
  
  it('should handle dialog close without warnings', async () => {
    render(<TestDialog />)
    
    const trigger = screen.getByTestId('dialog-trigger')
    
    // ✅ Abrir el dialog
    fireEvent.click(trigger)
    
    // ✅ Esperar a que aparezca
    await waitFor(() => {
      expect(screen.getByTestId('dialog-content')).toBeInTheDocument()
    })
    
    // ✅ Cerrar el dialog presionando Escape
    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' })
    
    // ✅ Esperar a que desaparezca
    await waitFor(() => {
      expect(screen.queryByTestId('dialog-content')).not.toBeInTheDocument()
    })
    
    // ✅ Verificar que no hay warnings al cerrar
    const closeWarnings = warnSpy.mock.calls.filter(call => 
      call[0]?.includes?.('aria-hidden') || call[0]?.includes?.('Blocked')
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
  
  it('should maintain accessibility when dialog content changes', async () => {
    const TestDynamicDialog = () => {
      const [content, setContent] = useState('Initial content')
      
      return (
        <Dialog>
          <DialogTrigger asChild>
            <Button data-testid="dynamic-trigger">Open Dynamic Dialog</Button>
          </DialogTrigger>
          <DialogContent data-testid="dynamic-content">
            <DialogHeader>
              <DialogTitle>Dynamic Dialog</DialogTitle>
            </DialogHeader>
            <div>
              <p data-testid="dynamic-text">{content}</p>
              <Button 
                data-testid="change-content" 
                onClick={() => setContent('Updated content')}
              >
                Change Content
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )
    }
    
    render(<TestDynamicDialog />)
    
    const trigger = screen.getByTestId('dynamic-trigger')
    fireEvent.click(trigger)
    
    // ✅ Esperar a que aparezca
    await waitFor(() => {
      expect(screen.getByTestId('dynamic-content')).toBeInTheDocument()
    })
    
    // ✅ Cambiar contenido dinámicamente
    const changeButton = screen.getByTestId('change-content')
    fireEvent.click(changeButton)
    
    // ✅ Verificar que el contenido cambió
    await waitFor(() => {
      expect(screen.getByTestId('dynamic-text')).toHaveTextContent('Updated content')
    })
    
    // ✅ Verificar que no hay warnings durante cambios dinámicos
    const dynamicWarnings = warnSpy.mock.calls.filter(call => 
      call[0]?.includes?.('aria-hidden') || call[0]?.includes?.('Blocked')
    )
    
    expect(dynamicWarnings).toHaveLength(0)
  })
})
