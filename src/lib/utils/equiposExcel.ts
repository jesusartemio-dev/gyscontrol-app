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
