// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: src/app/api/proyectos/[id]/cronograma/edts/[edtId]/mover-fase/
// 🔧 Descripción: Mover un EDT (con sus actividades y tareas) a otra fase del
//    mismo cronograma, sin tocar fechas/horas — solo reasigna el padre.
// ===================================================

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { logger } from '@/lib/logger'
import { validarPermisoCronogramaPorEdt } from '@/lib/services/cronogramaPermisos'
import { isCronogramaBloqueado, cronogramaBloqueadoResponse } from '@/lib/utils/cronogramaLockCheck'
import { recalcularFasePadre } from '@/lib/utils/cronogramaRollup'

interface RouteContext {
  params: Promise<{ id: string; edtId: string }>
}

// ✅ GET - Fases candidatas (mismo cronograma, distinta fase)
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { id: proyectoId, edtId } = await context.params
    const edt = await prisma.proyectoEdt.findUnique({
      where: { id: edtId },
      select: { proyectoId: true, proyectoCronogramaId: true, proyectoFaseId: true },
    })
    if (!edt || edt.proyectoId !== proyectoId) {
      return NextResponse.json({ error: 'EDT no encontrado' }, { status: 404 })
    }

    const fases = await prisma.proyectoFase.findMany({
      where: { proyectoCronogramaId: edt.proyectoCronogramaId, ...(edt.proyectoFaseId && { id: { not: edt.proyectoFaseId } }) },
      select: { id: true, nombre: true },
      orderBy: { orden: 'asc' },
    })
    return NextResponse.json({ success: true, data: fases })
  } catch (error) {
    logger.error('❌ [API MOVER-FASE] Error al listar fases candidatas:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

const moverFaseSchema = z.object({
  proyectoFaseId: z.string().min(1, 'La fase destino es requerida'),
})

// ✅ POST - Mover el EDT a otra fase (queda al final de la fase destino)
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { id: proyectoId, edtId } = await context.params
    const { proyectoFaseId: faseDestinoId } = moverFaseSchema.parse(await request.json())

    const permiso = await validarPermisoCronogramaPorEdt(edtId)
    if (!permiso.ok) return permiso.response

    const edt = await prisma.proyectoEdt.findUnique({
      where: { id: edtId },
      select: { nombre: true, proyectoId: true, proyectoCronogramaId: true, proyectoFaseId: true },
    })
    if (!edt || edt.proyectoId !== proyectoId) {
      return NextResponse.json({ error: 'EDT no encontrado' }, { status: 404 })
    }
    if (await isCronogramaBloqueado(edt.proyectoCronogramaId)) return cronogramaBloqueadoResponse()
    if (edt.proyectoFaseId === faseDestinoId) {
      return NextResponse.json({ error: 'El EDT ya está en esa fase' }, { status: 400 })
    }

    const faseDestino = await prisma.proyectoFase.findUnique({
      where: { id: faseDestinoId },
      select: { nombre: true, proyectoCronogramaId: true },
    })
    if (!faseDestino || faseDestino.proyectoCronogramaId !== edt.proyectoCronogramaId) {
      return NextResponse.json({ error: 'La fase destino no es de este cronograma' }, { status: 400 })
    }

    // Al final de la fase destino. Actividades y tareas cuelgan del EDT: no cambian.
    const ultimo = await prisma.proyectoEdt.aggregate({ where: { proyectoFaseId: faseDestinoId }, _max: { orden: true } })
    await prisma.proyectoEdt.update({
      where: { id: edtId },
      data: { proyectoFaseId: faseDestinoId, orden: (ultimo._max.orden ?? -1) + 1, updatedAt: new Date() },
    })

    // Fechas de ambas fases: el origen pierde el EDT, el destino lo gana.
    await recalcularFasePadre(faseDestinoId)
    if (edt.proyectoFaseId) await recalcularFasePadre(edt.proyectoFaseId)

    logger.info(`✅ [API MOVER-FASE] EDT ${edtId} movido de fase ${edt.proyectoFaseId} a ${faseDestinoId}`)
    return NextResponse.json({ success: true, message: `"${edt.nombre}" movido a la fase "${faseDestino.nombre}"` })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: error.errors }, { status: 400 })
    }
    logger.error('❌ [API MOVER-FASE] Error al mover EDT:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
