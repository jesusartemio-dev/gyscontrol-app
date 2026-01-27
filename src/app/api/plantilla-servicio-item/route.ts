// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: /api/plantilla-servicio-item/route.ts
// 🔧 Descripción: Ruta API para manejar creación de ítems de servicio dentro de PlantillaServicio
//
// 🧠 Uso: Crea un nuevo ítem copiando los datos desde el catálogo de servicio
// ✍️ Autor: Asistente IA GYS
// 📅 Última actualización: 2025-04-23
// ===================================================

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import type { PlantillaServicioItemPayload } from '@/types'

export async function POST(req: Request) {
  try {
    const data: PlantillaServicioItemPayload = await req.json()

    // ✅ Validación mínima de campos requeridos
    if (
      !data.plantillaServicioId ||
      !data.unidadServicioId ||
      !data.recursoId ||
      !data.nombre ||
      !data.descripcion ||
      !data.categoria ||
      !data.formula ||
      data.cantidad === undefined ||
      data.horaTotal === undefined ||
      data.factorSeguridad === undefined ||
      data.costoInterno === undefined ||
      data.margen === undefined ||
      data.costoCliente === undefined
    ) {
      return NextResponse.json(
        { error: 'Faltan campos obligatorios en el payload' },
        { status: 400 }
      )
    }

    // ✅ Crear ítem de servicio
    const creado = await prisma.plantillaServicioItem.create({
      data: {
        id: `plantilla-servicio-item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        plantillaServicioId: data.plantillaServicioId,
        updatedAt: new Date(),
        catalogoServicioId: data.catalogoServicioId,
        unidadServicioId: data.unidadServicioId,
        recursoId: data.recursoId,
        nombre: data.nombre,
        descripcion: data.descripcion,
        categoria: data.categoria,
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
        costoInterno: data.costoInterno,
        margen: data.margen,
        costoCliente: data.costoCliente
      }
    })

    return NextResponse.json(creado, { status: 201 })
  } catch (error) {
    console.error('❌ Error en POST /plantilla-servicio-item:', error)
    return NextResponse.json(
      { error: 'Error al crear el ítem de servicio' },
      { status: 500 }
    )
  }
}
