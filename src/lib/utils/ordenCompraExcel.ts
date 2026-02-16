import * as XLSX from 'xlsx'

// ============================================
// TIPOS
// ============================================
export interface OCImportRow {
  grupo: number
  proveedorRuc: string
  proveedorNombre: string
  proyectoCodigo: string
  centroCostoNombre: string
  categoriaCosto: string
  moneda: string
  condicionPago: string
  lugarEntrega: string
  observaciones: string
  codigoItem: string
  descripcionItem: string
  unidad: string
  cantidad: number
  precioUnitario: number
}

export interface OCValidatedRow extends OCImportRow {
  fila: number
  proveedorId?: string
  proyectoId?: string
  centroCostoId?: string
  costoTotal: number
  errores: string[]
}

export interface OCGroupValidated {
  grupo: number
  proveedorId: string
  proveedorRuc: string
  proveedorNombre: string
  proyectoId: string | null
  centroCostoId: string | null
  categoriaCosto: string
  moneda: string
  condicionPago: string
  lugarEntrega: string
  observaciones: string
  items: OCValidatedRow[]
  erroresGrupo: string[]
}

export interface OCImportResult {
  grupos: OCGroupValidated[]
  erroresGlobales: string[]
  totalItems: number
  totalOCs: number
  totalValidos: number
  totalInvalidos: number
}

interface ProveedorRef {
  id: string
  nombre: string
  ruc: string | null
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

interface OCExportRow {
  numero: string
  proveedor?: { nombre: string; ruc: string | null }
  proyecto?: { codigo: string; nombre: string } | null
  centroCosto?: { nombre: string } | null
  categoriaCosto: string
  moneda: string
  condicionPago: string
  subtotal: number
  igv: number
  total: number
  estado: string
  lugarEntrega: string | null
  observaciones: string | null
  fechaEmision: string
  items?: {
    codigo: string
    descripcion: string
    unidad: string
    cantidad: number
    precioUnitario: number
    costoTotal: number
    cantidadRecibida: number
  }[]
}

const ESTADOS_OC = ['borrador', 'aprobada', 'enviada', 'confirmada', 'parcial', 'completada', 'cancelada']
const CATEGORIAS_VALIDAS = ['equipos', 'servicios', 'gastos']
const MONEDAS_VALIDAS = ['PEN', 'USD']
const CONDICIONES_VALIDAS = ['contado', 'credito_15', 'credito_30', 'credito_45', 'credito_60', 'credito_90']

// ============================================
// LEER EXCEL
// ============================================
export async function leerExcelOC(file: File): Promise<any[]> {
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
// VALIDAR FILAS Y AGRUPAR EN OCs
// ============================================
export function validarOCImport(
  rows: any[],
  proveedores: ProveedorRef[],
  proyectos: ProyectoRef[],
  centrosCosto: CentroCostoRef[]
): OCImportResult {
  const erroresGlobales: string[] = []

  if (rows.length === 0) {
    erroresGlobales.push('El archivo está vacío o no tiene datos válidos')
    return { grupos: [], erroresGlobales, totalItems: 0, totalOCs: 0, totalValidos: 0, totalInvalidos: 0 }
  }

  // Mapas de búsqueda
  const proveedorPorRuc = new Map<string, ProveedorRef>()
  for (const p of proveedores) {
    if (p.ruc) proveedorPorRuc.set(p.ruc.trim(), p)
  }
  const proyectoPorCodigo = new Map<string, ProyectoRef>()
  for (const p of proyectos) {
    proyectoPorCodigo.set(p.codigo.toLowerCase().trim(), p)
  }
  const ccPorNombre = new Map<string, CentroCostoRef>()
  for (const cc of centrosCosto) {
    ccPorNombre.set(cc.nombre.toLowerCase().trim(), cc)
  }

  // Paso 1: Parsear todas las filas
  const parsedRows: OCValidatedRow[] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const fila = i + 2
    const errores: string[] = []

    const grupoRaw = row['Grupo OC'] || row['grupo'] || ''
    const grupo = parseInt(String(grupoRaw).trim()) || 0
    if (grupo <= 0) {
      errores.push('Grupo OC debe ser un número positivo (1, 2, 3...)')
    }

    const proveedorRuc = String(row['RUC Proveedor'] || row['proveedorRuc'] || '').trim()
    const proveedorNombre = String(row['Proveedor'] || row['proveedorNombre'] || '').trim()
    const proyectoCodigo = String(row['Código Proyecto'] || row['proyectoCodigo'] || '').trim()
    const centroCostoNombre = String(row['Centro Costo'] || row['centroCostoNombre'] || '').trim()
    const categoriaCosto = String(row['Categoría'] || row['categoriaCosto'] || 'equipos').trim().toLowerCase()
    const moneda = String(row['Moneda'] || row['moneda'] || 'PEN').trim().toUpperCase()
    const condicionPago = String(row['Condición Pago'] || row['condicionPago'] || 'contado').trim().toLowerCase()
    const lugarEntrega = String(row['Lugar Entrega'] || row['lugarEntrega'] || '').trim()
    const observaciones = String(row['Observaciones'] || row['observaciones'] || '').trim()

    const codigoItem = String(row['Código Item'] || row['codigoItem'] || '').trim()
    const descripcionItem = String(row['Descripción Item'] || row['descripcionItem'] || '').trim()
    const unidad = String(row['Unidad'] || row['unidad'] || '').trim()
    const cantidadRaw = row['Cantidad'] || row['cantidad']
    const precioRaw = row['Precio Unitario'] || row['precioUnitario']

    // Validar item
    if (!codigoItem) errores.push('Código Item es requerido')
    if (!descripcionItem) errores.push('Descripción Item es requerida')
    if (!unidad) errores.push('Unidad es requerida')

    const cantidad = parseFloat(String(cantidadRaw || '0').replace(/,/g, ''))
    if (isNaN(cantidad) || cantidad <= 0) {
      errores.push('Cantidad debe ser mayor a 0')
    }

    const precioUnitario = parseFloat(String(precioRaw || '0').replace(/,/g, ''))
    if (isNaN(precioUnitario) || precioUnitario <= 0) {
      errores.push('Precio Unitario debe ser mayor a 0')
    }

    // Validar RUC
    if (!proveedorRuc) {
      errores.push('RUC Proveedor es requerido')
    } else if (!/^\d{11}$/.test(proveedorRuc)) {
      errores.push(`RUC "${proveedorRuc}" inválido (debe ser 11 dígitos)`)
    }

    let proveedorId: string | undefined
    if (proveedorRuc && /^\d{11}$/.test(proveedorRuc)) {
      const prov = proveedorPorRuc.get(proveedorRuc)
      if (prov) {
        proveedorId = prov.id
      } else {
        errores.push(`Proveedor con RUC ${proveedorRuc} no encontrado`)
      }
    }

    // Validar moneda
    if (!MONEDAS_VALIDAS.includes(moneda)) {
      errores.push(`Moneda "${moneda}" inválida. Use: PEN o USD`)
    }

    // Validar categoría
    if (!CATEGORIAS_VALIDAS.includes(categoriaCosto)) {
      errores.push(`Categoría "${categoriaCosto}" inválida. Use: ${CATEGORIAS_VALIDAS.join(', ')}`)
    }

    // Validar condición de pago
    if (!CONDICIONES_VALIDAS.includes(condicionPago)) {
      errores.push(`Condición "${condicionPago}" inválida. Use: ${CONDICIONES_VALIDAS.join(', ')}`)
    }

    // Validar proyecto o centro costo
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
        if (!cc.activo) {
          errores.push(`Centro Costo "${centroCostoNombre}" está inactivo`)
        } else {
          centroCostoId = cc.id
        }
      } else {
        errores.push(`Centro Costo "${centroCostoNombre}" no encontrado`)
      }
    }

    const costoTotal = cantidad * precioUnitario

    parsedRows.push({
      fila,
      grupo,
      proveedorRuc,
      proveedorNombre,
      proyectoCodigo,
      centroCostoNombre,
      categoriaCosto,
      moneda,
      condicionPago,
      lugarEntrega,
      observaciones,
      codigoItem,
      descripcionItem,
      unidad,
      cantidad,
      precioUnitario,
      costoTotal,
      proveedorId,
      proyectoId,
      centroCostoId,
      errores,
    })
  }

  // Paso 2: Agrupar por "Grupo OC"
  const gruposMap = new Map<number, OCValidatedRow[]>()
  for (const row of parsedRows) {
    if (row.grupo > 0) {
      const list = gruposMap.get(row.grupo) || []
      list.push(row)
      gruposMap.set(row.grupo, list)
    }
  }

  // Paso 3: Validar cada grupo y construir resultado
  const grupos: OCGroupValidated[] = []
  let totalValidos = 0
  let totalInvalidos = 0

  const sortedKeys = Array.from(gruposMap.keys()).sort((a, b) => a - b)

  for (const grupoNum of sortedKeys) {
    const items = gruposMap.get(grupoNum)!
    const first = items[0]
    const erroresGrupo: string[] = []

    // Verificar consistencia de datos OC dentro del grupo
    for (let i = 1; i < items.length; i++) {
      const item = items[i]
      if (item.proveedorRuc !== first.proveedorRuc) {
        erroresGrupo.push(`Fila ${item.fila}: RUC Proveedor difiere del primero del grupo`)
      }
      if (item.moneda !== first.moneda) {
        erroresGrupo.push(`Fila ${item.fila}: Moneda difiere del primero del grupo`)
      }
      if (item.proyectoCodigo !== first.proyectoCodigo) {
        erroresGrupo.push(`Fila ${item.fila}: Proyecto difiere del primero del grupo`)
      }
      if (item.centroCostoNombre !== first.centroCostoNombre) {
        erroresGrupo.push(`Fila ${item.fila}: Centro Costo difiere del primero del grupo`)
      }
    }

    // Verificar si algún item tiene errores
    const tieneErroresItem = items.some(it => it.errores.length > 0)

    const grupoValido = erroresGrupo.length === 0 && !tieneErroresItem

    if (grupoValido) {
      totalValidos++
    } else {
      totalInvalidos++
    }

    grupos.push({
      grupo: grupoNum,
      proveedorId: first.proveedorId || '',
      proveedorRuc: first.proveedorRuc,
      proveedorNombre: first.proveedorNombre,
      proyectoId: first.proyectoId || null,
      centroCostoId: first.centroCostoId || null,
      categoriaCosto: first.categoriaCosto,
      moneda: first.moneda,
      condicionPago: first.condicionPago,
      lugarEntrega: first.lugarEntrega,
      observaciones: first.observaciones,
      items,
      erroresGrupo,
    })
  }

  return {
    grupos,
    erroresGlobales,
    totalItems: parsedRows.length,
    totalOCs: grupos.length,
    totalValidos,
    totalInvalidos,
  }
}

// ============================================
// GENERAR PLANTILLA
// ============================================
export async function generarPlantillaOC() {
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()

  const ws = wb.addWorksheet('Órdenes de Compra')
  ws.columns = [
    { header: 'Grupo OC', key: 'grupo', width: 10 },
    { header: 'RUC Proveedor', key: 'ruc', width: 15 },
    { header: 'Proveedor', key: 'proveedor', width: 25 },
    { header: 'Código Proyecto', key: 'proyecto', width: 16 },
    { header: 'Centro Costo', key: 'cc', width: 20 },
    { header: 'Categoría', key: 'categoria', width: 12 },
    { header: 'Moneda', key: 'moneda', width: 10 },
    { header: 'Condición Pago', key: 'condicionPago', width: 16 },
    { header: 'Lugar Entrega', key: 'lugarEntrega', width: 20 },
    { header: 'Observaciones', key: 'observaciones', width: 25 },
    { header: 'Código Item', key: 'codigoItem', width: 14 },
    { header: 'Descripción Item', key: 'descripcionItem', width: 35 },
    { header: 'Unidad', key: 'unidad', width: 10 },
    { header: 'Cantidad', key: 'cantidad', width: 12 },
    { header: 'Precio Unitario', key: 'precioUnitario', width: 15 },
  ]

  // Estilo header
  ws.getRow(1).font = { bold: true }
  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3E0' } }

  // Ejemplo OC 1 con 2 items
  ws.addRow({
    grupo: 1,
    ruc: '20100047218',
    proveedor: 'Siemens S.A.C.',
    proyecto: 'PRY-001',
    cc: '',
    categoria: 'equipos',
    moneda: 'USD',
    condicionPago: 'credito_30',
    lugarEntrega: 'Obra Miraflores',
    observaciones: 'Urgente',
    codigoItem: 'EQ-001',
    descripcionItem: 'Sensor de temperatura PT100',
    unidad: 'und',
    cantidad: 10,
    precioUnitario: 85.00,
  })
  ws.addRow({
    grupo: 1,
    ruc: '20100047218',
    proveedor: 'Siemens S.A.C.',
    proyecto: 'PRY-001',
    cc: '',
    categoria: 'equipos',
    moneda: 'USD',
    condicionPago: 'credito_30',
    lugarEntrega: 'Obra Miraflores',
    observaciones: 'Urgente',
    codigoItem: 'EQ-002',
    descripcionItem: 'Cable termopar tipo K 50m',
    unidad: 'rollo',
    cantidad: 5,
    precioUnitario: 120.00,
  })

  // Ejemplo OC 2 con 1 item
  ws.addRow({
    grupo: 2,
    ruc: '20505678901',
    proveedor: 'Distribuidora ABC',
    proyecto: '',
    cc: 'Administración',
    categoria: 'gastos',
    moneda: 'PEN',
    condicionPago: 'contado',
    lugarEntrega: '',
    observaciones: '',
    codigoItem: 'MAT-010',
    descripcionItem: 'Papel Bond A4 x 500 hojas',
    unidad: 'millar',
    cantidad: 20,
    precioUnitario: 25.00,
  })

  // Estilo filas ejemplo
  for (let row = 2; row <= 4; row++) {
    ws.getRow(row).font = { italic: true, color: { argb: 'FF999999' } }
  }

  // Data validations
  const maxRow = 500
  for (let row = 2; row <= maxRow; row++) {
    // Categoría (F)
    ws.getCell(`F${row}`).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: ['"equipos,servicios,gastos"'],
      showErrorMessage: true,
      errorTitle: 'Categoría inválida',
      error: 'Use: equipos, servicios o gastos',
    }
    // Moneda (G)
    ws.getCell(`G${row}`).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: ['"PEN,USD"'],
      showErrorMessage: true,
      errorTitle: 'Moneda inválida',
      error: 'Use PEN o USD',
    }
    // Condición Pago (H)
    ws.getCell(`H${row}`).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: ['"contado,credito_15,credito_30,credito_45,credito_60,credito_90"'],
      showErrorMessage: true,
      errorTitle: 'Condición inválida',
      error: 'Seleccione una condición de pago válida',
    }
  }

  // Hoja de instrucciones
  const wsInfo = wb.addWorksheet('Instrucciones')
  wsInfo.columns = [
    { header: 'Campo', key: 'campo', width: 20 },
    { header: 'Requerido', key: 'requerido', width: 12 },
    { header: 'Descripción', key: 'descripcion', width: 70 },
  ]
  wsInfo.getRow(1).font = { bold: true }
  wsInfo.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3E0' } }

  const instrucciones = [
    ['Grupo OC', 'Sí', 'Número que agrupa filas en la misma OC. Filas con mismo número → misma orden. Ej: 1, 1, 2 = 2 OCs (1ra con 2 items).'],
    ['RUC Proveedor', 'Sí', 'RUC de 11 dígitos. El proveedor debe existir en el sistema.'],
    ['Proveedor', 'No', 'Nombre referencial (no se usa para importar).'],
    ['Código Proyecto', 'Condicional', 'Código del proyecto. Requerido si no indica Centro Costo. No poner ambos.'],
    ['Centro Costo', 'Condicional', 'Nombre del centro de costo. Requerido si no indica Proyecto. No poner ambos.'],
    ['Categoría', 'No', 'equipos (defecto), servicios, gastos'],
    ['Moneda', 'No', 'PEN (defecto) o USD. IGV se calcula automático (18% en PEN, 0 en USD).'],
    ['Condición Pago', 'No', 'contado (defecto), credito_15, credito_30, credito_45, credito_60, credito_90'],
    ['Lugar Entrega', 'No', 'Dirección o referencia de entrega.'],
    ['Observaciones', 'No', 'Texto libre para la OC.'],
    ['Código Item', 'Sí', 'Código del producto o servicio.'],
    ['Descripción Item', 'Sí', 'Descripción del producto o servicio.'],
    ['Unidad', 'Sí', 'Unidad de medida (und, kg, m, glb, etc.).'],
    ['Cantidad', 'Sí', 'Cantidad a comprar. Debe ser mayor a 0.'],
    ['Precio Unitario', 'Sí', 'Precio unitario sin IGV. Debe ser mayor a 0.'],
  ]
  for (const [campo, req, desc] of instrucciones) {
    wsInfo.addRow({ campo, requerido: req, descripcion: desc })
  }

  // Descargar
  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'Plantilla_OrdenesCompra.xlsx'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// ============================================
// EXPORTAR TABLA A EXCEL
// ============================================
export async function exportarOCAExcel(ordenes: OCExportRow[]) {
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()

  const ws = wb.addWorksheet('Órdenes de Compra')
  ws.columns = [
    { header: 'Número OC', key: 'numero', width: 18 },
    { header: 'Proveedor', key: 'proveedor', width: 28 },
    { header: 'RUC', key: 'ruc', width: 15 },
    { header: 'Asignado a', key: 'asignado', width: 20 },
    { header: 'Categoría', key: 'categoria', width: 12 },
    { header: 'Moneda', key: 'moneda', width: 10 },
    { header: 'Condición Pago', key: 'condicionPago', width: 16 },
    { header: 'Estado', key: 'estado', width: 12 },
    { header: 'Código Item', key: 'codigoItem', width: 14 },
    { header: 'Descripción Item', key: 'descripcionItem', width: 35 },
    { header: 'Unidad', key: 'unidad', width: 10 },
    { header: 'Cantidad', key: 'cantidad', width: 12 },
    { header: 'P. Unitario', key: 'precioUnitario', width: 14 },
    { header: 'Costo Total', key: 'costoTotal', width: 14 },
    { header: 'Cant. Recibida', key: 'cantRecibida', width: 14 },
    { header: 'Subtotal OC', key: 'subtotal', width: 14 },
    { header: 'IGV', key: 'igv', width: 12 },
    { header: 'Total OC', key: 'total', width: 14 },
    { header: 'Fecha Emisión', key: 'fechaEmision', width: 14 },
    { header: 'Lugar Entrega', key: 'lugarEntrega', width: 20 },
    { header: 'Observaciones', key: 'observaciones', width: 25 },
  ]

  ws.getRow(1).font = { bold: true }
  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3E0' } }

  for (const oc of ordenes) {
    const asignado = oc.proyecto ? `${oc.proyecto.codigo} - ${oc.proyecto.nombre}` : oc.centroCosto?.nombre || ''

    if (!oc.items || oc.items.length === 0) {
      ws.addRow({
        numero: oc.numero,
        proveedor: oc.proveedor?.nombre || '',
        ruc: oc.proveedor?.ruc || '',
        asignado,
        categoria: oc.categoriaCosto,
        moneda: oc.moneda,
        condicionPago: oc.condicionPago,
        estado: oc.estado,
        codigoItem: '',
        descripcionItem: '(sin items)',
        unidad: '',
        cantidad: '',
        precioUnitario: '',
        costoTotal: '',
        cantRecibida: '',
        subtotal: oc.subtotal,
        igv: oc.igv,
        total: oc.total,
        fechaEmision: formatDateExcel(oc.fechaEmision),
        lugarEntrega: oc.lugarEntrega || '',
        observaciones: oc.observaciones || '',
      })
    } else {
      for (let i = 0; i < oc.items.length; i++) {
        const item = oc.items[i]
        ws.addRow({
          numero: i === 0 ? oc.numero : '',
          proveedor: i === 0 ? (oc.proveedor?.nombre || '') : '',
          ruc: i === 0 ? (oc.proveedor?.ruc || '') : '',
          asignado: i === 0 ? asignado : '',
          categoria: i === 0 ? oc.categoriaCosto : '',
          moneda: i === 0 ? oc.moneda : '',
          condicionPago: i === 0 ? oc.condicionPago : '',
          estado: i === 0 ? oc.estado : '',
          codigoItem: item.codigo,
          descripcionItem: item.descripcion,
          unidad: item.unidad,
          cantidad: item.cantidad,
          precioUnitario: item.precioUnitario,
          costoTotal: item.costoTotal,
          cantRecibida: item.cantidadRecibida,
          subtotal: i === 0 ? oc.subtotal : '',
          igv: i === 0 ? oc.igv : '',
          total: i === 0 ? oc.total : '',
          fechaEmision: i === 0 ? formatDateExcel(oc.fechaEmision) : '',
          lugarEntrega: i === 0 ? (oc.lugarEntrega || '') : '',
          observaciones: i === 0 ? (oc.observaciones || '') : '',
        })
      }
    }
  }

  // Formato montos
  const totalRows = ws.rowCount
  for (let row = 2; row <= totalRows; row++) {
    for (const col of ['L', 'M', 'N', 'O', 'P', 'Q', 'R']) {
      const cell = ws.getCell(`${col}${row}`)
      if (typeof cell.value === 'number') {
        cell.numFmt = '#,##0.00'
      }
    }
  }

  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `OrdenesCompra_${new Date().toISOString().split('T')[0]}.xlsx`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// ============================================
// HELPERS
// ============================================
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
