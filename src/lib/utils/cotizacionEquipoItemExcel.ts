// ===================================================
// Archivo: cotizacionEquipoItemExcel.ts
// Ubicación: src/lib/utils/
// Descripción: Import/Export de items de equipo de cotización desde/hacia Excel
// Autor: Jesús Artemio
// Última actualización: 2025-01-31
// ===================================================

import * as XLSX from 'xlsx'
import type { CotizacionEquipoItem, CatalogoEquipo } from '@/types'

// ============================================
// EXPORTAR A EXCEL
// ============================================
export function exportarCotizacionEquipoItemsAExcel(
  items: CotizacionEquipoItem[],
  nombreArchivo: string = 'EquiposCotizacion'
) {
  const data = items.map((item, idx) => {
    const diferencia = item.precioLista && item.precioInterno
      ? +((item.precioInterno - item.precioLista) * item.cantidad).toFixed(2)
      : null
    return {
      '#': idx + 1,
      'Código': item.codigo,
      'Descripción': item.descripcion,
      'Categoría': item.categoria || '',
      'Unidad': item.unidad || '',
      'Marca': item.marca || '',
      'Cantidad': item.cantidad || 1,
      'P.Lista': item.precioLista || '',
      'P.Interno': item.precioInterno || 0,
      'Diferencia': diferencia ?? '',
      'Margen': +((1 + (item.margen || 0)).toFixed(2)),
      'P.Cliente': item.precioCliente || 0,
      'Total Interno': item.costoInterno || 0,
      'Total Cliente': item.costoCliente || 0
    }
  })

  const worksheet = XLSX.utils.json_to_sheet(data)

  // Ajustar anchos de columna
  worksheet['!cols'] = [
    { wch: 4 },   // #
    { wch: 15 },  // Código
    { wch: 40 },  // Descripción
    { wch: 18 },  // Categoría
    { wch: 10 },  // Unidad
    { wch: 15 },  // Marca
    { wch: 10 },  // Cantidad
    { wch: 12 },  // P.Lista
    { wch: 12 },  // P.Interno
    { wch: 12 },  // Diferencia
    { wch: 10 },  // Margen %
    { wch: 12 },  // P.Cliente
    { wch: 14 },  // Total Interno
    { wch: 14 },  // Total Cliente
  ]

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Equipos')

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([excelBuffer], { type: 'application/octet-stream' })

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
// ============================================
export function generarPlantillaEquiposImportacion(nombreArchivo: string = 'PlantillaEquipos') {
  // Columnas: Código, Descripción, Marca, Categoría, Unidad, Cantidad, P.Lista, P.Real, Margen
  // P.Cliente se calcula: P.Real × Margen (donde Margen = 1.15 significa 15% de ganancia)
  const ejemplos = [
    {
      'Código': 'EQ-001',
      'Descripción': 'Sensor de temperatura PT100',
      'Marca': 'Siemens',
      'Categoría': 'Sensores',
      'Unidad': 'Unidad',
      'Cantidad': 2,
      'P.Lista': 120.00,
      'P.Real': 130.00,
      'Margen': 1.15
    },
    {
      'Código': 'EQ-002',
      'Descripción': 'PLC Compacto S7-1200',
      'Marca': 'Siemens',
      'Categoría': 'Controladores',
      'Unidad': 'Unidad',
      'Cantidad': 1,
      'P.Lista': 700.00,
      'P.Real': 739.13,
      'Margen': 1.15
    }
  ]

  const worksheet = XLSX.utils.json_to_sheet(ejemplos)

  worksheet['!cols'] = [
    { wch: 15 },  // Código
    { wch: 40 },  // Descripción
    { wch: 15 },  // Marca
    { wch: 18 },  // Categoría
    { wch: 10 },  // Unidad
    { wch: 10 },  // Cantidad
    { wch: 12 },  // P.Lista
    { wch: 12 },  // P.Real
    { wch: 10 },  // Margen
  ]

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Equipos')

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([excelBuffer], { type: 'application/octet-stream' })

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
  catalogoPrecioInterno: number
  catalogoPrecioLista?: number
  catalogoMargen: number
  catalogoUpdatedAt: Date
  priceDifference: number       // Diferencia absoluta
  priceDifferencePercent: number // Diferencia porcentual
}

export interface ImportedEquipoItem {
  codigo: string
  descripcion: string
  categoria: string
  unidad: string
  marca: string
  cantidad: number
  precioLista?: number
  precioInterno: number
  margen: number
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
  // Resumen
  summary: {
    totalNew: number           // No están en catálogo
    totalMatch: number         // Coinciden con catálogo
    totalConflict: number      // Diferencia de precio
    totalUpdate: number        // Ya existen en cotización
  }
}

export interface CategoriaEquipoSimple {
  id: string
  nombre: string
}

// ============================================
// VALIDAR E IMPORTAR
// ============================================
export function validarEImportarEquipoItems(
  rows: any[],
  catalogoEquipos: CatalogoEquipo[],
  existingItems: ExistingEquipoItem[] = [],
  categoriasValidas: CategoriaEquipoSimple[] = []
): EquipoImportValidationResult {
  const errores: string[] = []
  const itemsNuevos: ImportedEquipoItem[] = []
  const itemsActualizar: ImportedEquipoItem[] = []
  const itemsConflicto: ImportedEquipoItem[] = []

  // Contadores para resumen
  let totalNew = 0
  let totalMatch = 0
  let totalConflict = 0

  // Crear set de nombres de categorías válidas (lowercase para comparación)
  const categoriasSet = new Set(categoriasValidas.map(c => c.nombre.toLowerCase().trim()))

  // Tolerancia para comparación de precios (0.01 = 1 centavo)
  const PRICE_TOLERANCE = 0.01

  for (let [index, row] of rows.entries()) {
    const fila = index + 2 // +2 porque fila 1 es header

    // Leer campos en el nuevo orden: Código, Descripción, Marca, Categoría, Unidad, Cantidad, P.Lista, P.Real, Margen
    const codigo = String(row['Código'] || row['Codigo'] || '').trim()
    const descripcion = String(row['Descripción'] || row['Descripcion'] || '').trim()
    const marca = String(row['Marca'] || '').trim()
    const categoriaExcel = String(row['Categoría'] || row['Categoria'] || '').trim()
    const unidad = String(row['Unidad'] || '').trim()
    const cantidad = parseInt(row['Cantidad'] || 1) || 1

    // Leer precios y margen del Excel (margen como multiplicador: 1.15 = 15% ganancia)
    const precioListaExcel = parseFloat(row['P.Lista'] || row['Precio Lista'] || row['PrecioLista'] || 0) || undefined
    const precioRealExcel = parseFloat(row['P.Real'] || row['Precio Real'] || row['PrecioReal'] || row['P.Interno'] || 0) || undefined
    const margenExcel = parseFloat(row['Margen'] || row['Margen %'] || 0) || undefined

    // Validaciones básicas
    if (!codigo) {
      errores.push(`Fila ${fila}: El código es requerido`)
      continue
    }

    if (!descripcion) {
      errores.push(`Fila ${fila}: La descripción es requerida`)
      continue
    }

    if (cantidad <= 0) {
      errores.push(`Fila ${fila}: La cantidad debe ser mayor a 0`)
      continue
    }

    // Buscar en catálogo para heredar valores faltantes
    const catalogoEquipo = catalogoEquipos.find(
      eq => eq.codigo.toLowerCase() === codigo.toLowerCase()
    )

    // Determinar categoría final: Catálogo > Excel > Default
    const categoriaFinal = catalogoEquipo?.categoriaEquipo?.nombre || categoriaExcel || 'Sin categoría'

    // Validar que la categoría exista (si no viene del catálogo y se especificó una)
    if (!catalogoEquipo && categoriaExcel && categoriasValidas.length > 0) {
      if (!categoriasSet.has(categoriaExcel.toLowerCase().trim())) {
        errores.push(`Fila ${fila}: La categoría '${categoriaExcel}' no existe en el sistema`)
        continue
      }
    }

    // Determinar precio interno a usar (Excel tiene prioridad si está definido)
    const precioInternoExcel = precioRealExcel ?? 0
    const precioInternoCatalogo = catalogoEquipo?.precioInterno ?? 0

    // Si no hay precio en Excel, usar catálogo
    const precioInterno = precioInternoExcel > 0 ? precioInternoExcel : precioInternoCatalogo

    // margenExcel es multiplicador (1.15), convertir a decimal (0.15) para almacenar
    const margenExcelDecimal = margenExcel !== undefined ? (margenExcel - 1) : undefined
    const margenCatalogo = catalogoEquipo?.margen ?? 0.15
    const margen = margenExcelDecimal ?? margenCatalogo

    // Validar que tengamos precio interno
    if (precioInterno <= 0) {
      errores.push(`Fila ${fila}: El precio real (P.Real) es requerido y debe ser mayor a 0`)
      continue
    }

    // Determinar estado del catálogo y si hay conflicto de precios
    let catalogStatus: CatalogStatus = 'new'
    let catalogComparison: CatalogComparisonInfo | undefined = undefined
    let priceSource: PriceSource = 'excel'

    if (catalogoEquipo) {
      // Calcular diferencia de precio
      const priceDifference = precioInternoExcel > 0
        ? Math.round((precioInternoExcel - precioInternoCatalogo) * 100) / 100
        : 0
      const priceDifferencePercent = precioInternoCatalogo > 0
        ? Math.round((priceDifference / precioInternoCatalogo) * 10000) / 100
        : 0

      // Si hay precio en Excel y es diferente al catálogo
      if (precioInternoExcel > 0 && Math.abs(priceDifference) > PRICE_TOLERANCE) {
        catalogStatus = 'conflict'
        totalConflict++
        priceSource = 'excel' // Por defecto usar Excel, usuario puede cambiar
      } else {
        catalogStatus = 'match'
        totalMatch++
        // Si no hay precio en Excel, usar catálogo
        priceSource = precioInternoExcel > 0 ? 'excel' : 'catalog'
      }

      catalogComparison = {
        catalogoEquipoId: catalogoEquipo.id,
        catalogoPrecioInterno: precioInternoCatalogo,
        catalogoPrecioLista: catalogoEquipo.precioLista ?? undefined,
        catalogoMargen: margenCatalogo,
        catalogoUpdatedAt: catalogoEquipo.updatedAt,
        priceDifference,
        priceDifferencePercent
      }
    } else {
      catalogStatus = 'new'
      totalNew++
      priceSource = 'excel'
    }

    // Usar precio según priceSource para los cálculos
    const precioLista = precioListaExcel ?? catalogoEquipo?.precioLista ?? undefined

    // CALCULAR precioCliente = precioInterno × (1 + margen) = precioInterno × margenMultiplier
    // Mantener precisión completa para cálculo del total (como Excel)
    const precioClienteExact = precioInterno * (1 + margen)
    const precioCliente = Math.round(precioClienteExact * 100) / 100

    // Calcular costos - usar precioClienteExact para mantener precisión como Excel
    const costoInterno = Math.round(precioInterno * cantidad * 100) / 100
    const costoCliente = Math.round(precioClienteExact * cantidad * 100) / 100

    // Detectar si ya existe un item con el mismo código en la cotización
    const existingItem = existingItems.find(
      item => item.codigo.toLowerCase().trim() === codigo.toLowerCase().trim()
    )

    const importedItem: ImportedEquipoItem = {
      codigo,
      descripcion: catalogoEquipo?.descripcion || descripcion,
      categoria: categoriaFinal,
      unidad: catalogoEquipo?.unidad?.nombre || unidad,
      marca: catalogoEquipo?.marca || marca,
      cantidad,
      precioLista,
      precioInterno,
      margen,
      precioCliente,
      costoInterno,
      costoCliente,
      catalogoEquipoId: catalogoEquipo?.id,
      isUpdate: !!existingItem,
      existingItemId: existingItem?.id,
      // Nuevos campos
      catalogStatus,
      catalogComparison,
      priceSource
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

  return {
    itemsNuevos,
    itemsActualizar,
    itemsConflicto,
    errores,
    summary: {
      totalNew,
      totalMatch,
      totalConflict,
      totalUpdate: itemsActualizar.length
    }
  }
}

// Función auxiliar para recalcular precios cuando cambia priceSource
export function recalcularItemConPriceSource(
  item: ImportedEquipoItem,
  priceSource: PriceSource
): ImportedEquipoItem {
  let precioInterno = item.precioInterno
  let margen = item.margen

  if (priceSource === 'catalog' && item.catalogComparison) {
    precioInterno = item.catalogComparison.catalogoPrecioInterno
    margen = item.catalogComparison.catalogoMargen
  }
  // Para 'excel' y 'excel_update_catalog' usamos los valores originales del Excel

  const precioClienteExact = precioInterno * (1 + margen)
  const precioCliente = Math.round(precioClienteExact * 100) / 100
  const costoInterno = Math.round(precioInterno * item.cantidad * 100) / 100
  const costoCliente = Math.round(precioClienteExact * item.cantidad * 100) / 100

  return {
    ...item,
    precioInterno,
    margen,
    precioCliente,
    costoInterno,
    costoCliente,
    priceSource
  }
}
