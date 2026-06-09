import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { puedeEscribirEvidencia } from '@/lib/services/evidenciaAvance'
import { ROLES_PERMITIDOS } from '@/lib/auth/rolesEvidenciaProyecto'
import { z } from 'zod'

const reordenSchema = z.object({
  ordenes: z
    .array(
      z.object({
        id: z.string().min(1),
        orden: z.number().int().nonnegative(),
      }),
    )
    .min(1),
})

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    if (!(ROLES_PERMITIDOS as readonly string[]).includes(session.user.role))
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

    const registro = await prisma.registroAvance.findUnique({
      where: { id },
      select: {
        id: true,
        evidencia: { select: { estado: true, jornada: { select: { estado: true } } } },
      },
    })
    if (!registro) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

    if (
      !puedeEscribirEvidencia(
        session.user.role,
        registro.evidencia.jornada.estado,
        registro.evidencia.estado,
      )
    ) {
      return NextResponse.json(
        { error: 'No se puede reordenar: la evidencia o jornada está cerrada' },
        { status: 403 },
      )
    }

    const body = await req.json()
    const parsed = reordenSchema.safeParse(body)
    if (!parsed.success)
      return NextResponse.json({ error: 'Datos inválidos', detalles: parsed.error.flatten() }, { status: 400 })

    // Verifica que todas las fotos pertenezcan al registro
    const fotoIds = parsed.data.ordenes.map((o) => o.id)
    const fotos = await prisma.registroAvanceFoto.findMany({
      where: { id: { in: fotoIds }, registroAvanceId: id },
      select: { id: true },
    })
    if (fotos.length !== fotoIds.length)
      return NextResponse.json({ error: 'Algunas fotos no pertenecen a este registro' }, { status: 400 })

    await prisma.$transaction(
      parsed.data.ordenes.map((o) =>
        prisma.registroAvanceFoto.update({
          where: { id: o.id },
          data: { orden: o.orden },
        }),
      ),
    )

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[PATCH /api/proyectos/registros-evidencia/[id]/fotos/orden]', e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
