// POST /api/proyectos/[id]/cronograma/dependencias/restaurar
//   { cambios: [{ id, inicio, fin }] }
// "Deshacer" de un ajuste (manual o de la programación automática): vuelve las
// tareas a las fechas que tenían y recalcula actividad / EDT / fase.

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { validarPermisoCronograma } from '@/lib/services/cronogramaPermisos'
import { isCronogramaBloqueado, cronogramaBloqueadoResponse } from '@/lib/utils/cronogramaLockCheck'
import { guardarFechas } from '@/lib/services/cronogramaAjuste'

const schema = z.object({
  cambios: z.array(z.object({ id: z.string().min(1), inicio: z.string(), fin: z.string() })).min(1).max(5000),
})

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: proyectoId } = await params
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const parsed = schema.safeParse(await request.json().catch(() => ({})))
    if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })

    const tareas = await prisma.proyectoTarea.findMany({
      where: { id: { in: parsed.data.cambios.map(c => c.id) }, proyectoEdt: { proyectoId } },
      select: { id: true, proyectoActividadId: true, proyectoCronogramaId: true },
    })
    if (tareas.length !== new Set(parsed.data.cambios.map(c => c.id)).size) {
      return NextResponse.json({ error: 'Algunas tareas ya no existen: no se puede deshacer' }, { status: 409 })
    }
    const cronogramaId = tareas[0].proyectoCronogramaId
    const permiso = await validarPermisoCronograma(cronogramaId)
    if (!permiso.ok) return permiso.response
    if (await isCronogramaBloqueado(cronogramaId)) return cronogramaBloqueadoResponse()

    const actividad = new Map(tareas.map(t => [t.id, t.proyectoActividadId]))
    await guardarFechas(parsed.data.cambios.map(c => ({
      id: c.id, actividadId: actividad.get(c.id) ?? null, inicio: new Date(c.inicio), fin: new Date(c.fin),
    })))
    return NextResponse.json({ success: true, data: { tareasRestauradas: parsed.data.cambios.length } })
  } catch (error) {
    logger.error('❌ Error restaurando fechas:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
