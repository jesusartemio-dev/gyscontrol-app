import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await ctx.params
    const data = await prisma.catalogoEPP.findUnique({
      where: { id },
      include: { unidad: { select: { id: true, nombre: true } } },
    })
    if (!data) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error al obtener EPP:', error)
    return NextResponse.json({ error: 'Error al obtener EPP' }, { status: 500 })
  }
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const role = session.user.role
    if (!['admin', 'gerente', 'seguridad'].includes(role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const { id } = await ctx.params
    const body = await req.json()

    if (body.requiereTalla && !body.tallaCampo) {
      return NextResponse.json(
        { error: 'Si requiereTalla=true, tallaCampo es obligatorio' },
        { status: 400 }
      )
    }
    if (body.requiereTalla && !body.talla?.toString().trim()) {
      return NextResponse.json(
        { error: 'Si requiereTalla=true, debes indicar la talla específica del SKU' },
        { status: 400 }
      )
    }

    const updated = await prisma.catalogoEPP.update({
      where: { id },
      data: {
        ...(body.codigo !== undefined ? { codigo: body.codigo.trim() } : {}),
        ...(body.descripcion !== undefined ? { descripcion: body.descripcion.trim() } : {}),
        ...(body.marca !== undefined ? { marca: body.marca?.trim() || null } : {}),
        ...(body.modelo !== undefined ? { modelo: body.modelo?.trim() || null } : {}),
        ...(body.talla !== undefined ? { talla: body.talla?.toString().trim() || null } : {}),
        ...(body.unidadId !== undefined ? { unidadId: body.unidadId } : {}),
        ...(body.subcategoria !== undefined ? { subcategoria: body.subcategoria } : {}),
        ...(body.requiereTalla !== undefined
          ? {
              requiereTalla: !!body.requiereTalla,
              tallaCampo: body.requiereTalla ? body.tallaCampo : null,
              talla: body.requiereTalla ? (body.talla?.toString().trim() || null) : null,
            }
          : {}),
        ...(body.vidaUtilDias !== undefined
          ? { vidaUtilDias: body.vidaUtilDias ? Number(body.vidaUtilDias) : null }
          : {}),
        ...(body.esConsumible !== undefined ? { esConsumible: !!body.esConsumible } : {}),
        ...(body.imagenUrl !== undefined ? { imagenUrl: body.imagenUrl || null } : {}),
        ...(body.precioReferencial !== undefined
          ? {
              precioReferencial: body.precioReferencial ? Number(body.precioReferencial) : null,
            }
          : {}),
        ...(body.monedaReferencial !== undefined
          ? { monedaReferencial: body.monedaReferencial || 'PEN' }
          : {}),
        ...(body.activo !== undefined ? { activo: !!body.activo } : {}),
      },
      include: { unidad: { select: { id: true, nombre: true } } },
    })

    return NextResponse.json(updated)
  } catch (error: any) {
    console.error('Error al actualizar EPP:', error)
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'El código ya existe' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Error al actualizar EPP' }, { status: 500 })
  }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const role = session.user.role
    if (!['admin', 'gerente', 'seguridad'].includes(role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const { id } = await ctx.params

    // Soft delete: marcar inactivo en vez de eliminar (puede tener stock/movimientos asociados)
    const updated = await prisma.catalogoEPP.update({
      where: { id },
      data: { activo: false },
    })
    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error al desactivar EPP:', error)
    return NextResponse.json({ error: 'Error al desactivar EPP' }, { status: 500 })
  }
}
