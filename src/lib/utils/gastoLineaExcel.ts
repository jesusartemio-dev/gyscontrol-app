// ===================================================
// Archivo: gastoLineaExcel.ts
// Ubicación: src/lib/utils/
// Descripción: Import/Export de líneas de gasto (rendiciones) desde/hacia Excel
// ===================================================

import * as XLSX from 'xlsx'
import type { CategoriaGasto } from '@/types'

// ============================================
// TIPOS
// ============================================

export interface GastoLineaImportRow {
  fecha: string        // yyyy-MM-dd
  descripcion: string
  monto: number
  categoria: string    // nombre de la categoría
  categoriaGastoId: string | null
  tipoComprobante: string | null
  numeroComprobante: string | null
  proveedorNombre: string | null
  proveedorRuc: string | null
}

export interface GastoLineaImportResult {
  items: GastoLineaImportRow[]
  errores: string[]
  advertencias: string[]
}

// ============================================
// TIPOS DE COMPROBANTE VÁLIDOS
// ============================================
const TIPOS_COMPROBANTE_MAP: Record<string, string> = {
  'factura': 'factura',
  'boleta': 'boleta',
  'recibo': 'recibo',
  'ticket': 'ticket',
  'sin comprobante': 'sin_comprobante',
  'sin_comprobante': 'sin_comprobante',
}

// ============================================
// LEER EXCEL
// ============================================
export function leerExcelGastoLineas(file: File): Promise<Record<string, unknown>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const wb = XLSX.read(data, { type: 'array' })
        const sheetName = wb.SheetNames[0]
        const ws = wb.Sheets[sheetName]
        const rows = XLSX.utils.sheet_to_json(ws) as Record<string, unknown>[]
        resolve(rows)
      } catch (err) {
        reject(new Error('No se pudo leer el archivo Excel'))
      }
    }
    reader.onerror = () => reject(new Error('Error al leer el archivo'))
    reader.readAsArrayBuffer(file)
  })
}

// ============================================
// VALIDAR E IMPORTAR
// ============================================
export function validarGastoLineas(
  rows: Record<string, unknown>[],
  categorias: CategoriaGasto[]
): GastoLineaImportResult {
  const items: GastoLineaImportRow[] = []
  const errores: string[] = []
  const advertencias: string[] = []

  if (rows.length === 0) {
    errores.push('El archivo está vacío')
    return { items, errores, advertencias }
  }

  const categoriasMap = new Map<string, string>()
  categorias.forEach(c => categoriasMap.set(c.nombre.toLowerCase().trim(), c.id))

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const rowNum = i + 2 // Excel row (header = 1)

    // Fecha
    const fechaRaw = row['Fecha'] ?? row['fecha']
    let fecha = ''
    if (fechaRaw) {
      if (typeof fechaRaw === 'number') {
        // Excel serial date
        const d = XLSX.SSF.parse_date_code(fechaRaw)
        if (d) {
          fecha = `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`
        }
      } else if (typeof fechaRaw === 'string') {
        // Try common formats
        const parsed = parseDateString(fechaRaw)
        if (parsed) fecha = parsed
      }
    }
    if (!fecha) {
      errores.push(`Fila ${rowNum}: Fecha es requerida o tiene formato inválido`)
      continue
    }

    // Descripción
    const descripcion = String(row['Descripción'] ?? row['Descripcion'] ?? row['descripcion'] ?? '').trim()
    if (!descripcion) {
      errores.push(`Fila ${rowNum}: Descripción es requerida`)
      continue
    }

    // Monto
    const montoRaw = row['Monto'] ?? row['monto']
    const monto = typeof montoRaw === 'number' ? montoRaw : parseFloat(String(montoRaw || '0').replace(',', '.'))
    if (!monto || monto <= 0) {
      errores.push(`Fila ${rowNum}: Monto debe ser mayor a 0`)
      continue
    }

    // Categoría (opcional)
    const categoriaRaw = String(row['Categoría'] ?? row['Categoria'] ?? row['categoria'] ?? '').trim()
    let categoriaGastoId: string | null = null
    if (categoriaRaw) {
      const catId = categoriasMap.get(categoriaRaw.toLowerCase())
      if (catId) {
        categoriaGastoId = catId
      } else {
        advertencias.push(`Fila ${rowNum}: Categoría "${categoriaRaw}" no encontrada en el sistema`)
      }
    }

    // Tipo comprobante (opcional)
    const tipoRaw = String(row['Tipo Comprobante'] ?? row['TipoComprobante'] ?? row['tipo_comprobante'] ?? '').trim().toLowerCase()
    const tipoComprobante = tipoRaw ? (TIPOS_COMPROBANTE_MAP[tipoRaw] || null) : null
    if (tipoRaw && !tipoComprobante) {
      advertencias.push(`Fila ${rowNum}: Tipo comprobante "${tipoRaw}" no válido (use: factura, boleta, recibo, ticket, sin comprobante)`)
    }

    // N° comprobante (opcional)
    const numeroComprobante = String(row['N° Comprobante'] ?? row['NumeroComprobante'] ?? row['numero_comprobante'] ?? row['Nro Comprobante'] ?? '').trim() || null

    // Proveedor (opcional)
    const proveedorNombre = String(row['Proveedor'] ?? row['Nombre Proveedor'] ?? row['proveedor'] ?? '').trim() || null

    // RUC (opcional)
    const proveedorRuc = String(row['RUC'] ?? row['RUC Proveedor'] ?? row['ruc'] ?? '').trim() || null

    items.push({
      fecha,
      descripcion,
      monto: Math.round(monto * 100) / 100,
      categoria: categoriaRaw,
      categoriaGastoId,
      tipoComprobante,
      numeroComprobante,
      proveedorNombre,
      proveedorRuc,
    })
  }

  return { items, errores, advertencias }
}

// ============================================
// GENERAR PLANTILLA EXCEL
// ============================================
export async function generarPlantillaGastoLineas(
  categorias: CategoriaGasto[],
  nombreArchivo: string = 'Plantilla_Rendicion_Gastos'
) {
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()

  // --- Sheet 1: Gastos ---
  const wsGastos = wb.addWorksheet('Gastos')
  wsGastos.columns = [
    { header: 'Fecha', key: 'fecha', width: 14 },
    { header: 'Descripción', key: 'descripcion', width: 40 },
    { header: 'Monto', key: 'monto', width: 14 },
    { header: 'Categoría', key: 'categoria', width: 22 },
    { header: 'Tipo Comprobante', key: 'tipoComprobante', width: 18 },
    { header: 'N° Comprobante', key: 'numeroComprobante', width: 18 },
    { header: 'Proveedor', key: 'proveedor', width: 30 },
    { header: 'RUC', key: 'ruc', width: 14 },
  ]

  // Header styling
  const headerRow = wsGastos.getRow(1)
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEA580C' } }
  headerRow.alignment = { horizontal: 'center' }

  // Example rows
  wsGastos.addRow({
    fecha: new Date(),
    descripcion: 'Almuerzo equipo de obra',
    monto: 45.00,
    categoria: categorias[0]?.nombre || 'Alimentación',
    tipoComprobante: 'Boleta',
    numeroComprobante: 'B001-00123',
    proveedor: 'Restaurante El Buen Sabor',
    ruc: '20123456789',
  })
  wsGastos.addRow({
    fecha: new Date(),
    descripcion: 'Combustible camioneta',
    monto: 120.50,
    categoria: categorias[1]?.nombre || 'Transporte',
    tipoComprobante: 'Factura',
    numeroComprobante: 'F001-00456',
    proveedor: 'Grifo Petroperú',
    ruc: '20100128218',
  })

  // Format fecha column as date
  wsGastos.getColumn('fecha').numFmt = 'DD/MM/YYYY'
  // Format monto column as number with 2 decimals
  wsGastos.getColumn('monto').numFmt = '#,##0.00'

  // Data validation for categoría (dropdown) rows 2-500
  if (categorias.length > 0) {
    const catNames = categorias.map(c => `"${c.nombre}"`).join(',')
    for (let r = 2; r <= 500; r++) {
      wsGastos.getCell(`D${r}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [catNames.length <= 255 ? catNames : `Categorias!$A$2:$A$${categorias.length + 1}`],
        showErrorMessage: true,
        errorTitle: 'Categoría inválida',
        error: 'Seleccione una categoría de la lista',
      }
    }
  }

  // Data validation for tipo comprobante
  const tiposStr = '"Factura,Boleta,Recibo,Ticket,Sin comprobante"'
  for (let r = 2; r <= 500; r++) {
    wsGastos.getCell(`E${r}`).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: [tiposStr],
      showErrorMessage: true,
      errorTitle: 'Tipo inválido',
      error: 'Seleccione un tipo de comprobante de la lista',
    }
  }

  // --- Sheet 2: Categorias (reference) ---
  const wsCategorias = wb.addWorksheet('Categorias')
  wsCategorias.columns = [
    { header: 'Categoría', key: 'nombre', width: 30 },
    { header: 'Descripción', key: 'descripcion', width: 50 },
  ]
  wsCategorias.getRow(1).font = { bold: true }
  wsCategorias.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFED7AA' } }
  for (const cat of categorias) {
    wsCategorias.addRow({ nombre: cat.nombre, descripcion: cat.descripcion || '' })
  }

  // Generate and download
  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${nombreArchivo}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}

// ============================================
// EXPORTAR LÍNEAS EXISTENTES A EXCEL
// ============================================
export async function exportarGastoLineasAExcel(
  lineas: Array<{
    fecha: string
    descripcion: string
    monto: number
    categoriaGasto?: { nombre: string } | null
    tipoComprobante?: string | null
    numeroComprobante?: string | null
    proveedorNombre?: string | null
    proveedorRuc?: string | null
  }>,
  nombreArchivo: string = 'Rendicion_Gastos'
) {
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()

  const ws = wb.addWorksheet('Gastos')
  ws.columns = [
    { header: 'Fecha', key: 'fecha', width: 14 },
    { header: 'Descripción', key: 'descripcion', width: 40 },
    { header: 'Monto', key: 'monto', width: 14 },
    { header: 'Categoría', key: 'categoria', width: 22 },
    { header: 'Tipo Comprobante', key: 'tipoComprobante', width: 18 },
    { header: 'N° Comprobante', key: 'numeroComprobante', width: 18 },
    { header: 'Proveedor', key: 'proveedor', width: 30 },
    { header: 'RUC', key: 'ruc', width: 14 },
  ]

  const headerRow = ws.getRow(1)
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEA580C' } }

  const TIPOS_LABEL: Record<string, string> = {
    factura: 'Factura',
    boleta: 'Boleta',
    recibo: 'Recibo',
    ticket: 'Ticket',
    sin_comprobante: 'Sin comprobante',
  }

  for (const linea of lineas) {
    const fechaStr = typeof linea.fecha === 'string' ? linea.fecha.substring(0, 10) : ''
    const [y, m, d] = fechaStr.split('-').map(Number)
    ws.addRow({
      fecha: y ? new Date(y, m - 1, d) : '',
      descripcion: linea.descripcion,
      monto: linea.monto,
      categoria: linea.categoriaGasto?.nombre || '',
      tipoComprobante: linea.tipoComprobante ? (TIPOS_LABEL[linea.tipoComprobante] || linea.tipoComprobante) : '',
      numeroComprobante: linea.numeroComprobante || '',
      proveedor: linea.proveedorNombre || '',
      ruc: linea.proveedorRuc || '',
    })
  }

  ws.getColumn('fecha').numFmt = 'DD/MM/YYYY'
  ws.getColumn('monto').numFmt = '#,##0.00'

  // Total row
  if (lineas.length > 0) {
    const totalRow = ws.addRow({
      descripcion: 'TOTAL',
      monto: lineas.reduce((sum, l) => sum + l.monto, 0),
    })
    totalRow.font = { bold: true }
    totalRow.getCell('monto').numFmt = '#,##0.00'
  }

  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${nombreArchivo}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}

// ============================================
// HELPERS
// ============================================
function parseDateString(str: string): string | null {
  // Try yyyy-MM-dd
  const isoMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`
  }

  // Try dd/MM/yyyy or dd-MM-yyyy
  const dmyMatch = str.match(/^(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})/)
  if (dmyMatch) {
    return `${dmyMatch[3]}-${dmyMatch[2].padStart(2, '0')}-${dmyMatch[1].padStart(2, '0')}`
  }

  return null
}
