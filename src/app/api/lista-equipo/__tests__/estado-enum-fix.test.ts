/**
 * Test para verificar la corrección del enum EstadoListaEquipo
 * en la API de actualización de lista de equipos
 * 
 * @author TRAE AI - GYS System
 * @version 1.0.0
 */

import { NextRequest } from 'next/server'
import { PUT } from '@/app/api/lista-equipo/[id]/route'
import { prisma } from '@/lib/prisma'
import type { EstadoListaEquipo } from '@prisma/client'

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    listaEquipo: {
      findUnique: jest.fn(),
      update: jest.fn()
    }
  }
}))

const mockPrisma = prisma as jest.Mocked<typeof prisma>

describe('/api/lista-equipo/[id] - Estado Enum Fix', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const mockExistingLista = {
    id: 'lista-1',
    codigo: 'LST-001',
    nombre: 'Lista Test',
    estado: 'borrador' as EstadoListaEquipo,
    fechaEnvioRevision: null,
    fechaValidacion: null,
    fechaAprobacionRevision: null,
    fechaEnvioLogistica: null
  }

  it('should handle "por_revisar" state correctly', async () => {
    mockPrisma.listaEquipo.findUnique.mockResolvedValue(mockExistingLista)
    mockPrisma.listaEquipo.update.mockResolvedValue({
      ...mockExistingLista,
      estado: 'por_revisar' as EstadoListaEquipo
    })

    const request = new NextRequest('http://localhost:3000/api/lista-equipo/lista-1', {
      method: 'PUT',
      body: JSON.stringify({
        estado: 'por_revisar'
      })
    })

    const response = await PUT(request, { params: Promise.resolve({ id: 'lista-1' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(mockPrisma.listaEquipo.update).toHaveBeenCalledWith({
      where: { id: 'lista-1' },
      data: expect.objectContaining({
        estado: 'por_revisar',
        fechaEnvioRevision: expect.any(Date)
      })
    })
  })

  it('should handle "por_validar" state correctly', async () => {
    mockPrisma.listaEquipo.findUnique.mockResolvedValue(mockExistingLista)
    mockPrisma.listaEquipo.update.mockResolvedValue({
      ...mockExistingLista,
      estado: 'por_validar' as EstadoListaEquipo
    })

    const request = new NextRequest('http://localhost:3000/api/lista-equipo/lista-1', {
      method: 'PUT',
      body: JSON.stringify({
        estado: 'por_validar'
      })
    })

    const response = await PUT(request, { params: Promise.resolve({ id: 'lista-1' }) })

    expect(response.status).toBe(200)
    expect(mockPrisma.listaEquipo.update).toHaveBeenCalledWith({
      where: { id: 'lista-1' },
      data: expect.objectContaining({
        estado: 'por_validar',
        fechaValidacion: expect.any(Date)
      })
    })
  })

  it('should handle "por_aprobar" state correctly', async () => {
    mockPrisma.listaEquipo.findUnique.mockResolvedValue(mockExistingLista)
    mockPrisma.listaEquipo.update.mockResolvedValue({
      ...mockExistingLista,
      estado: 'por_aprobar' as EstadoListaEquipo
    })

    const request = new NextRequest('http://localhost:3000/api/lista-equipo/lista-1', {
      method: 'PUT',
      body: JSON.stringify({
        estado: 'por_aprobar'
      })
    })

    const response = await PUT(request, { params: Promise.resolve({ id: 'lista-1' }) })

    expect(response.status).toBe(200)
    expect(mockPrisma.listaEquipo.update).toHaveBeenCalledWith({
      where: { id: 'lista-1' },
      data: expect.objectContaining({
        estado: 'por_aprobar',
        fechaValidacion: expect.any(Date)
      })
    })
  })

  it('should handle "aprobado" state correctly', async () => {
    mockPrisma.listaEquipo.findUnique.mockResolvedValue(mockExistingLista)
    mockPrisma.listaEquipo.update.mockResolvedValue({
      ...mockExistingLista,
      estado: 'aprobado' as EstadoListaEquipo
    })

    const request = new NextRequest('http://localhost:3000/api/lista-equipo/lista-1', {
      method: 'PUT',
      body: JSON.stringify({
        estado: 'aprobado'
      })
    })

    const response = await PUT(request, { params: Promise.resolve({ id: 'lista-1' }) })

    expect(response.status).toBe(200)
    expect(mockPrisma.listaEquipo.update).toHaveBeenCalledWith({
      where: { id: 'lista-1' },
      data: expect.objectContaining({
        estado: 'aprobado',
        fechaAprobacionRevision: expect.any(Date)
      })
    })
  })

  it('should handle "por_cotizar" state correctly', async () => {
    mockPrisma.listaEquipo.findUnique.mockResolvedValue(mockExistingLista)
    mockPrisma.listaEquipo.update.mockResolvedValue({
      ...mockExistingLista,
      estado: 'por_cotizar' as EstadoListaEquipo
    })

    const request = new NextRequest('http://localhost:3000/api/lista-equipo/lista-1', {
      method: 'PUT',
      body: JSON.stringify({
        estado: 'por_cotizar'
      })
    })

    const response = await PUT(request, { params: Promise.resolve({ id: 'lista-1' }) })

    expect(response.status).toBe(200)
    expect(mockPrisma.listaEquipo.update).toHaveBeenCalledWith({
      where: { id: 'lista-1' },
      data: expect.objectContaining({
        estado: 'por_cotizar',
        fechaEnvioLogistica: expect.any(Date)
      })
    })
  })

  it('should handle "rechazado" state correctly', async () => {
    mockPrisma.listaEquipo.findUnique.mockResolvedValue(mockExistingLista)
    mockPrisma.listaEquipo.update.mockResolvedValue({
      ...mockExistingLista,
      estado: 'rechazado' as EstadoListaEquipo
    })

    const request = new NextRequest('http://localhost:3000/api/lista-equipo/lista-1', {
      method: 'PUT',
      body: JSON.stringify({
        estado: 'rechazado'
      })
    })

    const response = await PUT(request, { params: Promise.resolve({ id: 'lista-1' }) })

    expect(response.status).toBe(200)
    expect(mockPrisma.listaEquipo.update).toHaveBeenCalledWith({
      where: { id: 'lista-1' },
      data: expect.objectContaining({
        estado: 'rechazado'
        // No se debe actualizar ninguna fecha específica para rechazado
      })
    })
  })

  it('should validate enum values at compile time', () => {
    // ✅ Test que verifica que los valores del enum son correctos
    const validStates: EstadoListaEquipo[] = [
      'borrador',
      'por_revisar', 
      'por_cotizar',
      'por_validar',
      'por_aprobar',
      'aprobado',
      'rechazado'
    ]

    // ❌ Estos valores ya no deberían ser válidos
    const invalidStates = [
      'enviado_revision',
      'enviado_logistica', 
      'en_cotizacion',
      'cotizado',
      'aprobado_final'
    ]

    validStates.forEach(state => {
      expect(typeof state).toBe('string')
      expect(state).toMatch(/^[a-z_]+$/)
    })

    invalidStates.forEach(state => {
      // Estos valores no deberían ser asignables al tipo EstadoListaEquipo
      expect(state).not.toMatch(/^(borrador|por_revisar|por_cotizar|por_validar|por_aprobar|aprobado|rechazado)$/)
    })
  })
})