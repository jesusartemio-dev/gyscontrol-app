// ===============================
// 📁 categoriaServicioExcel.ts
// ===============================
import * as XLSX from 'xlsx'
import { CategoriaServicio } from '@/types'

export function exportarCategoriasServicioAExcel(categorias: CategoriaServicio[]) {
  const data = categorias.map((c) => ({
    Nombre: c.nombre,
    Descripcion: c.descripcion || '',
    FasePorDefecto: c.faseDefault?.nombre || ''
  }))
  const worksheet = XLSX.utils.json_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'CategoriasServicio')
  XLSX.writeFile(workbook, 'categorias_servicio.xlsx')
}
