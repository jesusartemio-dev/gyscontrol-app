import * as XLSX from 'xlsx'

// ============================================
// TIPOS
// ============================================
export interface RendicionImportRow {
  grupo: number
  proyectoCodigo: string
  centroCostoNombre: string
  empleadoEmail: string
  motivo: string
  montoAnticipo: number
  montoDepositado: number
  estado: string
  // Línea de gasto
  descripcion: string
  fecha: string
  monto: number
  moneda: string
  tipoComprobante: string
  numeroComprobante: string
  proveedorNombre: string
  proveedorRuc: string
}

export interface RendicionValidatedRow extends RendicionImportRow {
  fila: number
  proyectoId?: string
  centroCostoId?: string
  empleadoId?: string
  empleadoNombre?: string
  errores: string[]
}

export interface RendicionGroupValidated {
  grupo: number
  proyectoId: string | null
  centroCostoId: string | null
  proyectoCodigo: string
  centroCostoNombre: string
  empleadoId: string
  empleadoEmail: string
  empleadoNombre: string
  motivo: string
  montoAnticipo: number
  montoDepositado: number
  estado: string
  lineas: RendicionValidatedRow[]
  erroresGrupo: string[]
}

export interface RendicionImportResult {
  grupos: RendicionGroupValidated[]
  erroresGlobales: string[]
  totalLineas: number
  totalHojas: number
  totalValidos: number
  totalInvalidos: number
}

interface ProyectoRef {
  id: string
  codigo: string
  nombre: string
}

interface CentroCostoRef {
  id: string
  nombre: string
  activo: boolean
}

interface EmpleadoRef {
  id: string
  name: string | null
  email: string
}

interface HojaExportRow {
  numero: string
  estado: string
  motivo: string
  observaciones: string | null
  requiereAnticipo: boolean
  montoAnticipo: number
  montoDepositado: number
  montoGastado: number
  saldo: number
  createdAt: string
  empleado?: { name: string | null; email: string } | null
  proyecto?: { codigo: string; nombre: string } | null
  centroCosto?: { nombre: string } | null
  lineas?: {
    descripcion: string
    fecha: string
    monto: number
    moneda: string
    tipoComprobante: string | null
    numeroComprobante: string | null
    proveedorNombre: string | null
    proveedorRuc: string | null
    categoriaGasto?: { nombre: string } | null
  }[]
}

const ESTADOS_VALIDOS = ['borrador', 'enviado', 'aprobado', 'depositado', 'rendido', 'validado', 'cerrado']
const MONEDAS_VALIDAS = ['PEN', 'USD']
const TIPOS_COMPROBANTE = ['factura', 'boleta', 'recibo', 'ticket', 'sin_comprobante', '']

// ============================================
// LEER EXCEL
// ============================================
export async function leerExcelRendicion(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array', cellDates: true })
        const sheetName = workbook.SheetNames[0]
        const sheet = workbook.Sheets[sheetName]
        const json = XLSX.utils.sheet_to_json<any>(sheet, { raw: false })
        resolve(json)
      } catch (error) {
        reject(error)
      }
    }
    reader.onerror = (error) => reject(error)
    reader.readAsArrayBuffer(file)
  })
}

// ============================================
// VALIDAR FILAS Y AGRUPAR EN HOJAS
// ============================================
export function validarRendicionImport(
  rows: any[],
  proyectos: ProyectoRef[],
  centrosCosto: CentroCostoRef[],
  empleados: EmpleadoRef[]
): RendicionImportResult {
  const erroresGlobales: string[] = []

  if (rows.length === 0) {
    erroresGlobales.push('El archivo está vacío o no tiene datos válidos')
    return { grupos: [], erroresGlobales, totalLineas: 0, totalHojas: 0, totalValidos: 0, totalInvalidos: 0 }
  }

  const proyectoPorCodigo = new Map<string, ProyectoRef>()
  for (const p of proyectos) {
    proyectoPorCodigo.set(p.codigo.toLowerCase().trim(), p)
  }
  const ccPorNombre = new Map<string, CentroCostoRef>()
  for (const cc of centrosCosto) {
    ccPorNombre.set(cc.nombre.toLowerCase().trim(), cc)
  }
  const empleadoPorEmail = new Map<string, EmpleadoRef>()
  for (const e of empleados) {
    empleadoPorEmail.set(e.email.toLowerCase().trim(), e)
  }

  const parsedRows: RendicionValidatedRow[] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const fila = i + 2
    const errores: string[] = []

    const grupoRaw = row['Grupo Hoja'] || row['grupo'] || ''
    const grupo = parseInt(String(grupoRaw).trim()) || 0
    if (grupo <= 0) {
      errores.push('Grupo Hoja debe ser un número positivo (1, 2, 3...)')
    }

    // Hoja-level fields
    const proyectoCodigo = String(row['Código Proyecto'] || row['proyectoCodigo'] || '').trim()
    const centroCostoNombre = String(row['Centro Costo'] || row['centroCostoNombre'] || '').trim()
    const empleadoEmail = String(row['Email Empleado'] || row['empleadoEmail'] || '').trim().toLowerCase()
    const motivo = String(row['Motivo'] || row['motivo'] || '').trim()
    const montoAnticipoRaw = row['Monto Anticipo'] || row['montoAnticipo'] || '0'
    const montoDepositadoRaw = row['Monto Depositado'] || row['montoDepositado'] || '0'
    const estado = String(row['Estado'] || row['estado'] || 'borrador').trim().toLowerCase()

    // Line-level fields
    const descripcion = String(row['Descripción'] || row['descripcion'] || '').trim()
    const fechaRaw = row['Fecha Gasto'] || row['fecha'] || ''
    const montoRaw = row['Monto Gasto'] || row['monto'] || ''
    const moneda = String(row['Moneda'] || row['moneda'] || 'PEN').trim().toUpperCase()
    const tipoComprobante = String(row['Tipo Comprobante'] || row['tipoComprobante'] || '').trim().toLowerCase()
    const numeroComprobante = String(row['N° Comprobante'] || row['numeroComprobante'] || '').trim()
    const proveedorNombre = String(row['Proveedor'] || row['proveedorNombre'] || '').trim()
    const proveedorRuc = String(row['RUC Proveedor'] || row['proveedorRuc'] || '').trim()

    // Validate proyecto/CC
    let proyectoId: string | undefined
    let centroCostoId: string | undefined
    if (proyectoCodigo && centroCostoNombre) {
      errores.push('Indique Proyecto O Centro Costo, no ambos')
    } else if (!proyectoCodigo && !centroCostoNombre) {
      errores.push('Debe indicar Código Proyecto o Centro Costo')
    }
    if (proyectoCodigo) {
      const proy = proyectoPorCodigo.get(proyectoCodigo.toLowerCase())
      if (proy) {
        proyectoId = proy.id
      } else {
        errores.push(`Proyecto "${proyectoCodigo}" no encontrado`)
      }
    }
    if (centroCostoNombre) {
      const cc = ccPorNombre.get(centroCostoNombre.toLowerCase())
      if (cc) {
        if (!cc.activo) errores.push(`Centro Costo "${centroCostoNombre}" está inactivo`)
        else centroCostoId = cc.id
      } else {
        errores.push(`Centro Costo "${centroCostoNombre}" no encontrado`)
      }
    }

    // Validate empleado
    let empleadoId: string | undefined
    let empleadoNombre: string | undefined
    if (!empleadoEmail) {
      errores.push('Email Empleado es requerido')
    } else {
      const emp = empleadoPorEmail.get(empleadoEmail)
      if (emp) {
        empleadoId = emp.id
        empleadoNombre = emp.name || emp.email
      } else {
        errores.push(`Empleado "${empleadoEmail}" no encontrado`)
      }
    }

    // Validate motivo
    if (!motivo) errores.push('Motivo es requerido')

    // Validate estado
    if (!ESTADOS_VALIDOS.includes(estado)) {
      errores.push(`Estado "${estado}" inválido. Use: ${ESTADOS_VALIDOS.join(', ')}`)
    }

    const montoAnticipo = parseFloat(String(montoAnticipoRaw).replace(/,/g, '')) || 0
    const montoDepositado = parseFloat(String(montoDepositadoRaw).replace(/,/g, '')) || 0

    // Validate line fields
    if (!descripcion) errores.push('Descripción del gasto es requerida')

    const fecha = parseDateStr(fechaRaw)
    if (!fecha) errores.push('Fecha Gasto es requerida (formato: DD/MM/YYYY)')

    const monto = parseFloat(String(montoRaw).replace(/,/g, ''))
    if (isNaN(monto) || monto <= 0) errores.push('Monto Gasto debe ser mayor a 0')

    if (!MONEDAS_VALIDAS.includes(moneda)) errores.push(`Moneda "${moneda}" inválida. Use: PEN o USD`)

    if (tipoComprobante && !TIPOS_COMPROBANTE.includes(tipoComprobante)) {
      errores.push(`Tipo Comprobante "${tipoComprobante}" inválido`)
    }

    if (proveedorRuc && !/^\d{11}$/.test(proveedorRuc)) {
      errores.push(`RUC "${proveedorRuc}" inválido (debe ser 11 dígitos)`)
    }

    parsedRows.push({
      fila,
      grupo,
      proyectoCodigo,
      centroCostoNombre,
      empleadoEmail,
      motivo,
      montoAnticipo,
      montoDepositado,
      estado,
      descripcion,
      fecha: fecha ? fecha.toISOString().split('T')[0] : '',
      monto,
      moneda,
      tipoComprobante,
      numeroComprobante,
      proveedorNombre,
      proveedorRuc,
      proyectoId,
      centroCostoId,
      empleadoId,
      empleadoNombre,
      errores,
    })
  }

  // Group by "Grupo Hoja"
  const gruposMap = new Map<number, RendicionValidatedRow[]>()
  for (const row of parsedRows) {
    if (row.grupo > 0) {
      const list = gruposMap.get(row.grupo) || []
      list.push(row)
      gruposMap.set(row.grupo, list)
    }
  }

  const grupos: RendicionGroupValidated[] = []
  let totalValidos = 0
  let totalInvalidos = 0

  const sortedKeys = Array.from(gruposMap.keys()).sort((a, b) => a - b)

  for (const grupoNum of sortedKeys) {
    const lineas = gruposMap.get(grupoNum)!
    const first = lineas[0]
    const erroresGrupo: string[] = []

    // Consistency checks within group
    for (let i = 1; i < lineas.length; i++) {
      const item = lineas[i]
      if (item.empleadoEmail !== first.empleadoEmail) {
        erroresGrupo.push(`Fila ${item.fila}: Email Empleado difiere del primero del grupo`)
      }
      if (item.proyectoCodigo !== first.proyectoCodigo) {
        erroresGrupo.push(`Fila ${item.fila}: Proyecto difiere del primero del grupo`)
      }
      if (item.centroCostoNombre !== first.centroCostoNombre) {
        erroresGrupo.push(`Fila ${item.fila}: Centro Costo difiere del primero del grupo`)
      }
      if (item.motivo !== first.motivo) {
        erroresGrupo.push(`Fila ${item.fila}: Motivo difiere del primero del grupo`)
      }
    }

    const tieneErroresItem = lineas.some(it => it.errores.length > 0)
    const grupoValido = erroresGrupo.length === 0 && !tieneErroresItem

    if (grupoValido) totalValidos++
    else totalInvalidos++

    grupos.push({
      grupo: grupoNum,
      proyectoId: first.proyectoId || null,
      centroCostoId: first.centroCostoId || null,
      proyectoCodigo: first.proyectoCodigo,
      centroCostoNombre: first.centroCostoNombre,
      empleadoId: first.empleadoId || '',
      empleadoEmail: first.empleadoEmail,
      empleadoNombre: first.empleadoNombre || first.empleadoEmail,
      motivo: first.motivo,
      montoAnticipo: first.montoAnticipo,
      montoDepositado: first.montoDepositado,
      estado: first.estado,
      lineas,
      erroresGrupo,
    })
  }

  return {
    grupos,
    erroresGlobales,
    totalLineas: parsedRows.length,
    totalHojas: grupos.length,
    totalValidos,
    totalInvalidos,
  }
}

// ============================================
// GENERAR PLANTILLA
// ============================================
export async function generarPlantillaRendicion() {
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()

  const ws = wb.addWorksheet('Rendiciones')
  ws.columns = [
    { header: 'Grupo Hoja', key: 'grupo', width: 12 },
    { header: 'Código Proyecto', key: 'proyecto', width: 16 },
    { header: 'Centro Costo', key: 'cc', width: 18 },
    { header: 'Email Empleado', key: 'email', width: 25 },
    { header: 'Motivo', key: 'motivo', width: 25 },
    { header: 'Monto Anticipo', key: 'montoAnticipo', width: 15 },
    { header: 'Monto Depositado', key: 'montoDepositado', width: 16 },
    { header: 'Estado', key: 'estado', width: 12 },
    { header: 'Descripción', key: 'descripcion', width: 30 },
    { header: 'Fecha Gasto', key: 'fecha', width: 14 },
    { header: 'Monto Gasto', key: 'monto', width: 14 },
    { header: 'Moneda', key: 'moneda', width: 10 },
    { header: 'Tipo Comprobante', key: 'tipoComprobante', width: 16 },
    { header: 'N° Comprobante', key: 'nroComprobante', width: 16 },
    { header: 'Proveedor', key: 'proveedor', width: 25 },
    { header: 'RUC Proveedor', key: 'ruc', width: 15 },
  ]

  // Header style
  ws.getRow(1).font = { bold: true }
  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCE4EC' } }

  // Example: Hoja 1 with 2 lines
  ws.addRow({
    grupo: 1, proyecto: 'PRY-001', cc: '', email: 'juan@empresa.com',
    motivo: 'Viaje a obra Miraflores', montoAnticipo: 500, montoDepositado: 500, estado: 'borrador',
    descripcion: 'Taxi ida y vuelta', fecha: '15/01/2026', monto: 45.00, moneda: 'PEN',
    tipoComprobante: 'boleta', nroComprobante: 'B001-00234', proveedor: 'Taxi Green', ruc: '',
  })
  ws.addRow({
    grupo: 1, proyecto: 'PRY-001', cc: '', email: 'juan@empresa.com',
    motivo: 'Viaje a obra Miraflores', montoAnticipo: 500, montoDepositado: 500, estado: 'borrador',
    descripcion: 'Almuerzo equipo', fecha: '15/01/2026', monto: 120.00, moneda: 'PEN',
    tipoComprobante: 'factura', nroComprobante: 'F001-00567', proveedor: 'Restaurante El Buen Sabor', ruc: '20505678901',
  })

  // Example: Hoja 2 with 1 line
  ws.addRow({
    grupo: 2, proyecto: '', cc: 'Administración', email: 'maria@empresa.com',
    motivo: 'Compra útiles oficina', montoAnticipo: 0, montoDepositado: 0, estado: 'borrador',
    descripcion: 'Papel, tóner, lapiceros', fecha: '20/01/2026', monto: 250.00, moneda: 'PEN',
    tipoComprobante: 'factura', nroComprobante: 'F002-00890', proveedor: 'Tai Loy', ruc: '20100047218',
  })

  // Style example rows
  for (let row = 2; row <= 4; row++) {
    ws.getRow(row).font = { italic: true, color: { argb: 'FF999999' } }
  }

  // Data validations
  const maxRow = 500
  for (let row = 2; row <= maxRow; row++) {
    ws.getCell(`H${row}`).dataValidation = {
      type: 'list', allowBlank: true,
      formulae: ['"borrador,enviado,aprobado,depositado,rendido,validado,cerrado"'],
      showErrorMessage: true, errorTitle: 'Estado inválido', error: 'Seleccione un estado válido',
    }
    ws.getCell(`L${row}`).dataValidation = {
      type: 'list', allowBlank: true,
      formulae: ['"PEN,USD"'],
      showErrorMessage: true, errorTitle: 'Moneda inválida', error: 'Use PEN o USD',
    }
    ws.getCell(`M${row}`).dataValidation = {
      type: 'list', allowBlank: true,
      formulae: ['"factura,boleta,recibo,ticket,sin_comprobante"'],
      showErrorMessage: true, errorTitle: 'Tipo inválido', error: 'Seleccione un tipo de comprobante',
    }
  }

  // Instructions sheet
  const wsInfo = wb.addWorksheet('Instrucciones')
  wsInfo.columns = [
    { header: 'Campo', key: 'campo', width: 20 },
    { header: 'Requerido', key: 'requerido', width: 12 },
    { header: 'Descripción', key: 'descripcion', width: 70 },
  ]
  wsInfo.getRow(1).font = { bold: true }
  wsInfo.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCE4EC' } }

  const instrucciones = [
    ['Grupo Hoja', 'Sí', 'Agrupa filas en la misma hoja de gastos (1, 2, 3...). Mismo número = misma hoja.'],
    ['Código Proyecto', 'Condicional', 'Código del proyecto. Requerido si no hay Centro Costo. No poner ambos.'],
    ['Centro Costo', 'Condicional', 'Nombre del centro de costo. Requerido si no hay Proyecto.'],
    ['Email Empleado', 'Sí', 'Email del empleado responsable. Debe existir en el sistema.'],
    ['Motivo', 'Sí', 'Motivo del requerimiento de dinero.'],
    ['Monto Anticipo', 'No', 'Monto de anticipo solicitado. Defecto: 0.'],
    ['Monto Depositado', 'No', 'Monto depositado al empleado. Defecto: 0.'],
    ['Estado', 'No', 'borrador (defecto), enviado, aprobado, depositado, rendido, validado, cerrado.'],
    ['Descripción', 'Sí', 'Descripción de la línea de gasto.'],
    ['Fecha Gasto', 'Sí', 'Fecha del gasto (DD/MM/YYYY).'],
    ['Monto Gasto', 'Sí', 'Monto del gasto. Mayor a 0.'],
    ['Moneda', 'No', 'PEN (defecto) o USD.'],
    ['Tipo Comprobante', 'No', 'factura, boleta, recibo, ticket, sin_comprobante.'],
    ['N° Comprobante', 'No', 'Número del comprobante (ej: F001-00456).'],
    ['Proveedor', 'No', 'Nombre del proveedor.'],
    ['RUC Proveedor', 'No', 'RUC de 11 dígitos (opcional).'],
  ]
  for (const [campo, req, desc] of instrucciones) {
    wsInfo.addRow({ campo, requerido: req, descripcion: desc })
  }

  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'Plantilla_Rendiciones.xlsx'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// ============================================
// EXPORTAR TABLA A EXCEL
// ============================================
export async function exportarRendicionesAExcel(hojas: HojaExportRow[]) {
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()

  const ws = wb.addWorksheet('Rendiciones')
  ws.columns = [
    { header: 'Número', key: 'numero', width: 18 },
    { header: 'Empleado', key: 'empleado', width: 22 },
    { header: 'Email', key: 'email', width: 25 },
    { header: 'Asignado a', key: 'asignado', width: 20 },
    { header: 'Motivo', key: 'motivo', width: 25 },
    { header: 'Estado', key: 'estado', width: 12 },
    { header: 'Anticipo', key: 'anticipo', width: 12 },
    { header: 'Depositado', key: 'depositado', width: 12 },
    { header: 'Gastado', key: 'gastado', width: 12 },
    { header: 'Saldo', key: 'saldo', width: 12 },
    { header: 'Descripción Gasto', key: 'descripcion', width: 30 },
    { header: 'Fecha Gasto', key: 'fecha', width: 14 },
    { header: 'Monto Gasto', key: 'montoGasto', width: 14 },
    { header: 'Moneda', key: 'moneda', width: 8 },
    { header: 'Tipo Comprobante', key: 'tipoComprobante', width: 16 },
    { header: 'N° Comprobante', key: 'nroComprobante', width: 16 },
    { header: 'Proveedor', key: 'proveedor', width: 22 },
    { header: 'RUC', key: 'ruc', width: 14 },
    { header: 'Categoría', key: 'categoria', width: 16 },
    { header: 'Fecha Creación', key: 'createdAt', width: 14 },
    { header: 'Observaciones', key: 'observaciones', width: 25 },
  ]

  ws.getRow(1).font = { bold: true }
  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCE4EC' } }

  for (const hoja of hojas) {
    const asignado = hoja.proyecto
      ? `${hoja.proyecto.codigo} - ${hoja.proyecto.nombre}`
      : hoja.centroCosto?.nombre || ''

    if (!hoja.lineas || hoja.lineas.length === 0) {
      ws.addRow({
        numero: hoja.numero,
        empleado: hoja.empleado?.name || '',
        email: hoja.empleado?.email || '',
        asignado,
        motivo: hoja.motivo,
        estado: hoja.estado,
        anticipo: hoja.montoAnticipo,
        depositado: hoja.montoDepositado,
        gastado: hoja.montoGastado,
        saldo: hoja.saldo,
        descripcion: '(sin líneas)',
        fecha: '', montoGasto: '', moneda: '', tipoComprobante: '', nroComprobante: '',
        proveedor: '', ruc: '', categoria: '',
        createdAt: formatDateExcel(hoja.createdAt),
        observaciones: hoja.observaciones || '',
      })
    } else {
      for (let i = 0; i < hoja.lineas.length; i++) {
        const linea = hoja.lineas[i]
        ws.addRow({
          numero: i === 0 ? hoja.numero : '',
          empleado: i === 0 ? (hoja.empleado?.name || '') : '',
          email: i === 0 ? (hoja.empleado?.email || '') : '',
          asignado: i === 0 ? asignado : '',
          motivo: i === 0 ? hoja.motivo : '',
          estado: i === 0 ? hoja.estado : '',
          anticipo: i === 0 ? hoja.montoAnticipo : '',
          depositado: i === 0 ? hoja.montoDepositado : '',
          gastado: i === 0 ? hoja.montoGastado : '',
          saldo: i === 0 ? hoja.saldo : '',
          descripcion: linea.descripcion,
          fecha: formatDateExcel(linea.fecha),
          montoGasto: linea.monto,
          moneda: linea.moneda,
          tipoComprobante: linea.tipoComprobante || '',
          nroComprobante: linea.numeroComprobante || '',
          proveedor: linea.proveedorNombre || '',
          ruc: linea.proveedorRuc || '',
          categoria: linea.categoriaGasto?.nombre || '',
          createdAt: i === 0 ? formatDateExcel(hoja.createdAt) : '',
          observaciones: i === 0 ? (hoja.observaciones || '') : '',
        })
      }
    }
  }

  // Format numbers
  const totalRows = ws.rowCount
  for (let row = 2; row <= totalRows; row++) {
    for (const col of ['G', 'H', 'I', 'J', 'M']) {
      const cell = ws.getCell(`${col}${row}`)
      if (typeof cell.value === 'number') cell.numFmt = '#,##0.00'
    }
  }

  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `Rendiciones_${new Date().toISOString().split('T')[0]}.xlsx`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// ============================================
// HELPERS
// ============================================
function parseDateStr(val: any): Date | null {
  if (!val) return null
  if (val instanceof Date && !isNaN(val.getTime())) return val
  const str = String(val).trim()
  if (!str) return null

  const ddmmyyyy = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/)
  if (ddmmyyyy) {
    const [, dd, mm, yyyy] = ddmmyyyy
    const d = new Date(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd))
    if (!isNaN(d.getTime())) return d
  }

  const yyyymmdd = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/)
  if (yyyymmdd) {
    const [, yyyy, mm, dd] = yyyymmdd
    const d = new Date(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd))
    if (!isNaN(d.getTime())) return d
  }

  const d = new Date(str)
  if (!isNaN(d.getTime())) return d
  return null
}

function formatDateExcel(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    const dd = String(d.getDate()).padStart(2, '0')
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const yyyy = d.getFullYear()
    return `${dd}/${mm}/${yyyy}`
  } catch {
    return dateStr
  }
}
