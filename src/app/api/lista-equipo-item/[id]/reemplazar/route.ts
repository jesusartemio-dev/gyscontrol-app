// ===================================================
// 📁 Archivo: [id]/reemplazar/route.ts
// 📌 Descripción: API para reemplazar un ListaEquipoItem
// ✍️ Autor: Jesús Artemio (Asistente IA GYS)
// 📅 Última actualización: 2025-07-04
// ===================================================

import { NextResponse, NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function PATCH(
  req: Request | NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // ✅ Obtener sesión del usuario
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const { id: originalId } = await context.params
    const nuevo = await req.json()

    if (!originalId || !nuevo) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })
    }

    // 1. Obtener ítem original
    const original = await prisma.listaEquipoItem.findUnique({
      where: { id: originalId },
    })

    if (!original) {
      return NextResponse.json({ error: 'Ítem original no encontrado' }, { status: 404 })
    }

    // 2. Validar que el nuevo proyectoEquipoItem exista
    if (!nuevo.proyectoEquipoItemId) {
      return NextResponse.json({ error: 'proyectoEquipoItemId requerido' }, { status: 400 })
    }

    const proyectoItem = await prisma.proyectoEquipoItem.findUnique({
      where: { id: nuevo.proyectoEquipoItemId },
    })

    if (!proyectoItem) {
      return NextResponse.json({ error: 'ID de ProyectoEquipoItem no válido' }, { status: 400 })
    }

    // 3. Rechazar ítem original
    await prisma.listaEquipoItem.update({
      where: { id: originalId },
      data: {
        estado: 'rechazado',
        proyectoEquipoItemId: null,
        reemplazaProyectoEquipoItemId: null,
        cotizacionSeleccionadaId: null,
      },
    })

    // 4. Crear nuevo ítem de reemplazo
    const nuevoItem = await prisma.listaEquipoItem.create({
      data: {
        codigo: nuevo.codigo,
        descripcion: nuevo.descripcion,
        unidad: nuevo.unidad,
        cantidad: nuevo.cantidad,
        listaId: original.listaId,
        responsableId: session.user.id,
        estado: 'borrador',
        origen: 'reemplazo',
        comentarioRevision: nuevo.comentarioRevision || '',
        verificado: false,
        cotizacionSeleccionadaId: nuevo.cotizacionSeleccionadaId || undefined,
        proyectoEquipoItemId: nuevo.proyectoEquipoItemId,
        reemplazaProyectoEquipoItemId: original.proyectoEquipoItemId || undefined, // ✅ nuevo campo correcto
      },
    })

    // 5. Actualizar ProyectoEquipoItem con el nuevo ítem
    await prisma.proyectoEquipoItem.update({
      where: { id: nuevo.proyectoEquipoItemId },
      data: {
        listaEquipoSeleccionadoId: nuevoItem.id,
        estado: 'en_lista',
        cantidadReal: nuevo.cantidad,
        precioReal: nuevo.precioElegido ?? undefined,
        costoReal: (nuevo.cantidad ?? 0) * (nuevo.precioElegido ?? 0),
      },
    })

    return NextResponse.json(nuevoItem)
  } catch (error) {
    console.error('[REEMPLAZAR_ITEM_ERROR]', error)
    return NextResponse.json({ error: 'Error al reemplazar ítem' }, { status: 500 })
  }
}
