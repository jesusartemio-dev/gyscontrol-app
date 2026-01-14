/**
 * 📋 API Tareas - Cronograma Comercial
 *
 * Endpoints para gestión de tareas dentro de un EDT comercial.
 *
 * @author GYS Team
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { crearCotizacionTareaSchema } from '@/lib/validators/cronograma'

// ✅ Función para recalcular horas totales del EDT
async function recalcularHorasEdt(edtId: string) {
  const tareas = await prisma.cotizacionTarea.findMany({
    where: { cotizacionActividad: { cotizacionEdtId: edtId } },
    select: { horasEstimadas: true }
  })

  const totalHoras = tareas.reduce((sum, tarea) => {
    return sum + (tarea.horasEstimadas?.toNumber() || 0)
  }, 0)

  await prisma.cotizacionEdt.update({
    where: { id: edtId },
    data: { horasEstimadas: totalHoras }
  })
}

// ===================================================
// 📋 GET /api/cotizacion/[id]/cronograma/[edtId]/tareas
// ===================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; edtId: string }> }
) {
  const { id, edtId } = await params

  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificar que el EDT existe y pertenece a la cotización
    const edt = await prisma.cotizacionEdt.findFirst({
      where: {
        id: edtId,
        cotizacionId: id
      }
    })

    if (!edt) {
      return NextResponse.json(
        { error: 'EDT no encontrado' },
        { status: 404 }
      )
    }

    const tareas = await prisma.cotizacionTarea.findMany({
      where: { cotizacionActividad: { cotizacionEdtId: edtId } },
      include: {
        responsable: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    })

    return NextResponse.json({
      success: true,
      data: tareas,
      meta: {
        totalTareas: tareas.length,
        edtId,
        cotizacionId: id
      }
    })

  } catch (error) {
    logger.error('❌ Error al obtener tareas comerciales:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// ===================================================
// 📝 POST /api/cotizacion/[id]/cronograma/[edtId]/tareas
// ===================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; edtId: string }> }
) {
  const { id, edtId } = await params

  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()

    // Validar datos de entrada
    const validData = crearCotizacionTareaSchema.parse(body)

    // Verificar que el EDT existe y pertenece a la cotización
    const edt = await prisma.cotizacionEdt.findFirst({
      where: {
        id: edtId,
        cotizacionId: id
      }
    })

    if (!edt) {
      return NextResponse.json(
        { error: 'EDT no encontrado' },
        { status: 404 }
      )
    }

    // Verificar que la dependencia existe si se especifica
    if (validData.dependenciaDeId) {
      const dependencia = await prisma.cotizacionTarea.findFirst({
        where: {
          id: validData.dependenciaDeId,
          cotizacionActividad: {
            cotizacionEdtId: edtId
          }
        }
      })

      if (!dependencia) {
        return NextResponse.json(
          { error: 'Tarea de dependencia no encontrada' },
          { status: 400 }
        )
      }
    }

    // Nota: No hay campo 'orden' en CotizacionTarea según el schema Prisma

    const nuevaTarea = await prisma.cotizacionTarea.create({
      data: {
        nombre: validData.nombre,
        fechaInicio: validData.fechaInicioCom ? new Date(validData.fechaInicioCom) : new Date(),
        fechaFin: validData.fechaFinCom ? new Date(validData.fechaFinCom) : new Date(),
        horasEstimadas: validData.horasCom,
        descripcion: validData.descripcion,
        prioridad: validData.prioridad,
        responsableId: validData.responsableId,
        cotizacionActividadId: '' // TODO: Fix to use proper activity ID
      } as any,
      include: {
        responsable: {
          select: { id: true, name: true, email: true }
        }
      }
    })

    // ✅ Recalcular horas totales del EDT
    await recalcularHorasEdt(edtId)

    logger.info(`✅ Tarea comercial creada: ${nuevaTarea.id} - EDT: ${edtId}`)

    return NextResponse.json({
      success: true,
      data: nuevaTarea,
      message: 'Tarea comercial creada exitosamente'
    }, { status: 201 })

  } catch (error) {
    logger.error('❌ Error al crear tarea comercial:', error)

    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Datos de entrada inválidos', details: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}