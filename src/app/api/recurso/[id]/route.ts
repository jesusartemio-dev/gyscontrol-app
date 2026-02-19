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
    if (recursoData.origen !== undefined) updateData.origen = recursoData.origen
    if (recursoData.costoHora !== undefined) updateData.costoHora = recursoData.costoHora
    if (recursoData.costoHoraProyecto !== undefined) updateData.costoHoraProyecto = recursoData.costoHoraProyecto
    if (recursoData.descripcion !== undefined) updateData.descripcion = recursoData.descripcion
    if (recursoData.orden !== undefined) updateData.orden = recursoData.orden
    if (recursoData.activo !== undefined) updateData.activo = recursoData.activo

    // Si se envían composiciones, reemplazar las existentes
    if (composiciones !== undefined) {
      // Eliminar composiciones existentes
      await prisma.recursoComposicion.deleteMany({
        where: { recursoId: id }
      })

      // Crear nuevas composiciones si hay
      if (composiciones.length > 0) {
        await prisma.recursoComposicion.createMany({
          data: composiciones.map((comp: { empleadoId: string; cantidad?: number; horasAsignadas?: number; rol?: string }) => ({
            recursoId: id,
            empleadoId: comp.empleadoId,
            cantidad: comp.cantidad || 1,
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

    // Pre-flight: check usage across all related models
    const usage = await prisma.recurso.findUnique({
      where: { id },
      select: {
        nombre: true,
        _count: {
          select: {
            catalogoServicio: true,
            cotizacionServicioItem: true,
            registroHoras: true,
            plantillaServicioItem: true,
            plantillaServicioItemIndependiente: true,
          }
        }
      }
    })

    if (!usage) {
      return NextResponse.json({ error: 'Recurso no encontrado' }, { status: 404 })
    }

    const refs = usage._count
    const totalUsos = refs.catalogoServicio + refs.cotizacionServicioItem +
      refs.registroHoras + refs.plantillaServicioItem + refs.plantillaServicioItemIndependiente

    if (totalUsos > 0) {
      const detalles: string[] = []
      if (refs.catalogoServicio > 0) detalles.push(`${refs.catalogoServicio} servicio(s) del catálogo`)
      if (refs.cotizacionServicioItem > 0) detalles.push(`${refs.cotizacionServicioItem} ítem(s) de cotización`)
      if (refs.registroHoras > 0) detalles.push(`${refs.registroHoras} registro(s) de horas`)
      if (refs.plantillaServicioItem > 0) detalles.push(`${refs.plantillaServicioItem} ítem(s) de plantilla`)
      if (refs.plantillaServicioItemIndependiente > 0) detalles.push(`${refs.plantillaServicioItemIndependiente} ítem(s) de plantilla independiente`)

      return NextResponse.json({
        error: `No se puede eliminar "${usage.nombre}" porque está en uso`,
        detalles,
        totalUsos,
        sugerencia: 'Puedes desactivar el recurso en lugar de eliminarlo'
      }, { status: 409 })
    }

    const data = await prisma.recurso.delete({ where: { id } })
    return NextResponse.json(data)
  } catch (error) {
    console.error('❌ Error al eliminar recurso:', error)
    return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 })
  }
}
