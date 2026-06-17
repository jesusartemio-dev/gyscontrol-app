// ================================
// 📁 duracionesCronogramaExcel.ts
// ================================
import * as XLSX from 'xlsx'

export interface PlantillaDuracionExcel {
  Nivel: string
  'Duración (días)': number
  'Horas por Día': number
  'Buffer (%)': number
  Activo: string
}

export function exportarDuracionesCronogramaAExcel(duraciones: any[]) {
  const data: PlantillaDuracionExcel[] = duraciones.map((d) => ({
    Nivel: d.nivel,
    'Duración (días)': d.duracionDias,
    'Horas por Día': d.horasPorDia,
    'Buffer (%)': d.bufferPorcentaje,
    Activo: d.activo ? 'Sí' : 'No'
  }))

  const worksheet = XLSX.utils.json_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Duraciones Cronograma')
  XLSX.writeFile(workbook, `duraciones-cronograma-${new Date().toISOString().split('T')[0]}.xlsx`)
}

export function leerDuracionesCronogramaDesdeExcel(file: File): Promise<PlantillaDuracionExcel[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const worksheet = workbook.Sheets[workbook.SheetNames[0]]
        const jsonData = XLSX.utils.sheet_to_json<PlantillaDuracionExcel>(worksheet)

        resolve(jsonData)
      } catch (error) {
        reject(new Error('Error al leer el archivo Excel'))
      }
    }

    reader.onerror = () => {
      reject(new Error('Error al leer el archivo'))
    }

    reader.readAsArrayBuffer(file)
  })
}

export function validarDuracionesCronograma(
  datos: PlantillaDuracionExcel[],
  nivelesExistentes: string[]
) {
  const errores: string[] = []
  const nuevas: Omit<any, 'id' | 'createdAt' | 'updatedAt'>[] = []
  const actualizaciones: string[] = []

  const nivelesValidos = ['fase', 'edt', 'actividad', 'tarea']

  datos.forEach((fila, index) => {
    const filaNum = index + 2 // +2 porque Excel cuenta desde 1 y hay header

    // Validar campos requeridos
    if (!fila.Nivel) {
      errores.push(`Fila ${filaNum}: El campo 'Nivel' es requerido`)
      return
    }

    if (!nivelesValidos.includes(fila.Nivel.toLowerCase())) {
      errores.push(`Fila ${filaNum}: Nivel '${fila.Nivel}' no válido. Valores permitidos: ${nivelesValidos.join(', ')}`)
      return
    }

    if (typeof fila['Duración (días)'] !== 'number' || fila['Duración (días)'] <= 0) {
      errores.push(`Fila ${filaNum}: 'Duración (días)' debe ser un número mayor a 0`)
      return
    }

    if (typeof fila['Horas por Día'] !== 'number' || fila['Horas por Día'] <= 0) {
      errores.push(`Fila ${filaNum}: 'Horas por Día' debe ser un número mayor a 0`)
      return
    }

    if (typeof fila['Buffer (%)'] !== 'number' || fila['Buffer (%)'] < 0 || fila['Buffer (%)'] > 100) {
      errores.push(`Fila ${filaNum}: 'Buffer (%)' debe ser un número entre 0 y 100`)
      return
    }

    // Verificar si ya existe
    const nivelLower = fila.Nivel.toLowerCase()
    const existe = nivelesExistentes.includes(nivelLower)

    if (existe) {
      actualizaciones.push(fila.Nivel)
    }

    // Preparar datos para inserción/actualización
    nuevas.push({
      nivel: nivelLower,
      duracionDias: fila['Duración (días)'],
      horasPorDia: fila['Horas por Día'],
      bufferPorcentaje: fila['Buffer (%)'],
      activo: fila.Activo?.toLowerCase() === 'sí' || fila.Activo?.toLowerCase() === 'si' || fila.Activo === 'Sí' || fila.Activo === 'Si'
    })
  })

  return { nuevas, errores, actualizaciones }
}