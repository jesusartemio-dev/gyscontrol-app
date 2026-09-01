// Extracción de datos de los documentos que sustentan un cobro (factoring o
// directo), para precargar la Hoja de Liquidación y que Administración solo
// confirme en vez de teclear todo a mano.
//
// Mismo patrón que src/app/api/comprobante-ocr/route.ts: el PDF/imagen va
// directo a Claude Vision como content block, sin OCR previo. Modelo barato
// (Haiku vía getModelForTask('ocr')) porque es extracción estructurada, no
// razonamiento.
import Anthropic from '@anthropic-ai/sdk'
import { getModelForTask } from '@/lib/agente/models'
import { trackUsage } from '@/lib/agente/usageTracker'

export type TipoDocumentoCobro = 'factura' | 'liquidacion_factoring' | 'voucher_transferencia'

/** Datos de la factura — aplican tanto a factoring como a cobro directo. */
export interface ExtraccionFactura {
  numeroDocumento: string | null
  fechaEmision: string | null
  moneda: 'PEN' | 'USD' | null
  importeTotal: number | null
  detraccionPct: number | null
  detraccionMonto: number | null
  retencionPct: number | null
  retencionMonto: number | null
}

/** Datos de la hoja de liquidación de la financiera (solo factoring). */
export interface ExtraccionLiquidacion {
  financiera: string | null
  numeroOperacion: string | null
  fechaDesembolso: string | null
  fechaVencimiento: string | null
  diasFinanciamiento: number | null
  montoDocumento: number | null
  excedenteMonto: number | null
  valorAFinanciar: number | null
  interesMonto: number | null
  comisionEstructuracion: number | null
  gastosAdicionales: number | null
  igvGastos: number | null
  adelantoBanpro: number | null
  saldoAGirar: number | null
}

/** Voucher de transferencia bancaria (solo cobro directo). */
export interface ExtraccionVoucher {
  fechaOperacion: string | null
  numeroOperacion: string | null
  montoTotal: number | null      // lo que salió de la cuenta del cliente
  montoTransferido: number | null // lo que realmente se acreditó (neto de comisión)
  comision: number | null
  moneda: 'PEN' | 'USD' | null
}

export type ResultadoExtraccion =
  | { tipo: 'factura'; datos: ExtraccionFactura; confianza: Confianza; observaciones: string | null }
  | { tipo: 'liquidacion_factoring'; datos: ExtraccionLiquidacion; confianza: Confianza; observaciones: string | null }
  | { tipo: 'voucher_transferencia'; datos: ExtraccionVoucher; confianza: Confianza; observaciones: string | null }

export type Confianza = 'alta' | 'media' | 'baja'

const SYSTEM_BASE = `Eres un sistema de extracción de datos de documentos financieros peruanos para una empresa de servicios industriales (GYS Control Industrial).

Reglas generales:
- Devuelve SOLO JSON válido, sin markdown, sin backticks, sin texto adicional.
- Si no puedes leer un campo con certeza, devuelve null para ese campo — nunca inventes ni estimes un valor.
- Los montos son números sin separador de miles y con punto decimal (ej: 35326.44).
- Los porcentajes son números (ej: 12 para 12%, 1.38 para 1.38%).
- Las fechas van en formato YYYY-MM-DD.
- Si el documento NO es del tipo esperado, devuelve todos los campos en null y explícalo en observaciones.`

const PROMPTS: Record<TipoDocumentoCobro, { system: string; user: string }> = {
  factura: {
    system: `${SYSTEM_BASE}

Estás leyendo una FACTURA ELECTRÓNICA emitida por GYS a un cliente. Te interesan el importe total y los descuentos de ley (detracción y/o retención) que aparecen impresos en la factura.

- "Importe Total" es el total de la factura con IGV incluido.
- La sección "Información de la detracción" trae el porcentaje y el monto de detracción. OJO: el monto de detracción a veces viene en Soles aunque la factura sea en Dólares — si es así, devuélvelo tal como aparece y aclara la moneda en observaciones.
- La sección "Información de la retención" (cuando existe) trae la base imponible, el porcentaje y el monto de la retención.
- No todas las facturas tienen detracción y retención; puede tener una, ambas o ninguna.`,
    user: `Extrae los datos de esta factura y devuelve ÚNICAMENTE este JSON:

{
  "numeroDocumento": "string (ej: E001-1719) o null",
  "fechaEmision": "YYYY-MM-DD o null",
  "moneda": "PEN|USD o null",
  "importeTotal": number o null,
  "detraccionPct": number o null,
  "detraccionMonto": number o null,
  "retencionPct": number o null,
  "retencionMonto": number o null,
  "confianza": "alta|media|baja",
  "observaciones": "string si algo no se pudo leer bien o si la detracción viene en otra moneda, null si todo OK"
}`,
  },
  liquidacion_factoring: {
    system: `${SYSTEM_BASE}

Estás leyendo un DETALLE DE LIQUIDACIÓN DE FACTORING de una financiera (normalmente BANPRO). Es el documento donde la financiera detalla cuánto adelanta por la factura y qué descuenta.

Equivalencias de nombres (la financiera usa sus propias etiquetas):
- "MONTO DOCUM." / "Monto de los documentos" = monto del documento financiado (la factura ya neta de detracción/retención).
- "MTO. NOM.ANT." / "Monto anticipado" = valor a financiar (el % anticipado del monto documento).
- "MTO. NO ANT." / "Monto no financiado" = excedente retenido por la financiera.
- "MTO.DIF.PRECIO" / "Diferencia de precio" = interés del financiamiento.
- "Comisión" = comisión de estructuración.
- "Gasto legal" / "Gastos" = gastos adicionales.
- "I.G.V" = IGV sobre los gastos/comisión.
- "Adelanto" / "Monto adelanto" = lo que la financiera desembolsa de inmediato.
- "Saldo liquido a girar" / "Liquido a girar" = lo que queda por girar después del adelanto.
- "FEC. CURSE" = fecha de desembolso. "FEC. VTO.NOM." = fecha de vencimiento. "DIAS" = días de financiamiento.`,
    user: `Extrae los datos de esta liquidación de factoring y devuelve ÚNICAMENTE este JSON:

{
  "financiera": "string (ej: BANPRO) o null",
  "numeroOperacion": "string o null",
  "fechaDesembolso": "YYYY-MM-DD o null",
  "fechaVencimiento": "YYYY-MM-DD o null",
  "diasFinanciamiento": number o null,
  "montoDocumento": number o null,
  "excedenteMonto": number o null,
  "valorAFinanciar": number o null,
  "interesMonto": number o null,
  "comisionEstructuracion": number o null,
  "gastosAdicionales": number o null,
  "igvGastos": number o null,
  "adelantoBanpro": number o null,
  "saldoAGirar": number o null,
  "confianza": "alta|media|baja",
  "observaciones": "string si algo no se pudo leer bien, null si todo OK"
}`,
  },
  voucher_transferencia: {
    system: `${SYSTEM_BASE}

Estás leyendo un VOUCHER/CONSTANCIA DE TRANSFERENCIA BANCARIA de un cliente hacia GYS.

Lo crítico acá es distinguir dos montos que suelen aparecer juntos:
- "Monto total" = lo que se debitó de la cuenta del cliente.
- "Monto transferido" = lo que realmente se acreditó en la cuenta de GYS.
- "Comisión" / "Comisión CCE" / "Comisión interplaza" = lo que cobró el banco, y explica la diferencia entre los dos montos anteriores.

Si el voucher solo muestra un monto, ponlo en montoTotal y deja montoTransferido y comision en null.`,
    user: `Extrae los datos de este voucher de transferencia y devuelve ÚNICAMENTE este JSON:

{
  "fechaOperacion": "YYYY-MM-DD o null",
  "numeroOperacion": "string (código de operación/solicitud) o null",
  "montoTotal": number o null,
  "montoTransferido": number o null,
  "comision": number o null,
  "moneda": "PEN|USD o null",
  "confianza": "alta|media|baja",
  "observaciones": "string si algo no se pudo leer bien, null si todo OK"
}`,
  },
}

const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20MB — límite de Claude Vision
const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const
const SUPPORTED_MIME_TYPES = [...SUPPORTED_IMAGE_TYPES, 'application/pdf'] as const

export function validarArchivo(file: File): string | null {
  const mimeType = file.type || 'application/octet-stream'
  if (!SUPPORTED_MIME_TYPES.includes(mimeType as (typeof SUPPORTED_MIME_TYPES)[number])) {
    return `Tipo de archivo no soportado: ${mimeType}. Soportados: PDF, JPG, PNG, GIF, WEBP`
  }
  if (file.size > MAX_FILE_SIZE) {
    return `Archivo demasiado grande (${(file.size / 1024 / 1024).toFixed(1)}MB). Máximo: 20MB`
  }
  return null
}

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null)
const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null)
const moneda = (v: unknown): 'PEN' | 'USD' | null => (v === 'PEN' || v === 'USD' ? v : null)
const confianzaDe = (v: unknown): Confianza =>
  v === 'alta' || v === 'media' || v === 'baja' ? v : 'baja'

function parseJson(text: string): Record<string, unknown> {
  let limpio = text.trim()
  if (limpio.startsWith('```')) {
    limpio = limpio.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '')
  }
  return JSON.parse(limpio) as Record<string, unknown>
}

/**
 * Manda el documento a Claude y devuelve los datos estructurados según su
 * tipo. Nunca lanza por un JSON mal formado: devuelve confianza 'baja' con
 * todos los campos en null y la explicación en observaciones, para que la UI
 * lo muestre como "no se pudo leer" en vez de romperse.
 */
export async function extraerDocumentoCobro(
  file: File,
  tipo: TipoDocumentoCobro,
  userId: string
): Promise<ResultadoExtraccion> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY no configurada')
  const client = new Anthropic({ apiKey, timeout: 90_000 })
  const model = getModelForTask('ocr')

  const mimeType = file.type || 'application/pdf'
  const base64Data = Buffer.from(await file.arrayBuffer()).toString('base64')
  const isPdf = mimeType === 'application/pdf'
  const fileBlock: Anthropic.Messages.ContentBlockParam = isPdf
    ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64Data } }
    : {
        type: 'image',
        source: {
          type: 'base64',
          media_type: mimeType as (typeof SUPPORTED_IMAGE_TYPES)[number],
          data: base64Data,
        },
      }

  const { system, user } = PROMPTS[tipo]
  const inicio = Date.now()
  const message = await client.messages.create({
    model,
    max_tokens: 1024,
    // Cache del system: subir varios documentos seguidos comparte el cache.
    system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: [fileBlock, { type: 'text', text: user }] }],
  })

  trackUsage({
    userId,
    tipo: 'ocr',
    modelo: model,
    tokensInput: message.usage?.input_tokens ?? 0,
    tokensOutput: message.usage?.output_tokens ?? 0,
    tokensCacheCreation: message.usage?.cache_creation_input_tokens ?? 0,
    tokensCacheRead: message.usage?.cache_read_input_tokens ?? 0,
    duracionMs: Date.now() - inicio,
    metadata: { fileName: file.name, mimeType, tipoDocumento: tipo },
  })

  const texto = message.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map(b => b.text)
    .join('')

  let raw: Record<string, unknown>
  try {
    raw = parseJson(texto)
  } catch {
    const vacio = { confianza: 'baja' as const, observaciones: `Respuesta no interpretable: ${texto.slice(0, 200)}` }
    if (tipo === 'factura') {
      return { tipo, ...vacio, datos: { numeroDocumento: null, fechaEmision: null, moneda: null, importeTotal: null, detraccionPct: null, detraccionMonto: null, retencionPct: null, retencionMonto: null } }
    }
    if (tipo === 'liquidacion_factoring') {
      return { tipo, ...vacio, datos: { financiera: null, numeroOperacion: null, fechaDesembolso: null, fechaVencimiento: null, diasFinanciamiento: null, montoDocumento: null, excedenteMonto: null, valorAFinanciar: null, interesMonto: null, comisionEstructuracion: null, gastosAdicionales: null, igvGastos: null, adelantoBanpro: null, saldoAGirar: null } }
    }
    return { tipo, ...vacio, datos: { fechaOperacion: null, numeroOperacion: null, montoTotal: null, montoTransferido: null, comision: null, moneda: null } }
  }

  const confianza = confianzaDe(raw.confianza)
  const observaciones = str(raw.observaciones)

  if (tipo === 'factura') {
    return {
      tipo,
      confianza,
      observaciones,
      datos: {
        numeroDocumento: str(raw.numeroDocumento),
        fechaEmision: str(raw.fechaEmision),
        moneda: moneda(raw.moneda),
        importeTotal: num(raw.importeTotal),
        detraccionPct: num(raw.detraccionPct),
        detraccionMonto: num(raw.detraccionMonto),
        retencionPct: num(raw.retencionPct),
        retencionMonto: num(raw.retencionMonto),
      },
    }
  }

  if (tipo === 'liquidacion_factoring') {
    return {
      tipo,
      confianza,
      observaciones,
      datos: {
        financiera: str(raw.financiera),
        numeroOperacion: str(raw.numeroOperacion),
        fechaDesembolso: str(raw.fechaDesembolso),
        fechaVencimiento: str(raw.fechaVencimiento),
        diasFinanciamiento: num(raw.diasFinanciamiento),
        montoDocumento: num(raw.montoDocumento),
        excedenteMonto: num(raw.excedenteMonto),
        valorAFinanciar: num(raw.valorAFinanciar),
        interesMonto: num(raw.interesMonto),
        comisionEstructuracion: num(raw.comisionEstructuracion),
        gastosAdicionales: num(raw.gastosAdicionales),
        igvGastos: num(raw.igvGastos),
        adelantoBanpro: num(raw.adelantoBanpro),
        saldoAGirar: num(raw.saldoAGirar),
      },
    }
  }

  return {
    tipo,
    confianza,
    observaciones,
    datos: {
      fechaOperacion: str(raw.fechaOperacion),
      numeroOperacion: str(raw.numeroOperacion),
      montoTotal: num(raw.montoTotal),
      montoTransferido: num(raw.montoTransferido),
      comision: num(raw.comision),
      moneda: moneda(raw.moneda),
    },
  }
}
