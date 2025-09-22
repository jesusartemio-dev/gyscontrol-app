// ===================================================
// 📊 API DE ACTIVIDAD RECIENTE
// ===================================================
// GET /api/audit/actividad-reciente
// Obtiene la actividad reciente de todo el sistema
// ===================================================

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { obtenerActividadReciente } from '@/lib/services/audit'

// ===================================================
// 📡 GET - Obtener actividad reciente
// ===================================================

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Obtener parámetros de consulta
    const { searchParams } = new URL(request.url)
    const limite = parseInt(searchParams.get('limite') || '20')
    const usuarioId = searchParams.get('usuarioId') || undefined

    // Validar límite
    const limiteValidado = Math.min(Math.max(limite, 1), 100) // Entre 1 y 100

    // Obtener actividad reciente
    console.log('🔍 Consultando actividad reciente con límite:', limiteValidado, 'usuario:', usuarioId)
    const actividad = await obtenerActividadReciente(limiteValidado, usuarioId)
    console.log('✅ Actividad obtenida:', actividad?.length || 0, 'registros')

    return NextResponse.json({
      data: actividad || [],
      meta: {
        limite: limiteValidado,
        total: actividad?.length || 0
      }
    })

  } catch (error: any) {
    console.error('❌ Error en GET /api/audit/actividad-reciente:', error)
    return NextResponse.json(
      {
        error: 'Error interno del servidor',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}