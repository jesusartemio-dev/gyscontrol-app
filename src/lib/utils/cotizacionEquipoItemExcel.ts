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
  const data = items.map((item, idx) => ({
    '#': idx + 1,
    'Código': item.codigo,
    'Descripción': item.descripcion,
    'Categoría': item.categoria || '',
    'Unidad': item.unidad || '',
    'Marca': item.marca || '',
    'Cantidad': item.cantidad || 1,
    'Precio Interno': item.precioInterno || 0,
    'Precio Cliente': item.precioCliente || 0,
    'Costo Interno': item.costoInterno || 0,
    'Costo Cliente': item.costoCliente || 0
  }))

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
    { wch: 14 },  // Precio Interno
    { wch: 14 },  // Precio Cliente
    { wch: 14 },  // Costo Interno
    { wch: 14 },  // Costo Cliente
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
      'Categoría': 'Sensores',
      'Unidad': 'Unidad',
      'Marca': 'Siemens',
      'Cantidad': 2,
      'Precio Cliente': 150.00
    },
    {
      'Código': 'EQ-002',
      'Descripción': 'PLC Compacto S7-1200',
      'Categoría': 'Controladores',
      'Unidad': 'Unidad',
      'Marca': 'Siemens',
      'Cantidad': 1,
      'Precio Cliente': 850.00
    }
  ]

  const worksheet = XLSX.utils.json_to_sheet(ejemplos)

  worksheet['!cols'] = [
    { wch: 15 },  // Código
    { wch: 40 },  // Descripción
    { wch: 18 },  // Categoría
    { wch: 10 },  // Unidad
    { wch: 15 },  // Marca
    { wch: 10 },  // Cantidad
    { wch: 14 },  // Precio Cliente
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
export interface ImportedEquipoItem {
  codigo: string
  descripcion: string
  categoria: string
  unidad: string
  marca: string
  cantidad: number
  precioInterno: number
  precioCliente: number
  costoInterno: number
  costoCliente: number
  // Para catálogo
  catalogoEquipoId?: string
  // Para detectar si es actualización
  isUpdate: boolean
  existingItemId?: string
}

export interface ExistingEquipoItem {
  id: string
  codigo: string
}

export interface EquipoImportValidationResult {
  itemsNuevos: ImportedEquipoItem[]
  itemsActualizar: ImportedEquipoItem[]
  errores: string[]
}

// ============================================
// VALIDAR E IMPORTAR
// ============================================
export function validarEImportarEquipoItems(
  rows: any[],
  catalogoEquipos: CatalogoEquipo[],
  existingItems: ExistingEquipoItem[] = []
): EquipoImportValidationResult {
  const errores: string[] = []
  const itemsNuevos: ImportedEquipoItem[] = []
  const itemsActualizar: ImportedEquipoItem[] = []

  for (let [index, row] of rows.entries()) {
    const fila = index + 2 // +2 porque fila 1 es header

    // Leer campos
    const codigo = String(row['Código'] || row['Codigo'] || '').trim()
    const descripcion = String(row['Descripción'] || row['Descripcion'] || '').trim()
    const categoria = String(row['Categoría'] || row['Categoria'] || '').trim()
    const unidad = String(row['Unidad'] || '').trim()
    const marca = String(row['Marca'] || '').trim()
    const cantidad = parseInt(row['Cantidad'] || 1) || 1
    const precioCliente = parseFloat(row['Precio Cliente'] || row['PrecioCliente'] || 0) || 0

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

    if (precioCliente <= 0) {
      errores.push(`Fila ${fila}: El precio cliente debe ser mayor a 0`)
      continue
    }

    // Buscar en catálogo para obtener precio interno
    const catalogoEquipo = catalogoEquipos.find(
      eq => eq.codigo.toLowerCase() === codigo.toLowerCase()
    )

    // Usar precio interno del catálogo si existe, sino usar un margen estimado
    const precioInterno = catalogoEquipo?.precioInterno || Math.round(precioCliente * 0.7 * 100) / 100

    // Calcular costos
    const costoInterno = Math.round(precioInterno * cantidad * 100) / 100
    const costoCliente = Math.round(precioCliente * cantidad * 100) / 100

    // Detectar si ya existe un item con el mismo código
    const existingItem = existingItems.find(
      item => item.codigo.toLowerCase().trim() === codigo.toLowerCase().trim()
    )

    const importedItem: ImportedEquipoItem = {
      codigo,
      descripcion: catalogoEquipo?.descripcion || descripcion,
      categoria: catalogoEquipo?.categoriaEquipo?.nombre || categoria,
      unidad: catalogoEquipo?.unidad?.nombre || unidad,
      marca: catalogoEquipo?.marca || marca,
      cantidad,
      precioInterno,
      precioCliente: Math.round(precioCliente * 100) / 100,
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
