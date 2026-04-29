'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Loader2, Plus, Search } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

const SUBCATEGORIAS = [
  { value: 'cabeza', label: 'Cabeza' },
  { value: 'manos', label: 'Manos' },
  { value: 'ojos', label: 'Ojos' },
  { value: 'auditiva', label: 'Auditiva' },
  { value: 'respiratoria', label: 'Respiratoria' },
  { value: 'pies', label: 'Pies' },
  { value: 'caida', label: 'Caída' },
  { value: 'ropa', label: 'Ropa' },
  { value: 'visibilidad', label: 'Visibilidad' },
  { value: 'otro', label: 'Otro' },
]

interface StockItem {
  id: string
  cantidadDisponible: number
  cantidadReservada: number
  costoUnitarioPromedio: number | null
  costoMoneda: string
  almacen: { id: string; nombre: string }
  catalogoEpp: {
    id: string
    codigo: string
    descripcion: string
    marca: string | null
    subcategoria: string
    requiereTalla: boolean
    unidad: { nombre: string }
  }
}

export default function StockEppPage() {
  const [items, setItems] = useState<StockItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtroSub, setFiltroSub] = useState('todas')
  const [soloDisponibles, setSoloDisponibles] = useState(false)

  useEffect(() => {
    const cargar = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        if (filtroSub !== 'todas') params.set('subcategoria', filtroSub)
        if (soloDisponibles) params.set('soloDisponibles', 'true')
        if (busqueda) params.set('busqueda', busqueda)
        const res = await fetch(`/api/stock-epp?${params.toString()}`)
        if (!res.ok) throw new Error()
        setItems(await res.json())
      } catch {
        toast.error('Error al cargar stock')
      } finally {
        setLoading(false)
      }
    }
    const t = setTimeout(cargar, 200)
    return () => clearTimeout(t)
  }, [busqueda, filtroSub, soloDisponibles])

  const formatCosto = (item: StockItem) => {
    if (!item.costoUnitarioPromedio) return '—'
    const sym = item.costoMoneda === 'USD' ? 'US$' : 'S/'
    return `${sym} ${item.costoUnitarioPromedio.toFixed(2)}`
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-4 max-w-6xl">
      <div className="flex items-center gap-3">
        <Link href="/seguridad">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold">Stock EPP</h1>
          <p className="text-sm text-muted-foreground">Cantidades disponibles por almacén</p>
        </div>
        <Link href="/seguridad/stock/ingreso">
          <Button className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="h-4 w-4 mr-1" /> Ingresar stock
          </Button>
        </Link>
      </div>

      <Card>
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar EPP..." className="pl-8" />
          </div>
          <Select value={filtroSub} onValueChange={setFiltroSub}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas las subcategorías</SelectItem>
              {SUBCATEGORIAS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={soloDisponibles} onCheckedChange={setSoloDisponibles} />
            Solo con stock {'>'} 0
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : items.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              Sin registros de stock. Cuando logística reciba EPPs en almacén, aparecerán acá.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>EPP</TableHead>
                  <TableHead>Subcategoría</TableHead>
                  <TableHead>Almacén</TableHead>
                  <TableHead className="text-right">Disponible</TableHead>
                  <TableHead className="text-right">Reservado</TableHead>
                  <TableHead className="text-right">Costo prom.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map(s => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-xs">{s.catalogoEpp.codigo}</TableCell>
                    <TableCell className="text-sm">
                      <div className="font-medium">{s.catalogoEpp.descripcion}</div>
                      {s.catalogoEpp.marca && <div className="text-[10px] text-muted-foreground">{s.catalogoEpp.marca}</div>}
                    </TableCell>
                    <TableCell><Badge variant="secondary" className="text-[10px]">{s.catalogoEpp.subcategoria}</Badge></TableCell>
                    <TableCell className="text-xs">{s.almacen.nombre}</TableCell>
                    <TableCell className={`text-right font-mono text-sm ${s.cantidadDisponible <= 0 ? 'text-red-600' : 'text-emerald-700 font-semibold'}`}>
                      {s.cantidadDisponible} <span className="text-[10px] text-muted-foreground">{s.catalogoEpp.unidad.nombre}</span>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-muted-foreground">
                      {s.cantidadReservada}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">{formatCosto(s)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
