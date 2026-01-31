// ===============================
// 📁 cargoExcel.ts
// 🔧 Utilidades para exportar/importar cargos desde Excel
// ===============================
import * as XLSX from 'xlsx'
import type { Cargo } from '@/types/modelos'

/**
 * Interface para cargo importado desde Excel
 */
export interface CargoImportado {
  nombre: string
  descripcion?: string
  sueldoBase?: number
  activo: boolean
}

/**
 * Exporta la lista de cargos a un archivo Excel
 * @param cargos - Array de cargos a exportar
 */
export function exportarCargosAExcel(cargos: Cargo[]) {
  const data = cargos.map((c) => ({
    Nombre: c.nombre,
    Descripción: c.descripcion || '',
    'Sueldo Base': c.sueldoBase || '',
    Estado: c.activo ? 'Activo' : 'Inactivo',
    Empleados: c._count?.empleados || 0
  }))

  const worksheet = XLSX.utils.json_to_sheet(data)

  const columnWidths = [
    { wch: 25 }, // Nombre
    { wch: 40 }, // Descripción
    { wch: 15 }, // Sueldo Base
    { wch: 12 }, // Estado
    { wch: 12 }, // Empleados
  ]
  worksheet['!cols'] = columnWidths

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Cargos')

  const timestamp = new Date().toISOString().split('T')[0]
  XLSX.writeFile(workbook, `cargos_${timestamp}.xlsx`)
}

/**
 * Genera una plantilla Excel para importar cargos
 */
export function generarPlantillaCargos() {
  const ejemplos = [
    {
      Nombre: 'Ingeniero Senior',
      Descripción: 'Responsable de proyectos técnicos',
      'Sueldo Base': 5000,
      Estado: 'Activo'
    },
    {
      Nombre: 'Técnico',
      Descripción: 'Soporte técnico en campo',
      'Sueldo Base': 2500,
      Estado: 'Activo'
    }
  ]

  const worksheet = XLSX.utils.json_to_sheet(ejemplos)

  const columnWidths = [
    { wch: 25 },
    { wch: 40 },
    { wch: 15 },
    { wch: 12 },
  ]
  worksheet['!cols'] = columnWidths

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Cargos')

  XLSX.writeFile(workbook, 'plantilla_cargos.xlsx')
}

/**
 * Lee cargos desde un archivo Excel
 * @param file - Archivo Excel a procesar
 * @returns Promise con array de cargos importados
 */
export async function leerCargosDesdeExcel(file: File): Promise<CargoImportado[]> {
  const data = await file.arrayBuffer()
  const workbook = XLSX.read(data)
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const json: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' })

  return json.map((row, index) => {
    const nombre = (typeof row['Nombre'] === 'string' ? row['Nombre'].trim() : String(row['Nombre'] || '').trim())

    if (!nombre) {
      throw new Error(`Fila ${index + 2}: El nombre es obligatorio`)
    }

    const estadoRaw = typeof row['Estado'] === 'string' ? row['Estado'].toLowerCase().trim() : 'activo'
    const activo = estadoRaw === 'activo' || estadoRaw === 'si' || estadoRaw === 'sí' || estadoRaw === 'true' || estadoRaw === '1'

    return {
      nombre,
      descripcion: row['Descripción'] ? String(row['Descripción']).trim() || undefined : undefined,
      sueldoBase: row['Sueldo Base'] ? parseFloat(String(row['Sueldo Base'])) || undefined : undefined,
      activo
    }
  })
}

/**
 * Valida los cargos importados
 * @param cargos - Array de cargos a validar
 * @param nombresExistentes - Array de nombres de cargos existentes
 * @returns Objeto con cargos nuevos, errores y duplicados
 */
export function validarCargos(
  cargos: CargoImportado[],
  nombresExistentes: string[]
): {
  nuevos: CargoImportado[]
  errores: string[]
  duplicados: string[]
} {
  const nuevos: CargoImportado[] = []
  const errores: string[] = []
  const duplicados: string[] = []
  const nombresVistos = new Set<string>()

  for (const c of cargos) {
    if (!c.nombre || c.nombre.trim() === '') {
      errores.push(`Nombre requerido`)
      continue
    }

    const nombreNorm = c.nombre.toLowerCase()

    // Check for duplicates in existing data
    if (nombresExistentes.map(n => n.toLowerCase()).includes(nombreNorm)) {
      duplicados.push(c.nombre)
      continue
    }

    // Check for duplicates in import file
    if (nombresVistos.has(nombreNorm)) {
      errores.push(`Nombre duplicado en archivo: ${c.nombre}`)
      continue
    }

    nombresVistos.add(nombreNorm)
    nuevos.push(c)
  }

  return { nuevos, errores, duplicados }
}

/**
 * Crea cargos en la base de datos a través de la API
 * @param cargos - Array de cargos a crear
 * @returns Promise con resultado de la importación
 */
export async function crearCargosEnBD(cargos: CargoImportado[]): Promise<{
  message: string
  creados: number
  total: number
  errores?: string[]
}> {
  const response = await fetch('/api/cargo/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ cargos }),
  })

  if (!response.ok) {
    try {
      const errorData = await response.json()
      throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`)
    } catch {
      throw new Error(`Error ${response.status}: ${response.statusText}`)
    }
  }

  return await response.json()
}
