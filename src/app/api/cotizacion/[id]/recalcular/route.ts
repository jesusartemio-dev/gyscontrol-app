// ===================================================
// 📁 Archivo: route.ts
// 📈 Ubicación: /api/cotizacion/[id]/recalcular/route.ts
// 🔧 Descripción: Recalcula subtotales y totales generales de una cotización
// 🧠 Uso: Ejecutado desde backend al crear/editar/eliminar ítems de cotización
// ✍️ Autor: GYS AI Assistant
// 🗓️ Última actualización: 2025-05-02
// ===================================================

import { NextResponse } from 'next/server'
import { recalcularTotalesCotizacion } from '@/lib/utils/recalculoCotizacion'
import type { NextRequest } from 'next/server'

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params

  try {
    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'ID no proporcionado' }, { status: 400 })
    }

    const resultado = await recalcularTotalesCotizacion(id)

    return NextResponse.json({
      mensaje: 'Recalculado correctamente ✅',
      ...resultado
    })
  } catch (error: any) {
    console.error('❌ Error en POST /cotizacion/[id]/recalcular:', error)
    return NextResponse.json(
      { error: 'No se pudo recalcular la cotización', detalle: error.message },
      { status: 500 }
    )
  }
}
