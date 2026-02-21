import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

const VALID_VISTAS = ['admin', 'comercial', 'logistica', 'proyectos'] as const
type Vista = typeof VALID_VISTAS[number]

const VALID_COLUMNS = [
  'codigo', 'descripcion', 'categoria', 'unidad', 'marca', 'uso',
  'precioLogistica', 'precioReal', 'precioLista', 'factorCosto', 'factorVenta', 'precioInterno', 'precioVenta', 'estado', 'updatedAt'
]

const DEFAULTS: Record<Vista, { columnas: string[], permisos: Record<string, boolean> }> = {
  admin: {
    columnas: ['codigo', 'descripcion', 'categoria', 'unidad', 'marca', 'uso', 'precioLogistica', 'precioReal', 'precioLista', 'factorCosto', 'factorVenta', 'precioInterno', 'precioVenta', 'estado', 'updatedAt'],
    permisos: { canCreate: true, canEdit: true, canDelete: true, canImport: true, canExport: true }
  },
  comercial: {
    columnas: ['codigo', 'descripcion', 'categoria', 'unidad', 'marca', 'precioVenta', 'estado', 'updatedAt'],
    permisos: { canCreate: false, canEdit: false, canDelete: false, canImport: false, canExport: true }
  },
  logistica: {
    columnas: ['codigo', 'descripcion', 'categoria', 'unidad', 'marca', 'precioInterno', 'precioLogistica', 'precioReal', 'estado', 'updatedAt'],
    permisos: { canCreate: true, canEdit: true, canDelete: true, canImport: true, canExport: true }
  },
  proyectos: {
    columnas: ['codigo', 'descripcion', 'categoria', 'unidad', 'marca', 'precioInterno', 'uso', 'estado', 'updatedAt'],
    permisos: { canCreate: false, canEdit: false, canDelete: false, canImport: false, canExport: true }
  }
}

async function ensureDefaults() {
  const existing = await prisma.configuracionCatalogoColumnas.findMany()
  const existingIds = new Set(existing.map(e => e.id))

  for (const vista of VALID_VISTAS) {
    if (!existingIds.has(vista)) {
      await prisma.configuracionCatalogoColumnas.create({
        data: {
          id: vista,
          columnas: DEFAULTS[vista].columnas,
          permisos: DEFAULTS[vista].permisos,
        }
      })
    } else {
      // Add any new default columns missing from existing config
      const record = existing.find(e => e.id === vista)
      const currentCols = (record?.columnas as string[]) || []
      const defaultCols = DEFAULTS[vista].columnas
      const missing = defaultCols.filter(c => !currentCols.includes(c))
      if (missing.length > 0) {
        await prisma.configuracionCatalogoColumnas.update({
          where: { id: vista },
          data: { columnas: [...currentCols, ...missing] }
        })
      }
    }
  }
}

// GET - Returns all 4 vista configs (auto-seeds defaults if missing)
export async function GET() {
  try {
    await ensureDefaults()

    const configs = await prisma.configuracionCatalogoColumnas.findMany()
    const result: Record<string, { columnas: string[], permisos: Record<string, boolean> }> = {}

    for (const config of configs) {
      result[config.id] = {
        columnas: config.columnas as string[],
        permisos: config.permisos as Record<string, boolean>,
      }
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error al obtener configuración de columnas:', error)
    return NextResponse.json({ error: 'Error al obtener configuración' }, { status: 500 })
  }
}

// PUT - Update a specific vista's config
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { vista, columnas, permisos } = body

    if (!VALID_VISTAS.includes(vista)) {
      return NextResponse.json({ error: `Vista inválida: ${vista}` }, { status: 400 })
    }

    // Validate columns
    if (!Array.isArray(columnas) || !columnas.every((c: string) => VALID_COLUMNS.includes(c))) {
      return NextResponse.json({ error: 'Columnas inválidas' }, { status: 400 })
    }

    // codigo and descripcion are always required
    const finalColumnas = [...new Set(['codigo', 'descripcion', ...columnas])]

    const config = await prisma.configuracionCatalogoColumnas.upsert({
      where: { id: vista },
      update: {
        columnas: finalColumnas,
        permisos: permisos ?? DEFAULTS[vista as Vista].permisos,
      },
      create: {
        id: vista,
        columnas: finalColumnas,
        permisos: permisos ?? DEFAULTS[vista as Vista].permisos,
      }
    })

    return NextResponse.json({
      columnas: config.columnas,
      permisos: config.permisos,
    })
  } catch (error) {
    console.error('Error al actualizar configuración de columnas:', error)
    return NextResponse.json({ error: 'Error al actualizar configuración' }, { status: 500 })
  }
}
