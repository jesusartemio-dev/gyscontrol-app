/**
 * @fileoverview Tests for Cliente Import Utilities
 * @author GYS Team
 * @created 2024
 */

import * as XLSX from 'xlsx'
import { 
  leerClientesDesdeExcel, 
  validarClientes, 
  crearClientesEnBD,
  isValidEmail,
  type ClienteImportado 
} from './clienteImportUtils'

// ✅ Mock dependencies
global.fetch = jest.fn()
const mockFetch = fetch as jest.MockedFunction<typeof fetch>

jest.mock('xlsx')
const mockXLSX = XLSX as jest.Mocked<typeof XLSX>

// ✅ Mock data
const mockWorkbook = {
  SheetNames: ['Clientes'],
  Sheets: {
    Clientes: {}
  }
}

const validExcelData = [
  {
    Nombre: 'Cliente Test 1',
    RUC: '20123456789',
    Dirección: 'Av. Test 123',
    Teléfono: '987654321',
    Correo: 'test1@example.com'
  },
  {
    Nombre: 'Cliente Test 2',
    RUC: '20987654321',
    Dirección: 'Jr. Test 456',
    Teléfono: '123456789',
    Correo: 'test2@example.com'
  }
]

const invalidExcelData = [
  {
    Nombre: '', // Invalid: empty name
    RUC: '123', // Invalid: short RUC
    Dirección: 'Av. Test 123',
    Teléfono: '987654321',
    Correo: 'invalid-email' // Invalid: bad email format
  },
  {
    Nombre: 'Cliente Valid',
    RUC: '20123456789',
    Dirección: 'Av. Valid 456',
    Teléfono: '987654321',
    Correo: 'valid@example.com'
  }
]

const expectedValidClientes: ClienteImportado[] = [
  {
    nombre: 'Cliente Test 1',
    ruc: '20123456789',
    direccion: 'Av. Test 123',
    telefono: '987654321',
    correo: 'test1@example.com'
  },
  {
    nombre: 'Cliente Test 2',
    ruc: '20987654321',
    direccion: 'Jr. Test 456',
    telefono: '123456789',
    correo: 'test2@example.com'
  }
]

describe('clienteImportUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // ✅ Email validation tests
  describe('isValidEmail', () => {
    it('should validate correct email formats', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'test+tag@example.org',
        'user123@test-domain.com'
      ]
      
      validEmails.forEach(email => {
        expect(isValidEmail(email)).toBe(true)
      })
    })

    it('should reject invalid email formats', () => {
      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'test@',
        'test..test@example.com',
        'test@example',
        ''
      ]
      
      invalidEmails.forEach(email => {
        expect(isValidEmail(email)).toBe(false)
      })
    })

    it('should handle edge cases', () => {
      expect(isValidEmail('a@b.co')).toBe(true) // Minimum valid email
      expect(isValidEmail('test@example.museum')).toBe(true) // Long TLD
      expect(isValidEmail('test@sub.domain.com')).toBe(true) // Subdomain
    })
  })

  // ✅ Excel reading tests
  describe('leerClientesDesdeExcel', () => {
    beforeEach(() => {
      mockXLSX.read.mockReturnValue(mockWorkbook)
      mockXLSX.utils.sheet_to_json.mockReturnValue(validExcelData)
    })

    it('should read valid Excel file and return cliente data', async () => {
      const file = new File(['test content'], 'clientes.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })
      
      const result = await leerClientesDesdeExcel(file)
      
      expect(result).toEqual(expectedValidClientes)
      expect(mockXLSX.read).toHaveBeenCalled()
      expect(mockXLSX.utils.sheet_to_json).toHaveBeenCalledWith(mockWorkbook.Sheets.Clientes)
    })

    it('should handle Excel files with missing columns', async () => {
      const incompleteData = [
        {
          Nombre: 'Cliente Incompleto',
          RUC: '20123456789'
          // Missing other fields
        }
      ]
      
      mockXLSX.utils.sheet_to_json.mockReturnValue(incompleteData)
      
      const file = new File(['test content'], 'clientes.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })
      
      const result = await leerClientesDesdeExcel(file)
      
      expect(result).toEqual([{
        nombre: 'Cliente Incompleto',
        ruc: '20123456789',
        direccion: '',
        telefono: '',
        correo: ''
      }])
    })

    it('should handle empty Excel file', async () => {
      mockXLSX.utils.sheet_to_json.mockReturnValue([])
      
      const file = new File(['test content'], 'clientes.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })
      
      const result = await leerClientesDesdeExcel(file)
      
      expect(result).toEqual([])
    })

    it('should handle file reading errors', async () => {
      mockXLSX.read.mockImplementation(() => {
        throw new Error('File reading failed')
      })
      
      const file = new File(['invalid content'], 'clientes.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })
      
      await expect(leerClientesDesdeExcel(file)).rejects.toThrow('File reading failed')
    })
  })

  // ✅ Validation tests
  describe('validarClientes', () => {
    it('should validate correct cliente data', () => {
      const result = validarClientes(expectedValidClientes)
      
      expect(result.validos).toEqual(expectedValidClientes)
      expect(result.errores).toEqual([])
    })

    it('should identify validation errors', () => {
      const invalidClientes: ClienteImportado[] = [
        {
          nombre: '', // Invalid: empty name
          ruc: '123', // Invalid: short RUC
          direccion: 'Av. Test 123',
          telefono: '987654321',
          correo: 'invalid-email' // Invalid: bad email
        },
        {
          nombre: 'Cliente Valid',
          ruc: '20123456789',
          direccion: 'Av. Valid 456',
          telefono: '987654321',
          correo: 'valid@example.com'
        }
      ]
      
      const result = validarClientes(invalidClientes)
      
      expect(result.validos).toHaveLength(1)
      expect(result.validos[0].nombre).toBe('Cliente Valid')
      expect(result.errores).toContain('Fila 1: Nombre es requerido')
      expect(result.errores).toContain('Fila 1: RUC debe tener 11 dígitos')
      expect(result.errores).toContain('Fila 1: Correo electrónico inválido')
    })

    it('should handle clientes with optional fields', () => {
      const clientesWithOptionalFields: ClienteImportado[] = [
        {
          nombre: 'Cliente Mínimo',
          ruc: '',
          direccion: '',
          telefono: '',
          correo: ''
        }
      ]
      
      const result = validarClientes(clientesWithOptionalFields)
      
      expect(result.validos).toHaveLength(1)
      expect(result.errores).toEqual([])
    })

    it('should validate RUC format correctly', () => {
      const clientesWithRUC: ClienteImportado[] = [
        {
          nombre: 'Cliente RUC Válido',
          ruc: '20123456789', // Valid 11-digit RUC
          direccion: 'Av. Test 123',
          telefono: '987654321',
          correo: 'test@example.com'
        },
        {
          nombre: 'Cliente RUC Inválido',
          ruc: '123456', // Invalid short RUC
          direccion: 'Av. Test 456',
          telefono: '987654321',
          correo: 'test2@example.com'
        }
      ]
      
      const result = validarClientes(clientesWithRUC)
      
      expect(result.validos).toHaveLength(1)
      expect(result.validos[0].ruc).toBe('20123456789')
      expect(result.errores).toContain('Fila 2: RUC debe tener 11 dígitos')
    })

    it('should handle empty array', () => {
      const result = validarClientes([])
      
      expect(result.validos).toEqual([])
      expect(result.errores).toEqual([])
    })
  })

  // ✅ Database creation tests
  describe('crearClientesEnBD', () => {
    it('should successfully create clientes in database', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          message: 'Clientes importados exitosamente',
          count: 2
        })
      }
      
      mockFetch.mockResolvedValue(mockResponse as any)
      
      await expect(crearClientesEnBD(expectedValidClientes)).resolves.not.toThrow()
      
      expect(mockFetch).toHaveBeenCalledWith('/api/cliente/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ clientes: expectedValidClientes })
      })
    })

    it('should handle API errors', async () => {
      const mockResponse = {
        ok: false,
        json: jest.fn().mockResolvedValue({
          error: 'Database error'
        })
      }
      
      mockFetch.mockResolvedValue(mockResponse as any)
      
      await expect(crearClientesEnBD(expectedValidClientes))
        .rejects.toThrow('Database error')
    })

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))
      
      await expect(crearClientesEnBD(expectedValidClientes))
        .rejects.toThrow('Network error')
    })

    it('should handle empty clientes array', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          message: 'No clientes to import',
          count: 0
        })
      }
      
      mockFetch.mockResolvedValue(mockResponse as any)
      
      await expect(crearClientesEnBD([])).resolves.not.toThrow()
      
      expect(mockFetch).toHaveBeenCalledWith('/api/cliente/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ clientes: [] })
      })
    })

    it('should handle malformed API response', async () => {
      const mockResponse = {
        ok: false,
        json: jest.fn().mockResolvedValue({})
      }
      
      mockFetch.mockResolvedValue(mockResponse as any)
      
      await expect(crearClientesEnBD(expectedValidClientes))
        .rejects.toThrow('Error desconocido')
    })
  })

  // ✅ Integration tests
  describe('Integration Tests', () => {
    it('should handle complete import workflow', async () => {
      // Setup Excel reading
      mockXLSX.read.mockReturnValue(mockWorkbook)
      mockXLSX.utils.sheet_to_json.mockReturnValue(validExcelData)
      
      // Setup API response
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          message: 'Clientes importados exitosamente',
          count: 2
        })
      }
      mockFetch.mockResolvedValue(mockResponse as any)
      
      // Create file
      const file = new File(['test content'], 'clientes.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })
      
      // Execute workflow
      const clientesLeidos = await leerClientesDesdeExcel(file)
      const { validos, errores } = validarClientes(clientesLeidos)
      
      expect(errores).toHaveLength(0)
      expect(validos).toHaveLength(2)
      
      await expect(crearClientesEnBD(validos)).resolves.not.toThrow()
    })

    it('should handle workflow with validation errors', async () => {
      // Setup Excel reading with invalid data
      mockXLSX.read.mockReturnValue(mockWorkbook)
      mockXLSX.utils.sheet_to_json.mockReturnValue(invalidExcelData)
      
      const file = new File(['test content'], 'clientes.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })
      
      // Execute workflow
      const clientesLeidos = await leerClientesDesdeExcel(file)
      const { validos, errores } = validarClientes(clientesLeidos)
      
      expect(errores.length).toBeGreaterThan(0)
      expect(validos).toHaveLength(1) // Only one valid cliente
      expect(validos[0].nombre).toBe('Cliente Valid')
    })
  })
})
