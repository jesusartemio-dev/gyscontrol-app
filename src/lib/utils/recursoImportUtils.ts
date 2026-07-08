import { normalizeStr } from '@/lib/utils'
// ===============================
// 📁 recursoImportUtils.ts
// 🔧 Utilidades para importar recursos desde Excel
// ===============================
import * as XLSX from 'xlsx'

export interface RecursoImportado {
  nombre: string
  // Todos opcionales: si no se especifican, se conserva el valor actual del recurso.
  tipo?: 'individual' | 'cuadrilla'
  origen?: 'propio' | 'externo'
  costoHora?: number
  costoHoraProyecto?: number | null
  descripcion?: string
}

/**
 * Helper para obtener valor de columna con múltiples nombres posibles
 */
function getColumn(row: Record<string, any>, ...names: string[]): any {
  for (const name of names) {
    if (row[name] !== undefined && row[name] !== '') {
      return row[name]
    }
  }
  return undefined
}

/**
 * Lee recursos desde un archivo Excel
 */
export async function leerRecursosDesdeExcel(file: File): Promise<RecursoImportado[]> {
  const data = await file.arrayBuffer()
  const workbook = XLSX.read(data)
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const json: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' })

  console.log('📊 Columnas en Excel:', json.length > 0 ? Object.keys(json[0]) : 'vacío')
  console.log('📊 Primera fila:', json[0])

  return json.map((row, index) => {
    // Nombre - requerido
    const nombre = getColumn(row, 'Nombre', 'nombre', 'NOMBRE', 'Name', 'name')
    if (!nombre || String(nombre).trim() === '') {
      throw new Error(`Fila ${index + 2}: El nombre es obligatorio`)
    }

    // Tipo - opcional: si no se especifica, se conserva el valor actual
    const tipoRaw = getColumn(row, 'Tipo', 'tipo', 'TIPO', 'Type', 'type')
    let tipo: 'individual' | 'cuadrilla' | undefined
    if (typeof tipoRaw === 'string' && tipoRaw.trim() !== '') {
      const tipoStr = normalizeStr(tipoRaw)
      tipo = (tipoStr === 'cuadrilla' || tipoStr === 'crew' || tipoStr === 'equipo' || tipoStr === 'grupo')
        ? 'cuadrilla'
        : 'individual'
    }

    // Origen - opcional: si no se especifica, se conserva el valor actual
    const origenRaw = getColumn(row, 'Origen', 'origen', 'ORIGEN', 'Origin', 'origin')
    let origen: 'propio' | 'externo' | undefined
    if (typeof origenRaw === 'string' && origenRaw.trim() !== '') {
      const origenStr = normalizeStr(origenRaw)
      origen = (origenStr === 'externo' || origenStr === 'external' || origenStr === 'tercero')
        ? 'externo'
        : 'propio'
    }

    // Costo Hora - opcional: si no se especifica, se conserva el valor actual
    const costoRaw = getColumn(row, 'Costo Hora', 'CostoHora', 'costo_hora', 'Costo', 'costo', 'Cost', 'cost', 'Precio', 'precio')
    let costoHora: number | undefined
    if (costoRaw !== undefined && String(costoRaw).trim() !== '') {
      const parsed = parseFloat(String(costoRaw))
      if (!Number.isFinite(parsed) || parsed < 0) {
        throw new Error(`Fila ${index + 2}: El costo por hora debe ser un número ≥ 0`)
      }
      costoHora = parsed
    }

    // Costo Hora Proyecto - opcional: si no se especifica, se conserva el valor actual
    const costoProyRaw = getColumn(row, 'Costo Hora Proyecto', 'CostoHoraProyecto', 'costo_hora_proyecto', 'Costo Proyecto', 'Project Cost')
    let costoHoraProyecto: number | undefined
    if (costoProyRaw !== undefined && String(costoProyRaw).trim() !== '') {
      const parsed = parseFloat(String(costoProyRaw))
      if (!Number.isFinite(parsed) || parsed < 0) {
        throw new Error(`Fila ${index + 2}: El costo por hora de proyecto debe ser un número ≥ 0`)
      }
      costoHoraProyecto = parsed
    }

    // Descripción - opcional: si no se especifica, se conserva el valor actual
    const descripcion = getColumn(row, 'Descripción', 'Descripcion', 'descripcion', 'DESCRIPCION', 'Description', 'description')

    return {
      nombre: String(nombre).trim(),
      tipo,
      origen,
      costoHora,
      costoHoraProyecto,
      descripcion: descripcion ? String(descripcion).trim() : undefined
    }
  })
}

/**
 * Valida los recursos importados.
 * La importación solo ACTUALIZA recursos HABILITADOS existentes: si el nombre
 * no coincide (comparación insensible a acentos/mayúsculas) con ningún recurso
 * activo del catálogo, la fila se rechaza como error en vez de crear un
 * recurso nuevo por error de tipeo.
 */
export function validarRecursos(
  recursos: RecursoImportado[],
  recursosExistentes: { id: string; nombre: string; activo: boolean }[]
): {
  validos: RecursoImportado[]
  actualizaciones: number
  errores: string[]
} {
  const validos: RecursoImportado[] = []
  const errores: string[] = []
  const nombresVistos = new Set<string>()
  let actualizaciones = 0

  for (const r of recursos) {
    if (!r.nombre || r.nombre.trim() === '') {
      errores.push('Recurso sin nombre válido')
      continue
    }

    const nombreNorm = normalizeStr(r.nombre)

    // Check for duplicates in import file
    if (nombresVistos.has(nombreNorm)) {
      errores.push(`Nombre duplicado en archivo: ${r.nombre}`)
      continue
    }
    nombresVistos.add(nombreNorm)

    const existente = recursosExistentes.find(e => normalizeStr(e.nombre) === nombreNorm)
    if (!existente) {
      errores.push(`Recurso "${r.nombre}" no existe en el catálogo. Usa exactamente un nombre de la hoja "Recursos Existentes" de la plantilla — no se crean recursos nuevos por importación.`)
      continue
    }
    if (!existente.activo) {
      errores.push(`Recurso "${r.nombre}" está inhabilitado. Actívalo primero para poder actualizarlo por importación.`)
      continue
    }

    actualizaciones++
    // Preservar el nombre canónico ya guardado para no alterarlo por diferencias de formato/acentos
    validos.push({ ...r, nombre: existente.nombre })
  }

  return { validos, actualizaciones, errores }
}

/**
 * Crea o actualiza recursos en la base de datos a través de la API
 */
export async function importarRecursosEnBD(recursos: RecursoImportado[]): Promise<{
  message: string
  actualizados: number
  total: number
  errores?: string[]
}> {
  const response = await fetch('/api/recurso/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ recursos }),
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
