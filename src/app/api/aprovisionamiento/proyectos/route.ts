// ===================================================
// DEPRECATED: This API is superseded by /api/finanzas/aprovisionamiento/proyectos
// which provides real consolidated KPIs (listas, pedidos, montos).
// This endpoint still serves the detail page via getProyectoAprovisionamiento().
// TODO: Migrate detail page to the consolidated service and remove this file.
// ===================================================

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// ✅ Schema de validación para filtros
const FiltrosProyectosSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  search: z.string().optional(),
  estado: z.string().optional(),
  clienteId: z.string().optional(),
  fechaInicio: z.string().optional(),
  fechaFin: z.string().optional()
})

// 🎯 Función para calcular KPIs básicos
function calcularKPIsProyecto(proyecto: any) {
  return {
    totalListas: proyecto._count?.listaEquipo ?? 0,
    totalPedidos: proyecto._count?.pedidoEquipo ?? 0,
    equiposPendientes: 0,
    equiposCompletados: 0,
    montoTotal: proyecto.totalCliente || 0,
    progreso: proyecto.progresoGeneral ?? 0
  }
}

// 🎯 GET - Obtener proyectos con filtros y paginación
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    
    // 📋 Parsear parámetros con valores por defecto
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || undefined
    const estado = searchParams.get('estado') || undefined
    const clienteId = searchParams.get('clienteId') || undefined
    
    // 🔍 Construir filtros WHERE
    const where: any = {}
    
    if (search) {
      where.OR = [
        { nombre: { contains: search, mode: 'insensitive' } },
        { codigo: { contains: search, mode: 'insensitive' } }
      ]
    }
    
    if (estado) {
      where.estado = estado
    }
    
    if (clienteId) {
      where.clienteId = clienteId
    }
    
    // 📊 Calcular offset para paginación
    const skip = (page - 1) * limit
    
    // 🎯 Obtener proyectos con filtros
    const [proyectos, totalCount] = await Promise.all([
      prisma.proyecto.findMany({
        where,
        select: {
          id: true,
          nombre: true,
          codigo: true,
          estado: true,
          fechaInicio: true,
          fechaFin: true,
          totalCliente: true,
          progresoGeneral: true,
          clienteId: true,
          createdAt: true,
          _count: { select: { listaEquipo: true, pedidoEquipo: true } }
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.proyecto.count({ where })
    ])
    
    // 📈 Calcular KPIs para cada proyecto
    const proyectosConKPIs = proyectos.map(proyecto => ({
      ...proyecto,
      kpis: calcularKPIsProyecto(proyecto)
    }))
    
    // 📊 Calcular metadatos de paginación
    const totalPages = Math.ceil(totalCount / limit)
    const hasNextPage = page < totalPages
    const hasPrevPage = page > 1
    
    console.log('✅ Proyectos obtenidos:', proyectos.length, 'de', totalCount)
    
    return NextResponse.json({
      success: true,
      data: proyectosConKPIs,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: totalPages,
        hasNext: hasNextPage,
        hasPrev: hasPrevPage
      },
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('❌ Error detallado en GET /api/aprovisionamiento/proyectos:')
    console.error('Error name:', error instanceof Error ? error.name : 'Unknown')
    console.error('Error message:', error instanceof Error ? error.message : error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack')
    
    return NextResponse.json(
      {
        success: false,
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
 }

// 🎯 POST - Crear nuevo proyecto
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const body = await request.json()
    
    // ✅ Validación básica
    if (!body.nombre || !body.clienteId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Datos requeridos faltantes',
          message: 'Nombre y clienteId son requeridos'
        },
        { status: 400 }
      )
    }
    
    // 📊 Crear proyecto
    const nuevoProyecto = await prisma.proyecto.create({
      data: {
        id: crypto.randomUUID(),
        nombre: body.nombre,
        clienteId: body.clienteId,
        comercialId: body.comercialId || session.user.id,
        gestorId: body.gestorId || session.user.id,
        codigo: body.codigo || `PROY-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
        fechaInicio: body.fechaInicio ? new Date(body.fechaInicio) : new Date(),
        fechaFin: body.fechaFin ? new Date(body.fechaFin) : null,
        totalCliente: body.totalCliente || 0,
        moneda: body.moneda || 'USD',
        tipoCambio: body.tipoCambio || null,
        estado: body.estado || 'creado',
        updatedAt: new Date()
      },
      select: {
        id: true,
        nombre: true,
        codigo: true,
        estado: true,
        fechaInicio: true,
        fechaFin: true,
        totalCliente: true,
        clienteId: true,
        createdAt: true
      }
    })
    
    // ✅ Respuesta exitosa
    return NextResponse.json(
      {
        success: true,
        data: {
          ...nuevoProyecto,
          kpis: calcularKPIsProyecto(nuevoProyecto)
        },
        message: 'Proyecto creado exitosamente',
        timestamp: new Date().toISOString()
      },
      { status: 201 }
    )
    
  } catch (error) {
    console.error('❌ Error en POST /api/aprovisionamiento/proyectos:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
