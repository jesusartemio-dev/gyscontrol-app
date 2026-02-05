/**
 * API para listar registros de campo creados por el supervisor actual
 * GET /api/horas-hombre/campo/mis-registros
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import type { EstadoRegistroCampo } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado - debe iniciar sesión' },
        { status: 401 }
      )
    }

    const supervisorId = session.user.id

    // Obtener filtros de query params
    const { searchParams } = new URL(request.url)
    const proyectoId = searchParams.get('proyectoId')
    const estado = searchParams.get('estado') as EstadoRegistroCampo | null
    const limit = parseInt(searchParams.get('limit') || '50')

    // Construir where clause
    const where: any = {
      supervisorId
    }

    if (proyectoId) {
      where.proyectoId = proyectoId
    }

    if (estado) {
      where.estado = estado
    }

    // Obtener registros
    const registros = await prisma.registroHorasCampo.findMany({
      where,
      include: {
        proyecto: { select: { id: true, codigo: true, nombre: true } },
        proyectoEdt: { select: { id: true, nombre: true } },
        proyectoTarea: { select: { id: true, nombre: true } },
        aprobadoPor: { select: { id: true, name: true, email: true } },
        _count: { select: { miembros: true } },
        miembros: {
          select: { horas: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    })

    // Formatear respuesta
    const registrosFormateados = registros.map(r => ({
      id: r.id,
      fechaTrabajo: r.fechaTrabajo,
      horasBase: r.horasBase,
      descripcion: r.descripcion,
      ubicacion: r.ubicacion,
      estado: r.estado,
      fechaAprobacion: r.fechaAprobacion,
      motivoRechazo: r.motivoRechazo,
      createdAt: r.createdAt,
      proyecto: r.proyecto,
      proyectoEdt: r.proyectoEdt,
      proyectoTarea: r.proyectoTarea,
      aprobadoPor: r.aprobadoPor,
      cantidadMiembros: r._count.miembros,
      totalHoras: r.miembros.reduce((sum, m) => sum + m.horas, 0)
    }))

    // Estadísticas por estado
    const stats = {
      pendientes: registrosFormateados.filter(r => r.estado === 'pendiente').length,
      aprobados: registrosFormateados.filter(r => r.estado === 'aprobado').length,
      rechazados: registrosFormateados.filter(r => r.estado === 'rechazado').length,
      total: registrosFormateados.length
    }

    return NextResponse.json({
      success: true,
      data: registrosFormateados,
      stats
    })

  } catch (error) {
    console.error('❌ MIS REGISTROS CAMPO Error:', error)
    return NextResponse.json(
      {
        error: 'Error obteniendo mis registros de campo',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    )
  }
}
