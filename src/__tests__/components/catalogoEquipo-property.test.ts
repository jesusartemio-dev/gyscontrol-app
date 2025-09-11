/**
 * Test suite for catalogoEquipo property functionality
 * Verifies that the catalogoEquipo property works correctly in mock data
 * and that category calculations function properly
 */

import { describe, it, expect } from '@jest/globals'

// Mock data structure similar to the one in page.tsx
const mockItemWithCatalogoEquipo = {
  id: '1',
  listaId: 'lista-1',
  codigo: 'EQ-001',
  descripcion: 'Bomba centrífuga 50HP',
  catalogoEquipo: {
    id: 'cat-1',
    codigo: 'EQ-001',
    descripcion: 'Bomba centrífuga 50HP',
    categoria: {
      id: 'cat-bombas',
      nombre: 'Bombas'
    },
    unidad: {
      id: 'und-1',
      nombre: 'UND'
    },
    marca: 'Grundfos',
    precioInterno: 1200.00,
    margen: 12.5,
    precioVenta: 1350.00,
    estado: 'activo',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
    categoriaId: 'cat-bombas',
    unidadId: 'und-1'
  }
}

const mockItemWithoutCatalogoEquipo = {
  id: '2',
  listaId: 'lista-1',
  codigo: 'EQ-002',
  descripcion: 'Motor eléctrico 75HP'
  // No catalogoEquipo property
}

const mockItems = [
  mockItemWithCatalogoEquipo,
  {
    ...mockItemWithCatalogoEquipo,
    id: '3',
    catalogoEquipo: {
      ...mockItemWithCatalogoEquipo.catalogoEquipo,
      categoria: {
        id: 'cat-motores',
        nombre: 'Motores'
      }
    }
  },
  {
    ...mockItemWithCatalogoEquipo,
    id: '4',
    catalogoEquipo: {
      ...mockItemWithCatalogoEquipo.catalogoEquipo,
      categoria: {
        id: 'cat-bombas',
        nombre: 'Bombas'
      }
    }
  }
]

describe('CatalogoEquipo Property Tests', () => {
  it('should access catalogoEquipo.categoria.nombre correctly', () => {
    const categoryName = mockItemWithCatalogoEquipo.catalogoEquipo?.categoria?.nombre
    expect(categoryName).toBe('Bombas')
  })

  it('should handle missing catalogoEquipo gracefully', () => {
    const categoryName = (mockItemWithoutCatalogoEquipo as any).catalogoEquipo?.categoria?.nombre || 'Sin categoría'
    expect(categoryName).toBe('Sin categoría')
  })

  it('should calculate unique categories correctly', () => {
    const categories = [...new Set(mockItems.map(item => 
      item.catalogoEquipo?.categoria?.nombre || 'Sin categoría'
    ))]
    
    expect(categories).toContain('Bombas')
    expect(categories).toContain('Motores')
    expect(categories.length).toBe(2)
  })

  it('should count categories correctly for stats', () => {
    const categoriesCount = [...new Set(mockItems.map(item => 
      item.catalogoEquipo?.categoria?.nombre || 'Sin categoría'
    ))].length
    
    expect(categoriesCount).toBe(2)
  })

  it('should handle mixed data with and without catalogoEquipo', () => {
    const mixedItems = [...mockItems, mockItemWithoutCatalogoEquipo]
    
    const categories = [...new Set(mixedItems.map(item => 
      (item as any).catalogoEquipo?.categoria?.nombre || 'Sin categoría'
    ))]
    
    expect(categories).toContain('Bombas')
    expect(categories).toContain('Motores')
    expect(categories).toContain('Sin categoría')
    expect(categories.length).toBe(3)
  })
})
