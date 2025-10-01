/**
 * @fileoverview Test para verificar la corrección del enum ProyectoEstado
 * en la creación de proyectos desde cotización
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/proyecto/from-cotizacion/route'
import { prisma } from '@/lib/prisma'
import { ProyectoEstado } from '@prisma/client'

// ✅ Mock Prisma
const mockPrismaClient = {
  cotizacion: {
    findUnique: jest.fn()
  },
  proyecto: {
    create: jest.fn()
  }
}

jest.mock('@/lib/prisma', () => ({
  prisma: mockPrismaClient
}))

const mockPrisma = mockPrismaClient as any

describe('POST /api/proyecto/from-cotizacion - Estado Fix', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should use valid ProyectoEstado enum value', async () => {
    // 📝 Mock cotización válida
    const mockCotizacion = {
      id: 'cotizacion-1',
      estado: 'aprobada',
      cliente: { id: 'cliente-1' },
      equipos: [],
      servicios: [],
      gastos: []
    }

    const mockProyecto = {
      id: 'proyecto-1',
      nombre: 'Proyecto Test',
      codigo: 'PROJ-001',
      estado: 'en_planificacion' as ProyectoEstado
    }

    mockPrisma.cotizacion.findUnique.mockResolvedValue(mockCotizacion as any)
    mockPrisma.proyecto.create.mockResolvedValue(mockProyecto as any)

    // 📡 Crear request
    const requestBody = {
      cotizacionId: 'cotizacion-1',
      gestorId: 'gestor-1',
      clienteId: 'cliente-1',
      comercialId: 'comercial-1',
      nombre: 'Proyecto Test',
      codigo: 'PROJ-001',
      fechaInicio: '2024-01-15T00:00:00.000Z',
      estado: 'en_planificacion' // ✅ Valor válido del enum
    }

    const request = new NextRequest('http://localhost:3000/api/proyecto/from-cotizacion', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: { 'Content-Type': 'application/json' }
    })

    // 🔁 Ejecutar
    const response = await POST(request)
    const result = await response.json()

    // ✅ Verificaciones
    expect(response.status).toBe(200)
    expect(mockPrisma.proyecto.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        estado: 'en_planificacion' // ✅ Estado válido
      })
    })
    expect(result.estado).toBe('en_planificacion')
  })

  it('should validate ProyectoEstado enum values', () => {
    // ✅ Valores válidos del enum ProyectoEstado
    const estadosValidos = Object.values(ProyectoEstado)
    
    expect(estadosValidos).toContain('creado')
    expect(estadosValidos).toContain('en_planificacion')
    expect(estadosValidos).toContain('en_ejecucion')
    expect(estadosValidos).toContain('pausado')
    expect(estadosValidos).toContain('completado')
    expect(estadosValidos).toContain('cancelado')
    expect(estadosValidos).toContain('listas_pendientes')
    expect(estadosValidos).toContain('listas_aprobadas')
    expect(estadosValidos).toContain('pedidos_creados')
    
    // ❌ Valor inválido que causaba el error
    expect(estadosValidos).not.toContain('pendiente')
  })

  it('should use default estado when not provided', async () => {
    // 📝 Mock cotización válida
    const mockCotizacion = {
      id: 'cotizacion-1',
      estado: 'aprobada',
      cliente: { id: 'cliente-1' },
      equipos: [],
      servicios: [],
      gastos: []
    }

    const mockProyecto = {
      id: 'proyecto-1',
      nombre: 'Proyecto Test',
      codigo: 'PROJ-001',
      estado: 'planeado' as ProyectoEstado
    }

    mockPrisma.cotizacion.findUnique.mockResolvedValue(mockCotizacion as any)
    mockPrisma.proyecto.create.mockResolvedValue(mockProyecto as any)

    // 📡 Request sin estado (debería usar default)
    const requestBody = {
      cotizacionId: 'cotizacion-1',
      gestorId: 'gestor-1',
      clienteId: 'cliente-1',
      comercialId: 'comercial-1',
      nombre: 'Proyecto Test',
      codigo: 'PROJ-001',
      fechaInicio: '2024-01-15T00:00:00.000Z'
      // ✅ Sin estado - debería usar 'en_planificacion' por defecto
    }

    const request = new NextRequest('http://localhost:3000/api/proyecto/from-cotizacion', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: { 'Content-Type': 'application/json' }
    })

    // 🔁 Ejecutar
    const response = await POST(request)

    // ✅ Verificaciones
    expect(response.status).toBe(200)
    expect(mockPrisma.proyecto.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        estado: 'en_planificacion' // ✅ Estado por defecto
      })
    })
  })
})
