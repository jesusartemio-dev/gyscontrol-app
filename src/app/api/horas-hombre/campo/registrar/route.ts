/**
 * API para crear registros de horas en campo (cuadrilla)
 * POST /api/horas-hombre/campo/registrar
 *
 * Estructura: 1 Registro = 1 Proyecto + 1 EDT + N Tareas
 * Cada Tarea tiene su propio personal con horas independientes
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import type { CrearRegistroCampoPayload, TareaCuadrilla } from '@/types/registroCampo'

export async function POST(request: NextRequest) {
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
    const body: CrearRegistroCampoPayload = await request.json()

    // Validaciones básicas
    const { proyectoId, proyectoEdtId, fechaTrabajo, descripcion, ubicacion, tareas } = body

    if (!proyectoId) {
      return NextResponse.json(
        { error: 'El proyecto es requerido' },
        { status: 400 }
      )
    }

    if (!fechaTrabajo) {
      return NextResponse.json(
        { error: 'La fecha de trabajo es requerida' },
        { status: 400 }
      )
    }

    if (!tareas || tareas.length === 0) {
      return NextResponse.json(
        { error: 'Debe registrar al menos una tarea' },
        { status: 400 }
      )
    }

    // Validar cada tarea
    for (let i = 0; i < tareas.length; i++) {
      const tarea = tareas[i]

      // Cada tarea debe tener proyectoTareaId o nombreTareaExtra
      if (!tarea.proyectoTareaId && !tarea.nombreTareaExtra) {
        return NextResponse.json(
          { error: `La tarea ${i + 1} debe tener una tarea del cronograma o un nombre de tarea extra` },
          { status: 400 }
        )
      }

      // Cada tarea debe tener al menos un miembro
      if (!tarea.miembros || tarea.miembros.length === 0) {
        return NextResponse.json(
          { error: `La tarea ${i + 1} debe tener al menos un miembro asignado` },
          { status: 400 }
        )
      }

      // Validar horas de cada miembro
      for (const miembro of tarea.miembros) {
        if (!miembro.usuarioId) {
          return NextResponse.json(
            { error: 'Cada miembro debe tener un usuarioId' },
            { status: 400 }
          )
        }
        if (!miembro.horas || miembro.horas <= 0 || miembro.horas > 24) {
          return NextResponse.json(
            { error: `Las horas de cada miembro deben estar entre 0.5 y 24` },
            { status: 400 }
          )
        }
      }
    }

    // Verificar que el proyecto existe
    const proyecto = await prisma.proyecto.findUnique({
      where: { id: proyectoId },
      select: { id: true, nombre: true, codigo: true }
    })

    if (!proyecto) {
      return NextResponse.json(
        { error: 'Proyecto no encontrado' },
        { status: 404 }
      )
    }

    // Verificar EDT si se proporciona
    if (proyectoEdtId) {
      const edt = await prisma.proyectoEdt.findUnique({
        where: { id: proyectoEdtId },
        select: { id: true, proyectoId: true }
      })
      if (!edt || edt.proyectoId !== proyectoId) {
        return NextResponse.json(
          { error: 'EDT no válido para este proyecto' },
          { status: 400 }
        )
      }
    }

    // Verificar tareas del cronograma si se proporcionan
    const tareasDelCronograma = tareas
      .filter((t: TareaCuadrilla) => t.proyectoTareaId)
      .map((t: TareaCuadrilla) => t.proyectoTareaId!)

    if (tareasDelCronograma.length > 0) {
      const tareasExistentes = await prisma.proyectoTarea.findMany({
        where: { id: { in: tareasDelCronograma } },
        select: { id: true, proyectoEdtId: true }
      })

      if (tareasExistentes.length !== tareasDelCronograma.length) {
        return NextResponse.json(
          { error: 'Una o más tareas del cronograma no existen' },
          { status: 400 }
        )
      }

      // Verificar que las tareas pertenecen al EDT seleccionado
      if (proyectoEdtId) {
        const tareaInvalida = tareasExistentes.find(t => t.proyectoEdtId !== proyectoEdtId)
        if (tareaInvalida) {
          return NextResponse.json(
            { error: 'Una o más tareas no pertenecen al EDT seleccionado' },
            { status: 400 }
          )
        }
      }
    }

    // Verificar que todos los usuarios existen
    const todosLosMiembros = tareas.flatMap((t: TareaCuadrilla) => t.miembros)
    const usuarioIdsUnicos = [...new Set(todosLosMiembros.map(m => m.usuarioId))]
    const usuarios = await prisma.user.findMany({
      where: { id: { in: usuarioIdsUnicos } },
      select: { id: true }
    })

    if (usuarios.length !== usuarioIdsUnicos.length) {
      return NextResponse.json(
        { error: 'Uno o más usuarios seleccionados no existen' },
        { status: 400 }
      )
    }

    // Convertir fecha
    const [year, month, day] = fechaTrabajo.split('-').map(Number)
    const fechaLocal = new Date(year, month - 1, day, 12, 0, 0, 0)

    // Crear el registro de campo con sus tareas y miembros en una transacción
    const registroCampo = await prisma.$transaction(async (tx) => {
      // Crear el registro principal
      const registro = await tx.registroHorasCampo.create({
        data: {
          proyectoId,
          proyectoEdtId: proyectoEdtId || null,
          supervisorId,
          fechaTrabajo: fechaLocal,
          descripcion: descripcion || null,
          ubicacion: ubicacion || null,
          estado: 'pendiente'
        }
      })

      // Crear las tareas con sus miembros
      for (const tarea of tareas) {
        await tx.registroHorasCampoTarea.create({
          data: {
            registroCampoId: registro.id,
            proyectoTareaId: tarea.proyectoTareaId || null,
            nombreTareaExtra: tarea.nombreTareaExtra || null,
            descripcion: tarea.descripcion || null,
            miembros: {
              create: tarea.miembros.map(m => ({
                usuarioId: m.usuarioId,
                horas: m.horas,
                observaciones: m.observaciones || null
              }))
            }
          }
        })
      }

      // Obtener el registro completo con todas las relaciones
      return await tx.registroHorasCampo.findUnique({
        where: { id: registro.id },
        include: {
          proyecto: { select: { id: true, codigo: true, nombre: true } },
          proyectoEdt: { select: { id: true, nombre: true } },
          supervisor: { select: { id: true, name: true, email: true } },
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
        }
      })
    })

    if (!registroCampo) {
      throw new Error('Error al crear el registro de campo')
    }

    // Calcular totales
    const cantidadTareas = registroCampo.tareas.length
    const cantidadMiembros = new Set(
      registroCampo.tareas.flatMap(t => t.miembros.map(m => m.usuarioId))
    ).size
    const totalHoras = registroCampo.tareas.reduce(
      (sum, t) => sum + t.miembros.reduce((s, m) => s + m.horas, 0),
      0
    )

    console.log(`✅ REGISTRO CAMPO: Creado registro ${registroCampo.id} con ${cantidadTareas} tareas, ${cantidadMiembros} personas únicas, total ${totalHoras}h`)

    return NextResponse.json({
      success: true,
      message: `Registro de campo creado con ${cantidadTareas} tarea(s) y ${cantidadMiembros} persona(s) (${totalHoras}h total)`,
      data: {
        id: registroCampo.id,
        proyecto: registroCampo.proyecto,
        edt: registroCampo.proyectoEdt,
        fechaTrabajo: registroCampo.fechaTrabajo,
        cantidadTareas,
        cantidadMiembros,
        totalHoras,
        estado: registroCampo.estado
      }
    })

  } catch (error) {
    console.error('❌ REGISTRO CAMPO Error:', error)
    return NextResponse.json(
      {
        error: 'Error creando registro de campo',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    )
  }
}
