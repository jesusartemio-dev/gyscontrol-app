'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Building2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

interface Bucket {
  tipo: 'proyecto' | 'centro' | 'sin_imputar'
  id: string | null
  label: string
  cantidadItems: number
  cantidadTotal: number
  costoPEN: number
  costoUSD: number
}

const formatMonto = (n: number, m: string) => {
  if (!n) return '—'
  const sym = m === 'USD' ? 'US$' : 'S/'
  return `${sym} ${n.toFixed(2)}`
}
const isoDate = (d: Date) => d.toISOString().slice(0, 10)

export default function ReportePorImputacionPage() {
  const today = new Date()
  const hace12 = new Date(today.getFullYear(), today.getMonth() - 11, 1)
  const [desde, setDesde] = useState(isoDate(hace12))
  const [hasta, setHasta] = useState(isoDate(today))
  const [buckets, setBuckets] = useState<Bucket[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const cargar = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams({ desde, hasta })
        const res = await fetch(`/api/seguridad/reportes/por-imputacion?${params.toString()}`)
        if (!res.ok) throw new Error()
        const data = await res.json()
        setBuckets(data.buckets)
      } catch {
        toast.error('Error al cargar reporte')
      } finally {
        setLoading(false)
      }
    }
    cargar()
  }, [desde, hasta])

  const proyectos = buckets.filter(b => b.tipo === 'proyecto')
  const centros = buckets.filter(b => b.tipo === 'centro')
  const sinImputar = buckets.find(b => b.tipo === 'sin_imputar')

  const totalPEN = buckets.reduce((s, b) => s + b.costoPEN, 0)
  const totalUSD = buckets.reduce((s, b) => s + b.costoUSD, 0)
  const totalItems = buckets.reduce((s, b) => s + b.cantidadItems, 0)
  const maxCosto = Math.max(...buckets.map(b => b.costoPEN + b.costoUSD), 1)

  const renderBucketTable = (lista: Bucket[], titulo: string, color: string) => (
    <Card>
      <CardHeader className="pb-3"><CardTitle className="text-sm">{titulo} ({lista.length})</CardTitle></CardHeader>
      <CardContent className="p-0">
        {lista.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Sin datos</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead></TableHead>
                <TableHead>{titulo === 'Proyectos' ? 'Proyecto' : titulo === 'Centros de costo' ? 'Centro' : 'Categoría'}</TableHead>
                <TableHead className="text-right">Items</TableHead>
                <TableHead className="text-right">Cant. total</TableHead>
                <TableHead className="text-right">Costo PEN</TableHead>
                <TableHead className="text-right">Costo USD</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lista.map(b => {
                const total = b.costoPEN + b.costoUSD
                const pct = (total / maxCosto) * 100
                return (
                  <TableRow key={`${b.tipo}-${b.id ?? 'na'}`}>
                    <TableCell className="w-24 p-2">
                      <div className={`h-1.5 rounded ${color}`} style={{ width: `${pct}%` }} />
                    </TableCell>
                    <TableCell className="text-sm font-medium">{b.label}</TableCell>
                    <TableCell className="text-right text-xs">{b.cantidadItems}</TableCell>
                    <TableCell className="text-right text-xs">{b.cantidadTotal}</TableCell>
                    <TableCell className="text-right text-xs font-mono">{formatMonto(b.costoPEN, 'PEN')}</TableCell>
                    <TableCell className="text-right text-xs font-mono">{formatMonto(b.costoUSD, 'USD')}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-4 max-w-6xl">
      <div className="flex items-center gap-3">
        <Link href="/seguridad/reportes"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Building2 className="h-5 w-5 text-orange-500" /> EPPs por proyecto / centro de costo
          </h1>
          <p className="text-sm text-muted-foreground">Costo de EPPs entregados según imputación informativa</p>
        </div>
      </div>

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
      ) : (
        <>
          {/* Totales */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Card><CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Total entregas</p>
              <p className="text-2xl font-bold">{totalItems}</p>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Total PEN</p>
              <p className="text-xl font-bold text-blue-700">{formatMonto(totalPEN, 'PEN')}</p>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Total USD</p>
              <p className="text-xl font-bold text-blue-700">{formatMonto(totalUSD, 'USD')}</p>
            </CardContent></Card>
          </div>

          {renderBucketTable(proyectos, 'Proyectos', 'bg-blue-500')}
          {renderBucketTable(centros, 'Centros de costo', 'bg-emerald-500')}
          {sinImputar && renderBucketTable([sinImputar], 'Sin imputación', 'bg-gray-400')}

          <p className="text-[10px] text-center text-muted-foreground">
            ⚠️ La imputación de las entregas EPP es informativa — no afecta el costo contable del proyecto. El costo contable se mantiene en la OC original.
          </p>
        </>
      )}
    </div>
  )
}
