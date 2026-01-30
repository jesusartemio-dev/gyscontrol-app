import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const data = await prisma.cargo.findUnique({
      where: { id },
      include: {
        departamento: true,
        empleados: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              }
            }
          }
        }
      }
    })

    if (!data) {
      return NextResponse.json({ error: 'Cargo no encontrado' }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('❌ Error al obtener cargo:', error)
    return NextResponse.json({ error: 'Error al obtener cargo' }, { status: 500 })
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()

    const updateData: Record<string, unknown> = {}
    if (body.nombre !== undefined) updateData.nombre = body.nombre
    if (body.descripcion !== undefined) updateData.descripcion = body.descripcion
    if (body.sueldoBase !== undefined) updateData.sueldoBase = body.sueldoBase ? parseFloat(body.sueldoBase) : null
    if (body.departamentoId !== undefined) updateData.departamentoId = body.departamentoId || null
    if (body.activo !== undefined) updateData.activo = body.activo

    const data = await prisma.cargo.update({
      where: { id },
      data: updateData,
      include: {
        departamento: true,
      }
    })
    return NextResponse.json(data)
  } catch (error) {
    console.error('❌ Error al actualizar cargo:', error)
    return NextResponse.json({ error: 'Error al actualizar cargo' }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    // Verificar si tiene empleados asociados
    const cargo = await prisma.cargo.findUnique({
      where: { id },
      include: { _count: { select: { empleados: true } } }
    })

    if (cargo?._count.empleados && cargo._count.empleados > 0) {
      return NextResponse.json(
        { message: `No se puede eliminar: hay ${cargo._count.empleados} empleado(s) con este cargo` },
        { status: 400 }
      )
    }

    await prisma.cargo.delete({
      where: { id },
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('❌ Error al eliminar cargo:', error)
    return NextResponse.json({ error: 'Error al eliminar cargo' }, { status: 500 })
  }
}
