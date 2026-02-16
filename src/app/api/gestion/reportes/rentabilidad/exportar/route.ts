import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { calcularCostosLaborales } from '@/lib/utils/costosLaborales'

const ROLES_ALLOWED = ['admin', 'gerente', 'gestor']

function convertir(amount: number, fromMoneda: string, toMoneda: string, tipoCambio: number): number {
  if (fromMoneda === toMoneda) return amount
  if (fromMoneda === 'PEN' && toMoneda === 'USD') return amount / tipoCambio
  if (fromMoneda === 'USD' && toMoneda === 'PEN') return amount * tipoCambio
  return amount
}

const round2 = (n: number) => Math.round(n * 100) / 100

function costoHoraPEN(
  emp: { sueldoPlanilla: number | null; sueldoHonorarios: number | null; asignacionFamiliar: number; emo: number },
  horasMensuales: number
): number {
  const costos = calcularCostosLaborales({
    sueldoPlanilla: emp.sueldoPlanilla || 0,
    sueldoHonorarios: emp.sueldoHonorarios || 0,
    asignacionFamiliar: emp.asignacionFamiliar || 0,
    emo: emp.emo || 25,
  })
  return horasMensuales > 0 ? costos.totalMensual / horasMensuales : 0
}

function fmtDate(d: Date | string | null): string {
  if (!d) return ''
  const date = typeof d === 'string' ? new Date(d) : d
  if (isNaN(date.getTime())) return ''
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 })
    }
    if (!ROLES_ALLOWED.includes(session.user.role)) {
      return new Response(JSON.stringify({ error: 'Sin permisos' }), { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const proyectoId = searchParams.get('proyectoId')
    if (!proyectoId) {
      return new Response(JSON.stringify({ error: 'proyectoId requerido' }), { status: 400 })
    }

    // System config
    const config = await prisma.configuracionGeneral.findFirst()
    const tcDefault = config ? Number(config.tipoCambio) : 3.75
    const horasMes = config?.horasMensuales || 192

    // Parallel queries
    const [
      proyecto,
      ocsByCurrency,
      costoSnapshotRaw,
      horasSinSnapshot,
      gastosByCurrency,
      valorizaciones,
      cuentasCobrar,
      ordenesCompra,
      cuentasPagar,
      hojasGastos,
    ] = await Promise.all([
      // 1. Project
      prisma.proyecto.findUnique({
        where: { id: proyectoId },
        select: {
          id: true, codigo: true, nombre: true, moneda: true, tipoCambio: true,
          estado: true, totalCliente: true,
          totalEquiposInterno: true, totalServiciosInterno: true, totalGastosInterno: true,
          cliente: { select: { nombre: true } },
        },
      }),
      // 2. OCs grouped by currency (for cost calc)
      prisma.ordenCompra.groupBy({
        by: ['moneda'],
        where: { proyectoId, estado: { not: 'cancelada' } },
        _sum: { total: true },
      }),
      // 3. Snapshot service cost
      prisma.$queryRaw<{ total: number }[]>`
        SELECT COALESCE(SUM("horasTrabajadas" * "costoHora"), 0) as "total"
        FROM registro_horas
        WHERE "proyectoId" = ${proyectoId} AND "costoHora" IS NOT NULL
      `,
      // 4. Fallback hours
      prisma.registroHoras.groupBy({
        by: ['usuarioId'],
        where: { proyectoId, costoHora: null },
        _sum: { horasTrabajadas: true },
      }),
      // 5. Gastos by currency
      prisma.$queryRaw<{ moneda: string; total: number }[]>`
        SELECT gl."moneda", COALESCE(SUM(gl."monto"), 0) as "total"
        FROM gasto_linea gl
        JOIN hoja_de_gastos hdg ON gl."hojaDeGastosId" = hdg."id"
        WHERE hdg."proyectoId" = ${proyectoId} AND hdg."estado" IN ('validado', 'cerrado')
        GROUP BY gl."moneda"
      `,
      // 6. Valorizaciones
      prisma.valorizacion.findMany({
        where: { proyectoId },
        select: {
          codigo: true, numero: true, periodoInicio: true, periodoFin: true,
          montoValorizacion: true, estado: true, netoARecibir: true, moneda: true,
        },
        orderBy: { numero: 'asc' },
      }),
      // 7. CxC with pagos
      prisma.cuentaPorCobrar.findMany({
        where: { proyectoId },
        select: {
          numeroDocumento: true, descripcion: true, monto: true, montoPagado: true,
          saldoPendiente: true, estado: true, moneda: true, fechaEmision: true,
          pagos: { select: { monto: true, fechaPago: true, medioPago: true, numeroOperacion: true } },
        },
        orderBy: { fechaEmision: 'asc' },
      }),
      // 8. OCs detail
      prisma.ordenCompra.findMany({
        where: { proyectoId },
        select: {
          numero: true, total: true, estado: true, moneda: true,
          proveedor: { select: { nombre: true } },
        },
        orderBy: { createdAt: 'asc' },
      }),
      // 9. CxP with pagos
      prisma.cuentaPorPagar.findMany({
        where: { proyectoId },
        select: {
          numeroFactura: true, descripcion: true, monto: true, montoPagado: true,
          saldoPendiente: true, estado: true, moneda: true, fechaRecepcion: true,
          proveedor: { select: { nombre: true } },
          pagos: { select: { monto: true, fechaPago: true, medioPago: true, numeroOperacion: true } },
        },
        orderBy: { fechaRecepcion: 'asc' },
      }),
      // 10. Hojas de gastos
      prisma.hojaDeGastos.findMany({
        where: { proyectoId },
        select: {
          numero: true, montoGastado: true, estado: true, motivo: true,
          empleado: { select: { name: true } },
        },
        orderBy: { createdAt: 'asc' },
      }),
    ])

    if (!proyecto) {
      return new Response(JSON.stringify({ error: 'Proyecto no encontrado' }), { status: 404 })
    }

    const monedaProy = proyecto.moneda || 'USD'
    const tc = proyecto.tipoCambio || tcDefault
    const simbolo = monedaProy === 'USD' ? 'USD' : 'PEN'

    // Calculate costs (same logic as existing route.ts)
    let costoEquipos = 0
    for (const oc of ocsByCurrency) {
      costoEquipos += convertir(oc._sum.total || 0, oc.moneda, monedaProy, tc)
    }

    const costoSnapshotPEN = Number(costoSnapshotRaw[0]?.total || 0)
    let costoFallbackPEN = 0
    if (horasSinSnapshot.length > 0) {
      const userIds = horasSinSnapshot.map(h => h.usuarioId)
      const empleados = await prisma.empleado.findMany({
        where: { userId: { in: userIds } },
        select: { userId: true, sueldoPlanilla: true, sueldoHonorarios: true, asignacionFamiliar: true, emo: true },
      })
      const empMap = new Map(empleados.map(e => [e.userId, e]))
      for (const h of horasSinSnapshot) {
        const emp = empMap.get(h.usuarioId)
        if (emp) costoFallbackPEN += (h._sum.horasTrabajadas || 0) * costoHoraPEN(emp, horasMes)
      }
    }
    const costoServicios = convertir(costoSnapshotPEN + costoFallbackPEN, 'PEN', monedaProy, tc)

    let costoGastos = 0
    for (const g of gastosByCurrency) {
      costoGastos += convertir(Number(g.total), g.moneda, monedaProy, tc)
    }

    costoEquipos = round2(costoEquipos)
    const costoServiciosR = round2(costoServicios)
    costoGastos = round2(costoGastos)

    const ingreso = proyecto.totalCliente
    const costoTotal = round2(costoEquipos + costoServiciosR + costoGastos)
    const presupuestoTotal = round2(proyecto.totalEquiposInterno + proyecto.totalServiciosInterno + proyecto.totalGastosInterno)
    const margen = round2(ingreso - costoTotal)
    const margenPct = ingreso > 0 ? round2((margen / ingreso) * 100) : 0

    // ==================== BUILD EXCEL ====================
    const ExcelJS = (await import('exceljs')).default
    const wb = new ExcelJS.Workbook()
    wb.creator = 'GySControl'
    wb.created = new Date()

    const HEADER_FILL: any = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } }
    const HEADER_FONT: any = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 }
    const SECTION_FILL: any = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } }
    const TOTAL_FILL: any = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } }
    const NUM_FMT = '#,##0.00'
    const THIN_BORDER: any = {
      top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
      bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
      left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
      right: { style: 'thin', color: { argb: 'FFD1D5DB' } },
    }

    function applyHeaderRow(ws: any, rowNum: number, colCount: number) {
      const row = ws.getRow(rowNum)
      row.font = HEADER_FONT
      row.fill = HEADER_FILL
      row.alignment = { vertical: 'middle' }
      for (let c = 1; c <= colCount; c++) {
        row.getCell(c).border = THIN_BORDER
      }
      row.height = 22
    }

    function applySectionTitle(ws: any, rowNum: number, title: string, colSpan: number) {
      const row = ws.getRow(rowNum)
      ws.mergeCells(rowNum, 1, rowNum, colSpan)
      row.getCell(1).value = title
      row.getCell(1).font = { bold: true, size: 11, color: { argb: 'FF1F2937' } }
      row.getCell(1).fill = SECTION_FILL
      row.getCell(1).border = THIN_BORDER
      row.height = 24
    }

    // ==================== HOJA 1: RESUMEN P&L ====================
    const ws1 = wb.addWorksheet('Resumen P&L')
    ws1.columns = [
      { width: 25 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 15 },
    ]

    // Project header
    ws1.mergeCells('A1:E1')
    const titleCell = ws1.getCell('A1')
    titleCell.value = `REPORTE P&L — ${proyecto.codigo}`
    titleCell.font = { bold: true, size: 14, color: { argb: 'FF1F2937' } }
    titleCell.alignment = { horizontal: 'left', vertical: 'middle' }
    ws1.getRow(1).height = 30

    const infoData = [
      ['Proyecto:', `${proyecto.codigo} - ${proyecto.nombre}`],
      ['Cliente:', proyecto.cliente?.nombre || '-'],
      ['Moneda:', simbolo],
      ['Estado:', proyecto.estado],
    ]
    let r = 3
    for (const [label, val] of infoData) {
      ws1.getCell(`A${r}`).value = label
      ws1.getCell(`A${r}`).font = { bold: true, size: 10 }
      ws1.getCell(`B${r}`).value = val
      ws1.getCell(`B${r}`).font = { size: 10 }
      r++
    }

    // P&L Table
    r += 1
    applySectionTitle(ws1, r, 'ESTADO DE RESULTADOS', 5)
    r++

    // Headers
    ws1.getRow(r).values = ['Concepto', 'Presupuesto', 'Real', 'Diferencia', 'Estado']
    applyHeaderRow(ws1, r, 5)
    ws1.getCell(`B${r}`).alignment = { horizontal: 'right', vertical: 'middle' }
    ws1.getCell(`C${r}`).alignment = { horizontal: 'right', vertical: 'middle' }
    ws1.getCell(`D${r}`).alignment = { horizontal: 'right', vertical: 'middle' }
    ws1.getCell(`E${r}`).alignment = { horizontal: 'center', vertical: 'middle' }
    r++

    // Ingreso row
    const ingresoRow = ws1.getRow(r)
    ingresoRow.values = ['Ingreso (Contrato)', ingreso, ingreso, 0, '-']
    ingresoRow.font = { bold: true, size: 10 }
    ingresoRow.getCell(2).numFmt = NUM_FMT
    ingresoRow.getCell(3).numFmt = NUM_FMT
    ingresoRow.getCell(4).numFmt = NUM_FMT
    for (let c = 1; c <= 5; c++) ingresoRow.getCell(c).border = THIN_BORDER
    r++

    // Blank separator
    ws1.getRow(r).values = ['']
    r++

    // Cost categories
    const costRows = [
      { label: 'Equipos', presup: proyecto.totalEquiposInterno, real: costoEquipos },
      { label: 'Servicios', presup: proyecto.totalServiciosInterno, real: costoServiciosR },
      { label: 'Gastos Operativos', presup: proyecto.totalGastosInterno, real: costoGastos },
    ]
    for (const cr of costRows) {
      const dif = round2(cr.presup - cr.real)
      const estado = dif > 0 ? 'Ahorro' : dif < 0 ? 'Sobrecosto' : 'En línea'
      const row = ws1.getRow(r)
      row.values = [cr.label, cr.presup, cr.real, dif, estado]
      row.getCell(2).numFmt = NUM_FMT
      row.getCell(3).numFmt = NUM_FMT
      row.getCell(4).numFmt = NUM_FMT
      row.getCell(4).font = { color: { argb: dif >= 0 ? 'FF059669' : 'FFDC2626' } }
      row.getCell(5).font = { color: { argb: dif >= 0 ? 'FF059669' : 'FFDC2626' } }
      row.getCell(5).alignment = { horizontal: 'center' }
      for (let c = 1; c <= 5; c++) row.getCell(c).border = THIN_BORDER
      r++
    }

    // Total Costos
    const difTotal = round2(presupuestoTotal - costoTotal)
    const totalRow = ws1.getRow(r)
    totalRow.values = ['TOTAL COSTOS', presupuestoTotal, costoTotal, difTotal, difTotal >= 0 ? 'Ahorro' : 'Sobrecosto']
    totalRow.font = { bold: true, size: 10 }
    totalRow.fill = TOTAL_FILL
    totalRow.getCell(2).numFmt = NUM_FMT
    totalRow.getCell(3).numFmt = NUM_FMT
    totalRow.getCell(4).numFmt = NUM_FMT
    totalRow.getCell(4).font = { bold: true, color: { argb: difTotal >= 0 ? 'FF059669' : 'FFDC2626' } }
    totalRow.getCell(5).font = { bold: true, color: { argb: difTotal >= 0 ? 'FF059669' : 'FFDC2626' } }
    totalRow.getCell(5).alignment = { horizontal: 'center' }
    for (let c = 1; c <= 5; c++) totalRow.getCell(c).border = THIN_BORDER
    r += 2

    // Margen
    const margenRow = ws1.getRow(r)
    margenRow.values = ['MARGEN BRUTO', '', margen, '', `${margenPct}%`]
    margenRow.font = { bold: true, size: 12 }
    margenRow.getCell(3).numFmt = NUM_FMT
    margenRow.getCell(3).font = { bold: true, size: 12, color: { argb: margen >= 0 ? 'FF059669' : 'FFDC2626' } }
    margenRow.getCell(5).font = { bold: true, size: 12, color: { argb: margenPct >= 0 ? 'FF059669' : 'FFDC2626' } }
    margenRow.getCell(5).alignment = { horizontal: 'center' }

    // ==================== HOJA 2: DETALLE INGRESOS ====================
    const ws2 = wb.addWorksheet('Detalle Ingresos')
    ws2.columns = [
      { width: 20 }, { width: 8 }, { width: 14 }, { width: 14 }, { width: 16 },
      { width: 14 }, { width: 12 }, { width: 16 },
    ]

    let r2 = 1
    applySectionTitle(ws2, r2, 'VALORIZACIONES', 8)
    r2++
    ws2.getRow(r2).values = ['Código', 'N°', 'Periodo Inicio', 'Periodo Fin', 'Monto', 'Neto a Recibir', 'Estado', 'Moneda']
    applyHeaderRow(ws2, r2, 8)
    for (const col of [5, 6]) ws2.getCell(r2, col).alignment = { horizontal: 'right', vertical: 'middle' }
    r2++

    let totalValMonto = 0
    let totalValNeto = 0
    for (const v of valorizaciones) {
      const row = ws2.getRow(r2)
      row.values = [
        v.codigo, v.numero, fmtDate(v.periodoInicio), fmtDate(v.periodoFin),
        v.montoValorizacion, v.netoARecibir, v.estado, v.moneda,
      ]
      row.getCell(5).numFmt = NUM_FMT
      row.getCell(6).numFmt = NUM_FMT
      for (let c = 1; c <= 8; c++) row.getCell(c).border = THIN_BORDER
      totalValMonto += v.montoValorizacion
      totalValNeto += v.netoARecibir
      r2++
    }
    if (valorizaciones.length === 0) {
      ws2.getRow(r2).getCell(1).value = '(Sin valorizaciones)'
      ws2.getRow(r2).getCell(1).font = { italic: true, color: { argb: 'FF9CA3AF' } }
      r2++
    }
    // Totals
    const valTotalRow = ws2.getRow(r2)
    valTotalRow.values = ['TOTAL', '', '', '', totalValMonto, totalValNeto, '', '']
    valTotalRow.font = { bold: true }
    valTotalRow.fill = TOTAL_FILL
    valTotalRow.getCell(5).numFmt = NUM_FMT
    valTotalRow.getCell(6).numFmt = NUM_FMT
    for (let c = 1; c <= 8; c++) valTotalRow.getCell(c).border = THIN_BORDER
    r2 += 2

    // CxC section
    applySectionTitle(ws2, r2, 'CUENTAS POR COBRAR', 8)
    r2++
    ws2.getRow(r2).values = ['N° Documento', 'Descripción', '', 'Monto', 'Pagado', 'Saldo Pendiente', 'Estado', 'Fecha Emisión']
    ws2.mergeCells(r2, 2, r2, 3)
    applyHeaderRow(ws2, r2, 8)
    for (const col of [4, 5, 6]) ws2.getCell(r2, col).alignment = { horizontal: 'right', vertical: 'middle' }
    r2++

    let totalCxcMonto = 0
    let totalCxcSaldo = 0
    for (const cxc of cuentasCobrar) {
      const row = ws2.getRow(r2)
      row.values = [
        cxc.numeroDocumento || '-', cxc.descripcion || '', '', cxc.monto,
        cxc.montoPagado, cxc.saldoPendiente, cxc.estado, fmtDate(cxc.fechaEmision),
      ]
      ws2.mergeCells(r2, 2, r2, 3)
      row.getCell(4).numFmt = NUM_FMT
      row.getCell(5).numFmt = NUM_FMT
      row.getCell(6).numFmt = NUM_FMT
      for (let c = 1; c <= 8; c++) row.getCell(c).border = THIN_BORDER
      totalCxcMonto += cxc.monto
      totalCxcSaldo += cxc.saldoPendiente
      r2++
    }
    if (cuentasCobrar.length === 0) {
      ws2.getRow(r2).getCell(1).value = '(Sin cuentas por cobrar)'
      ws2.getRow(r2).getCell(1).font = { italic: true, color: { argb: 'FF9CA3AF' } }
      r2++
    }
    const cxcTotalRow = ws2.getRow(r2)
    cxcTotalRow.values = ['TOTAL', '', '', totalCxcMonto, '', totalCxcSaldo, '', '']
    ws2.mergeCells(r2, 1, r2, 3)
    cxcTotalRow.font = { bold: true }
    cxcTotalRow.fill = TOTAL_FILL
    cxcTotalRow.getCell(4).numFmt = NUM_FMT
    cxcTotalRow.getCell(6).numFmt = NUM_FMT
    for (let c = 1; c <= 8; c++) cxcTotalRow.getCell(c).border = THIN_BORDER

    // ==================== HOJA 3: DETALLE EGRESOS ====================
    const ws3 = wb.addWorksheet('Detalle Egresos')
    ws3.columns = [
      { width: 18 }, { width: 22 }, { width: 16 }, { width: 14 }, { width: 14 },
      { width: 16 }, { width: 12 }, { width: 12 },
    ]

    let r3 = 1
    // OCs section
    applySectionTitle(ws3, r3, 'ÓRDENES DE COMPRA', 8)
    r3++
    ws3.getRow(r3).values = ['Número', 'Proveedor', 'Total', 'Estado', 'Moneda', '', '', '']
    applyHeaderRow(ws3, r3, 5)
    ws3.getCell(r3, 3).alignment = { horizontal: 'right', vertical: 'middle' }
    r3++

    let totalOC = 0
    for (const oc of ordenesCompra) {
      const row = ws3.getRow(r3)
      row.values = [oc.numero, oc.proveedor?.nombre || '-', oc.total, oc.estado, oc.moneda]
      row.getCell(3).numFmt = NUM_FMT
      for (let c = 1; c <= 5; c++) row.getCell(c).border = THIN_BORDER
      totalOC += oc.total
      r3++
    }
    if (ordenesCompra.length === 0) {
      ws3.getRow(r3).getCell(1).value = '(Sin órdenes de compra)'
      ws3.getRow(r3).getCell(1).font = { italic: true, color: { argb: 'FF9CA3AF' } }
      r3++
    }
    const ocTotalRow = ws3.getRow(r3)
    ocTotalRow.values = ['TOTAL', '', totalOC, '', '']
    ocTotalRow.font = { bold: true }
    ocTotalRow.fill = TOTAL_FILL
    ocTotalRow.getCell(3).numFmt = NUM_FMT
    for (let c = 1; c <= 5; c++) ocTotalRow.getCell(c).border = THIN_BORDER
    r3 += 2

    // CxP section
    applySectionTitle(ws3, r3, 'CUENTAS POR PAGAR', 8)
    r3++
    ws3.getRow(r3).values = ['N° Factura', 'Proveedor', 'Monto', 'Pagado', 'Saldo Pendiente', 'Estado', 'Moneda', 'Fecha Recepción']
    applyHeaderRow(ws3, r3, 8)
    for (const col of [3, 4, 5]) ws3.getCell(r3, col).alignment = { horizontal: 'right', vertical: 'middle' }
    r3++

    let totalCxpMonto = 0
    let totalCxpSaldo = 0
    for (const cxp of cuentasPagar) {
      const row = ws3.getRow(r3)
      row.values = [
        cxp.numeroFactura || '-', cxp.proveedor?.nombre || '-', cxp.monto,
        cxp.montoPagado, cxp.saldoPendiente, cxp.estado, cxp.moneda,
        fmtDate(cxp.fechaRecepcion),
      ]
      row.getCell(3).numFmt = NUM_FMT
      row.getCell(4).numFmt = NUM_FMT
      row.getCell(5).numFmt = NUM_FMT
      for (let c = 1; c <= 8; c++) row.getCell(c).border = THIN_BORDER
      totalCxpMonto += cxp.monto
      totalCxpSaldo += cxp.saldoPendiente
      r3++
    }
    if (cuentasPagar.length === 0) {
      ws3.getRow(r3).getCell(1).value = '(Sin cuentas por pagar)'
      ws3.getRow(r3).getCell(1).font = { italic: true, color: { argb: 'FF9CA3AF' } }
      r3++
    }
    const cxpTotalRow = ws3.getRow(r3)
    cxpTotalRow.values = ['TOTAL', '', totalCxpMonto, '', totalCxpSaldo, '', '', '']
    cxpTotalRow.font = { bold: true }
    cxpTotalRow.fill = TOTAL_FILL
    cxpTotalRow.getCell(3).numFmt = NUM_FMT
    cxpTotalRow.getCell(5).numFmt = NUM_FMT
    for (let c = 1; c <= 8; c++) cxpTotalRow.getCell(c).border = THIN_BORDER
    r3 += 2

    // Hojas de gastos section
    applySectionTitle(ws3, r3, 'HOJAS DE GASTOS', 8)
    r3++
    ws3.getRow(r3).values = ['Número', 'Empleado', 'Motivo', 'Monto Gastado', 'Estado', '', '', '']
    applyHeaderRow(ws3, r3, 5)
    ws3.getCell(r3, 4).alignment = { horizontal: 'right', vertical: 'middle' }
    r3++

    let totalHG = 0
    for (const hg of hojasGastos) {
      const row = ws3.getRow(r3)
      row.values = [hg.numero, hg.empleado?.name || '-', hg.motivo, hg.montoGastado, hg.estado]
      row.getCell(4).numFmt = NUM_FMT
      for (let c = 1; c <= 5; c++) row.getCell(c).border = THIN_BORDER
      totalHG += hg.montoGastado
      r3++
    }
    if (hojasGastos.length === 0) {
      ws3.getRow(r3).getCell(1).value = '(Sin hojas de gastos)'
      ws3.getRow(r3).getCell(1).font = { italic: true, color: { argb: 'FF9CA3AF' } }
      r3++
    }
    const hgTotalRow = ws3.getRow(r3)
    hgTotalRow.values = ['TOTAL', '', '', totalHG, '']
    hgTotalRow.font = { bold: true }
    hgTotalRow.fill = TOTAL_FILL
    hgTotalRow.getCell(4).numFmt = NUM_FMT
    for (let c = 1; c <= 5; c++) hgTotalRow.getCell(c).border = THIN_BORDER

    // ==================== HOJA 4: FLUJO DE CAJA ====================
    const ws4 = wb.addWorksheet('Flujo de Caja')
    ws4.columns = [
      { width: 14 }, { width: 10 }, { width: 35 }, { width: 16 }, { width: 16 },
    ]

    // Collect all payment movements
    interface Movimiento {
      fecha: Date
      tipo: 'Ingreso' | 'Egreso'
      concepto: string
      monto: number
    }
    const movimientos: Movimiento[] = []

    for (const cxc of cuentasCobrar) {
      for (const pago of cxc.pagos) {
        movimientos.push({
          fecha: new Date(pago.fechaPago),
          tipo: 'Ingreso',
          concepto: `Cobro CxC ${cxc.numeroDocumento || '(s/n)'}${pago.numeroOperacion ? ` — Op: ${pago.numeroOperacion}` : ''}`,
          monto: pago.monto,
        })
      }
    }

    for (const cxp of cuentasPagar) {
      for (const pago of cxp.pagos) {
        movimientos.push({
          fecha: new Date(pago.fechaPago),
          tipo: 'Egreso',
          concepto: `Pago CxP ${cxp.numeroFactura || '(s/n)'} — ${cxp.proveedor?.nombre || ''}${pago.numeroOperacion ? ` — Op: ${pago.numeroOperacion}` : ''}`,
          monto: pago.monto,
        })
      }
    }

    movimientos.sort((a, b) => a.fecha.getTime() - b.fecha.getTime())

    let r4 = 1
    applySectionTitle(ws4, r4, 'FLUJO DE CAJA', 5)
    r4++
    ws4.getRow(r4).values = ['Fecha', 'Tipo', 'Concepto', 'Monto', 'Saldo Acumulado']
    applyHeaderRow(ws4, r4, 5)
    ws4.getCell(r4, 4).alignment = { horizontal: 'right', vertical: 'middle' }
    ws4.getCell(r4, 5).alignment = { horizontal: 'right', vertical: 'middle' }
    r4++

    let saldoAcumulado = 0
    for (const mov of movimientos) {
      if (mov.tipo === 'Ingreso') saldoAcumulado += mov.monto
      else saldoAcumulado -= mov.monto

      const row = ws4.getRow(r4)
      row.values = [fmtDate(mov.fecha), mov.tipo, mov.concepto, mov.monto, round2(saldoAcumulado)]
      row.getCell(4).numFmt = NUM_FMT
      row.getCell(5).numFmt = NUM_FMT

      const colorMonto = mov.tipo === 'Ingreso' ? 'FF059669' : 'FFDC2626'
      row.getCell(2).font = { color: { argb: colorMonto } }
      row.getCell(4).font = { color: { argb: colorMonto } }
      row.getCell(5).font = { color: { argb: saldoAcumulado >= 0 ? 'FF059669' : 'FFDC2626' } }

      for (let c = 1; c <= 5; c++) row.getCell(c).border = THIN_BORDER
      r4++
    }

    if (movimientos.length === 0) {
      ws4.getRow(r4).getCell(1).value = '(Sin movimientos de caja registrados)'
      ws4.getRow(r4).getCell(1).font = { italic: true, color: { argb: 'FF9CA3AF' } }
      r4++
    }

    // Summary row
    const totalIngresos = movimientos.filter(m => m.tipo === 'Ingreso').reduce((s, m) => s + m.monto, 0)
    const totalEgresos = movimientos.filter(m => m.tipo === 'Egreso').reduce((s, m) => s + m.monto, 0)
    r4++
    const resumenRow1 = ws4.getRow(r4)
    resumenRow1.values = ['', '', 'Total Ingresos:', totalIngresos, '']
    resumenRow1.font = { bold: true }
    resumenRow1.getCell(3).alignment = { horizontal: 'right' }
    resumenRow1.getCell(4).numFmt = NUM_FMT
    resumenRow1.getCell(4).font = { bold: true, color: { argb: 'FF059669' } }
    r4++
    const resumenRow2 = ws4.getRow(r4)
    resumenRow2.values = ['', '', 'Total Egresos:', totalEgresos, '']
    resumenRow2.font = { bold: true }
    resumenRow2.getCell(3).alignment = { horizontal: 'right' }
    resumenRow2.getCell(4).numFmt = NUM_FMT
    resumenRow2.getCell(4).font = { bold: true, color: { argb: 'FFDC2626' } }
    r4++
    const resumenRow3 = ws4.getRow(r4)
    resumenRow3.values = ['', '', 'Saldo Neto:', round2(totalIngresos - totalEgresos), '']
    resumenRow3.font = { bold: true }
    resumenRow3.getCell(3).alignment = { horizontal: 'right' }
    resumenRow3.getCell(4).numFmt = NUM_FMT
    const netColor = totalIngresos - totalEgresos >= 0 ? 'FF059669' : 'FFDC2626'
    resumenRow3.getCell(4).font = { bold: true, size: 11, color: { argb: netColor } }

    // ==================== GENERATE BUFFER ====================
    const buffer = await wb.xlsx.writeBuffer()

    const filename = `PL_${proyecto.codigo}_${new Date().toISOString().split('T')[0]}.xlsx`
    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Error al exportar reporte P&L:', error)
    return new Response(JSON.stringify({ error: 'Error del servidor' }), { status: 500 })
  }
}
