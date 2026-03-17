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

    const proyectoItem = await prisma.proyectoEquipoCotizadoItem.findUnique({
      where: { id: nuevo.proyectoEquipoItemId },
    })

    if (!proyectoItem) {
      return NextResponse.json({ error: 'ID de ProyectoEquipoItem no válido' }, { status: 400 })
    }

    // 3. Rechazar ítem original
    await prisma.listaEquipoItem.update({
      where: { id: originalId },
      data: {
        estado: 'borrador',
        proyectoEquipoItemId: null,
        reemplazaProyectoEquipoCotizadoItemId: null,
        cotizacionSeleccionadaId: null,
      },
    })

    // 4. Crear nuevo ítem de reemplazo
    const nuevoItem = await prisma.listaEquipoItem.create({
      data: {
        id: `lista-item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        codigo: nuevo.codigo,
        descripcion: nuevo.descripcion,
        marca: nuevo.marca || proyectoItem.marca || '', // ✅ Copiar marca
        categoria: nuevo.categoria || proyectoItem.categoria || '', // ✅ Copiar categoria
        unidad: nuevo.unidad,
        cantidad: nuevo.cantidad,
        presupuesto: nuevo.presupuesto || proyectoItem.precioCliente || 0, // ✅ Copiar presupuesto
        listaId: original.listaId,
        responsableId: session.user.id,
        estado: 'borrador',
        origen: 'reemplazo',
        catalogoEquipoId: nuevo.catalogoEquipoId || proyectoItem?.catalogoEquipoId || null,
        comentarioRevision: nuevo.comentarioRevision || '',
        verificado: false,
        cotizacionSeleccionadaId: nuevo.cotizacionSeleccionadaId || undefined,
        proyectoEquipoItemId: nuevo.proyectoEquipoItemId,
        reemplazaProyectoEquipoCotizadoItemId: original.proyectoEquipoItemId || undefined, // ✅ nuevo campo correcto
        updatedAt: new Date()
      },
    })

    // 5. Actualizar ProyectoEquipoItem con el nuevo ítem
    await prisma.proyectoEquipoCotizadoItem.update({
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
