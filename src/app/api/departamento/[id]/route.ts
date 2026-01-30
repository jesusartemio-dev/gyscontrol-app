import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const data = await prisma.departamento.findUnique({
      where: { id },
      include: {
        responsable: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        cargos: {
          include: {
            _count: { select: { empleados: true } }
          }
        }
      }
    })

    if (!data) {
      return NextResponse.json({ error: 'Departamento no encontrado' }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('❌ Error al obtener departamento:', error)
    return NextResponse.json({ error: 'Error al obtener departamento' }, { status: 500 })
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()

    const updateData: Record<string, unknown> = {}
    if (body.nombre !== undefined) updateData.nombre = body.nombre
    if (body.descripcion !== undefined) updateData.descripcion = body.descripcion
    if (body.responsableId !== undefined) updateData.responsableId = body.responsableId || null
    if (body.activo !== undefined) updateData.activo = body.activo

    const data = await prisma.departamento.update({
      where: { id },
      data: updateData,
      include: {
        responsable: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    })
    return NextResponse.json(data)
  } catch (error) {
    console.error('❌ Error al actualizar departamento:', error)
    return NextResponse.json({ error: 'Error al actualizar departamento' }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    // Verificar si tiene cargos asociados
    const departamento = await prisma.departamento.findUnique({
      where: { id },
      include: { _count: { select: { cargos: true } } }
    })

    if (departamento?._count.cargos && departamento._count.cargos > 0) {
      return NextResponse.json(
        { message: `No se puede eliminar: hay ${departamento._count.cargos} cargo(s) en este departamento` },
        { status: 400 }
      )
    }

    await prisma.departamento.delete({
      where: { id },
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('❌ Error al eliminar departamento:', error)
    return NextResponse.json({ error: 'Error al eliminar departamento' }, { status: 500 })
  }
}
