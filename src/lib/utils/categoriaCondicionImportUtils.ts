// ===============================
// 📁 categoriaCondicionImportUtils.ts
// ===============================
import * as XLSX from 'xlsx'

export interface CategoriaCondicionImportada {
  nombre: string
  descripcion?: string
}

export async function leerCategoriasCondicionDesdeExcel(file: File): Promise<CategoriaCondicionImportada[]> {
  const data = await file.arrayBuffer()
  const workbook = XLSX.read(data)
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const json: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' })

  return json.map((row) => {
    const columns = Object.keys(row)

    const descColumn = columns.find(col =>
      col.toLowerCase().includes('descripcion') ||
      col.toLowerCase().includes('description') ||
      col.toLowerCase().includes('descripción')
    )

    const nameColumn = columns.find(col =>
      col.toLowerCase().includes('nombre') ||
      col.toLowerCase().includes('name')
    )

    const descripcion = descColumn ? row[descColumn]?.toString().trim() || '' : ''
    const nombre = nameColumn ? row[nameColumn]?.toString().trim() || '' : ''

    return {
      nombre,
      descripcion: descripcion || undefined
    }
  })
}

export function validarCategoriasCondicion(
  categorias: CategoriaCondicionImportada[],
  existentes: string[]
): {
  nuevas: CategoriaCondicionImportada[]
  errores: string[]
  duplicados: string[]
} {
  const nuevas: CategoriaCondicionImportada[] = []
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
