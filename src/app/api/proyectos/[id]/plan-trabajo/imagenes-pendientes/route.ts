import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

type Ctx = { params: Promise<{ id: string }> }

// GET /api/proyectos/[id]/plan-trabajo/imagenes-pendientes
// Lista las fotos encontradas en la última versión IMPORTADA que no
// matchearon ningún "Figura N." existente — pendientes de asignar a mano.
export async function GET(_req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { id: proyectoId } = await params
  const planDb = await prisma.planTrabajo.findUnique({ where: { proyectoId }, select: { id: true } })
  if (!planDb) {
    return NextResponse.json({ error: 'El Plan de Trabajo no existe para este proyecto' }, { status: 404 })
  }

  const pendientes = await prisma.planTrabajoImagenPendiente.findMany({
    where: { planTrabajoId: planDb.id },
    orderBy: { orden: 'asc' },
  })

  return NextResponse.json({ data: pendientes })
}
