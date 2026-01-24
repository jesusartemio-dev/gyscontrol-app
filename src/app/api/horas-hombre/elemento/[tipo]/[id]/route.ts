/**
 * API para obtener información detallada de un elemento específico
 *
 * Retorna información completa de EDT, Actividad o Tarea
 * Incluye responsables, progreso, horas, y elementos relacionados
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tipo: string; id: string }> }
) {
  try {
    // Verificar sesión
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const { tipo, id } = await params

    let elemento: any = null

    switch (tipo) {
      case 'edt':
        elemento = await prisma.proyectoEdt.findUnique({
          where: { id },
          include: {
            user: {
              select: { id: true, name: true, email: true }
            },
            proyecto: {
              select: { id: true, nombre: true }
            },
            proyectoActividad: {
              include: {
                proyectoTarea: true
              }
            }
          }
        })

        if (elemento) {
          elemento = {
            id: elemento.id,
            nombre: elemento.nombre,
            tipo: 'edt',
            proyecto: elemento.proyecto,
            responsable: elemento.user,
            horasPlan: elemento.horasPlan || 0,
            horasReales: elemento.horasReales || 0,
            progreso: elemento.porcentajeAvance || 0,
            estado: elemento.estado,
            fechaInicio: elemento.fechaInicioPlan,
            fechaFin: elemento.fechaFinPlan,
            actividades: elemento.proyectoActividad
          }
        }
        break

      case 'actividad':
        elemento = await prisma.proyectoActividad.findUnique({
          where: { id },
          include: {
            user: {
              select: { id: true, name: true, email: true }
            },
            proyectoEdt: {
              include: {
                proyecto: {
                  select: { id: true, nombre: true }
                }
              }
            },
            proyectoTarea: true
          }
        })

        if (elemento) {
          elemento = {
            id: elemento.id,
            nombre: elemento.nombre,
            tipo: 'actividad',
            proyecto: elemento.proyectoEdt.proyecto,
            edt: {
              id: elemento.proyectoEdt.id,
              nombre: elemento.proyectoEdt.nombre
            },
            responsable: elemento.user,
            horasPlan: elemento.horasPlan || 0,
            horasReales: elemento.horasReales || 0,
            progreso: elemento.porcentajeAvance || 0,
            estado: elemento.estado,
            fechaInicio: elemento.fechaInicioPlan,
            fechaFin: elemento.fechaFinPlan,
            tareas: elemento.proyectoTarea
          }
        }
        break

      case 'tarea':
        elemento = await prisma.proyectoTarea.findUnique({
          where: { id },
          include: {
            user: {
              select: { id: true, name: true, email: true }
            },
            proyectoActividad: {
              include: {
                proyectoEdt: {
                  include: {
                    proyecto: {
                      select: { id: true, nombre: true }
                    }
                  }
                }
              }
            }
          }
        })

        if (elemento) {
          elemento = {
            id: elemento.id,
            nombre: elemento.nombre,
            tipo: 'tarea',
            proyecto: elemento.proyectoActividad.proyectoEdt.proyecto,
            edt: {
              id: elemento.proyectoActividad.proyectoEdt.id,
              nombre: elemento.proyectoActividad.proyectoEdt.nombre
            },
            actividad: {
              id: elemento.proyectoActividad.id,
              nombre: elemento.proyectoActividad.nombre
            },
            responsable: elemento.user,
            horasPlan: elemento.horasEstimadas || 0,
            horasReales: elemento.horasReales || 0,
            progreso: elemento.porcentajeCompletado || 0,
            estado: elemento.estado,
            fechaInicio: elemento.fechaInicio,
            fechaFin: elemento.fechaFin
          }
        }
        break

      default:
        return NextResponse.json(
          { error: 'Tipo de elemento no válido' },
          { status: 400 }
        )
    }

    if (!elemento) {
      return NextResponse.json(
        { error: 'Elemento no encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: elemento
    })

  } catch (error) {
    console.error('Error obteniendo elemento específico:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
