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
      Origen: r.origen === 'externo' ? 'Externo' : 'GYS',
      'Costo Hora': r.costoHora,
      'Costo Hora Proyecto': r.costoHoraProyecto ?? '',
      Descripción: r.descripcion || '',
      Personal: personal || '(sin asignar)'
    }
  })

  const worksheet = XLSX.utils.json_to_sheet(data)

  const columnWidths = [
    { wch: 30 }, // Nombre
    { wch: 12 }, // Tipo
    { wch: 10 }, // Origen
    { wch: 12 }, // Costo Hora
    { wch: 18 }, // Costo Hora Proyecto
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
 * Genera una plantilla Excel para importar recursos.
 * Incluye una segunda hoja de solo lectura con los recursos existentes,
 * para que el nombre usado en la importación coincida exactamente
 * (la importación solo actualiza recursos existentes, no crea nuevos).
 */
export function generarPlantillaRecursos(recursosExistentes: Recurso[] = []) {
  const ejemplos = [
    {
      Nombre: 'Técnico Senior',
      Tipo: 'Individual',
      Origen: 'GYS',
      'Costo Hora': 25.00,
      'Costo Hora Proyecto': 18.00,
      Descripción: 'Técnico con experiencia',
      Personal: '(se ignora en importación)'
    },
    {
      Nombre: 'Cuadrilla Instalación',
      Tipo: 'Cuadrilla',
      Origen: 'Externo',
      'Costo Hora': 75.00,
      'Costo Hora Proyecto': 55.00,
      Descripción: 'Equipo de instalación',
      Personal: '(se ignora en importación)'
    }
  ]

  const worksheet = XLSX.utils.json_to_sheet(ejemplos)

  const columnWidths = [
    { wch: 30 },
    { wch: 12 },
    { wch: 10 },
    { wch: 12 },
    { wch: 18 },
    { wch: 40 },
    { wch: 40 },
  ]
  worksheet['!cols'] = columnWidths

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Recursos')

  const existentesOrdenados = [...recursosExistentes].sort((a, b) => a.nombre.localeCompare(b.nombre))
  const dataExistentes = existentesOrdenados.map((r) => ({
    Nombre: r.nombre,
    Tipo: r.tipo === 'cuadrilla' ? 'Cuadrilla' : 'Individual',
    Origen: r.origen === 'externo' ? 'Externo' : 'GYS',
    'Costo Hora': r.costoHora,
    Estado: r.activo ? 'Activo' : 'Inactivo',
  }))
  const worksheetExistentes = XLSX.utils.json_to_sheet(dataExistentes)
  worksheetExistentes['!cols'] = [
    { wch: 30 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 10 },
  ]
  XLSX.utils.book_append_sheet(workbook, worksheetExistentes, 'Recursos Existentes')

  XLSX.writeFile(workbook, 'plantilla_recursos.xlsx')
}
