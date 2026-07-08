// ===================================================
// 📁 Archivo: serviciosImportUtils.ts
// 📊 Ubicación: src/lib/utils/
// 🔧 Descripción: Importación y validación de servicios desde Excel.
// ✍️ Autor: Jesús Artemio
// 🗓️ Última actualización: 2025-04-26
// ===================================================

import * as xlsx from 'xlsx'
import type { CatalogoServicioPayload } from '@/types'
import type { Edt, UnidadServicio, Recurso } from '@/types'
import { normalizeStr } from '@/lib/utils'

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
  categorias: Edt[],
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

    const nombre = row['Servicio']?.trim()
    const descripcion = row['Descripción']?.trim() || ''
    const categoriaNombre = row['EDT']?.trim()
    const orden = parseInt(row['Orden']) || 0
    const recursoNombre = row['Recurso']?.trim()
    const unidadNombre = row['Unidad']?.trim()
    const cantidad = parseInt(row['Cantidad']) || 1
    const dificultad = parseInt(row['Dificultad']) || 1
    // Solo fórmula escalonada - ignorar fórmula del Excel si existe
    const horaBase = parseFloat(row['HH Base']) || 0
    const horaRepetido = parseFloat(row['HH Repetido']) || 0
    // Ignorar columnas calculadas: HH Total, Costo/Hora, Costo Total
    const horasTotales = parseFloat(row['HH Total']) || 0
    const costoHora = parseFloat(row['Costo/Hora']) || 0
    const totalUSD = parseFloat(row['Costo Total']) || 0

    // Columnas opcionales para compatibilidad con archivos antiguos
    // HorasTotales y Total USD se ignoran en importación (se recalculan)

    const categoria = categorias.find(c => normalizeStr(c.nombre) === normalizeStr(categoriaNombre))
    const unidad = unidades.find(u => normalizeStr(u.nombre) === normalizeStr(unidadNombre))
    const recurso = recursos.find(r => normalizeStr(r.nombre) === normalizeStr(recursoNombre))

    // --- Validaciones Base ---
    if (!nombre || !categoria || !unidad || !recurso) {
      errores.push(
        `Fila ${fila}: ` +
        (!nombre ? 'Falta nombre. ' : '') +
        (!categoria ? `Categoría "${categoriaNombre}" no encontrada. ` : '') +
        (!unidad ? `Unidad "${unidadNombre}" no encontrada. ` : '') +
        (!recurso ? `Recurso "${recursoNombre}" no encontrado. ` : '')
      )
      continue
    }

    // --- Validaciones para fórmula escalonada ---
    if (horaBase < 0 || horaRepetido < 0) {
      errores.push(`Fila ${fila}: Las horas no pueden ser negativas.`)
      continue
    }

    // Validación recomendada: al menos una hora debe ser mayor a 0
    if (horaBase === 0 && horaRepetido === 0) {
      errores.push(`Fila ${fila}: Debe especificar al menos HoraBase o HoraRepetido.`)
      continue
    }

    const payload: CatalogoServicioPayload = {
      nombre,
      descripcion: descripcion || '',
      cantidad,
      horaBase,
      horaRepetido,
      orden,
      nivelDificultad: dificultad,
      categoriaId: categoria.id,
      unidadServicioId: unidad.id,
      recursoId: recurso.id,
    }

    // --- Detectar duplicados ---
    const servicioExistente = serviciosExistentes.find(s => normalizeStr(s.nombre) === normalizeStr(nombre))

    if (servicioExistente) {
      serviciosDuplicados.push({ ...payload, id: servicioExistente.id })
    } else {
      serviciosNuevos.push(payload)
    }
  }

  return { serviciosNuevos, serviciosDuplicados, errores }
}
