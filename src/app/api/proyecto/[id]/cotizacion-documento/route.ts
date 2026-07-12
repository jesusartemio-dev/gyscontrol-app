import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { deleteFile } from '@/lib/services/googleDrive'
import { obtenerTotalesRealtimeProyecto } from '@/lib/utils/recalculoProyecto'
import { buildDiffCotizacion } from '@/lib/agente/cotizacionDocumentoExtractor'
import type { CotizacionDocumentoExtracted } from '@/lib/agente/cotizacionDocumentoExtractor'
import type { ProyectoCotizacionDocumento } from '@prisma/client'

async function construirRespuesta(proyectoId: string, documento: ProyectoCotizacionDocumento) {
  const totalesReales = await obtenerTotalesRealtimeProyecto(proyectoId)

  const extraido: CotizacionDocumentoExtracted = {
    numeroPropuesta: documento.numeroPropuesta,
    clienteDetectado: documento.clienteDetectado,
    moneda: documento.moneda ?? 'USD',
    fechaPropuesta: documento.fechaPropuesta?.toISOString().split('T')[0] ?? null,
    totalEquipos: documento.totalEquiposExtraido ?? 0,
    totalServicios: documento.totalServiciosExtraido ?? 0,
    totalGastos: documento.totalGastosExtraido ?? 0,
    descuento: documento.descuentoExtraido ?? 0,
    grandTotal: documento.grandTotalExtraido ?? 0,
    grandTotalIncluyeImpuestos: documento.grandTotalIncluyeImpuestos ?? false,
    resumenAlcance: (documento.resumenAlcance as string[] | null) ?? [],
    exclusiones: (documento.exclusiones as string[] | null) ?? [],
    lineasClasificadas: (documento.lineasClasificadas as CotizacionDocumentoExtracted['lineasClasificadas'] | null) ?? [],
    formaPago: (documento.formaPago as CotizacionDocumentoExtracted['formaPago'] | null) ?? { tipo: null, numeroValorizaciones: null, descripcion: null },
    confianza: (documento.confianzaExtraccion as 'alta' | 'media' | 'baja') ?? 'media',
    advertencias: (documento.advertenciasExtraccion as string[] | null) ?? [],
  }

  const diffLive = buildDiffCotizacion(extraido, {
    moneda: totalesReales.moneda,
    totalEquiposCliente: totalesReales.totalEquiposCliente,
    totalServiciosCliente: totalesReales.totalServiciosCliente,
    totalGastosCliente: totalesReales.totalGastosCliente,
    descuento: totalesReales.descuento,
    grandTotal: totalesReales.grandTotal,
  })

  return { ...documento, diffLive }
}

// GET /api/proyecto/[id]/cotizacion-documento — solo lectura, nunca muta datos
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { id: proyectoId } = await params

  const documento = await prisma.proyectoCotizacionDocumento.findUnique({
    where: { proyectoId },
  })

  if (!documento) {
    return NextResponse.json({ error: 'No existe cotización cargada para este proyecto' }, { status: 404 })
  }

  return NextResponse.json(await construirRespuesta(proyectoId, documento))
}

// PATCH /api/proyecto/[id]/cotizacion-documento — edita resumenAlcance/exclusiones
// (p. ej. para quitar o corregir una línea que comercial marcó como error tras el kickoff)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { id: proyectoId } = await params
  const body = await request.json().catch(() => ({}))

  const data: { resumenAlcance?: string[]; exclusiones?: string[] } = {}

  for (const campo of ['resumenAlcance', 'exclusiones'] as const) {
    if (body[campo] === undefined) continue
    if (!Array.isArray(body[campo]) || !body[campo].every((v: unknown) => typeof v === 'string')) {
      return NextResponse.json({ error: `${campo} debe ser un arreglo de strings` }, { status: 400 })
    }
    data[campo] = body[campo].map((v: string) => v.trim()).filter((v: string) => v.length > 0)
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'No se proporcionaron campos para actualizar' }, { status: 400 })
  }

  const existente = await prisma.proyectoCotizacionDocumento.findUnique({ where: { proyectoId } })
  if (!existente) {
    return NextResponse.json({ error: 'No existe cotización cargada para este proyecto' }, { status: 404 })
  }

  const documento = await prisma.proyectoCotizacionDocumento.update({
    where: { proyectoId },
    data,
  })

  return NextResponse.json(await construirRespuesta(proyectoId, documento))
}

// DELETE /api/proyecto/[id]/cotizacion-documento — borra archivo de Drive (best-effort) + registro
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { id: proyectoId } = await params

  const documento = await prisma.proyectoCotizacionDocumento.findUnique({
    where: { proyectoId },
  })
  if (!documento) {
    return NextResponse.json({ error: 'No existe cotización cargada para este proyecto' }, { status: 404 })
  }

  if (documento.driveFileId) {
    try {
      await deleteFile(documento.driveFileId)
    } catch (err) {
      console.error('[cotizacion-documento][DELETE] No se pudo borrar el archivo de Drive:', err)
    }
  }

  await prisma.proyectoCotizacionDocumento.delete({ where: { proyectoId } })

  return NextResponse.json({ ok: true })
}
