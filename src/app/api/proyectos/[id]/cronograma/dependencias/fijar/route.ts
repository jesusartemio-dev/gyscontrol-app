// POST /api/proyectos/[id]/cronograma/dependencias/fijar  { tareaId, fija }
// 📌 Fijar fecha: el ajuste a predecesoras y la programación automática no
// mueven la tarea aunque tenga predecesoras (solo se avisa si la alcanzan).

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { validarPermisoCronogramaPorTarea } from '@/lib/services/cronogramaPermisos'
import { isCronogramaBloqueado, cronogramaBloqueadoResponse } from '@/lib/utils/cronogramaLockCheck'

const schema = z.object({ tareaId: z.string().min(1), fija: z.boolean() })

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: proyectoId } = await params
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const parsed = schema.safeParse(await request.json().catch(() => ({})))
    if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })

    const tarea = await prisma.proyectoTarea.findFirst({
      where: { id: parsed.data.tareaId, proyectoEdt: { proyectoId } },
      select: { id: true, proyectoCronogramaId: true },
    })
    if (!tarea) return NextResponse.json({ error: 'Tarea no encontrada' }, { status: 404 })
    const permiso = await validarPermisoCronogramaPorTarea(tarea.id)
    if (!permiso.ok) return permiso.response
    if (await isCronogramaBloqueado(tarea.proyectoCronogramaId)) return cronogramaBloqueadoResponse()

    await prisma.proyectoTarea.update({ where: { id: tarea.id }, data: { fechaFija: parsed.data.fija, updatedAt: new Date() } })
    return NextResponse.json({ success: true, data: { fechaFija: parsed.data.fija } })
  } catch (error) {
    logger.error('❌ Error fijando la fecha de la tarea:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
