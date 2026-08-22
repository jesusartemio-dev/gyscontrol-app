/**
 * API para registro jerárquico de horas hombre
 *
 * Permite registrar horas siguiendo la estructura jerárquica:
 * Proyecto → EDT → Elemento (Actividad/Tarea)
 * Garantiza que el registro siempre esté asociado a un EDT válido
 */

import { tieneRol } from '@/lib/auth/roles'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { z } from 'zod'
import { logger } from '@/lib/logger'
import { obtenerCostoHoraPEN } from '@/lib/utils/costoHoraSnapshot'
import { verificarSemanaEditable } from '@/lib/utils/timesheetAprobacion'

const registrarJerarquicoSchema = z.object({
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  horas: z.number().positive(),
  descripcion: z.string().min(1),
  proyectoId: z.string(),
  edtId: z.string(),
  elementoId: z.string(),
  elementoTipo: z.enum(['actividad', 'tarea'])
})

export async function POST(request: NextRequest) {
  try {
    // Verificar sesión
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validatedData = registrarJerarquicoSchema.parse(body)

    const { fecha, horas, descripcion, proyectoId, edtId, elementoId, elementoTipo } = validatedData

    // 🔐 Usar la misma lógica de acceso que los otros APIs
    const rolesConAccesoTotal = ['admin', 'gerente']
    let proyectoAccessFilter: any = { id: proyectoId }

    if (!tieneRol(session, rolesConAccesoTotal)) {
      proyectoAccessFilter.OR = [
        { comercialId: session.user.id },
        { gestorId: session.user.id },
        { proyectoEdts: { some: { responsableId: session.user.id } } },
        {
          proyectoEdts: {
            some: {
              proyectoActividad: {
                some: { responsableId: session.user.id }
              }
            }
          }
        },
        {
          proyectoEdts: {
            some: {
              proyectoTarea: {
                some: { responsableId: session.user.id }
              }
            }
          }
        }
      ]
    }

    // Verificar que el proyecto existe y el usuario tiene acceso
    const proyecto = await prisma.proyecto.findFirst({
      where: proyectoAccessFilter,
      select: { id: true, nombre: true }
    })

    if (!proyecto) {
      return NextResponse.json(
        { error: 'Proyecto no encontrado o sin acceso' },
        { status: 404 }
      )
    }

    // Verificar que el EDT existe y pertenece al proyecto
    const edt = await prisma.proyectoEdt.findFirst({
      where: {
        id: edtId,
        proyectoId: proyectoId
      },
      select: { id: true, nombre: true }
    })

    if (!edt) {
      return NextResponse.json(
        { error: 'EDT no encontrado' },
        { status: 404 }
      )
    }

    // Verificar que el elemento existe y es del tipo correcto
    let elemento: any
    if (elementoTipo === 'actividad') {
      elemento = await prisma.proyectoActividad.findFirst({
        where: {
          id: elementoId,
          proyectoEdtId: edtId
        },
        select: { id: true, nombre: true }
      })
    } else {
      elemento = await prisma.proyectoTarea.findFirst({
        where: {
          id: elementoId,
          proyectoEdtId: edtId
        },
        select: { id: true, nombre: true }
      })
    }

    if (!elemento) {
      return NextResponse.json(
        { error: 'Elemento no encontrado' },
        { status: 404 }
      )
    }

    // Buscar un recurso disponible o usar el usuario actual
    const recurso = await prisma.recurso.findFirst({
      where: { activo: true },
      select: { id: true, nombre: true }
    })

    if (!recurso) {
      return NextResponse.json(
        { error: 'No hay recursos disponibles en el sistema' },
        { status: 404 }
      )
    }

    // Buscar un servicio del proyecto para asociar
    const proyectoServicio = await prisma.proyectoServicioCotizado.findFirst({
      where: { proyectoId },
      select: { id: true, nombre: true }
    })

    if (!proyectoServicio) {
      return NextResponse.json(
        { error: 'No se encontró un servicio asociado al proyecto' },
        { status: 404 }
      )
    }

    // 🔒 Verificar que la semana no esté bloqueada (enviada/aprobada)
    const semanaEditable = await verificarSemanaEditable(session.user.id, new Date(fecha))
    if (!semanaEditable) {
      return NextResponse.json(
        { error: 'No se pueden registrar horas en una semana enviada o aprobada' },
        { status: 403 }
      )
    }

    // Snapshot del costo hora actual del empleado (PEN)
    const costoHora = await obtenerCostoHoraPEN(session.user.id)

    // Crear registro de horas con información jerárquica
    const registroHoras = await prisma.registroHoras.create({
      data: {
        id: `reg-hrs-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        proyectoId,
        proyectoServicioId: proyectoServicio.id,
        categoria: `${elementoTipo}_jerarquico`,
        nombreServicio: `${proyecto.nombre} - ${edt.nombre} - ${elemento.nombre}`,
        recursoId: recurso.id,
        recursoNombre: recurso.nombre,
        usuarioId: session.user.id,
        fechaTrabajo: new Date(fecha),
        horasTrabajadas: horas,
        descripcion: `[EDT: ${edt.nombre}] [${elementoTipo.toUpperCase()}: ${elemento.nombre}] ${descripcion}`,
        origen: 'oficina', // Usar un valor válido existente
        costoHora: costoHora || null,
        updatedAt: new Date()
      },
      include: {
        proyecto: {
          select: {
            nombre: true
          }
        }
      }
    })

    logger.info(`✅ Horas registradas jerárquicamente: ${horas}h en ${elemento.nombre} - Usuario: ${session.user.email}`)

    return NextResponse.json({
      success: true,
      message: `Se registraron ${horas}h en ${elemento.nombre} (${elementoTipo})`,
      data: {
        id: registroHoras.id,
        horasRegistradas: horas,
        proyecto: proyecto.nombre,
        edt: edt.nombre,
        elemento: elemento.nombre,
        elementoTipo: elementoTipo
      }
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      )
    }

    logger.error('Error registrando horas jerárquicamente:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}