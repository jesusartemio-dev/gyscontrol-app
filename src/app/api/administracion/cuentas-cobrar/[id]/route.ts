import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { canDelete } from '@/lib/utils/deleteValidation'

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

    // Editar campos administrativos (no toca monto/saldo/estado financiero — solo metadata)
    const editableFields = [
      'fechaRecepcion', 'ordenCompraCliente', 'numeroNegociacion',
      'bancoFinanciera', 'tipoCambio', 'diasCredito', 'observaciones',
      'descripcion', 'numeroDocumento',
    ] as const

    const data: Record<string, any> = {}
    for (const field of editableFields) {
      if (field in body) {
        const value = body[field]
        if (field === 'fechaRecepcion') {
          data[field] = value ? new Date(value) : null
        } else {
          data[field] = value === '' ? null : value
        }
      }
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No hay campos para actualizar' }, { status: 400 })
    }

    data.updatedAt = new Date()
    const updated = await prisma.cuentaPorCobrar.update({ where: { id }, data })
    return NextResponse.json(updated)
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

    // 🛡️ Validar dependientes antes de eliminar
    const deleteCheck = await canDelete('cuentaPorCobrar', id)
    if (!deleteCheck.allowed) {
      return NextResponse.json(
        { error: deleteCheck.message, blockers: deleteCheck.blockers },
        { status: 409 }
      )
    }

    // Eliminar CxC (pagos y adjuntos se eliminan por cascade)
    await prisma.cuentaPorCobrar.delete({ where: { id } })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error al eliminar CxC:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
