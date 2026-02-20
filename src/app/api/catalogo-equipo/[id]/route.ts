import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const VALID_VISTAS = ['admin', 'comercial', 'logistica', 'proyectos']

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

    if (vista && VALID_VISTAS.includes(vista)) {
      const config = await prisma.configuracionCatalogoColumnas.findUnique({ where: { id: vista } })
      const permisos = config?.permisos as Record<string, boolean> | undefined
      if (permisos && !permisos.canEdit) {
        return NextResponse.json({ error: 'No tiene permiso para editar equipos en esta vista' }, { status: 403 })
      }
    }

    const data = await req.json()

    const allowedFields = [
      'nombre', 'descripcion', 'categoriaEquipoId', 'unidadId', 'precio',
      'codigo', 'marca', 'precioLista', 'precioInterno', 'factorCosto', 'factorVenta', 'precioVenta', 'precioLogistica', 'categoriaId', 'estado'
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
