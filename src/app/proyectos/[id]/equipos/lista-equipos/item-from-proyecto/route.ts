// ===================================================
// 📁 Archivo: route.ts
// 📍 Ubicación: src/app/api/lista-equipos/item-from-proyecto/route.ts
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
    const item = await prisma.proyectoEquipoItem.findUnique({
      where: { id: proyectoEquipoItemId },
    })

    if (!item) {
      return NextResponse.json({ error: 'Ítem de proyecto no encontrado' }, { status: 404 })
    }

    // Crear el nuevo ítem en la lista técnica
    const nuevo = await prisma.listaEquipoItem.create({
      data: {
        listaId,
        proyectoEquipoItemId: item.id,
        codigo: item.codigo,
        descripcion: item.descripcion,
        unidad: item.unidad,
        cantidad: item.cantidad,
        precioReferencial: item.precioCliente, // Se usa como referencial
      },
    })

    // Retornar el nuevo ítem creado
    return NextResponse.json(nuevo)
  } catch (error) {
    console.error('❌ Error al copiar ProyectoEquipoItem a ListaEquipoItem:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
