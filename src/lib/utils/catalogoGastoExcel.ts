// ===================================================
// 📁 Archivo: catalogoGastoExcel.ts
// 📌 Ubicación: src/lib/utils/catalogoGastoExcel.ts
// 🔧 Descripción: Exportar e importar catálogo de gastos desde/hacia Excel
// ✍️ Autor: Jesús Artemio
// 📅 Última actualización: 2025-01-27
// ===================================================

import * as XLSX from 'xlsx'
import { CatalogoGasto } from '@/types'

// 📤 Exportar gastos a Excel
export function exportarGastosAExcel(gastos: CatalogoGasto[]) {
  const data = gastos.map(g => ({
    Código: g.codigo,
    Descripción: g.descripcion,
    Categoría: g.categoria?.nombre ?? '',
    Cantidad: g.cantidad,
    'Precio Interno (USD)': g.precioInterno,
    'Margen (%)': (g.margen * 100).toFixed(0),
    'Precio Venta (USD)': g.precioVenta,
    Estado: g.estado
  }))

  const ws = XLSX.utils.json_to_sheet(data)

  // Ajustar ancho de columnas
  ws['!cols'] = [
    { wch: 12 },  // Código
    { wch: 45 },  // Descripción
    { wch: 15 },  // Categoría
    { wch: 10 },  // Cantidad
    { wch: 18 },  // Precio Interno
    { wch: 12 },  // Margen
    { wch: 18 },  // Precio Venta
    { wch: 10 }   // Estado
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'CatalogoGastos')

  XLSX.writeFile(wb, 'catalogo_gastos.xlsx')
}

// 📥 Leer datos desde Excel
export async function importarGastosDesdeExcel(file: File): Promise<any[]> {
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

export interface GastoImportado {
  codigo: string
  descripcion: string
  categoria: string
  cantidad: number
  precioInterno: number
  margen: number
  precioVenta: number
  estado: string
}

// 📋 Parsear y validar gastos importados
export function parsearGastosImportados(
  rows: any[],
  categoriasExistentes: { id: string; nombre: string }[]
): {
  validos: (GastoImportado & { categoriaId: string })[]
  errores: string[]
} {
  const validos: (GastoImportado & { categoriaId: string })[] = []
  const errores: string[] = []

  rows.forEach((row, index) => {
    const fila = index + 2 // +2 porque Excel empieza en 1 y tiene encabezado

    // Buscar columnas (case-insensitive)
    const columns = Object.keys(row)

    const codigoCol = columns.find(c => c.toLowerCase().includes('código') || c.toLowerCase().includes('codigo'))
    const descripcionCol = columns.find(c => c.toLowerCase().includes('descripción') || c.toLowerCase().includes('descripcion'))
    const categoriaCol = columns.find(c => c.toLowerCase().includes('categoría') || c.toLowerCase().includes('categoria'))
    const cantidadCol = columns.find(c => c.toLowerCase().includes('cantidad'))
    const precioInternoCol = columns.find(c => c.toLowerCase().includes('interno'))
    const margenCol = columns.find(c => c.toLowerCase().includes('margen'))
    const precioVentaCol = columns.find(c => c.toLowerCase().includes('venta'))
    const estadoCol = columns.find(c => c.toLowerCase().includes('estado'))

    const codigo = codigoCol ? row[codigoCol]?.toString().trim() : ''
    const descripcion = descripcionCol ? row[descripcionCol]?.toString().trim() : ''
    const categoriaNombre = categoriaCol ? row[categoriaCol]?.toString().trim() : ''
    const cantidad = cantidadCol ? parseFloat(row[cantidadCol]) || 1 : 1
    const precioInterno = precioInternoCol ? parseFloat(row[precioInternoCol]) || 0 : 0
    const margenRaw = margenCol ? parseFloat(row[margenCol]) || 0 : 0
    const margen = margenRaw > 1 ? margenRaw / 100 : margenRaw // Convertir si viene como %
    const precioVenta = precioVentaCol ? parseFloat(row[precioVentaCol]) || 0 : precioInterno * (1 + margen)
    const estado = estadoCol ? row[estadoCol]?.toString().trim().toLowerCase() : 'activo'

    // Validaciones
    if (!codigo) {
      errores.push(`Fila ${fila}: Código es requerido`)
      return
    }
    if (!descripcion) {
      errores.push(`Fila ${fila}: Descripción es requerida`)
      return
    }
    if (!categoriaNombre) {
      errores.push(`Fila ${fila}: Categoría es requerida`)
      return
    }

    // Buscar categoría
    const categoria = categoriasExistentes.find(
      c => c.nombre.toLowerCase() === categoriaNombre.toLowerCase()
    )
    if (!categoria) {
      errores.push(`Fila ${fila}: Categoría "${categoriaNombre}" no existe`)
      return
    }

    if (precioInterno <= 0) {
      errores.push(`Fila ${fila}: Precio interno debe ser mayor a 0`)
      return
    }

    validos.push({
      codigo,
      descripcion,
      categoria: categoriaNombre,
      categoriaId: categoria.id,
      cantidad,
      precioInterno,
      margen,
      precioVenta: Math.round(precioVenta * 100) / 100,
      estado: estado === 'inactivo' ? 'inactivo' : 'activo'
    })
  })

  return { validos, errores }
}
