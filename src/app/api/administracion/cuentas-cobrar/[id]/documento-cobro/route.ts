import { tieneRol } from '@/lib/auth/roles'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { uploadFile, createFolder, getAdminDriveId } from '@/lib/services/googleDrive'
import { isIAFeatureEnabled } from '@/lib/agente/featureFlags'
import {
  extraerDocumentoCobro,
  validarArchivo,
  type TipoDocumentoCobro,
} from '@/lib/services/cobroDocumentoExtractor'

const ROLES_ALLOWED = ['admin', 'gerente', 'administracion']

const TIPOS_VALIDOS: TipoDocumentoCobro[] = ['factura', 'liquidacion_factoring', 'voucher_transferencia']

async function getOrCreateCxCFolder(): Promise<string> {
  const parentId = getAdminDriveId()
  const folder = await createFolder({ parentId, folderName: 'CxC_Comprobantes' })
  return folder.id!
}

// POST /api/administracion/cuentas-cobrar/:id/documento-cobro
// Sube el documento (factura, liquidación de la financiera o voucher de
// transferencia) como CxCAdjunto y, en la misma acción, lo manda a Claude
// para extraer los datos que precargan la Hoja de Liquidación.
//
// La extracción NUNCA escribe en la base: solo devuelve los datos para que
// el formulario los precargue como sugerencia editable — Administración
// revisa y confirma con "Guardar Cobro", igual que el resto de campos
// sugeridos (Interés, Fecha Vencimiento).
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (!tieneRol(session, ROLES_ALLOWED)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }
    if (!(await isIAFeatureEnabled('documentosCobroIA'))) {
      return NextResponse.json(
        { error: 'La lectura automática de documentos de cobro está deshabilitada por el administrador.' },
        { status: 403 }
      )
    }

    const { id: cuentaPorCobrarId } = await params
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const tipo = formData.get('tipo') as TipoDocumentoCobro | null

    if (!file) {
      return NextResponse.json({ error: 'Archivo requerido' }, { status: 400 })
    }
    if (!tipo || !TIPOS_VALIDOS.includes(tipo)) {
      return NextResponse.json({ error: `Tipo de documento inválido. Válidos: ${TIPOS_VALIDOS.join(', ')}` }, { status: 400 })
    }
    const errorArchivo = validarArchivo(file)
    if (errorArchivo) {
      return NextResponse.json({ error: errorArchivo }, { status: 400 })
    }

    const cxc = await prisma.cuentaPorCobrar.findUnique({
      where: { id: cuentaPorCobrarId },
      select: { id: true, monto: true, moneda: true },
    })
    if (!cxc) {
      return NextResponse.json({ error: 'Cuenta por cobrar no encontrada' }, { status: 404 })
    }

    // 1) Extraer primero: si Claude falla, no dejamos un adjunto huérfano
    // subido a Drive por una operación que el usuario vio fallar.
    const extraccion = await extraerDocumentoCobro(file, tipo, session.user.id)

    // 2) Guardar el archivo como adjunto de la CxC (mismo patrón que
    // /api/cxc-adjunto: Drive + fila CxCAdjunto con rastro de quién lo subió).
    const folderId = await getOrCreateCxCFolder()
    const buffer = Buffer.from(await file.arrayBuffer())
    const driveFile = await uploadFile({
      folderId,
      fileName: file.name,
      mimeType: file.type || 'application/octet-stream',
      buffer,
    })
    const adjunto = await prisma.cxCAdjunto.create({
      data: {
        cuentaPorCobrarId,
        nombreArchivo: file.name,
        urlArchivo: driveFile.webViewLink || '',
        driveFileId: driveFile.id || null,
        tipoArchivo: tipo,
        tamano: file.size || null,
        subidoPorId: session.user.id,
      },
    })

    // 3) Cruce con lo que ya sabemos: si el importe total de la factura no
    // calza con el monto de la CxC, se avisa — nunca se pisa el monto.
    let alerta: string | null = null
    if (extraccion.tipo === 'factura' && extraccion.datos.importeTotal != null) {
      const diferencia = Math.abs(extraccion.datos.importeTotal - cxc.monto)
      if (diferencia > 0.01) {
        alerta = `El importe total de la factura (${extraccion.datos.importeTotal}) no coincide con el monto registrado en la CxC (${cxc.monto}). Revisa cuál es el correcto — el monto de la CxC no se modifica automáticamente.`
      }
    }

    return NextResponse.json({ adjunto, extraccion, alerta })
  } catch (error) {
    console.error('[POST /cuentas-cobrar/:id/documento-cobro]', error)
    const message = error instanceof Error ? error.message : 'Error del servidor'
    return NextResponse.json({ error: `Error procesando el documento: ${message}` }, { status: 500 })
  }
}
