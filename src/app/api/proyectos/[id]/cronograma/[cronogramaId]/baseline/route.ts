// ===================================================
// 📁 Archivo: baseline/route.ts
// 📌 Ubicación: src/app/api/proyectos/[id]/cronograma/[cronogramaId]/baseline/route.ts
// 🔧 Descripción: API para marcar/desmarcar cronograma como baseline
// 🎯 Funcionalidades: Cambiar estado baseline de cronogramas de planificación
// ✍️ Autor: Sistema de IA Mejorado
// 📅 Última actualización: 2025-11-04
// ===================================================

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; cronogramaId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id, cronogramaId } = await params

    // ✅ Validar que el proyecto existe
    const proyecto = await prisma.proyecto.findUnique({
      where: { id },
      select: { id: true, nombre: true }
    })

    if (!proyecto) {
      return NextResponse.json(
        { error: 'Proyecto no encontrado' },
        { status: 404 }
      )
    }

    // ✅ Validar que el cronograma existe y pertenece al proyecto
    const cronograma = await prisma.proyectoCronograma.findFirst({
      where: {
        id: cronogramaId,
        proyectoId: id
      }
    })

    if (!cronograma) {
      return NextResponse.json(
        { error: 'Cronograma no encontrado o no pertenece al proyecto' },
        { status: 404 }
      )
    }

    // ✅ Solo permitir marcar/desmarcar baseline en cronogramas de planificación
    if (cronograma.tipo !== 'planificacion') {
      return NextResponse.json(
        { error: 'Solo se puede marcar como baseline cronogramas de planificación' },
        { status: 400 }
      )
    }

    // ✅ Si se va a marcar como baseline, quitar el baseline de otros cronogramas
    if (!cronograma.esBaseline) {
      await prisma.proyectoCronograma.updateMany({
        where: {
          proyectoId: id,
          esBaseline: true
        },
        data: {
          esBaseline: false
        }
      })
    }

    // ✅ Cambiar el estado baseline del cronograma
    const updatedCronograma = await prisma.proyectoCronograma.update({
      where: { id: cronogramaId },
      data: {
        esBaseline: !cronograma.esBaseline,
        bloqueado: !cronograma.esBaseline,
        updatedAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      data: updatedCronograma,
      message: updatedCronograma.esBaseline
        ? 'Cronograma marcado como baseline exitosamente'
        : 'Cronograma desmarcado como baseline exitosamente'
    })

  } catch (error) {
    logger.error('Error al cambiar estado baseline:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}