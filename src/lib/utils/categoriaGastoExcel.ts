// ===============================
// 📁 categoriaGastoExcel.ts
// ===============================
import * as XLSX from 'xlsx'
import { CategoriaGasto } from '@/types'

export function exportarCategoriasGastoAExcel(categorias: CategoriaGasto[]) {
  const data = categorias.map((c) => ({
    Nombre: c.nombre,
    Descripcion: c.descripcion || ''
  }))
  const worksheet = XLSX.utils.json_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'CategoriasGasto')
  XLSX.writeFile(workbook, 'categorias_gasto.xlsx')
}
