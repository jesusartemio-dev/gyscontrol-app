import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const soloActivos = searchParams.get('activos') === 'true'

    const origenFilter = searchParams.get('origen') as 'propio' | 'externo' | null

    const where: Record<string, unknown> = {}
    if (soloActivos) where.activo = true
    if (origenFilter) where.origen = origenFilter

    const data = await prisma.recurso.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      orderBy: { orden: 'asc' },
      include: {
        // Solo aplica a tipo='individual' — pool de empleados de referencia de costo.
        composiciones: {
          where: { activo: true },
          include: {
            empleado: {
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
          }
        },
        // Solo aplica a tipo='cuadrilla' — perfiles (recursos individuales) que la componen.
        // recursoMiembro trae SU PROPIA composición (pool) para poder calcular su costo
        // promedio (calcularCostoRealCuadrillaPorPerfiles en src/lib/costos.ts).
        perfiles: {
          where: { activo: true },
          include: {
            recursoMiembro: {
              include: {
                composiciones: {
                  where: { activo: true },
                  include: {
                    empleado: {
                      include: {
                        user: { select: { id: true, name: true, email: true } },
                        cargo: { select: { id: true, nombre: true } },
                      }
                    }
                  }
                }
              }
            }
          }
        },
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
    return NextResponse.json(data)
  } catch (error) {
    console.error('❌ Error en GET /recurso:', error)
    return NextResponse.json({ error: 'Error al listar recursos' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { composiciones, perfiles, ...recursoData } = body

    // Nunca cuadrillas anidadas: un perfil de cuadrilla debe ser un recurso
    // tipo='individual'. Prisma no puede validar esto por FK (no hay check
    // constraint sobre un enum de otra fila) — se valida acá.
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

    const data = await prisma.recurso.create({
      data: {
        id: randomUUID(),
        updatedAt: new Date(),
        nombre: recursoData.nombre,
        tipo: recursoData.tipo || 'individual',
        origen: recursoData.origen || 'propio',
        costoHora: recursoData.costoHora,
        costoHoraProyecto: recursoData.costoHoraProyecto ?? null,
        descripcion: recursoData.descripcion,
        orden: recursoData.orden ?? 0,
        // Solo aplica a tipo='individual' — pool de empleados de referencia de costo.
        ...(composiciones?.length > 0 && {
          composiciones: {
            create: composiciones.map((comp: { empleadoId: string; cantidad?: number; horasAsignadas?: number; rol?: string }) => ({
              empleadoId: comp.empleadoId,
              cantidad: comp.cantidad || 1,
              horasAsignadas: comp.horasAsignadas,
              rol: comp.rol,
            }))
          }
        }),
        // Solo aplica a tipo='cuadrilla' — perfiles (recursos individuales) que la componen.
        ...(perfiles?.length > 0 && {
          perfiles: {
            create: perfiles.map((p: { recursoMiembroId: string; cantidad?: number }) => ({
              recursoMiembroId: p.recursoMiembroId,
              cantidad: p.cantidad || 1,
            }))
          }
        })
      },
      include: {
        composiciones: {
          include: {
            empleado: {
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
          }
        },
        perfiles: {
          include: { recursoMiembro: true }
        }
      }
    })
    return NextResponse.json(data)
  } catch (error) {
    console.error('❌ Error en POST /recurso:', error)
    return NextResponse.json({ error: 'Error al crear recurso' }, { status: 500 })
  }
}
