'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Loader2, Search, FileSpreadsheet } from 'lucide-react'
import * as XLSX from 'xlsx'

interface StockRow {
  id: string
  cantidadDisponible: number
  cantidadReservada: number
  catalogoEquipo: {
    id: string
    codigo: string
    descripcion: string
    marca: string
    categoriaEquipo: { id: string; nombre: string } | null
  } | null
  almacen: { nombre: string }
}

export default function MaterialesAlmacen() {
  const [data, setData] = useState<StockRow[]>([])
  const [loading, setLoading] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [soloConStock, setSoloConStock] = useState(true)
  const [filtroCategoria, setFiltroCategoria] = useState('todos')

  const cargar = useCallback(async (q = '') => {
    setLoading(true)
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    params.set('soloConStock', 'false') // Traemos todo y filtramos en cliente
    const r = await fetch(`/api/logistica/almacen/stock?${params}`)
    const all: StockRow[] = await r.json()
    setData(all.filter(s => s.catalogoEquipo !== null))
    setLoading(false)
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const categorias = useMemo(() => {
    const set = new Set<string>()
    for (const s of data) {
      if (s.catalogoEquipo?.categoriaEquipo?.nombre) set.add(s.catalogoEquipo.categoriaEquipo.nombre)
    }
    return Array.from(set).sort()
  }, [data])

  const dataFiltrada = useMemo(() => {
    let rows = data
    if (soloConStock) rows = rows.filter(s => s.cantidadDisponible > 0)
    if (filtroCategoria !== 'todos') {
      rows = rows.filter(s => s.catalogoEquipo?.categoriaEquipo?.nombre === filtroCategoria)
    }
    return rows
  }, [data, soloConStock, filtroCategoria])

  const conStock = useMemo(() => data.filter(s => s.cantidadDisponible > 0).length, [data])
  const sinStock = data.length - conStock

  function exportar() {
    const rows = dataFiltrada.map(s => ({
      Código: s.catalogoEquipo?.codigo,
      Descripción: s.catalogoEquipo?.descripcion,
      Categoría: s.catalogoEquipo?.categoriaEquipo?.nombre || '',
      Marca: s.catalogoEquipo?.marca,
      'Disponible': s.cantidadDisponible,
      'Reservado': s.cantidadReservada,
      Almacén: s.almacen.nombre,
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Stock')
    XLSX.writeFile(wb, `stock_materiales_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Materiales / Equipos — Stock</h1>
          <p className="text-sm text-muted-foreground">Saldo actual por ítem de catálogo</p>
        </div>
        <Button variant="outline" onClick={exportar} disabled={dataFiltrada.length === 0}>
          <FileSpreadsheet className="mr-2 h-4 w-4" /> Exportar Excel
        </Button>
      </div>

      <Card className="mb-4">
        <CardContent className="flex flex-wrap items-end gap-3 py-4">
          <div className="flex flex-1 min-w-[200px] items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por código o descripción..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && cargar(busqueda)}
              className="max-w-xs"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Categoría</label>
            <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
              <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas</SelectItem>
                {categorias.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 pb-1">
            <Switch
              id="solo-con-stock"
              checked={soloConStock}
              onCheckedChange={setSoloConStock}
            />
            <Label htmlFor="solo-con-stock" className="cursor-pointer text-sm">
              Solo con stock
            </Label>
          </div>
          <Button onClick={() => cargar(busqueda)} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Actualizar
          </Button>
        </CardContent>
      </Card>

      <p className="mb-2 text-sm text-muted-foreground">
        <span className="font-semibold text-foreground">{dataFiltrada.length}</span> visibles ·{' '}
        <span className="text-emerald-700">{conStock} con stock</span> ·{' '}
        <span className="text-gray-500">{sinStock} históricos sin stock</span>
        {soloConStock && sinStock > 0 && (
          <span className="ml-2 text-xs italic">
            (los históricos quedan ocultos — desactiva "Solo con stock" para verlos)
          </span>
        )}
      </p>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Marca</TableHead>
                <TableHead className="text-right">Disponible</TableHead>
                <TableHead className="text-right">Reservado</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dataFiltrada.map(s => (
                <TableRow key={s.id}>
                  <TableCell className="font-mono text-xs">{s.catalogoEquipo?.codigo}</TableCell>
                  <TableCell>{s.catalogoEquipo?.descripcion}</TableCell>
                  <TableCell className="text-xs">
                    {s.catalogoEquipo?.categoriaEquipo?.nombre ? (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700">
                        {s.catalogoEquipo.categoriaEquipo.nombre}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{s.catalogoEquipo?.marca}</TableCell>
                  <TableCell className="text-right font-semibold">
                    {s.cantidadDisponible.toLocaleString('es-PE', { maximumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {s.cantidadReservada > 0 ? s.cantidadReservada : '—'}
                  </TableCell>
                  <TableCell>
                    {s.cantidadDisponible > 0 ? (
                      <Badge variant="outline" className="bg-emerald-100 text-emerald-700">En stock</Badge>
                    ) : (
                      <Badge variant="outline" className="bg-gray-100 text-gray-600">Sin stock</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {dataFiltrada.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    {soloConStock && conStock === 0
                      ? 'No hay ítems con stock. Desactiva "Solo con stock" para ver el histórico.'
                      : 'Sin ítems. El stock se actualiza automáticamente con las recepciones.'}
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
