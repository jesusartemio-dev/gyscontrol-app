// ===================================================
// 📅 API para Gestión Individual de Calendarios Laborales
// ===================================================

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateCalendarioSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido').optional(),
  descripcion: z.string().optional(),
  pais: z.string().optional(),
  empresa: z.string().optional(),
  activo: z.boolean().optional(),
  horasPorDia: z.number().min(1).max(24).optional(),
  diasLaborables: z.array(z.string()).optional(),
  horaInicioManana: z.string().optional(),
  horaFinManana: z.string().optional(),
  horaInicioTarde: z.string().optional(),
  horaFinTarde: z.string().optional()
})

// ✅ GET /api/configuracion/calendario-laboral/[id] - Obtener calendario específico
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Obtener calendario usando SQL directo
    const calendario = await prisma.$queryRaw`
      SELECT
        cl.*,
        json_agg(dc) as "diasCalendario",
        json_agg(ec) as "excepciones",
        json_agg(cc) as "configuraciones"
      FROM "CalendarioLaboral" cl
      LEFT JOIN "DiaCalendario" dc ON dc."calendarioLaboralId" = cl.id
      LEFT JOIN "excepcion_calendario" ec ON ec."calendarioLaboralId" = cl.id
      LEFT JOIN "configuracion_calendario" cc ON cc."calendarioLaboralId" = cl.id
      WHERE cl.id = ${id}
      GROUP BY cl.id
    `

    if (!calendario) {
      return NextResponse.json({ error: 'Calendario no encontrado' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: calendario
    })

  } catch (error) {
    console.error('Error obteniendo calendario:', error)
    return NextResponse.json({
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}

// ✅ PUT /api/configuracion/calendario-laboral/[id] - Actualizar calendario
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = updateCalendarioSchema.parse(body)

    // Verificar permisos
    const userRole = session.user.role
    if (!['admin', 'gerente'].includes(userRole)) {
      return NextResponse.json({ error: 'No tiene permisos para actualizar calendarios' }, { status: 403 })
    }

    // Actualizar calendario usando SQL directo
    const updateFields = []
    const values = []
    let paramIndex = 1

    if (validatedData.nombre !== undefined) {
      updateFields.push(`nombre = $${paramIndex}`)
      values.push(validatedData.nombre)
      paramIndex++
    }
    if (validatedData.descripcion !== undefined) {
      updateFields.push(`descripcion = $${paramIndex}`)
      values.push(validatedData.descripcion)
      paramIndex++
    }
    if (validatedData.pais !== undefined) {
      updateFields.push(`pais = $${paramIndex}`)
      values.push(validatedData.pais)
      paramIndex++
    }
    if (validatedData.empresa !== undefined) {
      updateFields.push(`empresa = $${paramIndex}`)
      values.push(validatedData.empresa)
      paramIndex++
    }
    if (validatedData.activo !== undefined) {
      updateFields.push(`activo = $${paramIndex}`)
      values.push(validatedData.activo)
      paramIndex++
    }
    if (validatedData.horasPorDia !== undefined) {
      updateFields.push(`"horasPorDia" = $${paramIndex}`)
      values.push(validatedData.horasPorDia)
      paramIndex++
    }
    if (validatedData.diasLaborables !== undefined) {
      updateFields.push(`"diasLaborables" = $${paramIndex}`)
      values.push(validatedData.diasLaborables)
      paramIndex++
    }
    if (validatedData.horaInicioManana !== undefined) {
      updateFields.push(`"horaInicioManana" = $${paramIndex}`)
      values.push(validatedData.horaInicioManana)
      paramIndex++
    }
    if (validatedData.horaFinManana !== undefined) {
      updateFields.push(`"horaFinManana" = $${paramIndex}`)
      values.push(validatedData.horaFinManana)
      paramIndex++
    }
    if (validatedData.horaInicioTarde !== undefined) {
      updateFields.push(`"horaInicioTarde" = $${paramIndex}`)
      values.push(validatedData.horaInicioTarde)
      paramIndex++
    }
    if (validatedData.horaFinTarde !== undefined) {
      updateFields.push(`"horaFinTarde" = $${paramIndex}`)
      values.push(validatedData.horaFinTarde)
      paramIndex++
    }

    updateFields.push(`"updatedAt" = NOW()`)
    values.push(id) // ID al final

    // Ejecutar update usando query directo (workaround temporal)
    await prisma.$executeRaw`UPDATE "CalendarioLaboral" SET ${updateFields.join(', ')}, "updatedAt" = NOW() WHERE id = ${id}`

    // Obtener calendario actualizado
    const calendario = await prisma.$queryRaw`
      SELECT
        cl.*,
        json_agg(dc) as "diasCalendario",
        json_agg(ec) as "excepciones"
      FROM "CalendarioLaboral" cl
      LEFT JOIN "DiaCalendario" dc ON dc."calendarioLaboralId" = cl.id
      LEFT JOIN "ExcepcionCalendario" ec ON ec."calendarioLaboralId" = cl.id
      WHERE cl.id = ${id}
      GROUP BY cl.id
    `

    return NextResponse.json({
      success: true,
      data: calendario,
      message: 'Calendario actualizado exitosamente'
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Datos de entrada inválidos',
        details: error.errors
      }, { status: 400 })
    }

    console.error('Error actualizando calendario:', error)
    return NextResponse.json({
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}

// ✅ DELETE /api/configuracion/calendario-laboral/[id] - Eliminar calendario
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificar permisos
    const userRole = session.user.role
    if (!['admin', 'gerente'].includes(userRole)) {
      return NextResponse.json({ error: 'No tiene permisos para eliminar calendarios' }, { status: 403 })
    }

    // Verificar que no esté siendo usado usando SQL directo
    const configuraciones = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM "configuracion_calendario" WHERE "calendarioLaboralId" = ${id}
    `

    if ((configuraciones as any)[0].count > 0) {
      return NextResponse.json({
        error: 'No se puede eliminar el calendario porque está siendo usado por empresas o proyectos'
      }, { status: 400 })
    }

    // Eliminar calendario usando SQL directo (las relaciones se eliminan en cascada)
    await prisma.$executeRaw`
      DELETE FROM "CalendarioLaboral" WHERE id = ${id}
    `

    return NextResponse.json({
      success: true,
      message: 'Calendario eliminado exitosamente'
    })

  } catch (error) {
    console.error('Error eliminando calendario:', error)
    return NextResponse.json({
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}