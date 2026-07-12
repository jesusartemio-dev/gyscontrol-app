import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { buildDiffCotizacion } from '@/lib/agente/cotizacionDocumentoExtractor'
import type { CotizacionDocumentoExtracted } from '@/lib/agente/cotizacionDocumentoExtractor'
import { recalcularTotalesProyecto } from '@/lib/utils/recalculoProyecto'

// POST /api/proyecto/[id]/cotizacion-documento/reverificar
// Recalcula el diff contra los costos reales ACTUALES usando los datos YA extraídos del PDF
// (sin volver a llamar a la IA) — útil tras corregir ítems de Equipos/Servicios/Gastos.
export async function POST(
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

  const totalesReales = await recalcularTotalesProyecto(proyectoId)

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

  const diff = buildDiffCotizacion(extraido, {
    moneda: totalesReales.moneda,
    totalEquiposCliente: totalesReales.totalEquiposCliente,
    totalServiciosCliente: totalesReales.totalServiciosCliente,
    totalGastosCliente: totalesReales.totalGastosCliente,
    descuento: totalesReales.descuento,
    grandTotal: totalesReales.grandTotal,
  })

  const actualizado = await prisma.proyectoCotizacionDocumento.update({
    where: { proyectoId },
    data: {
      diffSnapshot: diff,
      estadoVerificacion: diff.estadoGeneral,
      fechaVerificacion: new Date(),
    },
  })

  return NextResponse.json({ ...actualizado, diffLive: diff })
}
