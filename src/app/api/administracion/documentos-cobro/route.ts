import { tieneRol } from '@/lib/auth/roles'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isIAFeatureEnabled } from '@/lib/agente/featureFlags'
import {
  extraerDocumentoCobro,
  validarArchivo,
  type TipoDocumentoCobroInput,
} from '@/lib/services/cobroDocumentoExtractor'

const ROLES_ALLOWED = ['admin', 'gerente', 'administracion']

// 'auto' = el modelo identifica cuál de los 3 documentos es (se usa al pegar
// una captura o arrastrar un archivo, sin elegir tipo).
const TIPOS_VALIDOS: TipoDocumentoCobroInput[] = ['factura', 'liquidacion_factoring', 'voucher_transferencia', 'auto']

// POST /api/administracion/documentos-cobro
//
// Lee un documento de cobro (factura, liquidación de la financiera o voucher
// de transferencia) y devuelve los datos que precargan un formulario.
//
// No está colgado de ninguna entidad a propósito: se usa tanto en Facturación
// (donde la CxC todavía no existe) como en el detalle de la CxC. Es un LECTOR
// puro — el archivo se procesa en memoria y se descarta, no se sube a Drive ni
// se guarda como adjunto, y no escribe nada en la base. Quien llama decide qué
// hacer con lo leído.
//
// Para archivar el documento está el flujo de adjuntos de cada entidad, que es
// aparte (ej. /api/proyectos/:id/valorizaciones/:valId/adjuntos).
export async function POST(request: NextRequest) {
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

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const tipo = formData.get('tipo') as TipoDocumentoCobroInput | null
    // Opcional: contra qué monto contrastar el total de la factura. En
    // Facturación es el Neto a Recibir de la valorización; en la CxC, su monto.
    const montoReferenciaRaw = formData.get('montoReferencia')
    const montoReferencia = montoReferenciaRaw != null && montoReferenciaRaw !== ''
      ? Number(montoReferenciaRaw)
      : null

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

    const extraccion = await extraerDocumentoCobro(file, tipo, session.user.id)

    // Si no se reconoció el documento, probablemente se pegó/arrastró el
    // archivo equivocado; mejor que lo reintente.
    if (extraccion.tipo === 'desconocido') {
      return NextResponse.json(
        { error: extraccion.observaciones ?? 'No se reconoció el documento' },
        { status: 422 }
      )
    }

    // Cruce con lo que ya sabemos: si el total de la factura no calza con el
    // monto de referencia, se avisa. Nunca se pisa nada automáticamente.
    let alerta: string | null = null
    if (
      extraccion.tipo === 'factura' &&
      extraccion.datos.importeTotal != null &&
      montoReferencia != null &&
      Number.isFinite(montoReferencia)
    ) {
      const diferencia = Math.abs(extraccion.datos.importeTotal - montoReferencia)
      if (diferencia > 0.01) {
        alerta = `El importe total de la factura (${extraccion.datos.importeTotal.toFixed(2)}) no coincide con el monto calculado (${montoReferencia.toFixed(2)}). Diferencia: ${diferencia.toFixed(2)}.`
      }
    }

    return NextResponse.json({ extraccion, alerta })
  } catch (error) {
    console.error('[POST /administracion/documentos-cobro]', error)
    const message = error instanceof Error ? error.message : 'Error del servidor'
    return NextResponse.json({ error: `Error procesando el documento: ${message}` }, { status: 500 })
  }
}
