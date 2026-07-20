import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { deleteFile } from '@/lib/services/googleDrive'

type Ctx = { params: Promise<{ id: string; imagenId: string }> }

// DELETE /api/proyectos/[id]/plan-trabajo/imagenes-pendientes/[imagenId]
// Descarta una foto nueva encontrada en la versión importada (el usuario decide que no hace falta).
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { id: proyectoId, imagenId } = await params
  const imagen = await prisma.planTrabajoImagenPendiente.findUnique({
    where: { id: imagenId },
    include: { planTrabajo: { select: { proyectoId: true } } },
  })
  if (!imagen || imagen.planTrabajo.proyectoId !== proyectoId) {
    return NextResponse.json({ error: 'Imagen no encontrada' }, { status: 404 })
  }

  try {
    await deleteFile(imagen.driveFileId)
  } catch (e) {
    console.error('[imagenes-pendientes] Error borrando archivo de Drive (no bloqueante):', e)
  }

  await prisma.planTrabajoImagenPendiente.delete({ where: { id: imagenId } })

  return NextResponse.json({ ok: true })
}
