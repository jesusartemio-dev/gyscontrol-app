// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: /api/cotizacion/[id]/fases/[faseId]/
// 🔧 Descripción: API para gestión individual de fases de cotización
// ✅ DELETE: Eliminar fase específica
// ✍️ Autor: Sistema GYS - Asistente IA
// 📅 Última actualización: 2025-09-22
// ===================================================

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

// ===================================================
// 🗑️ DELETE /api/cotizacion/[id]/fases/[faseId]
// ===================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; faseId: string }> }
) {
  const { id, faseId } = await params

  try {
    // 📋 Checklist de validación
    // - [ ] Validar sesión
    // - [ ] Validar permisos
    // - [ ] Verificar que la fase existe y pertenece a la cotización
    // - [ ] Verificar que no hay EDTs asociados (o permitir eliminación en cascada)
    // - [ ] Eliminar fase

    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificar que la fase existe y pertenece a la cotización
    const fase = await prisma.cotizacionFase.findFirst({
      where: {
        id: faseId,
        cotizacionId: id
      },
      include: {
        edts: {
          select: { id: true, nombre: true }
        }
      }
    })

    if (!fase) {
      return NextResponse.json(
        { error: 'Fase no encontrada o no pertenece a esta cotización' },
        { status: 404 }
      )
    }

    // Verificar si hay EDTs asociados
    if (fase.edts && fase.edts.length > 0) {
      return NextResponse.json(
        {
          error: 'No se puede eliminar la fase porque tiene EDTs asociados',
          details: `La fase "${fase.nombre}" tiene ${fase.edts.length} EDT(s) asignado(s). Desasigna los EDTs primero.`
        },
        { status: 400 }
      )
    }

    // Eliminar la fase
    await prisma.cotizacionFase.delete({
      where: { id: faseId }
    })

    logger.info(`🗑️ Fase comercial eliminada: ${fase.nombre} - Cotización: ${id}`)

    return NextResponse.json({
      success: true,
      message: `Fase "${fase.nombre}" eliminada exitosamente`,
      data: { faseId, nombre: fase.nombre }
    })

  } catch (error) {
    logger.error('❌ Error al eliminar fase comercial:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}