// ===============================
// 📁 recursoImportUtils.ts
// 🔧 Utilidades para importar recursos desde Excel
// ===============================
import * as XLSX from 'xlsx'

export interface RecursoImportado {
  nombre: string
  tipo: 'individual' | 'cuadrilla'
  origen: 'propio' | 'externo'
  costoHora: number
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

    // Tipo
    const tipoRaw = getColumn(row, 'Tipo', 'tipo', 'TIPO', 'Type', 'type')
    const tipoStr = typeof tipoRaw === 'string' ? tipoRaw.toLowerCase().trim() : 'individual'
    const tipo: 'individual' | 'cuadrilla' =
      tipoStr === 'cuadrilla' || tipoStr === 'crew' || tipoStr === 'equipo' || tipoStr === 'grupo'
        ? 'cuadrilla'
        : 'individual'

    // Origen
    const origenRaw = getColumn(row, 'Origen', 'origen', 'ORIGEN', 'Origin', 'origin')
    const origenStr = typeof origenRaw === 'string' ? origenRaw.toLowerCase().trim() : 'propio'
    const origen: 'propio' | 'externo' =
      origenStr === 'externo' || origenStr === 'external' || origenStr === 'tercero'
        ? 'externo'
        : 'propio'

    // Costo Hora - requerido
    const costoRaw = getColumn(row, 'Costo Hora', 'CostoHora', 'costo_hora', 'Costo', 'costo', 'Cost', 'cost', 'Precio', 'precio')
    const costoHora = parseFloat(String(costoRaw)) || 0
    if (costoHora <= 0) {
      throw new Error(`Fila ${index + 2}: El costo por hora debe ser mayor a 0`)
    }

    // Costo Hora Proyecto - opcional
    const costoProyRaw = getColumn(row, 'Costo Hora Proyecto', 'CostoHoraProyecto', 'costo_hora_proyecto', 'Costo Proyecto', 'Project Cost')
    const costoHoraProyecto = costoProyRaw ? (parseFloat(String(costoProyRaw)) || null) : null

    // Descripción - opcional
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
 * Valida los recursos importados
 * Ya no omite duplicados - el API los actualizará
 */
export function validarRecursos(
  recursos: RecursoImportado[],
  nombresExistentes: string[]
): {
  validos: RecursoImportado[]
  nuevos: number
  actualizaciones: number
  errores: string[]
} {
  const validos: RecursoImportado[] = []
  const errores: string[] = []
  const nombresVistos = new Set<string>()
  let nuevos = 0
  let actualizaciones = 0

  for (const r of recursos) {
    if (!r.nombre || r.nombre.trim() === '') {
      errores.push('Recurso sin nombre válido')
      continue
    }

    const nombreNorm = r.nombre.toLowerCase()

    // Check for duplicates in import file
    if (nombresVistos.has(nombreNorm)) {
      errores.push(`Nombre duplicado en archivo: ${r.nombre}`)
      continue
    }

    nombresVistos.add(nombreNorm)

    // Count if it's new or update
    if (nombresExistentes.map(n => n.toLowerCase()).includes(nombreNorm)) {
      actualizaciones++
    } else {
      nuevos++
    }

    validos.push(r)
  }

  return { validos, nuevos, actualizaciones, errores }
}

/**
 * Crea o actualiza recursos en la base de datos a través de la API
 */
export async function importarRecursosEnBD(recursos: RecursoImportado[]): Promise<{
  message: string
  creados: number
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
