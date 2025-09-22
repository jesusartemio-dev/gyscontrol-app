// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: /api/cotizacion/[id]/cronograma/edt/[edtId]/
// 🔧 Descripción: API para gestión individual de EDTs del cronograma comercial
// ✅ PATCH: Actualizar EDT específico
// ✍️ Autor: Asistente IA - Edición de EDTs
// 📅 Última actualización: 2025-09-22
// ===================================================

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; edtId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const data = await request.json()
    const { nombre, fechaInicioComercial, fechaFinComercial, estado, prioridad, descripcion } = data

    // ✅ Verificar que el EDT existe y pertenece a la cotización
    const edtExistente = await prisma.cotizacionEdt.findUnique({
      where: { id: params.edtId },
      include: {
        cotizacion: true,
        cotizacionFase: true
      }
    })

    if (!edtExistente) {
      return NextResponse.json(
        { error: 'EDT no encontrado' },
        { status: 404 }
      )
    }

    if (edtExistente.cotizacionId !== params.id) {
      return NextResponse.json(
        { error: 'El EDT no pertenece a esta cotización' },
        { status: 403 }
      )
    }

    // ✅ Validaciones de fechas
    if (fechaInicioComercial !== undefined || fechaFinComercial !== undefined) {
      let startDate: Date | null = null
      let endDate: Date | null = null

      // Validar fechaInicioComercial si se proporciona
      if (fechaInicioComercial !== undefined) {
        if (!fechaInicioComercial || fechaInicioComercial.trim() === '') {
          return NextResponse.json(
            { error: 'La fecha de inicio no puede estar vacía' },
            { status: 400 }
          )
        }
        startDate = new Date(fechaInicioComercial)
        if (isNaN(startDate.getTime())) {
          return NextResponse.json(
            { error: 'La fecha de inicio no es válida' },
            { status: 400 }
          )
        }
      }

      // Validar fechaFinComercial si se proporciona
      if (fechaFinComercial !== undefined) {
        if (!fechaFinComercial || fechaFinComercial.trim() === '') {
          return NextResponse.json(
            { error: 'La fecha de fin no puede estar vacía' },
            { status: 400 }
          )
        }
        endDate = new Date(fechaFinComercial)
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

      // Verificar que las fechas estén dentro de la fase padre
      if (edtExistente.cotizacionFase) {
        const faseStart = edtExistente.cotizacionFase.fechaInicioPlan
        const faseEnd = edtExistente.cotizacionFase.fechaFinPlan

        if (faseStart && startDate && startDate < new Date(faseStart)) {
          return NextResponse.json(
            { error: 'La fecha de inicio no puede ser anterior al inicio de la fase padre' },
            { status: 400 }
          )
        }

        if (faseEnd && endDate && endDate > new Date(faseEnd)) {
          return NextResponse.json(
            { error: 'La fecha de fin no puede ser posterior al fin de la fase padre' },
            { status: 400 }
          )
        }
      }
    }

    // ✅ Preparar datos de actualización
    const updateData: any = {}

    if (nombre !== undefined) {
      if (!nombre || nombre.trim() === '') {
        return NextResponse.json(
          { error: 'El nombre del EDT no puede estar vacío' },
          { status: 400 }
        )
      }
      updateData.nombre = nombre.trim()
    }

    if (fechaInicioComercial !== undefined) {
      updateData.fechaInicioComercial = new Date(fechaInicioComercial)
    }

    if (fechaFinComercial !== undefined) {
      updateData.fechaFinComercial = new Date(fechaFinComercial)
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

    // ✅ Actualizar EDT
    const edtActualizado = await prisma.cotizacionEdt.update({
      where: { id: params.edtId },
      data: updateData,
      include: {
        responsable: {
          select: { id: true, name: true }
        },
        categoriaServicio: {
          select: { id: true, nombre: true }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: edtActualizado,
      message: 'EDT actualizado exitosamente'
    })

  } catch (error: any) {
    console.error('❌ Error al actualizar EDT:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}