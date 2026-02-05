/**
 * API para obtener/eliminar un registro de campo específico
 * GET /api/horas-hombre/campo/[id] - Obtener detalle
 * DELETE /api/horas-hombre/campo/[id] - Eliminar (solo si pendiente y es el supervisor)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    // Verificar autenticación
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado - debe iniciar sesión' },
        { status: 401 }
      )
    }

    // Obtener registro con todos los detalles
    const registro = await prisma.registroHorasCampo.findUnique({
      where: { id },
      include: {
        proyecto: { select: { id: true, codigo: true, nombre: true } },
        proyectoEdt: { select: { id: true, nombre: true } },
        supervisor: { select: { id: true, name: true, email: true, role: true } },
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
                usuario: { select: { id: true, name: true, email: true, role: true } },
                registroHoras: { select: { id: true } }
              },
              orderBy: { createdAt: 'asc' }
            }
          },
          orderBy: { createdAt: 'asc' }
        }
      }
    })

    if (!registro) {
      return NextResponse.json(
        { error: 'Registro no encontrado' },
        { status: 404 }
      )
    }

    // Calcular totales
    const cantidadTareas = registro.tareas.length
    const todosLosMiembros = registro.tareas.flatMap(t => t.miembros)
    const miembrosUnicos = new Set(todosLosMiembros.map(m => m.usuarioId))
    const totalHoras = todosLosMiembros.reduce((sum, m) => sum + m.horas, 0)

    // Formatear tareas con sus totales
    const tareasFormateadas = registro.tareas.map(t => ({
      id: t.id,
      proyectoTareaId: t.proyectoTareaId,
      nombreTareaExtra: t.nombreTareaExtra,
      descripcion: t.descripcion,
      proyectoTarea: t.proyectoTarea,
      miembros: t.miembros,
      totalHoras: t.miembros.reduce((sum, m) => sum + m.horas, 0)
    }))

    return NextResponse.json({
      success: true,
      data: {
        id: registro.id,
        fechaTrabajo: registro.fechaTrabajo,
        descripcion: registro.descripcion,
        ubicacion: registro.ubicacion,
        estado: registro.estado,
        fechaAprobacion: registro.fechaAprobacion,
        motivoRechazo: registro.motivoRechazo,
        createdAt: registro.createdAt,
        proyecto: registro.proyecto,
        proyectoEdt: registro.proyectoEdt,
        supervisor: registro.supervisor,
        aprobadoPor: registro.aprobadoPor,
        tareas: tareasFormateadas,
        cantidadTareas,
        cantidadMiembros: miembrosUnicos.size,
        totalHoras
      }
    })

  } catch (error) {
    console.error('❌ DETALLE REGISTRO CAMPO Error:', error)
    return NextResponse.json(
      {
        error: 'Error obteniendo registro de campo',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    // Verificar autenticación
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado - debe iniciar sesión' },
        { status: 401 }
      )
    }

    // Obtener registro
    const registro = await prisma.registroHorasCampo.findUnique({
      where: { id },
      select: {
        id: true,
        supervisorId: true,
        estado: true
      }
    })

    if (!registro) {
      return NextResponse.json(
        { error: 'Registro no encontrado' },
        { status: 404 }
      )
    }

    // Solo el supervisor puede eliminar
    if (registro.supervisorId !== session.user.id && session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Solo el supervisor que creó el registro puede eliminarlo' },
        { status: 403 }
      )
    }

    // Solo se pueden eliminar registros pendientes
    if (registro.estado !== 'pendiente') {
      return NextResponse.json(
        { error: 'Solo se pueden eliminar registros pendientes' },
        { status: 400 }
      )
    }

    // Eliminar registro (cascade eliminará las tareas y miembros)
    await prisma.registroHorasCampo.delete({
      where: { id }
    })

    console.log(`✅ REGISTRO CAMPO: Eliminado registro ${id}`)

    return NextResponse.json({
      success: true,
      message: 'Registro eliminado correctamente'
    })

  } catch (error) {
    console.error('❌ ELIMINAR REGISTRO CAMPO Error:', error)
    return NextResponse.json(
      {
        error: 'Error eliminando registro de campo',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    )
  }
}
