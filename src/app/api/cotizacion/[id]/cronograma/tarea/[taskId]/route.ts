// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: /api/cotizacion/[id]/cronograma/tarea/[taskId]/
// 🔧 Descripción: API para gestión individual de tareas del cronograma comercial
// ✅ PATCH: Actualizar tarea específica
// ✍️ Autor: Asistente IA - Interactividad Gantt
// 📅 Última actualización: 2025-09-22
// ===================================================

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id, taskId } = await params
    const data = await request.json()
    const { nombre, fechaInicio, fechaFin, estado, prioridad, descripcion } = data

    // ✅ Verificar que la tarea existe y pertenece a la cotización
    const tareaExistente = await prisma.cotizacionTarea.findUnique({
      where: { id: taskId },
      include: {
        cotizacionEdt: {
          include: {
            cotizacion: true
          }
        }
      }
    })

    if (!tareaExistente) {
      return NextResponse.json(
        { error: 'Tarea no encontrada' },
        { status: 404 }
      )
    }

    if (tareaExistente.cotizacionEdt.cotizacionId !== id) {
      return NextResponse.json(
        { error: 'La tarea no pertenece a esta cotización' },
        { status: 403 }
      )
    }

    // ✅ Validaciones de fechas
    if (fechaInicio !== undefined || fechaFin !== undefined) {
      let startDate: Date | null = null
      let endDate: Date | null = null

      // Validar fechaInicio si se proporciona
      if (fechaInicio !== undefined) {
        if (!fechaInicio || fechaInicio.trim() === '') {
          return NextResponse.json(
            { error: 'La fecha de inicio no puede estar vacía' },
            { status: 400 }
          )
        }
        startDate = new Date(fechaInicio)
        if (isNaN(startDate.getTime())) {
          return NextResponse.json(
            { error: 'La fecha de inicio no es válida' },
            { status: 400 }
          )
        }
      }

      // Validar fechaFin si se proporciona
      if (fechaFin !== undefined) {
        if (!fechaFin || fechaFin.trim() === '') {
          return NextResponse.json(
            { error: 'La fecha de fin no puede estar vacía' },
            { status: 400 }
          )
        }
        endDate = new Date(fechaFin)
        if (isNaN(endDate.getTime())) {
          return NextResponse.json(
            { error: 'La fecha de fin no es válida' },
            { status: 400 }
          )
        }
      }

      // Si ambas fechas están presentes, validar lógica
      if (startDate && endDate && endDate <= startDate) {
        return NextResponse.json(
          { error: 'La fecha de fin debe ser posterior a la fecha de inicio' },
          { status: 400 }
        )
      }

      // Verificar que las fechas estén dentro del EDT
      const edtStart = tareaExistente.cotizacionEdt.fechaInicioComercial
      const edtEnd = tareaExistente.cotizacionEdt.fechaFinComercial

      if (edtStart && startDate && startDate < new Date(edtStart)) {
        return NextResponse.json(
          { error: 'La fecha de inicio no puede ser anterior al inicio del EDT' },
          { status: 400 }
        )
      }

      if (edtEnd && endDate && endDate > new Date(edtEnd)) {
        return NextResponse.json(
          { error: 'La fecha de fin no puede ser posterior al fin del EDT' },
          { status: 400 }
        )
      }
    }

    // ✅ Preparar datos de actualización
    const updateData: any = {}

    if (nombre !== undefined) {
      if (!nombre || nombre.trim() === '') {
        return NextResponse.json(
          { error: 'El nombre de la tarea no puede estar vacío' },
          { status: 400 }
        )
      }
      updateData.nombre = nombre.trim()
    }

    if (fechaInicio !== undefined) {
      updateData.fechaInicio = new Date(fechaInicio)
    }

    if (fechaFin !== undefined) {
      updateData.fechaFin = new Date(fechaFin)
    }

    if (estado !== undefined) {
      updateData.estado = estado
    }

    if (prioridad !== undefined) {
      updateData.prioridad = prioridad
    }

    if (descripcion !== undefined) {
      updateData.descripcion = descripcion?.trim() || null
    }

    // Verificar que al menos un campo se va a actualizar
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No se proporcionaron campos para actualizar' },
        { status: 400 }
      )
    }

    // ✅ Actualizar tarea
    const tareaActualizada = await prisma.cotizacionTarea.update({
      where: { id: taskId },
      data: updateData,
      include: {
        responsable: {
          select: { id: true, name: true }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: tareaActualizada,
      message: 'Tarea actualizada exitosamente'
    })

  } catch (error: any) {
    console.error('❌ Error al actualizar tarea:', error)

    // ✅ Manejar errores específicos de Prisma
    if (error?.code === 'P2025') {
      return NextResponse.json(
        { error: 'Tarea no encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}