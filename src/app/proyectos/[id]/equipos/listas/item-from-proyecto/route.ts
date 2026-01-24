// ===================================================
// 📁 Archivo: route.ts
// 📍 Ubicación: src/app/proyectos/[id]/equipos/listas/item-from-proyecto/route.ts
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

    // Crear el nuevo ítem en la lista técnica
    const nuevo = await prisma.listaEquipoItem.create({
      data: {
        id: `lista-equipo-item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        listaId,
        proyectoEquipoItemId: item.id,
        responsableId: lista.responsableId,
        codigo: item.codigo,
        descripcion: item.descripcion,
        unidad: item.unidad,
        cantidad: item.cantidad,
        presupuesto: item.precioCliente, // Se usa como presupuesto referencial
        estado: 'borrador',
        origen: 'cotizado',
        verificado: false,
        updatedAt: new Date(),
      },
    })

    // Retornar el nuevo ítem creado
    return NextResponse.json(nuevo)
  } catch (error) {
    console.error('❌ Error al copiar ProyectoEquipoItem a ListaEquipoItem:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
