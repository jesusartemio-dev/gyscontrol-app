// ===================================================
// 📁 Archivo: item-from-proyecto/route.ts
// 📌 Descripción: API para insertar ProyectoEquipoItem en ListaEquiposItem
//    y actualizar su estado, costos reales y listaId
// ✍️ Autor: Asistente IA GYS
// 📅 Última actualización: 2025-05-13
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

    // 1. Buscar el ProyectoEquipoItem
    const item = await prisma.proyectoEquipoItem.findUnique({
      where: { id: proyectoEquipoItemId },
    })

    if (!item) {
      return NextResponse.json(
        { error: 'ProyectoEquipoItem no encontrado' },
        { status: 404 }
      )
    }

    // 2. Crear el ListaEquiposItem
    await prisma.listaEquiposItem.create({
      data: {
        listaId,
        proyectoEquipoItemId,
        codigo: item.codigo,
        descripcion: item.descripcion || '',
        unidad: item.unidad || '',
        cantidad: item.cantidad,
        precioReferencial: item.precioInterno,
      },
    })

    // 3. Actualizar ProyectoEquipoItem con trazabilidad de la lista
    await prisma.proyectoEquipoItem.update({
      where: { id: proyectoEquipoItemId },
      data: {
        listaId, // ✅ Asignamos la relación directa
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
