// ===================================================
// 📁 Archivo: /api/proyecto-equipo-item/route.ts
// 📌 Descripción: Ruta para crear un nuevo ProyectoEquipoItem
// ===================================================

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

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
        id: crypto.randomUUID(),
        proyectoEquipoId,
        catalogoEquipoId,
        updatedAt: new Date(),
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
