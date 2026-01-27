/**
 * API para gestionar el personal asignado a un proyecto
 *
 * GET    - Obtener todo el personal del proyecto
 * POST   - Asignar nuevo personal al proyecto
 * DELETE - Remover personal del proyecto (soft delete via activo=false)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createPersonalProyectoSchema, updatePersonalProyectoSchema } from '@/lib/validators/proyecto'
import { z } from 'zod'

interface RouteContext {
  params: Promise<{ id: string }>
}

// GET - Obtener todo el personal del proyecto
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id: proyectoId } = await context.params

    // Verificar que el proyecto existe
    const proyecto = await prisma.proyecto.findUnique({
      where: { id: proyectoId },
      select: {
        id: true,
        nombre: true,
        comercialId: true,
        gestorId: true,
        supervisorId: true,
        liderId: true,
        comercial: { select: { id: true, name: true, email: true, role: true } },
        gestor: { select: { id: true, name: true, email: true, role: true } },
        supervisor: { select: { id: true, name: true, email: true, role: true } },
        lider: { select: { id: true, name: true, email: true, role: true } },
      }
    })

    if (!proyecto) {
      return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })
    }

    // Obtener personal dinámico del proyecto
    const personalProyecto = await prisma.personalProyecto.findMany({
      where: {
        proyectoId,
        activo: true
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true }
        }
      },
      orderBy: [
        { rol: 'asc' },
        { fechaAsignacion: 'desc' }
      ]
    })

    // Construir respuesta con roles fijos y dinámicos
    const rolesFijos = {
      comercial: proyecto.comercial,
      gestor: proyecto.gestor,
      supervisor: proyecto.supervisor,
      lider: proyecto.lider
    }

    return NextResponse.json({
      success: true,
      data: {
        proyectoId,
        proyectoNombre: proyecto.nombre,
        rolesFijos,
        personalDinamico: personalProyecto
      }
    })

  } catch (error) {
    console.error('Error obteniendo personal del proyecto:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// POST - Asignar nuevo personal al proyecto
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id: proyectoId } = await context.params
    const body = await request.json()

    // Validar datos
    const validatedData = createPersonalProyectoSchema.parse({
      ...body,
      proyectoId
    })

    // Verificar que el proyecto existe
    const proyecto = await prisma.proyecto.findUnique({
      where: { id: proyectoId },
      select: { id: true }
    })

    if (!proyecto) {
      return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })
    }

    // Verificar que el usuario existe
    const usuario = await prisma.user.findUnique({
      where: { id: validatedData.userId },
      select: { id: true, name: true }
    })

    if (!usuario) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    // Verificar si ya existe la asignación (mismo usuario, mismo rol, mismo proyecto)
    const existente = await prisma.personalProyecto.findFirst({
      where: {
        proyectoId,
        userId: validatedData.userId,
        rol: validatedData.rol
      }
    })

    if (existente) {
      // Si existe pero está inactivo, reactivar
      if (!existente.activo) {
        const reactivado = await prisma.personalProyecto.update({
          where: { id: existente.id },
          data: {
            activo: true,
            fechaAsignacion: new Date(),
            fechaFin: null,
            notas: validatedData.notas
          },
          include: {
            user: { select: { id: true, name: true, email: true, role: true } }
          }
        })

        return NextResponse.json({
          success: true,
          data: reactivado,
          message: 'Personal reactivado en el proyecto'
        })
      }

      return NextResponse.json(
        { error: 'Este usuario ya está asignado con este rol en el proyecto' },
        { status: 400 }
      )
    }

    // Crear nueva asignación
    const nuevoPersonal = await prisma.personalProyecto.create({
      data: {
        proyectoId,
        userId: validatedData.userId,
        rol: validatedData.rol,
        fechaAsignacion: validatedData.fechaAsignacion
          ? new Date(validatedData.fechaAsignacion)
          : new Date(),
        activo: true,
        notas: validatedData.notas
      },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } }
      }
    })

    return NextResponse.json({
      success: true,
      data: nuevoPersonal,
      message: 'Personal asignado correctamente'
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error asignando personal:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// PATCH - Actualizar asignación de personal
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id: proyectoId } = await context.params
    const body = await request.json()
    const { personalId, ...updateData } = body

    if (!personalId) {
      return NextResponse.json({ error: 'personalId es requerido' }, { status: 400 })
    }

    // Validar datos de actualización
    const validatedData = updatePersonalProyectoSchema.parse(updateData)

    // Verificar que existe la asignación
    const existente = await prisma.personalProyecto.findFirst({
      where: {
        id: personalId,
        proyectoId
      }
    })

    if (!existente) {
      return NextResponse.json({ error: 'Asignación no encontrada' }, { status: 404 })
    }

    // Actualizar
    const actualizado = await prisma.personalProyecto.update({
      where: { id: personalId },
      data: {
        ...validatedData,
        fechaFin: validatedData.fechaFin ? new Date(validatedData.fechaFin) : undefined
      },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } }
      }
    })

    return NextResponse.json({
      success: true,
      data: actualizado,
      message: 'Asignación actualizada correctamente'
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error actualizando personal:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// DELETE - Desactivar asignación de personal (soft delete)
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id: proyectoId } = await context.params
    const { searchParams } = new URL(request.url)
    const personalId = searchParams.get('personalId')

    if (!personalId) {
      return NextResponse.json({ error: 'personalId es requerido' }, { status: 400 })
    }

    // Verificar que existe la asignación
    const existente = await prisma.personalProyecto.findFirst({
      where: {
        id: personalId,
        proyectoId
      }
    })

    if (!existente) {
      return NextResponse.json({ error: 'Asignación no encontrada' }, { status: 404 })
    }

    // Soft delete - marcar como inactivo
    await prisma.personalProyecto.update({
      where: { id: personalId },
      data: {
        activo: false,
        fechaFin: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Personal removido del proyecto'
    })

  } catch (error) {
    console.error('Error removiendo personal:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
