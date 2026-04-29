'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ArrowLeft, Calendar, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

interface MesData {
  mes: string
  cantidad: number
  costoPEN: number
  costoUSD: number
  porSubcategoria: Record<string, number>
}

interface ReporteData {
  desde: string
  hasta: string
  totales: { items: number; cantidad: number; costoPEN: number; costoUSD: number }
  meses: MesData[]
}

const SUBCATEGORIAS = ['cabeza', 'manos', 'ojos', 'auditiva', 'respiratoria', 'pies', 'caida', 'ropa', 'visibilidad', 'otro']

const formatMonto = (n: number, m: string) => {
  if (!n) return '—'
  const sym = m === 'USD' ? 'US$' : 'S/'
  return `${sym} ${n.toFixed(2)}`
}

const formatMes = (mes: string) => {
  const [y, m] = mes.split('-')
  const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
  return `${meses[parseInt(m) - 1]} ${y.slice(-2)}`
}

const isoDate = (d: Date) => d.toISOString().slice(0, 10)

export default function ConsumoMensualPage() {
  const today = new Date()
  const hace12 = new Date(today.getFullYear(), today.getMonth() - 11, 1)
  const [desde, setDesde] = useState(isoDate(hace12))
  const [hasta, setHasta] = useState(isoDate(today))
  const [data, setData] = useState<ReporteData | null>(null)
  const [loading, setLoading] = useState(true)

  const cargar = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ desde, hasta })
      const res = await fetch(`/api/seguridad/reportes/consumo-mensual?${params.toString()}`)
      if (!res.ok) throw new Error()
      setData(await res.json())
    } catch {
      toast.error('Error al cargar reporte')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { cargar() }, [desde, hasta])

  // Para el chart de barras simple — el max de cantidad
  const maxCantidad = data?.meses.reduce((m, x) => Math.max(m, x.cantidad), 0) ?? 1

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-4 max-w-6xl">
      <div className="flex items-center gap-3">
        <Link href="/seguridad/reportes"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-500" /> Consumo mensual
          </h1>
          <p className="text-sm text-muted-foreground">Cantidad y costo de EPPs entregados por mes</p>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4 grid grid-cols-2 gap-3 max-w-md">
          <div className="space-y-1">
            <Label className="text-xs">Desde</Label>
            <Input type="date" value={desde} onChange={e => setDesde(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Hasta</Label>
            <Input type="date" value={hasta} onChange={e => setHasta(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : !data ? null : (
        <>
          {/* Totales */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card><CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Entregas</p>
              <p className="text-2xl font-bold">{data.totales.items}</p>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Items entregados</p>
              <p className="text-2xl font-bold">{data.totales.cantidad}</p>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Costo PEN</p>
              <p className="text-xl font-bold text-blue-700">{formatMonto(data.totales.costoPEN, 'PEN')}</p>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Costo USD</p>
              <p className="text-xl font-bold text-blue-700">{formatMonto(data.totales.costoUSD, 'USD')}</p>
            </CardContent></Card>
          </div>

          {/* Gráfico de barras simple (texto / divs) */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Cantidad por mes</CardTitle></CardHeader>
            <CardContent>
              {data.meses.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">Sin datos en el rango</p>
              ) : (
                <div className="space-y-2">
                  {data.meses.map(m => (
                    <div key={m.mes} className="grid grid-cols-[80px_1fr_60px] gap-2 items-center text-xs">
                      <span className="font-mono text-muted-foreground">{formatMes(m.mes)}</span>
                      <div className="bg-blue-100 rounded h-5 overflow-hidden">
                        <div
                          className="h-full bg-blue-500 transition-all"
                          style={{ width: `${(m.cantidad / maxCantidad) * 100}%` }}
                        />
                      </div>
                      <span className="text-right font-semibold">{m.cantidad}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tabla detalle por mes */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Detalle por mes</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mes</TableHead>
                    <TableHead className="text-right">Cantidad</TableHead>
                    <TableHead className="text-right">Costo PEN</TableHead>
                    <TableHead className="text-right">Costo USD</TableHead>
                    {SUBCATEGORIAS.map(s => (
                      <TableHead key={s} className="text-right text-[10px] capitalize">{s}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.meses.length === 0 ? (
                    <TableRow><TableCell colSpan={4 + SUBCATEGORIAS.length} className="text-center text-muted-foreground py-8">Sin datos</TableCell></TableRow>
                  ) : (
                    data.meses.map(m => (
                      <TableRow key={m.mes}>
                        <TableCell className="font-mono text-xs">{formatMes(m.mes)}</TableCell>
                        <TableCell className="text-right text-sm font-semibold">{m.cantidad}</TableCell>
                        <TableCell className="text-right text-xs font-mono">{formatMonto(m.costoPEN, 'PEN')}</TableCell>
                        <TableCell className="text-right text-xs font-mono">{formatMonto(m.costoUSD, 'USD')}</TableCell>
                        {SUBCATEGORIAS.map(s => (
                          <TableCell key={s} className="text-right text-xs">
                            {m.porSubcategoria[s] || '—'}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
