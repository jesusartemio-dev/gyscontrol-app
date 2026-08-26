// ===============================
// 📁 cotizacionListExcel.ts
// 🔧 Exporta el listado de cotizaciones (comercial/cotizaciones) a Excel
// ===============================
import * as XLSX from 'xlsx'
import type { Cotizacion } from '@/types'
import { penToUSD } from '@/lib/costos'

export function exportarCotizacionesAExcel(cotizaciones: Cotizacion[]) {
  const data = cotizaciones.map((c) => {
    const totalClienteUSD =
      c.moneda === 'PEN' && c.tipoCambio ? penToUSD(c.totalCliente || 0, c.tipoCambio) : c.totalCliente || 0

    return {
      Código: c.codigo || '',
      Nombre: c.nombre || '',
      Cliente: c.cliente?.nombre || '',
      Comercial: c.comercial?.nombre || '',
      Estado: c.estado || '',
      Moneda: c.moneda || 'USD',
      'Total Cliente': c.totalCliente || 0,
      'Total Cliente (USD)': Number(totalClienteUSD.toFixed(2)),
      Fecha: c.fecha ? new Date(c.fecha).toLocaleDateString('es-PE') : '',
      'Fecha Envío': c.fechaEnvio ? new Date(c.fechaEnvio).toLocaleDateString('es-PE') : '',
    }
  })

  const worksheet = XLSX.utils.json_to_sheet(data)

  worksheet['!cols'] = [
    { wch: 14 }, // Código
    { wch: 35 }, // Nombre
    { wch: 30 }, // Cliente
    { wch: 20 }, // Comercial
    { wch: 12 }, // Estado
    { wch: 8 },  // Moneda
    { wch: 16 }, // Total Cliente
    { wch: 18 }, // Total Cliente (USD)
    { wch: 12 }, // Fecha
    { wch: 12 }, // Fecha Envío
  ]

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Cotizaciones')

  const timestamp = new Date().toISOString().split('T')[0]
  XLSX.writeFile(workbook, `cotizaciones_${timestamp}.xlsx`)
}
