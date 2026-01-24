// ===============================
// 📁 edtExcel.ts
// ===============================
import * as XLSX from 'xlsx'
import { Edt } from '@/types'

export function exportarEdtsAExcel(edts: Edt[]) {
  const data = edts.map((e) => ({
    Nombre: e.nombre,
    Descripcion: e.descripcion || '',
    FasePorDefecto: e.faseDefault?.nombre || ''
  }))
  const worksheet = XLSX.utils.json_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'EDTs')
  XLSX.writeFile(workbook, 'edts.xlsx')
}
