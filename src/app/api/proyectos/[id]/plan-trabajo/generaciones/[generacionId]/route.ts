import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getSnapshotPlan } from '@/lib/planTrabajo/snapshotHelpers'

type Ctx = { params: Promise<{ id: string; generacionId: string }> }

export async function GET(_req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { id: proyectoId, generacionId } = await params

  const plan = await prisma.planTrabajo.findUnique({
    where: { proyectoId },
    select: { id: true },
  })
  if (!plan) {
    return NextResponse.json({ error: 'Plan de Trabajo no encontrado' }, { status: 404 })
  }

  const generacion = await prisma.planTrabajoGeneracion.findUnique({
    where: { id: generacionId },
    include: { generadoPor: { select: { id: true, name: true, email: true } } },
  })

  if (!generacion || generacion.planTrabajoId !== plan.id) {
    return NextResponse.json({ error: 'Generación no encontrada' }, { status: 404 })
  }

  const snapshotPlan = getSnapshotPlan(generacion.snapshotData)

  return NextResponse.json({
    data: {
      id: generacion.id,
      numeroRevision: generacion.numeroRevision,
      archivoNombre: generacion.archivoNombre,
      tamanioBytes: generacion.tamanioBytes,
      webViewLink: generacion.webViewLink,
      driveFileId: generacion.driveFileId,
      driveFolderId: generacion.driveFolderId,
      generadoEn: generacion.generadoEn,
      generadoPor: generacion.generadoPor,
      snapshotPlan,
    },
  })
}
