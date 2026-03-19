import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

/**
 * GET /api/catalogo-equipo/search?q=xxx
 * Lightweight search for autocomplete — returns max 10 results matching code or description.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const q = req.nextUrl.searchParams.get('q')?.trim()
    if (!q || q.length < 2) {
      return NextResponse.json([])
    }

    const items = await prisma.catalogoEquipo.findMany({
      where: {
        OR: [
          { codigo: { contains: q, mode: 'insensitive' } },
          { descripcion: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        codigo: true,
        descripcion: true,
        marca: true,
        precioLogistica: true,
        precioReal: true,
        precioInterno: true,
        unidad: { select: { nombre: true } },
      },
      take: 10,
      orderBy: { codigo: 'asc' },
    })

    return NextResponse.json(items)
  } catch (error) {
    console.error('Error en búsqueda de catálogo:', error)
    return NextResponse.json({ error: 'Error en búsqueda' }, { status: 500 })
  }
}
