// ===============================
// 📁 recursoExcel.ts
// 🔧 Utilidades para exportar/importar recursos desde Excel
// ===============================
import * as XLSX from 'xlsx'
import { Recurso } from '@/types'

/**
 * Exporta la lista de recursos a un archivo Excel
 */
export function exportarRecursosAExcel(recursos: Recurso[]) {
  const data = recursos.map((r) => {
    // Obtener nombres del personal asignado
    const personal = r.composiciones?.map(c => c.empleado?.user?.name).filter(Boolean).join(', ') || ''

    return {
      Nombre: r.nombre,
      Tipo: r.tipo === 'cuadrilla' ? 'Cuadrilla' : 'Individual',
      'Costo Hora': r.costoHora,
      Descripción: r.descripcion || '',
      Personal: personal || '(sin asignar)'
    }
  })

  const worksheet = XLSX.utils.json_to_sheet(data)

  const columnWidths = [
    { wch: 30 }, // Nombre
    { wch: 12 }, // Tipo
    { wch: 12 }, // Costo Hora
    { wch: 40 }, // Descripción
    { wch: 40 }, // Personal
  ]
  worksheet['!cols'] = columnWidths

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Recursos')

  const timestamp = new Date().toISOString().split('T')[0]
  XLSX.writeFile(workbook, `recursos_${timestamp}.xlsx`)
}

/**
 * Genera una plantilla Excel para importar recursos
 */
export function generarPlantillaRecursos() {
  const ejemplos = [
    {
      Nombre: 'Técnico Senior',
      Tipo: 'Individual',
      'Costo Hora': 25.00,
      Descripción: 'Técnico con experiencia',
      Personal: '(se ignora en importación)'
    },
    {
      Nombre: 'Cuadrilla Instalación',
      Tipo: 'Cuadrilla',
      'Costo Hora': 75.00,
      Descripción: 'Equipo de instalación',
      Personal: '(se ignora en importación)'
    }
  ]

  const worksheet = XLSX.utils.json_to_sheet(ejemplos)

  const columnWidths = [
    { wch: 30 },
    { wch: 12 },
    { wch: 12 },
    { wch: 40 },
    { wch: 40 },
  ]
  worksheet['!cols'] = columnWidths

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Recursos')

  XLSX.writeFile(workbook, 'plantilla_recursos.xlsx')
}
