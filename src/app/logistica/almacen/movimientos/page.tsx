'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Loader2, FileSpreadsheet } from 'lucide-react'
import * as XLSX from 'xlsx'

interface Movimiento {
  id: string
  tipo: string
  cantidad: number
  fechaMovimiento: string
  observaciones: string | null
  usuario: { name: string | null; email: string }
  catalogoEquipo: { codigo: string; descripcion: string } | null
  catalogoHerramienta: { codigo: string; nombre: string } | null
  herramientaUnidad: { serie: string } | null
}

const TIPO_COLORS: Record<string, string> = {
  entrada_recepcion: 'bg-emerald-100 text-emerald-700',
  salida_proyecto: 'bg-red-100 text-red-700',
  devolucion_proyecto: 'bg-blue-100 text-blue-700',
  alta_herramienta: 'bg-purple-100 text-purple-700',
  prestamo_herramienta: 'bg-amber-100 text-amber-700',
  devolucion_herramienta: 'bg-cyan-100 text-cyan-700',
  baja_herramienta: 'bg-gray-200 text-gray-700',
  ajuste_inventario: 'bg-orange-100 text-orange-700',
}

function hoy() { return new Date().toISOString().slice(0, 10) }
function haceDias(n: number) {
  const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10)
}

export default function MovimientosPage() {
  const [data, setData] = useState<{ total: number; movimientos: Movimiento[] }>({ total: 0, movimientos: [] })
  const [loading, setLoading] = useState(false)
  const [desde, setDesde] = useState(haceDias(30))
  const [hasta, setHasta] = useState(hoy())
  const [tipo, setTipo] = useState('todos')

  const cargar = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ desde, hasta, limit: '200' })
    if (tipo !== 'todos') params.set('tipo', tipo)
    const r = await fetch(`/api/logistica/almacen/movimientos?${params}`)
    setData(await r.json())
    setLoading(false)
  }, [desde, hasta, tipo])

  useEffect(() => { cargar() }, [])

  function exportar() {
    const rows = data.movimientos.map(m => ({
      Fecha: new Date(m.fechaMovimiento).toLocaleString('es-PE'),
      Tipo: m.tipo,
      Ítem: m.catalogoEquipo?.descripcion || m.catalogoHerramienta?.nombre || '—',
      Código: m.catalogoEquipo?.codigo || m.catalogoHerramienta?.codigo || '—',
      Serie: m.herramientaUnidad?.serie || '—',
      Cantidad: m.cantidad,
      Usuario: m.usuario.name || m.usuario.email,
      Observaciones: m.observaciones || '',
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Movimientos')
    XLSX.writeFile(wb, `kardex_${desde}_${hasta}.xlsx`)
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Movimientos — Kardex</h1>
          <p className="text-sm text-muted-foreground">Historial completo de entradas y salidas del almacén</p>
        </div>
        <Button variant="outline" onClick={exportar} disabled={data.movimientos.length === 0}>
          <FileSpreadsheet className="mr-2 h-4 w-4" /> Exportar Excel
        </Button>
      </div>

      <Card className="mb-4">
        <CardContent className="flex flex-wrap items-end gap-3 py-4">
          <div>
            <label className="text-xs text-muted-foreground">Desde</label>
            <Input type="date" value={desde} onChange={e => setDesde(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Hasta</label>
            <Input type="date" value={hasta} onChange={e => setHasta(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Tipo</label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="entrada_recepcion">Entrada recepción</SelectItem>
                <SelectItem value="salida_proyecto">Salida a proyecto</SelectItem>
                <SelectItem value="devolucion_proyecto">Devolución de proyecto</SelectItem>
                <SelectItem value="alta_herramienta">Alta herramienta</SelectItem>
                <SelectItem value="prestamo_herramienta">Préstamo herramienta</SelectItem>
                <SelectItem value="devolucion_herramienta">Devolución herramienta</SelectItem>
                <SelectItem value="ajuste_inventario">Ajuste inventario</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={cargar} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Filtrar
          </Button>
        </CardContent>
      </Card>

      <p className="mb-2 text-sm text-muted-foreground">{data.total} movimientos totales</p>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Ítem</TableHead>
                <TableHead>Serie</TableHead>
                <TableHead className="text-right">Cantidad</TableHead>
                <TableHead>Registrado por</TableHead>
                <TableHead>Observaciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.movimientos.map(m => (
                <TableRow key={m.id}>
                  <TableCell className="font-mono text-xs whitespace-nowrap">
                    {new Date(m.fechaMovimiento).toLocaleString('es-PE')}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-xs ${TIPO_COLORS[m.tipo] || 'bg-gray-100'}`}>
                      {m.tipo.replace(/_/g, ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    <p className="font-medium">{m.catalogoEquipo?.descripcion || m.catalogoHerramienta?.nombre || '—'}</p>
                    <p className="text-xs text-muted-foreground">{m.catalogoEquipo?.codigo || m.catalogoHerramienta?.codigo}</p>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{m.herramientaUnidad?.serie || '—'}</TableCell>
                  <TableCell className="text-right font-semibold">
                    {['salida_proyecto', 'prestamo_herramienta', 'baja_herramienta'].includes(m.tipo)
                      ? <span className="text-red-600">-{m.cantidad}</span>
                      : <span className="text-emerald-600">+{m.cantidad}</span>
                    }
                  </TableCell>
                  <TableCell className="text-xs">{m.usuario.name || m.usuario.email}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{m.observaciones || '—'}</TableCell>
                </TableRow>
              ))}
              {data.movimientos.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    Sin movimientos en el período seleccionado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
