// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: src/app/api/cotizacion-proveedor-item/seleccionar/
// 🔧 Descripción: API para seleccionar cotización de un ítem de lista de equipo
//
// 🧠 Uso: Permite cambiar la cotización seleccionada para un ítem específico
// ✍️ Autor: Jesús Artemio + IA GYS
// 📅 Última actualización: 2025-01-20
// ===================================================

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { listaEquipoItemId, cotizacionProveedorItemId } = body

    if (!listaEquipoItemId || !cotizacionProveedorItemId) {
      return NextResponse.json(
        { error: 'listaEquipoItemId y cotizacionProveedorItemId son requeridos' },
        { status: 400 }
      )
    }

    // Verificar que el ítem de cotización existe y pertenece al ítem de lista
    const cotizacionItem = await prisma.cotizacionProveedorItem.findFirst({
      where: {
        id: cotizacionProveedorItemId,
        listaEquipoItemId: listaEquipoItemId,
      },
      include: {
        cotizacionProveedor: true,
      },
    })

    if (!cotizacionItem) {
      return NextResponse.json(
        { error: 'La cotización no existe o no pertenece al ítem especificado' },
        { status: 404 }
      )
    }

    // Transacción para actualizar la selección y copiar precios
    await prisma.$transaction(async (tx) => {
      // Desmarcar todas las cotizaciones del ítem como no seleccionadas
      await tx.cotizacionProveedorItem.updateMany({
        where: {
          listaEquipoItemId: listaEquipoItemId,
        },
        data: {
          esSeleccionada: false,
        },
      })

      // Marcar la cotización específica como seleccionada
      await tx.cotizacionProveedorItem.update({
        where: {
          id: cotizacionProveedorItemId,
        },
        data: {
          esSeleccionada: true,
        },
      })

      // Actualizar ListaEquipoItem: referencia + copiar precio, costo, tiempo y proveedor
      await tx.listaEquipoItem.update({
        where: {
          id: listaEquipoItemId,
        },
        data: {
          cotizacionSeleccionadaId: cotizacionProveedorItemId,
          precioElegido: cotizacionItem.precioUnitario,
          costoElegido: cotizacionItem.costoTotal,
          tiempoEntrega: cotizacionItem.tiempoEntrega,
          tiempoEntregaDias: cotizacionItem.tiempoEntregaDias,
          proveedorId: cotizacionItem.cotizacionProveedor?.proveedorId || undefined,
          updatedAt: new Date(),
        },
      })
    })

    return NextResponse.json({ success: true, message: 'Cotización seleccionada correctamente' })
  } catch (error) {
    console.error('❌ Error al seleccionar cotización:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor: ' + String(error) },
      { status: 500 }
    )
  }
}
