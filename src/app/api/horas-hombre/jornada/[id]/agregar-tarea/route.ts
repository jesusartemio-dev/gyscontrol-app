/**
 * API para agregar una tarea a una jornada de campo iniciada
 * POST /api/horas-hombre/jornada/[id]/agregar-tarea
 *
 * Solo funciona cuando la jornada está en estado 'iniciado'
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { randomUUID } from 'crypto'

interface MiembroTarea {
  usuarioId: string
  horas?: number
  observaciones?: string
}

interface AgregarTareaPayload {
  proyectoTareaId?: string
  nombreTareaExtra?: string
  descripcion?: string
  miembros: MiembroTarea[]
}

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado - debe iniciar sesión' },
        { status: 401 }
      )
    }

    const { id: jornadaId } = await context.params
    const body: AgregarTareaPayload = await request.json()

    const { proyectoTareaId, nombreTareaExtra, descripcion, miembros } = body

    // Verificar que la jornada existe y está en estado 'iniciado'
    const jornada = await prisma.registroHorasCampo.findUnique({
      where: { id: jornadaId },
      select: {
        id: true,
        estado: true,
        supervisorId: true,
        proyectoId: true,
        proyectoEdtId: true,
        personalPlanificado: true
      }
    })

    if (!jornada) {
      return NextResponse.json(
        { error: 'Jornada no encontrada' },
        { status: 404 }
      )
    }

    // Verificar que el usuario es el supervisor de la jornada
    if (jornada.supervisorId !== session.user.id) {
      return NextResponse.json(
        { error: 'No tienes permiso para modificar esta jornada' },
        { status: 403 }
      )
    }

    // Verificar estado
    if (jornada.estado !== 'iniciado') {
      return NextResponse.json(
        { error: 'Solo se pueden agregar tareas a jornadas en estado "iniciado"' },
        { status: 400 }
      )
    }

    // Validar que tiene tarea del cronograma o nombre extra
    if (!proyectoTareaId && !nombreTareaExtra) {
      return NextResponse.json(
        { error: 'Debe especificar una tarea del cronograma o un nombre de tarea extra' },
        { status: 400 }
      )
    }

    // Validar miembros
    if (!miembros || miembros.length === 0) {
      return NextResponse.json(
        { error: 'Debe incluir al menos un miembro para la tarea' },
        { status: 400 }
      )
    }

    // Validar usuarioId de cada miembro
    for (const miembro of miembros) {
      if (!miembro.usuarioId) {
        return NextResponse.json(
          { error: 'Cada miembro debe tener un usuarioId' },
          { status: 400 }
        )
      }
    }

    // Si se especifica tarea del cronograma, verificar que existe y pertenece al proyecto/EDT
    if (proyectoTareaId) {
      const tareaExistente = await prisma.proyectoTarea.findUnique({
        where: { id: proyectoTareaId },
        select: {
          id: true,
          nombre: true,
          porcentajeCompletado: true,
          proyectoEdtId: true,
          proyectoEdt: { select: { proyectoId: true } }
        }
      })

      if (!tareaExistente) {
        return NextResponse.json(
          { error: 'Tarea del cronograma no encontrada' },
          { status: 404 }
        )
      }

      // Verificar que pertenece al proyecto de la jornada
      if (tareaExistente.proyectoEdt?.proyectoId !== jornada.proyectoId) {
        return NextResponse.json(
          { error: 'La tarea no pertenece al proyecto de esta jornada' },
          { status: 400 }
        )
      }

      // Verificar que pertenece al EDT de la jornada (si se especificó EDT)
      if (jornada.proyectoEdtId && tareaExistente.proyectoEdtId !== jornada.proyectoEdtId) {
        return NextResponse.json(
          { error: 'La tarea no pertenece al EDT de esta jornada' },
          { status: 400 }
        )
      }
    }

    // Verificar que todos los usuarios existen
    const usuarioIds = miembros.map(m => m.usuarioId)
    const usuarios = await prisma.user.findMany({
      where: { id: { in: usuarioIds } },
      select: { id: true, name: true }
    })

    if (usuarios.length !== usuarioIds.length) {
      return NextResponse.json(
        { error: 'Uno o más usuarios seleccionados no existen' },
        { status: 400 }
      )
    }

    // Resolver la tarea: si es extra nueva, crear ProyectoTarea con [EXTRA]
    let resolvedProyectoTareaId = proyectoTareaId || null

    if (!proyectoTareaId && nombreTareaExtra && jornada.proyectoEdtId) {
      // Buscar el cronograma de ejecución del proyecto
      const cronogramaEjecucion = await prisma.proyectoCronograma.findFirst({
        where: { proyectoId: jornada.proyectoId, tipo: 'ejecucion' }
      })

      if (cronogramaEjecucion) {
        // Buscar un EDT en ejecución con el mismo nombre que el EDT de la jornada
        const edtJornada = await prisma.proyectoEdt.findUnique({
          where: { id: jornada.proyectoEdtId },
          select: { nombre: true }
        })

        let edtEjecucion = await prisma.proyectoEdt.findFirst({
          where: {
            proyectoId: jornada.proyectoId,
            proyectoCronogramaId: cronogramaEjecucion.id,
            nombre: edtJornada?.nombre || ''
          }
        })

        // Si no hay EDT equivalente en ejecución, usar el de la jornada
        const targetEdtId = edtEjecucion?.id || jornada.proyectoEdtId

        // Crear ProyectoTarea con marcador [EXTRA]
        const hoy = new Date()
        const nuevaTareaExtra = await prisma.proyectoTarea.create({
          data: {
            id: randomUUID(),
            proyectoEdtId: targetEdtId,
            proyectoCronogramaId: cronogramaEjecucion.id,
            nombre: nombreTareaExtra.trim(),
            descripcion: '[EXTRA]',
            fechaInicio: hoy,
            fechaFin: hoy,
            creadoPorId: session.user.id,
            estado: 'en_progreso',
            orden: 0,
            updatedAt: new Date()
          }
        })

        resolvedProyectoTareaId = nuevaTareaExtra.id
        console.log(`✅ JORNADA CAMPO: Creada tarea extra "${nombreTareaExtra}" como ProyectoTarea ${nuevaTareaExtra.id}`)
      }
    }

    // Capturar porcentaje inicial de la tarea del cronograma
    let porcentajeInicial: number | null = null
    if (resolvedProyectoTareaId) {
      const tareaActual = await prisma.proyectoTarea.findUnique({
        where: { id: resolvedProyectoTareaId },
        select: { porcentajeCompletado: true }
      })
      porcentajeInicial = tareaActual?.porcentajeCompletado ?? 0
    }

    // Crear la tarea con sus miembros
    const tareaCampo = await prisma.registroHorasCampoTarea.create({
      data: {
        registroCampoId: jornadaId,
        proyectoTareaId: resolvedProyectoTareaId,
        nombreTareaExtra: nombreTareaExtra || null,
        descripcion: descripcion || null,
        porcentajeInicial,
        miembros: {
          create: miembros.map(m => ({
            usuarioId: m.usuarioId,
            horas: m.horas ?? 0,
            observaciones: m.observaciones || null
          }))
        }
      },
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
            usuario: { select: { id: true, name: true, email: true } }
          }
        }
      }
    })

    console.log(`✅ JORNADA CAMPO: Agregada tarea a jornada ${jornadaId} con ${miembros.length} miembros`)

    return NextResponse.json({
      success: true,
      message: `Tarea agregada con ${miembros.length} miembro(s)`,
      data: {
        id: tareaCampo.id,
        proyectoTarea: tareaCampo.proyectoTarea,
        nombreTareaExtra: tareaCampo.nombreTareaExtra,
        descripcion: tareaCampo.descripcion,
        miembros: tareaCampo.miembros
      }
    })

  } catch (error) {
    console.error('❌ JORNADA CAMPO Error al agregar tarea:', error)
    return NextResponse.json(
      {
        error: 'Error agregando tarea a la jornada',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    )
  }
}
