// ===============================
// 📁 edtImportUtils.ts
// ===============================
import * as XLSX from 'xlsx'

export interface EdtImportada {
  nombre: string
  descripcion?: string
  fasePorDefecto?: string
}

export async function leerEdtsDesdeExcel(file: File): Promise<EdtImportada[]> {
  const data = await file.arrayBuffer()
  const workbook = XLSX.read(data)
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const json: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' })

  return json.map((row) => ({
    nombre: row['Nombre']?.trim() || '',
    descripcion: row['Descripcion']?.trim() || undefined,
    fasePorDefecto: row['FasePorDefecto']?.trim() || undefined
  }))
}

export function validarEdts(
  edts: EdtImportada[],
  existentes: string[]
): {
  nuevos: EdtImportada[]
  errores: string[]
  duplicados: string[]
} {
  const nuevos: EdtImportada[] = []
  const errores: string[] = []
  const duplicados: string[] = []

  for (const edt of edts) {
    if (!edt.nombre) {
      errores.push('EDT sin nombre válido.')
    } else if (existentes.includes(edt.nombre)) {
      duplicados.push(edt.nombre)
    } else {
      nuevos.push(edt)
    }
  }

  return { nuevos, errores, duplicados }
}
