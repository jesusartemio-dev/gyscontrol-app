// ===============================
// 📁 categoriaServicioImportUtils.ts
// ===============================
import * as XLSX from 'xlsx'

export interface CategoriaServicioImportada {
  nombre: string
}

export async function leerCategoriasServicioDesdeExcel(file: File): Promise<CategoriaServicioImportada[]> {
  const data = await file.arrayBuffer()
  const workbook = XLSX.read(data)
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const json: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' })

  return json.map((row) => ({ nombre: row['Nombre']?.trim() || '' }))
}

export function validarCategoriasServicio(
  categorias: CategoriaServicioImportada[],
  existentes: string[]
): {
  nuevas: CategoriaServicioImportada[]
  errores: string[]
  duplicados: string[]
} {
  const nuevas: CategoriaServicioImportada[] = []
  const errores: string[] = []
  const duplicados: string[] = []

  for (const cat of categorias) {
    if (!cat.nombre) {
      errores.push('Categoría sin nombre válido.')
    } else if (existentes.includes(cat.nombre)) {
      duplicados.push(cat.nombre)
    } else {
      nuevas.push(cat)
    }
  }

  return { nuevas, errores, duplicados }
}
