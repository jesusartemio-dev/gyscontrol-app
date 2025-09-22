/**
 * 📥 Utilidades para importar plantillas de exclusiones desde Excel
 */

import * as XLSX from 'xlsx'

interface PlantillaExclusionImport {
  nombre: string
  descripcion?: string
  categoria?: string
  items: Array<{
    descripcion: string
    orden: number
  }>
}

export async function leerPlantillasExclusionesDesdeExcel(file: File): Promise<PlantillaExclusionImport[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })

        // Leer primera hoja
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]

        // Convertir a JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]

        if (jsonData.length < 2) {
          throw new Error('El archivo Excel debe contener al menos una fila de datos')
        }

        // Procesar datos
        const plantillasMap = new Map<string, PlantillaExclusionImport>()

        // Saltar header (primera fila)
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i]
          if (!row || row.length < 4) continue

          const [
            nombrePlantilla,
            descripcionPlantilla,
            categoria,
            exclusion,
            orden,
            activo
          ] = row

          if (!nombrePlantilla || !exclusion) continue

          const nombre = String(nombrePlantilla).trim()
          const descripcion = descripcionPlantilla ? String(descripcionPlantilla).trim() : undefined
          const cat = categoria ? String(categoria).trim() : undefined
          const itemDesc = String(exclusion).trim()
          const itemOrden = orden ? parseInt(String(orden)) : 1

          if (!plantillasMap.has(nombre)) {
            plantillasMap.set(nombre, {
              nombre,
              descripcion,
              categoria: cat,
              items: []
            })
          }

          const plantilla = plantillasMap.get(nombre)!
          plantilla.items.push({
            descripcion: itemDesc,
            orden: itemOrden
          })
        }

        resolve(Array.from(plantillasMap.values()))
      } catch (error) {
        reject(new Error(`Error al procesar el archivo Excel: ${error instanceof Error ? error.message : 'Error desconocido'}`))
      }
    }

    reader.onerror = () => {
      reject(new Error('Error al leer el archivo'))
    }

    reader.readAsArrayBuffer(file)
  })
}

export function validarPlantillasExclusiones(
  plantillas: PlantillaExclusionImport[],
  nombresExistentes: string[]
): { nuevos: PlantillaExclusionImport[], errores: string[] } {
  const errores: string[] = []
  const nuevos: PlantillaExclusionImport[] = []

  plantillas.forEach((plantilla, index) => {
    const fila = index + 2 // +2 porque Excel cuenta desde 1 y hay header

    // Validar nombre
    if (!plantilla.nombre || plantilla.nombre.length < 3) {
      errores.push(`Fila ${fila}: El nombre de la plantilla debe tener al menos 3 caracteres`)
      return
    }

    // Validar que no exista
    if (nombresExistentes.includes(plantilla.nombre)) {
      errores.push(`Fila ${fila}: Ya existe una plantilla con el nombre "${plantilla.nombre}"`)
      return
    }

    // Validar items
    if (!plantilla.items || plantilla.items.length === 0) {
      errores.push(`Fila ${fila}: La plantilla debe tener al menos un item de exclusión`)
      return
    }

    // Validar cada item
    plantilla.items.forEach((item, itemIndex) => {
      if (!item.descripcion || item.descripcion.length < 5) {
        errores.push(`Fila ${fila}, Item ${itemIndex + 1}: La descripción debe tener al menos 5 caracteres`)
      }
    })

    // Si no hay errores, agregar a nuevos
    if (!errores.some(err => err.startsWith(`Fila ${fila}`))) {
      nuevos.push(plantilla)
    }
  })

  return { nuevos, errores }
}