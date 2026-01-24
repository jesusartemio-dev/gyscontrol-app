// ===================================================
// 📁 Archivo: item-from-proyecto/route.ts
// 📌 Descripción: API para insertar ProyectoEquipoItem en ListaEquipoItem
//    y actualizar su estado, costos reales y listaEquipoSeleccionadoId
// ✍️ Autor: Asistente IA GYS
// 📅 Última actualización: 2025-07-04
// ===================================================

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createId } from '@paralleldrive/cuid2'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    // ✅ Obtener sesión del usuario
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const { listaId, proyectoEquipoItemId } = await req.json()

    if (!listaId || !proyectoEquipoItemId) {
      return NextResponse.json(
        { error: 'Faltan parámetros requeridos' },
        { status: 400 }
      )
    }

    // ✅ 1. Buscar el ProyectoEquipoItem
    const item = await prisma.proyectoEquipoCotizadoItem.findUnique({
      where: { id: proyectoEquipoItemId },
    })

    if (!item) {
      return NextResponse.json(
        { error: 'ProyectoEquipoItem no encontrado' },
        { status: 404 }
      )
    }

    // ✅ 2. Crear el ListaEquipoItem incluyendo proyectoEquipoId y responsableId
    const nuevo = await prisma.listaEquipoItem.create({
      data: {
        id: createId(),
        listaId,
        proyectoEquipoItemId,
        proyectoEquipoId: item.proyectoEquipoId ?? null,
        responsableId: session.user.id,
        codigo: item.codigo,
        descripcion: item.descripcion || '',
        unidad: item.unidad || '',
        cantidad: item.cantidad,
        presupuesto: item.precioInterno,
        origen: 'cotizado',
        estado: 'borrador',
        updatedAt: new Date(),
      },
    })

    // ✅ 3. Actualizar ProyectoEquipoItem
    await prisma.proyectoEquipoCotizadoItem.update({
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
