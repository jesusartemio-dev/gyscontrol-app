// ===============================
// 📁 departamentoExcel.ts
// 🔧 Utilidades para exportar/importar departamentos desde Excel
// ===============================
import * as XLSX from 'xlsx'
import type { Departamento } from '@/types/modelos'

/**
 * Interface para departamento importado desde Excel
 */
export interface DepartamentoImportado {
  nombre: string
  descripcion?: string
  activo: boolean
}

/**
 * Exporta la lista de departamentos a un archivo Excel
 * @param departamentos - Array de departamentos a exportar
 */
export function exportarDepartamentosAExcel(departamentos: Departamento[]) {
  const data = departamentos.map((d) => ({
    Nombre: d.nombre,
    Descripción: d.descripcion || '',
    Responsable: d.responsable?.name || d.responsable?.email || '',
    Estado: d.activo ? 'Activo' : 'Inactivo',
    Empleados: d._count?.empleados || 0
  }))

  const worksheet = XLSX.utils.json_to_sheet(data)

  const columnWidths = [
    { wch: 25 }, // Nombre
    { wch: 40 }, // Descripción
    { wch: 30 }, // Responsable
    { wch: 12 }, // Estado
    { wch: 12 }, // Empleados
  ]
  worksheet['!cols'] = columnWidths

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Departamentos')

  const timestamp = new Date().toISOString().split('T')[0]
  XLSX.writeFile(workbook, `departamentos_${timestamp}.xlsx`)
}

/**
 * Genera una plantilla Excel para importar departamentos
 */
export function generarPlantillaDepartamentos() {
  const ejemplos = [
    {
      Nombre: 'Proyectos',
      Descripción: 'Gestión y ejecución de proyectos',
      Estado: 'Activo'
    },
    {
      Nombre: 'Comercial',
      Descripción: 'Ventas y relaciones con clientes',
      Estado: 'Activo'
    }
  ]

  const worksheet = XLSX.utils.json_to_sheet(ejemplos)

  const columnWidths = [
    { wch: 25 },
    { wch: 40 },
    { wch: 12 },
  ]
  worksheet['!cols'] = columnWidths

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Departamentos')

  XLSX.writeFile(workbook, 'plantilla_departamentos.xlsx')
}

/**
 * Lee departamentos desde un archivo Excel
 * @param file - Archivo Excel a procesar
 * @returns Promise con array de departamentos importados
 */
export async function leerDepartamentosDesdeExcel(file: File): Promise<DepartamentoImportado[]> {
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
      activo
    }
  })
}

/**
 * Valida los departamentos importados
 * @param departamentos - Array de departamentos a validar
 * @param nombresExistentes - Array de nombres de departamentos existentes
 * @returns Objeto con departamentos nuevos, errores y duplicados
 */
export function validarDepartamentos(
  departamentos: DepartamentoImportado[],
  nombresExistentes: string[]
): {
  nuevos: DepartamentoImportado[]
  errores: string[]
  duplicados: string[]
} {
  const nuevos: DepartamentoImportado[] = []
  const errores: string[] = []
  const duplicados: string[] = []
  const nombresVistos = new Set<string>()

  for (const d of departamentos) {
    if (!d.nombre || d.nombre.trim() === '') {
      errores.push(`Nombre requerido`)
      continue
    }

    const nombreNorm = d.nombre.toLowerCase()

    // Check for duplicates in existing data
    if (nombresExistentes.map(n => n.toLowerCase()).includes(nombreNorm)) {
      duplicados.push(d.nombre)
      continue
    }

    // Check for duplicates in import file
    if (nombresVistos.has(nombreNorm)) {
      errores.push(`Nombre duplicado en archivo: ${d.nombre}`)
      continue
    }

    nombresVistos.add(nombreNorm)
    nuevos.push(d)
  }

  return { nuevos, errores, duplicados }
}

/**
 * Crea departamentos en la base de datos a través de la API
 * @param departamentos - Array de departamentos a crear
 * @returns Promise con resultado de la importación
 */
export async function crearDepartamentosEnBD(departamentos: DepartamentoImportado[]): Promise<{
  message: string
  creados: number
  total: number
  errores?: string[]
}> {
  const response = await fetch('/api/departamento/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ departamentos }),
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
