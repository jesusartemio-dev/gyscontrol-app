import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import ExcelJS from 'exceljs'

const estadoLabels: Record<string, string> = {
  borrador: 'Borrador',
  enviado: 'Enviado',
  aprobado: 'Aprobado',
  depositado: 'Depositado',
  rendido: 'Rendido',
  validado: 'Validado',
  cerrado: 'Cerrado',
  rechazado: 'Rechazado',
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params
    const hoja = await prisma.hojaDeGastos.findUnique({
      where: { id },
      include: {
        proyecto: { select: { id: true, codigo: true, nombre: true } },
        centroCosto: { select: { id: true, nombre: true, tipo: true } },
        empleado: { select: { id: true, name: true, email: true } },
        aprobador: { select: { id: true, name: true, email: true } },
        lineas: {
          include: { adjuntos: true, categoriaGasto: true },
          orderBy: { fecha: 'asc' },
        },
        itemsMateriales: {
          orderBy: { createdAt: 'asc' },
        },
        adjuntos: { orderBy: { createdAt: 'asc' } },
      },
    })

    if (!hoja) {
      return NextResponse.json({ error: 'Requerimiento no encontrado' }, { status: 404 })
    }

    const wb = new ExcelJS.Workbook()
    wb.creator = 'GySControl'
    wb.created = new Date()

    const ws = wb.addWorksheet('Requerimiento')

    // --- Styles ---
    const headerFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E79' } }
    const headerFont: Partial<ExcelJS.Font> = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 }
    const labelFont: Partial<ExcelJS.Font> = { bold: true, size: 10 }
    const valueFont: Partial<ExcelJS.Font> = { size: 10 }
    const currencyFmt = '#,##0.00'
    const thinBorder: Partial<ExcelJS.Borders> = {
      top: { style: 'thin' }, bottom: { style: 'thin' },
      left: { style: 'thin' }, right: { style: 'thin' },
    }

    // Column widths
    ws.columns = [
      { width: 18 }, // A
      { width: 30 }, // B
      { width: 18 }, // C
      { width: 30 }, // D
    ]

    // --- Title ---
    let row = 1
    const titleRow = ws.getRow(row)
    ws.mergeCells(row, 1, row, 4)
    const titleCell = ws.getCell(row, 1)
    titleCell.value = `REQUERIMIENTO DE DINERO - ${hoja.numero}`
    titleCell.font = { bold: true, size: 14, color: { argb: 'FF1F4E79' } }
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
    titleRow.height = 30
    row += 2

    // --- Info section ---
    const addInfoRow = (label1: string, val1: string, label2: string, val2: string) => {
      const r = ws.getRow(row)
      ws.getCell(row, 1).value = label1
      ws.getCell(row, 1).font = labelFont
      ws.getCell(row, 2).value = val1
      ws.getCell(row, 2).font = valueFont
      ws.getCell(row, 3).value = label2
      ws.getCell(row, 3).font = labelFont
      ws.getCell(row, 4).value = val2
      ws.getCell(row, 4).font = valueFont
      r.height = 18
      row++
    }

    const asignacion = hoja.proyecto
      ? `${hoja.proyecto.codigo} - ${hoja.proyecto.nombre}`
      : hoja.centroCosto?.nombre || '-'

    const formatDate = (d: Date | null) => d ? d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'

    addInfoRow('Estado:', estadoLabels[hoja.estado] || hoja.estado, 'Fecha creación:', formatDate(hoja.createdAt))
    addInfoRow('Empleado:', hoja.empleado?.name || '-', 'Aprobador:', hoja.aprobador?.name || '-')
    addInfoRow('Asignado a:', asignacion, 'Categoría:', hoja.categoriaCosto || 'gastos')
    addInfoRow('Motivo:', hoja.motivo, 'Requiere anticipo:', hoja.requiereAnticipo ? 'Sí' : 'No')

    if (hoja.observaciones) {
      ws.getCell(row, 1).value = 'Observaciones:'
      ws.getCell(row, 1).font = labelFont
      ws.mergeCells(row, 2, row, 4)
      ws.getCell(row, 2).value = hoja.observaciones
      ws.getCell(row, 2).font = valueFont
      row++
    }

    row++

    // --- Financial summary ---
    const finRow = ws.getRow(row)
    ws.mergeCells(row, 1, row, 4)
    ws.getCell(row, 1).value = 'RESUMEN FINANCIERO'
    ws.getCell(row, 1).font = headerFont
    ws.getCell(row, 1).fill = headerFill
    ws.getCell(row, 1).alignment = { horizontal: 'center' }
    finRow.height = 22
    row++

    const addFinRow = (label: string, value: number) => {
      ws.getCell(row, 1).value = label
      ws.getCell(row, 1).font = labelFont
      ws.getCell(row, 2).value = value
      ws.getCell(row, 2).numFmt = currencyFmt
      ws.getCell(row, 2).font = valueFont
      for (let c = 1; c <= 4; c++) ws.getCell(row, c).border = thinBorder
      row++
    }

    if (hoja.requiereAnticipo) {
      addFinRow('Monto Anticipo (PEN)', Number(hoja.montoAnticipo))
      addFinRow('Monto Depositado (PEN)', Number(hoja.montoDepositado))
    }
    addFinRow('Monto Gastado (PEN)', Number(hoja.montoGastado))
    addFinRow('Saldo (PEN)', Number(hoja.saldo))

    row++

    // --- Expense lines ---
    const linesHeaderRow = ws.getRow(row)
    ws.mergeCells(row, 1, row, 4)
    ws.getCell(row, 1).value = 'DETALLE DE GASTOS'
    ws.getCell(row, 1).font = headerFont
    ws.getCell(row, 1).fill = headerFill
    ws.getCell(row, 1).alignment = { horizontal: 'center' }
    linesHeaderRow.height = 22
    row++

    if (hoja.lineas.length > 0) {
      // Table header
      const colHeaders = ['Fecha', 'Descripción', 'Categoría', 'Comprobante', 'Proveedor', 'RUC', 'Monto (PEN)']
      // Adjust columns for table
      ws.columns = [
        { width: 14 }, { width: 30 }, { width: 18 }, { width: 18 }, { width: 20 }, { width: 14 }, { width: 16 },
      ]

      const thRow = ws.getRow(row)
      colHeaders.forEach((h, i) => {
        const cell = ws.getCell(row, i + 1)
        cell.value = h
        cell.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } }
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E75B6' } }
        cell.alignment = { horizontal: 'center', vertical: 'middle' }
        cell.border = thinBorder
      })
      thRow.height = 20
      row++

      const evenFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F7FB' } }

      hoja.lineas.forEach((linea, idx) => {
        const r = ws.getRow(row)
        const fill = idx % 2 === 0 ? undefined : evenFill

        const fecha = linea.fecha ? new Date(linea.fecha).toLocaleDateString('es-PE') : '-'
        const comprobante = [linea.tipoComprobante, linea.numeroComprobante].filter(Boolean).join(' ')

        const vals = [
          fecha,
          linea.descripcion,
          linea.categoriaGasto?.nombre || '-',
          comprobante || '-',
          linea.proveedorNombre || '-',
          linea.proveedorRuc || '-',
          Number(linea.monto),
        ]

        vals.forEach((v, i) => {
          const cell = ws.getCell(row, i + 1)
          cell.value = v
          cell.font = { size: 10 }
          cell.border = thinBorder
          if (fill) cell.fill = fill
          if (i === 6) {
            cell.numFmt = currencyFmt
            cell.alignment = { horizontal: 'right' }
          }
        })
        r.height = 16
        row++
      })

      // Total row
      const totalRow = ws.getRow(row)
      ws.mergeCells(row, 1, row, 6)
      ws.getCell(row, 1).value = 'TOTAL'
      ws.getCell(row, 1).font = { bold: true, size: 10 }
      ws.getCell(row, 1).alignment = { horizontal: 'right' }
      ws.getCell(row, 7).value = hoja.lineas.reduce((sum, l) => sum + Number(l.monto), 0)
      ws.getCell(row, 7).numFmt = currencyFmt
      ws.getCell(row, 7).font = { bold: true, size: 10 }
      for (let c = 1; c <= 7; c++) ws.getCell(row, c).border = thinBorder
      totalRow.height = 18
    } else {
      ws.getCell(row, 1).value = 'Sin líneas de gasto registradas'
      ws.getCell(row, 1).font = { italic: true, size: 10, color: { argb: 'FF888888' } }
    }

    // --- Equipos y Materiales ---
    const materiales = (hoja as any).itemsMateriales || []
    if (materiales.length > 0) {
      row += 2

      const matHeaderRow = ws.getRow(row)
      ws.mergeCells(row, 1, row, 7)
      ws.getCell(row, 1).value = 'EQUIPOS Y MATERIALES'
      ws.getCell(row, 1).font = headerFont
      ws.getCell(row, 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E79' } }
      ws.getCell(row, 1).alignment = { horizontal: 'center' }
      matHeaderRow.height = 22
      row++

      const matHeaders = ['Código', 'Descripción', 'Unidad', 'Cant. Solicitada', 'Precio Est.', 'Total Est.', 'Observación']
      const matThRow = ws.getRow(row)
      matHeaders.forEach((h, i) => {
        const cell = ws.getCell(row, i + 1)
        cell.value = h
        cell.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } }
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E75B6' } }
        cell.alignment = { horizontal: 'center', vertical: 'middle' }
        cell.border = thinBorder
      })
      matThRow.height = 20
      row++

      const evenFill2: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F7FB' } }
      let totalEstMat = 0

      materiales.forEach((item: any, idx: number) => {
        const r = ws.getRow(row)
        const fill = idx % 2 === 0 ? undefined : evenFill2
        const totalEst = Number(item.totalEstimado ?? (item.cantidadSolicitada * (item.precioEstimado || 0)))
        totalEstMat += totalEst

        const vals = [
          item.codigo || '-',
          item.descripcion || '-',
          item.unidad || '-',
          Number(item.cantidadSolicitada),
          Number(item.precioEstimado || 0),
          totalEst,
          item.observacion || '',
        ]
        vals.forEach((v, i) => {
          const cell = ws.getCell(row, i + 1)
          cell.value = v
          cell.font = { size: 10 }
          cell.border = thinBorder
          if (fill) cell.fill = fill
          if (i >= 3) { cell.numFmt = currencyFmt; cell.alignment = { horizontal: 'right' } }
        })
        r.height = 16
        row++
      })

      // Total row materiales
      const matTotalRow = ws.getRow(row)
      ws.mergeCells(row, 1, row, 5)
      ws.getCell(row, 1).value = 'TOTAL'
      ws.getCell(row, 1).font = { bold: true, size: 10 }
      ws.getCell(row, 1).alignment = { horizontal: 'right' }
      ws.getCell(row, 6).value = totalEstMat
      ws.getCell(row, 6).numFmt = currencyFmt
      ws.getCell(row, 6).font = { bold: true, size: 10 }
      for (let c = 1; c <= 7; c++) ws.getCell(row, c).border = thinBorder
      matTotalRow.height = 18
    }

    // Generate buffer
    const buffer = await wb.xlsx.writeBuffer()

    const filename = `Requerimiento_${hoja.numero.replace(/\//g, '-')}.xlsx`
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Error al exportar requerimiento:', error)
    return NextResponse.json({ error: 'Error al exportar' }, { status: 500 })
  }
}
