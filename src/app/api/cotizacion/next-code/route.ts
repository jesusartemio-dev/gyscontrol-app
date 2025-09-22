// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: /api/cotizacion/next-code/
// 🔧 Descripción: Genera el próximo código de cotización disponible
// 🧠 Uso: GET para obtener el próximo código
// ✍️ Autor: Asistente IA GYS
// 📅 Última actualización: 2025-09-21
// ===================================================

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { generateNextCotizacionCode } from '@/lib/utils/cotizacionCodeGenerator'

// ✅ Obtener el próximo código de cotización disponible
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // 📡 Generar el próximo código disponible
    const { codigo, numeroSecuencia } = await generateNextCotizacionCode()

    return NextResponse.json({
      codigo,
      numeroSecuencia,
      preview: true // Indica que es un preview
    })
  } catch (error) {
    console.error('❌ Error al generar código de cotización:', error)
    return NextResponse.json({ error: 'Error al generar código de cotización' }, { status: 500 })
  }
}