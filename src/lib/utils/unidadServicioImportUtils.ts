// ===============================
// 📁 unidadServicioImportUtils.ts
// ===============================
import * as XLSX from 'xlsx'

export interface UnidadServicioImportada {
  nombre: string
}

export async function leerUnidadesServicioDesdeExcel(file: File): Promise<UnidadServicioImportada[]> {
  const data = await file.arrayBuffer()
  const workbook = XLSX.read(data)
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const json: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' })

  return json.map((row) => ({ nombre: row['Nombre']?.trim() || '' }))
}

export function validarUnidadesServicio(
  unidades: UnidadServicioImportada[],
  existentes: string[]
): {
  nuevas: UnidadServicioImportada[]
  errores: string[]
  duplicados: string[]
} {
  const nuevas: UnidadServicioImportada[] = []
  const errores: string[] = []
  const duplicados: string[] = []

  for (const unidad of unidades) {
    if (!unidad.nombre) {
      errores.push('Unidad de servicio sin nombre válido.')
    } else if (existentes.includes(unidad.nombre)) {
      duplicados.push(unidad.nombre)
    } else {
      nuevas.push(unidad)
    }
  }

  return { nuevas, errores, duplicados }
}
