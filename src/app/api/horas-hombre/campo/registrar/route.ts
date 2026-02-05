/**
 * API para crear registros de horas en campo (cuadrilla)
 * POST /api/horas-hombre/campo/registrar
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import type { CrearRegistroCampoPayload } from '@/types/registroCampo'

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
    const { proyectoId, proyectoEdtId, proyectoTareaId, fechaTrabajo, horasBase, descripcion, ubicacion, miembros } = body

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

    if (!horasBase || horasBase <= 0 || horasBase > 24) {
      return NextResponse.json(
        { error: 'Las horas base deben estar entre 0.5 y 24' },
        { status: 400 }
      )
    }

    if (!miembros || miembros.length === 0) {
      return NextResponse.json(
        { error: 'Debe seleccionar al menos un miembro de la cuadrilla' },
        { status: 400 }
      )
    }

    // Validar que las horas de cada miembro sean válidas
    for (const miembro of miembros) {
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

    // Verificar tarea si se proporciona
    if (proyectoTareaId) {
      const tarea = await prisma.proyectoTarea.findUnique({
        where: { id: proyectoTareaId },
        select: { id: true, proyectoEdtId: true }
      })
      if (!tarea) {
        return NextResponse.json(
          { error: 'Tarea no encontrada' },
          { status: 400 }
        )
      }
      if (proyectoEdtId && tarea.proyectoEdtId !== proyectoEdtId) {
        return NextResponse.json(
          { error: 'La tarea no pertenece al EDT seleccionado' },
          { status: 400 }
        )
      }
    }

    // Verificar que todos los usuarios existen
    const usuarioIds = miembros.map(m => m.usuarioId)
    const usuarios = await prisma.user.findMany({
      where: { id: { in: usuarioIds } },
      select: { id: true }
    })

    if (usuarios.length !== usuarioIds.length) {
      return NextResponse.json(
        { error: 'Uno o más usuarios seleccionados no existen' },
        { status: 400 }
      )
    }

    // Convertir fecha
    const [year, month, day] = fechaTrabajo.split('-').map(Number)
    const fechaLocal = new Date(year, month - 1, day, 12, 0, 0, 0)

    // Crear el registro de campo con sus miembros en una transacción
    const registroCampo = await prisma.$transaction(async (tx) => {
      // Crear el registro principal
      const registro = await tx.registroHorasCampo.create({
        data: {
          proyectoId,
          proyectoEdtId: proyectoEdtId || null,
          proyectoTareaId: proyectoTareaId || null,
          supervisorId,
          fechaTrabajo: fechaLocal,
          horasBase,
          descripcion: descripcion || null,
          ubicacion: ubicacion || null,
          estado: 'pendiente',
          miembros: {
            create: miembros.map(m => ({
              usuarioId: m.usuarioId,
              horas: m.horas,
              observaciones: m.observaciones || null
            }))
          }
        },
        include: {
          proyecto: { select: { id: true, codigo: true, nombre: true } },
          proyectoEdt: { select: { id: true, nombre: true } },
          proyectoTarea: { select: { id: true, nombre: true } },
          supervisor: { select: { id: true, name: true, email: true } },
          miembros: {
            include: {
              usuario: { select: { id: true, name: true, email: true, role: true } }
            }
          }
        }
      })

      return registro
    })

    // Calcular total de horas
    const totalHoras = registroCampo.miembros.reduce((sum, m) => sum + m.horas, 0)

    console.log(`✅ REGISTRO CAMPO: Creado registro ${registroCampo.id} con ${miembros.length} miembros, total ${totalHoras}h`)

    return NextResponse.json({
      success: true,
      message: `Registro de campo creado para ${miembros.length} personas (${totalHoras}h total)`,
      data: {
        id: registroCampo.id,
        proyecto: registroCampo.proyecto,
        edt: registroCampo.proyectoEdt,
        tarea: registroCampo.proyectoTarea,
        fechaTrabajo: registroCampo.fechaTrabajo,
        horasBase: registroCampo.horasBase,
        totalHoras,
        cantidadMiembros: miembros.length,
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
