// ===============================
// 📁 clienteExcel.ts
// 🔧 Utilidades para exportar clientes a Excel
// ===============================
import * as XLSX from 'xlsx'
import { Cliente } from '@/types'

/**
 * Exporta la lista de clientes a un archivo Excel
 * @param clientes - Array de clientes a exportar
 */
export function exportarClientesAExcel(clientes: Cliente[]) {
  // ✅ Mapear datos para Excel con campos relevantes
  const data = clientes.map((c) => ({
    Nombre: c.nombre,
    RUC: c.ruc || '',
    Dirección: c.direccion || '',
    Teléfono: c.telefono || '',
    Correo: c.correo || ''
  }))
  
  // ✅ Crear hoja de trabajo
  const worksheet = XLSX.utils.json_to_sheet(data)
  
  // ✅ Configurar ancho de columnas para mejor visualización
  const columnWidths = [
    { wch: 30 }, // Nombre
    { wch: 15 }, // RUC
    { wch: 40 }, // Dirección
    { wch: 15 }, // Teléfono
    { wch: 25 }  // Correo
  ]
  worksheet['!cols'] = columnWidths
  
  // ✅ Crear libro de trabajo y agregar hoja
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Clientes')
  
  // ✅ Generar nombre de archivo con timestamp
  const timestamp = new Date().toISOString().split('T')[0]
  const filename = `clientes_${timestamp}.xlsx`
  
  // ✅ Descargar archivo
  XLSX.writeFile(workbook, filename)
}
