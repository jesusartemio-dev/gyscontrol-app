import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { createId } from '@paralleldrive/cuid2'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const VALID_VISTAS = ['admin', 'comercial', 'logistica', 'proyectos']

function buildPrismaSelect(columnas: string[]) {
  const select: Record<string, any> = { id: true, createdAt: true, updatedAt: true }

  const directFields = ['codigo', 'descripcion', 'marca', 'precioLista', 'factorCosto', 'factorVenta', 'precioInterno', 'precioVenta', 'precioLogistica', 'precioReal', 'estado']
  for (const col of columnas) {
    if (directFields.includes(col)) {
      select[col] = true
    }
  }

  if (columnas.includes('categoria')) {
    select.categoriaId = true
    select.categoriaEquipo = { select: { id: true, nombre: true } }
  }
  if (columnas.includes('unidad')) {
    select.unidadId = true
    select.unidad = { select: { id: true, nombre: true } }
  }
  if (columnas.includes('uso')) {
    select._count = {
      select: {
        cotizacionEquipoItem: true,
        proyectoEquipoCotizadoItem: true,
        listaEquipoItem: true,
      }
    }
  }

  // Always include user tracking
  select.createdById = true
  select.updatedById = true
  select.createdByUser = { select: { id: true, name: true } }
  select.updatedByUser = { select: { id: true, name: true } }

  return select
}

export async function GET(req: NextRequest) {
  try {
    const vista = req.nextUrl.searchParams.get('vista')

    // Without vista param: return everything (backward compatible)
    if (!vista || !VALID_VISTAS.includes(vista)) {
      const equipos = await prisma.catalogoEquipo.findMany({
        include: {
          categoriaEquipo: true,
          unidad: true,
          createdByUser: { select: { id: true, name: true } },
          updatedByUser: { select: { id: true, name: true } },
          _count: {
            select: {
              cotizacionEquipoItem: true,
              proyectoEquipoCotizadoItem: true,
              listaEquipoItem: true,
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      })
      return NextResponse.json(equipos)
    }

    // With vista param: filter fields based on config
    const config = await prisma.configuracionCatalogoColumnas.findUnique({
      where: { id: vista }
    })

    if (!config) {
      // Fallback to full data if config not found
      const equipos = await prisma.catalogoEquipo.findMany({
        include: { categoriaEquipo: true, unidad: true },
        orderBy: { createdAt: 'desc' }
      })
      return NextResponse.json(equipos)
    }

    const columnas = config.columnas as string[]
    const select = buildPrismaSelect(columnas)

    const equipos = await prisma.catalogoEquipo.findMany({
      select,
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(equipos)
  } catch (error) {
    console.error('Error al obtener equipos:', error)
    return NextResponse.json({ error: 'Error al obtener equipos' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const userId = (session?.user as any)?.id as string | undefined

    const vista = req.nextUrl.searchParams.get('vista')

    // Check permission if vista is provided
    if (vista && VALID_VISTAS.includes(vista)) {
      const config = await prisma.configuracionCatalogoColumnas.findUnique({ where: { id: vista } })
      const permisos = config?.permisos as Record<string, boolean> | undefined
      if (permisos && !permisos.canCreate) {
        return NextResponse.json({ error: 'No tiene permiso para crear equipos en esta vista' }, { status: 403 })
      }
    }

    const data = await req.json()

    const requiredFields = ['codigo', 'descripcion', 'marca', 'precioLista', 'factorCosto', 'factorVenta', 'precioInterno', 'precioVenta', 'categoriaId', 'unidadId']
    for (const field of requiredFields) {
      if (!(field in data)) {
        return NextResponse.json({ error: `Falta el campo obligatorio: ${field}` }, { status: 400 })
      }
    }

    const nuevo = await prisma.catalogoEquipo.create({
      data: {
        id: createId(),
        codigo: data.codigo,
        descripcion: data.descripcion,
        marca: data.marca,
        precioLista: data.precioLista,
        precioInterno: data.precioInterno,
        factorCosto: data.factorCosto,
        factorVenta: data.factorVenta,
        precioVenta: data.precioVenta,
        precioLogistica: data.precioLogistica ?? null,
        precioReal: data.precioReal ?? null,
        categoriaId: data.categoriaId,
        unidadId: data.unidadId,
        estado: data.estado || 'pendiente',
        createdById: userId ?? null,
        updatedById: userId ?? null,
        updatedAt: new Date(),
      },
      include: {
        categoriaEquipo: true,
        unidad: true,
        createdByUser: { select: { id: true, name: true } },
        updatedByUser: { select: { id: true, name: true } },
      }
    })

    return NextResponse.json(nuevo, { status: 201 })
  } catch (error) {
    console.error('Error al crear equipo:', error)
    return NextResponse.json({ error: 'Error al crear equipo' }, { status: 500 })
  }
}
