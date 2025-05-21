// ===============================
// 📁 unidadServicioExcel.ts
// ===============================
import * as XLSX from 'xlsx'
import { UnidadServicio } from '@/types'

export function exportarUnidadesServicioAExcel(unidades: UnidadServicio[]) {
  const data = unidades.map((u) => ({ Nombre: u.nombre }))
  const worksheet = XLSX.utils.json_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'UnidadesServicio')
  XLSX.writeFile(workbook, 'unidades_servicio.xlsx')
}