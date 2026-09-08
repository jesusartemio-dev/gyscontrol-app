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

export type TipoDocumentoCobro = 'factura' | 'liquidacion_factoring' | 'voucher_transferencia' | 'informe_excedentes' | 'factura_financiera'
/** 'auto' = que el modelo identifique cuál de los 3 documentos es (se usa al
 *  pegar una captura o arrastrar un archivo, donde el usuario no eligió tipo). */
export type TipoDocumentoCobroInput = TipoDocumentoCobro | 'auto'

/**
 * Datos de la factura — aplican tanto a factoring como a cobro directo.
 *
 * Sobre la detracción: en una factura en dólares el monto de detracción viene
 * impreso en SOLES, porque así se deposita en el Banco de la Nación. Pero lo
 * que se le descuenta al cobro está en la moneda de la factura. Por eso se
 * devuelven los dos por separado:
 *   - detraccionMonto  → SIEMPRE en la moneda de la factura (lo que descuenta)
 *   - detraccionMontoPEN → el importe en soles del depósito, si la factura lo
 *     trae en soles y la factura no es en soles. null si no aplica.
 * Se separan porque confundirlos hace que el Valor Neto salga ~3.4x mal.
 */
export interface ExtraccionFactura {
  numeroDocumento: string | null
  fechaEmision: string | null
  moneda: 'PEN' | 'USD' | null
  importeTotal: number | null
  detraccionPct: number | null
  detraccionMonto: number | null
  detraccionMontoPEN: number | null
  retencionPct: number | null
  retencionMonto: number | null
}

/**
 * Una fila del Detalle de Liquidación: los datos de UNA factura dentro de la
 * operación. La financiera calcula interés, excedente y valor a financiar por
 * documento, porque cada factura tiene su propio plazo y vencimiento.
 */
export interface ExtraccionLiquidacionDocumento {
  numeroDocumento: string | null   // "NRO. DOC." — los últimos dígitos de la factura (ej. 1719)
  deudor: string | null
  fechaVencimiento: string | null  // "FEC. VTO.NOM."
  diasFinanciamiento: number | null
  montoDocumento: number | null    // "MONTO DOCUM." — la factura ya neta de detracción
  detraccion: number | null
  porcentajeAnticipo: number | null // "% ANT." (ej. 99)
  valorAFinanciar: number | null   // "MTO. NOM.ANT."
  excedenteMonto: number | null    // "MTO. NO ANT."
  interesMonto: number | null      // "MTO.DIF.PRECIO"
  montoAnticipo: number | null     // "MTO.ANT. S/DESCTO" = valorAFinanciar − interés
}

/**
 * Datos de la hoja de liquidación de la financiera (solo factoring).
 *
 * OJO: una operación puede cubrir VARIAS facturas —la 52104 real junta tres, y
 * de clientes distintos—. Por eso los importes se parten en dos niveles:
 *   - `documentos[]`: lo que la financiera calcula por factura.
 *   - comisión, gastos, IGV, adelanto y saldo a girar: los cobra por la
 *     OPERACIÓN completa, en un solo depósito. No vienen por factura.
 * Los campos sueltos de nivel documento se conservan para el caso de una sola
 * factura, que es la mayoría: ahí `documentos` trae un único elemento.
 */
export interface ExtraccionLiquidacion {
  financiera: string | null
  numeroOperacion: string | null
  fechaDesembolso: string | null   // "FEC. CURSE" — igual para toda la operación
  cantidadDocumentos: number | null
  documentos: ExtraccionLiquidacionDocumento[]
  // Nivel documento — el primero, por compatibilidad con la operación de 1 factura
  fechaVencimiento: string | null
  diasFinanciamiento: number | null
  montoDocumento: number | null
  excedenteMonto: number | null
  valorAFinanciar: number | null
  interesMonto: number | null
  // Nivel operación — se reparten a mano entre las facturas
  comisionEstructuracion: number | null
  gastosAdicionales: number | null
  igvGastos: number | null
  aplicaciones: number | null
  adelantoBanpro: number | null
  saldoAGirar: number | null
}

/**
 * Una fila del Informe de Excedentes: el cierre de UNA factura. La financiera
 * lo manda al día siguiente de que el cliente paga, y liquida el excedente
 * descontando la mora y el resto.
 *
 *   TOTAL = MONTO EXC. + MORA + COM.INTER. + DIFERENCIA + OTROS
 *
 * Los descuentos vienen CON SIGNO (la mora negativa; la diferencia de
 * cualquier signo), así que la fórmula es una suma.
 */
export interface ExcedenteFila {
  deudor: string | null
  numeroOperacion: string | null
  numeroDocumento: string | null
  moneda: 'PEN' | 'USD' | null
  fechaVencimiento: string | null
  fechaRecaudacion: string | null   // cuándo pagó el cliente de verdad
  montoNeto: number | null
  montoAnticipado: number | null
  montoExcedente: number | null
  mora: number | null
  comisionInteres: number | null
  diferencia: number | null
  otros: number | null
  total: number | null              // lo que la financiera devuelve a GYS
}

/** Informe de Excedentes: liquida varias operaciones/facturas a la vez. */
export interface ExtraccionInformeExcedentes {
  financiera: string | null
  fechaInforme: string | null
  filas: ExcedenteFila[]
  totalGeneral: number | null
}

/**
 * Factura que la FINANCIERA le emite a GYS por un cargo de la operación.
 * BANPRO factura por separado el interés, los gastos, la reliquidación y la
 * mora, y cada una referencia la operación y —cuando aplica— la factura
 * concreta ("INTERES RELIQUIDACIÓN OP.48507 NRO.DOC.1719").
 *
 * El interés y la reliquidación van inafectos de IGV; la comisión y los gastos
 * sí lo llevan.
 */
export interface ExtraccionFacturaFinanciera {
  financiera: string | null
  numeroFactura: string | null      // ej. FR01-00006534
  fechaEmision: string | null
  numeroOperacion: string | null
  numeroDocumento: string | null    // la factura de GYS a la que se refiere, si la nombra
  concepto: 'reliquidacion' | 'mora' | 'interes' | 'gastos' | 'otro' | null
  descripcion: string | null
  monto: number | null
  moneda: 'PEN' | 'USD' | null
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
  | { tipo: 'informe_excedentes'; datos: ExtraccionInformeExcedentes; confianza: Confianza; observaciones: string | null }
  | { tipo: 'factura_financiera'; datos: ExtraccionFacturaFinanciera; confianza: Confianza; observaciones: string | null }
  | { tipo: 'desconocido'; datos: null; confianza: Confianza; observaciones: string | null }

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
- La sección "Información de la detracción" trae el porcentaje y el monto de detracción.

MUY IMPORTANTE — la moneda de la detracción:
En una factura en DÓLARES, el monto de detracción se imprime en SOLES (con "S/"), porque el depósito al Banco de la Nación siempre se hace en soles. Pero lo que se le descuenta al cobro está en dólares. Por eso tienes que devolver DOS campos distintos:
- "detraccionMonto": SIEMPRE en la moneda de la factura. Si la factura es en dólares y la detracción está impresa en soles, NO copies el número en soles: calcula el porcentaje sobre el importe total (ej. 12% de $35,326.44 = 4239.17). Si la factura trae "Monto neto pendiente de pago", verifica que importeTotal − detraccionMonto dé ese neto.
- "detraccionMontoPEN": el importe en soles tal como está impreso, SOLO si la factura es en dólares y la detracción viene en soles. Si la factura ya es en soles, devuelve null (el importe en soles es "detraccionMonto").

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
  "detraccionMontoPEN": number o null,
  "retencionPct": number o null,
  "retencionMonto": number o null,
  "confianza": "alta|media|baja",
  "observaciones": "string si algo no se pudo leer bien o si la detracción viene en otra moneda, null si todo OK"
}`,
  },
  liquidacion_factoring: {
    system: `${SYSTEM_BASE}

Estás leyendo un DETALLE DE LIQUIDACIÓN DE FACTORING de una financiera (normalmente BANPRO). Es el documento donde la financiera detalla cuánto adelanta por la factura y qué descuenta.

MUY IMPORTANTE — la tabla puede tener VARIAS FILAS:
Una operación de factoring puede cubrir 2 o más facturas, incluso de deudores distintos. La tabla central trae UNA FILA POR FACTURA, cada una con su propio plazo, vencimiento e interés. Devuelve TODAS las filas en "documentos", una entrada por cada línea de la tabla. NO incluyas la fila "TOTAL" como si fuera un documento.

Distingue dos niveles:
- POR FACTURA (las columnas de la tabla): NRO. DOC., DEUDOR, FEC. VTO.NOM., DIAS, MONTO DOCUM., DETRAC., % ANT., MTO. NOM.ANT., MTO. NO ANT., MTO.DIF.PRECIO, MTO.ANT. S/DESCTO.
- POR OPERACIÓN (el bloque de abajo a la derecha, fuera de la tabla): Adelanto, Comisión, Gasto legal, I.G.V, Aplicación(es), Saldo liquido a girar. Estos son de la operación completa y NO se reparten por factura — ponlos en la raíz del JSON, no dentro de "documentos".

Equivalencias de nombres (la financiera usa sus propias etiquetas):
- "MONTO DOCUM." / "Monto de los documentos" = monto del documento financiado (la factura ya neta de detracción/retención).
- "MTO. NOM.ANT." / "Monto anticipado" = valor a financiar (el % anticipado del monto documento).
- "MTO. NO ANT." / "Monto no financiado" = excedente retenido por la financiera.
- "MTO.DIF.PRECIO" / "Diferencia de precio" = interés del financiamiento.
- "MTO.ANT. S/DESCTO" = monto anticipo = valor a financiar − interés.
- "% ANT." = porcentaje anticipado (con BANPRO suele ser 99).
- "Comisión" = comisión de estructuración.
- "Gasto legal" / "Gastos" = gastos adicionales.
- "I.G.V" = IGV sobre los gastos/comisión.
- "Aplicación(es)" / "Monto aplicado" = descuentos aplicados a la operación (normalmente 0).
- "Adelanto" / "Monto adelanto" = lo que la financiera desembolsa de inmediato, en UN SOLO depósito por la operación.
- "Saldo liquido a girar" / "Liquido a girar" = lo que queda por girar después del adelanto.
- "FEC. CURSE" = fecha de desembolso, igual para toda la operación. "FEC. VTO.NOM." = fecha de vencimiento de esa factura. "DIAS" = días de financiamiento de esa factura.`,
    user: `Extrae los datos de esta liquidación de factoring y devuelve ÚNICAMENTE este JSON:

{
  "financiera": "string (ej: BANPRO) o null",
  "numeroOperacion": "string o null",
  "fechaDesembolso": "YYYY-MM-DD o null",
  "cantidadDocumentos": number o null,
  "documentos": [
    {
      "numeroDocumento": "string (ej: 1719) o null",
      "deudor": "string o null",
      "fechaVencimiento": "YYYY-MM-DD o null",
      "diasFinanciamiento": number o null,
      "montoDocumento": number o null,
      "detraccion": number o null,
      "porcentajeAnticipo": number o null,
      "valorAFinanciar": number o null,
      "excedenteMonto": number o null,
      "interesMonto": number o null,
      "montoAnticipo": number o null
    }
  ],
  "comisionEstructuracion": number o null,
  "gastosAdicionales": number o null,
  "igvGastos": number o null,
  "aplicaciones": number o null,
  "adelantoBanpro": number o null,
  "saldoAGirar": number o null,
  "confianza": "alta|media|baja",
  "observaciones": "string si algo no se pudo leer bien, null si todo OK"
}

"documentos" lleva UNA entrada por cada fila de la tabla, sin la fila TOTAL.`,
  },
  informe_excedentes: {
    system: `${SYSTEM_BASE}

Estás leyendo un INFORME DE EXCEDENTES de una financiera (normalmente BANPRO). Es el documento que manda al día siguiente de que el cliente paga una factura, y liquida el excedente que le devuelve a GYS.

Es una TABLA CON VARIAS FILAS: cada fila es UNA factura de UNA operación, y pueden ser de operaciones y deudores distintos. Devuelve TODAS las filas. NO incluyas la fila del total general como si fuera una factura — ese número va en "totalGeneral".

Columnas:
- "NOMBRE DEUDOR" = el cliente que pagó.
- "OPERACIÓN" = N° de operación de factoring. Puede repetirse entre filas cuando la operación cubrió varias facturas.
- "DOCUMENTO" = N° de la factura (suelen ser los últimos dígitos, ej. 1719).
- "FECHA VTO." = vencimiento pactado. "FECHA RECAUDACIÓN" = cuándo pagó el cliente de verdad.
- "MONTO NETO" = la factura neta de detracción. "MONTO ANT." = lo que se anticipó. "MONTO EXC." = el excedente retenido.
- "MORA", "COM. INTER.", "DIFERENCIA", "OTROS" = descuentos sobre el excedente.
- "TOTAL" = lo que la financiera devuelve a GYS por esa factura.

MUY IMPORTANTE — los signos:
Copia los importes TAL COMO APARECEN, con su signo. La mora suele venir negativa (ej. -255.44) y la diferencia puede ser positiva o negativa (+0.12 en una fila, -0.04 en otra). NO les cambies el signo ni los conviertas a positivos: se verifica que MONTO EXC. + MORA + COM.INTER. + DIFERENCIA + OTROS dé el TOTAL de esa fila.`,
    user: `Extrae todas las filas de este Informe de Excedentes y devuelve ÚNICAMENTE este JSON:

{
  "financiera": "string (ej: BANPRO) o null",
  "fechaInforme": "YYYY-MM-DD o null",
  "filas": [
    {
      "deudor": "string o null",
      "numeroOperacion": "string o null",
      "numeroDocumento": "string o null",
      "moneda": "PEN|USD o null",
      "fechaVencimiento": "YYYY-MM-DD o null",
      "fechaRecaudacion": "YYYY-MM-DD o null",
      "montoNeto": number o null,
      "montoAnticipado": number o null,
      "montoExcedente": number o null,
      "mora": number o null,
      "comisionInteres": number o null,
      "diferencia": number o null,
      "otros": number o null,
      "total": number o null
    }
  ],
  "totalGeneral": number o null,
  "confianza": "alta|media|baja",
  "observaciones": "string si algo no se pudo leer bien, null si todo OK"
}

"filas" lleva una entrada por cada factura de la tabla, sin la fila del total general.`,
  },
  factura_financiera: {
    system: `${SYSTEM_BASE}

Estás leyendo una FACTURA QUE LA FINANCIERA (normalmente BANPRO) LE EMITE A GYS por un cargo de una operación de factoring. Ojo: acá GYS es el CLIENTE que recibe la factura, no quien la emite.

Cada cargo de la operación se factura por separado. El detalle del ítem dice de cuál se trata y suele nombrar la operación y la factura concreta, por ejemplo:
  "INTERES RELIQUIDACIÓN OP.48507 NRO.DOC.1719"

Clasifica el cargo en "concepto":
- "reliquidacion" — si dice "reliquidación" o "interés reliquidación". Es el recálculo del interés según la fecha real en que pagó el cliente.
- "mora" — si dice "mora" o "interés moratorio".
- "interes" — interés del financiamiento, sin mencionar reliquidación. También "diferencia de precio".
- "gastos" — comisión, comisión de estructuración, gasto legal, portes.
- "otro" — cualquier otra cosa.

De "OBSERVACIONES" o del detalle del ítem saca el N° de operación (ej. 48507) y el N° del documento de GYS al que se refiere (ej. 1719). Si el documento no aparece, devuelve null — no lo inventes: sin él el cargo no se puede atribuir a una factura concreta.

El monto es el TOTAL de la factura. El interés y la reliquidación van inafectos de IGV, así que el total suele coincidir con "OP. INAFECTA".`,
    user: `Extrae los datos de esta factura de la financiera y devuelve ÚNICAMENTE este JSON:

{
  "financiera": "string (ej: BANPRO) o null",
  "numeroFactura": "string (ej: FR01-00006534) o null",
  "fechaEmision": "YYYY-MM-DD o null",
  "numeroOperacion": "string o null",
  "numeroDocumento": "string o null",
  "concepto": "reliquidacion|mora|interes|gastos|otro o null",
  "descripcion": "el detalle del ítem, tal cual, o null",
  "monto": number o null,
  "moneda": "PEN|USD o null",
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

// Prompt de detección automática — se usa al pegar una captura o arrastrar un
// archivo, donde el usuario no eligió el tipo. Los 3 documentos son
// visualmente inconfundibles, así que el modelo primero identifica cuál es y
// después llena SOLO el bloque que corresponde.
const PROMPT_AUTO = {
  system: `${SYSTEM_BASE}

Recibes UNO de estos 3 documentos y primero debes identificar cuál es:

1. "factura" — FACTURA ELECTRÓNICA emitida por GYS a un cliente. Tiene "FACTURA ELECTRONICA", RUC de GYS (20545610672), número tipo E001-####, "Importe Total", y secciones "Información de la detracción" y/o "Información de la retención".

2. "liquidacion_factoring" — DETALLE DE LIQUIDACIÓN DE FACTORING de una financiera (normalmente BANPRO). Tiene "Nro. Operación", una tabla con columnas tipo MONTO DOCUM. / % ANT. / MTO. NOM.ANT. / MTO. NO ANT. / MTO.DIF.PRECIO, y al pie Adelanto, Comisión, Gasto legal, I.G.V, Saldo liquido a girar.

3. "voucher_transferencia" — VOUCHER/CONSTANCIA DE TRANSFERENCIA BANCARIA. Tiene datos de cuenta de origen y destino, "Monto total", "Monto transferido", "Comisión", código de operación.

Equivalencias para la liquidación (la financiera usa sus propias etiquetas):
- "MTO. NOM.ANT." = valor a financiar; "MTO. NO ANT." = excedente retenido;
  "MTO.DIF.PRECIO" = interés; "Gasto legal" = gastos; "FEC. CURSE" = fecha de desembolso.

Para el voucher, distingue "Monto total" (lo debitado al cliente) de "Monto transferido" (lo realmente acreditado, neto de comisión).

Si no es ninguno de los 3, devuelve tipoDetectado "desconocido" y explica en observaciones qué es.`,
  user: `Identifica qué documento es y extrae sus datos. Devuelve ÚNICAMENTE este JSON, llenando SOLO el bloque del tipo detectado y dejando los otros dos en null:

{
  "tipoDetectado": "factura|liquidacion_factoring|voucher_transferencia|desconocido",
  "factura": {
    "numeroDocumento": "string o null", "fechaEmision": "YYYY-MM-DD o null", "moneda": "PEN|USD o null",
    "importeTotal": number o null, "detraccionPct": number o null, "detraccionMonto": number o null, "detraccionMontoPEN": number o null,
    "retencionPct": number o null, "retencionMonto": number o null
  } o null,
  "liquidacion": {
    "financiera": "string o null", "numeroOperacion": "string o null",
    "fechaDesembolso": "YYYY-MM-DD o null", "cantidadDocumentos": number o null,
    "documentos": [ { "numeroDocumento": "string o null", "deudor": "string o null",
      "fechaVencimiento": "YYYY-MM-DD o null", "diasFinanciamiento": number o null,
      "montoDocumento": number o null, "detraccion": number o null,
      "porcentajeAnticipo": number o null, "valorAFinanciar": number o null,
      "excedenteMonto": number o null, "interesMonto": number o null,
      "montoAnticipo": number o null } ],
    "comisionEstructuracion": number o null, "gastosAdicionales": number o null, "igvGastos": number o null,
    "aplicaciones": number o null, "adelantoBanpro": number o null, "saldoAGirar": number o null
  } o null,
  "voucher": {
    "fechaOperacion": "YYYY-MM-DD o null", "numeroOperacion": "string o null",
    "montoTotal": number o null, "montoTransferido": number o null, "comision": number o null,
    "moneda": "PEN|USD o null"
  } o null,
  "confianza": "alta|media|baja",
  "observaciones": "string si algo no se pudo leer bien o no se reconoce el documento, null si todo OK"
}`,
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
  tipo: TipoDocumentoCobroInput,
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

  const { system, user } = tipo === 'auto' ? PROMPT_AUTO : PROMPTS[tipo]
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
      return { tipo, ...vacio, datos: { numeroDocumento: null, fechaEmision: null, moneda: null, importeTotal: null, detraccionPct: null, detraccionMonto: null, detraccionMontoPEN: null, retencionPct: null, retencionMonto: null } }
    }
    if (tipo === 'liquidacion_factoring') {
      return { tipo, ...vacio, datos: { financiera: null, numeroOperacion: null, fechaDesembolso: null, cantidadDocumentos: null, documentos: [], fechaVencimiento: null, diasFinanciamiento: null, montoDocumento: null, excedenteMonto: null, valorAFinanciar: null, interesMonto: null, comisionEstructuracion: null, gastosAdicionales: null, igvGastos: null, aplicaciones: null, adelantoBanpro: null, saldoAGirar: null } }
    }
    if (tipo === 'voucher_transferencia') {
      return { tipo, ...vacio, datos: { fechaOperacion: null, numeroOperacion: null, montoTotal: null, montoTransferido: null, comision: null, moneda: null } }
    }
    if (tipo === 'informe_excedentes') {
      return { tipo, ...vacio, datos: { financiera: null, fechaInforme: null, filas: [], totalGeneral: null } }
    }
    if (tipo === 'factura_financiera') {
      return { tipo, ...vacio, datos: { financiera: null, numeroFactura: null, fechaEmision: null, numeroOperacion: null, numeroDocumento: null, concepto: null, descripcion: null, monto: null, moneda: null } }
    }
    return { tipo: 'desconocido', datos: null, ...vacio }
  }

  const confianza = confianzaDe(raw.confianza)
  const observaciones = str(raw.observaciones)

  // Con 'auto' el modelo devuelve { tipoDetectado, factura|liquidacion|voucher }
  // — se normaliza al mismo formato plano que devuelven los prompts específicos,
  // para que de acá abajo el código sea uno solo.
  let tipoFinal: TipoDocumentoCobro
  let campos: Record<string, unknown>
  if (tipo === 'auto') {
    const detectado = raw.tipoDetectado
    if (detectado === 'factura') {
      tipoFinal = 'factura'
      campos = (raw.factura as Record<string, unknown>) ?? {}
    } else if (detectado === 'liquidacion_factoring') {
      tipoFinal = 'liquidacion_factoring'
      campos = (raw.liquidacion as Record<string, unknown>) ?? {}
    } else if (detectado === 'voucher_transferencia') {
      tipoFinal = 'voucher_transferencia'
      campos = (raw.voucher as Record<string, unknown>) ?? {}
    } else {
      return {
        tipo: 'desconocido',
        datos: null,
        confianza,
        observaciones: observaciones ?? 'No se reconoció el documento: no parece una factura, una liquidación de factoring ni un voucher de transferencia.',
      }
    }
  } else {
    tipoFinal = tipo
    campos = raw
  }

  if (tipoFinal === 'factura') {
    return {
      tipo: tipoFinal,
      confianza,
      observaciones,
      datos: {
        numeroDocumento: str(campos.numeroDocumento),
        fechaEmision: str(campos.fechaEmision),
        moneda: moneda(campos.moneda),
        importeTotal: num(campos.importeTotal),
        detraccionPct: num(campos.detraccionPct),
        detraccionMonto: num(campos.detraccionMonto),
        detraccionMontoPEN: num(campos.detraccionMontoPEN),
        retencionPct: num(campos.retencionPct),
        retencionMonto: num(campos.retencionMonto),
      },
    }
  }

  if (tipoFinal === 'factura_financiera') {
    const permitidos = ['reliquidacion', 'mora', 'interes', 'gastos', 'otro'] as const
    const crudo = str(campos.concepto)
    const concepto = permitidos.includes(crudo as never) ? (crudo as typeof permitidos[number]) : null
    return {
      tipo: tipoFinal,
      confianza,
      observaciones,
      datos: {
        financiera: str(campos.financiera),
        numeroFactura: str(campos.numeroFactura),
        fechaEmision: str(campos.fechaEmision),
        numeroOperacion: str(campos.numeroOperacion),
        numeroDocumento: str(campos.numeroDocumento),
        concepto,
        descripcion: str(campos.descripcion),
        monto: num(campos.monto),
        moneda: moneda(campos.moneda),
      },
    }
  }

  if (tipoFinal === 'informe_excedentes') {
    const crudas = Array.isArray(campos.filas) ? (campos.filas as unknown[]) : []
    const filas: ExcedenteFila[] = crudas
      .filter((f): f is Record<string, unknown> => !!f && typeof f === 'object')
      .map(f => ({
        deudor: str(f.deudor),
        numeroOperacion: str(f.numeroOperacion),
        numeroDocumento: str(f.numeroDocumento),
        moneda: moneda(f.moneda),
        fechaVencimiento: str(f.fechaVencimiento),
        fechaRecaudacion: str(f.fechaRecaudacion),
        montoNeto: num(f.montoNeto),
        montoAnticipado: num(f.montoAnticipado),
        montoExcedente: num(f.montoExcedente),
        mora: num(f.mora),
        comisionInteres: num(f.comisionInteres),
        diferencia: num(f.diferencia),
        otros: num(f.otros),
        total: num(f.total),
      }))
      // Sin operación ni documento la fila no se puede cruzar con nada; suele
      // ser la del total general, que el prompt pide excluir.
      .filter(f => f.numeroOperacion != null || f.numeroDocumento != null)

    return {
      tipo: tipoFinal,
      confianza,
      observaciones,
      datos: {
        financiera: str(campos.financiera),
        fechaInforme: str(campos.fechaInforme),
        filas,
        totalGeneral: num(campos.totalGeneral),
      },
    }
  }

  if (tipoFinal === 'liquidacion_factoring') {
    // Una fila por factura. Se descartan las que vengan sin nada útil (p.ej. si
    // el modelo coló la fila TOTAL a pesar de que el prompt se lo prohíbe).
    const filas = Array.isArray(campos.documentos) ? (campos.documentos as unknown[]) : []
    const docs: ExtraccionLiquidacionDocumento[] = filas
      .filter((f): f is Record<string, unknown> => !!f && typeof f === 'object')
      .map(f => ({
        numeroDocumento: str(f.numeroDocumento),
        deudor: str(f.deudor),
        fechaVencimiento: str(f.fechaVencimiento),
        diasFinanciamiento: num(f.diasFinanciamiento),
        montoDocumento: num(f.montoDocumento),
        detraccion: num(f.detraccion),
        porcentajeAnticipo: num(f.porcentajeAnticipo),
        valorAFinanciar: num(f.valorAFinanciar),
        excedenteMonto: num(f.excedenteMonto),
        interesMonto: num(f.interesMonto),
        montoAnticipo: num(f.montoAnticipo),
      }))
      .filter(d => d.numeroDocumento != null || d.montoDocumento != null)

    // Solo cuando hay exactamente una factura tiene sentido exponer sus
    // importes sueltos: con varias, cualquier elección sería arbitraria.
    const unico = docs.length === 1 ? docs[0] : null

    return {
      tipo: tipoFinal,
      confianza,
      observaciones,
      datos: {
        financiera: str(campos.financiera),
        numeroOperacion: str(campos.numeroOperacion),
        fechaDesembolso: str(campos.fechaDesembolso),
        cantidadDocumentos: num(campos.cantidadDocumentos),
        documentos: docs,
        // Nivel documento: si la operación cubre una sola factura se exponen
        // sueltos, que es como los consume el formulario de cobro. Con varias
        // no se puede elegir uno, así que quedan en null y hay que ir a
        // `documentos` — el flujo multi-factura.
        fechaVencimiento: unico?.fechaVencimiento ?? str(campos.fechaVencimiento),
        diasFinanciamiento: unico?.diasFinanciamiento ?? num(campos.diasFinanciamiento),
        montoDocumento: unico?.montoDocumento ?? num(campos.montoDocumento),
        excedenteMonto: unico?.excedenteMonto ?? num(campos.excedenteMonto),
        valorAFinanciar: unico?.valorAFinanciar ?? num(campos.valorAFinanciar),
        interesMonto: unico?.interesMonto ?? num(campos.interesMonto),
        // Nivel operación
        comisionEstructuracion: num(campos.comisionEstructuracion),
        gastosAdicionales: num(campos.gastosAdicionales),
        igvGastos: num(campos.igvGastos),
        aplicaciones: num(campos.aplicaciones),
        adelantoBanpro: num(campos.adelantoBanpro),
        saldoAGirar: num(campos.saldoAGirar),
      },
    }
  }

  return {
    tipo: tipoFinal,
    confianza,
    observaciones,
    datos: {
      fechaOperacion: str(campos.fechaOperacion),
      numeroOperacion: str(campos.numeroOperacion),
      montoTotal: num(campos.montoTotal),
      montoTransferido: num(campos.montoTransferido),
      comision: num(campos.comision),
      moneda: moneda(campos.moneda),
    },
  }
}
