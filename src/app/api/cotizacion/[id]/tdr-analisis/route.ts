import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { NextRequest } from 'next/server'

// GET — Fetch TDR analysis for a cotización
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { id } = await context.params

  try {
    const analisis = await prisma.cotizacionTdrAnalisis.findFirst({
      where: { cotizacionId: id },
      orderBy: { updatedAt: 'desc' },
    })

    if (!analisis) {
      return NextResponse.json({ analisis: null })
    }

    return NextResponse.json({ analisis })
  } catch (error) {
    console.error('[tdr-analisis] GET error:', error)
    return NextResponse.json({ error: 'Error al obtener análisis TDR' }, { status: 500 })
  }
}

// PATCH — Update specific fields of TDR analysis (e.g. consultas status)
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { id } = await context.params

  try {
    const body = await req.json()

    const analisis = await prisma.cotizacionTdrAnalisis.findFirst({
      where: { cotizacionId: id },
      orderBy: { updatedAt: 'desc' },
      select: { id: true },
    })

    if (!analisis) {
      return NextResponse.json({ error: 'No hay análisis TDR para esta cotización' }, { status: 404 })
    }

    // Allow updating specific JSON fields
    const allowedFields = [
      'consultasCliente', 'supuestos', 'exclusiones', 'ambiguedades',
      'requerimientos', 'equiposIdentificados', 'serviciosIdentificados',
      'cronogramaEstimado', 'presupuestoEstimado', 'resumenTdr',
      'clienteDetectado', 'proyectoDetectado', 'ubicacionDetectada', 'alcanceDetectado',
    ]

    const updateData: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No hay campos válidos para actualizar' }, { status: 400 })
    }

    const updated = await prisma.cotizacionTdrAnalisis.update({
      where: { id: analisis.id },
      data: updateData,
    })

    return NextResponse.json({ analisis: updated })
  } catch (error) {
    console.error('[tdr-analisis] PATCH error:', error)
    return NextResponse.json({ error: 'Error al actualizar análisis TDR' }, { status: 500 })
  }
}
