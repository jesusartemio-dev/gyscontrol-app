// 🧪 Test para validar que EstadoEquipoItem incluye los valores correctos
// 📌 Verifica que las comparaciones de estado en EquiposTableWrapper sean válidas

import type { EstadoEquipoItem } from '@/types/modelos'

describe('EstadoEquipoItem Type Validation', () => {
  it('✅ should include disponible, en_uso, and mantenimiento values', () => {
    // ✅ Estas asignaciones deben compilar sin errores
    const disponible: EstadoEquipoItem = 'disponible'
    const enUso: EstadoEquipoItem = 'en_uso'
    const mantenimiento: EstadoEquipoItem = 'mantenimiento'
    
    // ✅ También debe incluir los valores originales
    const pendiente: EstadoEquipoItem = 'pendiente'
    const enLista: EstadoEquipoItem = 'en_lista'
    const reemplazado: EstadoEquipoItem = 'reemplazado'
    const descartado: EstadoEquipoItem = 'descartado'
    
    expect(disponible).toBe('disponible')
    expect(enUso).toBe('en_uso')
    expect(mantenimiento).toBe('mantenimiento')
    expect(pendiente).toBe('pendiente')
    expect(enLista).toBe('en_lista')
    expect(reemplazado).toBe('reemplazado')
    expect(descartado).toBe('descartado')
  })
  
  it('✅ should allow comparisons used in EquiposTableWrapper', () => {
    const estado: EstadoEquipoItem = 'disponible'
    
    // ✅ Estas comparaciones deben ser válidas (sin errores TS2367)
    const isDisponible = estado === 'disponible'
    const isEnUso = estado === 'en_uso'
    const isMantenimiento = estado === 'mantenimiento'
    
    expect(isDisponible).toBe(true)
    expect(isEnUso).toBe(false)
    expect(isMantenimiento).toBe(false)
  })
  
  it('✅ should work with switch statements', () => {
    const testEstado = (estado: EstadoEquipoItem): string => {
      switch (estado) {
        case 'disponible':
          return 'Disponible'
        case 'en_uso':
          return 'En Uso'
        case 'mantenimiento':
          return 'Mantenimiento'
        case 'pendiente':
          return 'Pendiente'
        case 'en_lista':
          return 'En Lista'
        case 'reemplazado':
          return 'Reemplazado'
        case 'descartado':
          return 'Descartado'
        default:
          return 'Desconocido'
      }
    }
    
    expect(testEstado('disponible')).toBe('Disponible')
    expect(testEstado('en_uso')).toBe('En Uso')
    expect(testEstado('mantenimiento')).toBe('Mantenimiento')
  })
})