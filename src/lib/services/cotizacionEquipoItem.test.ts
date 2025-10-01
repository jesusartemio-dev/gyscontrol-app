import { getCotizacionEquipoItems, createCotizacionEquipoItem, updateCotizacionEquipoItem, deleteCotizacionEquipoItem } from './cotizacionEquipoItem'
import { prisma } from '@/lib/prisma'
import type { CotizacionEquipoItem } from '@/types'

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    cotizacionEquipoItem: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    }
  }
}))

const mockPrisma = prisma as jest.Mocked<typeof prisma>

const mockCotizacionEquipoItem: CotizacionEquipoItem = {
  id: '1',
  cotizacionEquipoId: 'eq1',
  catalogoEquipoId: 'cat1',
  cantidad: 2,
  precioUnitario: 150.50,
  observaciones: 'Test observaciones'
}

const mockCotizacionEquipoItemWithRelations = {
  ...mockCotizacionEquipoItem,
  catalogoEquipo: {
    id: 'cat1',
    codigo: 'EQ001',
    descripcion: 'Equipo Test',
    marca: 'Marca Test',
    precioInterno: 100,
    precioVenta: 150.50,
    categoriaId: 'categoria1',
    categoria: {
      id: 'categoria1',
      nombre: 'Categoría Test'
    }
  }
}

describe('cotizacionEquipoItem service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getCotizacionEquipoItems', () => {
    it('should fetch cotizacion equipo items successfully', async () => {
      mockPrisma.cotizacionEquipoItem.findMany.mockResolvedValue([mockCotizacionEquipoItemWithRelations])

      const result = await getCotizacionEquipoItems('eq1')

      expect(mockPrisma.cotizacionEquipoItem.findMany).toHaveBeenCalledWith({
        where: { cotizacionEquipoId: 'eq1' },
        include: {
          catalogoEquipo: {
            include: {
              categoria: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      })
      expect(result).toEqual([mockCotizacionEquipoItemWithRelations])
    })

    it('should handle database errors', async () => {
      const error = new Error('Database connection failed')
      mockPrisma.cotizacionEquipoItem.findMany.mockRejectedValue(error)

      await expect(getCotizacionEquipoItems('eq1')).rejects.toThrow('Database connection failed')
    })

    it('should return empty array when no items found', async () => {
      mockPrisma.cotizacionEquipoItem.findMany.mockResolvedValue([])

      const result = await getCotizacionEquipoItems('eq1')

      expect(result).toEqual([])
    })
  })

  describe('createCotizacionEquipoItem', () => {
    const createData = {
      cotizacionEquipoId: 'eq1',
      catalogoEquipoId: 'cat1',
      cantidad: 2,
      precioUnitario: 150.50,
      observaciones: 'Test observaciones'
    }

    it('should create cotizacion equipo item successfully', async () => {
      mockPrisma.cotizacionEquipoItem.create.mockResolvedValue(mockCotizacionEquipoItem)

      const result = await createCotizacionEquipoItem(createData)

      expect(mockPrisma.cotizacionEquipoItem.create).toHaveBeenCalledWith({
        data: createData
      })
      expect(result).toEqual(mockCotizacionEquipoItem)
    })

    it('should handle validation errors', async () => {
      const error = new Error('Validation failed')
      mockPrisma.cotizacionEquipoItem.create.mockRejectedValue(error)

      await expect(createCotizacionEquipoItem(createData)).rejects.toThrow('Validation failed')
    })

    it('should create item with default values when optional fields are missing', async () => {
      const minimalData = {
        cotizacionEquipoId: 'eq1',
        catalogoEquipoId: 'cat1',
        cantidad: 1,
        precioUnitario: 100
      }

      const expectedItem = {
        ...mockCotizacionEquipoItem,
        cantidad: 1,
        precioUnitario: 100,
        observaciones: ''
      }

      mockPrisma.cotizacionEquipoItem.create.mockResolvedValue(expectedItem)

      const result = await createCotizacionEquipoItem(minimalData)

      expect(mockPrisma.cotizacionEquipoItem.create).toHaveBeenCalledWith({
        data: minimalData
      })
      expect(result).toEqual(expectedItem)
    })

    it('should handle foreign key constraint errors', async () => {
      const error = new Error('Foreign key constraint failed')
      mockPrisma.cotizacionEquipoItem.create.mockRejectedValue(error)

      await expect(createCotizacionEquipoItem(createData)).rejects.toThrow('Foreign key constraint failed')
    })
  })

  describe('updateCotizacionEquipoItem', () => {
    const updateData = {
      cantidad: 3,
      precioUnitario: 200,
      observaciones: 'Updated observaciones'
    }

    it('should update cotizacion equipo item successfully', async () => {
      const updatedItem = {
        ...mockCotizacionEquipoItem,
        ...updateData
      }
      mockPrisma.cotizacionEquipoItem.update.mockResolvedValue(updatedItem)

      const result = await updateCotizacionEquipoItem('1', updateData)

      expect(mockPrisma.cotizacionEquipoItem.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: updateData
      })
      expect(result).toEqual(updatedItem)
    })

    it('should handle item not found error', async () => {
      const error = new Error('Record not found')
      mockPrisma.cotizacionEquipoItem.update.mockRejectedValue(error)

      await expect(updateCotizacionEquipoItem('999', updateData)).rejects.toThrow('Record not found')
    })

    it('should update only provided fields', async () => {
      const partialUpdate = { cantidad: 5 }
      const updatedItem = {
        ...mockCotizacionEquipoItem,
        cantidad: 5
      }
      mockPrisma.cotizacionEquipoItem.update.mockResolvedValue(updatedItem)

      const result = await updateCotizacionEquipoItem('1', partialUpdate)

      expect(mockPrisma.cotizacionEquipoItem.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: partialUpdate
      })
      expect(result).toEqual(updatedItem)
    })

    it('should handle validation errors on update', async () => {
      const invalidData = { cantidad: -1 }
      const error = new Error('Validation failed: cantidad must be positive')
      mockPrisma.cotizacionEquipoItem.update.mockRejectedValue(error)

      await expect(updateCotizacionEquipoItem('1', invalidData)).rejects.toThrow('Validation failed: cantidad must be positive')
    })
  })

  describe('deleteCotizacionEquipoItem', () => {
    it('should delete cotizacion equipo item successfully', async () => {
      mockPrisma.cotizacionEquipoItem.delete.mockResolvedValue(mockCotizacionEquipoItem)

      const result = await deleteCotizacionEquipoItem('1')

      expect(mockPrisma.cotizacionEquipoItem.delete).toHaveBeenCalledWith({
        where: { id: '1' }
      })
      expect(result).toEqual(mockCotizacionEquipoItem)
    })

    it('should handle item not found error', async () => {
      const error = new Error('Record not found')
      mockPrisma.cotizacionEquipoItem.delete.mockRejectedValue(error)

      await expect(deleteCotizacionEquipoItem('999')).rejects.toThrow('Record not found')
    })

    it('should handle cascade delete constraints', async () => {
      const error = new Error('Cannot delete: referenced by other records')
      mockPrisma.cotizacionEquipoItem.delete.mockRejectedValue(error)

      await expect(deleteCotizacionEquipoItem('1')).rejects.toThrow('Cannot delete: referenced by other records')
    })
  })

  describe('edge cases and error handling', () => {
    it('should handle empty string IDs', async () => {
      await expect(getCotizacionEquipoItems('')).rejects.toThrow()
    })

    it('should handle null values in create data', async () => {
      const dataWithNulls = {
        cotizacionEquipoId: 'eq1',
        catalogoEquipoId: 'cat1',
        cantidad: 1,
        precioUnitario: 100,
        observaciones: null as any
      }

      const error = new Error('Null value not allowed')
      mockPrisma.cotizacionEquipoItem.create.mockRejectedValue(error)

      await expect(createCotizacionEquipoItem(dataWithNulls)).rejects.toThrow('Null value not allowed')
    })

    it('should handle database connection timeout', async () => {
      const timeoutError = new Error('Connection timeout')
      mockPrisma.cotizacionEquipoItem.findMany.mockRejectedValue(timeoutError)

      await expect(getCotizacionEquipoItems('eq1')).rejects.toThrow('Connection timeout')
    })

    it('should handle concurrent modification conflicts', async () => {
      const conflictError = new Error('Concurrent modification detected')
      mockPrisma.cotizacionEquipoItem.update.mockRejectedValue(conflictError)

      await expect(updateCotizacionEquipoItem('1', { cantidad: 5 })).rejects.toThrow('Concurrent modification detected')
    })
  })

  describe('data integrity', () => {
    it('should maintain referential integrity on create', async () => {
      const createData = {
        cotizacionEquipoId: 'nonexistent',
        catalogoEquipoId: 'cat1',
        cantidad: 1,
        precioUnitario: 100
      }

      const error = new Error('Foreign key constraint violation')
      mockPrisma.cotizacionEquipoItem.create.mockRejectedValue(error)

      await expect(createCotizacionEquipoItem(createData)).rejects.toThrow('Foreign key constraint violation')
    })

    it('should validate numeric constraints', async () => {
      const invalidData = {
        cotizacionEquipoId: 'eq1',
        catalogoEquipoId: 'cat1',
        cantidad: 0,
        precioUnitario: -50
      }

      const error = new Error('Invalid numeric values')
      mockPrisma.cotizacionEquipoItem.create.mockRejectedValue(error)

      await expect(createCotizacionEquipoItem(invalidData)).rejects.toThrow('Invalid numeric values')
    })
  })
})
