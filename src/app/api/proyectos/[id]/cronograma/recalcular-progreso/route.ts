/**
 * API para recalcular el progreso del cronograma desde las tareas hacia arriba
 * POST /api/proyectos/[id]/cronograma/recalcular-progreso
 *
 * Propaga porcentajeCompletado de tareas → actividades → EDTs → fases → proyecto.
 * Útil para corregir datos históricos donde se cerraron jornadas sin propagación.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { ProgresoService } from '@/lib/services/progresoService'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id: proyectoId } = await context.params

    // Verificar que el proyecto existe
    const proyecto = await prisma.proyecto.findUnique({
      where: { id: proyectoId },
      select: { id: true, nombre: true }
    })
    if (!proyecto) {
      return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })
    }

    // Obtener todas las actividades del proyecto (a través de sus EDTs y fases)
    const actividades = await prisma.proyectoActividad.findMany({
      where: {
        proyectoEdt: {
          proyectoFase: {
            proyectoId
          }
        }
      },
      select: { id: true }
    })

    if (actividades.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No hay actividades en el cronograma',
        actualizadas: 0
      })
    }

    // Propagar progreso para cada actividad (cascada: actividad → EDT → fase → proyecto)
    let actualizadas = 0
    for (const actividad of actividades) {
      try {
        await ProgresoService.actualizarProgresoActividad(actividad.id)
        actualizadas++
      } catch (err) {
        console.error(`⚠️ Error recalculando actividad ${actividad.id}:`, err)
      }
    }

    console.log(`✅ Progreso recalculado para proyecto ${proyectoId}: ${actualizadas}/${actividades.length} actividades`)

    return NextResponse.json({
      success: true,
      message: `Progreso recalculado: ${actualizadas} actividades actualizadas`,
      actualizadas,
      total: actividades.length
    })

  } catch (error) {
    console.error('❌ Error al recalcular progreso:', error)
    return NextResponse.json(
      { error: 'Error al recalcular progreso', details: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500 }
    )
  }
}
