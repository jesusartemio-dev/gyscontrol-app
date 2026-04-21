'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
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
import { Loader2, Search, FileSpreadsheet, Plus } from 'lucide-react'
import * as XLSX from 'xlsx'
import { IngresoManualModal } from './IngresoManualModal'

interface StockRow {
  id: string
  cantidadDisponible: number
  cantidadReservada: number
  costoUnitarioPromedio: number | null
  costoMoneda: string
  catalogoEquipo: {
    id: string
    codigo: string
    descripcion: string
    marca: string
    categoriaEquipo: { id: string; nombre: string } | null
    unidad: { id: string; nombre: string } | null
  } | null
  almacen: { nombre: string }
}

const ROLES_INGRESO = ['admin', 'gerente', 'coordinador_logistico', 'logistico']

export default function MaterialesAlmacen() {
  const { data: session } = useSession()
  const puedeIngresar = ROLES_INGRESO.includes(session?.user?.role || '')

  const [data, setData] = useState<StockRow[]>([])
  const [loading, setLoading] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [soloConStock, setSoloConStock] = useState(true)
  const [filtroCategoria, setFiltroCategoria] = useState('todos')
  const [modalIngresoAbierto, setModalIngresoAbierto] = useState(false)
  const [tipoCambio, setTipoCambio] = useState<number>(3.8)

  // Cargar TC guardado (persiste entre sesiones)
  useEffect(() => {
    const tc = localStorage.getItem('almacen-tipoCambio')
    if (tc) setTipoCambio(Number(tc) || 3.8)
  }, [])

  function actualizarTipoCambio(valor: number) {
    setTipoCambio(valor)
    if (valor > 0) localStorage.setItem('almacen-tipoCambio', String(valor))
  }

  // Convierte cualquier costo a USD
  function aUSD(valor: number, moneda: string): number {
    if (moneda === 'USD') return valor
    if (moneda === 'PEN' && tipoCambio > 0) return valor / tipoCambio
    return valor
  }

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

  // Totales consolidados en USD
  const totales = useMemo(() => {
    let valorTotalUSD = 0
    let valorOriginalPEN = 0
    let valorOriginalUSD = 0
    const porCategoria = new Map<string, number>()
    for (const s of dataFiltrada) {
      if (s.cantidadDisponible > 0 && s.costoUnitarioPromedio && s.costoUnitarioPromedio > 0) {
        const valorOriginal = s.cantidadDisponible * s.costoUnitarioPromedio
        const valorUSD = aUSD(valorOriginal, s.costoMoneda)
        valorTotalUSD += valorUSD
        if (s.costoMoneda === 'USD') valorOriginalUSD += valorOriginal
        else if (s.costoMoneda === 'PEN') valorOriginalPEN += valorOriginal
        const catNombre = s.catalogoEquipo?.categoriaEquipo?.nombre || 'Sin categoría'
        porCategoria.set(catNombre, (porCategoria.get(catNombre) || 0) + valorUSD)
      }
    }
    return {
      valorTotalUSD,
      valorOriginalPEN,
      valorOriginalUSD,
      porCategoria: Array.from(porCategoria.entries())
        .map(([nombre, valor]) => ({ nombre, valor }))
        .sort((a, b) => b.valor - a.valor),
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataFiltrada, tipoCambio])

  function formatMoneda(valor: number, moneda: string) {
    return `${moneda === 'USD' ? 'US$' : 'S/'} ${valor.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  function exportar() {
    const rows = dataFiltrada.map(s => ({
      Código: s.catalogoEquipo?.codigo,
      Descripción: s.catalogoEquipo?.descripcion,
      Categoría: s.catalogoEquipo?.categoriaEquipo?.nombre || '',
      Marca: s.catalogoEquipo?.marca,
      Unidad: s.catalogoEquipo?.unidad?.nombre || '',
      'Disponible': s.cantidadDisponible,
      'Reservado': s.cantidadReservada,
      'Costo unitario': s.costoUnitarioPromedio ?? '',
      'Moneda': s.costoMoneda,
      'Valor en stock': s.costoUnitarioPromedio ? s.cantidadDisponible * s.costoUnitarioPromedio : '',
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
          <p className="text-sm text-muted-foreground">Saldo actual y valor del inventario</p>
        </div>
        <div className="flex gap-2">
          {puedeIngresar && (
            <Button onClick={() => setModalIngresoAbierto(true)}>
              <Plus className="mr-2 h-4 w-4" /> Ingreso manual
            </Button>
          )}
          <Button variant="outline" onClick={exportar} disabled={dataFiltrada.length === 0}>
            <FileSpreadsheet className="mr-2 h-4 w-4" /> Exportar Excel
          </Button>
        </div>
      </div>

      {/* KPIs de valor consolidados en USD */}
      {totales.valorTotalUSD > 0 && (
        <div className="mb-4 grid gap-3 md:grid-cols-3">
          <Card>
            <CardContent className="py-3">
              <p className="text-xs text-muted-foreground">Valor total (consolidado en USD)</p>
              <p className="text-2xl font-bold text-emerald-700">{formatMoneda(totales.valorTotalUSD, 'USD')}</p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                TC PEN/USD: {tipoCambio.toFixed(2)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-3">
              <p className="mb-1 text-xs text-muted-foreground">Desglose por moneda original</p>
              <div className="space-y-0.5 text-xs">
                {totales.valorOriginalUSD > 0 && (
                  <div className="flex items-center justify-between">
                    <span>En USD</span>
                    <span className="font-semibold">{formatMoneda(totales.valorOriginalUSD, 'USD')}</span>
                  </div>
                )}
                {totales.valorOriginalPEN > 0 && (
                  <div className="flex items-center justify-between">
                    <span>En PEN</span>
                    <span className="font-semibold">{formatMoneda(totales.valorOriginalPEN, 'PEN')}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          {totales.porCategoria.length > 0 && (
            <Card>
              <CardContent className="py-3">
                <p className="mb-1 text-xs text-muted-foreground">Top 3 categorías (en USD)</p>
                <div className="space-y-0.5 text-xs">
                  {totales.porCategoria.slice(0, 3).map(c => (
                    <div key={c.nombre} className="flex items-center justify-between">
                      <span className="truncate">{c.nombre}</span>
                      <span className="font-semibold">{formatMoneda(c.valor, 'USD')}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

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
          <div>
            <Label className="text-xs text-muted-foreground">TC PEN/USD</Label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              value={tipoCambio}
              onChange={e => actualizarTipoCambio(Number(e.target.value) || 0)}
              className="w-24"
            />
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
          <Button onClick={() => cargar(busqueda)} disabled={loading} variant="outline">
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
                <TableHead className="text-right">Disponible</TableHead>
                <TableHead className="text-right">Costo unit.</TableHead>
                <TableHead className="text-right">Valor en stock</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dataFiltrada.map(s => {
                const valor = s.cantidadDisponible > 0 && s.costoUnitarioPromedio
                  ? s.cantidadDisponible * s.costoUnitarioPromedio
                  : null
                return (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-xs">{s.catalogoEquipo?.codigo}</TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm">{s.catalogoEquipo?.descripcion}</p>
                        {s.catalogoEquipo?.marca && (
                          <p className="text-xs text-muted-foreground">{s.catalogoEquipo.marca}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      {s.catalogoEquipo?.categoriaEquipo?.nombre ? (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700">
                          {s.catalogoEquipo.categoriaEquipo.nombre}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {s.cantidadDisponible.toLocaleString('es-PE', { maximumFractionDigits: 2 })}
                      {s.catalogoEquipo?.unidad && (
                        <span className="ml-1 text-[10px] font-normal text-muted-foreground">
                          {s.catalogoEquipo.unidad.nombre}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {s.costoUnitarioPromedio
                        ? formatMoneda(s.costoUnitarioPromedio, s.costoMoneda)
                        : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      {valor != null ? (
                        <div>
                          <p className="font-semibold text-emerald-700">{formatMoneda(valor, s.costoMoneda)}</p>
                          {s.costoMoneda === 'PEN' && tipoCambio > 0 && (
                            <p className="text-[10px] text-muted-foreground">
                              ≈ {formatMoneda(aUSD(valor, s.costoMoneda), 'USD')}
                            </p>
                          )}
                        </div>
                      ) : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      {s.cantidadDisponible > 0 ? (
                        <Badge variant="outline" className="bg-emerald-100 text-emerald-700">En stock</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-gray-100 text-gray-600">Sin stock</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
              {dataFiltrada.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    {soloConStock && conStock === 0
                      ? 'No hay ítems con stock. Desactiva "Solo con stock" para ver el histórico.'
                      : 'Sin ítems. Usa "Ingreso manual" para cargar tu inventario actual.'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <IngresoManualModal
        open={modalIngresoAbierto}
        onOpenChange={setModalIngresoAbierto}
        onSuccess={() => cargar(busqueda)}
      />
    </div>
  )
}
