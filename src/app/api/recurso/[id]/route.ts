import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

const empleadoInclude = {
  include: {
    user: {
      select: {
        id: true,
        name: true,
        email: true,
      }
    },
    cargo: {
      select: {
        id: true,
        nombre: true,
      }
    }
  }
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const data = await prisma.recurso.findUnique({
      where: { id },
      include: {
        composiciones: {
          include: {
            empleado: empleadoInclude
          }
        }
      }
    })
    if (!data) {
      return NextResponse.json({ error: 'Recurso no encontrado' }, { status: 404 })
    }
    return NextResponse.json(data)
  } catch (error) {
    console.error('❌ Error al obtener recurso:', error)
    return NextResponse.json({ error: 'Error al obtener recurso' }, { status: 500 })
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const { composiciones, ...recursoData } = body

    // Actualizar recurso
    const updateData: Record<string, unknown> = {}
    if (recursoData.nombre !== undefined) updateData.nombre = recursoData.nombre
    if (recursoData.tipo !== undefined) updateData.tipo = recursoData.tipo
    if (recursoData.costoHora !== undefined) updateData.costoHora = recursoData.costoHora
    if (recursoData.descripcion !== undefined) updateData.descripcion = recursoData.descripcion
    if (recursoData.orden !== undefined) updateData.orden = recursoData.orden

    // Si se envían composiciones, reemplazar las existentes
    if (composiciones !== undefined) {
      // Eliminar composiciones existentes
      await prisma.recursoComposicion.deleteMany({
        where: { recursoId: id }
      })

      // Crear nuevas composiciones si hay
      if (composiciones.length > 0) {
        await prisma.recursoComposicion.createMany({
          data: composiciones.map((comp: { empleadoId: string; porcentaje?: number; horasAsignadas?: number; rol?: string }) => ({
            recursoId: id,
            empleadoId: comp.empleadoId,
            porcentaje: comp.porcentaje || 100,
            horasAsignadas: comp.horasAsignadas,
            rol: comp.rol,
          }))
        })
      }
    }

    const data = await prisma.recurso.update({
      where: { id },
      data: updateData,
      include: {
        composiciones: {
          include: {
            empleado: empleadoInclude
          }
        }
      }
    })
    return NextResponse.json(data)
  } catch (error) {
    console.error('❌ Error al actualizar recurso:', error)
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const data = await prisma.recurso.delete({
      where: { id },
    })
    return NextResponse.json(data)
  } catch (error) {
    console.error('❌ Error al eliminar recurso:', error)
    return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 })
  }
}
