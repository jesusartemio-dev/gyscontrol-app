import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import { deleteFile } from '@/lib/services/googleDrive'

type Ctx = { params: Promise<{ id: string; valId: string; adjId: string }> }

const ROLES_ALLOWED = ['admin', 'gerente', 'gestor', 'coordinador', 'administracion']

// DELETE /api/proyectos/:id/valorizaciones/:valId/adjuntos/:adjId
export async function DELETE(_: NextRequest, { params }: Ctx) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    if (!ROLES_ALLOWED.includes(session.user.role)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

    const { adjId } = await params
    const adjunto = await prisma.valorizacionAdjunto.findUnique({ where: { id: adjId } })
    if (!adjunto) return NextResponse.json({ error: 'Adjunto no encontrado' }, { status: 404 })

    if (adjunto.driveFileId) {
      try { await deleteFile(adjunto.driveFileId) } catch { /* no bloquear si falla Drive */ }
    }

    await prisma.valorizacionAdjunto.delete({ where: { id: adjId } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[DELETE /adjuntos valorizacion]', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
