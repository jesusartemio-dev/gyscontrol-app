// ===================================================
// 📁 Archivo: fechas.test.ts
// 📌 Ubicación: src/app/api/lista-equipo/__tests__/fechas.test.ts
// 🔧 Descripción: Tests para APIs de fechas de seguimiento en ListaEquipo
//
// 🧠 Uso: Validar endpoints y lógica de fechas automáticas
// ✍️ Autor: Sistema GYS
// 📅 Última actualización: 2025-01-20
// ===================================================

import { vi, describe, it, expect, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST, PUT } from '../route'
import { GET as GETById, PUT as PUTById } from '../[id]/route'

// 🎯 Mocks
const mockPrisma = {
  listaEquipo: {
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn()
  }
}

const mockGetServerSession = vi.fn()

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma
}))

vi.mock('next-auth', () => ({
  getServerSession: mockGetServerSession
}))

// Mocks ya definidos arriba

describe('🧪 API ListaEquipo - Funcionalidad de Fechas', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@gys.com',
    role: 'COMERCIAL'
  }

  const mockListaEquipo = {
    id: 'lista-123',
    nombre: 'Lista de Prueba',
    proyectoId: 'proyecto-123',
    usuarioId: 'user-123',
    estado: 'borrador',
    fechaNecesaria: new Date('2025-02-01'),
    fechaEnvioRevision: null,
    fechaValidacion: null,
    fechaAprobacionRevision: null,
    fechaEnvioLogistica: null,
    fechaInicioCotizacion: null,
    fechaFinCotizacion: null,
    fechaAprobacionFinal: null,
    createdAt: new Date('2025-01-20'),
    updatedAt: new Date('2025-01-20')
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetServerSession.mockResolvedValue({ user: mockUser } as any)
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-01-20T10:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('📝 POST /api/lista-equipo', () => {
    it('✅ debe crear lista con fechaNecesaria', async () => {
      const requestBody = {
        nombre: 'Nueva Lista',
        proyectoId: 'proyecto-123',
        fechaNecesaria: '2025-02-15T00:00:00.000Z'
      }

      mockPrisma.listaEquipo.create.mockResolvedValue({
        ...mockListaEquipo,
        fechaNecesaria: new Date('2025-02-15')
      })

      const request = new NextRequest('http://localhost/api/lista-equipo', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(mockPrisma.listaEquipo.create).toHaveBeenCalledWith({
        data: {
          nombre: 'Nueva Lista',
          proyectoId: 'proyecto-123',
          usuarioId: 'user-123',
          fechaNecesaria: new Date('2025-02-15T00:00:00.000Z')
        }
      })
    })

    it('✅ debe crear lista sin fechaNecesaria', async () => {
      const requestBody = {
        nombre: 'Lista Sin Fecha',
        proyectoId: 'proyecto-123'
      }

      mockPrisma.listaEquipo.create.mockResolvedValue(mockListaEquipo)

      const request = new NextRequest('http://localhost/api/lista-equipo', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      })

      const response = await POST(request)

      expect(response.status).toBe(201)
      expect(mockPrisma.listaEquipo.create).toHaveBeenCalledWith({
        data: {
          nombre: 'Lista Sin Fecha',
          proyectoId: 'proyecto-123',
          usuarioId: 'user-123'
        }
      })
    })

    it('❌ debe validar formato de fechaNecesaria', async () => {
      const requestBody = {
        nombre: 'Lista con Fecha Inválida',
        proyectoId: 'proyecto-123',
        fechaNecesaria: 'fecha-invalida'
      }

      const request = new NextRequest('http://localhost/api/lista-equipo', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
    })
  })

  describe('🔄 PUT /api/lista-equipo/[id]', () => {
    it('✅ debe actualizar fechaNecesaria', async () => {
      const requestBody = {
        fechaNecesaria: '2025-03-01T00:00:00.000Z'
      }

      mockPrisma.listaEquipo.findUnique.mockResolvedValue(mockListaEquipo)
      mockPrisma.listaEquipo.update.mockResolvedValue({
        ...mockListaEquipo,
        fechaNecesaria: new Date('2025-03-01')
      })

      const request = new NextRequest('http://localhost/api/lista-equipo/lista-123', {
        method: 'PUT',
        body: JSON.stringify(requestBody)
      })

      const response = await PUTById(request, { params: { id: 'lista-123' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(mockPrisma.listaEquipo.update).toHaveBeenCalledWith({
        where: { id: 'lista-123' },
        data: {
          fechaNecesaria: new Date('2025-03-01T00:00:00.000Z'),
          updatedAt: expect.any(Date)
        }
      })
    })

    it('✅ debe actualizar estado y establecer fechas automáticas', async () => {
      const requestBody = {
        estado: 'revision'
      }

      mockPrisma.listaEquipo.findUnique.mockResolvedValue(mockListaEquipo)
      mockPrisma.listaEquipo.update.mockResolvedValue({
        ...mockListaEquipo,
        estado: 'revision',
        fechaEnvioRevision: new Date('2025-01-20T10:00:00Z')
      })

      const request = new NextRequest('http://localhost/api/lista-equipo/lista-123', {
        method: 'PUT',
        body: JSON.stringify(requestBody)
      })

      const response = await PUTById(request, { params: { id: 'lista-123' } })

      expect(response.status).toBe(200)
      expect(mockPrisma.listaEquipo.update).toHaveBeenCalledWith({
        where: { id: 'lista-123' },
        data: {
          estado: 'revision',
          fechaEnvioRevision: new Date('2025-01-20T10:00:00Z'),
          updatedAt: expect.any(Date)
        }
      })
    })

    it('✅ debe establecer fechaValidacion al cambiar a validada', async () => {
      const requestBody = {
        estado: 'validada'
      }

      const listaEnRevision = {
        ...mockListaEquipo,
        estado: 'revision',
        fechaEnvioRevision: new Date('2025-01-19')
      }

      mockPrisma.listaEquipo.findUnique.mockResolvedValue(listaEnRevision)
      mockPrisma.listaEquipo.update.mockResolvedValue({
        ...listaEnRevision,
        estado: 'validada',
        fechaValidacion: new Date('2025-01-20T10:00:00Z')
      })

      const request = new NextRequest('http://localhost/api/lista-equipo/lista-123', {
        method: 'PUT',
        body: JSON.stringify(requestBody)
      })

      const response = await PUTById(request, { params: { id: 'lista-123' } })

      expect(mockPrisma.listaEquipo.update).toHaveBeenCalledWith({
        where: { id: 'lista-123' },
        data: {
          estado: 'validada',
          fechaValidacion: new Date('2025-01-20T10:00:00Z'),
          updatedAt: expect.any(Date)
        }
      })
    })

    it('✅ debe establecer fechaInicioCotizacion al cambiar a cotizacion', async () => {
      const requestBody = {
        estado: 'cotizacion'
      }

      const listaAprobada = {
        ...mockListaEquipo,
        estado: 'aprobada_revision',
        fechaAprobacionRevision: new Date('2025-01-19')
      }

      mockPrisma.listaEquipo.findUnique.mockResolvedValue(listaAprobada)
      mockPrisma.listaEquipo.update.mockResolvedValue({
        ...listaAprobada,
        estado: 'cotizacion',
        fechaInicioCotizacion: new Date('2025-01-20T10:00:00Z')
      })

      const request = new NextRequest('http://localhost/api/lista-equipo/lista-123', {
        method: 'PUT',
        body: JSON.stringify(requestBody)
      })

      const response = await PUTById(request, { params: { id: 'lista-123' } })

      expect(mockPrisma.listaEquipo.update).toHaveBeenCalledWith({
        where: { id: 'lista-123' },
        data: {
          estado: 'cotizacion',
          fechaInicioCotizacion: new Date('2025-01-20T10:00:00Z'),
          updatedAt: expect.any(Date)
        }
      })
    })

    it('✅ debe establecer fechaFinCotizacion al cambiar a cotizada', async () => {
      const requestBody = {
        estado: 'cotizada'
      }

      const listaEnCotizacion = {
        ...mockListaEquipo,
        estado: 'cotizacion',
        fechaInicioCotizacion: new Date('2025-01-18')
      }

      mockPrisma.listaEquipo.findUnique.mockResolvedValue(listaEnCotizacion)
      mockPrisma.listaEquipo.update.mockResolvedValue({
        ...listaEnCotizacion,
        estado: 'cotizada',
        fechaFinCotizacion: new Date('2025-01-20T10:00:00Z')
      })

      const request = new NextRequest('http://localhost/api/lista-equipo/lista-123', {
        method: 'PUT',
        body: JSON.stringify(requestBody)
      })

      const response = await PUTById(request, { params: { id: 'lista-123' } })

      expect(mockPrisma.listaEquipo.update).toHaveBeenCalledWith({
        where: { id: 'lista-123' },
        data: {
          estado: 'cotizada',
          fechaFinCotizacion: new Date('2025-01-20T10:00:00Z'),
          updatedAt: expect.any(Date)
        }
      })
    })

    it('✅ debe establecer fechaAprobacionFinal al cambiar a aprobada', async () => {
      const requestBody = {
        estado: 'aprobada'
      }

      const listaCotizada = {
        ...mockListaEquipo,
        estado: 'cotizada',
        fechaFinCotizacion: new Date('2025-01-19')
      }

      mockPrisma.listaEquipo.findUnique.mockResolvedValue(listaCotizada)
      mockPrisma.listaEquipo.update.mockResolvedValue({
        ...listaCotizada,
        estado: 'aprobada',
        fechaAprobacionFinal: new Date('2025-01-20T10:00:00Z')
      })

      const request = new NextRequest('http://localhost/api/lista-equipo/lista-123', {
        method: 'PUT',
        body: JSON.stringify(requestBody)
      })

      const response = await PUTById(request, { params: { id: 'lista-123' } })

      expect(mockPrisma.listaEquipo.update).toHaveBeenCalledWith({
        where: { id: 'lista-123' },
        data: {
          estado: 'aprobada',
          fechaAprobacionFinal: new Date('2025-01-20T10:00:00Z'),
          updatedAt: expect.any(Date)
        }
      })
    })

    it('❌ debe manejar lista no encontrada', async () => {
      mockPrisma.listaEquipo.findUnique.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/lista-equipo/inexistente', {
        method: 'PUT',
        body: JSON.stringify({ estado: 'revision' })
      })

      const response = await PUTById(request, { params: { id: 'inexistente' } })

      expect(response.status).toBe(404)
    })
  })

  describe('📊 GET /api/lista-equipo/[id]', () => {
    it('✅ debe retornar lista con todas las fechas', async () => {
      const listaCompleta = {
        ...mockListaEquipo,
        fechaEnvioRevision: new Date('2025-01-15'),
        fechaValidacion: new Date('2025-01-16'),
        fechaAprobacionRevision: new Date('2025-01-17'),
        fechaEnvioLogistica: new Date('2025-01-18'),
        fechaInicioCotizacion: new Date('2025-01-19'),
        fechaFinCotizacion: new Date('2025-01-20'),
        fechaAprobacionFinal: new Date('2025-01-21')
      }

      mockPrisma.listaEquipo.findUnique.mockResolvedValue(listaCompleta)

      const request = new NextRequest('http://localhost/api/lista-equipo/lista-123')
      const response = await GETById(request, { params: { id: 'lista-123' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toMatchObject({
        id: 'lista-123',
        fechaNecesaria: expect.any(String),
        fechaEnvioRevision: expect.any(String),
        fechaValidacion: expect.any(String),
        fechaAprobacionRevision: expect.any(String),
        fechaEnvioLogistica: expect.any(String),
        fechaInicioCotizacion: expect.any(String),
        fechaFinCotizacion: expect.any(String),
        fechaAprobacionFinal: expect.any(String)
      })
    })
  })

  describe('🔐 Autorización', () => {
    it('❌ debe rechazar usuarios no autenticados', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/lista-equipo', {
        method: 'POST',
        body: JSON.stringify({ nombre: 'Test' })
      })

      const response = await POST(request)

      expect(response.status).toBe(401)
    })

    it('❌ debe rechazar usuarios sin permisos', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { ...mockUser, role: 'COLABORADOR' }
      } as any)

      const request = new NextRequest('http://localhost/api/lista-equipo', {
        method: 'POST',
        body: JSON.stringify({ nombre: 'Test' })
      })

      const response = await POST(request)

      expect(response.status).toBe(403)
    })
  })

  describe('🛡️ Validación de datos', () => {
    it('❌ debe validar campos requeridos', async () => {
      const request = new NextRequest('http://localhost/api/lista-equipo', {
        method: 'POST',
        body: JSON.stringify({})
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
    })

    it('❌ debe validar formato de fecha', async () => {
      const requestBody = {
        fechaNecesaria: 'no-es-una-fecha'
      }

      const request = new NextRequest('http://localhost/api/lista-equipo/lista-123', {
        method: 'PUT',
        body: JSON.stringify(requestBody)
      })

      const response = await PUTById(request, { params: { id: 'lista-123' } })

      expect(response.status).toBe(400)
    })
  })
})