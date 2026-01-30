import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const data = await prisma.empleado.findUnique({
      where: { id },
      include: {
        cargo: true,
        departamento: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            image: true,
          }
        },
        recursoComposiciones: {
          include: {
            recurso: {
              select: {
                id: true,
                nombre: true,
                tipo: true,
                costoHora: true,
              }
            }
          }
        }
      }
    })

    if (!data) {
      return NextResponse.json({ error: 'Empleado no encontrado' }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('❌ Error al obtener empleado:', error)
    return NextResponse.json({ error: 'Error al obtener empleado' }, { status: 500 })
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()

    const updateData: Record<string, unknown> = {}

    if (body.cargoId !== undefined) updateData.cargoId = body.cargoId || null
    if (body.departamentoId !== undefined) updateData.departamentoId = body.departamentoId || null
    if (body.sueldoPlanilla !== undefined) updateData.sueldoPlanilla = body.sueldoPlanilla ? parseFloat(body.sueldoPlanilla) : null
    if (body.sueldoHonorarios !== undefined) updateData.sueldoHonorarios = body.sueldoHonorarios ? parseFloat(body.sueldoHonorarios) : null
    if (body.fechaIngreso !== undefined) updateData.fechaIngreso = body.fechaIngreso ? new Date(body.fechaIngreso) : null
    if (body.fechaCese !== undefined) updateData.fechaCese = body.fechaCese ? new Date(body.fechaCese) : null
    if (body.activo !== undefined) updateData.activo = body.activo
    if (body.documentoIdentidad !== undefined) updateData.documentoIdentidad = body.documentoIdentidad
    if (body.telefono !== undefined) updateData.telefono = body.telefono
    if (body.direccion !== undefined) updateData.direccion = body.direccion
    if (body.contactoEmergencia !== undefined) updateData.contactoEmergencia = body.contactoEmergencia
    if (body.telefonoEmergencia !== undefined) updateData.telefonoEmergencia = body.telefonoEmergencia
    if (body.observaciones !== undefined) updateData.observaciones = body.observaciones

    const data = await prisma.empleado.update({
      where: { id },
      data: updateData,
      include: {
        cargo: true,
        departamento: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          }
        }
      }
    })
    return NextResponse.json(data)
  } catch (error) {
    console.error('❌ Error al actualizar empleado:', error)
    return NextResponse.json({ error: 'Error al actualizar empleado' }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    // Verificar si tiene composiciones de recurso asociadas
    const empleado = await prisma.empleado.findUnique({
      where: { id },
      include: { recursoComposiciones: true }
    })

    if (empleado?.recursoComposiciones.length) {
      return NextResponse.json(
        { message: 'No se puede eliminar: el empleado está asignado a recursos' },
        { status: 400 }
      )
    }

    await prisma.empleado.delete({
      where: { id },
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('❌ Error al eliminar empleado:', error)
    return NextResponse.json({ error: 'Error al eliminar empleado' }, { status: 500 })
  }
}
