import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const desde = searchParams.get('desde')
  const hasta = searchParams.get('hasta')
  const tipo = searchParams.get('tipo')
  const catalogoEquipoId = searchParams.get('catalogoEquipoId')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500)

  const where: any = {}
  if (desde) where.fechaMovimiento = { gte: new Date(desde) }
  if (hasta) where.fechaMovimiento = { ...where.fechaMovimiento, lte: new Date(hasta + 'T23:59:59') }
  if (tipo) where.tipo = tipo
  if (catalogoEquipoId) where.catalogoEquipoId = catalogoEquipoId

  const [total, movimientos] = await Promise.all([
    prisma.movimientoAlmacen.count({ where }),
    prisma.movimientoAlmacen.findMany({
      where,
      include: {
        usuario: { select: { name: true, email: true } },
        catalogoEquipo: { select: { codigo: true, descripcion: true } },
        catalogoHerramienta: { select: { codigo: true, nombre: true } },
        herramientaUnidad: { select: { serie: true } },
      },
      orderBy: { fechaMovimiento: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ])

  return NextResponse.json({ total, movimientos })
}
