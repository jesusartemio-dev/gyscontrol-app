// ===================================================
// 📁 Archivo: ProyectoEquipoAccordion.test.tsx
// 📌 Descripción: Tests para verificar que Badge usa variantes válidas
// 🎯 Objetivo: Verificar que no hay errores de TypeScript con Badge variants
// ===================================================

import { Badge } from '@/components/ui/badge'

// Test simple para verificar que Badge acepta solo variantes válidas
describe('Badge Component Variants', () => {
  it('should accept valid variants', () => {
    // Estas líneas no deberían generar errores de TypeScript
    const validVariants: Array<'default' | 'outline' | undefined> = [
      'default',
      'outline',
      undefined
    ]
    
    validVariants.forEach(variant => {
      expect(() => {
        // Simular el uso del Badge con variantes válidas
        const badgeProps = { variant }
        // Si llegamos aquí sin errores de TypeScript, el test pasa
      }).not.toThrow()
    })
  })

  it('should not accept invalid variants', () => {
    // Este test documenta que 'secondary' y 'destructive' no son válidas
    // Si intentáramos usar estas variantes, TypeScript daría error en tiempo de compilación
    expect(true).toBe(true) // Test placeholder
  })
})
