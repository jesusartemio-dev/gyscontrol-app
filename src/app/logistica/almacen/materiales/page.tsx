'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Loader2, Search, FileSpreadsheet } from 'lucide-react'
import * as XLSX from 'xlsx'

interface StockRow {
  id: string
  cantidadDisponible: number
  cantidadReservada: number
  catalogoEquipo: { id: string; codigo: string; descripcion: string; marca: string } | null
  almacen: { nombre: string }
}

export default function MaterialesAlmacen() {
  const [data, setData] = useState<StockRow[]>([])
  const [loading, setLoading] = useState(false)
  const [busqueda, setBusqueda] = useState('')

  const cargar = useCallback(async (q = '') => {
    setLoading(true)
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    params.set('soloConStock', 'false')
    const r = await fetch(`/api/logistica/almacen/stock?${params}`)
    const all: StockRow[] = await r.json()
    setData(all.filter(s => s.catalogoEquipo !== null))
    setLoading(false)
  }, [])

  useEffect(() => { cargar() }, [cargar])

  function exportar() {
    const rows = data.map(s => ({
      Código: s.catalogoEquipo?.codigo,
      Descripción: s.catalogoEquipo?.descripcion,
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
        <Button variant="outline" onClick={exportar} disabled={data.length === 0}>
          <FileSpreadsheet className="mr-2 h-4 w-4" /> Exportar Excel
        </Button>
      </div>

      <Card className="mb-4">
        <CardContent className="flex items-center gap-3 py-4">
          <div className="flex flex-1 items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por código o descripción..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && cargar(busqueda)}
              className="max-w-xs"
            />
          </div>
          <Button onClick={() => cargar(busqueda)} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Buscar
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Marca</TableHead>
                <TableHead className="text-right">Disponible</TableHead>
                <TableHead className="text-right">Reservado</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map(s => (
                <TableRow key={s.id}>
                  <TableCell className="font-mono text-xs">{s.catalogoEquipo?.codigo}</TableCell>
                  <TableCell>{s.catalogoEquipo?.descripcion}</TableCell>
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
              {data.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    Sin ítems en el almacén. El stock se actualiza automáticamente con las recepciones.
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
