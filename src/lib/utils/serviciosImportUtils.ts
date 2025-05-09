// ===================================================
// 📁 Archivo: serviciosImportUtils.ts
// 📊 Ubicación: src/lib/utils/
// 🔧 Descripción: Importación y validación de servicios desde Excel.
// ✍️ Autor: Jesús Artemio
// 🗓️ Última actualización: 2025-04-26
// ===================================================

import * as xlsx from 'xlsx'
import type { CatalogoServicioPayload } from '@/types'
import type { CategoriaServicio, UnidadServicio, Recurso } from '@/types'

// 📄 Leer servicios desde Excel
export async function leerServiciosDesdeExcel(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (event) => {
      const data = new Uint8Array(event.target?.result as ArrayBuffer)
      const workbook = xlsx.read(data, { type: 'array' })
      const sheetName = workbook.SheetNames[0]
      const sheet = workbook.Sheets[sheetName]
      const json = xlsx.utils.sheet_to_json<any>(sheet)
      resolve(json)
    }
    reader.onerror = (error) => reject(error)
    reader.readAsArrayBuffer(file)
  })
}

// 🔧 Validar servicios leídos desde Excel
export async function importarServiciosDesdeExcelValidado(
  rows: any[],
  categorias: CategoriaServicio[],
  unidades: UnidadServicio[],
  recursos: Recurso[],
  serviciosExistentes: { nombre: string, id: string }[]
): Promise<{
  serviciosNuevos: CatalogoServicioPayload[]
  serviciosDuplicados: (CatalogoServicioPayload & { id: string })[]
  errores: string[]
}> {
  const errores: string[] = []
  const serviciosNuevos: CatalogoServicioPayload[] = []
  const serviciosDuplicados: (CatalogoServicioPayload & { id: string })[] = []

  for (let [index, row] of rows.entries()) {
    const fila = index + 2

    const nombre = row['Nombre']?.trim()
    const descripcion = row['Descripción']?.trim()
    const formula = row['Fórmula']?.trim()
    const categoriaNombre = row['Categoría']?.trim()
    const unidadNombre = row['UnidadServicio']?.trim()
    const recursoNombre = row['Recurso']?.trim()

    const horaBase = parseFloat(row['HoraBase']) || 0
    const horaRepetido = parseFloat(row['HoraRepetido']) || 0
    const horaUnidad = parseFloat(row['HoraUnidad']) || 0
    const horaFijo = parseFloat(row['HoraFijo']) || 0

    const categoria = categorias.find(c => c.nombre.toLowerCase() === categoriaNombre?.toLowerCase())
    const unidad = unidades.find(u => u.nombre.toLowerCase() === unidadNombre?.toLowerCase())
    const recurso = recursos.find(r => r.nombre.toLowerCase() === recursoNombre?.toLowerCase())

    // --- Validaciones Base ---
    if (!nombre || !formula || !categoria || !unidad || !recurso) {
      errores.push(
        `Fila ${fila}: ` +
        (!nombre ? 'Falta nombre. ' : '') +
        (!formula ? 'Falta fórmula. ' : '') +
        (!categoria ? `Categoría "${categoriaNombre}" no encontrada. ` : '') +
        (!unidad ? `Unidad "${unidadNombre}" no encontrada. ` : '') +
        (!recurso ? `Recurso "${recursoNombre}" no encontrado. ` : '')
      )
      continue
    }

    // --- Validaciones Específicas por Fórmula ---
    if (formula === 'Proporcional' && horaUnidad <= 0) {
      errores.push(`Fila ${fila}: Para fórmula Proporcional, falta HoraUnidad.`)
      continue
    }

    if (formula === 'Escalonada' && (horaBase <= 0 || horaRepetido <= 0)) {
      errores.push(`Fila ${fila}: Para fórmula Escalonada, falta HoraBase o HoraRepetido.`)
      continue
    }

    if (formula === 'Fijo' && horaFijo <= 0) {
      errores.push(`Fila ${fila}: Para fórmula Fijo, falta HoraFijo.`)
      continue
    }

    const payload: CatalogoServicioPayload = {
      nombre,
      descripcion: descripcion || '',
      formula,
      horaBase,
      horaRepetido,
      horaUnidad,
      horaFijo,
      categoriaId: categoria.id,
      unidadServicioId: unidad.id,
      recursoId: recurso.id,
    }

    // --- Detectar duplicados ---
    const servicioExistente = serviciosExistentes.find(s => s.nombre.toLowerCase() === nombre.toLowerCase())

    if (servicioExistente) {
      serviciosDuplicados.push({ ...payload, id: servicioExistente.id })
    } else {
      serviciosNuevos.push(payload)
    }
  }

  return { serviciosNuevos, serviciosDuplicados, errores }
}
