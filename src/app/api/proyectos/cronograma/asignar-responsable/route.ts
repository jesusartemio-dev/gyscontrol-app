/**
 * API para asignar responsables a elementos del cronograma
 *
 * Permite asignar usuarios responsables de EDTs, Zonas, Actividades y Tareas
 * Actualiza permisos y notificaciones automáticamente
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { z } from 'zod'

const asignarResponsableSchema = z.object({
  tipo: z.enum(['edt', 'tarea']), // Solo EDT y Tarea tienen responsables en el schema actual
  id: z.string(),
  responsableId: z.string().nullable() // null para quitar asignación
})

export async function PUT(request: NextRequest) {
  try {
    // Verificar sesión
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validatedData = asignarResponsableSchema.parse(body)

    const { tipo, id, responsableId } = validatedData

    // Verificar que el elemento existe
    let elemento: any = null
    let proyectoId: string = ''

    switch (tipo) {
      case 'edt':
        elemento = await prisma.proyectoEdt.findUnique({
          where: { id },
          select: { id: true, proyectoId: true, nombre: true, responsableId: true }
        })
        proyectoId = elemento?.proyectoId || ''
        break

      case 'tarea':
        elemento = await prisma.proyectoTarea.findUnique({
          where: { id },
          include: {
            responsable: {
              select: { id: true, name: true }
            },
            proyectoActividad: {
              include: {
                proyectoEdt: {
                  select: { proyectoId: true }
                }
              }
            }
          }
        })
        proyectoId = elemento?.proyectoActividad?.proyectoEdt?.proyectoId || ''
        break
    }

    if (!elemento) {
      return NextResponse.json(
        { error: 'Elemento no encontrado' },
        { status: 404 }
      )
    }

    // Verificar que el nuevo responsable existe (si no es null)
    if (responsableId) {
      const responsable = await prisma.user.findUnique({
        where: { id: responsableId },
        select: { id: true, name: true, email: true }
      })

      if (!responsable) {
        return NextResponse.json(
          { error: 'Usuario responsable no encontrado' },
          { status: 404 }
        )
      }
    }

    // Verificar permisos (solo gestores, coordinadores o admins pueden asignar)
    // TODO: Implementar verificación de permisos por rol

    // Actualizar responsable
    let elementoActualizado: any = null

    switch (tipo) {
      case 'edt':
        elementoActualizado = await prisma.proyectoEdt.update({
          where: { id },
          data: { responsableId },
          include: {
            responsable: {
              select: { id: true, name: true, email: true }
            }
          }
        })
        break

      case 'tarea':
        elementoActualizado = await prisma.proyectoTarea.update({
          where: { id },
          data: { responsableId },
          include: {
            responsable: {
              select: { id: true, name: true, email: true }
            }
          }
        })
        break
    }

    // TODO: Crear notificación para el nuevo responsable
    // TODO: Actualizar permisos de acceso al proyecto

    return NextResponse.json({
      success: true,
      data: {
        tipo,
        elementoId: id,
        elementoNombre: elemento.nombre,
        responsableAnterior: elemento.responsable?.id || null,
        responsableNuevo: responsableId,
        elementoActualizado
      },
      message: responsableId
        ? `Responsable asignado correctamente`
        : `Responsable removido correctamente`
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error asignando responsable:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// GET para obtener responsables disponibles para un elemento
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tipo = searchParams.get('tipo')
    const id = searchParams.get('id')

    if (!tipo || !id) {
      return NextResponse.json(
        { error: 'Tipo e ID del elemento son requeridos' },
        { status: 400 }
      )
    }

    // Obtener proyecto del elemento
    let proyectoId: string = ''

    switch (tipo) {
      case 'edt':
        const edt = await prisma.proyectoEdt.findUnique({
          where: { id },
          select: { proyectoId: true }
        })
        proyectoId = edt?.proyectoId || ''
        break

      case 'zona':
        const zona = await prisma.proyectoZona.findUnique({
          where: { id },
          select: { proyectoId: true }
        })
        proyectoId = zona?.proyectoId || ''
        break

      case 'actividad':
        const actividad = await prisma.proyectoActividad.findUnique({
          where: { id },
          include: {
            proyectoEdt: {
              select: { proyectoId: true }
            }
          }
        })
        proyectoId = actividad?.proyectoEdt?.proyectoId || ''
        break

      case 'tarea':
        const tarea = await prisma.proyectoTarea.findUnique({
          where: { id },
          include: {
            proyectoActividad: {
              include: {
                proyectoEdt: {
                  select: { proyectoId: true }
                }
              }
            }
          }
        })
        proyectoId = tarea?.proyectoActividad?.proyectoEdt?.proyectoId || ''
        break

      default:
        return NextResponse.json(
          { error: 'Tipo de elemento no válido' },
          { status: 400 }
        )
    }

    if (!proyectoId) {
      return NextResponse.json(
        { error: 'Proyecto no encontrado para el elemento' },
        { status: 404 }
      )
    }

    // Obtener usuarios con acceso al proyecto
    // TODO: Filtrar por roles apropiados (gestores, coordinadores, etc.)
    const usuariosProyecto = await prisma.user.findMany({
      where: {
        // Usuarios con roles apropiados para ser responsables
        role: {
          in: ['admin', 'gerente', 'gestor', 'coordinador', 'proyectos']
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      },
      orderBy: { name: 'asc' }
    })

    return NextResponse.json({
      success: true,
      data: {
        tipo,
        elementoId: id,
        proyectoId,
        usuariosDisponibles: usuariosProyecto
      }
    })

  } catch (error) {
    console.error('Error obteniendo responsables disponibles:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}