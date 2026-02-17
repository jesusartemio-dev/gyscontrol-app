// src/lib/agente/excelExtractor.ts
// Lee Excel de cotización interna GYS con SheetJS y usa Claude para extraer datos estructurados

import * as XLSX from 'xlsx'
import Anthropic from '@anthropic-ai/sdk'

// ── Tipos de datos extraídos ──────────────────────────────

export interface ExcelEquipoItem {
  descripcion: string
  codigo?: string
  categoria?: string
  unidad?: string
  marca?: string
  cantidad: number
  precioLista: number
  precioInterno: number
  precioCliente: number
  factorCosto: number
  factorVenta: number
}

export interface ExcelEquipoGrupo {
  grupo: string
  hoja: string
  items: ExcelEquipoItem[]
}

export interface ExcelRecursoHoras {
  recursoNombre: string
  tipo: 'oficina' | 'campo'
  costoHora: number
  horas: number
}

export interface ExcelServicioActividad {
  nombre: string
  descripcion?: string
  recursos: ExcelRecursoHoras[]
  horasTotal: number
  costoInterno: number
  costoCliente: number
}

export interface ExcelServicioGrupo {
  grupo: string
  hoja: string
  edtSugerido?: string
  factorSeguridad?: number
  margen?: number
  actividades: ExcelServicioActividad[]
}

export interface ExcelGastoItem {
  nombre: string
  descripcion?: string
  cantidad: number
  precioUnitario: number
  costoInterno: number
  costoCliente: number
}

export interface ExcelGastoGrupo {
  grupo: string
  hoja: string
  items: ExcelGastoItem[]
}

export interface ExcelResumen {
  totalInterno: number
  totalCliente: number
  moneda?: string
  margenGlobal?: number
  nombreProyecto?: string
  clienteNombre?: string
}

export interface ExcelExtraido {
  equipos: ExcelEquipoGrupo[]
  servicios: ExcelServicioGrupo[]
  gastos: ExcelGastoGrupo[]
  resumen: ExcelResumen
  recursosUnicos: string[]
  edtsUnicos: string[]
  hojas: string[]
}

// ── Lectura de Excel con SheetJS ──────────────────────────

export interface SheetTextData {
  name: string
  csv: string
  rowCount: number
}

/**
 * Lee un buffer de Excel y convierte cada hoja a texto CSV.
 * Esto produce un formato que Claude puede interpretar fácilmente.
 */
export function readExcelSheets(buffer: Buffer): SheetTextData[] {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: false })
  const sheets: SheetTextData[] = []

  for (const name of workbook.SheetNames) {
    const sheet = workbook.Sheets[name]
    if (!sheet) continue

    // Convertir a CSV — Claude entiende bien tablas en CSV
    const csv = XLSX.utils.sheet_to_csv(sheet, { blankrows: false })
    const rowCount = csv.split('\n').filter((line) => line.trim()).length

    // Omitir hojas vacías
    if (rowCount <= 1) continue

    sheets.push({ name, csv, rowCount })
  }

  return sheets
}

// ── Prompt de extracción para Claude ──────────────────────

const EXTRACTION_SYSTEM_PROMPT = `Eres un experto en análisis de cotizaciones de automatización industrial. Tu tarea es extraer datos estructurados de un archivo Excel de cotización interna de GYS Control Industrial (empresa peruana).

CONTEXTO DEL FORMATO EXCEL DE GYS:
- Las hojas típicas son: RESUMEN, SOFTWARE, SERV. ING., MAT. ELECTRICOS, SERV. CON, SERV. PRO, MAT. TABLEROS, COVID, MOVIL., OPERAT.
- Pero los nombres pueden variar ligeramente entre versiones
- Las hojas de MATERIALES/EQUIPOS (MAT. ELECTRICOS, MAT. TABLEROS, SOFTWARE) tienen columnas de items con: código, descripción, unidad, marca, cantidad, precio lista
- Tienen dos columnas clave de factores: "INTEGRADOR" o "GYS" (factorCosto, típicamente ~1.0) y "CLIENTE" (factorVenta, típicamente ~1.15-1.40)
- Las hojas de SERVICIOS (SERV. ING., SERV. CON, SERV. PRO) tienen matrices de horas por recurso
- Los recursos tienen nombres como: Senior A, Senior B, Semisenior A, Semisenior B, Junior A, Junior B
- Cada recurso puede tener tarifa de OFICINA y tarifa de CAMPO (diferente costo/hora)
- Las hojas de GASTOS (COVID, MOVIL., OPERAT.) tienen items de gastos operativos

REGLAS DE EXTRACCIÓN:
1. Identifica CADA hoja y clasifícala como: equipos, servicios, gastos, o resumen
2. Para EQUIPOS: extrae cada item con sus precios. Si hay columna "GYS CONTROL" o "INTEGRADOR" ese es precioInterno. Si hay columna "CLIENTE" ese es precioCliente. factorCosto = precioInterno / precioLista. factorVenta = precioCliente / precioInterno
3. Para SERVICIOS: extrae la matriz de horas×recurso. Identifica cada recurso único con su costo/hora y si es oficina o campo. Calcula horasTotal por actividad
4. Para GASTOS: extrae items con cantidad, precio unitario, y totales
5. En el RESUMEN: busca totales generales, nombre del proyecto, cliente
6. Los precios pueden estar en USD o PEN (soles). Identifica la moneda

IMPORTANTE:
- Si una columna no tiene datos claros, usa valores razonables o null
- factorCosto por defecto: 1.00 si no es distinguible
- factorVenta por defecto: 1.25 si no es calculable
- Extrae TODOS los items, no resumas ni omitas filas
- Los nombres de recursos deben conservarse tal cual aparecen en el Excel`

function buildExtractionUserPrompt(sheets: SheetTextData[]): string {
  let prompt = `Analiza este Excel de cotización interna de GYS Control Industrial.

Contiene ${sheets.length} hojas:\n`

  for (const sheet of sheets) {
    prompt += `\n--- HOJA: "${sheet.name}" (${sheet.rowCount} filas) ---\n`
    // Limitar contenido por hoja para no exceder el contexto
    const maxChars = 12000
    if (sheet.csv.length > maxChars) {
      prompt += sheet.csv.substring(0, maxChars)
      prompt += `\n... (contenido truncado, ${sheet.csv.length} caracteres total)\n`
    } else {
      prompt += sheet.csv
    }
  }

  prompt += `

Devuelve ÚNICAMENTE un JSON válido con esta estructura exacta (sin markdown, sin backticks, solo JSON):

{
  "equipos": [
    {
      "grupo": "nombre descriptivo del grupo (ej: 'Materiales Eléctricos')",
      "hoja": "nombre exacto de la hoja de origen",
      "items": [
        {
          "descripcion": "descripción del item",
          "codigo": "código si existe o null",
          "categoria": "categoría inferida (ej: 'PLC', 'HMI', 'Instrumentación')",
          "unidad": "unidad de medida (Und, m, Glb, etc.)",
          "marca": "marca del equipo",
          "cantidad": 1,
          "precioLista": 100.00,
          "precioInterno": 100.00,
          "precioCliente": 125.00,
          "factorCosto": 1.00,
          "factorVenta": 1.25
        }
      ]
    }
  ],
  "servicios": [
    {
      "grupo": "nombre descriptivo (ej: 'Servicios de Ingeniería')",
      "hoja": "nombre exacto de la hoja",
      "edtSugerido": "EDT sugerido (ej: 'Ingeniería de Detalle', 'Programación PLC')",
      "factorSeguridad": 1.0,
      "margen": 1.35,
      "actividades": [
        {
          "nombre": "nombre de la actividad",
          "descripcion": "descripción si existe",
          "recursos": [
            {
              "recursoNombre": "nombre tal cual aparece (ej: 'Senior A')",
              "tipo": "oficina",
              "costoHora": 30.00,
              "horas": 40
            }
          ],
          "horasTotal": 40,
          "costoInterno": 1200.00,
          "costoCliente": 1620.00
        }
      ]
    }
  ],
  "gastos": [
    {
      "grupo": "nombre descriptivo (ej: 'Movilización')",
      "hoja": "nombre exacto de la hoja",
      "items": [
        {
          "nombre": "nombre del gasto",
          "descripcion": "descripción si existe",
          "cantidad": 1,
          "precioUnitario": 50.00,
          "costoInterno": 50.00,
          "costoCliente": 67.50
        }
      ]
    }
  ],
  "resumen": {
    "totalInterno": 0,
    "totalCliente": 0,
    "moneda": "USD",
    "margenGlobal": null,
    "nombreProyecto": "nombre si se encuentra",
    "clienteNombre": "nombre del cliente si se encuentra"
  }
}`

  return prompt
}

// ── Llamada a Claude API ──────────────────────────────────

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY no configurada en las variables de entorno del servidor')
  return new Anthropic({ apiKey, timeout: 90_000 }) // 90s timeout
}

function getExtractionModel(): string {
  return process.env.AI_EXTRACTION_MODEL || 'claude-sonnet-4-5-20250929'
}

/**
 * Envía las hojas del Excel a Claude y obtiene datos estructurados.
 */
export async function extractWithClaude(
  sheets: SheetTextData[]
): Promise<ExcelExtraido> {
  const client = getClient()
  const model = getExtractionModel()

  const response = await client.messages.create({
    model,
    max_tokens: 8192,
    system: EXTRACTION_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: buildExtractionUserPrompt(sheets),
      },
    ],
  })

  // Extraer texto de la respuesta
  const responseText = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('')

  // Parsear JSON
  const parsed = parseExtractionResponse(responseText)
  return parsed
}

function parseExtractionResponse(text: string): ExcelExtraido {
  // Limpiar posible markdown wrapping
  let cleaned = text.trim()
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '')
  }

  const raw = JSON.parse(cleaned)

  // Extraer recursos y EDTs únicos
  const recursosSet = new Set<string>()
  const edtsSet = new Set<string>()

  const equipos: ExcelEquipoGrupo[] = (raw.equipos || []).map(
    (g: Record<string, unknown>) => ({
      grupo: g.grupo as string,
      hoja: g.hoja as string,
      items: ((g.items as Record<string, unknown>[]) || []).map(
        (item: Record<string, unknown>) => ({
          descripcion: item.descripcion as string,
          codigo: (item.codigo as string) || undefined,
          categoria: (item.categoria as string) || undefined,
          unidad: (item.unidad as string) || 'Und',
          marca: (item.marca as string) || '',
          cantidad: Number(item.cantidad) || 1,
          precioLista: Number(item.precioLista) || 0,
          precioInterno: Number(item.precioInterno) || 0,
          precioCliente: Number(item.precioCliente) || 0,
          factorCosto: Number(item.factorCosto) || 1.0,
          factorVenta: Number(item.factorVenta) || 1.25,
        })
      ),
    })
  )

  const servicios: ExcelServicioGrupo[] = (raw.servicios || []).map(
    (g: Record<string, unknown>) => {
      if (g.edtSugerido) edtsSet.add(g.edtSugerido as string)

      return {
        grupo: g.grupo as string,
        hoja: g.hoja as string,
        edtSugerido: (g.edtSugerido as string) || undefined,
        factorSeguridad: Number(g.factorSeguridad) || 1.0,
        margen: Number(g.margen) || 1.35,
        actividades: (
          (g.actividades as Record<string, unknown>[]) || []
        ).map((act: Record<string, unknown>) => {
          const recursos = (
            (act.recursos as Record<string, unknown>[]) || []
          ).map((r: Record<string, unknown>) => {
            recursosSet.add(r.recursoNombre as string)
            return {
              recursoNombre: r.recursoNombre as string,
              tipo: (r.tipo as 'oficina' | 'campo') || 'oficina',
              costoHora: Number(r.costoHora) || 0,
              horas: Number(r.horas) || 0,
            }
          })
          return {
            nombre: act.nombre as string,
            descripcion: (act.descripcion as string) || undefined,
            recursos,
            horasTotal: Number(act.horasTotal) || 0,
            costoInterno: Number(act.costoInterno) || 0,
            costoCliente: Number(act.costoCliente) || 0,
          }
        }),
      }
    }
  )

  const gastos: ExcelGastoGrupo[] = (raw.gastos || []).map(
    (g: Record<string, unknown>) => ({
      grupo: g.grupo as string,
      hoja: g.hoja as string,
      items: ((g.items as Record<string, unknown>[]) || []).map(
        (item: Record<string, unknown>) => ({
          nombre: item.nombre as string,
          descripcion: (item.descripcion as string) || undefined,
          cantidad: Number(item.cantidad) || 1,
          precioUnitario: Number(item.precioUnitario) || 0,
          costoInterno: Number(item.costoInterno) || 0,
          costoCliente: Number(item.costoCliente) || 0,
        })
      ),
    })
  )

  const resumen: ExcelResumen = {
    totalInterno: Number(raw.resumen?.totalInterno) || 0,
    totalCliente: Number(raw.resumen?.totalCliente) || 0,
    moneda: (raw.resumen?.moneda as string) || 'USD',
    margenGlobal: raw.resumen?.margenGlobal
      ? Number(raw.resumen.margenGlobal)
      : undefined,
    nombreProyecto: (raw.resumen?.nombreProyecto as string) || undefined,
    clienteNombre: (raw.resumen?.clienteNombre as string) || undefined,
  }

  return {
    equipos,
    servicios,
    gastos,
    resumen,
    recursosUnicos: Array.from(recursosSet).sort(),
    edtsUnicos: Array.from(edtsSet).sort(),
    hojas: [],
  }
}

// ── Función principal ─────────────────────────────────────

/**
 * Pipeline completo: lee Excel → convierte a texto → Claude extrae datos.
 */
export async function extractExcelData(
  buffer: Buffer
): Promise<{ data: ExcelExtraido; sheets: SheetTextData[] }> {
  const sheets = readExcelSheets(buffer)

  if (sheets.length === 0) {
    throw new Error('El archivo Excel no contiene hojas con datos')
  }

  const data = await extractWithClaude(sheets)
  data.hojas = sheets.map((s) => s.name)

  return { data, sheets }
}
