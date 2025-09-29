// ===================================================
// 📁 Archivo: equiposImportUtils.ts
// 📌 Ubicación: src/lib/utils/
// 🔧 Descripción: Validación y transformación de datos Excel para importación
//    de equipos al catálogo. Separa errores reales de duplicados y permite control posterior.
// 🧠 Uso: Usado desde la página de catálogo de equipos al importar .xlsx
// ✍️ Autor: Jesús Artemio
// 📅 Última actualización: 2025-04-25
// ===================================================

import { CategoriaEquipo, Unidad } from '@/types'
import { calcularPrecioVenta } from './recalculoCatalogoEquipo'

export interface EquipoImportadoTemporal {
  codigo: string
  descripcion: string
  marca: string
  precioInterno: number
  margen: number
  precioVenta: number
  categoriaId: string
  unidadId: string
  estado: string
  duplicado?: boolean
}

export async function importarEquiposDesdeExcelValidado(
  rows: any[],
  categorias: CategoriaEquipo[],
  unidades: Unidad[],
  codigosExistentes: string[]
): Promise<{
  equiposValidos: EquipoImportadoTemporal[]
  errores: string[]
}> {
  const errores: string[] = []
  const equiposValidos: EquipoImportadoTemporal[] = []
  const codigosEnArchivo: Set<string> = new Set()

  for (let [index, row] of rows.entries()) {
    const categoria = categorias.find(c => c.nombre.toLowerCase() === row['Categoría']?.toLowerCase())
    const unidad = unidades.find(u => u.nombre.toLowerCase() === row['Unidad']?.toLowerCase())

    if (!categoria || !unidad) {
      errores.push(
        `Fila ${index + 2}: ${!categoria ? `Categoría "${row['Categoría']}" no encontrada.` : ''} ${
          !unidad ? `Unidad "${row['Unidad']}" no encontrada.` : ''
        }`
      )
      continue
    }

    const codigo = row['Código']
    if (!codigo || codigo.trim() === '') {
      errores.push(`Fila ${index + 2}: Código no puede estar vacío.`)
      continue
    }

    // Check for duplicates within the file
    if (codigosEnArchivo.has(codigo)) {
      errores.push(`Fila ${index + 2}: Código "${codigo}" duplicado en el archivo.`)
      continue
    }

    const yaExiste = codigosExistentes.includes(codigo)
    const precioInterno = parseFloat(row['PrecioInterno']) || 0
    const margen = 0.25
    const precioVenta = calcularPrecioVenta(precioInterno, margen)

    equiposValidos.push({
      codigo,
      descripcion: row['Descripción'] || '',
      marca: row['Marca'] || '',
      precioInterno,
      margen,
      precioVenta,
      categoriaId: categoria.id,
      unidadId: unidad.id,
      estado: 'pendiente',
      duplicado: yaExiste,
    })

    codigosEnArchivo.add(codigo)
  }

  return { equiposValidos, errores }
}
