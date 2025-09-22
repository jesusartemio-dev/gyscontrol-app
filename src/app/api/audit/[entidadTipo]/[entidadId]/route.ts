// ===================================================
// 📊 API DE AUDITORÍA POR ENTIDAD
// ===================================================
// GET /api/audit/[entidadTipo]/[entidadId]
// Obtiene el historial de auditoría de una entidad específica
// ===================================================

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { obtenerHistorialEntidad } from '@/lib/services/audit'

// ===================================================
// 📡 GET - Obtener historial de entidad
// ===================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ entidadTipo: string; entidadId: string }> }
) {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { entidadTipo, entidadId } = await params

    // Validar tipo de entidad
    const tiposValidos = ['LISTA_EQUIPO', 'PEDIDO_EQUIPO', 'PROYECTO', 'COTIZACION', 'OPORTUNIDAD', 'LISTA_EQUIPO_ITEM']
    if (!tiposValidos.includes(entidadTipo)) {
      return NextResponse.json({ error: 'Tipo de entidad no válido' }, { status: 400 })
    }

    // Obtener parámetros de consulta
    const { searchParams } = new URL(request.url)
    const pagina = parseInt(searchParams.get('pagina') || '1')
    const limite = parseInt(searchParams.get('limite') || '50')
    const usuarioId = searchParams.get('usuarioId') || undefined
    const accion = searchParams.get('accion') || undefined
    const fechaDesde = searchParams.get('fechaDesde') ? new Date(searchParams.get('fechaDesde')!) : undefined
    const fechaHasta = searchParams.get('fechaHasta') ? new Date(searchParams.get('fechaHasta')!) : undefined

    // Obtener historial
    const filtros = {
      usuarioId,
      accion,
      fechaDesde,
      fechaHasta,
      limite: Math.min(limite, 100), // Máximo 100 por página
      pagina
    }

    const resultado = await obtenerHistorialEntidad(entidadTipo, entidadId, filtros)

    return NextResponse.json({
      data: resultado.data,
      pagination: {
        pagina: resultado.pagina,
        totalPaginas: resultado.totalPaginas,
        total: resultado.total,
        limite
      }
    })

  } catch (error) {
    console.error('❌ Error en GET /api/audit/[entidadTipo]/[entidadId]:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}