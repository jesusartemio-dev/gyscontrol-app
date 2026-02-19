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
    const { composiciones, ...recursoData } = body

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
        ...(composiciones?.length > 0 && {
          composiciones: {
            create: composiciones.map((comp: { empleadoId: string; cantidad?: number; horasAsignadas?: number; rol?: string }) => ({
              empleadoId: comp.empleadoId,
              cantidad: comp.cantidad || 1,
              horasAsignadas: comp.horasAsignadas,
              rol: comp.rol,
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
        }
      }
    })
    return NextResponse.json(data)
  } catch (error) {
    console.error('❌ Error en POST /recurso:', error)
    return NextResponse.json({ error: 'Error al crear recurso' }, { status: 500 })
  }
}
