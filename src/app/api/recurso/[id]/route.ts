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
        },
        perfiles: {
          include: {
            recursoMiembro: {
              include: {
                composiciones: {
                  where: { activo: true },
                  include: { empleado: empleadoInclude }
                }
              }
            }
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
    const { composiciones, perfiles, ...recursoData } = body

    // Nunca cuadrillas anidadas — ver mismo check en POST /api/recurso.
    if (perfiles?.length > 0) {
      const miembros = await prisma.recurso.findMany({
        where: { id: { in: perfiles.map((p: { recursoMiembroId: string }) => p.recursoMiembroId) } },
        select: { id: true, tipo: true, nombre: true },
      })
      const invalidos = miembros.filter(m => m.tipo !== 'individual')
      if (invalidos.length > 0) {
        return NextResponse.json({
          error: `Los perfiles de una cuadrilla deben ser recursos individuales. "${invalidos.map(m => m.nombre).join(', ')}" no lo son.`,
        }, { status: 400 })
      }
    }

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

    // Si se envían composiciones (individual), reemplazar las existentes.
    // Reemplazo total sin diff — pierde `id`/`createdAt` de filas existentes
    // (mismo comportamiento que ya tenía este endpoint, no se cambia acá).
    if (composiciones !== undefined) {
      await prisma.recursoComposicion.deleteMany({
        where: { recursoId: id }
      })
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

    // Si se envían perfiles (cuadrilla), reemplazar los existentes — mismo
    // patrón de reemplazo total que composiciones arriba.
    if (perfiles !== undefined) {
      await prisma.recursoPerfil.deleteMany({
        where: { recursoId: id }
      })
      if (perfiles.length > 0) {
        await prisma.recursoPerfil.createMany({
          data: perfiles.map((p: { recursoMiembroId: string; cantidad?: number }) => ({
            recursoId: id,
            recursoMiembroId: p.recursoMiembroId,
            cantidad: p.cantidad || 1,
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
        },
        perfiles: {
          include: {
            recursoMiembro: {
              include: {
                composiciones: {
                  where: { activo: true },
                  include: { empleado: empleadoInclude }
                }
              }
            }
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
    // Nota (informe §13/análisis de recursos): este pre-check YA no cubría
    // TarifaClienteRecurso/LineaHH/PlantillaOrgNodo/ProyectoOrgNodo antes de
    // esta sesión (deuda preexistente, fuera de alcance acá) — se agrega acá
    // `usadoEnPerfiles` porque es la relación NUEVA que introduce esta sesión.
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
            usadoEnPerfiles: true,
          }
        }
      }
    })

    if (!usage) {
      return NextResponse.json({ error: 'Recurso no encontrado' }, { status: 404 })
    }

    const refs = usage._count
    const totalUsos = refs.catalogoServicio + refs.cotizacionServicioItem +
      refs.registroHoras + refs.plantillaServicioItem + refs.plantillaServicioItemIndependiente +
      refs.usadoEnPerfiles

    if (totalUsos > 0) {
      const detalles: string[] = []
      if (refs.catalogoServicio > 0) detalles.push(`${refs.catalogoServicio} servicio(s) del catálogo`)
      if (refs.cotizacionServicioItem > 0) detalles.push(`${refs.cotizacionServicioItem} ítem(s) de cotización`)
      if (refs.registroHoras > 0) detalles.push(`${refs.registroHoras} registro(s) de horas`)
      if (refs.plantillaServicioItem > 0) detalles.push(`${refs.plantillaServicioItem} ítem(s) de plantilla`)
      if (refs.usadoEnPerfiles > 0) detalles.push(`${refs.usadoEnPerfiles} cuadrilla(s) lo usan como perfil`)
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
