import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const catalogoEquipoId = searchParams.get('catalogoEquipoId')
  const catalogoHerramientaId = searchParams.get('catalogoHerramientaId')
  const busqueda = searchParams.get('q') || ''
  const soloConStock = searchParams.get('soloConStock') === 'true'

  const where: any = { almacen: { activo: true } }
  if (catalogoEquipoId) where.catalogoEquipoId = catalogoEquipoId
  if (catalogoHerramientaId) where.catalogoHerramientaId = catalogoHerramientaId
  if (soloConStock) where.cantidadDisponible = { gt: 0 }

  if (busqueda) {
    where.OR = [
      { catalogoEquipo: { descripcion: { contains: busqueda, mode: 'insensitive' } } },
      { catalogoEquipo: { codigo: { contains: busqueda, mode: 'insensitive' } } },
      { catalogoHerramienta: { nombre: { contains: busqueda, mode: 'insensitive' } } },
      { catalogoHerramienta: { codigo: { contains: busqueda, mode: 'insensitive' } } },
    ]
  }

  const stock = await prisma.stockAlmacen.findMany({
    where,
    include: {
      almacen: { select: { id: true, nombre: true } },
      catalogoEquipo: {
        select: {
          id: true,
          codigo: true,
          descripcion: true,
          marca: true,
          categoriaEquipo: { select: { id: true, nombre: true } },
          unidad: { select: { id: true, nombre: true } },
        },
      },
      catalogoHerramienta: { select: { id: true, codigo: true, nombre: true, categoria: true, gestionPorUnidad: true } },
    },
    orderBy: { cantidadDisponible: 'desc' },
  })

  return NextResponse.json(stock)
}
