/**
 * 📊 Utilidades para exportar plantillas de condiciones a Excel
 */

import * as XLSX from 'xlsx'

interface PlantillaCondicionItem {
  id: string
  descripcion: string
  tipo?: string
  orden: number
  activo: boolean
}

interface PlantillaCondicion {
  id: string
  nombre: string
  descripcion?: string
  categoria?: string
  tipo?: string
  activo: boolean
  orden: number
  createdAt: Date
  updatedAt: Date
  items: PlantillaCondicionItem[]
  _count: { items: number }
}

export function exportarPlantillasCondicionesAExcel(plantillas: PlantillaCondicion[]) {
  try {
    // Preparar datos para Excel
    const datos = plantillas.flatMap(plantilla =>
      plantilla.items.map(item => ({
        'Nombre Condición': plantilla.nombre,
        'Descripción Condición': plantilla.descripcion || '',
        'Categoría': plantilla.categoria || '',
        'Tipo Condición': plantilla.tipo || '',
        'Texto Condición': item.descripcion,
        'Tipo Item': item.tipo || '',
        'Orden': item.orden,
        'Activo': item.activo ? 'Sí' : 'No',
        'Fecha Creación': new Date(plantilla.createdAt).toLocaleDateString('es-ES'),
        'Fecha Actualización': new Date(plantilla.updatedAt).toLocaleDateString('es-ES')
      }))
    )

    if (datos.length === 0) {
      throw new Error('No hay datos para exportar')
    }

    // Crear libro de trabajo
    const wb = XLSX.utils.book_new()

    // Crear hoja de trabajo
    const ws = XLSX.utils.json_to_sheet(datos)

    // Ajustar ancho de columnas
    const colWidths = [
      { wch: 25 }, // Nombre Condición
      { wch: 30 }, // Descripción Condición
      { wch: 15 }, // Categoría
      { wch: 15 }, // Tipo Condición
      { wch: 50 }, // Texto Condición
      { wch: 15 }, // Tipo Item
      { wch: 8 },  // Orden
      { wch: 8 },  // Activo
      { wch: 12 }, // Fecha Creación
      { wch: 12 }  // Fecha Actualización
    ]
    ws['!cols'] = colWidths

    // Agregar hoja al libro
    XLSX.utils.book_append_sheet(wb, ws, 'Plantillas Condiciones')

    // Generar archivo
    const nombreArchivo = `plantillas_condiciones_${new Date().toISOString().split('T')[0]}.xlsx`

    // Usar writeFile con opciones para mejor compatibilidad
    XLSX.writeFile(wb, nombreArchivo, {
      bookType: 'xlsx',
      bookSST: false,
      type: 'binary'
    })

    console.log('✅ Archivo Excel generado:', nombreArchivo)
    return true

  } catch (error) {
    console.error('❌ Error al exportar plantillas de condiciones:', error)
    throw error
  }
}