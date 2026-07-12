import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isIAFeatureEnabled } from '@/lib/agente/featureFlags'
import { extractCotizacionDocumento, buildDiffCotizacion } from '@/lib/agente/cotizacionDocumentoExtractor'
import { recalcularTotalesProyecto } from '@/lib/utils/recalculoProyecto'
import { deleteFile, getAdminDriveId, getOrCreateFolder, uploadFile } from '@/lib/services/googleDrive'

export const maxDuration = 120

const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20MB

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isIAFeatureEnabled('verificarCotizacionProyecto'))) {
    return NextResponse.json(
      { error: 'La verificación de cotización con IA está deshabilitada por el administrador.' },
      { status: 403 },
    )
  }

  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { id: proyectoId } = await params

  const proyecto = await prisma.proyecto.findUnique({
    where: { id: proyectoId },
    select: { id: true, codigo: true },
  })
  if (!proyecto) {
    return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return NextResponse.json({ error: 'Archivo PDF requerido' }, { status: 400 })
  }
  if (file.type !== 'application/pdf') {
    return NextResponse.json({ error: `Solo se aceptan archivos PDF. Tipo recibido: ${file.type}` }, { status: 400 })
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: `Archivo demasiado grande (${(file.size / 1024 / 1024).toFixed(1)}MB). Máximo: 20MB` },
      { status: 400 },
    )
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    const userId = (session.user as { id: string }).id

    const extraido = await extractCotizacionDocumento(buffer, userId, file.name)

    // Reemplazo: si ya había un documento cargado, borrar el archivo anterior de Drive (best-effort)
    const existente = await prisma.proyectoCotizacionDocumento.findUnique({ where: { proyectoId } })
    if (existente?.driveFileId) {
      try {
        await deleteFile(existente.driveFileId)
      } catch (err) {
        console.error('[cotizacion-documento/analizar-pdf] No se pudo borrar el PDF anterior de Drive:', err)
      }
    }

    const adminDriveId = getAdminDriveId()
    const folderId = await getOrCreateFolder(adminDriveId, `Cotizaciones_${proyecto.codigo}`, adminDriveId)
    const driveFile = await uploadFile({
      folderId,
      fileName: file.name,
      mimeType: 'application/pdf',
      buffer,
    })

    const totalesReales = await recalcularTotalesProyecto(proyectoId)

    const diff = buildDiffCotizacion(extraido, {
      moneda: totalesReales.moneda,
      totalEquiposCliente: totalesReales.totalEquiposCliente,
      totalServiciosCliente: totalesReales.totalServiciosCliente,
      totalGastosCliente: totalesReales.totalGastosCliente,
      descuento: totalesReales.descuento,
      grandTotal: totalesReales.grandTotal,
    })

    const documento = await prisma.proyectoCotizacionDocumento.upsert({
      where: { proyectoId },
      create: {
        proyectoId,
        nombreArchivo: file.name,
        driveFileId: driveFile.id ?? null,
        urlArchivo: driveFile.webViewLink ?? '',
        tamanoBytes: file.size,
        numeroPropuesta: extraido.numeroPropuesta,
        clienteDetectado: extraido.clienteDetectado,
        moneda: extraido.moneda,
        fechaPropuesta: extraido.fechaPropuesta ? new Date(extraido.fechaPropuesta) : null,
        confianzaExtraccion: extraido.confianza,
        totalEquiposExtraido: extraido.totalEquipos,
        totalServiciosExtraido: extraido.totalServicios,
        totalGastosExtraido: extraido.totalGastos,
        descuentoExtraido: extraido.descuento,
        grandTotalExtraido: extraido.grandTotal,
        grandTotalIncluyeImpuestos: extraido.grandTotalIncluyeImpuestos,
        resumenAlcance: extraido.resumenAlcance,
        exclusiones: extraido.exclusiones,
        lineasClasificadas: extraido.lineasClasificadas,
        formaPago: extraido.formaPago,
        advertenciasExtraccion: extraido.advertencias,
        diffSnapshot: diff,
        estadoVerificacion: diff.estadoGeneral,
        fechaVerificacion: new Date(),
      },
      update: {
        nombreArchivo: file.name,
        driveFileId: driveFile.id ?? null,
        urlArchivo: driveFile.webViewLink ?? '',
        tamanoBytes: file.size,
        numeroPropuesta: extraido.numeroPropuesta,
        clienteDetectado: extraido.clienteDetectado,
        moneda: extraido.moneda,
        fechaPropuesta: extraido.fechaPropuesta ? new Date(extraido.fechaPropuesta) : null,
        confianzaExtraccion: extraido.confianza,
        totalEquiposExtraido: extraido.totalEquipos,
        totalServiciosExtraido: extraido.totalServicios,
        totalGastosExtraido: extraido.totalGastos,
        descuentoExtraido: extraido.descuento,
        grandTotalExtraido: extraido.grandTotal,
        grandTotalIncluyeImpuestos: extraido.grandTotalIncluyeImpuestos,
        resumenAlcance: extraido.resumenAlcance,
        exclusiones: extraido.exclusiones,
        lineasClasificadas: extraido.lineasClasificadas,
        formaPago: extraido.formaPago,
        advertenciasExtraccion: extraido.advertencias,
        diffSnapshot: diff,
        estadoVerificacion: diff.estadoGeneral,
        fechaVerificacion: new Date(),
      },
    })

    return NextResponse.json({ ...documento, diffLive: diff })
  } catch (error) {
    console.error('[cotizacion-documento/analizar-pdf]', error)
    const msg = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json({ error: `Error procesando la cotización: ${msg}` }, { status: 500 })
  }
}
