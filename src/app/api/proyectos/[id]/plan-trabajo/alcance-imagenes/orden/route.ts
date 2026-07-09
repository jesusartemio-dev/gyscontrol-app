import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

type Ctx = { params: Promise<{ id: string }> }

const bodySchema = z.object({
  ordenes: z.array(z.object({ id: z.string(), orden: z.number().int().min(0) })).min(1),
})

// PATCH /api/proyectos/[id]/plan-trabajo/alcance-imagenes/orden
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { id: proyectoId } = await params
  const body = await req.json().catch(() => null)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Body inválido — se requiere { ordenes: [{ id, orden }] }' }, { status: 400 })
  }

  const ids = parsed.data.ordenes.map(o => o.id)
  const imagenes = await prisma.planTrabajoImagen.findMany({
    where: { id: { in: ids } },
    include: { planTrabajo: { select: { proyectoId: true } } },
  })
  if (imagenes.length !== ids.length || imagenes.some(img => img.planTrabajo.proyectoId !== proyectoId)) {
    return NextResponse.json({ error: 'Alguna imagen no pertenece a este proyecto' }, { status: 403 })
  }

  await prisma.$transaction(
    parsed.data.ordenes.map(o =>
      prisma.planTrabajoImagen.update({ where: { id: o.id }, data: { orden: o.orden } })
    )
  )

  return NextResponse.json({ ok: true })
}
