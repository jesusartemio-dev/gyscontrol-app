// ===============================
// 📁 categoriaExclusionExcel.ts
// ===============================
import * as XLSX from 'xlsx'
import type { CategoriaExclusion } from '@/lib/services/catalogoExclusion'

export function exportarCategoriasExclusionAExcel(categorias: CategoriaExclusion[]) {
  const data = categorias.map((c) => ({
    Nombre: c.nombre,
    Descripcion: c.descripcion || ''
  }))
  const worksheet = XLSX.utils.json_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'CategoriasExclusion')
  XLSX.writeFile(workbook, 'categorias_exclusion.xlsx')
}
