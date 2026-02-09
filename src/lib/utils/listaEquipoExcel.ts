// ===================================================
// Archivo: listaEquipoExcel.ts
// Ubicación: src/lib/utils/
// Descripción: Utilidades para exportar listas de equipos a Excel
// ===================================================

import type { ListaEquipoItem } from '@/types/modelos'
import { getCategoriasEquipo } from '@/lib/services/categoriaEquipo'
import { getUnidades } from '@/lib/services/unidad'

/**
 * Exporta una lista de equipos a un archivo Excel con hojas de Categorías/Unidades y dropdowns
 */
export async function exportarListaEquipoAExcel(
  items: ListaEquipoItem[],
  nombreLista: string,
  codigoLista?: string
): Promise<void> {
  try {
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
    const nombreHoja = nombreLista.length > 31 ? nombreLista.substring(0, 31) : nombreLista
    const wsEquipos = wb.addWorksheet(nombreHoja)
    wsEquipos.columns = [
      { header: 'Código', key: 'codigo', width: 15 },
      { header: 'Descripción', key: 'descripcion', width: 40 },
      { header: 'Categoría', key: 'categoria', width: 20 },
      { header: 'Unidad', key: 'unidad', width: 10 },
      { header: 'Marca', key: 'marca', width: 15 },
      { header: 'Cantidad', key: 'cantidad', width: 10 },
    ]
    wsEquipos.getRow(1).font = { bold: true }
    wsEquipos.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } }

    for (const item of items) {
      const categoria = (item.categoria && item.categoria !== 'SIN-CATEGORIA')
        ? item.categoria
        : item.catalogoEquipo?.categoriaEquipo?.nombre || 'SIN-CATEGORIA'
      const marca = (item as any).marca || item.catalogoEquipo?.marca || ''

      wsEquipos.addRow({
        codigo: item.codigo,
        descripcion: item.descripcion,
        categoria,
        unidad: item.unidad,
        marca,
        cantidad: item.cantidad,
      })
    }

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
    const lastDataRow = items.length + 1
    const maxRow = Math.max(lastDataRow + 50, 100)

    if (categorias.length > 0) {
      for (let row = 2; row <= maxRow; row++) {
        wsEquipos.getCell(`C${row}`).dataValidation = {
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
        wsEquipos.getCell(`D${row}`).dataValidation = {
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
    const timestamp = new Date().toISOString().split('T')[0]
    const codigoFormateado = codigoLista || 'SIN-CODIGO'
    const nombreArchivo = `${codigoFormateado}_${timestamp}.xlsx`

    const buffer = await wb.xlsx.writeBuffer()
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = nombreArchivo
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

  } catch (error) {
    console.error('Error exportando lista de equipos a Excel:', error)
    throw new Error('Error al exportar la lista de equipos a Excel')
  }
}
