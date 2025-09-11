// ===============================
// 📁 recursoImportUtils.ts
// ===============================
import * as XLSX from 'xlsx'

export interface RecursoImportado {
  nombre: string
  costoHora: number
}

export async function leerRecursosDesdeExcel(file: File): Promise<RecursoImportado[]> {
  const data = await file.arrayBuffer()
  const workbook = XLSX.read(data)
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const json: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' })

  return json.map((row) => ({
    nombre: row['Nombre']?.trim() || '',
    costoHora: parseFloat(row['Costo Hora']) || 0,
  }))
}

export function validarRecursos(
  recursos: RecursoImportado[],
  existentes: string[]
): {
  nuevos: RecursoImportado[]
  errores: string[]
  duplicados: string[]
} {
  const nuevos: RecursoImportado[] = []
  const errores: string[] = []
  const duplicados: string[] = []

  for (const r of recursos) {
    if (!r.nombre) {
      errores.push('Recurso sin nombre válido.')
    } else if (existentes.includes(r.nombre)) {
      duplicados.push(r.nombre)
    } else {
      nuevos.push(r)
    }
  }

  return { nuevos, errores, duplicados }
}
