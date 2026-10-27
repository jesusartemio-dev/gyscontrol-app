// PATCH /api/lista-equipo-item/[id]/vincular-catalogo
// Vincula un ítem de una lista de equipos al catálogo general: a una ficha que ya
// existe ({ catalogoEquipoId }) o creándola ({ nuevoCatalogo }). El ítem toma el
// código, descripción, marca y unidad de la ficha; cantidad y presupuesto no cambian.
// Si viene de un equipo cotizado sin ficha, ese cotizado también queda vinculado
// (sin marcarlo "reemplazado": es el mismo equipo). Como "Crear en catálogo y
// vincular" de las cotizaciones (/api/cotizacion-equipo-item/[id]/vincular).

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { createId } from '@paralleldrive/cuid2'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { id } = await context.params
    const body = await req.json()

    const item = await prisma.listaEquipoItem.findUnique({
      where: { id },
      select: { id: true, catalogoEquipoId: true, proyectoEquipoItemId: true },
    })
    if (!item) return NextResponse.json({ error: 'Ítem no encontrado' }, { status: 404 })

    let catalogo: { id: string; codigo: string; descripcion: string; marca: string; unidad: { nombre: string } }
    if (body.catalogoEquipoId) {
      const existente = await prisma.catalogoEquipo.findUnique({
        where: { id: body.catalogoEquipoId },
        select: { id: true, codigo: true, descripcion: true, marca: true, unidad: { select: { nombre: true } } },
      })
      if (!existente) return NextResponse.json({ error: 'Equipo de catálogo no encontrado' }, { status: 404 })
      catalogo = existente
    } else if (body.nuevoCatalogo) {
      const { codigo, descripcion, marca, precioLista, categoriaId, unidadId } = body.nuevoCatalogo
      // El precio es opcional: la ficha técnica la arma ingeniería y logística pone el
      // precio después (queda en 0 y "pendiente"), igual que "+ Nuevo" del catálogo.
      if (!codigo?.trim() || !descripcion?.trim() || !categoriaId || !unidadId) {
        return NextResponse.json({ error: 'Faltan campos para crear en el catálogo: código, descripción, categoría y unidad' }, { status: 400 })
      }
      if (precioLista != null && (Number.isNaN(Number(precioLista)) || Number(precioLista) < 0)) {
        return NextResponse.json({ error: 'El precio lista no puede ser negativo' }, { status: 400 })
      }
      const duplicado = await prisma.catalogoEquipo.findFirst({ where: { codigo: { equals: codigo.trim(), mode: 'insensitive' } }, select: { id: true } })
      if (duplicado) return NextResponse.json({ error: `Ya existe un equipo con código "${codigo.trim()}": búscalo en "Buscar existente"` }, { status: 400 })

      const precio = Number(precioLista) || 0
      const factorCosto = 1.0
      const factorVenta = 1.15
      catalogo = await prisma.catalogoEquipo.create({
        data: {
          id: createId(),
          codigo: codigo.trim(),
          descripcion: descripcion.trim(),
          marca: marca?.trim() || '',
          precioLista: precio,
          precioInterno: precio * factorCosto,
          factorCosto,
          factorVenta,
          precioVenta: precio * factorCosto * factorVenta,
          categoriaId,
          unidadId,
          estado: 'pendiente',
          createdById: session.user.id,
        },
        select: { id: true, codigo: true, descripcion: true, marca: true, unidad: { select: { nombre: true } } },
      })
    } else {
      return NextResponse.json({ error: 'Debe enviar catalogoEquipoId o nuevoCatalogo' }, { status: 400 })
    }

    const actualizado = await prisma.$transaction(async tx => {
      const r = await tx.listaEquipoItem.update({
        where: { id: item.id },
        data: {
          catalogoEquipoId: catalogo.id,
          codigo: catalogo.codigo,
          descripcion: catalogo.descripcion,
          marca: catalogo.marca || 'SIN-MARCA',
          unidad: catalogo.unidad.nombre,
        },
      })
      if (item.proyectoEquipoItemId) {
        await tx.proyectoEquipoCotizadoItem.updateMany({
          where: { id: item.proyectoEquipoItemId, catalogoEquipoId: null },
          data: { catalogoEquipoId: catalogo.id, updatedAt: new Date() },
        })
      }
      return r
    })

    return NextResponse.json(actualizado)
  } catch (error) {
    console.error('Error al vincular ítem de lista al catálogo:', error)
    return NextResponse.json({ error: 'Error al vincular al catálogo' }, { status: 500 })
  }
}
