// ================================
// 📁 faseImportUtils.ts
// ================================
import * as XLSX from 'xlsx'
import { FaseDefault } from '@/types'

export interface FaseImportada {
  nombre: string
  descripcion: string
  orden: number
  duracionDias: number
  color: string
  activo: boolean
}

export async function leerFasesDesdeExcel(file: File): Promise<FaseImportada[]> {
  const data = await file.arrayBuffer()
  const workbook = XLSX.read(data)
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const json: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' })

  return json.map((row) => ({
    nombre: row['Nombre']?.trim() || '',
    descripcion: row['Descripcion']?.trim() || '',
    orden: parseInt(row['Orden']) || 0,
    duracionDias: parseInt(row['Duracion Dias']) || 0,
    color: row['Color']?.trim() || '#3b82f6',
    activo: row['Activo']?.toString().toLowerCase() === 'sí' || row['Activo'] === 'true' || false
  }))
}

export function validarFases(
  fases: FaseImportada[],
  existentes: string[]
): {
  nuevas: FaseImportada[]
  errores: string[]
  actualizaciones: string[]
} {
  const nuevas: FaseImportada[] = []
  const errores: string[] = []
  const actualizaciones: string[] = []

  for (let i = 0; i < fases.length; i++) {
    const fase = fases[i]
    const rowNum = i + 2 // +2 because Excel rows start at 1 and we skip header

    if (!fase.nombre || fase.nombre.trim() === '') {
      errores.push(`Fila ${rowNum}: Nombre de fase vacío o inválido.`)
    } else {
      const nombreLimpio = fase.nombre.trim()
      const existe = existentes.includes(nombreLimpio)

      if (existe) {
        actualizaciones.push(nombreLimpio)
      }

      // Validar otros campos opcionales y agregar a la lista
      const faseValidada = {
        ...fase,
        nombre: nombreLimpio,
        descripcion: fase.descripcion?.trim() || '',
        orden: Math.max(0, fase.orden),
        duracionDias: Math.max(0, fase.duracionDias),
        color: fase.color || '#3b82f6'
      }
      nuevas.push(faseValidada)
    }
  }

  return { nuevas, errores, actualizaciones }
}