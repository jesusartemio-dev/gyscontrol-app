import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { recalcularTotalesCotizacion } from '@/lib/utils/recalculoCotizacion'
import { createId } from '@paralleldrive/cuid2'

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const body = await req.json()

    const item = await prisma.cotizacionEquipoItem.findUnique({
      where: { id },
      select: { id: true, cotizacionEquipoId: true, cantidad: true, factorCosto: true, factorVenta: true },
    })
    if (!item) {
      return NextResponse.json({ error: 'Item no encontrado' }, { status: 404 })
    }

    let catalogoEquipoId: string
    let catalogoCodigo: string
    let catalogoPrecioLista: number

    if (body.catalogoEquipoId) {
      // Link to existing catalog entry
      const catalogo = await prisma.catalogoEquipo.findUnique({
        where: { id: body.catalogoEquipoId },
        select: { id: true, codigo: true, precioLista: true },
      })
      if (!catalogo) {
        return NextResponse.json({ error: 'Equipo de catálogo no encontrado' }, { status: 404 })
      }
      catalogoEquipoId = catalogo.id
      catalogoCodigo = catalogo.codigo
      catalogoPrecioLista = catalogo.precioLista
    } else if (body.nuevoCatalogo) {
      // Create new catalog entry then link
      const { codigo, descripcion, marca, precioLista, categoriaId, unidadId } = body.nuevoCatalogo
      if (!codigo || !descripcion || !precioLista || !categoriaId || !unidadId) {
        return NextResponse.json({ error: 'Faltan campos requeridos para crear catálogo' }, { status: 400 })
      }

      // Check duplicate codigo
      const existing = await prisma.catalogoEquipo.findFirst({
        where: { codigo: { equals: codigo, mode: 'insensitive' } },
      })
      if (existing) {
        return NextResponse.json({ error: `Ya existe un equipo con código "${codigo}"` }, { status: 400 })
      }

      const precioListaNum = Number(precioLista)
      const factorCosto = 1.0
      const factorVenta = 1.15
      const precioInternoCalc = precioListaNum * factorCosto
      const precioVentaCalc = precioInternoCalc * factorVenta

      const nuevo = await prisma.catalogoEquipo.create({
        data: {
          id: createId(),
          codigo,
          descripcion,
          marca: marca || '',
          precioLista: precioListaNum,
          precioInterno: precioInternoCalc,
          factorCosto,
          factorVenta,
          precioVenta: precioVentaCalc,
          categoriaId,
          unidadId,
          estado: 'pendiente',
        },
        select: { id: true, codigo: true, precioLista: true },
      })
      catalogoEquipoId = nuevo.id
      catalogoCodigo = nuevo.codigo
      catalogoPrecioLista = nuevo.precioLista
    } else {
      return NextResponse.json({ error: 'Debe enviar catalogoEquipoId o nuevoCatalogo' }, { status: 400 })
    }

    // Recalculate prices based on catalog
    const factorCosto = item.factorCosto ?? 1
    const factorVenta = item.factorVenta ?? 1.15
    const precioInterno = catalogoPrecioLista * factorCosto
    const precioCliente = precioInterno * factorVenta
    const costoInterno = precioInterno * item.cantidad
    const costoCliente = precioCliente * item.cantidad

    const updated = await prisma.cotizacionEquipoItem.update({
      where: { id },
      data: {
        catalogoEquipoId,
        codigo: catalogoCodigo,
        precioLista: catalogoPrecioLista,
        precioInterno,
        precioCliente,
        costoInterno,
        costoCliente,
        updatedAt: new Date(),
      },
      include: { catalogoEquipo: { select: { updatedAt: true } } },
    })

    // Recalculate cotización totals
    const grupo = await prisma.cotizacionEquipo.findUnique({
      where: { id: item.cotizacionEquipoId },
      select: { cotizacionId: true },
    })
    if (grupo) {
      await recalcularTotalesCotizacion(grupo.cotizacionId)
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error al vincular item a catálogo:', error)
    return NextResponse.json({ error: 'Error al vincular' }, { status: 500 })
  }
}
