// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: src/app/api/proyectos/[id]/cronograma/actividades/[actividadId]/mover-edt/
// 🔧 Descripción: Mover una actividad (y sus tareas) de un EDT a otro dentro
//    de la misma fase, sin tocar fechas/horas — solo reasigna el padre.
// ===================================================

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { logger } from '@/lib/logger'
import { validarPermisoCronogramaPorActividad, validarPermisoCronograma } from '@/lib/services/cronogramaPermisos'
import { recalcularEdtPadre, recalcularFasePadre } from '@/lib/utils/cronogramaRollup'

interface RouteContext {
  params: Promise<{ id: string; actividadId: string }>
}

// ✅ GET - EDTs candidatos para mover la actividad (misma fase, distinto EDT)
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id: proyectoId, actividadId } = await context.params

    const actividad = await prisma.proyectoActividad.findUnique({
      where: { id: actividadId },
      select: {
        id: true,
        proyectoEdtId: true,
        proyectoEdt: { select: { proyectoId: true, proyectoFaseId: true } },
      },
    })

    if (!actividad || actividad.proyectoEdt?.proyectoId !== proyectoId) {
      return NextResponse.json({ error: 'Actividad no encontrada' }, { status: 404 })
    }

    if (!actividad.proyectoEdt?.proyectoFaseId) {
      return NextResponse.json({ error: 'El EDT actual no pertenece a ninguna fase' }, { status: 400 })
    }

    const edtsCandidatos = await prisma.proyectoEdt.findMany({
      where: {
        proyectoFaseId: actividad.proyectoEdt.proyectoFaseId,
        id: { not: actividad.proyectoEdtId },
      },
      select: {
        id: true,
        nombre: true,
        edt: { select: { nombre: true } },
      },
      orderBy: { nombre: 'asc' },
    })

    return NextResponse.json({ success: true, data: edtsCandidatos })
  } catch (error) {
    logger.error('❌ [API MOVER-EDT] Error al listar EDTs candidatos:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

const moverEdtSchema = z.object({
  proyectoEdtId: z.string().min(1, 'El EDT destino es requerido'),
})

// ✅ POST - Ejecutar el movimiento de la actividad (y sus tareas) a otro EDT
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id: proyectoId, actividadId } = await context.params
    const body = await request.json()
    const { proyectoEdtId: nuevoEdtId } = moverEdtSchema.parse(body)

    const permisoActividad = await validarPermisoCronogramaPorActividad(actividadId)
    if (!permisoActividad.ok) return permisoActividad.response

    const actividad = await prisma.proyectoActividad.findUnique({
      where: { id: actividadId },
      select: {
        id: true,
        nombre: true,
        proyectoEdtId: true,
        proyectoEdt: { select: { proyectoId: true, proyectoFaseId: true, nombre: true } },
      },
    })

    if (!actividad || actividad.proyectoEdt?.proyectoId !== proyectoId) {
      return NextResponse.json({ error: 'Actividad no encontrada' }, { status: 404 })
    }

    const edtOrigenId = actividad.proyectoEdtId
    const faseOrigenId = actividad.proyectoEdt?.proyectoFaseId ?? null

    if (nuevoEdtId === edtOrigenId) {
      return NextResponse.json({ error: 'La actividad ya está en ese EDT' }, { status: 400 })
    }

    const edtDestino = await prisma.proyectoEdt.findUnique({
      where: { id: nuevoEdtId },
      select: { id: true, proyectoId: true, proyectoFaseId: true, proyectoCronogramaId: true, nombre: true },
    })

    if (!edtDestino || edtDestino.proyectoId !== proyectoId) {
      return NextResponse.json({ error: 'EDT destino no encontrado en este proyecto' }, { status: 404 })
    }

    if (edtDestino.proyectoFaseId !== faseOrigenId) {
      return NextResponse.json(
        { error: 'Solo se puede mover la actividad a otro EDT de la misma fase' },
        { status: 400 }
      )
    }

    const permisoDestino = await validarPermisoCronograma(edtDestino.proyectoCronogramaId)
    if (!permisoDestino.ok) return permisoDestino.response

    // ✅ Reasignar actividad y sus tareas al nuevo EDT/cronograma. NO se tocan
    // fechas ni horas — solo el padre (proyectoEdtId) y, para mantener
    // consistencia, el proyectoCronogramaId (ambos campos existen también en
    // ProyectoTarea de forma independiente al de su actividad).
    const tareasMovidas = await prisma.$transaction(async (tx) => {
      await tx.proyectoActividad.update({
        where: { id: actividadId },
        data: {
          proyectoEdtId: nuevoEdtId,
          proyectoCronogramaId: edtDestino.proyectoCronogramaId,
          updatedAt: new Date(),
        },
      })

      const resultado = await tx.proyectoTarea.updateMany({
        where: { proyectoActividadId: actividadId },
        data: {
          proyectoEdtId: nuevoEdtId,
          proyectoCronogramaId: edtDestino.proyectoCronogramaId,
          updatedAt: new Date(),
        },
      })

      return resultado.count
    })

    // ✅ Recalcular horas/fechas agregadas de ambos EDTs (y sus fases) — el
    // origen pierde una actividad, el destino gana una.
    await recalcularEdtPadre(edtOrigenId)
    await recalcularEdtPadre(nuevoEdtId)
    if (faseOrigenId) await recalcularFasePadre(faseOrigenId)

    logger.info(`✅ [API MOVER-EDT] Actividad ${actividadId} movida de EDT ${edtOrigenId} a ${nuevoEdtId} (${tareasMovidas} tareas)`)

    return NextResponse.json({
      success: true,
      message: `Actividad movida a "${edtDestino.nombre}"`,
      data: { actividadId, edtOrigenId, edtDestinoId: nuevoEdtId, tareasMovidas },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: error.errors }, { status: 400 })
    }
    logger.error('❌ [API MOVER-EDT] Error al mover actividad:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
