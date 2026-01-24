// ===================================================
// 📁 Archivo: listaEquipoExcel.ts
// 📌 Ubicación: src/lib/utils/
// 🔧 Descripción: Utilidades para exportar listas de equipos a Excel
// ===================================================

import * as XLSX from 'xlsx'
import type { ListaEquipoItem } from '@/types/modelos'

/**
 * Exporta una lista de equipos a un archivo Excel (solo campos importables)
 */
export function exportarListaEquipoAExcel(
  items: ListaEquipoItem[],
  nombreLista: string,
  codigoLista?: string
): void {
  try {
    // Preparar datos para Excel (solo campos que se pueden importar)
    const datosExcel = items.map(item => {
      // Extraer categoría del comentarioRevision si tiene el prefijo CATEGORIA:
      let categoria = ''
      if (item.comentarioRevision && item.comentarioRevision.startsWith('CATEGORIA:')) {
        categoria = item.comentarioRevision.replace('CATEGORIA:', '').trim()
        console.log(`📊 Exportando item ${item.codigo}: categoria de comentarioRevision: "${categoria}"`)
      } else if (item.catalogoEquipo?.categoriaEquipo?.nombre) {
        categoria = item.catalogoEquipo.categoriaEquipo.nombre
        console.log(`📊 Exportando item ${item.codigo}: categoria de catalogoEquipo: "${categoria}"`)
      } else {
        categoria = 'SIN-CATEGORIA' // En vez de vacío, exportar con la categoría por defecto
        console.log(`📊 Exportando item ${item.codigo}: sin categoria, usando SIN-CATEGORIA`)
      }

      return {
        'Código': item.codigo,
        'Descripción': item.descripcion,
        'Categoría': categoria,
        'Unidad': item.unidad,
        'Marca': item.catalogoEquipo?.marca || '', // Obtener marca del catálogo si existe
        'Cantidad': item.cantidad
      }
    })

    // Crear libro de trabajo
    const wb = XLSX.utils.book_new()

    // Crear hoja de trabajo
    const ws = XLSX.utils.json_to_sheet(datosExcel)

    // Configurar ancho de columnas
    const colWidths = [
      { wch: 15 }, // Código
      { wch: 40 }, // Descripción
      { wch: 20 }, // Categoría
      { wch: 10 }, // Unidad
      { wch: 15 }, // Marca
      { wch: 10 }  // Cantidad
    ]
    ws['!cols'] = colWidths

    // Agregar hoja al libro
    const nombreHoja = nombreLista.length > 31 ? nombreLista.substring(0, 31) : nombreLista
    XLSX.utils.book_append_sheet(wb, ws, nombreHoja)

    // Generar nombre de archivo con código de lista y fecha
    const timestamp = new Date().toISOString().split('T')[0] // YYYY-MM-DD
    const codigoFormateado = codigoLista || 'SIN-CODIGO'
    const nombreArchivo = `${codigoFormateado}_${timestamp}.xlsx`

    // Descargar archivo
    XLSX.writeFile(wb, nombreArchivo)

  } catch (error) {
    console.error('Error exportando lista de equipos a Excel:', error)
    throw new Error('Error al exportar la lista de equipos a Excel')
  }
}