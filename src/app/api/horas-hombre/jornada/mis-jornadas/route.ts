/**
 * API para listar las jornadas del supervisor actual
 * GET /api/horas-hombre/jornada/mis-jornadas
 *
 * Query params:
 * - estado: iniciado | pendiente | aprobado | rechazado (opcional, múltiples separados por coma)
 * - fechaDesde: YYYY-MM-DD (opcional)
 * - fechaHasta: YYYY-MM-DD (opcional)
 * - proyectoId: string (opcional)
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
    const { searchParams } = new URL(request.url)

    // Parsear parámetros
    const estadoParam = searchParams.get('estado')
    const fechaDesde = searchParams.get('fechaDesde')
    const fechaHasta = searchParams.get('fechaHasta')
    const proyectoId = searchParams.get('proyectoId')

    // Construir filtros
    const where: {
      supervisorId: string
      estado?: { in: EstadoRegistroCampo[] }
      fechaTrabajo?: { gte?: Date; lte?: Date }
      proyectoId?: string
    } = {
      supervisorId
    }

    // Filtrar por estados
    if (estadoParam) {
      const estados = estadoParam.split(',') as EstadoRegistroCampo[]
      const estadosValidos: EstadoRegistroCampo[] = ['iniciado', 'pendiente', 'aprobado', 'rechazado']
      const estadosFiltrados = estados.filter(e => estadosValidos.includes(e))
      if (estadosFiltrados.length > 0) {
        where.estado = { in: estadosFiltrados }
      }
    }

    // Filtrar por fechas
    if (fechaDesde || fechaHasta) {
      where.fechaTrabajo = {}
      if (fechaDesde) {
        const [year, month, day] = fechaDesde.split('-').map(Number)
        where.fechaTrabajo.gte = new Date(year, month - 1, day, 0, 0, 0)
      }
      if (fechaHasta) {
        const [year, month, day] = fechaHasta.split('-').map(Number)
        where.fechaTrabajo.lte = new Date(year, month - 1, day, 23, 59, 59)
      }
    }

    // Filtrar por proyecto
    if (proyectoId) {
      where.proyectoId = proyectoId
    }

    // Obtener jornadas con todas las relaciones necesarias
    const jornadas = await prisma.registroHorasCampo.findMany({
      where,
      include: {
        proyecto: { select: { id: true, codigo: true, nombre: true } },
        proyectoEdt: { select: { id: true, nombre: true, edt: { select: { id: true, nombre: true } } } },
        tareas: {
          include: {
            proyectoTarea: {
              select: {
                id: true,
                nombre: true,
                porcentajeCompletado: true,
                proyectoActividad: { select: { id: true, nombre: true } }
              }
            },
            miembros: {
              include: {
                usuario: { select: { id: true, name: true, email: true } }
              }
            }
          }
        }
      },
      orderBy: [
        { estado: 'asc' }, // 'iniciado' primero
        { fechaTrabajo: 'desc' }
      ]
    })

    // Transformar datos con estadísticas calculadas
    const jornadasConEstadisticas = jornadas.map(j => {
      const cantidadTareas = j.tareas.length
      const cantidadMiembros = new Set(
        j.tareas.flatMap(t => t.miembros.map(m => m.usuarioId))
      ).size
      const totalHoras = j.tareas.reduce(
        (sum, t) => sum + t.miembros.reduce((s, m) => s + m.horas, 0),
        0
      )

      return {
        id: j.id,
        proyecto: j.proyecto,
        proyectoEdt: j.proyectoEdt,
        fechaTrabajo: j.fechaTrabajo,
        estado: j.estado,
        objetivosDia: j.objetivosDia,
        avanceDia: j.avanceDia,
        bloqueos: j.bloqueos,
        planSiguiente: j.planSiguiente,
        ubicacion: j.ubicacion,
        personalPlanificado: j.personalPlanificado,
        fechaCierre: j.fechaCierre,
        motivoRechazo: j.motivoRechazo,
        createdAt: j.createdAt,
        cantidadTareas,
        cantidadMiembros,
        totalHoras,
        tareas: j.tareas.map(t => ({
          id: t.id,
          proyectoTarea: t.proyectoTarea,
          nombreTareaExtra: t.nombreTareaExtra,
          descripcion: t.descripcion,
          porcentajeInicial: t.porcentajeInicial,
          porcentajeFinal: t.porcentajeFinal,
          miembros: t.miembros.map(m => ({
            id: m.id,
            usuario: m.usuario,
            horas: m.horas,
            observaciones: m.observaciones
          }))
        }))
      }
    })

    return NextResponse.json({
      success: true,
      data: jornadasConEstadisticas,
      total: jornadasConEstadisticas.length
    })

  } catch (error) {
    console.error('❌ JORNADA CAMPO Error al listar:', error)
    return NextResponse.json(
      {
        error: 'Error obteniendo jornadas',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    )
  }
}
