// ================================
// 📁 faseExcel.ts
// ================================
import * as XLSX from 'xlsx'
import { FaseDefault } from '@/types'

export function exportarFasesAExcel(fases: FaseDefault[]) {
  const data = fases.map((f) => ({
    Nombre: f.nombre,
    Descripcion: f.descripcion || '',
    Orden: f.orden,
    'Duracion Dias': f.duracionDias || 0,
    Color: f.color || '#3b82f6',
    Activo: f.activo ? 'Sí' : 'No'
  }))
  const worksheet = XLSX.utils.json_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Fases')
  XLSX.writeFile(workbook, 'fases.xlsx')
}