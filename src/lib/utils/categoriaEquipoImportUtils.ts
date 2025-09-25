// ===============================
// 📁 categoriaEquipoImportUtils.ts
// ===============================
import * as XLSX from 'xlsx'

export interface CategoriaEquipoImportada {
  nombre: string
  descripcion?: string
}

export async function leerCategoriasEquipoDesdeExcel(file: File): Promise<CategoriaEquipoImportada[]> {
  const data = await file.arrayBuffer()
  const workbook = XLSX.read(data)
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const json: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' })

  return json.map((row) => {
    // Get all column names
    const columns = Object.keys(row)

    // Find description column (case-insensitive, contains "descripcion" or "description")
    const descColumn = columns.find(col =>
      col.toLowerCase().includes('descripcion') ||
      col.toLowerCase().includes('description') ||
      col.toLowerCase().includes('descripción')
    )

    // Find name column (case-insensitive, contains "nombre" or "name")
    const nameColumn = columns.find(col =>
      col.toLowerCase().includes('nombre') ||
      col.toLowerCase().includes('name')
    )

    const descripcion = descColumn ? row[descColumn]?.trim() || '' : ''
    const nombre = nameColumn ? row[nameColumn]?.trim() || '' : ''

    return {
      nombre,
      descripcion: descripcion || null
    }
  })
}

export function validarCategoriasEquipo(
  categorias: CategoriaEquipoImportada[],
  existentes: string[]
): {
  nuevas: CategoriaEquipoImportada[]
  errores: string[]
  duplicados: string[]
} {
  const nuevas: CategoriaEquipoImportada[] = []
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
