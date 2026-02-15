import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const data = await prisma.centroCosto.findUnique({
      where: { id },
    })
    if (!data) {
      return NextResponse.json({ error: 'Centro de costo no encontrado' }, { status: 404 })
    }
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error al obtener centro de costo:', error)
    return NextResponse.json({ error: 'Error al obtener centro de costo' }, { status: 500 })
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !['admin', 'gerente'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const { id } = await params
    const payload = await req.json()

    if (payload.tipo !== undefined) {
      const tiposValidos = ['departamento', 'administrativo']
      if (!tiposValidos.includes(payload.tipo)) {
        return NextResponse.json({ error: `Tipo inválido. Valores permitidos: ${tiposValidos.join(', ')}` }, { status: 400 })
      }
    }

    const updateData: any = { updatedAt: new Date() }
    if (payload.nombre !== undefined) updateData.nombre = payload.nombre.trim()
    if (payload.tipo !== undefined) updateData.tipo = payload.tipo
    if (payload.descripcion !== undefined) updateData.descripcion = payload.descripcion
    if (payload.activo !== undefined) updateData.activo = payload.activo

    const data = await prisma.centroCosto.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(data)
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'Ya existe un centro de costo con ese nombre' }, { status: 409 })
    }
    console.error('Error al actualizar centro de costo:', error)
    return NextResponse.json({ error: 'Error al actualizar centro de costo' }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !['admin', 'gerente'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const { id } = await params

    // Soft delete - set activo = false
    await prisma.centroCosto.update({
      where: { id },
      data: { activo: false, updatedAt: new Date() },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error al eliminar centro de costo:', error)
    return NextResponse.json({ error: 'Error al eliminar centro de costo' }, { status: 500 })
  }
}
