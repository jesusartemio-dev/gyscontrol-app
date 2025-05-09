// ===================================================
// 📁 Archivo: /api/plantilla-equipo/[id]/route.ts
// 📌 Descripción: Actualiza o elimina una sección de equipos en una plantilla
// ===================================================

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { recalcularTotalesPlantilla } from '@/lib/utils/recalculoPlantilla'

export const dynamic = 'force-dynamic'

// ✅ Actualizar grupo de equipos
export async function PUT(req: NextRequest, context: { params: { id: string } }) {
  try {
    const { id } = await context.params
    const data = await req.json()

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'ID no proporcionado' }, { status: 400 })
    }

    const actualizado = await prisma.plantillaEquipo.update({
      where: { id },
      data
    })

    await recalcularTotalesPlantilla(actualizado.plantillaId)

    return NextResponse.json(actualizado)
  } catch (error) {
    console.error('❌ Error al actualizar plantillaEquipo:', error)
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 })
  }
}

// ✅ Eliminar grupo de equipos
export async function DELETE(_: NextRequest, context: { params: { id: string } }) {
  console.log('🗑️ DELETE ejecutado para ID:', context.params?.id)

  try {
    const { id } = await context.params

    if (!id || typeof id !== 'string') {
      console.warn('⚠️ ID inválido en DELETE plantillaEquipo')
      return NextResponse.json({ error: 'ID no proporcionado' }, { status: 400 })
    }

    const equipo = await prisma.plantillaEquipo.findUnique({
      where: { id },
      select: { id: true, plantillaId: true }
    })

    if (!equipo) {
      console.warn('⚠️ Equipo no encontrado para ID:', id)
      return NextResponse.json({ error: 'Equipo no encontrado' }, { status: 404 })
    }

    await prisma.plantillaEquipoItem.deleteMany({
      where: { plantillaEquipoId: id }
    })

    await prisma.plantillaEquipo.delete({
      where: { id }
    })

    await recalcularTotalesPlantilla(equipo.plantillaId)

    console.log('✅ Eliminación completada correctamente para ID:', id)
    return NextResponse.json({ status: 'ok' })
  } catch (error) {
    console.error('❌ Error al eliminar plantillaEquipo:', error)
    return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 })
  }
}
