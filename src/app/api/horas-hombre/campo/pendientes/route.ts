/**
 * API para listar registros de campo pendientes de aprobación
 * GET /api/horas-hombre/campo/pendientes
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

    // Solo gestores, gerentes y admins pueden ver pendientes
    const rolesPermitidos = ['admin', 'gerente', 'gestor', 'coordinador']
    if (!rolesPermitidos.includes(session.user.role || '')) {
      return NextResponse.json(
        { error: 'No tiene permisos para ver registros pendientes' },
        { status: 403 }
      )
    }

    // Obtener filtros de query params
    const { searchParams } = new URL(request.url)
    const proyectoId = searchParams.get('proyectoId')
    const supervisorId = searchParams.get('supervisorId')
    const estado = searchParams.get('estado') as EstadoRegistroCampo | null
    const fechaDesde = searchParams.get('fechaDesde')
    const fechaHasta = searchParams.get('fechaHasta')

    // Construir where clause
    const where: any = {}

    // Por defecto mostrar solo pendientes, a menos que se especifique otro estado
    if (estado) {
      where.estado = estado
    } else {
      where.estado = 'pendiente'
    }

    if (proyectoId) {
      where.proyectoId = proyectoId
    }

    if (supervisorId) {
      where.supervisorId = supervisorId
    }

    if (fechaDesde) {
      const [year, month, day] = fechaDesde.split('-').map(Number)
      where.fechaTrabajo = {
        ...where.fechaTrabajo,
        gte: new Date(year, month - 1, day, 0, 0, 0)
      }
    }

    if (fechaHasta) {
      const [year, month, day] = fechaHasta.split('-').map(Number)
      where.fechaTrabajo = {
        ...where.fechaTrabajo,
        lte: new Date(year, month - 1, day, 23, 59, 59)
      }
    }

    // Obtener registros con la nueva estructura
    const registros = await prisma.registroHorasCampo.findMany({
      where,
      include: {
        proyecto: { select: { id: true, codigo: true, nombre: true } },
        proyectoEdt: { select: { id: true, nombre: true } },
        supervisor: { select: { id: true, name: true, email: true } },
        aprobadoPor: { select: { id: true, name: true, email: true } },
        tareas: {
          include: {
            proyectoTarea: {
              select: {
                id: true,
                nombre: true,
                proyectoActividad: { select: { id: true, nombre: true } }
              }
            },
            miembros: {
              include: {
                usuario: { select: { id: true, name: true, email: true, role: true } }
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Formatear respuesta con totales
    const registrosConTotales = registros.map(r => {
      // Calcular totales desde las tareas
      const cantidadTareas = r.tareas.length
      const todosLosMiembros = r.tareas.flatMap(t => t.miembros)
      const miembrosUnicos = new Set(todosLosMiembros.map(m => m.usuarioId))
      const totalHoras = todosLosMiembros.reduce((sum, m) => sum + m.horas, 0)

      return {
        id: r.id,
        fechaTrabajo: r.fechaTrabajo,
        descripcion: r.descripcion,
        ubicacion: r.ubicacion,
        estado: r.estado,
        fechaAprobacion: r.fechaAprobacion,
        motivoRechazo: r.motivoRechazo,
        createdAt: r.createdAt,
        proyecto: r.proyecto,
        proyectoEdt: r.proyectoEdt,
        supervisor: r.supervisor,
        aprobadoPor: r.aprobadoPor,
        cantidadTareas,
        cantidadMiembros: miembrosUnicos.size,
        totalHoras,
        tareas: r.tareas.map(t => ({
          id: t.id,
          proyectoTareaId: t.proyectoTareaId,
          nombreTareaExtra: t.nombreTareaExtra,
          descripcion: t.descripcion,
          proyectoTarea: t.proyectoTarea,
          miembros: t.miembros,
          totalHoras: t.miembros.reduce((sum, m) => sum + m.horas, 0)
        }))
      }
    })

    // Estadísticas
    const todosLosMiembros = registros.flatMap(r => r.tareas.flatMap(t => t.miembros))
    const stats = {
      total: registrosConTotales.length,
      totalHorasGlobal: registrosConTotales.reduce((sum, r) => sum + r.totalHoras, 0),
      totalPersonasUnicas: new Set(todosLosMiembros.map(m => m.usuarioId)).size
    }

    return NextResponse.json({
      success: true,
      data: registrosConTotales,
      stats
    })

  } catch (error) {
    console.error('❌ PENDIENTES CAMPO Error:', error)
    return NextResponse.json(
      {
        error: 'Error obteniendo registros pendientes',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    )
  }
}
