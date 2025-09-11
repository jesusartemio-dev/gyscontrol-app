/**
 * 🧪 Tests para DropdownMenu - Prevención de conflictos aria-hidden
 * 
 * Verifica que el DropdownMenu no genere warnings de "Blocked aria-hidden"
 * y maneje correctamente la accesibilidad.
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
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



describe('DropdownMenu - Aria Hidden Prevention', () => {
  it('should render dropdown menu without aria-hidden warnings', async () => {
    const { container } = render(
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button data-testid="dropdown-trigger">Open Menu</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent data-testid="dropdown-content">
          <DropdownMenuItem data-testid="dropdown-item-1">Item 1</DropdownMenuItem>
          <DropdownMenuItem data-testid="dropdown-item-2">Item 2</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )

    const trigger = screen.getByTestId('dropdown-trigger')
    expect(trigger).toBeInTheDocument()

    // 🔍 Verificar que no hay warnings de aria-hidden
    expect(warnSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('aria-hidden')
    )
  })
  
  it('should handle focus correctly without aria-hidden conflicts', async () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button data-testid="dropdown-trigger">Open Menu</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent data-testid="dropdown-content">
          <DropdownMenuItem data-testid="menu-item-1">Item 1</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
    
    const trigger = screen.getByTestId('dropdown-trigger')
    
    // ✅ Simular interacciones de foco
    fireEvent.focus(trigger)
    fireEvent.blur(trigger)
    
    // ✅ Verificar que no hay warnings relacionados con aria-hidden
    expect(warnSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('aria-hidden')
    )
  })
  
  it('should apply safe Radix configurations', () => {
    const { container } = render(
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button data-testid="dropdown-trigger">Open Menu</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent data-testid="dropdown-content">
          <DropdownMenuItem>Item 1</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
    
    const trigger = screen.getByTestId('dropdown-trigger')
    
    // ✅ Verificar que el trigger tiene los atributos correctos
    expect(trigger).toHaveAttribute('data-slot', 'dropdown-menu-trigger')
    
    // ✅ Verificar que no se generaron warnings durante la renderización
    expect(warnSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('aria-hidden')
    )
  })
  
  it('should handle multiple dropdowns without conflicts', () => {
    render(
      <div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button data-testid="dropdown-trigger">First Menu</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>First Item</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button data-testid="dropdown-trigger-2">Second Menu</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent data-testid="dropdown-content-2">
            <DropdownMenuItem data-testid="menu-item-3">
              Item 3
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    )
    
    // ✅ Verificar que ambos triggers están presentes
    const trigger1 = screen.getByTestId('dropdown-trigger')
    const trigger2 = screen.getByTestId('dropdown-trigger-2')
    
    expect(trigger1).toBeInTheDocument()
    expect(trigger2).toBeInTheDocument()
    
    // ✅ Verificar que no hay warnings de aria-hidden
    expect(warnSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('aria-hidden')
    )
  })
  
  it('should handle complex interactions without warnings', () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button data-testid="dropdown-trigger">Open Menu</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Item 1</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
    
    const trigger = screen.getByTestId('dropdown-trigger')
    
    // ✅ Simular múltiples interacciones
    fireEvent.focus(trigger)
    fireEvent.keyDown(trigger, { key: 'Enter' })
    fireEvent.keyDown(trigger, { key: 'Escape' })
    fireEvent.blur(trigger)
    
    // ✅ Verificar que no se generaron warnings
    expect(warnSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('aria-hidden')
    )
  })
})
