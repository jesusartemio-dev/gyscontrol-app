// ===================================================
// 📁 Archivo: [id]/route.ts
// 📌 Ubicación: src/app/api/proyecto-equipo-item/[id]/route.ts
// 🔧 Descripción: API para GET, PUT y DELETE de ítems de equipo del proyecto
// ===================================================

import { prisma } from '@/lib/prisma'
import { NextResponse, NextRequest } from 'next/server'
import type { ProyectoEquipoCotizadoItemUpdatePayload } from '@/types'

export const dynamic = 'force-dynamic' // ✅ Para evitar problemas de caché en rutas dinámicas

// ✅ Obtener un ítem de equipo por ID
export async function GET(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const item = await prisma.proyectoEquipoCotizadoItem.findUnique({
      where: { id },
      include: {
        catalogoEquipo: true,
        proyectoEquipoCotizado: true,
        listaEquipo: true,
        listaEquipoSeleccionado: true,
        listaEquipoItemsAsociados: true,
        listaEquipoItemsReemplazo: true,
      },
    })

    if (!item) {
      return NextResponse.json({ error: 'Ítem no encontrado' }, { status: 404 })
    }

    return NextResponse.json(item)
  } catch (error) {
    console.error('❌ Error en GET proyectoEquipoItem:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// ✅ Actualizar un ítem de equipo
export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const body: ProyectoEquipoCotizadoItemUpdatePayload = await req.json()
    
    // 🔧 Excluir campos de relación que no se pueden actualizar directamente
    const { listaId, proyectoEquipoId, catalogoEquipoId, listaEquipoSeleccionadoId, ...data } = body

    const actualizado = await prisma.proyectoEquipoCotizadoItem.update({
      where: { id },
      data,
    })

    return NextResponse.json(actualizado)
  } catch (error) {
    console.error('❌ Error en PUT proyectoEquipoItem:', error)
    return NextResponse.json({ error: 'Error al actualizar ítem de equipo' }, { status: 500 })
  }
}

// ✅ Eliminar un ítem de equipo
export async function DELETE(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params

    await prisma.proyectoEquipoCotizadoItem.delete({ where: { id } })

    return NextResponse.json({ status: 'ok' })
  } catch (error) {
    console.error('❌ Error en DELETE proyectoEquipoItem:', error)
    return NextResponse.json({ error: 'Error al eliminar ítem de equipo' }, { status: 500 })
  }
}
