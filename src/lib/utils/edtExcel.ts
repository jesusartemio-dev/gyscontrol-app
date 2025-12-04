// ===================================================
// 📁 edtExcel.ts
// 📌 Ubicación: src/lib/utils/
// 🔧 Utilidades para exportar EDTs a Excel
//
// 🧠 Uso: Exportar datos de EDTs a formato Excel
// ✍️ Autor: Jesús Artemio (Master Experto 🧙‍♂️)
// 📅 Creación: 2025-10-15
// ===================================================

import * as XLSX from 'xlsx'
import type { Edt } from '@/types'

/**
 * Exporta EDTs a un archivo Excel
 */
export function exportarEdtsAExcel(edts: Edt[]): void {
  try {
    // Preparar datos para Excel
    const datosExcel = edts.map(edt => ({
      'ID': edt.id,
      'Nombre': edt.nombre,
      'Descripción': edt.descripcion || '',
      'Fase por Defecto': edt.faseDefault?.nombre || 'Sin asignar',
      'Fecha de Creación': new Date(edt.createdAt).toLocaleDateString('es-ES'),
      'Última Actualización': new Date(edt.updatedAt).toLocaleDateString('es-ES')
    }))

    // Crear libro de trabajo
    const wb = XLSX.utils.book_new()

    // Crear hoja de trabajo
    const ws = XLSX.utils.json_to_sheet(datosExcel)

    // Ajustar ancho de columnas
    const colWidths = [
      { wch: 36 }, // ID
      { wch: 30 }, // Nombre
      { wch: 50 }, // Descripción
      { wch: 20 }, // Fase por Defecto
      { wch: 15 }, // Fecha de Creación
      { wch: 15 }  // Última Actualización
    ]
    ws['!cols'] = colWidths

    // Agregar hoja al libro
    XLSX.utils.book_append_sheet(wb, ws, 'EDTs')

    // Generar nombre de archivo con timestamp
    const timestamp = new Date().toISOString().split('T')[0]
    const nombreArchivo = `edts_${timestamp}.xlsx`

    // Descargar archivo
    XLSX.writeFile(wb, nombreArchivo)

  } catch (error) {
    console.error('Error al exportar EDTs a Excel:', error)
    throw new Error('Error al exportar EDTs a Excel')
  }
}