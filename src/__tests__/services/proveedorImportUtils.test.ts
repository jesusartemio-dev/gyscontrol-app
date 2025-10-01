// ===================================================
// 📁 Archivo: proveedorImportUtils.test.ts
// 📌 Ubicación: src/__tests__/lib/utils/proveedorImportUtils.test.ts
// 🔧 Descripción: Tests para utilidades de importación de proveedores
// 🧠 Uso: Verifica validación y procesamiento de datos de Excel
// ✍️ Autor: Senior Fullstack Developer
// 📅 Última actualización: 2025-01-15
// ===================================================

import {
  leerProveedoresDesdeExcel,
  validarProveedores,
  crearProveedoresEnBD,
  exportarProveedoresAExcel,
  type ProveedorImportado
} from '@/lib/utils/proveedorImportUtils'

// 🔧 Mock fetch for API calls
global.fetch = jest.fn()
const mockFetch = fetch as jest.MockedFunction<typeof fetch>

// 🔧 Mock XLSX for export functionality
jest.mock('xlsx', () => ({
  utils: {
    json_to_sheet: jest.fn(() => ({ '!cols': [] })),
    book_new: jest.fn(() => ({})),
    book_append_sheet: jest.fn()
  },
  writeFile: jest.fn()
}))

describe('proveedorImportUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('validarProveedores', () => {
    const existingProviders = [
      { nombre: 'Proveedor Existente', ruc: '12345678901' },
      { nombre: 'Otro Proveedor', ruc: '12345678902' }
    ]

    it('should validate providers correctly', () => {
      // ✅ Setup
      const proveedores: ProveedorImportado[] = [
        {
          nombre: 'Nuevo Proveedor',
          ruc: '12345678903',
          direccion: 'Av. Nueva 123',
          telefono: '123456789',
          correo: 'nuevo@test.com'
        },
        {
          nombre: 'Otro Nuevo',
          ruc: '12345678904'
        }
      ]

      // 📡 Execute
      const result = validarProveedores(proveedores, existingProviders)

      // ✅ Assert
      expect(result.nuevos).toHaveLength(2)
      expect(result.errores).toHaveLength(0)
      expect(result.duplicados).toHaveLength(0)
    })

    it('should detect duplicate names', () => {
      // ✅ Setup
      const proveedores: ProveedorImportado[] = [
        {
          nombre: 'Proveedor Existente', // Duplicate name
          ruc: '12345678905'
        }
      ]

      // 📡 Execute
      const result = validarProveedores(proveedores, existingProviders)

      // ✅ Assert
      expect(result.nuevos).toHaveLength(0)
      expect(result.duplicados).toHaveLength(1)
      expect(result.duplicados[0]).toBe('Proveedor Existente')
    })

    it('should detect duplicate RUCs', () => {
      // ✅ Setup
      const proveedores: ProveedorImportado[] = [
        {
          nombre: 'Proveedor Nuevo',
          ruc: '12345678901' // Duplicate RUC
        }
      ]

      // 📡 Execute
      const result = validarProveedores(proveedores, existingProviders)

      // ✅ Assert
      expect(result.nuevos).toHaveLength(0)
      expect(result.duplicados).toHaveLength(1)
      expect(result.duplicados[0]).toBe('Proveedor Nuevo')
    })

    it('should validate RUC format', () => {
      // ✅ Setup
      const proveedores: ProveedorImportado[] = [
        {
          nombre: 'Proveedor Test',
          ruc: '123' // Invalid RUC length
        }
      ]

      // 📡 Execute
      const result = validarProveedores(proveedores, existingProviders)

      // ✅ Assert
      expect(result.nuevos).toHaveLength(0)
      expect(result.errores).toHaveLength(1)
      expect(result.errores[0]).toContain('RUC inválido')
    })

    it('should validate email format', () => {
      // ✅ Setup
      const proveedores: ProveedorImportado[] = [
        {
          nombre: 'Proveedor Test',
          correo: 'invalid-email' // Invalid email
        }
      ]

      // 📡 Execute
      const result = validarProveedores(proveedores, existingProviders)

      // ✅ Assert
      expect(result.nuevos).toHaveLength(0)
      expect(result.errores).toHaveLength(1)
      expect(result.errores[0]).toContain('Correo inválido')
    })

    it('should validate phone format', () => {
      // ✅ Setup
      const proveedores: ProveedorImportado[] = [
        {
          nombre: 'Proveedor Test',
          telefono: '123' // Invalid phone (too short)
        }
      ]

      // 📡 Execute
      const result = validarProveedores(proveedores, existingProviders)

      // ✅ Assert
      expect(result.nuevos).toHaveLength(0)
      expect(result.errores).toHaveLength(1)
      expect(result.errores[0]).toContain('Teléfono inválido')
    })

    it('should reject providers without name', () => {
      // ✅ Setup
      const proveedores: ProveedorImportado[] = [
        {
          nombre: '', // Empty name
          ruc: '12345678903'
        }
      ]

      // 📡 Execute
      const result = validarProveedores(proveedores, existingProviders)

      // ✅ Assert
      expect(result.nuevos).toHaveLength(0)
      expect(result.errores).toHaveLength(1)
      expect(result.errores[0]).toContain('sin nombre válido')
    })
  })

  describe('crearProveedoresEnBD', () => {
    it('should call API to create providers', async () => {
      // ✅ Setup
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          message: '2 proveedores importados exitosamente',
          creados: 2,
          total: 2
        })
      }
      mockFetch.mockResolvedValue(mockResponse as any)

      const proveedores: ProveedorImportado[] = [
        {
          nombre: 'Proveedor 1',
          ruc: '12345678901'
        },
        {
          nombre: 'Proveedor 2',
          ruc: '12345678902'
        }
      ]

      // 📡 Execute
      const result = await crearProveedoresEnBD(proveedores)

      // ✅ Assert
      expect(mockFetch).toHaveBeenCalledWith('/api/proveedor/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ proveedores }),
      })
      expect(result.creados).toBe(2)
    })

    it('should handle API errors', async () => {
      // ✅ Setup
      const mockResponse = {
        ok: false,
        json: jest.fn().mockResolvedValue({
          error: 'Error del servidor'
        })
      }
      mockFetch.mockResolvedValue(mockResponse as any)

      const proveedores: ProveedorImportado[] = [
        { nombre: 'Test Provider' }
      ]

      // 📡 Execute & Assert
      await expect(crearProveedoresEnBD(proveedores))
        .rejects
        .toThrow('Error del servidor')
    })
  })

  describe('exportarProveedoresAExcel', () => {
    it('should export providers to Excel', () => {
      // ✅ Setup
      const XLSX = require('xlsx')
      const proveedores = [
        {
          nombre: 'Proveedor 1',
          ruc: '12345678901',
          direccion: 'Av. Test 123',
          telefono: '123456789',
          correo: 'test1@test.com'
        },
        {
          nombre: 'Proveedor 2',
          ruc: '12345678902',
          direccion: 'Av. Test 456',
          telefono: '987654321',
          correo: 'test2@test.com'
        }
      ]

      // 📡 Execute
      exportarProveedoresAExcel(proveedores)

      // ✅ Assert
      expect(XLSX.utils.json_to_sheet).toHaveBeenCalledWith([
        {
          'Nombre': 'Proveedor 1',
          'RUC': '12345678901',
          'Dirección': 'Av. Test 123',
          'Teléfono': '123456789',
          'Correo': 'test1@test.com'
        },
        {
          'Nombre': 'Proveedor 2',
          'RUC': '12345678902',
          'Dirección': 'Av. Test 456',
          'Teléfono': '987654321',
          'Correo': 'test2@test.com'
        }
      ])
      expect(XLSX.utils.book_new).toHaveBeenCalled()
      expect(XLSX.utils.book_append_sheet).toHaveBeenCalled()
      expect(XLSX.writeFile).toHaveBeenCalled()
    })
  })
})
