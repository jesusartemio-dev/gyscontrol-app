// ===================================================
// 📁 Archivo: equiposExcel.ts
// 📌 Ubicación: src/lib/utils/equiposExcel.ts
// 🔧 Descripción: Exportar catálogo de equipos y leer datos crudos desde Excel.
// 🧠 Uso: Exportación limpia e importación inicial de datos crudos.
// ✍️ Autor: Jesús Artemio
// 📅 Última actualización: 2025-04-25
// ===================================================

import * as XLSX from 'xlsx'
import { CatalogoEquipo } from '@/types'

// 📤 Exportar equipos a Excel (solo campos visibles)
export function exportarEquiposAExcel(equipos: CatalogoEquipo[]) {
  const data = equipos.map(eq => ({
    Código: eq.codigo,
    Descripción: eq.descripcion,
    Categoría: eq.categoriaEquipo?.nombre ?? '',
    Unidad: eq.unidad?.nombre ?? '',
    Marca: eq.marca,
    PrecioInterno: eq.precioInterno
  }))

  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Equipos')

  XLSX.writeFile(wb, 'catalogo_equipos.xlsx')
}

// 📥 Descargar plantilla para importación de catálogo de equipos
export async function descargarPlantillaCatalogoEquipo() {
  const ExcelJS = (await import('exceljs')).default

  const [catRes, uniRes] = await Promise.all([
    fetch('/api/categoria-equipo'),
    fetch('/api/unidad'),
  ])
  const categorias: Array<{ nombre: string; descripcion?: string }> = catRes.ok ? await catRes.json() : []
  const unidades: Array<{ nombre: string }> = uniRes.ok ? await uniRes.json() : []

  const wb = new ExcelJS.Workbook()

  // --- Hoja 1: Plantilla ---
  const wsPlantilla = wb.addWorksheet('Plantilla')
  wsPlantilla.columns = [
    { header: 'Código',      key: 'codigo',      width: 16 },
    { header: 'Descripción', key: 'descripcion', width: 35 },
    { header: 'Categoría',   key: 'categoria',   width: 22 },
    { header: 'Unidad',      key: 'unidad',      width: 12 },
    { header: 'Marca',       key: 'marca',       width: 15 },
    { header: 'PrecioLista', key: 'precioLista', width: 12 },
  ]
  wsPlantilla.getRow(1).font = { bold: true }
  wsPlantilla.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } }
  wsPlantilla.addRow({ codigo: 'EQ-001', descripcion: 'Ejemplo Equipo Eléctrico', categoria: categorias[0]?.nombre || 'ELÉCTRICOS', unidad: unidades[0]?.nombre || 'UND', marca: 'Siemens', precioLista: 0 })
  wsPlantilla.addRow({ codigo: 'EQ-002', descripcion: 'Ejemplo Equipo Mecánico',  categoria: categorias[1]?.nombre || 'MECÁNICOS',  unidad: unidades[1]?.nombre || 'KG',  marca: 'ABB',     precioLista: 0 })

  // --- Hoja 2: Categorias (visible, con descripción) ---
  const wsCategorias = wb.addWorksheet('Categorias')
  wsCategorias.columns = [
    { header: 'Categoría',   key: 'nombre',      width: 25 },
    { header: 'Descripción', key: 'descripcion', width: 70 },
  ]
  wsCategorias.getRow(1).font = { bold: true }
  wsCategorias.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } }
  for (const cat of categorias) {
    wsCategorias.addRow({ nombre: cat.nombre, descripcion: cat.descripcion || '' })
  }

  // --- Hoja 3: Unidades (visible) ---
  const wsUnidades = wb.addWorksheet('Unidades')
  wsUnidades.columns = [{ header: 'Unidad', key: 'nombre', width: 15 }]
  wsUnidades.getRow(1).font = { bold: true }
  wsUnidades.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } }
  for (const uni of unidades) {
    wsUnidades.addRow({ nombre: uni.nombre })
  }

  // --- Validaciones dropdown en Plantilla ---
  if (categorias.length > 0) {
    for (let row = 2; row <= 500; row++) {
      wsPlantilla.getCell(`C${row}`).dataValidation = {
        type: 'list', allowBlank: true,
        formulae: [`Categorias!$A$2:$A$${categorias.length + 1}`],
        showErrorMessage: true,
        errorTitle: 'Categoría inválida',
        error: 'Selecciona una categoría de la hoja "Categorias"',
      }
    }
  }
  if (unidades.length > 0) {
    for (let row = 2; row <= 500; row++) {
      wsPlantilla.getCell(`D${row}`).dataValidation = {
        type: 'list', allowBlank: true,
        formulae: [`Unidades!$A$2:$A$${unidades.length + 1}`],
        showErrorMessage: true,
        errorTitle: 'Unidad inválida',
        error: 'Selecciona una unidad de la hoja "Unidades"',
      }
    }
  }

  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'plantilla_catalogo_equipos.xlsx'
  a.click()
  URL.revokeObjectURL(url)
}

// 📥 Leer datos crudos desde Excel
export async function importarEquiposDesdeExcel(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer)
      const workbook = XLSX.read(data, { type: 'array' })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const json = XLSX.utils.sheet_to_json(sheet)
      resolve(json as any[])
    }
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })
}
