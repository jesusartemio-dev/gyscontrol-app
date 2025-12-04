/**
 * API para obtener EDTs de un proyecto específico
 * 
 * Retorna EDTs disponibles para registro de horas en el proyecto
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const proyectoId = searchParams.get('proyectoId')

    if (!proyectoId) {
      return NextResponse.json(
        { error: 'ID del proyecto requerido' },
        { status: 400 }
      )
    }

    // Obtener EDTs del proyecto
    const edts = await prisma.proyectoEdt.findMany({
      where: {
        proyectoId: proyectoId
      },
      select: {
        id: true,
        nombre: true,
        categoriaServicio: {
          select: {
            id: true,
            nombre: true
          }
        },
        responsable: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        horasPlan: true,
        horasReales: true,
        estado: true,
        porcentajeAvance: true,
        fechaInicioPlan: true,
        fechaFinPlan: true,
        descripcion: true,
        orden: true
      },
      orderBy: {
        orden: 'asc'
      }
    })

    return NextResponse.json({
      success: true,
      data: edts.map(edt => ({
        id: edt.id,
        nombre: edt.nombre,
        categoriaNombre: edt.categoriaServicio?.nombre || 'Sin categoría',
        responsableNombre: edt.responsable?.name || 'Sin responsable',
        horasPlan: Number(edt.horasPlan) || 0,
        horasReales: Number(edt.horasReales) || 0,
        estado: edt.estado,
        progreso: edt.porcentajeAvance,
        fechaInicio: edt.fechaInicioPlan,
        fechaFin: edt.fechaFinPlan,
        descripcion: edt.descripcion,
        orden: edt.orden
      })),
      total: edts.length
    })

  } catch (error) {
    console.error('Error obteniendo EDTs del proyecto:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}