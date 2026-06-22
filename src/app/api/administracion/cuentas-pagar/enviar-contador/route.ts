import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const ROLES_ALLOWED = ['admin', 'gerente', 'administracion']

// POST: marcar CxPs como enviadas al contador
// Body: { ids: string[] }
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (!ROLES_ALLOWED.includes(session.user.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const body = await req.json()
    const { ids } = body as { ids: string[] }
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'Se requiere al menos un id' }, { status: 400 })
    }

    const now = new Date()
    const enviadaPorId = (session.user as any).id as string

    await prisma.$transaction(
      ids.map(id =>
        prisma.cuentaPorPagar.update({
          where: { id },
          data: {
            enviadaContador: true,
            fechaEnvioContador: now,
            enviadaPorId,
            updatedAt: now,
          },
        })
      )
    )

    return NextResponse.json({ updated: ids.length })
  } catch (error) {
    console.error('Error al marcar CxP como enviada al contador:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}

// DELETE: desmarcar CxPs (quitar marca de enviada)
// Body: { ids: string[] }
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (!ROLES_ALLOWED.includes(session.user.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const body = await req.json()
    const { ids } = body as { ids: string[] }
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'Se requiere al menos un id' }, { status: 400 })
    }

    const now = new Date()
    await prisma.$transaction(
      ids.map(id =>
        prisma.cuentaPorPagar.update({
          where: { id },
          data: {
            enviadaContador: false,
            fechaEnvioContador: null,
            enviadaPorId: null,
            updatedAt: now,
          },
        })
      )
    )

    return NextResponse.json({ updated: ids.length })
  } catch (error) {
    console.error('Error al desmarcar CxP enviada al contador:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
