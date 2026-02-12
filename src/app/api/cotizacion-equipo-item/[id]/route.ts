// ===================================================
// 📁 Archivo: [id]/route.ts
// 📌 Ubicación: /api/cotizacion-equipo-item/[id]
// 🔧 PUT y DELETE de ítems de equipo dentro de cotizaciones
// ✅ Corregido para evitar warning de "params should be awaited"
// ===================================================

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { recalcularTotalesCotizacion } from '@/lib/utils/recalculoCotizacion'

// ✅ Actualizar un ítem
export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params  // ✅ CORREGIDO

    const data = await req.json()

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    // 1️⃣ Actualizar ítem
    const actualizado = await prisma.cotizacionEquipoItem.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        cotizacionEquipoId: true,
        catalogoEquipoId: true,
        codigo: true,
        descripcion: true,
        categoria: true,
        unidad: true,
        marca: true,
        cantidad: true,
        precioLista: true,
        precioInterno: true,
        factorCosto: true,
        factorVenta: true,
        precioCliente: true,
        costoInterno: true,
        costoCliente: true,
        createdAt: true,
        updatedAt: true
      }
    })

    // 2️⃣ Recalcular totales
    const grupo = await prisma.cotizacionEquipo.findUnique({
      where: { id: actualizado.cotizacionEquipoId },
      select: { cotizacionId: true },
    })

    if (grupo) {
      await recalcularTotalesCotizacion(grupo.cotizacionId)
    }

    return NextResponse.json(actualizado)
  } catch (error) {
    console.error('❌ Error al actualizar ítem cotizaciónEquipo:', error)
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 })
  }
}

// ✅ Eliminar un ítem
export async function DELETE(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params  // ✅ CORREGIDO

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    // 1️⃣ Obtener cotizacionEquipoId
    const item = await prisma.cotizacionEquipoItem.findUnique({
      where: { id },
      select: { cotizacionEquipoId: true },
    })

    // 2️⃣ Eliminar ítem
    await prisma.cotizacionEquipoItem.delete({ where: { id } })

    // 3️⃣ Recalcular si corresponde
    if (item) {
      const grupo = await prisma.cotizacionEquipo.findUnique({
        where: { id: item.cotizacionEquipoId },
        select: { cotizacionId: true },
      })

      if (grupo) {
        await recalcularTotalesCotizacion(grupo.cotizacionId)
      }
    }

    return NextResponse.json({ status: 'ok' })
  } catch (error) {
    console.error('❌ Error al eliminar ítem cotizaciónEquipo:', error)
    return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 })
  }
}
