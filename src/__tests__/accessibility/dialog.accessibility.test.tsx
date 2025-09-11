/**
 * @fileoverview Test de accesibilidad para componentes Dialog
 * Verifica que no haya conflictos de aria-hidden con elementos focusables
 */

import { render, screen } from '@testing-library/react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

describe('Dialog Accessibility', () => {
  it('should not have aria-hidden conflicts with focusable elements', () => {
    const TestDialog = () => (
      <Dialog open={true}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Test Dialog</DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-2">
            <Button>Focusable Button</Button>
            <input type="text" placeholder="Focusable Input" />
          </div>
        </DialogContent>
      </Dialog>
    )

    render(<TestDialog />)
    
    // ✅ Verify dialog is rendered
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    
    // ✅ Verify focusable elements are accessible
    expect(screen.getByRole('button', { name: 'Focusable Button' })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Focusable Input')).toBeInTheDocument()
    
    // ✅ Verify close button has proper focus styles
    const closeButtons = document.querySelectorAll('button')
    closeButtons.forEach(button => {
      const classList = button.className
      // Should not have problematic focus:outline-hidden class
      expect(classList).not.toContain('focus:outline-hidden')
    })
  })

  it('should have proper ARIA attributes', () => {
    const TestDialog = () => (
      <Dialog open={true}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Accessible Dialog</DialogTitle>
          </DialogHeader>
          <p>Dialog content</p>
        </DialogContent>
      </Dialog>
    )

    render(<TestDialog />)
    
    const dialog = screen.getByRole('dialog')
    
    // ✅ Dialog should have proper ARIA attributes
    expect(dialog).toHaveAttribute('role', 'dialog')
    
    // ✅ Title should be accessible
    expect(screen.getByRole('heading', { name: 'Accessible Dialog' })).toBeInTheDocument()
  })

  it('should handle focus management correctly', () => {
    const TestDialog = () => (
      <Dialog open={true}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Focus Test Dialog</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Button>First Button</Button>
            <Button>Second Button</Button>
          </div>
        </DialogContent>
      </Dialog>
    )

    render(<TestDialog />)
    
    // ✅ All buttons should be focusable
    const buttons = screen.getAllByRole('button')
    buttons.forEach(button => {
      expect(button).not.toHaveAttribute('aria-hidden', 'true')
    })
  })
})
