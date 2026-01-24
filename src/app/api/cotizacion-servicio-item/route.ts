// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: /api/cotizacion-servicio-item
// 🔧 Descripción: Ruta API para crear ítems dentro de CotizacionServicio
//
// 🧠 Uso: POST desde formulario de selección o edición de ítems
// ✍️ Autor: Jesús Artemio + Asistente IA GYS
// 📅 Última actualización: 2025-04-23
// ===================================================

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import type { CotizacionServicioItemPayload } from '@/types'
import { recalcularTotalesCotizacion } from '@/lib/utils/recalculoCotizacion'
import { randomUUID } from 'crypto'

export async function POST(req: Request) {
  try {
    const data: CotizacionServicioItemPayload = await req.json()

    // ✅ Validación de campos obligatorios mínimos
    if (
      !data.cotizacionServicioId ||
      !data.nombre ||
      !data.descripcion ||
      !data.edtId ||
      !data.formula ||
      !data.unidadServicioNombre ||
      !data.unidadServicioId ||
      !data.recursoNombre ||
      !data.recursoId ||
      data.costoHora === undefined ||
      data.cantidad === undefined ||
      data.horaTotal === undefined ||
      data.factorSeguridad === undefined ||
      data.margen === undefined ||
      data.costoInterno === undefined ||
      data.costoCliente === undefined
    ) {
      return NextResponse.json(
        { error: 'Faltan campos obligatorios en el payload' },
        { status: 400 }
      )
    }

    // ✅ Crear ítem de servicio
    const creado = await prisma.cotizacionServicioItem.create({
      data: {
        id: randomUUID(),
        cotizacionServicioId: data.cotizacionServicioId,
        catalogoServicioId: data.catalogoServicioId,
        unidadServicioId: data.unidadServicioId,
        recursoId: data.recursoId,
        nombre: data.nombre,
        descripcion: data.descripcion,
        edtId: data.edtId,
        formula: data.formula,
        horaBase: data.horaBase,
        horaRepetido: data.horaRepetido,
        horaUnidad: data.horaUnidad,
        horaFijo: data.horaFijo,
        unidadServicioNombre: data.unidadServicioNombre,
        recursoNombre: data.recursoNombre,
        costoHora: data.costoHora,
        cantidad: data.cantidad,
        horaTotal: data.horaTotal,
        factorSeguridad: data.factorSeguridad,
        margen: data.margen,
        costoInterno: data.costoInterno,
        costoCliente: data.costoCliente,
        orden: data.orden ?? 0,
        nivelDificultad: data.nivelDificultad ?? 1,
        updatedAt: new Date(),
      }
    })

    // ✅ Recalcular totales de la cotización
    const servicio = await prisma.cotizacionServicio.findUnique({
      where: { id: data.cotizacionServicioId },
      select: { cotizacionId: true }
    })

    if (servicio?.cotizacionId) {
      await recalcularTotalesCotizacion(servicio.cotizacionId)
    }

    return NextResponse.json(creado, { status: 201 })

  } catch (error) {
    console.error('❌ Error en POST /cotizacion-servicio-item:', error)
    return NextResponse.json(
      { error: 'Error al crear el ítem de cotización' },
      { status: 500 }
    )
  }
}
