// ===================================================
// 📁 Archivo: /api/proyecto-equipo-item/route.ts
// 📌 Descripción: Ruta para crear un nuevo ProyectoEquipoItem
// ===================================================

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const body = await req.json()

    console.log('📦 Payload recibido en POST /proyecto-equipo-item:', body)

    const {
      proyectoEquipoId,
      catalogoEquipoId,
      listaId,
      listaEquipoSeleccionadoId, // 🆕 reemplaza equipoOriginalId
      codigo,
      descripcion,
      unidad,
      categoria,
      marca,
      cantidad,
      precioInterno,
      precioCliente,
      costoInterno,
      costoCliente,
      estado,
      motivoCambio,
      precioReal,
      cantidadReal,
      costoReal,
    } = body

    const nuevoItem = await prisma.proyectoEquipoCotizadoItem.create({
      data: {
        proyectoEquipoId,
        catalogoEquipoId,
        listaId,
        listaEquipoSeleccionadoId,
        codigo,
        descripcion,
        unidad,
        categoria,
        marca,
        cantidad,
        precioInterno,
        precioCliente,
        costoInterno,
        costoCliente,
        estado,        
        motivoCambio,
        precioReal,
        cantidadReal,
        costoReal,
      },
    })

    console.log('✅ ProyectoEquipoItem creado con éxito:', nuevoItem)

    return NextResponse.json(nuevoItem)
  } catch (error) {
    console.error('❌ Error al crear ProyectoEquipoItem:', error)
    return NextResponse.json(
      { error: 'Error al crear ítem de equipo del proyecto', detalle: error },
      { status: 500 }
    )
  }
}
