'use client'

import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Download, Loader2, ShoppingCart } from 'lucide-react'
import { toast } from 'sonner'

const MESES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
]

const ESTADO_CXP: Record<string, string> = {
  pendiente_documentos: 'Pend. Docs', pendiente: 'Pendiente',
  parcial: 'Parcial', pagada: 'Pagada', vencida: 'Vencida', anulada: 'Anulada',
}
const ESTADO_GASTO: Record<string, string> = {
  borrador: 'Borrador', enviado: 'Enviado', aprobado: 'Aprobado', depositado: 'Depositado',
  rendido: 'Rendido', revisado: 'Revisado', validado: 'Validado', cerrado: 'Cerrado', rechazado: 'Rechazado',
}

interface CxPItem {
  id: string
  fechaRecepcion: string
  tipoDocumento: string
  numeroFactura: string | null
  proveedor?: { nombre: string; ruc: string } | null
  descripcion: string | null
  monto: number
  moneda: string
  tipoCambio?: number | null
  proyecto?: { codigo: string; nombre: string } | null
  estado: string
}

interface GastoItem {
  id: string
  fecha: string
  tipoComprobante: string | null
  numeroComprobante: string | null
  proveedorNombre: string | null
  proveedorRuc: string | null
  descripcion: string | null
  monto: number
  moneda: string
  categoriaGasto?: { nombre: string } | null
  hojaDeGastos?: {
    estado: string
    proyecto?: { codigo: string; nombre: string } | null
    empleado?: { name: string | null } | null
  } | null
}

type FilaUnificada =
  | { tipo: 'cxp'; fecha: string; item: CxPItem }
  | { tipo: 'gasto'; fecha: string; item: GastoItem }

function formatDate(iso: string) {
  return new Date(iso + (iso.includes('T') ? '' : 'T00:00:00Z')).toLocaleDateString('es-PE', { timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric' })
}

function fmt(n: number) {
  return n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function tipoDocLabel(tipo: string) {
  return tipo === 'nota_credito' ? 'Nota de Crédito' : 'Factura'
}
function tipoComprobanteLabel(tipo: string | null) {
  if (!tipo) return '—'
  const m: Record<string,string> = { factura: 'Factura', boleta: 'Boleta', recibo: 'Recibo', ticket: 'Ticket' }
  return m[tipo] || tipo
}

export default function ComprasMesPage() {
  const now = new Date()
  const [mes, setMes] = useState(String(now.getMonth() + 1).padStart(2, '0'))
  const [anio, setAnio] = useState(String(now.getFullYear()))
  const [cxp, setCxp] = useState<CxPItem[]>([])
  const [gastos, setGastos] = useState<GastoItem[]>([])
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)

  const mesParam = `${anio}-${mes}`

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/administracion/compras-mes?mes=${mesParam}`)
        if (!res.ok) throw new Error('Error al cargar')
        const data = await res.json()
        setCxp(data.cxp ?? [])
        setGastos(data.gastos ?? [])
      } catch {
        toast.error('Error al cargar datos del mes')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [mesParam])

  const filas = useMemo<FilaUnificada[]>(() => {
    const rows: FilaUnificada[] = [
      ...cxp.map(item => ({ tipo: 'cxp' as const, fecha: item.fechaRecepcion, item })),
      ...gastos.map(item => ({ tipo: 'gasto' as const, fecha: item.fecha, item })),
    ]
    return rows.sort((a, b) => a.fecha.localeCompare(b.fecha))
  }, [cxp, gastos])

  const totales = useMemo(() => {
    let pen = 0, usd = 0
    for (const f of filas) {
      const monto = f.tipo === 'cxp'
        ? (f.item.tipoDocumento === 'nota_credito' ? -Math.abs(f.item.monto) : f.item.monto)
        : f.item.monto
      if (f.item.moneda === 'USD') usd += monto
      else pen += monto
    }
    return { pen, usd }
  }, [filas])

  const handleExport = async () => {
    setExporting(true)
    try {
      const { exportarComprasMes } = await import('@/lib/utils/comprasMesExcel')
      const buf = await exportarComprasMes(mesParam, cxp as any, gastos as any)
      const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Compras_${MESES[Number(mes) - 1]}_${anio}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Error al exportar')
    } finally {
      setExporting(false)
    }
  }

  const anios = Array.from({ length: 4 }, (_, i) => String(now.getFullYear() - i))

  return (
    <div className="p-6 space-y-5 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <ShoppingCart className="h-6 w-6 text-blue-600" />
          <div>
            <h1 className="text-xl font-semibold">Compras del Mes</h1>
            <p className="text-sm text-muted-foreground">Facturas y gastos unificados para el contador</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={mes} onValueChange={setMes}>
            <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MESES.map((m, i) => (
                <SelectItem key={i} value={String(i + 1).padStart(2, '0')}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={anio} onValueChange={setAnio}>
            <SelectTrigger className="w-24 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {anios.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={handleExport} disabled={exporting || filas.length === 0} size="sm">
            {exporting ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Download className="h-4 w-4 mr-1.5" />}
            Exportar Excel
          </Button>
        </div>
      </div>

      {/* Totales */}
      <div className="flex gap-4 flex-wrap">
        <Card className="flex-1 min-w-[160px]">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Total PEN</p>
            <p className="text-lg font-semibold">{fmt(totales.pen)}</p>
          </CardContent>
        </Card>
        {totales.usd !== 0 && (
          <Card className="flex-1 min-w-[160px]">
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground">Total USD</p>
              <p className="text-lg font-semibold">{fmt(totales.usd)}</p>
            </CardContent>
          </Card>
        )}
        <Card className="flex-1 min-w-[160px]">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Facturas / NC</p>
            <p className="text-lg font-semibold">{cxp.length}</p>
          </CardContent>
        </Card>
        <Card className="flex-1 min-w-[160px]">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Gastos</p>
            <p className="text-lg font-semibold">{gastos.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabla */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filas.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground text-sm">
              No hay registros para {MESES[Number(mes) - 1]} {anio}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">Fecha</TableHead>
                  <TableHead className="w-36">Tipo Documento</TableHead>
                  <TableHead className="w-32">N° Comprobante</TableHead>
                  <TableHead>Proveedor / Empleado</TableHead>
                  <TableHead className="w-28">Proyecto</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="text-right w-28">Monto</TableHead>
                  <TableHead className="w-16">Moneda</TableHead>
                  <TableHead className="w-28">Estado</TableHead>
                  <TableHead className="w-20">Origen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filas.map((fila, idx) => {
                  if (fila.tipo === 'cxp') {
                    const item = fila.item
                    const esNC = item.tipoDocumento === 'nota_credito'
                    const esAnulada = item.estado === 'anulada'
                    const monto = esNC ? -Math.abs(item.monto) : item.monto
                    return (
                      <TableRow key={idx} className={esNC ? 'bg-red-50' : esAnulada ? 'opacity-50 bg-gray-50' : ''}>
                        <TableCell className="text-sm">{formatDate(item.fechaRecepcion)}</TableCell>
                        <TableCell>
                          <span className={`text-xs font-medium ${esNC ? 'text-red-600' : 'text-gray-700'}`}>
                            {tipoDocLabel(item.tipoDocumento)}
                          </span>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{item.numeroFactura || '—'}</TableCell>
                        <TableCell>
                          <div className="text-sm">{item.proveedor?.nombre || '—'}</div>
                          {item.proveedor?.ruc && <div className="text-xs text-muted-foreground">{item.proveedor.ruc}</div>}
                        </TableCell>
                        <TableCell className="text-xs">{item.proyecto?.codigo || '—'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{item.descripcion || '—'}</TableCell>
                        <TableCell className={`text-right font-mono text-sm ${esNC ? 'text-red-600 font-semibold' : ''}`}>
                          {esNC ? '-' : ''}{fmt(Math.abs(monto))}
                        </TableCell>
                        <TableCell className="text-xs">{item.moneda}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{ESTADO_CXP[item.estado] || item.estado}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs bg-blue-50 text-blue-700">Factura</Badge>
                        </TableCell>
                      </TableRow>
                    )
                  } else {
                    const item = fila.item
                    return (
                      <TableRow key={idx} className="bg-amber-50/40">
                        <TableCell className="text-sm">{formatDate(item.fecha)}</TableCell>
                        <TableCell>
                          <span className="text-xs text-gray-700">{tipoComprobanteLabel(item.tipoComprobante)}</span>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{item.numeroComprobante || '—'}</TableCell>
                        <TableCell>
                          <div className="text-sm">{item.proveedorNombre || item.hojaDeGastos?.empleado?.name || '—'}</div>
                          {item.proveedorRuc && <div className="text-xs text-muted-foreground">{item.proveedorRuc}</div>}
                        </TableCell>
                        <TableCell className="text-xs">{item.hojaDeGastos?.proyecto?.codigo || '—'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {item.descripcion || item.categoriaGasto?.nombre || '—'}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">{fmt(item.monto)}</TableCell>
                        <TableCell className="text-xs">{item.moneda}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {ESTADO_GASTO[item.hojaDeGastos?.estado ?? ''] || item.hojaDeGastos?.estado || '—'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs bg-amber-50 text-amber-700">Gasto</Badge>
                        </TableCell>
                      </TableRow>
                    )
                  }
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
