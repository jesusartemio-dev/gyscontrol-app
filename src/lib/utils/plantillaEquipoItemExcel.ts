// ===================================================
// Archivo: plantillaEquipoItemExcel.ts
// Ubicación: src/lib/utils/
// Descripción: Import/Export de items de equipo de plantilla desde/hacia Excel
// Autor: Jesús Artemio
// Última actualización: 2025-01-31
// ===================================================

import * as XLSX from 'xlsx'
import type { PlantillaEquipoItem, CatalogoEquipo } from '@/types'

// ============================================
// EXPORTAR A EXCEL
// ============================================
export function exportarPlantillaEquipoItemsAExcel(
  items: PlantillaEquipoItem[],
  nombreArchivo: string = 'EquiposPlantilla'
) {
  const data = items.map((item, idx) => {
    return {
      '#': idx + 1,
      'Código': item.codigo,
      'Descripción': item.descripcion,
      'Categoría': item.categoria || '',
      'Unidad': item.unidad || '',
      'Marca': item.marca || '',
      'Cantidad': item.cantidad || 1,
      'P.Lista': item.precioLista || 0,
      'Factor Costo': +(item.factorCosto ?? 1.00).toFixed(2),
      'Factor Venta': +(item.factorVenta ?? 1.15).toFixed(2),
      'P.Interno': item.precioInterno || 0,
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
    { wch: 12 },  // Factor Costo
    { wch: 12 },  // Factor Venta
    { wch: 12 },  // P.Interno
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
  const ejemplos = [
    {
      'Código': 'EQ-001',
      'Descripción': 'Sensor de temperatura PT100',
      'Marca': 'Siemens',
      'Categoría': 'Sensores',
      'Unidad': 'Unidad',
      'Cantidad': 2,
      'P.Lista': 120.00,
      'Factor Costo': 1.00,
      'Factor Venta': 1.15
    },
    {
      'Código': 'EQ-002',
      'Descripción': 'PLC Compacto S7-1200',
      'Marca': 'Siemens',
      'Categoría': 'Controladores',
      'Unidad': 'Unidad',
      'Cantidad': 1,
      'P.Lista': 700.00,
      'Factor Costo': 1.00,
      'Factor Venta': 1.15
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
    { wch: 12 },  // Factor Costo
    { wch: 12 },  // Factor Venta
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
export interface ImportedPlantillaEquipoItem {
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
  // Para detectar si es actualización
  isUpdate: boolean
  existingItemId?: string
}

export interface ExistingPlantillaEquipoItem {
  id: string
  codigo: string
}

export interface PlantillaEquipoImportValidationResult {
  itemsNuevos: ImportedPlantillaEquipoItem[]
  itemsActualizar: ImportedPlantillaEquipoItem[]
  errores: string[]
}

// ============================================
// VALIDAR E IMPORTAR
// ============================================
export function validarEImportarPlantillaEquipoItems(
  rows: any[],
  catalogoEquipos: CatalogoEquipo[],
  existingItems: ExistingPlantillaEquipoItem[] = []
): PlantillaEquipoImportValidationResult {
  const errores: string[] = []
  const itemsNuevos: ImportedPlantillaEquipoItem[] = []
  const itemsActualizar: ImportedPlantillaEquipoItem[] = []

  for (let [index, row] of rows.entries()) {
    const fila = index + 2 // +2 porque fila 1 es header

    const codigo = String(row['Código'] || row['Codigo'] || '').trim()
    const descripcion = String(row['Descripción'] || row['Descripcion'] || '').trim()
    const marca = String(row['Marca'] || '').trim()
    const categoria = String(row['Categoría'] || row['Categoria'] || '').trim()
    const unidad = String(row['Unidad'] || '').trim()
    const cantidad = parseInt(row['Cantidad'] || 1) || 1

    // Leer P.Lista, F.Costo, F.Venta del Excel
    const precioListaExcel = parseFloat(row['P.Lista'] || row['Precio Lista'] || row['PrecioLista'] || 0) || undefined
    const factorCostoExcel = parseFloat(row['F.Costo'] || row['Factor Costo'] || 0) || undefined
    const factorVentaExcel = parseFloat(row['F.Venta'] || row['Factor Venta'] || 0) || undefined

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

    // Prioridad: Excel > Catálogo > Default
    const precioLista = precioListaExcel ?? catalogoEquipo?.precioLista ?? 0
    const factorCosto = factorCostoExcel ?? catalogoEquipo?.factorCosto ?? 1.00
    const factorVenta = factorVentaExcel ?? catalogoEquipo?.factorVenta ?? 1.15

    // Validar que tengamos precio lista
    if (precioLista <= 0) {
      errores.push(`Fila ${fila}: El precio lista (P.Lista) es requerido y debe ser mayor a 0`)
      continue
    }

    // Calcular precios
    const precioInterno = Math.round(precioLista * factorCosto * 100) / 100
    const precioCliente = Math.round(precioInterno * factorVenta * 100) / 100

    // Calcular costos
    const costoInterno = Math.round(precioInterno * cantidad * 100) / 100
    const costoCliente = Math.round(precioCliente * cantidad * 100) / 100

    // Detectar si ya existe un item con el mismo código
    const existingItem = existingItems.find(
      item => item.codigo.toLowerCase().trim() === codigo.toLowerCase().trim()
    )

    const importedItem: ImportedPlantillaEquipoItem = {
      codigo,
      descripcion: catalogoEquipo?.descripcion || descripcion,
      categoria: catalogoEquipo?.categoriaEquipo?.nombre || categoria,
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
      existingItemId: existingItem?.id
    }

    if (existingItem) {
      itemsActualizar.push(importedItem)
    } else {
      itemsNuevos.push(importedItem)
    }
  }

  return { itemsNuevos, itemsActualizar, errores }
}
