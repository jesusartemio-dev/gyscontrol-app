// ===================================================
// 📁 Util: catalogoEppExcel.ts
// 🔧 Descripción: Plantilla, parser y exportador Excel para CatalogoEPP.
//                 Plantilla generada con exceljs (dropdowns con dataValidation
//                 estricta para que no se puedan ingresar valores inválidos).
//                 Parser usa xlsx para leer la primera hoja del archivo subido.
// ===================================================

import * as XLSX from 'xlsx'

export const SUBCATEGORIAS_EPP = [
  { value: 'cabeza',       label: 'Cabeza (cascos)' },
  { value: 'manos',        label: 'Manos (guantes)' },
  { value: 'ojos',         label: 'Ojos (lentes)' },
  { value: 'auditiva',     label: 'Auditiva (tapones)' },
  { value: 'respiratoria', label: 'Respiratoria (mascarillas)' },
  { value: 'pies',         label: 'Pies (calzado)' },
  { value: 'caida',        label: 'Caída (arnés)' },
  { value: 'ropa',         label: 'Ropa industrial' },
  { value: 'visibilidad',  label: 'Visibilidad (chalecos)' },
  { value: 'otro',         label: 'Otro' },
] as const

export const TALLA_CAMPOS = [
  { value: 'calzado',  label: 'Calzado' },
  { value: 'camisa',   label: 'Camisa' },
  { value: 'pantalon', label: 'Pantalón' },
  { value: 'casco',    label: 'Casco' },
] as const

export const SI_NO = ['Sí', 'No'] as const
export const MONEDAS_EPP = ['PEN', 'USD'] as const

// Filas crudas tal como vienen del Excel
export interface EppExcelRow {
  fila: number // # de fila (para reportar errores)
  codigo: string
  descripcion: string
  marca: string | null
  modelo: string | null
  talla: string | null // Valor de la talla específica de este SKU (ej. "M", "40")
  subcategoria: string // label del Excel — se normaliza al value en el parser
  unidad: string // nombre de la unidad
  requiereTalla: boolean
  tallaCampo: string | null
  vidaUtilDias: number | null
  esConsumible: boolean
  precioReferencial: number | null
  monedaReferencial: string
}

// Helpers
const toBool = (v: unknown): boolean => {
  if (typeof v === 'boolean') return v
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase()
    return s === 'sí' || s === 'si' || s === 'true' || s === '1' || s === 'yes'
  }
  return false
}

const cleanStr = (v: unknown): string => (v == null ? '' : String(v).trim())
const cleanOptional = (v: unknown): string | null => {
  const s = cleanStr(v)
  return s ? s : null
}
const toNumber = (v: unknown): number | null => {
  if (v == null || v === '') return null
  const n = typeof v === 'number' ? v : Number(String(v).replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

// Mapea label de subcategoría a su value enum (case-insensitive, también acepta el value directo)
const normalizarSubcategoria = (raw: string): string | null => {
  if (!raw) return null
  const lower = raw.toLowerCase().trim()
  // Match por value
  const byValue = SUBCATEGORIAS_EPP.find(s => s.value === lower)
  if (byValue) return byValue.value
  // Match por label (sin tildes y sin paréntesis)
  const sinExtras = lower.replace(/\(.*?\)/g, '').replace(/[áàä]/g, 'a').replace(/[éèë]/g, 'e').replace(/[íìï]/g, 'i').replace(/[óòö]/g, 'o').replace(/[úùü]/g, 'u').trim()
  const byLabel = SUBCATEGORIAS_EPP.find(s => s.label.toLowerCase().replace(/\(.*?\)/g, '').replace(/[áàä]/g, 'a').replace(/[éèë]/g, 'e').replace(/[íìï]/g, 'i').replace(/[óòö]/g, 'o').replace(/[úùü]/g, 'u').trim() === sinExtras)
  return byLabel?.value ?? null
}

const normalizarTallaCampo = (raw: string | null): string | null => {
  if (!raw) return null
  const lower = raw.toLowerCase().trim()
  const sinAcentos = lower.replace(/[áàä]/g, 'a').replace(/[éèë]/g, 'e').replace(/[íìï]/g, 'i').replace(/[óòö]/g, 'o').replace(/[úùü]/g, 'u')
  const found = TALLA_CAMPOS.find(t => t.value === sinAcentos || t.label.toLowerCase() === lower)
  return found?.value ?? null
}

// ============================================================
// Generar plantilla con exceljs (dropdowns estrictos)
// ============================================================
export async function descargarPlantillaCatalogoEpp(
  unidades: Array<{ id: string; nombre: string }>
): Promise<void> {
  const ExcelJS = (await import('exceljs')).default

  const wb = new ExcelJS.Workbook()

  // --- Hoja 1: Plantilla (editable) ---
  const ws = wb.addWorksheet('Plantilla')
  ws.columns = [
    { header: 'Código *',           key: 'codigo',            width: 22 },
    { header: 'Descripción *',      key: 'descripcion',       width: 38 },
    { header: 'Marca',              key: 'marca',             width: 18 },
    { header: 'Modelo',             key: 'modelo',            width: 18 },
    { header: 'Talla',              key: 'talla',             width: 10 },
    { header: 'Subcategoría *',     key: 'subcategoria',      width: 28 },
    { header: 'Unidad *',           key: 'unidad',            width: 12 },
    { header: 'Requiere Talla',     key: 'requiereTalla',     width: 16 },
    { header: 'Tipo de talla',      key: 'tallaCampo',        width: 16 },
    { header: 'Vida Útil (días)',   key: 'vidaUtilDias',      width: 16 },
    { header: 'Es Consumible',      key: 'esConsumible',      width: 14 },
    { header: 'Precio Referencial', key: 'precioReferencial', width: 18 },
    { header: 'Moneda',             key: 'monedaReferencial', width: 10 },
  ]
  // Header style
  ws.getRow(1).font = { bold: true }
  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFED7AA' } }
  ws.getRow(1).alignment = { vertical: 'middle', horizontal: 'left' }

  // Header de columnas con selector → azul (más oscuro) para distinguirlas a simple vista
  // Columnas dropdown: F (Subcat), G (Unidad), H (Req Talla), I (Tipo talla), K (Consumible), M (Moneda)
  const COLS_SELECTOR = ['F', 'G', 'H', 'I', 'K', 'M'] as const
  for (const col of COLS_SELECTOR) {
    ws.getCell(`${col}1`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFBAE6FD' } } // sky-200
  }

  // Filas de ejemplo. Convención: cada talla es un SKU distinto. El valor
  // de la talla (M, 40) va en la columna "Talla". "Tipo de talla" indica
  // qué medida del empleado consultar para auto-sugerir al entregar.
  ws.addRow({
    codigo: 'EPP-CASCO-MSA-M', descripcion: 'Casco de seguridad ABS', marca: 'MSA', modelo: 'V-Gard',
    talla: 'M', subcategoria: 'Cabeza (cascos)', unidad: unidades[0]?.nombre ?? 'und',
    requiereTalla: 'Sí', tallaCampo: 'Casco', vidaUtilDias: 730, esConsumible: 'No',
    precioReferencial: 25, monedaReferencial: 'PEN',
  })
  ws.addRow({
    codigo: 'EPP-MASCARILLA-N95', descripcion: 'Mascarilla N95 desechable', marca: '3M', modelo: '1860',
    talla: '', subcategoria: 'Respiratoria (mascarillas)', unidad: unidades[0]?.nombre ?? 'und',
    requiereTalla: 'No', tallaCampo: '', vidaUtilDias: '', esConsumible: 'Sí',
    precioReferencial: 8, monedaReferencial: 'PEN',
  })
  ws.addRow({
    codigo: 'EPP-CALZADO-IND-40', descripcion: 'Calzado de seguridad punta acero', marca: 'Bata', modelo: 'Industrial',
    talla: '40', subcategoria: 'Pies (calzado)', unidad: unidades[0]?.nombre ?? 'und',
    requiereTalla: 'Sí', tallaCampo: 'Calzado', vidaUtilDias: 365, esConsumible: 'No',
    precioReferencial: 80, monedaReferencial: 'PEN',
  })

  // --- Hoja 2: Subcategorías (visible referencia) ---
  const wsSub = wb.addWorksheet('Subcategorías')
  wsSub.columns = [{ header: 'Subcategoría', key: 'nombre', width: 32 }]
  wsSub.getRow(1).font = { bold: true }
  wsSub.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } }
  for (const s of SUBCATEGORIAS_EPP) wsSub.addRow({ nombre: s.label })

  // --- Hoja 3: Tipos de talla (visible referencia) ---
  // Nota: este "Tipo de talla" indica QUÉ MEDIDA del empleado consultar,
  // no el valor (S/M/L o 39/40/41). El valor real vive en el empleado y se
  // autosugiere al hacer la entrega.
  const wsTalla = wb.addWorksheet('Tallas')
  wsTalla.columns = [{ header: 'Tipo de talla', key: 'nombre', width: 16 }]
  wsTalla.getRow(1).font = { bold: true }
  wsTalla.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } }
  for (const t of TALLA_CAMPOS) wsTalla.addRow({ nombre: t.label })

  // --- Hoja 4: Unidades (oculta) ---
  const wsUni = wb.addWorksheet('Unidades')
  wsUni.columns = [{ header: 'Unidad', key: 'nombre', width: 12 }]
  for (const u of unidades) wsUni.addRow({ nombre: u.nombre })
  wsUni.state = 'hidden'

  // --- Hoja 5: Sí/No (oculta) ---
  const wsSiNo = wb.addWorksheet('SiNo')
  wsSiNo.columns = [{ header: 'Valor', key: 'v', width: 6 }]
  for (const v of SI_NO) wsSiNo.addRow({ v })
  wsSiNo.state = 'hidden'

  // --- Hoja 6: Monedas (oculta) ---
  const wsMon = wb.addWorksheet('Monedas')
  wsMon.columns = [{ header: 'Moneda', key: 'm', width: 8 }]
  for (const m of MONEDAS_EPP) wsMon.addRow({ m })
  wsMon.state = 'hidden'

  // --- Data validations (estrictas: showErrorMessage=true) ---
  // Las celdas con dropdown se colorean en celeste muy claro (sky-50) para
  // que el usuario sepa "no se escribe, solo se selecciona".
  const SELECTOR_FILL = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFEFF6FF' } }
  const ROWS_VALIDADAS = 500
  for (let row = 2; row <= ROWS_VALIDADAS; row++) {
    // F: Subcategoría
    ws.getCell(`F${row}`).dataValidation = {
      type: 'list',
      allowBlank: false,
      formulae: [`Subcategorías!$A$2:$A$${SUBCATEGORIAS_EPP.length + 1}`],
      showErrorMessage: true,
      errorTitle: 'Subcategoría inválida',
      error: 'Selecciona una subcategoría de la lista',
    }
    ws.getCell(`F${row}`).fill = SELECTOR_FILL
    // G: Unidad
    if (unidades.length > 0) {
      ws.getCell(`G${row}`).dataValidation = {
        type: 'list',
        allowBlank: false,
        formulae: [`Unidades!$A$2:$A$${unidades.length + 1}`],
        showErrorMessage: true,
        errorTitle: 'Unidad inválida',
        error: 'Selecciona una unidad de la lista',
      }
      ws.getCell(`G${row}`).fill = SELECTOR_FILL
    }
    // H: Requiere Talla (Sí/No)
    ws.getCell(`H${row}`).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: [`SiNo!$A$2:$A$${SI_NO.length + 1}`],
      showErrorMessage: true,
      errorTitle: 'Valor inválido',
      error: 'Solo se permite Sí o No',
    }
    ws.getCell(`H${row}`).fill = SELECTOR_FILL
    // I: Tipo de talla
    ws.getCell(`I${row}`).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: [`Tallas!$A$2:$A$${TALLA_CAMPOS.length + 1}`],
      showErrorMessage: true,
      errorTitle: 'Tipo de talla inválido',
      error: 'Selecciona el tipo de medida (Calzado/Camisa/Pantalón/Casco). Solo aplica si Requiere Talla = Sí',
    }
    ws.getCell(`I${row}`).fill = SELECTOR_FILL
    // K: Es Consumible (Sí/No)
    ws.getCell(`K${row}`).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: [`SiNo!$A$2:$A$${SI_NO.length + 1}`],
      showErrorMessage: true,
      errorTitle: 'Valor inválido',
      error: 'Solo se permite Sí o No',
    }
    ws.getCell(`K${row}`).fill = SELECTOR_FILL
    // M: Moneda
    ws.getCell(`M${row}`).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: [`Monedas!$A$2:$A$${MONEDAS_EPP.length + 1}`],
      showErrorMessage: true,
      errorTitle: 'Moneda inválida',
      error: 'Solo se permite PEN o USD',
    }
    ws.getCell(`M${row}`).fill = SELECTOR_FILL
    // J: Vida útil — entero >= 0
    ws.getCell(`J${row}`).dataValidation = {
      type: 'whole',
      operator: 'greaterThanOrEqual',
      allowBlank: true,
      formulae: [0],
      showErrorMessage: true,
      errorTitle: 'Días inválidos',
      error: 'Vida útil debe ser un entero ≥ 0',
    }
    // L: Precio referencial — decimal >= 0
    ws.getCell(`L${row}`).dataValidation = {
      type: 'decimal',
      operator: 'greaterThanOrEqual',
      allowBlank: true,
      formulae: [0],
      showErrorMessage: true,
      errorTitle: 'Precio inválido',
      error: 'Precio debe ser ≥ 0',
    }
  }

  // Generate y descarga
  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'plantilla_catalogo_epp.xlsx'
  a.click()
  URL.revokeObjectURL(url)
}

// ============================================================
// Parser del Excel subido
// ============================================================
export async function parsearCatalogoEppExcel(file: File): Promise<{
  filas: EppExcelRow[]
  errores: Array<{ fila: number; codigo: string; mensaje: string }>
}> {
  const arrayBuffer = await file.arrayBuffer()
  const wb = XLSX.read(arrayBuffer, { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  if (!ws) throw new Error('El archivo no contiene hojas')

  const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '', raw: false })

  const filas: EppExcelRow[] = []
  const errores: Array<{ fila: number; codigo: string; mensaje: string }> = []

  rows.forEach((r, idx) => {
    const fila = idx + 2 // header en fila 1, datos desde fila 2

    const codigo = cleanStr(r['Código *'] ?? r['Código'] ?? r['Codigo *'] ?? r['Codigo'] ?? r['codigo'])
    const descripcion = cleanStr(r['Descripción *'] ?? r['Descripción'] ?? r['Descripcion *'] ?? r['Descripcion'] ?? r['descripcion'])
    const marca = cleanOptional(r['Marca'] ?? r['marca'])
    const modelo = cleanOptional(r['Modelo'] ?? r['modelo'])
    const talla = cleanOptional(r['Talla'] ?? r['talla'])
    const subRaw = cleanStr(r['Subcategoría *'] ?? r['Subcategoría'] ?? r['Subcategoria *'] ?? r['Subcategoria'] ?? r['subcategoria'])
    const unidad = cleanStr(r['Unidad *'] ?? r['Unidad'] ?? r['unidad'])
    const requiereTalla = toBool(r['Requiere Talla'] ?? r['requiereTalla'])
    const tallaCampoRaw = cleanOptional(r['Tipo de talla'] ?? r['Talla Campo'] ?? r['tallaCampo'])
    const vidaUtilDias = toNumber(r['Vida Útil (días)'] ?? r['Vida Útil'] ?? r['VidaUtilDias'] ?? r['vidaUtilDias'])
    const esConsumible = toBool(r['Es Consumible'] ?? r['esConsumible'])
    const precioReferencial = toNumber(r['Precio Referencial'] ?? r['precioReferencial'])
    const monedaReferencial = (cleanStr(r['Moneda'] ?? r['monedaReferencial']) || 'PEN').toUpperCase()

    // Skip filas totalmente vacías
    if (!codigo && !descripcion && !subRaw && !unidad) return

    const subcategoria = normalizarSubcategoria(subRaw)
    const tallaCampo = normalizarTallaCampo(tallaCampoRaw)

    if (!codigo) errores.push({ fila, codigo: '(vacío)', mensaje: 'Código es obligatorio' })
    if (!descripcion) errores.push({ fila, codigo, mensaje: 'Descripción es obligatoria' })
    if (!subcategoria) errores.push({ fila, codigo, mensaje: `Subcategoría inválida: "${subRaw}"` })
    if (!unidad) errores.push({ fila, codigo, mensaje: 'Unidad es obligatoria' })
    if (requiereTalla && !tallaCampo) errores.push({ fila, codigo, mensaje: 'Si requiere talla, debe especificar el Tipo de talla (Calzado/Camisa/Pantalón/Casco)' })
    if (requiereTalla && !talla) errores.push({ fila, codigo, mensaje: 'Si requiere talla, debe indicar el valor de la talla (ej. M, 40)' })
    if (!['PEN', 'USD'].includes(monedaReferencial)) errores.push({ fila, codigo, mensaje: `Moneda inválida: "${monedaReferencial}"` })

    filas.push({
      fila, codigo, descripcion, marca, modelo,
      talla: requiereTalla ? talla : null,
      subcategoria: subcategoria ?? '',
      unidad,
      requiereTalla,
      tallaCampo: requiereTalla ? tallaCampo : null,
      vidaUtilDias, esConsumible,
      precioReferencial,
      monedaReferencial,
    })
  })

  return { filas, errores }
}

// ============================================================
// Exportar catálogo actual a Excel
// ============================================================
export interface CatalogoEppExportRow {
  codigo: string
  descripcion: string
  marca: string | null
  modelo: string | null
  talla: string | null
  subcategoria: string
  unidad: { nombre: string }
  requiereTalla: boolean
  tallaCampo: string | null
  vidaUtilDias: number | null
  esConsumible: boolean
  precioReferencial: number | null
  monedaReferencial: string
  activo: boolean
}

export function exportarCatalogoEppAExcel(items: CatalogoEppExportRow[]): void {
  const data = items.map(i => ({
    'Código': i.codigo,
    'Descripción': i.descripcion,
    'Marca': i.marca ?? '',
    'Modelo': i.modelo ?? '',
    'Talla': i.talla ?? '',
    'Subcategoría': SUBCATEGORIAS_EPP.find(s => s.value === i.subcategoria)?.label ?? i.subcategoria,
    'Unidad': i.unidad?.nombre ?? '',
    'Requiere Talla': i.requiereTalla ? 'Sí' : 'No',
    'Tipo de talla': i.tallaCampo ? (TALLA_CAMPOS.find(t => t.value === i.tallaCampo)?.label ?? i.tallaCampo) : '',
    'Vida Útil (días)': i.vidaUtilDias ?? '',
    'Es Consumible': i.esConsumible ? 'Sí' : 'No',
    'Precio Referencial': i.precioReferencial ?? '',
    'Moneda': i.monedaReferencial,
    'Activo': i.activo ? 'Sí' : 'No',
  }))

  const ws = XLSX.utils.json_to_sheet(data)
  // Ancho aproximado de columnas
  ws['!cols'] = [
    { wch: 22 }, { wch: 38 }, { wch: 18 }, { wch: 18 }, { wch: 10 },
    { wch: 28 }, { wch: 12 }, { wch: 14 }, { wch: 16 }, { wch: 16 },
    { wch: 14 }, { wch: 18 }, { wch: 8 }, { wch: 8 },
  ]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Catálogo EPP')

  const ts = new Date().toISOString().slice(0, 10)
  XLSX.writeFile(wb, `catalogo_epp_${ts}.xlsx`)
}
