// ===============================
// 📁 categoriaEquipoExcel.ts
// ===============================
import * as XLSX from 'xlsx'
import { CategoriaEquipo } from '@/types'

export function exportarCategoriasEquipoAExcel(categorias: CategoriaEquipo[]) {
  const data = categorias.map((c) => ({ Nombre: c.nombre }))
  const worksheet = XLSX.utils.json_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'CategoriasEquipo')
  XLSX.writeFile(workbook, 'categorias_equipo.xlsx')
}
