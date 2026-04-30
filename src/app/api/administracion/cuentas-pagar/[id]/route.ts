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

    // Editar campos administrativos (no toca monto/saldo/estado financiero)
    const editableFields = [
      'numeroFactura', 'descripcion', 'observaciones',
      'tipoCambio', 'diasCredito', 'condicionPago', 'formaPago',
      'detraccionPorcentaje',
    ] as const

    const data: Record<string, any> = {}
    for (const field of editableFields) {
      if (field in body) {
        const value = body[field]
        data[field] = value === '' ? null : value
      }
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No hay campos para actualizar' }, { status: 400 })
    }

    data.updatedAt = new Date()
    const updated = await prisma.cuentaPorPagar.update({ where: { id }, data })

    // Auto-aprender el % por proveedor si pidieron guardar como default
    if (body.guardarDetraccionDefault && data.detraccionPorcentaje != null && !isNaN(Number(data.detraccionPorcentaje))) {
      await prisma.proveedor.update({
        where: { id: existing.proveedorId },
        data: { detraccionPorcentajeDefault: Number(data.detraccionPorcentaje) },
      })
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error al actualizar CxP:', error)
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
    const deleteCheck = await canDelete('cuentaPorPagar', id)
    if (!deleteCheck.allowed) {
      return NextResponse.json(
        { error: deleteCheck.message, blockers: deleteCheck.blockers },
        { status: 409 }
      )
    }

    // Eliminar CxP (pagos y adjuntos se eliminan por cascade)
    await prisma.cuentaPorPagar.delete({ where: { id } })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error al eliminar CxP:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
