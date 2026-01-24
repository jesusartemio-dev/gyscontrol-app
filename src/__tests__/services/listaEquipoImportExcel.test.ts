import { verificarExistenciaEquipos } from '@/lib/services/listaEquipoImportExcel'
import { getCatalogoEquipos } from '@/lib/services/catalogoEquipo'
import { getCategoriasEquipo, createCategoriaEquipo } from '@/lib/services/categoriaEquipo'
import { getProyectoEquipos } from '@/lib/services/proyectoEquipo'
import { getUnidades, createUnidad } from '@/lib/services/unidad'
import { createCatalogoEquipo } from '@/lib/services/catalogoEquipo'

// Mock the services
jest.mock('@/lib/services/catalogoEquipo', () => ({
  getCatalogoEquipos: jest.fn(),
  createCatalogoEquipo: jest.fn(),
}))

jest.mock('@/lib/services/categoriaEquipo', () => ({
  getCategoriasEquipo: jest.fn(),
  createCategoriaEquipo: jest.fn(),
}))

jest.mock('@/lib/services/proyectoEquipo', () => ({
  getProyectoEquipos: jest.fn(),
}))

jest.mock('@/lib/services/unidad', () => ({
  getUnidades: jest.fn(),
  createUnidad: jest.fn(),
}))

describe('ListaEquipoImportExcel Service', () => {
  describe('verificarExistenciaEquipos', () => {
    test('should handle items with empty category', async () => {
      // Mock dependencies
      const mockCatalogoEquipos = []
      const mockProyectoEquipos = []
      const mockCategorias = []
      const mockUnidades = [{ id: '1', nombre: 'UND' }]

      ;(getCatalogoEquipos as jest.Mock).mockResolvedValue(mockCatalogoEquipos)
      ;(getProyectoEquipos as jest.Mock).mockResolvedValue(mockProyectoEquipos)
      ;(getCategoriasEquipo as jest.Mock).mockResolvedValue(mockCategorias)
      ;(getUnidades as jest.Mock).mockResolvedValue(mockUnidades)
      
      ;(createCategoriaEquipo as jest.Mock).mockImplementation((data) => {
        const id = data.nombre === 'SIN-CATEGORIA' ? '1' : '2'
        return Promise.resolve({ id, nombre: data.nombre })
      })
      ;(createUnidad as jest.Mock).mockResolvedValue({ id: '1', nombre: 'UND' })
      ;(createCatalogoEquipo as jest.Mock).mockResolvedValue({ id: '1' })

      // Test data with empty category
      const excelItems = [
        {
          codigo: 'EQ001',
          descripcion: 'Equipo de prueba',
          categoria: '', // Empty category
          unidad: 'UND',
          marca: 'Marca',
          cantidad: 1
        },
        {
          codigo: 'EQ002',
          descripcion: 'Otro equipo',
          categoria: 'Electrónica', // Valid category
          unidad: 'UND',
          marca: 'Marca',
          cantidad: 2
        }
      ]

      // Execute
      const resumen = await verificarExistenciaEquipos(excelItems, 'proyecto-1')

      // Verify
      expect(resumen.totalItems).toBe(2)
      expect(resumen.nuevos).toBe(2)
      
      // Verify the first item has category set to SIN-CATEGORIA
      const itemWithoutCategory = resumen.items.find(item => item.codigo === 'EQ001')
      expect(itemWithoutCategory).toBeDefined()
      expect(itemWithoutCategory?.categoria).toBe('') // Excel value remains empty
      
      // Verify SIN-CATEGORIA was created
      expect(createCategoriaEquipo).toHaveBeenCalledWith({
        nombre: 'SIN-CATEGORIA',
        descripcion: 'Categoría por defecto para equipos sin clasificar'
      })

      // Verify category for second item is created
      expect(createCategoriaEquipo).toHaveBeenCalledWith({
        nombre: 'Electrónica',
        descripcion: undefined // Should not have description
      })

      // Verify units are processed correctly
      expect(createUnidad).not.toHaveBeenCalled() // UND should be found

      // Verify catalogo creation
      expect(resumen.equiposNuevosParaCatalogo.length).toBe(2)
      
      // Verify first item has SIN-CATEGORIA id
      const firstItemCatalogo = resumen.equiposNuevosParaCatalogo.find(item => item.codigo === 'EQ001')
      expect(firstItemCatalogo?.categoriaId).toBe('1')

      // Verify second item has Electrónica category (not SIN-CATEGORIA)
      const secondItemCatalogo = resumen.equiposNuevosParaCatalogo.find(item => item.codigo === 'EQ002')
      expect(secondItemCatalogo?.categoriaId).not.toBe('1')
    })
  })
})
