// ===================================================
// 📁 Archivo: serviciosExcel.ts
// 🔹 Ubicación: src/lib/utils/
// 🔧 Descripción: Exportación de servicios del catálogo a Excel (.xlsx)
// 🧐 Uso: Usado en la página de Catálogo de Servicios para exportación.
// 👩‍💻 Autor: Jesús Artemio
// 🗓️ Última actualización: 2025-04-26
// ===================================================

import * as XLSX from 'xlsx'
import { CatalogoServicio, Edt, UnidadServicio, Recurso } from '@/types'

export async function exportarServiciosAExcel(servicios: CatalogoServicio[]) {
  // Ordenar por EDT y luego por orden
  const serviciosOrdenados = servicios.sort((a, b) => {
    const edtA = a.edt?.nombre || ''
    const edtB = b.edt?.nombre || ''

    // Primero ordenar por EDT
    if (edtA !== edtB) {
      return edtA.localeCompare(edtB)
    }

    // Luego ordenar por orden dentro del EDT
    return (a.orden || 0) - (b.orden || 0)
  })

  // Función auxiliar para calcular horas totales (solo escalonada)
  const calcularHoras = (servicio: CatalogoServicio) => {
    const cantidad = servicio.cantidad || 1;
    const factorDificultad = servicio.nivelDificultad || 1;

    // Solo fórmula escalonada: HH = HH_base + (cantidad - 1) × HH_repetido
    const horasBase = (servicio.horaBase || 0) + Math.max(0, cantidad - 1) * (servicio.horaRepetido || 0);

    return horasBase * factorDificultad;
  };

  const data = serviciosOrdenados.map(servicio => {
    const horasTotales = calcularHoras(servicio);
    const costoHora = servicio.recurso?.costoHora || 0;
    const costoTotal = horasTotales * costoHora;

    return {
      Servicio: servicio.nombre,
      Descripción: servicio.descripcion || '',
      EDT: servicio.edt?.nombre || '',
      Orden: servicio.orden || 0,
      Recurso: servicio.recurso?.nombre || '',
      Unidad: servicio.unidadServicio?.nombre || '',
      Cantidad: servicio.cantidad || 1,
      Dificultad: servicio.nivelDificultad || 1,
      'HH Base': servicio.horaBase || 0,
      'HH Repetido': servicio.horaRepetido || 0,
      'HH Total': horasTotales,
      'Costo/Hora': costoHora,
      'Costo Total': costoTotal
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Servicios')

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([excelBuffer], { type: 'application/octet-stream' })

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'CatalogoServicios.xlsx'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Genera una plantilla Excel para importar servicios, usando exceljs para
 * dropdowns estrictos (data validation):
 * - "EDT", "Unidad" y "Recurso" solo permiten elegir un valor existente del
 *   catálogo (Recurso limitado a los HABILITADOS), evitando errores de
 *   tipeo que hoy causan que la fila se rechace en la importación.
 * - "Servicio" (nombre) es texto libre: crear un servicio nuevo es el uso
 *   normal de esta importación (a diferencia de Recursos).
 */
export async function generarPlantillaServicios(
  edts: Edt[],
  unidades: UnidadServicio[],
  recursos: Recurso[]
) {
  const ExcelJS = (await import('exceljs')).default

  const edtsOrdenados = [...edts].sort((a, b) => a.nombre.localeCompare(b.nombre))
  const unidadesOrdenadas = [...unidades].sort((a, b) => a.nombre.localeCompare(b.nombre))
  const recursosActivos = [...recursos]
    .filter(r => r.activo)
    .sort((a, b) => a.nombre.localeCompare(b.nombre))

  const wb = new ExcelJS.Workbook()

  // --- Hoja 1: Servicios (editable) ---
  const ws = wb.addWorksheet('Servicios')
  ws.columns = [
    { header: 'Servicio', key: 'servicio', width: 32 },
    { header: 'Descripción', key: 'descripcion', width: 36 },
    { header: 'EDT', key: 'edt', width: 24 },
    { header: 'Unidad', key: 'unidad', width: 14 },
    { header: 'Recurso', key: 'recurso', width: 24 },
    { header: 'Cantidad', key: 'cantidad', width: 12 },
    { header: 'Dificultad', key: 'dificultad', width: 12 },
    { header: 'HH Base', key: 'horaBase', width: 12 },
    { header: 'HH Repetido', key: 'horaRepetido', width: 14 },
    { header: 'Orden', key: 'orden', width: 10 },
  ]
  ws.getRow(1).font = { bold: true }
  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFED7AA' } }

  ws.addRow({
    servicio: 'Instalación de equipo',
    descripcion: 'Descripción del servicio',
    edt: edtsOrdenados[0]?.nombre ?? '(elige un EDT de la lista)',
    unidad: unidadesOrdenadas[0]?.nombre ?? '(elige una unidad de la lista)',
    recurso: recursosActivos[0]?.nombre ?? '(elige un recurso habilitado de la lista)',
    cantidad: 1, dificultad: 1, horaBase: 1, horaRepetido: 0.5, orden: 0,
  })

  // --- Hoja 2: EDTs Existentes (referencia + fuente del dropdown) ---
  const wsEdt = wb.addWorksheet('EDTs Existentes')
  wsEdt.columns = [{ header: 'EDT', key: 'nombre', width: 32 }]
  wsEdt.getRow(1).font = { bold: true }
  wsEdt.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } }
  for (const e of edtsOrdenados) wsEdt.addRow({ nombre: e.nombre })

  // --- Hoja 3: Unidades Existentes ---
  const wsUnidad = wb.addWorksheet('Unidades Existentes')
  wsUnidad.columns = [{ header: 'Unidad', key: 'nombre', width: 16 }]
  wsUnidad.getRow(1).font = { bold: true }
  wsUnidad.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } }
  for (const u of unidadesOrdenadas) wsUnidad.addRow({ nombre: u.nombre })

  // --- Hoja 4: Recursos Habilitados ---
  const wsRecurso = wb.addWorksheet('Recursos Habilitados')
  wsRecurso.columns = [
    { header: 'Recurso', key: 'nombre', width: 28 },
    { header: 'Costo Hora', key: 'costoHora', width: 12 },
  ]
  wsRecurso.getRow(1).font = { bold: true }
  wsRecurso.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } }
  for (const r of recursosActivos) wsRecurso.addRow({ nombre: r.nombre, costoHora: r.costoHora })

  // --- Data validations ---
  const SELECTOR_FILL = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFEFF6FF' } }
  const ROWS_VALIDADAS = 500
  for (let row = 2; row <= ROWS_VALIDADAS; row++) {
    // C: EDT
    if (edtsOrdenados.length > 0) {
      ws.getCell(`C${row}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`'EDTs Existentes'!$A$2:$A$${edtsOrdenados.length + 1}`],
        showErrorMessage: true,
        errorTitle: 'EDT inválido',
        error: 'Selecciona un EDT existente de la lista.',
      }
      ws.getCell(`C${row}`).fill = SELECTOR_FILL
    }
    // D: Unidad
    if (unidadesOrdenadas.length > 0) {
      ws.getCell(`D${row}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`'Unidades Existentes'!$A$2:$A$${unidadesOrdenadas.length + 1}`],
        showErrorMessage: true,
        errorTitle: 'Unidad inválida',
        error: 'Selecciona una unidad existente de la lista.',
      }
      ws.getCell(`D${row}`).fill = SELECTOR_FILL
    }
    // E: Recurso
    if (recursosActivos.length > 0) {
      ws.getCell(`E${row}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`'Recursos Habilitados'!$A$2:$A$${recursosActivos.length + 1}`],
        showErrorMessage: true,
        errorTitle: 'Recurso inválido',
        error: 'Selecciona un recurso habilitado de la lista.',
      }
      ws.getCell(`E${row}`).fill = SELECTOR_FILL
    }
    // F: Cantidad — decimal >= 0
    ws.getCell(`F${row}`).dataValidation = {
      type: 'decimal', operator: 'greaterThanOrEqual', allowBlank: true, formulae: [0],
      showErrorMessage: true, errorTitle: 'Cantidad inválida', error: 'Cantidad debe ser ≥ 0.',
    }
    // G: Dificultad — entero 1 a 5
    ws.getCell(`G${row}`).dataValidation = {
      type: 'whole', operator: 'between', allowBlank: true, formulae: [1, 5],
      showErrorMessage: true, errorTitle: 'Dificultad inválida', error: 'Dificultad debe ser un entero entre 1 (Básico) y 5 (Maestro).',
    }
    // H: HH Base — decimal >= 0
    ws.getCell(`H${row}`).dataValidation = {
      type: 'decimal', operator: 'greaterThanOrEqual', allowBlank: true, formulae: [0],
      showErrorMessage: true, errorTitle: 'HH Base inválida', error: 'HH Base debe ser ≥ 0.',
    }
    // I: HH Repetido — decimal >= 0
    ws.getCell(`I${row}`).dataValidation = {
      type: 'decimal', operator: 'greaterThanOrEqual', allowBlank: true, formulae: [0],
      showErrorMessage: true, errorTitle: 'HH Repetido inválido', error: 'HH Repetido debe ser ≥ 0.',
    }
    // J: Orden — entero >= 0
    ws.getCell(`J${row}`).dataValidation = {
      type: 'whole', operator: 'greaterThanOrEqual', allowBlank: true, formulae: [0],
      showErrorMessage: true, errorTitle: 'Orden inválido', error: 'Orden debe ser un entero ≥ 0.',
    }
  }

  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'plantilla_servicios.xlsx'
  a.click()
  URL.revokeObjectURL(url)
}
