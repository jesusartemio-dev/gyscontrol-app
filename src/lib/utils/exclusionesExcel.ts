// ===================================================
// Archivo: exclusionesExcel.ts
// Ubicacion: src/lib/utils/exclusionesExcel.ts
// Descripcion: Exportar e importar catalogo de exclusiones desde Excel
// ===================================================

import * as XLSX from 'xlsx'
import type { CatalogoExclusion, CategoriaExclusion } from '@/lib/services/catalogoExclusion'

// Exportar exclusiones a Excel
export function exportarExclusionesAExcel(exclusiones: CatalogoExclusion[]) {
  const data = exclusiones.map(excl => ({
    Codigo: excl.codigo,
    Descripcion: excl.descripcion,
    Categoria: excl.categoria?.nombre ?? '',
    Estado: excl.activo ? 'Activo' : 'Inactivo'
  }))

  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Exclusiones')

  XLSX.writeFile(wb, 'catalogo_exclusiones.xlsx')
}

// Leer datos crudos desde Excel
export async function importarExclusionesDesdeExcel(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer)
      const workbook = XLSX.read(data, { type: 'array' })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const json = XLSX.utils.sheet_to_json(sheet)
      resolve(json as any[])
    }
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })
}

// Validar y transformar datos importados
export function validarExclusionesImportadas(
  datos: any[],
  categorias: CategoriaExclusion[],
  codigosExistentes: string[]
): {
  exclusionesValidas: Array<{
    codigo?: string
    descripcion: string
    categoriaId?: string
    esNueva: boolean
  }>
  errores: string[]
} {
  const errores: string[] = []
  const exclusionesValidas: Array<{
    codigo?: string
    descripcion: string
    categoriaId?: string
    esNueva: boolean
  }> = []

  const categoriaPorNombre = new Map(
    categorias.map(cat => [cat.nombre.toLowerCase(), cat.id])
  )

  datos.forEach((row, index) => {
    const fila = index + 2 // Excel empieza en 1 y tiene header

    // Descripcion es obligatoria
    const descripcion = row['Descripcion'] || row['descripcion'] || row['DESCRIPCION']
    if (!descripcion || typeof descripcion !== 'string' || !descripcion.trim()) {
      errores.push(`Fila ${fila}: Descripcion es obligatoria`)
      return
    }

    // Categoria (opcional)
    let categoriaId: string | undefined
    const categoriaNombre = row['Categoria'] || row['categoria'] || row['CATEGORIA']
    if (categoriaNombre && typeof categoriaNombre === 'string') {
      categoriaId = categoriaPorNombre.get(categoriaNombre.toLowerCase().trim())
      if (!categoriaId) {
        errores.push(`Fila ${fila}: Categoria "${categoriaNombre}" no existe`)
        return
      }
    }

    // Codigo (si existe, verificar si es update o create)
    const codigo = row['Codigo'] || row['codigo'] || row['CODIGO']
    const esNueva = !codigo || !codigosExistentes.includes(codigo)

    exclusionesValidas.push({
      codigo: codigo || undefined,
      descripcion: descripcion.trim(),
      categoriaId,
      esNueva
    })
  })

  return { exclusionesValidas, errores }
}
