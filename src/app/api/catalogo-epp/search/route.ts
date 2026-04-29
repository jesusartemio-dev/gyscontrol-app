import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

/**
 * GET /api/catalogo-epp/search?q=xxx
 * Autocomplete liviano para selectores.
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

    const limitParam = req.nextUrl.searchParams.get('limit')
    const take = limitParam ? Math.min(parseInt(limitParam) || 15, 50) : 15

    const items = await prisma.catalogoEPP.findMany({
      where: {
        activo: true,
        OR: [
          { codigo: { contains: q, mode: 'insensitive' } },
          { descripcion: { contains: q, mode: 'insensitive' } },
          { marca: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        codigo: true,
        descripcion: true,
        marca: true,
        modelo: true,
        subcategoria: true,
        requiereTalla: true,
        tallaCampo: true,
        vidaUtilDias: true,
        precioReferencial: true,
        monedaReferencial: true,
        unidad: { select: { nombre: true } },
      },
      take,
      orderBy: { codigo: 'asc' },
    })

    return NextResponse.json(items)
  } catch (error) {
    console.error('Error en búsqueda EPP:', error)
    return NextResponse.json({ error: 'Error en búsqueda' }, { status: 500 })
  }
}
