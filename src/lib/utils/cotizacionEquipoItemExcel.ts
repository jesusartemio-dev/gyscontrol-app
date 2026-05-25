import { normalizeStr } from '@/lib/utils'
// ===================================================
// Archivo: cotizacionEquipoItemExcel.ts
// Ubicación: src/lib/utils/
// Descripción: Import/Export de items de equipo de cotización desde/hacia Excel
// Autor: Jesús Artemio
// Última actualización: 2025-01-31
// ===================================================

import * as XLSX from 'xlsx'
import type { CotizacionEquipoItem, CatalogoEquipo } from '@/types'
import { getCategoriasEquipo } from '@/lib/services/categoriaEquipo'
import { getUnidades } from '@/lib/services/unidad'

// ============================================
// EXPORTAR A EXCEL (con hojas de Categorías/Unidades y dropdowns)
// ============================================
export async function exportarCotizacionEquipoItemsAExcel(
  items: CotizacionEquipoItem[],
  nombreArchivo: string = 'EquiposCotizacion'
) {
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()

  // Fetch categories and units for dropdown sheets
  let categorias: Array<{ nombre: string; descripcion?: string }> = []
  let unidades: Array<{ nombre: string }> = []
  try {
    const [cats, unis] = await Promise.all([getCategoriasEquipo(), getUnidades()])
    categorias = cats
    unidades = unis
  } catch { /* continue without dropdowns */ }

  // --- Sheet 1: Equipos (main data) ---
  // Columnas base alineadas con la plantilla de importación + columnas calculadas al final
  const wsEquipos = wb.addWorksheet('Equipos')
  wsEquipos.columns = [
    { header: 'Código', key: 'codigo', width: 15 },
    { header: 'Descripción', key: 'descripcion', width: 40 },
    { header: 'Marca', key: 'marca', width: 15 },
    { header: 'Categoría', key: 'categoria', width: 18 },
    { header: 'Unidad', key: 'unidad', width: 10 },
    { header: 'Cantidad', key: 'cantidad', width: 10 },
    { header: 'P.Lista', key: 'precioLista', width: 12 },
    { header: 'Factor Costo', key: 'factorCosto', width: 12 },
    { header: 'Factor Venta', key: 'factorVenta', width: 12 },
    { header: 'P.Cliente', key: 'precioCliente', width: 12 },
    { header: 'Total Interno', key: 'totalInterno', width: 14 },
    { header: 'Total Cliente', key: 'totalCliente', width: 14 },
  ]
  wsEquipos.getRow(1).font = { bold: true }
  wsEquipos.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } }

  items.forEach((item) => {
    wsEquipos.addRow({
      codigo: item.codigo,
      descripcion: item.descripcion,
      marca: item.marca || '',
      categoria: item.categoria || '',
      unidad: item.unidad || '',
      cantidad: item.cantidad || 1,
      precioLista: item.precioLista || 0,
      factorCosto: +(item.factorCosto ?? 1.00).toFixed(2),
      factorVenta: +(item.factorVenta ?? 1.15).toFixed(2),
      precioCliente: item.precioCliente || 0,
      totalInterno: item.costoInterno || 0,
      totalCliente: item.costoCliente || 0,
    })
  })

  // --- Sheet 2: Categorias (visible reference) ---
  const wsCategorias = wb.addWorksheet('Categorias')
  wsCategorias.columns = [
    { header: 'Categoría', key: 'nombre', width: 25 },
    { header: 'Descripción', key: 'descripcion', width: 70 },
  ]
  wsCategorias.getRow(1).font = { bold: true }
  wsCategorias.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } }
  for (const cat of categorias) {
    wsCategorias.addRow({ nombre: cat.nombre, descripcion: (cat as any).descripcion || '' })
  }

  // --- Sheet 3: Unidades (hidden) ---
  const wsUnidades = wb.addWorksheet('Unidades')
  wsUnidades.columns = [{ header: 'Unidad', key: 'nombre', width: 15 }]
  for (const uni of unidades) {
    wsUnidades.addRow({ nombre: uni.nombre })
  }
  wsUnidades.state = 'hidden'

  // --- Data validation dropdowns on Equipos sheet ---
  const lastDataRow = items.length + 1 // header + data rows
  const maxRow = Math.max(lastDataRow + 50, 100) // extra rows for future additions

  if (categorias.length > 0) {
    for (let row = 2; row <= maxRow; row++) {
      wsEquipos.getCell(`D${row}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`Categorias!$A$2:$A$${categorias.length + 1}`],
        showErrorMessage: true,
        errorTitle: 'Categoría inválida',
        error: 'Selecciona una categoría de la lista o consulta la hoja "Categorias"',
      }
    }
  }
  if (unidades.length > 0) {
    for (let row = 2; row <= maxRow; row++) {
      wsEquipos.getCell(`E${row}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`Unidades!$A$2:$A$${unidades.length + 1}`],
        showErrorMessage: true,
        errorTitle: 'Unidad inválida',
        error: 'Selecciona una unidad de la lista',
      }
    }
  }

  // Generate and download
  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${nombreArchivo}.xlsx`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// ============================================
// GENERAR PLANTILLA EXCEL PARA IMPORTACIÓN
// (con hojas de Categorías/Unidades y dropdowns)
// ============================================
export async function generarPlantillaEquiposImportacion(
  nombreArchivo: string = 'PlantillaEquipos',
  categorias: Array<{ nombre: string; descripcion?: string }> = [],
  unidades: Array<{ nombre: string }> = []
) {
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()

  // --- Sheet 1: Equipos (main data entry) ---
  const wsEquipos = wb.addWorksheet('Equipos')
  wsEquipos.columns = [
    { header: 'Código', key: 'codigo', width: 15 },
    { header: 'Descripción', key: 'descripcion', width: 40 },
    { header: 'Marca', key: 'marca', width: 15 },
    { header: 'Categoría', key: 'categoria', width: 18 },
    { header: 'Unidad', key: 'unidad', width: 10 },
    { header: 'Cantidad', key: 'cantidad', width: 10 },
    { header: 'P.Lista', key: 'precioLista', width: 12 },
    { header: 'Factor Costo', key: 'factorCosto', width: 12 },
    { header: 'Factor Venta', key: 'factorVenta', width: 12 },
  ]
  wsEquipos.getRow(1).font = { bold: true }
  wsEquipos.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } }

  // Example rows using real categories/units when available
  wsEquipos.addRow({
    codigo: 'EQ-001',
    descripcion: 'Sensor de temperatura PT100',
    marca: 'Siemens',
    categoria: categorias[0]?.nombre || 'Sensores',
    unidad: unidades[0]?.nombre || 'Unidad',
    cantidad: 2,
    precioLista: 120.00,
    factorCosto: 1.00,
    factorVenta: 1.15,
  })
  wsEquipos.addRow({
    codigo: 'EQ-002',
    descripcion: 'PLC Compacto S7-1200',
    marca: 'Siemens',
    categoria: categorias[1]?.nombre || 'Controladores',
    unidad: unidades[1]?.nombre || 'Unidad',
    cantidad: 1,
    precioLista: 700.00,
    factorCosto: 1.00,
    factorVenta: 1.15,
  })

  // --- Sheet 2: Categorias (visible reference with descriptions) ---
  const wsCategorias = wb.addWorksheet('Categorias')
  wsCategorias.columns = [
    { header: 'Categoría', key: 'nombre', width: 25 },
    { header: 'Descripción', key: 'descripcion', width: 70 },
  ]
  wsCategorias.getRow(1).font = { bold: true }
  wsCategorias.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } }
  for (const cat of categorias) {
    wsCategorias.addRow({ nombre: cat.nombre, descripcion: (cat as any).descripcion || '' })
  }

  // --- Sheet 3: Unidades (hidden, used for dropdown validation) ---
  const wsUnidades = wb.addWorksheet('Unidades')
  wsUnidades.columns = [{ header: 'Unidad', key: 'nombre', width: 15 }]
  for (const uni of unidades) {
    wsUnidades.addRow({ nombre: uni.nombre })
  }
  wsUnidades.state = 'hidden'

  // --- Data validation dropdowns on Equipos sheet ---
  if (categorias.length > 0) {
    for (let row = 2; row <= 500; row++) {
      wsEquipos.getCell(`D${row}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`Categorias!$A$2:$A$${categorias.length + 1}`],
        showErrorMessage: true,
        errorTitle: 'Categoría inválida',
        error: 'Selecciona una categoría de la lista o consulta la hoja "Categorias"',
      }
    }
  }
  if (unidades.length > 0) {
    for (let row = 2; row <= 500; row++) {
      wsEquipos.getCell(`E${row}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`Unidades!$A$2:$A$${unidades.length + 1}`],
        showErrorMessage: true,
        errorTitle: 'Unidad inválida',
        error: 'Selecciona una unidad de la lista',
      }
    }
  }

  // Generate and download
  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${nombreArchivo}.xlsx`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// ============================================
// LEER EXCEL
// ============================================
export async function leerExcelEquipoItems(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const sheet = workbook.Sheets[sheetName]
        const json = XLSX.utils.sheet_to_json<any>(sheet)
        resolve(json)
      } catch (error) {
        reject(error)
      }
    }
    reader.onerror = (error) => reject(error)
    reader.readAsArrayBuffer(file)
  })
}

// ============================================
// TIPOS PARA IMPORTACIÓN
// ============================================

// Tipo de estado del item respecto al catálogo
export type CatalogStatus =
  | 'new'           // No existe en catálogo
  | 'match'         // Existe y precio coincide
  | 'conflict'      // Existe pero precio diferente

// Fuente de precio seleccionada para conflictos
export type PriceSource =
  | 'excel'                  // Usar precio del Excel
  | 'catalog'                // Usar precio del catálogo
  | 'excel_update_catalog'   // Usar Excel y actualizar catálogo

// Info del catálogo para comparación
export interface CatalogComparisonInfo {
  catalogoEquipoId: string
  catalogoPrecioLista: number
  catalogoPrecioInterno: number
  catalogoFactorCosto: number
  catalogoFactorVenta: number
  catalogoUpdatedAt: Date | string
  priceDifference: number       // Diferencia absoluta (precioLista)
  priceDifferencePercent: number // Diferencia porcentual
}

export interface ImportedEquipoItem {
  codigo: string
  descripcion: string
  categoria: string
  unidad: string
  marca: string
  cantidad: number
  precioLista: number
  precioInterno: number
  factorCosto: number
  factorVenta: number
  precioCliente: number
  costoInterno: number
  costoCliente: number
  // Para catálogo
  catalogoEquipoId?: string
  // Para detectar si es actualización en cotización
  isUpdate: boolean
  existingItemId?: string
  // Nuevos campos para comparación con catálogo
  catalogStatus: CatalogStatus
  catalogComparison?: CatalogComparisonInfo
  priceSource: PriceSource
  // Para items nuevos: opción de agregar al catálogo
  addToCatalog?: boolean
  // Para items sin código: código generado automáticamente
  codigoProvisional?: boolean
  // Para items con código duplicado en el Excel (no se pueden agregar al catálogo)
  codigoDuplicadoEnExcel?: boolean
}

export interface ExistingEquipoItem {
  id: string
  codigo: string
}

export interface EquipoImportValidationResult {
  itemsNuevos: ImportedEquipoItem[]
  itemsActualizar: ImportedEquipoItem[]
  itemsConflicto: ImportedEquipoItem[]  // Items con diferencia de precio
  errores: string[]
  advertencias: string[]  // Advertencias no bloqueantes (ej: duplicados)
  // Resumen
  summary: {
    totalNew: number           // No están en catálogo
    totalMatch: number         // Coinciden con catálogo
    totalConflict: number      // Diferencia de precio
    totalUpdate: number        // Ya existen en cotización
    codigosDuplicados: number  // Códigos que se repiten en el Excel
    codigosProvisionales: number // Items sin código que recibieron código provisional
  }
}

export interface CategoriaEquipoSimple {
  id: string
  nombre: string
}

// ============================================
// VALIDAR E IMPORTAR
// ============================================

// Función auxiliar para generar código provisional: TEMP-YYMMDD-XX
function generarCodigoProvisional(correlativo: number): string {
  const now = new Date()
  const yy = String(now.getFullYear()).slice(-2)
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const xx = String(correlativo).padStart(2, '0')
  return `TEMP-${yy}${mm}${dd}-${xx}`
}

export function validarEImportarEquipoItems(
  rows: any[],
  catalogoEquipos: CatalogoEquipo[],
  existingItems: ExistingEquipoItem[] = [],
  categoriasValidas: CategoriaEquipoSimple[] = []
): EquipoImportValidationResult {
  const errores: string[] = []
  const advertencias: string[] = []
  const itemsNuevos: ImportedEquipoItem[] = []
  const itemsActualizar: ImportedEquipoItem[] = []
  const itemsConflicto: ImportedEquipoItem[] = []

  // Contadores para resumen
  let totalNew = 0
  let totalMatch = 0
  let totalConflict = 0
  let codigosProvisionales = 0
  let contadorProvisional = 1

  // Crear set de nombres de categorías válidas (lowercase para comparación)
  const categoriasSet = new Set(categoriasValidas.map(c => normalizeStr(c.nombre)))

  // Tolerancia para comparación de precios (0.01 = 1 centavo)
  const PRICE_TOLERANCE = 0.01

  // ============================================
  // DETECCIÓN DE CÓDIGOS DUPLICADOS EN EL EXCEL
  // ============================================
  const codigoConteo = new Map<string, number[]>() // codigo -> [filas donde aparece]
  for (let [index, row] of rows.entries()) {
    const codigo = String(row['Código'] || row['Codigo'] || '').trim().toLowerCase()
    if (codigo) {
      const filas = codigoConteo.get(codigo) || []
      filas.push(index + 2) // +2 porque fila 1 es header
      codigoConteo.set(codigo, filas)
    }
  }

  // Identificar códigos duplicados
  const codigosDuplicadosMap = new Map<string, number[]>()
  for (const [codigo, filas] of codigoConteo.entries()) {
    if (filas.length > 1) {
      codigosDuplicadosMap.set(codigo, filas)
    }
  }

  // Agregar advertencias por códigos duplicados
  if (codigosDuplicadosMap.size > 0) {
    // Calcular total de filas afectadas
    let totalFilasDuplicadas = 0
    for (const filas of codigosDuplicadosMap.values()) {
      totalFilasDuplicadas += filas.length
    }
    advertencias.push(`⚠️ Se detectaron ${codigosDuplicadosMap.size} código(s) repetido(s) en ${totalFilasDuplicadas} filas:`)
    for (const [codigo, filas] of codigosDuplicadosMap.entries()) {
      advertencias.push(`   • "${codigo.toUpperCase()}" aparece ${filas.length} veces (filas: ${filas.join(', ')})`)
    }
    advertencias.push(`   Cada item se importará por separado en la cotización.`)
    advertencias.push(`   ⚠️ Items con código duplicado NO se pueden agregar al catálogo.`)
  }

  for (let [index, row] of rows.entries()) {
    const fila = index + 2 // +2 porque fila 1 es header

    // Leer campos: Código, Descripción, Marca, Categoría, Unidad, Cantidad, P.Lista, F.Costo, F.Venta
    let codigo = String(row['Código'] || row['Codigo'] || '').trim()
    const descripcion = String(row['Descripción'] || row['Descripcion'] || '').trim()
    const marca = String(row['Marca'] || '').trim()
    const categoriaExcel = String(row['Categoría'] || row['Categoria'] || '').trim()
    const unidad = String(row['Unidad'] || '').trim()
    const cantidad = parseInt(row['Cantidad'] || 1) || 1

    // Leer precios y factores del Excel
    const precioListaExcel = parseFloat(row['P.Lista'] || row['Precio Lista'] || row['PrecioLista'] || 0) || undefined
    const factorCostoExcel = parseFloat(row['F.Costo'] || row['Factor Costo'] || row['FactorCosto'] || 0) || undefined
    const factorVentaExcel = parseFloat(row['F.Venta'] || row['Factor Venta'] || row['FactorVenta'] || 0) || undefined

    // Validaciones básicas
    // Si no hay código, generar uno provisional
    let esCodigoProvisional = false
    if (!codigo) {
      // Formato: TEMP-YYMMDD-XX (temporal, solo para cotización)
      codigo = generarCodigoProvisional(contadorProvisional)
      contadorProvisional++
      codigosProvisionales++
      esCodigoProvisional = true
    }

    if (!descripcion) {
      errores.push(`Fila ${fila}: La descripción es requerida`)
      continue
    }

    if (cantidad <= 0) {
      errores.push(`Fila ${fila}: La cantidad debe ser mayor a 0`)
      continue
    }

    // Buscar en catálogo para heredar valores faltantes (solo si no es código provisional)
    const catalogoEquipo = !esCodigoProvisional
      ? catalogoEquipos.find(eq => eq.codigo.toLowerCase() === codigo.toLowerCase())
      : undefined

    // Determinar categoría final: Catálogo > Excel > Default
    const categoriaFinal = catalogoEquipo?.categoriaEquipo?.nombre || categoriaExcel || 'Sin categoría'

    // Validar que la categoría exista (si no viene del catálogo y se especificó una)
    if (!catalogoEquipo && categoriaExcel && categoriasValidas.length > 0) {
      if (!categoriasSet.has(normalizeStr(categoriaExcel))) {
        errores.push(`Fila ${fila}: La categoría '${categoriaExcel}' no existe en el sistema`)
        continue
      }
    }

    // Determinar precioLista a usar (Excel tiene prioridad si está definido)
    const precioListaCatalogo = catalogoEquipo?.precioLista ?? 0

    // Si no hay precioLista en Excel, usar catálogo
    const precioLista = (precioListaExcel && precioListaExcel > 0) ? precioListaExcel : precioListaCatalogo

    // Determinar factores (Excel tiene prioridad, luego catálogo, luego defaults)
    const factorCostoCatalogo = catalogoEquipo?.factorCosto ?? 1.00
    const factorVentaCatalogo = catalogoEquipo?.factorVenta ?? 1.15
    const factorCosto = factorCostoExcel ?? factorCostoCatalogo
    const factorVenta = factorVentaExcel ?? factorVentaCatalogo

    // precioInterno es calculado: precioLista × factorCosto
    const precioInterno = +(precioLista * factorCosto).toFixed(2)

    // Validar que tengamos precio de lista
    if (precioLista <= 0) {
      errores.push(`Fila ${fila}: El precio de lista (P.Lista) es requerido y debe ser mayor a 0`)
      continue
    }

    // Determinar estado del catálogo y si hay conflicto de precios
    let catalogStatus: CatalogStatus = 'new'
    let catalogComparison: CatalogComparisonInfo | undefined = undefined
    let priceSource: PriceSource = 'excel'

    if (catalogoEquipo) {
      // Calcular diferencia de precio basada en precioLista
      const priceDifference = precioListaExcel && precioListaExcel > 0
        ? Math.round((precioListaExcel - precioListaCatalogo) * 100) / 100
        : 0
      const priceDifferencePercent = precioListaCatalogo > 0
        ? Math.round((priceDifference / precioListaCatalogo) * 10000) / 100
        : 0

      // Si hay precioLista en Excel y es diferente al catálogo
      if (precioListaExcel && precioListaExcel > 0 && Math.abs(priceDifference) > PRICE_TOLERANCE) {
        catalogStatus = 'conflict'
        totalConflict++
        priceSource = 'excel' // Por defecto usar Excel, usuario puede cambiar
      } else {
        catalogStatus = 'match'
        totalMatch++
        // Si no hay precioLista en Excel, usar catálogo
        priceSource = (precioListaExcel && precioListaExcel > 0) ? 'excel' : 'catalog'
      }

      catalogComparison = {
        catalogoEquipoId: catalogoEquipo.id,
        catalogoPrecioLista: precioListaCatalogo,
        catalogoPrecioInterno: catalogoEquipo.precioInterno,
        catalogoFactorCosto: factorCostoCatalogo,
        catalogoFactorVenta: factorVentaCatalogo,
        catalogoUpdatedAt: catalogoEquipo.updatedAt,
        priceDifference,
        priceDifferencePercent
      }
    } else {
      catalogStatus = 'new'
      totalNew++
      priceSource = 'excel'
    }

    // CALCULAR precioCliente = precioInterno × factorVenta
    // Mantener precisión completa para cálculo del total (como Excel)
    const precioClienteExact = precioInterno * factorVenta
    const precioCliente = Math.round(precioClienteExact * 100) / 100

    // Calcular costos - usar precioClienteExact para mantener precisión como Excel
    const costoInterno = Math.round(precioInterno * cantidad * 100) / 100
    const costoCliente = Math.round(precioClienteExact * cantidad * 100) / 100

    // Detectar si ya existe un item con el mismo código en la cotización
    const existingItem = existingItems.find(
      item => normalizeStr(item.codigo) === normalizeStr(codigo)
    )

    // Verificar si el código está duplicado en el Excel (no se puede agregar al catálogo)
    const esCodigoDuplicado = codigosDuplicadosMap.has(codigo.toLowerCase())

    const importedItem: ImportedEquipoItem = {
      codigo,
      descripcion: catalogoEquipo?.descripcion || descripcion,
      categoria: categoriaFinal,
      unidad: catalogoEquipo?.unidad?.nombre || unidad,
      marca: catalogoEquipo?.marca || marca,
      cantidad,
      precioLista,
      precioInterno,
      factorCosto,
      factorVenta,
      precioCliente,
      costoInterno,
      costoCliente,
      catalogoEquipoId: catalogoEquipo?.id,
      isUpdate: !!existingItem,
      existingItemId: existingItem?.id,
      // Nuevos campos
      catalogStatus,
      catalogComparison,
      priceSource,
      codigoProvisional: esCodigoProvisional,
      codigoDuplicadoEnExcel: esCodigoDuplicado
    }

    // Clasificar el item
    if (existingItem) {
      itemsActualizar.push(importedItem)
    } else if (catalogStatus === 'conflict') {
      itemsConflicto.push(importedItem)
    } else {
      itemsNuevos.push(importedItem)
    }
  }

  // Agregar advertencia sobre códigos provisionales
  if (codigosProvisionales > 0) {
    advertencias.push(`📝 Se generaron ${codigosProvisionales} código(s) provisional(es) para items sin código.`)
    advertencias.push(`   Formato: TEMP-YYMMDD-XX (ej: TEMP-260202-01)`)
    advertencias.push(`   Puedes editar estos códigos después de importar.`)
  }

  return {
    itemsNuevos,
    itemsActualizar,
    itemsConflicto,
    errores,
    advertencias,
    summary: {
      totalNew,
      totalMatch,
      totalConflict,
      totalUpdate: itemsActualizar.length,
      codigosDuplicados: codigosDuplicadosMap.size,
      codigosProvisionales
    }
  }
}

// Función auxiliar para recalcular precios cuando cambia priceSource
export function recalcularItemConPriceSource(
  item: ImportedEquipoItem,
  priceSource: PriceSource
): ImportedEquipoItem {
  let precioLista = item.precioLista
  let factorCosto = item.factorCosto
  let factorVenta = item.factorVenta

  if (priceSource === 'catalog' && item.catalogComparison) {
    precioLista = item.catalogComparison.catalogoPrecioLista
    factorCosto = item.catalogComparison.catalogoFactorCosto
    factorVenta = item.catalogComparison.catalogoFactorVenta
  }
  // Para 'excel' y 'excel_update_catalog' usamos los valores originales del Excel

  const precioInterno = +(precioLista * factorCosto).toFixed(2)
  const precioClienteExact = precioInterno * factorVenta
  const precioCliente = Math.round(precioClienteExact * 100) / 100
  const costoInterno = Math.round(precioInterno * item.cantidad * 100) / 100
  const costoCliente = Math.round(precioClienteExact * item.cantidad * 100) / 100

  return {
    ...item,
    precioLista,
    precioInterno,
    factorCosto,
    factorVenta,
    precioCliente,
    costoInterno,
    costoCliente,
    priceSource
  }
}
