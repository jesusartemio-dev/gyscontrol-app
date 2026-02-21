import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { registrarActualizacion } from '@/lib/services/audit'

const VALID_VISTAS = ['admin', 'comercial', 'logistica', 'proyectos']
const CAMPOS_PRECIO = ['precioLista', 'precioLogistica', 'precioReal', 'factorCosto', 'factorVenta']

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params

  if (!id) {
    return NextResponse.json({ error: 'ID no proporcionado' }, { status: 400 })
  }

  try {
    const equipo = await prisma.catalogoEquipo.findUnique({
      where: { id },
      include: {
        categoriaEquipo: true,
        unidad: true,
      },
    })

    if (!equipo) {
      return NextResponse.json({ error: 'Equipo no encontrado' }, { status: 404 })
    }

    return NextResponse.json(equipo)
  } catch (error) {
    console.error('Error al obtener equipo:', error)
    return NextResponse.json({ error: 'Error interno al obtener equipo' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params

  if (!id) {
    return NextResponse.json({ error: 'ID no proporcionado' }, { status: 400 })
  }

  try {
    const session = await getServerSession(authOptions)
    const userId = (session?.user as any)?.id as string | undefined

    const vista = req.nextUrl.searchParams.get('vista')
    let camposEditables: string[] | undefined

    if (vista && VALID_VISTAS.includes(vista)) {
      const config = await prisma.configuracionCatalogoColumnas.findUnique({ where: { id: vista } })
      const permisos = config?.permisos as Record<string, any> | undefined
      if (permisos && !permisos.canEdit) {
        return NextResponse.json({ error: 'No tiene permiso para editar equipos en esta vista' }, { status: 403 })
      }
      camposEditables = permisos?.camposEditables as string[] | undefined
    }

    const data = await req.json()

    const allowedFields = [
      'nombre', 'descripcion', 'categoriaEquipoId', 'unidadId', 'precio',
      'codigo', 'marca', 'precioLista', 'precioInterno', 'factorCosto', 'factorVenta', 'precioVenta', 'precioLogistica', 'precioReal', 'categoriaId', 'estado'
    ]

    const payload: Record<string, any> = {}
    for (const field of allowedFields) {
      if (field in data) {
        payload[field] = data[field]
      }
    }

    if (Object.keys(payload).length === 0) {
      return NextResponse.json({ error: 'No se proporcionaron campos válidos para actualizar' }, { status: 400 })
    }

    // Field-level permission check for price fields
    if (camposEditables) {
      for (const field of CAMPOS_PRECIO) {
        if (field in payload && !camposEditables.includes(field)) {
          return NextResponse.json(
            { error: `No tiene permiso para editar el campo: ${field}` },
            { status: 403 }
          )
        }
      }
    }

    // Fetch current record for audit diff and server-side recalc
    const anterior = await prisma.catalogoEquipo.findUnique({ where: { id } })
    if (!anterior) {
      return NextResponse.json({ error: 'Equipo no encontrado' }, { status: 404 })
    }

    // Server-side recalculation when price/factors change
    if ('precioLista' in payload || 'factorCosto' in payload || 'factorVenta' in payload) {
      const pLista = payload.precioLista ?? anterior.precioLista
      const fCosto = payload.factorCosto ?? anterior.factorCosto
      const fVenta = payload.factorVenta ?? anterior.factorVenta
      payload.precioInterno = +(pLista * fCosto).toFixed(2)
      payload.precioVenta = +(payload.precioInterno * fVenta).toFixed(2)
    }

    // Always track who updated
    if (userId) {
      payload.updatedById = userId
    }

    const actualizado = await prisma.catalogoEquipo.update({
      where: { id },
      data: payload,
      include: {
        categoriaEquipo: true,
        unidad: true,
        createdByUser: { select: { id: true, name: true } },
        updatedByUser: { select: { id: true, name: true } },
      },
    })

    // Audit logging for price changes
    const AUDIT_FIELDS = ['precioLista', 'precioLogistica', 'precioReal', 'precioInterno', 'precioVenta', 'factorCosto', 'factorVenta']
    const cambios: Record<string, { anterior: any; nuevo: any }> = {}

    for (const field of AUDIT_FIELDS) {
      const oldVal = (anterior as any)[field]
      const newVal = (actualizado as any)[field]
      if (oldVal !== newVal && newVal !== undefined) {
        cambios[field] = { anterior: oldVal, nuevo: newVal }
      }
    }

    if (Object.keys(cambios).length > 0 && userId) {
      const campos = Object.keys(cambios).join(', ')
      registrarActualizacion(
        'CATALOGO_EQUIPO',
        id,
        userId,
        `Precios actualizados: ${campos}`,
        cambios,
        { vista: vista || 'direct', codigo: anterior.codigo }
      ).catch(err => console.error('Audit log error:', err))
    }

    return NextResponse.json(actualizado)
  } catch (error) {
    console.error('Error al actualizar equipo:', error)
    return NextResponse.json({ error: 'Error interno al actualizar equipo' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params

  if (!id) {
    return NextResponse.json({ error: 'ID no proporcionado' }, { status: 400 })
  }

  try {
    const vista = req.nextUrl.searchParams.get('vista')

    if (vista && VALID_VISTAS.includes(vista)) {
      const config = await prisma.configuracionCatalogoColumnas.findUnique({ where: { id: vista } })
      const permisos = config?.permisos as Record<string, boolean> | undefined
      if (permisos && !permisos.canDelete) {
        return NextResponse.json({ error: 'No tiene permiso para eliminar equipos en esta vista' }, { status: 403 })
      }
    }

    const eliminado = await prisma.catalogoEquipo.delete({
      where: { id },
    })

    return NextResponse.json(eliminado)
  } catch (error) {
    console.error('Error al eliminar equipo:', error)
    return NextResponse.json({ error: 'Error interno al eliminar equipo' }, { status: 500 })
  }
}
