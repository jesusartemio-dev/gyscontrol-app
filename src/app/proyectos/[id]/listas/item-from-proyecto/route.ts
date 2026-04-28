// ===================================================
// 📁 Archivo: route.ts
// 📍 Ubicación: src/app/proyectos/[id]/listas/item-from-proyecto/route.ts
// 🔧 Descripción: Agrega un ProyectoEquipoItem a una ListaEquipoItem
// ✍️ Autor: Asistente IA GYS
// 📅 Última actualización: 2025-05-11
// ===================================================

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const { listaId, proyectoEquipoItemId } = await req.json()

    if (!listaId || !proyectoEquipoItemId) {
      return NextResponse.json({ error: 'Faltan datos requeridos' }, { status: 400 })
    }

    // Obtener el ítem del proyecto
    const item = await prisma.proyectoEquipoCotizadoItem.findUnique({
      where: { id: proyectoEquipoItemId },
      select: {
        id: true,
        codigo: true,
        descripcion: true,
        marca: true,
        categoria: true,
        unidad: true,
        cantidad: true,
        precioCliente: true,
        listaEquipoSeleccionadoId: true,
      },
    })

    if (!item) {
      return NextResponse.json({ error: 'Ítem de proyecto no encontrado' }, { status: 404 })
    }

    // Obtener la lista para obtener el responsableId
    const lista = await prisma.listaEquipo.findUnique({
      where: { id: listaId },
      select: { responsableId: true }
    })

    if (!lista) {
      return NextResponse.json({ error: 'Lista no encontrada' }, { status: 404 })
    }

    const oldListaItemId = item.listaEquipoSeleccionadoId

    const nuevo = await prisma.$transaction(async (tx) => {
      // 1. Limpiar el lista item previo del equipo si existía (evita huérfano)
      if (oldListaItemId) {
        try {
          await tx.listaEquipoItem.update({
            where: { id: oldListaItemId },
            data: {
              proyectoEquipoItemId: null,
              reemplazaProyectoEquipoCotizadoItemId: null,
              origen: 'nuevo',
            },
          })
        } catch (e) {
          // El lista item previo podría haber sido eliminado o estar en lista no editable.
          // Lo dejamos pasar — el cascade SetNull manejará referencias colgantes.
          console.warn(`⚠️ item-from-proyecto: no se pudo limpiar lista item previo ${oldListaItemId}:`, e)
        }
      }

      // 2. Crear el nuevo ítem en la lista técnica
      const nuevoLi = await tx.listaEquipoItem.create({
        data: {
          id: `lista-equipo-item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          listaId,
          proyectoEquipoItemId: item.id,
          responsableId: lista.responsableId,
          codigo: item.codigo,
          descripcion: item.descripcion,
          marca: item.marca || '',
          categoria: item.categoria || '',
          unidad: item.unidad,
          cantidad: item.cantidad,
          presupuesto: item.precioCliente,
          estado: 'borrador',
          origen: 'cotizado',
          verificado: false,
          updatedAt: new Date(),
        },
      })

      // 3. Actualizar el equipo cotizado para que apunte a este nuevo lista item
      await tx.proyectoEquipoCotizadoItem.update({
        where: { id: item.id },
        data: {
          listaEquipoSeleccionadoId: nuevoLi.id,
          listaId,
          estado: 'en_lista',
        },
      })

      return nuevoLi
    })

    return NextResponse.json(nuevo)
  } catch (error) {
    console.error('❌ Error al copiar ProyectoEquipoItem a ListaEquipoItem:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
