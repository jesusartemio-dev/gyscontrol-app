// ===================================================
// 📁 edtImportUtils.ts
// 📌 Ubicación: src/lib/utils/
// 🔧 Utilidades para importar EDTs desde Excel
//
// 🧠 Uso: Leer y validar datos de EDTs desde archivos Excel
// ✍️ Autor: Jesús Artemio (Master Experto 🧙‍♂️)
// 📅 Creación: 2025-10-15
// ===================================================

import * as XLSX from 'xlsx'
import type { EdtPayload } from '@/types/payloads'

/**
 * Estructura de datos para importar EDTs desde Excel
 */
export interface EdtImportData {
  nombre: string
  descripcion?: string
  fasePorDefecto?: string
}

/**
 * Lee datos de EDTs desde un archivo Excel
 */
export async function leerEdtsDesdeExcel(file: File): Promise<EdtImportData[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })

        // Tomar la primera hoja
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]

        // Convertir a JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          defval: ''
        }) as any[][]

        // Verificar que hay datos
        if (jsonData.length < 2) {
          throw new Error('El archivo Excel debe contener al menos una fila de encabezados y una fila de datos')
        }

        // Extraer encabezados
        const headers = jsonData[0].map(h => String(h).toLowerCase().trim())

        // Verificar columnas requeridas
        const nombreIndex = headers.findIndex(h =>
          h.includes('nombre') || h.includes('name')
        )
        if (nombreIndex === -1) {
          throw new Error('No se encontró la columna "Nombre" en el archivo Excel')
        }

        // Procesar filas de datos
        const edts: EdtImportData[] = []

        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i]

          if (!row || row.length === 0) continue

          const nombre = String(row[nombreIndex] || '').trim()
          if (!nombre) continue // Saltar filas vacías

          const edt: EdtImportData = {
            nombre,
            descripcion: undefined,
            fasePorDefecto: undefined
          }

          // Buscar columnas opcionales
          const descripcionIndex = headers.findIndex(h =>
            h.includes('descripción') || h.includes('descripcion') || h.includes('description')
          )
          if (descripcionIndex !== -1 && row[descripcionIndex]) {
            edt.descripcion = String(row[descripcionIndex]).trim()
          }

          const faseIndex = headers.findIndex(h =>
            h.includes('fase') || h.includes('phase') || h.includes('defecto') || h.includes('default')
          )
          if (faseIndex !== -1 && row[faseIndex]) {
            edt.fasePorDefecto = String(row[faseIndex]).trim()
          }

          edts.push(edt)
        }

        resolve(edts)

      } catch (error) {
        reject(error)
      }
    }

    reader.onerror = () => {
      reject(new Error('Error al leer el archivo Excel'))
    }

    reader.readAsArrayBuffer(file)
  })
}

/**
 * Valida datos de EDTs importados
 */
export function validarEdts(
  datos: EdtImportData[],
  nombresExistentes: string[]
): {
  nuevas: EdtImportData[]
  errores: string[]
} {
  const nuevas: EdtImportData[] = []
  const errores: string[] = []
  const nombresVistos = new Set<string>()

  datos.forEach((edt, index) => {
    const fila = index + 2 // +2 porque Excel cuenta desde 1 y hay encabezado

    // Validar nombre
    if (!edt.nombre || edt.nombre.trim().length === 0) {
      errores.push(`Fila ${fila}: El nombre es obligatorio`)
      return
    }

    if (edt.nombre.trim().length < 2) {
      errores.push(`Fila ${fila}: El nombre debe tener al menos 2 caracteres`)
      return
    }

    if (edt.nombre.trim().length > 255) {
      errores.push(`Fila ${fila}: El nombre no puede exceder 255 caracteres`)
      return
    }

    // Verificar duplicados en el archivo
    const nombreLower = edt.nombre.toLowerCase().trim()
    if (nombresVistos.has(nombreLower)) {
      errores.push(`Fila ${fila}: El nombre "${edt.nombre}" está duplicado en el archivo`)
      return
    }
    nombresVistos.add(nombreLower)

    // Verificar si ya existe en la base de datos
    if (nombresExistentes.some(n => n.toLowerCase().trim() === nombreLower)) {
      errores.push(`Fila ${fila}: El EDT "${edt.nombre}" ya existe en el sistema`)
      return
    }

    // Validar descripción (opcional)
    if (edt.descripcion && edt.descripcion.length > 1000) {
      errores.push(`Fila ${fila}: La descripción no puede exceder 1000 caracteres`)
      return
    }

    // Validar fase por defecto (opcional)
    if (edt.fasePorDefecto && edt.fasePorDefecto.length > 255) {
      errores.push(`Fila ${fila}: El nombre de la fase por defecto no puede exceder 255 caracteres`)
      return
    }

    // Si pasa todas las validaciones, agregar a la lista
    nuevas.push({
      nombre: edt.nombre.trim(),
      descripcion: edt.descripcion?.trim() || undefined,
      fasePorDefecto: edt.fasePorDefecto?.trim() || undefined
    })
  })

  return { nuevas, errores }
}