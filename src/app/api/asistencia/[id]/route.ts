import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const ROLES_ADMIN = ['admin', 'gerente']

// DELETE — eliminación definitiva de un marcaje (solo admin/gerente).
// Pensado para limpiar registros de prueba.
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (!ROLES_ADMIN.includes(session.user.role)) {
    return NextResponse.json({ error: 'Solo admin/gerente pueden eliminar marcajes' }, { status: 403 })
  }

  const { id } = await params
  const existe = await prisma.asistencia.findUnique({ where: { id } })
  if (!existe) return NextResponse.json({ error: 'Marcaje no encontrado' }, { status: 404 })

  await prisma.asistencia.delete({ where: { id } })
  return NextResponse.json({ ok: true, id })
}
