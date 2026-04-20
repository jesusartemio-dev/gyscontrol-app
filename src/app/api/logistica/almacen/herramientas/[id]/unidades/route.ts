import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { registrarMovimiento, getAlmacenCentral } from '@/lib/services/almacen'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params
  const unidades = await prisma.herramientaUnidad.findMany({
    where: { catalogoHerramientaId: id },
    orderBy: { serie: 'asc' },
  })
  return NextResponse.json(unidades)
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const role = session.user.role
  if (!['admin', 'gerente', 'coordinador_logistico'].includes(role)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json()
  const { series } = body // array of { serie, codigoQR? }

  if (!series?.length) return NextResponse.json({ error: 'series requeridas' }, { status: 400 })

  try {
    const almacen = await getAlmacenCentral()
    const creadas = await prisma.$transaction(async (tx) => {
      const result = []
      for (const s of series) {
        const unidad = await tx.herramientaUnidad.create({
          data: {
            catalogoHerramientaId: id,
            serie: s.serie,
            codigoQR: s.codigoQR || null,
            almacenId: almacen.id,
          },
        })
        await registrarMovimiento({
          almacenId: almacen.id,
          tipo: 'alta_herramienta',
          herramientaUnidadId: unidad.id,
          cantidad: 1,
          usuarioId: session.user.id,
          observaciones: `Alta de unidad serializada: ${s.serie}`,
        }, tx as any)
        result.push(unidad)
      }
      return result
    })
    return NextResponse.json(creadas, { status: 201 })
  } catch (error: any) {
    if (error?.code === 'P2002') return NextResponse.json({ error: 'Serie duplicada' }, { status: 409 })
    return NextResponse.json({ error: 'Error al crear unidades' }, { status: 500 })
  }
}
