// ===============================
// 📁 categoriaCondicionExcel.ts
// ===============================
import * as XLSX from 'xlsx'
import type { CategoriaCondicion } from '@/lib/services/catalogoCondicion'

export function exportarCategoriasCondicionAExcel(categorias: CategoriaCondicion[]) {
  const data = categorias.map((c) => ({
    Nombre: c.nombre,
    Descripcion: c.descripcion || ''
  }))
  const worksheet = XLSX.utils.json_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'CategoriasCondicion')
  XLSX.writeFile(workbook, 'categorias_condicion.xlsx')
}
