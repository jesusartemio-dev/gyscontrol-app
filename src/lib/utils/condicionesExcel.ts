// ===================================================
// Archivo: condicionesExcel.ts
// Ubicacion: src/lib/utils/condicionesExcel.ts
// Descripcion: Exportar e importar catalogo de condiciones desde Excel
// ===================================================

import * as XLSX from 'xlsx'
import type { CatalogoCondicion, CategoriaCondicion } from '@/lib/services/catalogoCondicion'

// Exportar condiciones a Excel
export function exportarCondicionesAExcel(condiciones: CatalogoCondicion[]) {
  const data = condiciones.map(cond => ({
    Codigo: cond.codigo,
    Descripcion: cond.descripcion,
    Categoria: cond.categoria?.nombre ?? '',
    Tipo: cond.tipo ?? '',
    Estado: cond.activo ? 'Activo' : 'Inactivo'
  }))

  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Condiciones')

  XLSX.writeFile(wb, 'catalogo_condiciones.xlsx')
}

// Leer datos crudos desde Excel
export async function importarCondicionesDesdeExcel(file: File): Promise<any[]> {
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

// Tipos de condicion validos
const TIPOS_VALIDOS = ['comercial', 'tecnica', 'entrega', 'pago']

// Validar y transformar datos importados
export function validarCondicionesImportadas(
  datos: any[],
  categorias: CategoriaCondicion[],
  codigosExistentes: string[]
): {
  condicionesValidas: Array<{
    codigo?: string
    descripcion: string
    categoriaId?: string
    tipo?: string
    esNueva: boolean
  }>
  errores: string[]
} {
  const errores: string[] = []
  const condicionesValidas: Array<{
    codigo?: string
    descripcion: string
    categoriaId?: string
    tipo?: string
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

    // Tipo (opcional pero debe ser valido si se proporciona)
    let tipo: string | undefined
    const tipoValue = row['Tipo'] || row['tipo'] || row['TIPO']
    if (tipoValue && typeof tipoValue === 'string') {
      const tipoNormalizado = tipoValue.toLowerCase().trim()
      if (TIPOS_VALIDOS.includes(tipoNormalizado)) {
        tipo = tipoNormalizado
      } else {
        errores.push(`Fila ${fila}: Tipo "${tipoValue}" no valido. Usar: ${TIPOS_VALIDOS.join(', ')}`)
        return
      }
    }

    // Codigo (si existe, verificar si es update o create)
    const codigo = row['Codigo'] || row['codigo'] || row['CODIGO']
    const esNueva = !codigo || !codigosExistentes.includes(codigo)

    condicionesValidas.push({
      codigo: codigo || undefined,
      descripcion: descripcion.trim(),
      categoriaId,
      tipo,
      esNueva
    })
  })

  return { condicionesValidas, errores }
}
