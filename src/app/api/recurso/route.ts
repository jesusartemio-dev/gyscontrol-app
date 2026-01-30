import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'

export async function GET() {
  try {
    const data = await prisma.recurso.findMany({
      orderBy: { nombre: 'asc' },
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
        costoHora: recursoData.costoHora,
        descripcion: recursoData.descripcion,
        ...(composiciones?.length > 0 && {
          composiciones: {
            create: composiciones.map((comp: { empleadoId: string; porcentaje?: number; horasAsignadas?: number; rol?: string }) => ({
              empleadoId: comp.empleadoId,
              porcentaje: comp.porcentaje || 100,
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
