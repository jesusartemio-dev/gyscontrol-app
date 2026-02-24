'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Loader2, Clock, Trash2, FolderOpen, Users, Download } from 'lucide-react'
import toast from 'react-hot-toast'

interface LineaHH {
  id: string
  proyectoId: string
  recursoId: string
  fecha: string
  detalle: string | null
  modalidad: string
  horasReportadas: number
  horasStd: number
  horasOT125: number
  horasOT135: number
  horasOT200: number
  horasEquivalente: number
  tarifaHora: number
  moneda: string
  costoLinea: number
  proyecto: { id: string; codigo: string; nombre: string }
  recurso: { id: string; nombre: string }
}

interface ValHHDetail {
  id: string
  clienteId: string
  totalHorasReportadas: number
  totalHorasEquivalentes: number
  subtotal: number
  descuentoPct: number
  descuentoMonto: number
  cliente: { id: string; nombre: string }
  lineas: LineaHH[]
  resumen: {
    porProyecto: Array<{ proyectoId: string; proyectoCodigo: string; proyectoNombre: string; totalHoras: number; totalCosto: number }>
    porRecurso: Array<{ recursoId: string; recursoNombre: string; tarifaHora: number; totalHoras: number; totalCosto: number }>
  }
}

interface Props {
  valorizacionHHId: string
  estado: string
  moneda?: string
}

const formatCurrency = (amount: number, moneda = 'USD') =>
  new Intl.NumberFormat('es-PE', { style: 'currency', currency: moneda === 'PEN' ? 'PEN' : 'USD' }).format(amount)

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })

export default function DetalleHH({ valorizacionHHId, estado, moneda = 'USD' }: Props) {
  const [data, setData] = useState<ValHHDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)

  const esBorrador = estado === 'borrador'

  const loadData = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/valorizaciones-hh/${valorizacionHHId}`)
      if (!res.ok) throw new Error('Error al cargar')
      const detail = await res.json()
      setData(detail)
    } catch {
      toast.error('Error al cargar detalle HH')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [valorizacionHHId])

  const handleDeleteLine = async (lineaId: string) => {
    if (!confirm('¿Eliminar esta línea de la valorización?')) return
    setDeleting(lineaId)
    try {
      const res = await fetch(`/api/valorizaciones-hh/${valorizacionHHId}/lineas/${lineaId}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al eliminar')
      }
      toast.success('Línea eliminada')
      loadData()
    } catch (e: any) {
      toast.error(e.message || 'Error al eliminar')
    } finally {
      setDeleting(null)
    }
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const res = await fetch(`/api/valorizaciones-hh/${valorizacionHHId}/export`)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Error al exportar')
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const fecha = new Date().toISOString().slice(0, 10).replace(/-/g, '')
      a.download = `DEN-VALORIZACION-${fecha}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e: any) {
      toast.error(e.message || 'Error al exportar Excel')
    } finally {
      setExporting(false)
    }
  }

  // Group lines by proyecto
  const groupedLines = useMemo(() => {
    if (!data) return []
    const map = new Map<string, { proyecto: { id: string; codigo: string; nombre: string }; lineas: LineaHH[] }>()
    for (const l of data.lineas) {
      if (!map.has(l.proyectoId)) {
        map.set(l.proyectoId, { proyecto: l.proyecto, lineas: [] })
      }
      map.get(l.proyectoId)!.lineas.push(l)
    }
    return Array.from(map.values())
  }, [data])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="space-y-4">
      {/* Export button */}
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting}>
          {exporting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Download className="h-4 w-4 mr-1" />}
          Exportar Excel
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-xs text-muted-foreground">Líneas</div>
            <div className="text-xl font-bold">{data.lineas.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-xs text-muted-foreground">Hrs reportadas</div>
            <div className="text-xl font-bold">{data.totalHorasReportadas.toFixed(1)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-xs text-muted-foreground">Hrs equivalentes</div>
            <div className="text-xl font-bold">{data.totalHorasEquivalentes.toFixed(1)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-xs text-muted-foreground">Subtotal HH</div>
            <div className="text-xl font-bold font-mono">{formatCurrency(data.subtotal, moneda)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-xs text-muted-foreground">Dcto. volumen</div>
            <div className="text-xl font-bold font-mono text-blue-600">
              {data.descuentoPct > 0
                ? `-${(data.descuentoPct * 100).toFixed(1)}%`
                : '0%'}
            </div>
            {data.descuentoMonto > 0 && (
              <div className="text-xs text-muted-foreground">-{formatCurrency(data.descuentoMonto, moneda)}</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Desglose por proyecto */}
      {data.resumen.porProyecto.length > 1 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-medium flex items-center gap-1 mb-2">
              <FolderOpen className="h-4 w-4" /> Desglose por proyecto
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {data.resumen.porProyecto.map(pp => (
                <div key={pp.proyectoId} className="bg-muted/50 rounded px-3 py-2 text-sm">
                  <span className="font-medium">{pp.proyectoCodigo}</span>
                  <span className="text-muted-foreground ml-1">— {pp.totalHoras.toFixed(1)} hrs</span>
                  <span className="float-right font-mono">{formatCurrency(pp.totalCosto, moneda)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Desglose por recurso */}
      {data.resumen.porRecurso.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-medium flex items-center gap-1 mb-2">
              <Users className="h-4 w-4" /> Desglose por recurso
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {data.resumen.porRecurso.map(pr => (
                <div key={pr.recursoId} className="bg-muted/50 rounded px-3 py-2 text-sm">
                  <span className="font-medium">{pr.recursoNombre}</span>
                  <span className="text-muted-foreground ml-1">@ {formatCurrency(pr.tarifaHora, moneda)}/hr</span>
                  <span className="float-right font-mono">{formatCurrency(pr.totalCosto, moneda)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lines table grouped by proyecto */}
      {groupedLines.map(group => (
        <Card key={group.proyecto.id}>
          <CardContent className="p-0">
            <div className="px-4 py-2 bg-muted/50 border-b flex items-center gap-2">
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm">{group.proyecto.codigo}</span>
              <span className="text-muted-foreground text-sm">— {group.proyecto.nombre}</span>
              <Badge variant="outline" className="ml-auto text-xs">{group.lineas.length} líneas</Badge>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Recurso</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Modalidad</TableHead>
                    <TableHead className="text-right">Hrs Rep.</TableHead>
                    <TableHead className="text-right">Std</TableHead>
                    <TableHead className="text-right">OT 1.25</TableHead>
                    <TableHead className="text-right">OT 1.35</TableHead>
                    <TableHead className="text-right">OT 2.0</TableHead>
                    <TableHead className="text-right">Hrs Equiv.</TableHead>
                    <TableHead className="text-right">Tarifa/hr</TableHead>
                    <TableHead className="text-right">Costo</TableHead>
                    {esBorrador && <TableHead className="w-10"></TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {group.lineas.map(l => (
                    <TableRow key={l.id}>
                      <TableCell className="text-sm">{l.recurso.nombre}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDate(l.fecha)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{l.modalidad}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">{l.horasReportadas.toFixed(1)}</TableCell>
                      <TableCell className="text-right font-mono text-sm text-muted-foreground">{l.horasStd.toFixed(1)}</TableCell>
                      <TableCell className="text-right font-mono text-sm text-muted-foreground">{l.horasOT125 > 0 ? l.horasOT125.toFixed(2) : '-'}</TableCell>
                      <TableCell className="text-right font-mono text-sm text-muted-foreground">{l.horasOT135 > 0 ? l.horasOT135.toFixed(2) : '-'}</TableCell>
                      <TableCell className="text-right font-mono text-sm text-muted-foreground">{l.horasOT200 > 0 ? l.horasOT200.toFixed(1) : '-'}</TableCell>
                      <TableCell className="text-right font-mono text-sm font-medium">{l.horasEquivalente.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{formatCurrency(l.tarifaHora, moneda)}</TableCell>
                      <TableCell className="text-right font-mono text-sm font-medium">{formatCurrency(l.costoLinea, moneda)}</TableCell>
                      {esBorrador && (
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            disabled={deleting === l.id}
                            onClick={() => handleDeleteLine(l.id)}
                          >
                            {deleting === l.id
                              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              : <Trash2 className="h-3.5 w-3.5 text-red-500" />
                            }
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
