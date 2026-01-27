// src/app/api/cotizacion-equipo/[id]/route.ts
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { recalcularTotalesCotizacion } from '@/lib/utils/recalculoCotizacion'

export const dynamic = 'force-dynamic'

// ✅ Actualizar grupo de equipos
export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const data = await req.json()

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'ID no proporcionado' }, { status: 400 })
    }

    const actualizado = await prisma.cotizacionEquipo.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date()
      },
    })

    await recalcularTotalesCotizacion(actualizado.cotizacionId)

    return NextResponse.json(actualizado)
  } catch (error) {
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 })
  }
}

// ✅ Eliminar grupo de equipos
export async function DELETE(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'ID no proporcionado' }, { status: 400 })
    }

    const equipo = await prisma.cotizacionEquipo.findUnique({
      where: { id },
      select: { cotizacionId: true },
    })

    if (!equipo) {
      return NextResponse.json({ error: 'Equipo no encontrado' }, { status: 404 })
    }

    await prisma.cotizacionEquipoItem.deleteMany({
      where: { cotizacionEquipoId: id },
    })

    await prisma.cotizacionEquipo.delete({
      where: { id },
    })

    await recalcularTotalesCotizacion(equipo.cotizacionId)

    return NextResponse.json({ status: 'ok' })
  } catch (error) {
    return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 })
  }
}
