import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

/** GET /api/catalogo-equipo/filtros — categorías y marcas disponibles */
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const [categorias, marcasRaw] = await Promise.all([
      prisma.categoriaEquipo.findMany({
        select: { id: true, nombre: true },
        orderBy: { nombre: 'asc' },
      }),
      prisma.catalogoEquipo.findMany({
        select: { marca: true },
        distinct: ['marca'],
        orderBy: { marca: 'asc' },
      }),
    ])

    return NextResponse.json({
      categorias,
      marcas: marcasRaw.map(r => r.marca).filter(Boolean),
    })
  } catch (error) {
    console.error('[catalogo-equipo/filtros]', error)
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}
