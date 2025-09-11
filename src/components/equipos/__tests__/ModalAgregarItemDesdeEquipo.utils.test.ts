// ===================================================
// 🧪 ModalAgregarItemDesdeEquipo.utils.test.ts
// 📝 Tests: Utilidades y helpers del modal de equipos
// ✨ UX/UI: Tests para funciones de filtrado y estado
// ===================================================

import { ProyectoEquipoItem } from '@/types'

// 📊 Mock Data para pruebas
const mockItems: ProyectoEquipoItem[] = [
  {
    id: '1',
    codigo: 'EQ001',
    descripcion: 'Bomba centrífuga 10HP',
    unidad: 'UND',
    cantidad: 5,
    proyectoEquipo: {
      id: 'pe1',
      nombre: 'Sistema de Bombeo',
      proyectoId: 'proj1'
    },
    listaEquipos: []
  },
  {
    id: '2',
    codigo: 'EQ002',
    descripcion: 'Motor eléctrico 15HP',
    unidad: 'UND',
    cantidad: 3,
    proyectoEquipo: {
      id: 'pe2',
      nombre: 'Sistema Eléctrico',
      proyectoId: 'proj1'
    },
    listaEquipos: [
      { id: 'le1', cantidad: 3 } // Ya completo
    ]
  },
  {
    id: '3',
    codigo: 'EQ003',
    descripcion: 'Válvula de control 4"',
    unidad: 'UND',
    cantidad: 8,
    proyectoEquipo: {
      id: 'pe1',
      nombre: 'Sistema de Bombeo',
      proyectoId: 'proj1'
    },
    listaEquipos: [
      { id: 'le2', cantidad: 2 } // Faltan 6
    ]
  },
  {
    id: '4',
    codigo: 'EQ004',
    descripcion: 'Sensor de presión',
    unidad: 'UND',
    cantidad: 10,
    proyectoEquipo: {
      id: 'pe3',
      nombre: 'Sistema de Control',
      proyectoId: 'proj1'
    },
    listaEquipos: [
      { id: 'le3', cantidad: 5 },
      { id: 'le4', cantidad: 3 }
    ] // Faltan 2
  }
]

// 🔧 Helper Functions (extraídas del componente para testing)

/**
 * Calcula la cantidad restante de un item
 */
function getCantidadRestante(item: ProyectoEquipoItem): number {
  const cantidadUsada = item.listaEquipos?.reduce((sum, le) => sum + le.cantidad, 0) || 0
  return Math.max(0, item.cantidad - cantidadUsada)
}

/**
 * Determina si un item está completo (sin cantidad restante)
 */
function isItemCompleto(item: ProyectoEquipoItem): boolean {
  return getCantidadRestante(item) === 0
}

/**
 * Obtiene el badge de estado para un item
 */
function getStatusBadge(item: ProyectoEquipoItem): { text: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' } {
  const cantidadRestante = getCantidadRestante(item)
  
  if (cantidadRestante === 0) {
    return { text: 'Completo', variant: 'secondary' }
  }
  
  if (cantidadRestante === item.cantidad) {
    return { text: 'Disponible', variant: 'default' }
  }
  
  return { text: `Faltan ${cantidadRestante}`, variant: 'outline' }
}

/**
 * Filtra items por grupo de equipo
 */
function filterByGroup(items: ProyectoEquipoItem[], grupoSeleccionado: string): ProyectoEquipoItem[] {
  if (!grupoSeleccionado || grupoSeleccionado === 'todos') {
    return items
  }
  return items.filter(item => item.proyectoEquipo.id === grupoSeleccionado)
}

/**
 * Filtra items por término de búsqueda
 */
function filterBySearch(items: ProyectoEquipoItem[], busqueda: string): ProyectoEquipoItem[] {
  if (!busqueda.trim()) {
    return items
  }
  
  const searchTerm = busqueda.toLowerCase().trim()
  return items.filter(item => 
    item.codigo.toLowerCase().includes(searchTerm) ||
    item.descripcion.toLowerCase().includes(searchTerm)
  )
}

/**
 * Obtiene items filtrados por grupo y búsqueda
 */
function getFilteredItems(
  items: ProyectoEquipoItem[], 
  grupoSeleccionado: string, 
  busqueda: string
): ProyectoEquipoItem[] {
  let filtered = filterByGroup(items, grupoSeleccionado)
  filtered = filterBySearch(filtered, busqueda)
  return filtered
}

/**
 * Obtiene grupos únicos de equipos
 */
function getUniqueGroups(items: ProyectoEquipoItem[]): Array<{ id: string; nombre: string }> {
  const groupsMap = new Map()
  
  items.forEach(item => {
    const { id, nombre } = item.proyectoEquipo
    if (!groupsMap.has(id)) {
      groupsMap.set(id, { id, nombre })
    }
  })
  
  return Array.from(groupsMap.values())
}

/**
 * Valida si se pueden agregar los items seleccionados
 */
function validateSelectedItems(items: ProyectoEquipoItem[], selectedIds: string[]): {
  isValid: boolean
  message?: string
  availableItems: ProyectoEquipoItem[]
} {
  if (selectedIds.length === 0) {
    return {
      isValid: false,
      message: 'Debes seleccionar al menos un ítem',
      availableItems: []
    }
  }
  
  const selectedItems = items.filter(item => selectedIds.includes(item.id))
  const availableItems = selectedItems.filter(item => !isItemCompleto(item))
  
  if (availableItems.length === 0) {
    return {
      isValid: false,
      message: 'Los ítems seleccionados ya están completos',
      availableItems: []
    }
  }
  
  return {
    isValid: true,
    availableItems
  }
}

// 🧪 Tests
describe('ModalAgregarItemDesdeEquipo Utils', () => {
  
  describe('getCantidadRestante', () => {
    it('should return full quantity when no items in lists', () => {
      const result = getCantidadRestante(mockItems[0]) // Sin listaEquipos
      expect(result).toBe(5)
    })
    
    it('should return 0 when item is complete', () => {
      const result = getCantidadRestante(mockItems[1]) // 3 cantidad, 3 usados
      expect(result).toBe(0)
    })
    
    it('should return remaining quantity when partially used', () => {
      const result = getCantidadRestante(mockItems[2]) // 8 cantidad, 2 usados
      expect(result).toBe(6)
    })
    
    it('should handle multiple lista entries', () => {
      const result = getCantidadRestante(mockItems[3]) // 10 cantidad, 5+3 usados
      expect(result).toBe(2)
    })
    
    it('should never return negative values', () => {
      const overusedItem: ProyectoEquipoItem = {
        ...mockItems[0],
        cantidad: 3,
        listaEquipos: [{ id: 'le1', cantidad: 5 }] // Más de lo disponible
      }
      const result = getCantidadRestante(overusedItem)
      expect(result).toBe(0)
    })
  })
  
  describe('isItemCompleto', () => {
    it('should return false for available items', () => {
      expect(isItemCompleto(mockItems[0])).toBe(false)
    })
    
    it('should return true for complete items', () => {
      expect(isItemCompleto(mockItems[1])).toBe(true)
    })
    
    it('should return false for partially used items', () => {
      expect(isItemCompleto(mockItems[2])).toBe(false)
    })
  })
  
  describe('getStatusBadge', () => {
    it('should return "Disponible" for unused items', () => {
      const result = getStatusBadge(mockItems[0])
      expect(result).toEqual({ text: 'Disponible', variant: 'default' })
    })
    
    it('should return "Completo" for complete items', () => {
      const result = getStatusBadge(mockItems[1])
      expect(result).toEqual({ text: 'Completo', variant: 'secondary' })
    })
    
    it('should return "Faltan X" for partially used items', () => {
      const result = getStatusBadge(mockItems[2])
      expect(result).toEqual({ text: 'Faltan 6', variant: 'outline' })
    })
  })
  
  describe('filterByGroup', () => {
    it('should return all items when group is "todos"', () => {
      const result = filterByGroup(mockItems, 'todos')
      expect(result).toHaveLength(4)
    })
    
    it('should return all items when no group selected', () => {
      const result = filterByGroup(mockItems, '')
      expect(result).toHaveLength(4)
    })
    
    it('should filter by specific group', () => {
      const result = filterByGroup(mockItems, 'pe1') // Sistema de Bombeo
      expect(result).toHaveLength(2)
      expect(result.every(item => item.proyectoEquipo.id === 'pe1')).toBe(true)
    })
    
    it('should return empty array for non-existent group', () => {
      const result = filterByGroup(mockItems, 'nonexistent')
      expect(result).toHaveLength(0)
    })
  })
  
  describe('filterBySearch', () => {
    it('should return all items when search is empty', () => {
      const result = filterBySearch(mockItems, '')
      expect(result).toHaveLength(4)
    })
    
    it('should return all items when search is whitespace', () => {
      const result = filterBySearch(mockItems, '   ')
      expect(result).toHaveLength(4)
    })
    
    it('should filter by codigo (case insensitive)', () => {
      const result = filterBySearch(mockItems, 'eq001')
      expect(result).toHaveLength(1)
      expect(result[0].codigo).toBe('EQ001')
    })
    
    it('should filter by descripcion (case insensitive)', () => {
      const result = filterBySearch(mockItems, 'bomba')
      expect(result).toHaveLength(1)
      expect(result[0].descripcion).toContain('Bomba')
    })
    
    it('should filter by partial matches', () => {
      const result = filterBySearch(mockItems, 'eléctrico')
      expect(result).toHaveLength(1)
      expect(result[0].descripcion).toContain('eléctrico')
    })
    
    it('should return empty array for no matches', () => {
      const result = filterBySearch(mockItems, 'nonexistent')
      expect(result).toHaveLength(0)
    })
  })
  
  describe('getFilteredItems', () => {
    it('should apply both group and search filters', () => {
      const result = getFilteredItems(mockItems, 'pe1', 'bomba')
      expect(result).toHaveLength(1)
      expect(result[0].codigo).toBe('EQ001')
    })
    
    it('should return empty when filters dont match', () => {
      const result = getFilteredItems(mockItems, 'pe2', 'bomba')
      expect(result).toHaveLength(0)
    })
    
    it('should work with only group filter', () => {
      const result = getFilteredItems(mockItems, 'pe1', '')
      expect(result).toHaveLength(2)
    })
    
    it('should work with only search filter', () => {
      const result = getFilteredItems(mockItems, '', 'sensor')
      expect(result).toHaveLength(1)
      expect(result[0].codigo).toBe('EQ004')
    })
  })
  
  describe('getUniqueGroups', () => {
    it('should return unique groups', () => {
      const result = getUniqueGroups(mockItems)
      expect(result).toHaveLength(3)
      
      const groupIds = result.map(g => g.id)
      expect(groupIds).toContain('pe1')
      expect(groupIds).toContain('pe2')
      expect(groupIds).toContain('pe3')
    })
    
    it('should include group names', () => {
      const result = getUniqueGroups(mockItems)
      const bombeGroup = result.find(g => g.id === 'pe1')
      expect(bombeGroup?.nombre).toBe('Sistema de Bombeo')
    })
    
    it('should handle empty array', () => {
      const result = getUniqueGroups([])
      expect(result).toHaveLength(0)
    })
    
    it('should not duplicate groups', () => {
      // mockItems tiene 2 items con pe1, pero debe aparecer solo una vez
      const result = getUniqueGroups(mockItems)
      const pe1Groups = result.filter(g => g.id === 'pe1')
      expect(pe1Groups).toHaveLength(1)
    })
  })
  
  describe('validateSelectedItems', () => {
    it('should return invalid when no items selected', () => {
      const result = validateSelectedItems(mockItems, [])
      expect(result.isValid).toBe(false)
      expect(result.message).toBe('Debes seleccionar al menos un ítem')
      expect(result.availableItems).toHaveLength(0)
    })
    
    it('should return invalid when all selected items are complete', () => {
      const result = validateSelectedItems(mockItems, ['2']) // Item completo
      expect(result.isValid).toBe(false)
      expect(result.message).toBe('Los ítems seleccionados ya están completos')
      expect(result.availableItems).toHaveLength(0)
    })
    
    it('should return valid when available items selected', () => {
      const result = validateSelectedItems(mockItems, ['1', '3']) // Items disponibles
      expect(result.isValid).toBe(true)
      expect(result.message).toBeUndefined()
      expect(result.availableItems).toHaveLength(2)
    })
    
    it('should filter out complete items from selection', () => {
      const result = validateSelectedItems(mockItems, ['1', '2', '3']) // Mezcla
      expect(result.isValid).toBe(true)
      expect(result.availableItems).toHaveLength(2) // Solo 1 y 3
      expect(result.availableItems.map(i => i.id)).toEqual(['1', '3'])
    })
    
    it('should handle non-existent item IDs', () => {
      const result = validateSelectedItems(mockItems, ['nonexistent'])
      expect(result.isValid).toBe(false)
      expect(result.availableItems).toHaveLength(0)
    })
  })
  
  // 🎯 Integration Tests
  describe('Integration Tests', () => {
    it('should work together for complete workflow', () => {
      // 1. Get unique groups
      const groups = getUniqueGroups(mockItems)
      expect(groups.length).toBeGreaterThan(0)
      
      // 2. Filter by first group
      const firstGroup = groups[0]
      let filtered = filterByGroup(mockItems, firstGroup.id)
      
      // 3. Apply search
      filtered = filterBySearch(filtered, 'bomba')
      
      // 4. Check status of filtered items
      const statusBadges = filtered.map(item => getStatusBadge(item))
      expect(statusBadges.length).toBeGreaterThan(0)
      
      // 5. Validate selection
      const availableIds = filtered
        .filter(item => !isItemCompleto(item))
        .map(item => item.id)
      
      if (availableIds.length > 0) {
        const validation = validateSelectedItems(mockItems, availableIds)
        expect(validation.isValid).toBe(true)
      }
    })
    
    it('should handle edge cases gracefully', () => {
      // Empty arrays
      expect(getUniqueGroups([])).toHaveLength(0)
      expect(filterByGroup([], 'any')).toHaveLength(0)
      expect(filterBySearch([], 'any')).toHaveLength(0)
      
      // Invalid inputs
      expect(filterByGroup(mockItems, null as any)).toHaveLength(4)
      expect(filterBySearch(mockItems, null as any)).toHaveLength(4)
      
      // Validation with empty items
      const validation = validateSelectedItems([], ['any'])
      expect(validation.isValid).toBe(false)
    })
  })
  
  // 🚀 Performance Tests
  describe('Performance Tests', () => {
    it('should handle large datasets efficiently', () => {
      // Create large dataset
      const largeDataset: ProyectoEquipoItem[] = Array.from({ length: 1000 }, (_, i) => ({
        id: `item-${i}`,
        codigo: `EQ${String(i).padStart(3, '0')}`,
        descripcion: `Equipment ${i}`,
        unidad: 'UND',
        cantidad: 10,
        proyectoEquipo: {
          id: `pe-${i % 10}`, // 10 groups
          nombre: `Group ${i % 10}`,
          proyectoId: 'proj1'
        },
        listaEquipos: []
      }))
      
      const startTime = performance.now()
      
      // Test filtering operations
      const groups = getUniqueGroups(largeDataset)
      const filtered = getFilteredItems(largeDataset, groups[0].id, 'Equipment')
      const validation = validateSelectedItems(largeDataset, filtered.slice(0, 10).map(i => i.id))
      
      const endTime = performance.now()
      const executionTime = endTime - startTime
      
      // Should complete within reasonable time (< 100ms)
      expect(executionTime).toBeLessThan(100)
      expect(groups).toHaveLength(10)
      expect(filtered.length).toBeGreaterThan(0)
      expect(validation.isValid).toBe(true)
    })
  })
})
