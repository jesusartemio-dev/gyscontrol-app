// ===================================================
// 📁 Archivo: registroHoras.test.ts
// 📌 Ubicación: src/__tests__/services
// 🔧 Descripción: Tests para servicios de registro de horas
//
// 🧠 Uso: Testing de CRUD para registros de horas trabajadas
// ===================================================

import {
  getRegistrosHoras,
  getRegistroHorasById,
  createRegistroHoras,
  updateRegistroHoras,
  deleteRegistroHoras
} from '@/lib/services/registroHoras'
import type { RegistroHoras, RegistroHorasPayload } from '@/types'

// 🔧 Mock global fetch
global.fetch = jest.fn()
const mockFetch = fetch as jest.MockedFunction<typeof fetch>

// 📋 Mock data
const mockRegistroHoras: RegistroHoras = {
  id: 'rh-001',
  proyectoId: 'proj-001',
  proyectoServicioId: 'ps-001',
  categoria: 'Instalación',
  nombreServicio: 'Instalación de equipos',
  recursoId: 'rec-001',
  recursoNombre: 'Técnico Senior',
  usuarioId: 'user-001',
  fechaTrabajo: '2024-01-15',
  horasTrabajadas: 8,
  descripcion: 'Instalación de equipos en planta',
  observaciones: 'Trabajo completado sin inconvenientes',
  aprobado: false,
  createdAt: '2024-01-15T08:00:00Z',
  updatedAt: '2024-01-15T16:00:00Z',
  proyecto: {
    id: 'proj-001',
    nombre: 'Proyecto Test',
    clienteId: 'client-001',
    comercialId: 'user-002',
    gestorId: 'user-003',
    codigo: 'PROJ-001',
    estado: 'En Ejecución',
    fechaInicio: '2024-01-01',
    totalEquiposInterno: 10000,
    totalServiciosInterno: 5000,
    totalGastosInterno: 2000,
    totalInterno: 17000,
    totalCliente: 20000,
    descuento: 0,
    grandTotal: 20000,
    totalRealEquipos: 0,
    totalRealServicios: 0,
    totalRealGastos: 0,
    totalReal: 0,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    cliente: {
      id: 'client-001',
      codigo: 'CLI-001',
      numeroSecuencia: 1,
      nombre: 'Cliente Test',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    },
    comercial: {
      id: 'user-002',
      name: 'Comercial Test',
      email: 'comercial@test.com',
      password: 'hashed',
      role: 'comercial',
      proyectosComercial: [],
      proyectosGestor: [],
      cotizaciones: [],
      ProyectoEquipos: [],
      ProyectoEquiposItems: [],
      ProyectoServicios: [],
      ProyectoServicioItems: []
    },
    gestor: {
      id: 'user-003',
      name: 'Gestor Test',
      email: 'gestor@test.com',
      password: 'hashed',
      role: 'gestor',
      proyectosComercial: [],
      proyectosGestor: [],
      cotizaciones: [],
      ProyectoEquipos: [],
      ProyectoEquiposItems: [],
      ProyectoServicios: [],
      ProyectoServicioItems: []
    },
    equipos: [],
    servicios: [],
    gastos: [],
    ListaEquipo: [],
    cotizaciones: [],
    valorizaciones: [],
    registrosHoras: [],
    cronogramas: []
  },
  proyectoServicio: {
    id: 'ps-001',
    proyectoId: 'proj-001',
    responsableId: 'user-001',
    nombre: 'Servicio de Instalación',
    categoria: 'Instalación',
    subtotalInterno: 5000,
    subtotalCliente: 6000,
    subtotalReal: 0,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    proyecto: {} as any,
    responsable: {
      id: 'user-001',
      name: 'Técnico Test',
      email: 'tecnico@test.com',
      password: 'hashed',
      role: 'colaborador',
      proyectosComercial: [],
      proyectosGestor: [],
      cotizaciones: [],
      ProyectoEquipos: [],
      ProyectoEquiposItems: [],
      ProyectoServicios: [],
      ProyectoServicioItems: []
    },
    items: []
  },
  recurso: {
    id: 'rec-001',
    nombre: 'Técnico Senior',
    costoHora: 50,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  usuario: {
    id: 'user-001',
    name: 'Técnico Test',
    email: 'tecnico@test.com'
  }
}

const mockRegistroHorasPayload: RegistroHorasPayload = {
  proyectoId: 'proj-001',
  proyectoServicioId: 'ps-001',
  categoria: 'Instalación',
  nombreServicio: 'Instalación de equipos',
  recursoId: 'rec-001',
  recursoNombre: 'Técnico Senior',
  usuarioId: 'user-001',
  fechaTrabajo: '2024-01-15',
  horasTrabajadas: 8,
  descripcion: 'Instalación de equipos en planta',
  observaciones: 'Trabajo completado sin inconvenientes',
  aprobado: false
}

// 🧹 Helper para crear mock response
const createMockResponse = (data: any, ok = true, status = 200) => ({
  ok,
  status,
  json: jest.fn().mockResolvedValue(data)
})

describe('RegistroHoras Service', () => {
  beforeEach(() => {
    mockFetch.mockClear()
  })

  describe('getRegistrosHoras', () => {
    it('should fetch all registro horas successfully', async () => {
      // ✅ Arrange
      const mockResponse = [mockRegistroHoras]
      mockFetch.mockResolvedValueOnce(
        createMockResponse(mockResponse) as any
      )

      // 📡 Act
      const result = await getRegistrosHoras()

      // 🔍 Assert
      expect(mockFetch).toHaveBeenCalledWith('/api/registro-horas')
      expect(result).toEqual(mockResponse)
    })

    it('should handle fetch error', async () => {
      // ✅ Arrange
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ error: 'Server error' }, false, 500) as any
      )

      // 📡 Act & 🔍 Assert
      await expect(getRegistrosHoras()).rejects.toThrow('Error al obtener registros de horas')
    })

    it('should handle network error', async () => {
      // ✅ Arrange
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      // 📡 Act & 🔍 Assert
      await expect(getRegistrosHoras()).rejects.toThrow('Error al obtener registros de horas')
    })
  })

  describe('getRegistroHorasById', () => {
    it('should fetch registro horas by id successfully', async () => {
      // ✅ Arrange
      const id = 'rh-001'
      mockFetch.mockResolvedValueOnce(
        createMockResponse(mockRegistroHoras) as any
      )

      // 📡 Act
      const result = await getRegistroHorasById(id)

      // 🔍 Assert
      expect(mockFetch).toHaveBeenCalledWith(`/api/registro-horas/${id}`)
      expect(result).toEqual(mockRegistroHoras)
    })

    it('should handle not found error', async () => {
      // ✅ Arrange
      const id = 'non-existent'
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ error: 'Not found' }, false, 404) as any
      )

      // 📡 Act & 🔍 Assert
      await expect(getRegistroHorasById(id)).rejects.toThrow('Error al obtener registro de horas')
    })

    it('should handle network error', async () => {
      // ✅ Arrange
      const id = 'rh-001'
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      // 📡 Act & 🔍 Assert
      await expect(getRegistroHorasById(id)).rejects.toThrow('Error al obtener registro de horas')
    })
  })

  describe('createRegistroHoras', () => {
    it('should create registro horas successfully', async () => {
      // ✅ Arrange
      mockFetch.mockResolvedValueOnce(
        createMockResponse(mockRegistroHoras, true, 201) as any
      )

      // 📡 Act
      const result = await createRegistroHoras(mockRegistroHorasPayload)

      // 🔍 Assert
      expect(mockFetch).toHaveBeenCalledWith('/api/registro-horas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(mockRegistroHorasPayload)
      })
      expect(result).toEqual(mockRegistroHoras)
    })

    it('should handle validation error', async () => {
      // ✅ Arrange
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ error: 'Validation failed' }, false, 400) as any
      )

      // 📡 Act & 🔍 Assert
      await expect(createRegistroHoras(mockRegistroHorasPayload)).rejects.toThrow('Error al crear registro de horas')
    })

    it('should handle network error', async () => {
      // ✅ Arrange
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      // 📡 Act & 🔍 Assert
      await expect(createRegistroHoras(mockRegistroHorasPayload)).rejects.toThrow('Error al crear registro de horas')
    })
  })

  describe('updateRegistroHoras', () => {
    it('should update registro horas successfully', async () => {
      // ✅ Arrange
      const id = 'rh-001'
      const updatedData = { ...mockRegistroHorasPayload, horasTrabajadas: 10 }
      const updatedRegistro = { ...mockRegistroHoras, horasTrabajadas: 10 }
      
      mockFetch.mockResolvedValueOnce(
        createMockResponse(updatedRegistro) as any
      )

      // 📡 Act
      const result = await updateRegistroHoras(id, updatedData)

      // 🔍 Assert
      expect(mockFetch).toHaveBeenCalledWith(`/api/registro-horas/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedData)
      })
      expect(result).toEqual(updatedRegistro)
    })

    it('should handle not found error', async () => {
      // ✅ Arrange
      const id = 'non-existent'
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ error: 'Not found' }, false, 404) as any
      )

      // 📡 Act & 🔍 Assert
      await expect(updateRegistroHoras(id, mockRegistroHorasPayload)).rejects.toThrow('Error al actualizar registro de horas')
    })

    it('should handle validation error', async () => {
      // ✅ Arrange
      const id = 'rh-001'
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ error: 'Validation failed' }, false, 400) as any
      )

      // 📡 Act & 🔍 Assert
      await expect(updateRegistroHoras(id, mockRegistroHorasPayload)).rejects.toThrow('Error al actualizar registro de horas')
    })

    it('should handle network error', async () => {
      // ✅ Arrange
      const id = 'rh-001'
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      // 📡 Act & 🔍 Assert
      await expect(updateRegistroHoras(id, mockRegistroHorasPayload)).rejects.toThrow('Error al actualizar registro de horas')
    })
  })

  describe('deleteRegistroHoras', () => {
    it('should delete registro horas successfully', async () => {
      // ✅ Arrange
      const id = 'rh-001'
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ success: true }, true, 200) as any
      )

      // 📡 Act
      const result = await deleteRegistroHoras(id)

      // 🔍 Assert
      expect(mockFetch).toHaveBeenCalledWith(`/api/registro-horas/${id}`, {
        method: 'DELETE'
      })
      expect(result).toEqual({ success: true })
    })

    it('should handle not found error', async () => {
      // ✅ Arrange
      const id = 'non-existent'
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ error: 'Not found' }, false, 404) as any
      )

      // 📡 Act & 🔍 Assert
      await expect(deleteRegistroHoras(id)).rejects.toThrow('Error al eliminar registro de horas')
    })

    it('should handle network error', async () => {
      // ✅ Arrange
      const id = 'rh-001'
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      // 📡 Act & 🔍 Assert
      await expect(deleteRegistroHoras(id)).rejects.toThrow('Error al eliminar registro de horas')
    })
  })

  // 🧪 Edge cases and additional scenarios
  describe('Edge Cases', () => {
    it('should handle empty response from getRegistrosHoras', async () => {
      // ✅ Arrange
      mockFetch.mockResolvedValueOnce(
        createMockResponse([]) as any
      )

      // 📡 Act
      const result = await getRegistrosHoras()

      // 🔍 Assert
      expect(result).toEqual([])
    })

    it('should handle partial data in payload', async () => {
      // ✅ Arrange
      const partialPayload = {
        proyectoId: 'proj-001',
        proyectoServicioId: 'ps-001',
        categoria: 'Instalación',
        nombreServicio: 'Instalación básica',
        recursoId: 'rec-001',
        recursoNombre: 'Técnico',
        usuarioId: 'user-001',
        fechaTrabajo: '2024-01-15',
        horasTrabajadas: 4,
        aprobado: false
      }
      
      const expectedRegistro = {
        ...mockRegistroHoras,
        nombreServicio: 'Instalación básica',
        horasTrabajadas: 4,
        descripcion: undefined,
        observaciones: undefined
      }
      
      mockFetch.mockResolvedValueOnce(
        createMockResponse(expectedRegistro, true, 201) as any
      )

      // 📡 Act
      const result = await createRegistroHoras(partialPayload)

      // 🔍 Assert
      expect(mockFetch).toHaveBeenCalledWith('/api/registro-horas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(partialPayload)
      })
      expect(result).toEqual(expectedRegistro)
    })

    it('should handle zero hours worked', async () => {
      // ✅ Arrange
      const zeroHoursPayload = {
        ...mockRegistroHorasPayload,
        horasTrabajadas: 0
      }
      
      const zeroHoursRegistro = {
        ...mockRegistroHoras,
        horasTrabajadas: 0
      }
      
      mockFetch.mockResolvedValueOnce(
        createMockResponse(zeroHoursRegistro, true, 201) as any
      )

      // 📡 Act
      const result = await createRegistroHoras(zeroHoursPayload)

      // 🔍 Assert
      expect(result).not.toBeNull()
      expect(result!.horasTrabajadas).toBe(0)
    })
  })
})
