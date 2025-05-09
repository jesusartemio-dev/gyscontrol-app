// ===================================================
// 📁 Archivo: serviciosExcel.ts
// 🔹 Ubicación: src/lib/utils/
// 🔧 Descripción: Exportación de servicios del catálogo a Excel (.xlsx)
// 🧐 Uso: Usado en la página de Catálogo de Servicios para exportación.
// 👩‍💻 Autor: Jesús Artemio
// 🗓️ Última actualización: 2025-04-26
// ===================================================

import * as XLSX from 'xlsx'
import { CatalogoServicio } from '@/types'

export async function exportarServiciosAExcel(servicios: CatalogoServicio[]) {
  const data = servicios.map(servicio => ({
    Nombre: servicio.nombre,
    Descripción: servicio.descripcion,
    Fórmula: servicio.formula,
    HoraBase: servicio.horaBase || 0,
    HoraRepetido: servicio.horaRepetido || 0,
    HoraUnidad: servicio.horaUnidad || 0,
    HoraFijo: servicio.horaFijo || 0,
    Categoría: servicio.categoria?.nombre || '',
    UnidadServicio: servicio.unidadServicio?.nombre || '',
    Recurso: servicio.recurso?.nombre || '',
    CostoHora: servicio.recurso?.costoHora || 0
  }))

  const worksheet = XLSX.utils.json_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Servicios')

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([excelBuffer], { type: 'application/octet-stream' })

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'CatalogoServicios.xlsx'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
