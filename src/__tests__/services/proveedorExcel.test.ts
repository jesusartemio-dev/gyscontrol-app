// ===================================================
// 📁 Archivo: proveedorExcel.test.ts
// 📌 Ubicación: src/lib/utils/__tests__/proveedorExcel.test.ts
// 🔧 Descripción: Tests para utilidades de exportación de proveedores a Excel
// 🧠 Uso: Jest para server-side utilities
// ✍️ Autor: Senior Fullstack Developer
// 📅 Última actualización: 2025-01-15
// ===================================================

import { exportarProveedoresAExcel } from '../proveedorExcel'
import * as XLSX from 'xlsx'
import type { Proveedor } from '@/types'

// ✅ Mock XLSX
jest.mock('xlsx', () => ({
  utils: {
    json_to_sheet: jest.fn(),
    book_new: jest.fn(),
    book_append_sheet: jest.fn()
  },
  write: jest.fn(),
  writeFile: jest.fn()
}))

// ✅ Mock global URL.createObjectURL and document
Object.defineProperty(global, 'URL', {
  value: {
    createObjectURL: jest.fn(() => 'mock-blob-url'),
    revokeObjectURL: jest.fn()
  }
})

Object.defineProperty(global, 'document', {
  value: {
    createElement: jest.fn(() => ({
      href: '',
      download: '',
      click: jest.fn(),
      style: { display: '' }
    })),
    body: {
      appendChild: jest.fn(),
      removeChild: jest.fn()
    }
  }
})

const mockProveedores: Proveedor[] = [
  {
    id: '1',
    nombre: 'Proveedor Test 1',
    ruc: '12345678901',
    direccion: 'Dirección Test 1',
    telefono: '123456789',
    correo: 'test1@example.com',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-02')
  },
  {
    id: '2',
    nombre: 'Proveedor Test 2',
    ruc: '10987654321',
    direccion: 'Dirección Test 2',
    telefono: '987654321',
    correo: 'test2@example.com',
    createdAt: new Date('2024-01-03'),
    updatedAt: new Date('2024-01-04')
  }
]

describe('proveedorExcel', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('exportarProveedoresAExcel', () => {
    it('should export providers to Excel with correct data mapping', () => {
      const mockWorksheet = { '!cols': [] }
      const mockWorkbook = {}
      
      ;(XLSX.utils.json_to_sheet as jest.Mock).mockReturnValue(mockWorksheet)
      ;(XLSX.utils.book_new as jest.Mock).mockReturnValue(mockWorkbook)
      ;(XLSX.write as jest.Mock).mockReturnValue(new ArrayBuffer(8))

      exportarProveedoresAExcel(mockProveedores)

      // ✅ Verify data mapping
      expect(XLSX.utils.json_to_sheet).toHaveBeenCalledWith([
        {
          'Nombre': 'Proveedor Test 1',
          'RUC': '12345678901',
          'Dirección': 'Dirección Test 1',
          'Teléfono': '123456789',
          'Correo': 'test1@example.com',
          'Fecha Creación': '01/01/2024',
          'Última Actualización': '02/01/2024'
        },
        {
          'Nombre': 'Proveedor Test 2',
          'RUC': '10987654321',
          'Dirección': 'Dirección Test 2',
          'Teléfono': '987654321',
          'Correo': 'test2@example.com',
          'Fecha Creación': '03/01/2024',
          'Última Actualización': '04/01/2024'
        }
      ])

      // ✅ Verify worksheet column configuration
      expect(mockWorksheet['!cols']).toEqual([
        { wch: 30 }, // Nombre
        { wch: 15 }, // RUC
        { wch: 40 }, // Dirección
        { wch: 15 }, // Teléfono
        { wch: 25 }, // Correo
        { wch: 18 }, // Fecha Creación
        { wch: 20 }  // Última Actualización
      ])

      // ✅ Verify workbook creation
      expect(XLSX.utils.book_new).toHaveBeenCalled()
      expect(XLSX.utils.book_append_sheet).toHaveBeenCalledWith(
        mockWorkbook,
        mockWorksheet,
        'Proveedores'
      )

      // ✅ Verify file generation
      expect(XLSX.write).toHaveBeenCalledWith(mockWorkbook, {
        bookType: 'xlsx',
        type: 'array'
      })
    })

    it('should handle empty providers array', () => {
      const mockWorksheet = { '!cols': [] }
      const mockWorkbook = {}
      
      ;(XLSX.utils.json_to_sheet as jest.Mock).mockReturnValue(mockWorksheet)
      ;(XLSX.utils.book_new as jest.Mock).mockReturnValue(mockWorkbook)
      ;(XLSX.write as jest.Mock).mockReturnValue(new ArrayBuffer(8))

      exportarProveedoresAExcel([])

      expect(XLSX.utils.json_to_sheet).toHaveBeenCalledWith([])
      expect(XLSX.utils.book_new).toHaveBeenCalled()
      expect(XLSX.utils.book_append_sheet).toHaveBeenCalled()
    })

    it('should create download link with correct filename format', () => {
      const mockElement = {
        href: '',
        download: '',
        click: jest.fn(),
        style: { display: '' }
      }
      
      ;(document.createElement as jest.Mock).mockReturnValue(mockElement)
      ;(XLSX.utils.json_to_sheet as jest.Mock).mockReturnValue({ '!cols': [] })
      ;(XLSX.utils.book_new as jest.Mock).mockReturnValue({})
      ;(XLSX.write as jest.Mock).mockReturnValue(new ArrayBuffer(8))

      // ✅ Mock Date to ensure consistent filename
      const mockDate = new Date('2024-01-15T10:30:00Z')
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any)

      exportarProveedoresAExcel(mockProveedores)

      // ✅ Verify filename format
      expect(mockElement.download).toMatch(/^proveedores_\d{8}_\d{6}\.xlsx$/)
      expect(mockElement.click).toHaveBeenCalled()
      expect(document.body.appendChild).toHaveBeenCalledWith(mockElement)
      expect(document.body.removeChild).toHaveBeenCalledWith(mockElement)

      jest.restoreAllMocks()
    })

    it('should handle providers with missing optional fields', () => {
      const providersWithMissingFields: Partial<Proveedor>[] = [
        {
          id: '1',
          nombre: 'Proveedor Incompleto',
          ruc: '12345678901',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-02')
          // Missing direccion, telefono, correo
        }
      ]

      const mockWorksheet = { '!cols': [] }
      ;(XLSX.utils.json_to_sheet as jest.Mock).mockReturnValue(mockWorksheet)
      ;(XLSX.utils.book_new as jest.Mock).mockReturnValue({})
      ;(XLSX.write as jest.Mock).mockReturnValue(new ArrayBuffer(8))

      exportarProveedoresAExcel(providersWithMissingFields as Proveedor[])

      expect(XLSX.utils.json_to_sheet).toHaveBeenCalledWith([
        {
          'Nombre': 'Proveedor Incompleto',
          'RUC': '12345678901',
          'Dirección': undefined,
          'Teléfono': undefined,
          'Correo': undefined,
          'Fecha Creación': '01/01/2024',
          'Última Actualización': '02/01/2024'
        }
      ])
    })

    it('should format dates correctly', () => {
      const providerWithSpecificDate: Proveedor = {
        id: '1',
        nombre: 'Test Provider',
        ruc: '12345678901',
        direccion: 'Test Address',
        telefono: '123456789',
        correo: 'test@example.com',
        createdAt: new Date('2024-12-25T15:30:45Z'),
        updatedAt: new Date('2024-12-31T23:59:59Z')
      }

      ;(XLSX.utils.json_to_sheet as jest.Mock).mockReturnValue({ '!cols': [] })
      ;(XLSX.utils.book_new as jest.Mock).mockReturnValue({})
      ;(XLSX.write as jest.Mock).mockReturnValue(new ArrayBuffer(8))

      exportarProveedoresAExcel([providerWithSpecificDate])

      const expectedData = (XLSX.utils.json_to_sheet as jest.Mock).mock.calls[0][0][0]
      expect(expectedData['Fecha Creación']).toBe('25/12/2024')
      expect(expectedData['Última Actualización']).toBe('31/12/2024')
    })
  })
})
