// ===============================
// 📁 unidadExcel.ts
// ===============================
import * as XLSX from 'xlsx'
import { Unidad } from '@/types'

export function exportarUnidadesAExcel(unidades: Unidad[]) {
  const data = unidades.map((u) => ({ Nombre: u.nombre }))
  const worksheet = XLSX.utils.json_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Unidades')
  XLSX.writeFile(workbook, 'unidades.xlsx')
}
