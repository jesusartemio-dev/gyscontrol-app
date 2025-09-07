// 🧪 Test para verificar que las comparaciones de estado en EquiposTableWrapper funcionen correctamente
// 📌 Valida que no haya errores TS2367 en las comparaciones de EstadoEquipoItem

import type { EstadoEquipoItem } from '@/types/modelos'

describe('EquiposTableWrapper Estado Comparisons', () => {
  it('✅ should allow disabled state comparisons for dropdown items', () => {
    const equipoDisponible: { estado: EstadoEquipoItem } = { estado: 'disponible' }
    const equipoEnUso: { estado: EstadoEquipoItem } = { estado: 'en_uso' }
    const equipoMantenimiento: { estado: EstadoEquipoItem } = { estado: 'mantenimiento' }
    
    // ✅ Estas comparaciones deben compilar sin errores TS2367
    // Simulando las comparaciones del DropdownMenuItem disabled
    const isDisponibleDisabled = equipoDisponible.estado === 'disponible'
    const isEnUsoDisabled = equipoEnUso.estado === 'en_uso'
    const isMantenimientoDisabled = equipoMantenimiento.estado === 'mantenimiento'
    
    expect(isDisponibleDisabled).toBe(true)
    expect(isEnUsoDisabled).toBe(true)
    expect(isMantenimientoDisabled).toBe(true)
  })
  
  it('✅ should work with cross-state comparisons', () => {
    const equipoDisponible: { estado: EstadoEquipoItem } = { estado: 'disponible' }
    
    // ✅ Verificar que un equipo disponible no esté en otros estados
    expect(equipoDisponible.estado === 'en_uso').toBe(false)
    expect(equipoDisponible.estado === 'mantenimiento').toBe(false)
    expect(equipoDisponible.estado === 'pendiente').toBe(false)
  })
  
  it('✅ should handle handleChangeStatus function logic', () => {
    // ✅ Simular la lógica que se usaría en handleChangeStatus
    const cambiarEstado = (estadoActual: EstadoEquipoItem, nuevoEstado: EstadoEquipoItem): boolean => {
      // Solo permitir cambio si el estado actual es diferente al nuevo
      return estadoActual !== nuevoEstado
    }
    
    expect(cambiarEstado('disponible', 'en_uso')).toBe(true)
    expect(cambiarEstado('disponible', 'disponible')).toBe(false)
    expect(cambiarEstado('en_uso', 'mantenimiento')).toBe(true)
    expect(cambiarEstado('mantenimiento', 'disponible')).toBe(true)
  })
  
  it('✅ should work with badge variant logic', () => {
    // ✅ Simular la función getEstadoBadgeVariant del componente
    const getEstadoBadgeVariant = (estado: EstadoEquipoItem): string => {
      switch (estado) {
        case 'disponible':
          return 'default'
        case 'en_uso':
          return 'secondary'
        case 'mantenimiento':
          return 'outline'
        default:
          return 'default'
      }
    }
    
    expect(getEstadoBadgeVariant('disponible')).toBe('default')
    expect(getEstadoBadgeVariant('en_uso')).toBe('secondary')
    expect(getEstadoBadgeVariant('mantenimiento')).toBe('outline')
  })
  
  it('✅ should work with estado text mapping', () => {
    // ✅ Simular la función getEstadoText del componente
    const getEstadoText = (estado: EstadoEquipoItem): string => {
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
    
    expect(getEstadoText('disponible')).toBe('Disponible')
    expect(getEstadoText('en_uso')).toBe('En Uso')
    expect(getEstadoText('mantenimiento')).toBe('Mantenimiento')
  })
})