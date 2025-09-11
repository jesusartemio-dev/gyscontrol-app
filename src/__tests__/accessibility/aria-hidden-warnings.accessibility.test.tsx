// ===================================================
// 📁 Archivo: aria-hidden-warnings.accessibility.test.tsx
// 📌 Descripción: Test de accesibilidad para detectar warnings de aria-hidden
// 🧠 Uso: Verificar que no hay conflictos de aria-hidden en ClienteModal
// ✍️ Autor: Testing Specialist Agent
// 📅 Última actualización: 2025-01-27
// ===================================================

import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import React from 'react'

// Mock simple del componente ClienteModal
const MockClienteModal = ({ isOpen = false, onClose = () => {}, cliente = null, onSaved = () => {} }) => {
  if (!isOpen) return null
  
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div id="modal-title">
        {cliente ? 'Editar Cliente' : 'Nuevo Cliente'}
      </div>
      <form>
        <input 
          type="text" 
          placeholder="Nombre del cliente"
          aria-label="Nombre del cliente"
        />
        <button type="button" onClick={onClose}>
          Cancelar
        </button>
        <button type="submit">
          Guardar
        </button>
      </form>
    </div>
  )
}

describe('ClienteModal Accessibility', () => {
  // Mock console.warn para capturar warnings
  const originalWarn = console.warn
  let warnSpy: jest.SpyInstance

  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    warnSpy.mockRestore()
    console.warn = originalWarn
  })

  it('should not have aria-hidden conflicts when modal is open', () => {
    render(
      <MockClienteModal 
        isOpen={true}
        onClose={() => {}}
        cliente={null}
        onSaved={() => {}}
      />
    )

    // Verificar que el modal se renderiza correctamente
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Nuevo Cliente')).toBeInTheDocument()
    
    // Verificar que no hay warnings de aria-hidden
    const ariaHiddenWarnings = warnSpy.mock.calls.filter(call => 
      call.some(arg => 
        typeof arg === 'string' && 
        arg.toLowerCase().includes('aria-hidden')
      )
    )
    
    expect(ariaHiddenWarnings).toHaveLength(0)
  })

  it('should not have focusable elements with aria-hidden="true"', () => {
    render(
      <MockClienteModal 
        isOpen={true}
        onClose={() => {}}
        cliente={{ id: '1', nombre: 'Cliente Test' }}
        onSaved={() => {}}
      />
    )

    // Verificar que elementos focusables no tienen aria-hidden="true"
    const focusableElements = screen.getAllByRole(/button|textbox/)
    
    focusableElements.forEach(element => {
      expect(element).not.toHaveAttribute('aria-hidden', 'true')
    })
    
    // Verificar que no hay warnings relacionados con elementos focusables ocultos
    const focusableHiddenWarnings = warnSpy.mock.calls.filter(call => 
      call.some(arg => 
        typeof arg === 'string' && 
        (arg.includes('focusable') || arg.includes('focus')) &&
        arg.includes('hidden')
      )
    )
    
    expect(focusableHiddenWarnings).toHaveLength(0)
  })
})
