import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const ROLES_ALLOWED = ['admin', 'gerente', 'administracion']

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (!ROLES_ALLOWED.includes(session.user.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const { id } = await params
    const body = await req.json()

    const existing = await prisma.cuentaPorCobrar.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Cuenta por cobrar no encontrada' }, { status: 404 })
    }

    // Anular
    if (body.estado === 'anulada') {
      if (existing.estado === 'anulada') {
        return NextResponse.json({ error: 'La cuenta ya está anulada' }, { status: 400 })
      }
      const updated = await prisma.cuentaPorCobrar.update({
        where: { id },
        data: { estado: 'anulada', updatedAt: new Date() },
      })
      return NextResponse.json(updated)
    }

    return NextResponse.json({ error: 'Operación no soportada' }, { status: 400 })
  } catch (error) {
    console.error('Error al actualizar CxC:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (!ROLES_ALLOWED.includes(session.user.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const { id } = await params

    const existing = await prisma.cuentaPorCobrar.findUnique({
      where: { id },
      include: { pagos: { select: { id: true } } },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Cuenta por cobrar no encontrada' }, { status: 404 })
    }

    if (existing.montoPagado > 0 || existing.pagos.length > 0) {
      return NextResponse.json(
        { error: 'No se puede eliminar: tiene pagos registrados. Anúlela en su lugar.' },
        { status: 400 }
      )
    }

    // Eliminar CxC (adjuntos se eliminan por cascade)
    await prisma.cuentaPorCobrar.delete({ where: { id } })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error al eliminar CxC:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
