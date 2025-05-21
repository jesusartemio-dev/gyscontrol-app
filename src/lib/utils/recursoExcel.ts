// ===============================
// 📁 recursoExcel.ts
// ===============================
import * as XLSX from 'xlsx'
import { Recurso } from '@/types'

export function exportarRecursosAExcel(recursos: Recurso[]) {
  const data = recursos.map((r) => ({ Nombre: r.nombre, 'Costo Hora': r.costoHora }))
  const worksheet = XLSX.utils.json_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Recursos')
  XLSX.writeFile(workbook, 'recursos.xlsx')
}
