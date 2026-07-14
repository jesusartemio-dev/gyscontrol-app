import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !['admin', 'gerente'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const { id } = await params
    const payload = await req.json()

    const updateData: Record<string, unknown> = {}
    if (payload.costoAlmuerzo !== undefined) {
      const costoAlmuerzo = Number(payload.costoAlmuerzo)
      if (!Number.isFinite(costoAlmuerzo) || costoAlmuerzo < 0) {
        return NextResponse.json({ error: 'costoAlmuerzo debe ser un número válido mayor o igual a 0' }, { status: 400 })
      }
      updateData.costoAlmuerzo = costoAlmuerzo
    }
    if (payload.costoMovilidad !== undefined) {
      const costoMovilidad = Number(payload.costoMovilidad)
      if (!Number.isFinite(costoMovilidad) || costoMovilidad < 0) {
        return NextResponse.json({ error: 'costoMovilidad debe ser un número válido mayor o igual a 0' }, { status: 400 })
      }
      updateData.costoMovilidad = costoMovilidad
    }
    if (payload.activo !== undefined) updateData.activo = Boolean(payload.activo)

    const data = await prisma.tarifaCampoPersonal.update({
      where: { id },
      data: updateData,
      include: {
        cliente: { select: { id: true, nombre: true } },
        usuario: { select: { id: true, name: true, email: true } },
      },
    })

    return NextResponse.json(data)
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return NextResponse.json({ error: 'Tarifa no encontrada' }, { status: 404 })
    }
    console.error('Error al actualizar tarifa de campo:', error)
    return NextResponse.json({ error: 'Error al actualizar tarifa de campo' }, { status: 500 })
  }
}

// Soft delete: se desactiva en vez de borrarse para no perder trazabilidad de los
// REQ del día que ya se crearon usando el monto vigente en ese momento.
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !['admin', 'gerente'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const { id } = await params
    await prisma.tarifaCampoPersonal.update({
      where: { id },
      data: { activo: false },
    })

    return NextResponse.json({ success: true, action: 'desactivado' })
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return NextResponse.json({ error: 'Tarifa no encontrada' }, { status: 404 })
    }
    console.error('Error al eliminar tarifa de campo:', error)
    return NextResponse.json({ error: 'Error al eliminar tarifa de campo' }, { status: 500 })
  }
}
