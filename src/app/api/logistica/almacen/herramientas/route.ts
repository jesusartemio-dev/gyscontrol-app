import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { registrarMovimiento, getAlmacenCentral } from '@/lib/services/almacen'

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const busqueda = searchParams.get('q') || ''
  const soloActivos = searchParams.get('soloActivos') !== 'false'

  const where: any = {}
  if (soloActivos) where.activo = true
  if (busqueda) {
    where.OR = [
      { nombre: { contains: busqueda, mode: 'insensitive' } },
      { codigo: { contains: busqueda, mode: 'insensitive' } },
      { categoria: { contains: busqueda, mode: 'insensitive' } },
    ]
  }

  const herramientas = await prisma.catalogoHerramienta.findMany({
    where,
    include: {
      stock: { select: { cantidadDisponible: true } },
      unidades: {
        select: { id: true, estado: true, serie: true },
      },
      _count: { select: { unidades: true } },
    },
    orderBy: { nombre: 'asc' },
  })

  // Cantidad prestada actual (solo bulk): suma de (prestada - devuelta) en items aún no cerrados.
  // Para herramientas serializadas, el estado de cada unidad ya refleja si está prestada.
  const bulkIds = herramientas.filter(h => !h.gestionPorUnidad).map(h => h.id)
  const prestadosMap = new Map<string, number>()
  if (bulkIds.length > 0) {
    const grupos = await prisma.prestamoHerramientaItem.groupBy({
      by: ['catalogoHerramientaId'],
      where: {
        catalogoHerramientaId: { in: bulkIds },
        estado: 'prestado',
      },
      _sum: { cantidadPrestada: true, cantidadDevuelta: true },
    })
    for (const g of grupos) {
      if (!g.catalogoHerramientaId) continue
      const pendiente = (g._sum.cantidadPrestada || 0) - (g._sum.cantidadDevuelta || 0)
      if (pendiente > 0) prestadosMap.set(g.catalogoHerramientaId, pendiente)
    }
  }

  const enriquecidas = herramientas.map(h => ({
    ...h,
    prestadosActivos: h.gestionPorUnidad
      ? h.unidades.filter(u => u.estado === 'prestada').length
      : (prestadosMap.get(h.id) || 0),
  }))

  return NextResponse.json(enriquecidas)
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const role = session.user.role
  if (!['admin', 'gerente', 'coordinador_logistico', 'logistico'].includes(role)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { codigo, nombre, categoria, descripcion, fotoUrl, gestionPorUnidad, unidadMedida, cantidadInicial } = body

    if (!codigo || !nombre || !categoria) {
      return NextResponse.json({ error: 'codigo, nombre y categoria son requeridos' }, { status: 400 })
    }

    const herramienta = await prisma.catalogoHerramienta.create({
      data: { codigo, nombre, categoria, descripcion, fotoUrl, gestionPorUnidad: !!gestionPorUnidad, unidadMedida: unidadMedida || 'unidad' },
    })

    // Si hay cantidad inicial y no es por unidad, registrar alta de herramienta
    if (cantidadInicial && cantidadInicial > 0 && !gestionPorUnidad) {
      const almacen = await getAlmacenCentral()
      await registrarMovimiento({
        almacenId: almacen.id,
        tipo: 'alta_herramienta',
        catalogoHerramientaId: herramienta.id,
        cantidad: cantidadInicial,
        usuarioId: session.user.id,
        observaciones: 'Alta inicial de herramienta',
      })
    }

    return NextResponse.json(herramienta, { status: 201 })
  } catch (error: any) {
    if (error?.code === 'P2002') return NextResponse.json({ error: 'El código ya existe' }, { status: 409 })
    return NextResponse.json({ error: 'Error al crear herramienta' }, { status: 500 })
  }
}
