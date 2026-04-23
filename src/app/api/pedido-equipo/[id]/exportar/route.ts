import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import ExcelJS from 'exceljs'

const REQ_ESTADOS_ACTIVOS = ['borrador', 'enviado', 'aprobado', 'depositado', 'rendido', 'validado', 'cerrado']

const estadoPedidoLabels: Record<string, string> = {
  borrador: 'Borrador',
  enviado: 'Enviado',
  aprobado: 'Aprobado',
  en_gestion: 'En Gestión',
  completado: 'Completado',
  cancelado: 'Cancelado',
  rechazado: 'Rechazado',
  atendido: 'Atendido',
  parcial: 'Parcial',
  entregado: 'Entregado',
  pendiente: 'Pendiente',
}

const formatDate = (d: Date | null | undefined): string =>
  d ? new Date(d).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-'

// ─── Estilos ──────────────────────────────────────────────────────────────────
const COLOR_PRIMARY = 'FF1F4E79'
const COLOR_SECONDARY = 'FF2E75B6'
const COLOR_EVEN_ROW = 'FFF2F7FB'
const COLOR_WHITE = 'FFFFFFFF'

const thinBorder: Partial<ExcelJS.Borders> = {
  top: { style: 'thin' }, bottom: { style: 'thin' },
  left: { style: 'thin' }, right: { style: 'thin' },
}

const headerFont: Partial<ExcelJS.Font> = { bold: true, color: { argb: COLOR_WHITE }, size: 11 }
const tableHeaderFont: Partial<ExcelJS.Font> = { bold: true, size: 10, color: { argb: COLOR_WHITE } }
const labelFont: Partial<ExcelJS.Font> = { bold: true, size: 10 }
const valueFont: Partial<ExcelJS.Font> = { size: 10 }
const currencyFmt = '#,##0.00'
const numberFmt = '#,##0.##'

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params
    const pedido = await prisma.pedidoEquipo.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        proyecto: { select: { id: true, codigo: true, nombre: true } },
        centroCosto: { select: { id: true, nombre: true } },
        listaEquipo: { select: { id: true, codigo: true, nombre: true } },
        pedidoEquipoItem: {
          orderBy: { orden: 'asc' },
          include: {
            proveedor: { select: { id: true, nombre: true } },
            listaEquipoItem: {
              include: {
                proveedor: { select: { id: true, nombre: true } },
              },
            },
            ordenCompraItems: {
              select: {
                id: true,
                cantidad: true,
                ordenCompra: { select: { id: true, numero: true, estado: true } },
              },
            },
            requerimientoMaterialItems: {
              select: {
                id: true,
                cantidadSolicitada: true,
                hojaDeGastos: { select: { id: true, numero: true, estado: true } },
              },
            },
          },
        },
        ordenesCompra: {
          orderBy: { createdAt: 'desc' },
          include: {
            proveedor: { select: { id: true, nombre: true, ruc: true } },
            items: { select: { id: true, costoTotal: true } },
          },
        },
      },
    })

    if (!pedido) {
      return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })
    }

    const wb = new ExcelJS.Workbook()
    wb.creator = 'GySControl'
    wb.created = new Date()

    // ─── Hoja 1: Resumen ────────────────────────────────────────────────────────
    const wsResumen = wb.addWorksheet('Resumen')
    wsResumen.columns = [
      { width: 22 }, { width: 35 }, { width: 22 }, { width: 35 },
    ]

    let row = 1
    wsResumen.mergeCells(row, 1, row, 4)
    const titleCell = wsResumen.getCell(row, 1)
    titleCell.value = `PEDIDO DE EQUIPOS — ${pedido.codigo}`
    titleCell.font = { bold: true, size: 14, color: { argb: COLOR_PRIMARY } }
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
    wsResumen.getRow(row).height = 30
    row += 2

    const addInfoRow = (label1: string, val1: string, label2: string, val2: string) => {
      wsResumen.getCell(row, 1).value = label1
      wsResumen.getCell(row, 1).font = labelFont
      wsResumen.getCell(row, 2).value = val1
      wsResumen.getCell(row, 2).font = valueFont
      wsResumen.getCell(row, 3).value = label2
      wsResumen.getCell(row, 3).font = labelFont
      wsResumen.getCell(row, 4).value = val2
      wsResumen.getCell(row, 4).font = valueFont
      wsResumen.getRow(row).height = 18
      row++
    }

    const asignacion = pedido.proyecto
      ? `${pedido.proyecto.codigo} - ${pedido.proyecto.nombre}`
      : pedido.centroCosto?.nombre || '-'
    const listaRef = pedido.listaEquipo
      ? `${pedido.listaEquipo.codigo}${pedido.listaEquipo.nombre ? ' - ' + pedido.listaEquipo.nombre : ''}`
      : '-'

    addInfoRow('Código:', pedido.codigo, 'Estado:', estadoPedidoLabels[pedido.estado] || pedido.estado)
    addInfoRow('Proyecto / Centro Costo:', asignacion, 'Lista de equipo:', listaRef)
    addInfoRow('Responsable:', pedido.user?.name || '-', 'Prioridad:', pedido.prioridad || 'media')
    addInfoRow('Fecha pedido:', formatDate(pedido.fechaPedido), 'Fecha necesaria:', formatDate(pedido.fechaNecesaria))
    addInfoRow('Fecha entrega est.:', formatDate(pedido.fechaEntregaEstimada), 'Fecha entrega real:', formatDate(pedido.fechaEntregaReal))
    addInfoRow('Urgente:', pedido.esUrgente ? 'Sí' : 'No', 'Creado:', formatDate(pedido.createdAt))

    if (pedido.observacion) {
      wsResumen.getCell(row, 1).value = 'Observaciones:'
      wsResumen.getCell(row, 1).font = labelFont
      wsResumen.mergeCells(row, 2, row, 4)
      wsResumen.getCell(row, 2).value = pedido.observacion
      wsResumen.getCell(row, 2).font = valueFont
      wsResumen.getCell(row, 2).alignment = { wrapText: true, vertical: 'top' }
      row++
    }

    row++
    wsResumen.mergeCells(row, 1, row, 4)
    const summaryHeader = wsResumen.getCell(row, 1)
    summaryHeader.value = 'RESUMEN'
    summaryHeader.font = headerFont
    summaryHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_PRIMARY } }
    summaryHeader.alignment = { horizontal: 'center' }
    wsResumen.getRow(row).height = 22
    row++

    const items = pedido.pedidoEquipoItem
    const ocs = pedido.ordenesCompra
    const totalItems = items.length
    const itemsEntregados = items.filter(i => i.estado === 'entregado').length
    const itemsParciales = items.filter(i => i.estado === 'parcial').length
    const itemsPendientes = items.filter(i => i.estado === 'pendiente' || !i.estado).length
    const costoTotal = items.reduce((s, i) => s + Number(i.costoTotal || 0), 0)

    const addSummaryRow = (label: string, value: string | number, isCurrency = false) => {
      wsResumen.getCell(row, 1).value = label
      wsResumen.getCell(row, 1).font = labelFont
      wsResumen.mergeCells(row, 2, row, 4)
      wsResumen.getCell(row, 2).value = value
      wsResumen.getCell(row, 2).font = valueFont
      if (isCurrency) {
        wsResumen.getCell(row, 2).numFmt = currencyFmt
        wsResumen.getCell(row, 2).alignment = { horizontal: 'right' }
      }
      for (let c = 1; c <= 4; c++) wsResumen.getCell(row, c).border = thinBorder
      row++
    }

    addSummaryRow('Total de ítems:', totalItems)
    addSummaryRow('Ítems entregados:', itemsEntregados)
    addSummaryRow('Ítems parciales:', itemsParciales)
    addSummaryRow('Ítems pendientes:', itemsPendientes)
    addSummaryRow('Órdenes de compra vinculadas:', ocs.length)
    addSummaryRow('Costo total (USD):', costoTotal, true)

    // ─── Hoja 2: Ítems ──────────────────────────────────────────────────────────
    const wsItems = wb.addWorksheet('Ítems')
    const itemHeaders = [
      'Código', 'Descripción', 'Proveedor', 'Unidad',
      'Pedido', 'Atendido', 'En Req.', 'Estado',
      'T. Entrega', 'F. Entrega', 'Costo (USD)', 'OC Vinculadas', 'REQ Vinculados',
    ]
    wsItems.columns = [
      { width: 16 }, { width: 42 }, { width: 24 }, { width: 10 },
      { width: 10 }, { width: 10 }, { width: 10 }, { width: 14 },
      { width: 14 }, { width: 14 }, { width: 14 }, { width: 20 }, { width: 22 },
    ]

    let r = 1
    const thRowItems = wsItems.getRow(r)
    itemHeaders.forEach((h, i) => {
      const cell = wsItems.getCell(r, i + 1)
      cell.value = h
      cell.font = tableHeaderFont
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_SECONDARY } }
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
      cell.border = thinBorder
    })
    thRowItems.height = 24
    r++

    items.forEach((item, idx) => {
      const fill: ExcelJS.Fill | undefined = idx % 2 === 0
        ? undefined
        : { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_EVEN_ROW } }

      const provNombre =
        item.proveedor?.nombre ||
        item.proveedorNombre ||
        item.listaEquipoItem?.proveedor?.nombre ||
        '-'

      const reqItems = item.requerimientoMaterialItems || []
      const enReq = reqItems
        .filter(rq => REQ_ESTADOS_ACTIVOS.includes(rq.hojaDeGastos?.estado))
        .reduce((s, rq) => s + Number(rq.cantidadSolicitada || 0), 0)

      const tiempoEntrega = item.tiempoEntregaDias != null
        ? `${item.tiempoEntregaDias} día${item.tiempoEntregaDias !== 1 ? 's' : ''}`
        : item.tiempoEntrega || '-'

      const fEntrega = item.fechaEntregaReal
        ? formatDate(item.fechaEntregaReal)
        : formatDate(item.fechaEntregaEstimada)

      const ocsLinked = (item.ordenCompraItems || [])
        .map(oci => oci.ordenCompra?.numero)
        .filter(Boolean)
        .join(', ')

      const reqsLinked = reqItems
        .map(rq => rq.hojaDeGastos?.numero)
        .filter(Boolean)
        .join(', ')

      const vals: (string | number)[] = [
        item.codigo,
        item.descripcion,
        provNombre,
        item.unidad,
        Number(item.cantidadPedida),
        Number(item.cantidadAtendida || 0),
        enReq,
        estadoPedidoLabels[item.estado] || item.estado,
        tiempoEntrega,
        fEntrega,
        Number(item.costoTotal || 0),
        ocsLinked || '-',
        reqsLinked || '-',
      ]

      vals.forEach((v, i) => {
        const cell = wsItems.getCell(r, i + 1)
        cell.value = v
        cell.font = valueFont
        cell.border = thinBorder
        if (fill) cell.fill = fill
        cell.alignment = { vertical: 'top', wrapText: i === 1 || i === 2 || i === 11 || i === 12 }
        if (i === 4 || i === 5 || i === 6) {
          cell.numFmt = numberFmt
          cell.alignment = { ...cell.alignment, horizontal: 'right' }
        }
        if (i === 10) {
          cell.numFmt = currencyFmt
          cell.alignment = { ...cell.alignment, horizontal: 'right' }
        }
      })
      wsItems.getRow(r).height = 18
      r++
    })

    // Total row
    if (items.length > 0) {
      const totalRow = wsItems.getRow(r)
      wsItems.mergeCells(r, 1, r, 10)
      wsItems.getCell(r, 1).value = 'TOTAL'
      wsItems.getCell(r, 1).font = { bold: true, size: 10 }
      wsItems.getCell(r, 1).alignment = { horizontal: 'right' }
      wsItems.getCell(r, 11).value = costoTotal
      wsItems.getCell(r, 11).numFmt = currencyFmt
      wsItems.getCell(r, 11).font = { bold: true, size: 10 }
      wsItems.getCell(r, 11).alignment = { horizontal: 'right' }
      for (let c = 1; c <= 13; c++) wsItems.getCell(r, c).border = thinBorder
      totalRow.height = 20
    }

    // Freeze header row
    wsItems.views = [{ state: 'frozen', ySplit: 1 }]

    // ─── Hoja 3: OCs y Requerimientos ──────────────────────────────────────────
    const wsVinc = wb.addWorksheet('OCs y Requerimientos')
    wsVinc.columns = [
      { width: 18 }, { width: 32 }, { width: 14 }, { width: 12 }, { width: 16 }, { width: 16 },
    ]

    let rv = 1
    wsVinc.mergeCells(rv, 1, rv, 6)
    const ocHeader = wsVinc.getCell(rv, 1)
    ocHeader.value = `ÓRDENES DE COMPRA (${ocs.length})`
    ocHeader.font = headerFont
    ocHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_PRIMARY } }
    ocHeader.alignment = { horizontal: 'center' }
    wsVinc.getRow(rv).height = 22
    rv++

    if (ocs.length > 0) {
      const ocCols = ['N° OC', 'Proveedor', 'Ítems', 'Estado', 'F. Entrega Est.', 'Subtotal (USD)']
      const ocThRow = wsVinc.getRow(rv)
      ocCols.forEach((h, i) => {
        const cell = wsVinc.getCell(rv, i + 1)
        cell.value = h
        cell.font = tableHeaderFont
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_SECONDARY } }
        cell.alignment = { horizontal: 'center', vertical: 'middle' }
        cell.border = thinBorder
      })
      ocThRow.height = 20
      rv++

      ocs.forEach((oc, idx) => {
        const fill: ExcelJS.Fill | undefined = idx % 2 === 0
          ? undefined
          : { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_EVEN_ROW } }
        const subtotal = oc.items.reduce((s, it) => s + Number(it.costoTotal || 0), 0)
        const vals: (string | number)[] = [
          oc.numero,
          oc.proveedor?.nombre || '-',
          oc.items.length,
          estadoPedidoLabels[oc.estado] || oc.estado,
          formatDate((oc as any).fechaEntregaEstimada),
          subtotal,
        ]
        vals.forEach((v, i) => {
          const cell = wsVinc.getCell(rv, i + 1)
          cell.value = v
          cell.font = valueFont
          cell.border = thinBorder
          if (fill) cell.fill = fill
          if (i === 2) cell.alignment = { horizontal: 'center' }
          if (i === 5) {
            cell.numFmt = currencyFmt
            cell.alignment = { horizontal: 'right' }
          }
        })
        wsVinc.getRow(rv).height = 18
        rv++
      })
    } else {
      wsVinc.getCell(rv, 1).value = 'Sin órdenes de compra vinculadas'
      wsVinc.getCell(rv, 1).font = { italic: true, size: 10, color: { argb: 'FF888888' } }
      rv++
    }

    rv += 2

    // REQ section
    const hojasMap = new Map<string, { id: string; numero: string; estado: string; itemsCount: number; cantidadTotal: number }>()
    for (const item of items) {
      for (const rq of (item.requerimientoMaterialItems || [])) {
        if (!rq.hojaDeGastos) continue
        const hg = rq.hojaDeGastos
        const existing = hojasMap.get(hg.id)
        if (existing) {
          existing.itemsCount++
          existing.cantidadTotal += Number(rq.cantidadSolicitada || 0)
        } else {
          hojasMap.set(hg.id, {
            id: hg.id,
            numero: hg.numero,
            estado: hg.estado,
            itemsCount: 1,
            cantidadTotal: Number(rq.cantidadSolicitada || 0),
          })
        }
      }
    }
    const hojas = Array.from(hojasMap.values())

    wsVinc.mergeCells(rv, 1, rv, 6)
    const reqHeader = wsVinc.getCell(rv, 1)
    reqHeader.value = `REQUERIMIENTOS DE MATERIALES (${hojas.length})`
    reqHeader.font = headerFont
    reqHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_PRIMARY } }
    reqHeader.alignment = { horizontal: 'center' }
    wsVinc.getRow(rv).height = 22
    rv++

    if (hojas.length > 0) {
      const reqCols = ['N° REQ', 'Estado', 'Ítems del pedido', 'Cantidad total', '', '']
      const reqThRow = wsVinc.getRow(rv)
      reqCols.forEach((h, i) => {
        const cell = wsVinc.getCell(rv, i + 1)
        cell.value = h
        if (h) {
          cell.font = tableHeaderFont
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_SECONDARY } }
          cell.alignment = { horizontal: 'center', vertical: 'middle' }
          cell.border = thinBorder
        }
      })
      reqThRow.height = 20
      rv++

      hojas.forEach((hoja, idx) => {
        const fill: ExcelJS.Fill | undefined = idx % 2 === 0
          ? undefined
          : { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_EVEN_ROW } }
        const vals: (string | number)[] = [
          hoja.numero,
          hoja.estado,
          hoja.itemsCount,
          hoja.cantidadTotal,
        ]
        vals.forEach((v, i) => {
          const cell = wsVinc.getCell(rv, i + 1)
          cell.value = v
          cell.font = valueFont
          cell.border = thinBorder
          if (fill) cell.fill = fill
          if (i === 2 || i === 3) {
            cell.numFmt = numberFmt
            cell.alignment = { horizontal: 'right' }
          }
        })
        wsVinc.getRow(rv).height = 18
        rv++
      })
    } else {
      wsVinc.getCell(rv, 1).value = 'Sin requerimientos de materiales vinculados'
      wsVinc.getCell(rv, 1).font = { italic: true, size: 10, color: { argb: 'FF888888' } }
    }

    // Generate buffer
    const buffer = await wb.xlsx.writeBuffer()
    const filename = `Pedido_${pedido.codigo.replace(/[\/\\]/g, '-')}.xlsx`

    return new NextResponse(buffer as any, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Error al exportar pedido:', error)
    return NextResponse.json({ error: 'Error al exportar pedido' }, { status: 500 })
  }
}
