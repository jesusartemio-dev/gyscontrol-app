import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import { deleteFile } from '@/lib/services/googleDrive'

type Ctx = { params: Promise<{ id: string; adjId: string }> }

// DELETE /api/ausencias/:id/adjuntos/:adjId
// Solo el solicitante puede borrar, y solo si la solicitud está en borrador.
export async function DELETE(_: NextRequest, context: Ctx) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id, adjId } = await context.params

    const solicitud = await prisma.solicitudAusencia.findUnique({
      where: { id },
      select: { solicitanteId: true, estado: true },
    })
    if (!solicitud) {
      return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 })
    }
    if (solicitud.solicitanteId !== session.user.id) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }
    if (solicitud.estado !== 'borrador') {
      return NextResponse.json(
        {
          error: `Solo se pueden eliminar adjuntos de solicitudes en borrador (estado actual: ${solicitud.estado})`,
        },
        { status: 422 },
      )
    }

    const adjunto = await prisma.solicitudAusenciaAdjunto.findUnique({
      where: { id: adjId },
    })
    if (!adjunto || adjunto.solicitudAusenciaId !== id) {
      return NextResponse.json({ error: 'Adjunto no encontrado' }, { status: 404 })
    }

    // Delete from Google Drive (best-effort; don't fail the request if Drive fails)
    if (adjunto.driveFileId) {
      try {
        await deleteFile(adjunto.driveFileId)
      } catch (driveErr) {
        console.warn(`[DELETE adjunto] No se pudo borrar el archivo de Drive (${adjunto.driveFileId}):`, driveErr)
      }
    }

    await prisma.solicitudAusenciaAdjunto.delete({ where: { id: adjId } })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[DELETE /api/ausencias/:id/adjuntos/:adjId]', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
