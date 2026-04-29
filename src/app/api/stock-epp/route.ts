import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

/**
 * GET /api/stock-epp
 * Lista el stock de EPPs por almacén con info del catálogo.
 * Query params:
 *  - almacenId? (filtrar por almacén)
 *  - subcategoria? (filtrar por sub-categoría EPP)
 *  - soloDisponibles=true (excluir items con cantidadDisponible<=0)
 *  - busqueda? (texto en código/descripción/marca)
 */
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const almacenId = searchParams.get('almacenId')
    const subcategoria = searchParams.get('subcategoria')
    const soloDisponibles = searchParams.get('soloDisponibles') === 'true'
    const busqueda = searchParams.get('busqueda')

    const where: any = {
      catalogoEppId: { not: null },
    }
    if (almacenId) where.almacenId = almacenId
    if (soloDisponibles) where.cantidadDisponible = { gt: 0 }
    if (subcategoria || busqueda) {
      where.catalogoEpp = {}
      if (subcategoria) where.catalogoEpp.subcategoria = subcategoria
      if (busqueda) {
        where.catalogoEpp.OR = [
          { codigo: { contains: busqueda, mode: 'insensitive' } },
          { descripcion: { contains: busqueda, mode: 'insensitive' } },
          { marca: { contains: busqueda, mode: 'insensitive' } },
        ]
      }
    }

    const data = await prisma.stockAlmacen.findMany({
      where,
      include: {
        almacen: { select: { id: true, nombre: true } },
        catalogoEpp: {
          include: { unidad: { select: { nombre: true } } },
        },
      },
      orderBy: [
        { catalogoEpp: { subcategoria: 'asc' } },
        { catalogoEpp: { codigo: 'asc' } },
      ],
    })

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error al obtener stock EPP:', error)
    return NextResponse.json({ error: 'Error al obtener stock EPP' }, { status: 500 })
  }
}
