import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calcularCompletitudGeneral } from '@/lib/tdr/completitud'
import type { TdrAnalisisCore } from '@/types/tdr'

const allowedFields = [
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

type AllowedField = (typeof allowedFields)[number]

// ─── GET ─────────────────────────────────────────────────
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { id: proyectoId } = await params

    const proyecto = await prisma.proyecto.findUnique({
      where: { id: proyectoId },
      select: { id: true, cotizacionId: true },
    })
    if (!proyecto) {
      return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })
    }

    const analisis = await prisma.proyectoTdrAnalisis.findUnique({
      where: { proyectoId },
    })

    if (!analisis) {
      let puedeImportar = false
      let cotizacionTdrId: string | null = null
      if (proyecto.cotizacionId) {
        const tdrCot = await prisma.cotizacionTdrAnalisis.findFirst({
          where: { cotizacionId: proyecto.cotizacionId },
          select: { id: true },
          orderBy: { createdAt: 'desc' },
        })
        if (tdrCot) {
          puedeImportar = true
          cotizacionTdrId = tdrCot.id
        }
      }
      return NextResponse.json(
        {
          error: 'No existe análisis para este proyecto',
          puedeImportar,
          cotizacionId: proyecto.cotizacionId,
          cotizacionTdrId,
        },
        { status: 404 },
      )
    }

    // Incluir cotizacionId del proyecto en la respuesta para el link en UI
    return NextResponse.json({ ...analisis, cotizacionId: proyecto.cotizacionId })
  } catch (error) {
    console.error('[GET /api/proyecto/[id]/tdr-analisis]', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// ─── POST: importar desde cotización o crear vacío ───────────────
// Body: {} o sin body → importar desde cotización
// Body: { vacio: true } → crear registro vacío sin cotización
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { id: proyectoId } = await params

    const proyecto = await prisma.proyecto.findUnique({
      where: { id: proyectoId },
      select: { id: true, cotizacionId: true },
    })
    if (!proyecto) {
      return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })
    }

    // Idempotente: si ya existe, devolver el existente
    const existente = await prisma.proyectoTdrAnalisis.findUnique({ where: { proyectoId } })
    if (existente) {
      return NextResponse.json({ ...existente, cotizacionId: proyecto.cotizacionId })
    }

    // Detectar si se pide crear vacío
    let vacio = false
    try {
      const body = await request.json()
      vacio = body?.vacio === true
    } catch { /* sin body → importar */ }

    if (vacio) {
      const creado = await prisma.proyectoTdrAnalisis.create({
        data: {
          proyectoId,
          resumenTdr: '',
          desconectadoDeOrigen: false,
          fechaSnapshot: new Date(),
        },
      })
      return NextResponse.json({ ...creado, cotizacionId: proyecto.cotizacionId }, { status: 201 })
    }

    // Importar desde cotización
    if (!proyecto.cotizacionId) {
      return NextResponse.json(
        { error: 'Este proyecto no tiene cotización vinculada.' },
        { status: 400 },
      )
    }

    const tdrCotizacion = await prisma.cotizacionTdrAnalisis.findFirst({
      where: { cotizacionId: proyecto.cotizacionId },
      orderBy: { createdAt: 'desc' },
    })
    if (!tdrCotizacion) {
      return NextResponse.json(
        { error: 'La cotización origen no tiene análisis de TDR. No hay nada que importar.' },
        { status: 404 },
      )
    }

    const {
      id: cotTdrId,
      cotizacionId: _omit1,
      createdAt: _omit2,
      updatedAt: _omit3,
      ...resto
    } = tdrCotizacion

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const creado = await prisma.proyectoTdrAnalisis.create({
      data: {
        ...(resto as any),
        proyectoId,
        cotizacionTdrOrigenId: cotTdrId,
        desconectadoDeOrigen: false,
        fechaSnapshot: new Date(),
      },
    })

    const completitud = calcularCompletitudGeneral(creado as unknown as TdrAnalisisCore)
    const final = await prisma.proyectoTdrAnalisis.update({
      where: { id: creado.id },
      data: { bloquesCompletitud: completitud.bloques },
    })

    return NextResponse.json({ ...final, cotizacionId: proyecto.cotizacionId }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/proyecto/[id]/tdr-analisis]', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// ─── PATCH: editar campos ────────────────────────────────
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { id: proyectoId } = await params
    const body = await request.json()

    const existente = await prisma.proyectoTdrAnalisis.findUnique({
      where: { proyectoId },
    })
    if (!existente) {
      return NextResponse.json({ error: 'No existe análisis para este proyecto' }, { status: 404 })
    }

    const data: Record<string, unknown> = {}
    for (const k of Object.keys(body)) {
      if ((allowedFields as readonly string[]).includes(k)) {
        data[k as AllowedField] = body[k]
      }
    }
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No hay campos válidos para actualizar' }, { status: 400 })
    }

    const updated = await prisma.proyectoTdrAnalisis.update({
      where: { id: existente.id },
      data,
    })

    const completitud = calcularCompletitudGeneral(updated as unknown as TdrAnalisisCore)
    const final = await prisma.proyectoTdrAnalisis.update({
      where: { id: updated.id },
      data: { bloquesCompletitud: completitud.bloques },
    })

    return NextResponse.json(final)
  } catch (error) {
    console.error('[PATCH /api/proyecto/[id]/tdr-analisis]', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// ─── DELETE ──────────────────────────────────────────────
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { id: proyectoId } = await params

    const existente = await prisma.proyectoTdrAnalisis.findUnique({
      where: { proyectoId },
    })
    if (!existente) {
      return NextResponse.json({ error: 'No existe análisis para este proyecto' }, { status: 404 })
    }

    await prisma.proyectoTdrAnalisis.delete({ where: { id: existente.id } })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[DELETE /api/proyecto/[id]/tdr-analisis]', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
