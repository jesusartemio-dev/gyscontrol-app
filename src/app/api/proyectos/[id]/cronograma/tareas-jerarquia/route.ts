/**
 * API para obtener la jerarquía completa de tareas de un proyecto
 * 
 * Retorna la estructura Fases → EDTs → Actividades → Tareas
 * con información de responsables y horas para el sistema de horas hombre
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Verificar sesión
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const { id: proyectoId } = await params
    const { searchParams } = new URL(request.url)
    const cronogramaId = searchParams.get('cronogramaId')
    const modoVista = searchParams.get('modoVista') || 'automatico'

    // Obtener fases del proyecto
    const fases = await prisma.proyectoFase.findMany({
      where: {
        proyectoId,
        ...(cronogramaId ? { proyectoCronogramaId: cronogramaId } : {})
      },
      include: {
        proyectoEdt: {
          include: {
            user: {
              select: { id: true, name: true, email: true }
            },
            proyectoActividad: {
              include: {
                user: {
                  select: { id: true, name: true, email: true }
                },
                proyectoTarea: {
                  include: {
                    user: {
                      select: { id: true, name: true, email: true }
                    }
                  }
                }
              }
            }
          }
        }
      },
      orderBy: { orden: 'asc' }
    })

    // Construir jerarquía completa usando la estructura real del esquema
    const jerarquia = fases.map(fase => {
      const edts = fase.proyectoEdt.map(edt => {
        const actividades = edt.proyectoActividad.map(actividad => {
          const tareas = actividad.proyectoTarea.map(tarea => ({
            id: tarea.id,
            nombre: tarea.nombre,
            tipo: 'tarea' as const,
            nivel: 4,
            responsableId: tarea.responsableId,
            responsableNombre: tarea.user?.name || 'Sin asignar',
            fechaInicio: tarea.fechaInicio,
            fechaFin: tarea.fechaFin,
            porcentajeAvance: tarea.porcentajeCompletado || 0,
            horasPlan: Number(tarea.horasEstimadas) || 0,
            horasReales: Number(tarea.horasReales) || 0,
            estado: tarea.estado
          }))

          return {
            id: actividad.id,
            nombre: actividad.nombre,
            tipo: 'actividad' as const,
            nivel: 3,
            responsableId: actividad.responsableId,
            responsableNombre: actividad.user?.name || 'Sin asignar',
            fechaInicio: actividad.fechaInicioPlan,
            fechaFin: actividad.fechaFinPlan,
            porcentajeAvance: actividad.porcentajeAvance || 0,
            horasPlan: Number(actividad.horasPlan) || 0,
            horasReales: Number(actividad.horasReales) || 0,
            estado: actividad.estado,
            hijos: tareas
          }
        })

        return {
          id: edt.id,
          nombre: edt.nombre,
          tipo: 'edt' as const,
          nivel: 2,
          responsableId: edt.responsableId,
          responsableNombre: edt.user?.name || 'Sin asignar',
          fechaInicio: edt.fechaInicioPlan,
          fechaFin: edt.fechaFinPlan,
          porcentajeAvance: edt.porcentajeAvance || 0,
          horasPlan: Number(edt.horasPlan) || 0,
          horasReales: Number(edt.horasReales) || 0,
          estado: edt.estado,
          hijos: actividades
        }
      })

      return {
        id: fase.id,
        nombre: fase.nombre,
        tipo: 'fase' as const,
        nivel: 1,
        responsableId: null, // ProyectoFase no tiene responsableId directo
        responsableNombre: 'Sin asignar',
        fechaInicio: fase.fechaInicioPlan,
        fechaFin: fase.fechaFinPlan,
        porcentajeAvance: fase.porcentajeAvance || 0,
        horasPlan: 0, // ProyectoFase no tiene horasPlan
        horasReales: 0, // ProyectoFase no tiene horasReales
        estado: fase.estado,
        hijos: edts
      }
    })

    // Aplanar según el modo de vista
    const elementosAplanados = modoVista === 'jerarquia_completa' 
      ? jerarquia.flatMap(fase => [fase, ...fase.hijos.flatMap(edt => [edt, ...edt.hijos.flatMap(actividad => [actividad, ...actividad.hijos])])])
      : jerarquia

    return NextResponse.json({
      success: true,
      data: elementosAplanados,
      metadata: {
        proyectoId,
        cronogramaId,
        modoVista,
        totalFases: fases.length,
        totalElementos: elementosAplanados.length
      }
    })

  } catch (error) {
    logger.error('Error obteniendo jerarquía de tareas:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}