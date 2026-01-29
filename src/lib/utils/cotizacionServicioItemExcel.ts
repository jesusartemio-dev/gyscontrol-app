// ===================================================
// Archivo: cotizacionServicioItemExcel.ts
// Ubicación: src/lib/utils/
// Descripción: Import/Export de items de servicio de cotización desde/hacia Excel
// Autor: Jesús Artemio
// Última actualización: 2025-01-29
// ===================================================

import * as XLSX from 'xlsx'
import type { CotizacionServicioItem, Recurso, UnidadServicio } from '@/types'

// ============================================
// EXPORTAR A EXCEL
// ============================================
export function exportarCotizacionServicioItemsAExcel(
  items: CotizacionServicioItem[],
  nombreArchivo: string = 'ServiciosCotizacion'
) {
  const data = items.map((item, idx) => ({
    '#': idx + 1,
    'Nombre': item.nombre,
    'Descripción': item.descripcion || '',
    'Recurso': item.recursoNombre || '',
    'Unidad': item.unidadServicioNombre || '',
    'Cantidad': item.cantidad || 1,
    'HH Base': item.horaBase || 0,
    'HH Repetido': item.horaRepetido || 0,
    'HH Total': item.horaTotal || 0,
    'Factor Seg.': item.factorSeguridad || 1,
    'Dificultad': item.nivelDificultad || 1,
    'Margen': item.margen || 1.35,
    '$/Hora': item.costoHora || 0,
    'Costo Interno': item.costoInterno || 0,
    'Precio Cliente': item.costoCliente || 0
  }))

  const worksheet = XLSX.utils.json_to_sheet(data)

  // Ajustar anchos de columna
  worksheet['!cols'] = [
    { wch: 4 },   // #
    { wch: 35 },  // Nombre
    { wch: 40 },  // Descripción
    { wch: 18 },  // Recurso
    { wch: 10 },  // Unidad
    { wch: 8 },   // Cantidad
    { wch: 10 },  // HH Base
    { wch: 12 },  // HH Repetido
    { wch: 10 },  // HH Total
    { wch: 10 },  // Factor Seg.
    { wch: 10 },  // Dificultad
    { wch: 8 },   // Margen
    { wch: 10 },  // $/Hora
    { wch: 14 },  // Costo Interno
    { wch: 14 },  // Precio Cliente
  ]

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Servicios')

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
export function generarPlantillaImportacion(nombreArchivo: string = 'PlantillaServicios') {
  const ejemplos = [
    {
      'Nombre': 'Configuración de PLC',
      'Descripción': 'Programación y puesta en marcha',
      'Recurso': 'Ingeniero Senior',
      'Unidad': 'hora',
      'Precio Cliente': 1500,
      'Factor Seg.': 1.0,
      'Dificultad': 1,
      'Margen': 1.35
    },
    {
      'Nombre': 'Instalación de sensores',
      'Descripción': 'Instalación y calibración',
      'Recurso': 'Técnico',
      'Unidad': 'hora',
      'Precio Cliente': 800,
      'Factor Seg.': 1.0,
      'Dificultad': 2,
      'Margen': 1.35
    }
  ]

  const worksheet = XLSX.utils.json_to_sheet(ejemplos)

  worksheet['!cols'] = [
    { wch: 35 },  // Nombre
    { wch: 40 },  // Descripción
    { wch: 18 },  // Recurso
    { wch: 10 },  // Unidad
    { wch: 14 },  // Precio Cliente
    { wch: 10 },  // Factor Seg.
    { wch: 10 },  // Dificultad
    { wch: 8 },   // Margen
  ]

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Servicios')

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
export async function leerExcelServicioItems(file: File): Promise<any[]> {
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
// VALIDAR E IMPORTAR CON FÓRMULA INVERSA
// ============================================
export interface ImportedServiceItem {
  nombre: string
  descripcion: string
  recursoId: string
  recursoNombre: string
  unidadServicioId: string
  unidadServicioNombre: string
  costoHora: number
  precioCliente: number
  factorSeguridad: number
  nivelDificultad: number
  margen: number
  // Calculados con fórmula inversa
  horaTotal: number
  costoInterno: number
}

export interface ImportValidationResult {
  itemsValidos: ImportedServiceItem[]
  errores: string[]
}

export function validarEImportarServicioItems(
  rows: any[],
  recursos: Recurso[],
  unidades: UnidadServicio[]
): ImportValidationResult {
  const errores: string[] = []
  const itemsValidos: ImportedServiceItem[] = []

  const dificultadMultipliers: Record<number, number> = {
    1: 1.0,
    2: 1.2,
    3: 1.5,
    4: 2.0
  }

  for (let [index, row] of rows.entries()) {
    const fila = index + 2 // +2 porque fila 1 es header

    // Leer campos
    const nombre = String(row['Nombre'] || '').trim()
    const descripcion = String(row['Descripción'] || row['Descripcion'] || '').trim()
    const recursoNombre = String(row['Recurso'] || '').trim()
    const unidadNombre = String(row['Unidad'] || '').trim()
    const precioCliente = parseFloat(row['Precio Cliente'] || row['PrecioCliente'] || 0)
    const factorSeguridad = parseFloat(row['Factor Seg.'] || row['FactorSeg'] || row['Factor'] || 1) || 1
    const nivelDificultad = parseInt(row['Dificultad'] || 1) || 1
    const margen = parseFloat(row['Margen'] || 1.35) || 1.35

    // Validaciones
    if (!nombre) {
      errores.push(`Fila ${fila}: El nombre es requerido`)
      continue
    }

    const recurso = recursos.find(r =>
      r.nombre.toLowerCase() === recursoNombre.toLowerCase()
    )
    if (!recurso) {
      errores.push(`Fila ${fila}: Recurso "${recursoNombre}" no encontrado`)
      continue
    }

    const unidad = unidades.find(u =>
      u.nombre.toLowerCase() === unidadNombre.toLowerCase()
    )
    if (!unidad) {
      errores.push(`Fila ${fila}: Unidad "${unidadNombre}" no encontrada`)
      continue
    }

    if (precioCliente <= 0) {
      errores.push(`Fila ${fila}: El precio cliente debe ser mayor a 0`)
      continue
    }

    if (nivelDificultad < 1 || nivelDificultad > 4) {
      errores.push(`Fila ${fila}: La dificultad debe estar entre 1 y 4`)
      continue
    }

    // FÓRMULA INVERSA: Precio Cliente → Horas
    // costoCliente = horaTotal × costoHora × factorSeguridad × dificultadMultiplier × margen
    // horaTotal = costoCliente / (costoHora × factorSeguridad × dificultadMultiplier × margen)
    const costoHora = recurso.costoHora
    const dificultadMultiplier = dificultadMultipliers[nivelDificultad] || 1.0
    const divisor = costoHora * factorSeguridad * dificultadMultiplier * margen

    if (divisor <= 0) {
      errores.push(`Fila ${fila}: No se puede calcular horas (costo/hora del recurso es 0)`)
      continue
    }

    const horaTotal = Math.round((precioCliente / divisor) * 100) / 100
    const costoInterno = Math.round((horaTotal * costoHora * factorSeguridad * dificultadMultiplier) * 100) / 100

    itemsValidos.push({
      nombre,
      descripcion,
      recursoId: recurso.id,
      recursoNombre: recurso.nombre,
      unidadServicioId: unidad.id,
      unidadServicioNombre: unidad.nombre,
      costoHora,
      precioCliente: Math.round(precioCliente * 100) / 100,
      factorSeguridad,
      nivelDificultad,
      margen,
      horaTotal,
      costoInterno
    })
  }

  return { itemsValidos, errores }
}
