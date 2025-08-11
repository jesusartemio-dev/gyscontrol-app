// ===================================================
// 📁 Archivo: item-from-proyecto/route.ts
// 📌 Descripción: API para insertar ProyectoEquipoItem en ListaEquipoItem
//    y actualizar su estado, costos reales y listaEquipoSeleccionadoId
// ✍️ Autor: Asistente IA GYS
// 📅 Última actualización: 2025-07-04
// ===================================================

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const { listaId, proyectoEquipoItemId } = await req.json()

    if (!listaId || !proyectoEquipoItemId) {
      return NextResponse.json(
        { error: 'Faltan parámetros requeridos' },
        { status: 400 }
      )
    }

    // ✅ 1. Buscar el ProyectoEquipoItem
    const item = await prisma.proyectoEquipoItem.findUnique({
      where: { id: proyectoEquipoItemId },
    })

    if (!item) {
      return NextResponse.json(
        { error: 'ProyectoEquipoItem no encontrado' },
        { status: 404 }
      )
    }

    // ✅ 2. Crear el ListaEquipoItem incluyendo proyectoEquipoId
    const nuevo = await prisma.listaEquipoItem.create({
      data: {
        listaId,
        proyectoEquipoItemId,
        proyectoEquipoId: item.proyectoEquipoId ?? null,
        codigo: item.codigo,
        descripcion: item.descripcion || '',
        unidad: item.unidad || '',
        cantidad: item.cantidad,
        presupuesto: item.precioInterno,
        origen: 'cotizado',
        estado: 'borrador',
      },
    })

    // ✅ 3. Actualizar ProyectoEquipoItem
    await prisma.proyectoEquipoItem.update({
      where: { id: proyectoEquipoItemId },
      data: {
        listaEquipoSeleccionadoId: nuevo.id,
        estado: 'en_lista',
        cantidadReal: item.cantidad,
        precioReal: item.precioInterno,
        costoReal: item.cantidad * item.precioInterno,
      },
    })

    return NextResponse.json({ status: 'ok' })
  } catch (error) {
    console.error('❌ Error en item-from-proyecto:', error)
    return NextResponse.json(
      { error: 'Error interno al agregar el equipo a la lista' },
      { status: 500 }
    )
  }
}
