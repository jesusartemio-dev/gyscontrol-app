import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { NextRequest } from 'next/server'
import { calcularCompletitudGeneral } from '@/lib/tdr/completitud'
import type { TdrAnalisisCore } from '@/types/tdr'

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

// POST — Crear registro vacío (idempotente: si ya existe devuelve el existente)
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id: cotizacionId } = await params

    const cotizacion = await prisma.cotizacion.findUnique({
      where: { id: cotizacionId },
      select: { id: true },
    })
    if (!cotizacion) {
      return NextResponse.json({ error: 'Cotización no encontrada' }, { status: 404 })
    }

    // Si ya existe análisis, devolver el existente (idempotente)
    const existente = await prisma.cotizacionTdrAnalisis.findFirst({
      where: { cotizacionId },
      orderBy: { createdAt: 'desc' },
    })
    if (existente) {
      return NextResponse.json(existente)
    }

    // Crear registro vacío
    const creado = await prisma.cotizacionTdrAnalisis.create({
      data: { cotizacionId, resumenTdr: '' },
    })

    // Calcular completitud inicial (todo vacío)
    const completitud = calcularCompletitudGeneral(creado as unknown as TdrAnalisisCore)
    const final = await prisma.cotizacionTdrAnalisis.update({
      where: { id: creado.id },
      data: { bloquesCompletitud: completitud.bloques },
    })

    return NextResponse.json(final, { status: 201 })
  } catch (error) {
    console.error('[POST /api/cotizacion/[id]/tdr-analisis]', error)
    return NextResponse.json({ error: 'Error al crear análisis' }, { status: 500 })
  }
}

// PATCH — Actualizar campos del análisis TDR (reemplazo total del campo)
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

    const allowedFields = [
      // Campos existentes
      'consultasCliente',
      'supuestos',
      'exclusiones',
      'ambiguedades',
      'requerimientos',
      'equiposIdentificados',
      'serviciosIdentificados',
      'cronogramaEstimado',
      'presupuestoEstimado',
      'resumenTdr',
      'clienteDetectado',
      'proyectoDetectado',
      'ubicacionDetectada',
      'alcanceDetectado',
      // Campos nuevos del Bloque 1
      'resumenEjecutivoNarrativa',
      'resumenEjecutivoPuntos',
      'personalRequerido',
      'normasAplicables',
      'documentosPrevios',
      'entregablesDossier',
      'riesgosCriticos',
      'hitosContractuales',
      'penalidades',
      'garantias',
    ] as const

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

    // Recalcular completitud después del update
    const completitud = calcularCompletitudGeneral(updated as unknown as TdrAnalisisCore)
    const final = await prisma.cotizacionTdrAnalisis.update({
      where: { id: updated.id },
      data: { bloquesCompletitud: completitud.bloques },
    })

    return NextResponse.json({ analisis: final })
  } catch (error) {
    console.error('[tdr-analisis] PATCH error:', error)
    return NextResponse.json({ error: 'Error al actualizar análisis TDR' }, { status: 500 })
  }
}

// DELETE — Borrar análisis completo
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id: cotizacionId } = await params

    const existente = await prisma.cotizacionTdrAnalisis.findFirst({
      where: { cotizacionId },
    })
    if (!existente) {
      return NextResponse.json({ error: 'Análisis no encontrado' }, { status: 404 })
    }

    await prisma.cotizacionTdrAnalisis.delete({ where: { id: existente.id } })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[DELETE /api/cotizacion/[id]/tdr-analisis]', error)
    return NextResponse.json({ error: 'Error al eliminar análisis' }, { status: 500 })
  }
}
