/**
 * 📊 Utilidades para exportar plantillas de exclusiones a Excel
 */

import * as XLSX from 'xlsx'

interface PlantillaExclusionItem {
  id: string
  descripcion: string
  orden: number
  activo: boolean
}

interface PlantillaExclusion {
  id: string
  nombre: string
  descripcion?: string
  categoria?: string
  activo: boolean
  orden: number
  createdAt: Date
  updatedAt: Date
  items: PlantillaExclusionItem[]
  _count: { items: number }
}

export function exportarPlantillasExclusionesAExcel(plantillas: PlantillaExclusion[]) {
  try {
    // Preparar datos para Excel
    const datos = plantillas.flatMap(plantilla =>
      plantilla.items.map(item => ({
        'Nombre Exclusión': plantilla.nombre,
        'Descripción Exclusión': plantilla.descripcion || '',
        'Categoría': plantilla.categoria || '',
        'Texto Exclusión': item.descripcion,
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
      { wch: 25 }, // Nombre Exclusión
      { wch: 30 }, // Descripción Exclusión
      { wch: 15 }, // Categoría
      { wch: 50 }, // Texto Exclusión
      { wch: 8 },  // Orden
      { wch: 8 },  // Activo
      { wch: 12 }, // Fecha Creación
      { wch: 12 }  // Fecha Actualización
    ]
    ws['!cols'] = colWidths

    // Agregar hoja al libro
    XLSX.utils.book_append_sheet(wb, ws, 'Plantillas Exclusiones')

    // Generar archivo
    const nombreArchivo = `plantillas_exclusiones_${new Date().toISOString().split('T')[0]}.xlsx`

    // Usar writeFile con opciones para mejor compatibilidad
    XLSX.writeFile(wb, nombreArchivo, {
      bookType: 'xlsx',
      bookSST: false,
      type: 'binary'
    })

    console.log('✅ Archivo Excel generado:', nombreArchivo)
    return true

  } catch (error) {
    console.error('❌ Error al exportar plantillas de exclusiones:', error)
    throw error
  }
}
