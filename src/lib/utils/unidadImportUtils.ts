// ===============================
// 📁 unidadImportUtils.ts
// ===============================
import * as XLSX from 'xlsx'

export interface UnidadImportada {
  nombre: string
}

export async function leerUnidadesDesdeExcel(file: File): Promise<UnidadImportada[]> {
  const data = await file.arrayBuffer()
  const workbook = XLSX.read(data)
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const json: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' })

  return json.map((row) => ({ nombre: row['Nombre']?.trim() || '' }))
}

export function validarUnidades(
  unidades: UnidadImportada[],
  existentes: string[]
): {
  nuevas: UnidadImportada[]
  errores: string[]
  duplicados: string[]
} {
  const nuevas: UnidadImportada[] = []
  const errores: string[] = []
  const duplicados: string[] = []

  for (const unidad of unidades) {
    if (!unidad.nombre) {
      errores.push('Unidad sin nombre válido.')
    } else if (existentes.includes(unidad.nombre)) {
      duplicados.push(unidad.nombre)
    } else {
      nuevas.push(unidad)
    }
  }

  return { nuevas, errores, duplicados }
}
