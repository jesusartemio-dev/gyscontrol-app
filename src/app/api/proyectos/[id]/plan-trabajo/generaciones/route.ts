import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { id: proyectoId } = await params

  const plan = await prisma.planTrabajo.findUnique({
    where: { proyectoId },
    select: { id: true },
  })
  if (!plan) {
    return NextResponse.json({ error: 'Plan de Trabajo no encontrado' }, { status: 404 })
  }

  const generaciones = await prisma.planTrabajoGeneracion.findMany({
    where: { planTrabajoId: plan.id },
    select: {
      id: true,
      numeroRevision: true,
      archivoNombre: true,
      tamanioBytes: true,
      webViewLink: true,
      driveFileId: true,
      driveFolderId: true,
      generadoEn: true,
      generadoPor: { select: { id: true, name: true, email: true } },
    },
    orderBy: { generadoEn: 'desc' },
  })

  return NextResponse.json({ data: generaciones })
}
