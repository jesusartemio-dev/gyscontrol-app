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

    const existing = await prisma.cuentaPorPagar.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Cuenta por pagar no encontrada' }, { status: 404 })
    }

    // Anular
    if (body.estado === 'anulada') {
      if (existing.estado === 'anulada') {
        return NextResponse.json({ error: 'La cuenta ya está anulada' }, { status: 400 })
      }
      const updated = await prisma.cuentaPorPagar.update({
        where: { id },
        data: { estado: 'anulada', updatedAt: new Date() },
      })
      return NextResponse.json(updated)
    }

    // Transition pendiente_documentos → pendiente
    if (body.estado === 'pendiente' && existing.estado === 'pendiente_documentos') {
      const updated = await prisma.cuentaPorPagar.update({
        where: { id },
        data: { estado: 'pendiente', updatedAt: new Date() },
      })
      return NextResponse.json(updated)
    }

    return NextResponse.json({ error: 'Operación no soportada' }, { status: 400 })
  } catch (error) {
    console.error('Error al actualizar CxP:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
