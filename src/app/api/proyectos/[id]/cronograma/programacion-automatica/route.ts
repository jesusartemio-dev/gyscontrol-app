// POST /api/proyectos/[id]/cronograma/programacion-automatica  { cronogramaId, activo }
// Enciende o apaga la programación automática del cronograma: con ella, al
// cambiar una tarea o una dependencia, las que dependen de ella se ajustan
// solas (src/lib/services/cronogramaAjuste.ts → propagarSiAutomatico).

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { validarPermisoCronograma } from '@/lib/services/cronogramaPermisos'

const schema = z.object({ cronogramaId: z.string().min(1), activo: z.boolean() })

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: proyectoId } = await params
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const parsed = schema.safeParse(await request.json().catch(() => ({})))
    if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })

    const cron = await prisma.proyectoCronograma.findFirst({ where: { id: parsed.data.cronogramaId, proyectoId }, select: { id: true } })
    if (!cron) return NextResponse.json({ error: 'Cronograma no encontrado' }, { status: 404 })
    const permiso = await validarPermisoCronograma(cron.id)
    if (!permiso.ok) return permiso.response

    await prisma.proyectoCronograma.update({
      where: { id: cron.id },
      data: { programacionAutomatica: parsed.data.activo, updatedAt: new Date() },
    })
    return NextResponse.json({ success: true, data: { programacionAutomatica: parsed.data.activo } })
  } catch (error) {
    logger.error('❌ Error cambiando la programación automática:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
