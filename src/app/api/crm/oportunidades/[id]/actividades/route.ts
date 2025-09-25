// ===================================================
// 📁 Archivo: actividades/route.ts
// 📌 Ubicación: /api/crm/oportunidades/[id]/actividades
// 🔧 Descripción: API para gestión de actividades de oportunidad
// ✅ GET: Listar actividades de oportunidad
// ✅ POST: Crear nueva actividad
// ✍️ Autor: Sistema GYS - Asistente IA
// 📅 Última actualización: 2025-09-19
// ===================================================

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

// ✅ Obtener actividades de una oportunidad
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id: oportunidadId } = await params

    // ✅ Verificar que la oportunidad existe
    const oportunidad = await prisma.crmOportunidad.findUnique({
      where: { id: oportunidadId },
      select: { id: true, nombre: true }
    })

    if (!oportunidad) {
      return NextResponse.json(
        { error: 'Oportunidad no encontrada' },
        { status: 404 }
      )
    }

    const { searchParams } = new URL(request.url)

    // 📊 Parámetros de paginación
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    // 🔍 Filtros
    const tipo = searchParams.get('tipo')
    const resultado = searchParams.get('resultado')
    const fechaDesde = searchParams.get('fechaDesde')
    const fechaHasta = searchParams.get('fechaHasta')

    // 🔧 Construir filtros
    const where: any = { oportunidadId }

    if (tipo && tipo !== 'todos') where.tipo = tipo
    if (resultado && resultado !== 'todos') where.resultado = resultado

    // 📅 Filtros de fecha
    if (fechaDesde || fechaHasta) {
      where.fecha = {}
      if (fechaDesde) where.fecha.gte = new Date(fechaDesde)
      if (fechaHasta) where.fecha.lte = new Date(fechaHasta)
    }

    // 📊 Obtener actividades
    const [actividades, total] = await Promise.all([
      prisma.crmActividad.findMany({
        where,
        include: {
          usuario: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: { fecha: 'desc' },
        skip,
        take: limit
      }),
      prisma.crmActividad.count({ where })
    ])

    // 📈 Estadísticas de actividades
    const estadisticas = await prisma.crmActividad.groupBy({
      by: ['tipo', 'resultado'],
      where: { oportunidadId },
      _count: { id: true }
    })

    return NextResponse.json({
      data: actividades,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      estadisticas: estadisticas.reduce((acc, stat) => {
        const key = `${stat.tipo}_${stat.resultado || 'sin_resultado'}`
        acc[key] = stat._count.id
        return acc
      }, {} as Record<string, number>)
    })

  } catch (error) {
    console.error('❌ Error al obtener actividades:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// ✅ Crear nueva actividad
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id: oportunidadId } = await params
    const data = await request.json()

    const {
      tipo,
      descripcion,
      fecha,
      resultado,
      notas
    } = data

    // ✅ Validaciones
    if (!tipo || !descripcion) {
      return NextResponse.json(
        { error: 'Tipo y descripción son obligatorios' },
        { status: 400 }
      )
    }

    // ✅ Verificar que la oportunidad existe
    const oportunidad = await prisma.crmOportunidad.findUnique({
      where: { id: oportunidadId },
      select: { id: true, nombre: true }
    })

    if (!oportunidad) {
      return NextResponse.json(
        { error: 'Oportunidad no encontrada' },
        { status: 404 }
      )
    }

    // ✅ Verificar que el usuario existe
    const usuario = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, name: true, email: true }
    })

    if (!usuario) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    // ✅ Crear actividad
    const nuevaActividad = await prisma.crmActividad.create({
      data: {
        oportunidadId,
        tipo,
        descripcion,
        fecha: fecha ? new Date(fecha) : new Date(),
        resultado,
        notas,
        usuarioId: session.user.id
      },
      include: {
        usuario: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    // ✅ Actualizar fecha de último contacto en la oportunidad
    await prisma.crmOportunidad.update({
      where: { id: oportunidadId },
      data: { fechaUltimoContacto: new Date() }
    })

    return NextResponse.json(nuevaActividad, { status: 201 })

  } catch (error) {
    console.error('❌ Error al crear actividad:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}