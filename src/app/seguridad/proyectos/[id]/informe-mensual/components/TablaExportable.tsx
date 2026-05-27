'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Clipboard, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Column<T> {
  header: string
  accessor: (row: T) => string | number | null | undefined
}

interface Props<T> {
  columns: Column<T>[]
  rows: T[]
  filename: string
  emptyMessage?: string
  children?: (row: T, index: number) => React.ReactNode
}

export function TablaExportable<T>({ columns, rows, filename, emptyMessage, children }: Props<T>) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set())

  const toggleRow = (i: number) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  const copyTsv = async () => {
    const header = columns.map((c) => c.header).join('\t')
    const body = rows
      .map((row) => columns.map((c) => c.accessor(row) ?? '—').join('\t'))
      .join('\n')
    await navigator.clipboard.writeText(`${header}\n${body}`)
    toast.success('Tabla copiada al portapapeles (TSV)')
  }

  const exportExcel = async () => {
    const ExcelJS = (await import('exceljs')).default
    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('Datos')

    ws.addRow(columns.map((c) => c.header))
    const headerRow = ws.getRow(1)
    headerRow.font = { bold: true }
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } }
    headerRow.commit()

    rows.forEach((row) => {
      ws.addRow(columns.map((c) => c.accessor(row) ?? ''))
    })

    columns.forEach((_, i) => {
      ws.getColumn(i + 1).width = 20
    })

    const buffer = await wb.xlsx.writeBuffer()
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename}.xlsx`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Excel exportado')
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={copyTsv} disabled={rows.length === 0}>
          <Clipboard className="h-3.5 w-3.5 mr-1.5" />
          Copiar TSV
        </Button>
        <Button variant="outline" size="sm" onClick={exportExcel} disabled={rows.length === 0}>
          <Download className="h-3.5 w-3.5 mr-1.5" />
          Excel
        </Button>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
          {emptyMessage ?? 'Sin datos para este período.'}
        </div>
      ) : (
        <div className="rounded-lg border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                {columns.map((col) => (
                  <th
                    key={col.header}
                    className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap"
                  >
                    {col.header}
                  </th>
                ))}
                {children && <th className="px-3 py-2 w-8" />}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <>
                  <tr
                    key={i}
                    className="border-b last:border-0 hover:bg-muted/20 transition-colors"
                    onClick={children ? () => toggleRow(i) : undefined}
                    style={children ? { cursor: 'pointer' } : undefined}
                  >
                    {columns.map((col) => (
                      <td key={col.header} className="px-3 py-2 whitespace-nowrap">
                        {col.accessor(row) ?? '—'}
                      </td>
                    ))}
                    {children && (
                      <td className="px-3 py-2 text-muted-foreground text-xs">
                        {expanded.has(i) ? '▲' : '▼'}
                      </td>
                    )}
                  </tr>
                  {children && expanded.has(i) && (
                    <tr key={`exp-${i}`} className="bg-muted/10">
                      <td colSpan={columns.length + 1} className="px-4 py-3">
                        {children(row, i)}
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
