'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ArrowLeft, Loader2, Building2, User, Calendar, ClipboardList } from 'lucide-react'
import { toast } from 'sonner'

interface EntregaDetalle {
  id: string
  numero: string
  fechaEntrega: string
  estado: string
  observaciones: string | null
  empleado: {
    id: string
    documentoIdentidad: string | null
    telefono: string | null
    tallaCamisa: string | null
    tallaPantalon: string | null
    tallaCalzado: string | null
    tallaCasco: string | null
    cargo: { nombre: string } | null
    departamento: { nombre: string } | null
    user: { name: string; email: string }
  }
  almacen: { nombre: string }
  proyecto: { codigo: string; nombre: string } | null
  centroCosto: { nombre: string } | null
  entregadoPor: { name: string }
  items: Array<{
    id: string
    cantidad: number
    talla: string | null
    costoUnitario: number | null
    costoMoneda: string
    fechaReposicionEstimada: string | null
    estado: string
    observaciones: string | null
    catalogoEpp: {
      codigo: string
      descripcion: string
      marca: string | null
      subcategoria: string
      unidad: { nombre: string }
    }
  }>
}

const formatFecha = (s: string | null) =>
  s ? new Date(s).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

const formatCosto = (monto: number | null, moneda: string) => {
  if (monto == null) return '—'
  const sym = moneda === 'USD' ? 'US$' : 'S/'
  return `${sym} ${monto.toFixed(2)}`
}

export default function EntregaEppDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [data, setData] = useState<EntregaDetalle | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/entrega-epp/${id}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(setData)
      .catch(() => toast.error('Error al cargar entrega'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
  }
  if (!data) {
    return <p className="text-center py-10 text-sm text-muted-foreground">Entrega no encontrada</p>
  }

  const totalCantidad = data.items.reduce((s, i) => s + i.cantidad, 0)
  const totalCosto = data.items.reduce((s, i) => s + (i.costoUnitario ?? 0) * i.cantidad, 0)
  const monedaTotal = data.items[0]?.costoMoneda ?? 'PEN'

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-4 max-w-5xl">
      <div className="flex items-center gap-3">
        <Link href="/seguridad/entregas"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">{data.numero}</h1>
            <Badge>{data.estado}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">Entrega de EPPs · {formatFecha(data.fechaEntrega)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><User className="h-4 w-4" /> Empleado</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            <p className="font-semibold text-sm">{data.empleado.user.name}</p>
            {data.empleado.documentoIdentidad && <p className="text-xs font-mono text-muted-foreground">DNI: {data.empleado.documentoIdentidad}</p>}
            {data.empleado.cargo && <p className="text-xs">{data.empleado.cargo.nombre}</p>}
            {data.empleado.departamento && <p className="text-[10px] text-muted-foreground">{data.empleado.departamento.nombre}</p>}
            <div className="flex flex-wrap gap-1 pt-2">
              {data.empleado.tallaCamisa && <Badge variant="secondary" className="text-[10px]">Camisa: {data.empleado.tallaCamisa}</Badge>}
              {data.empleado.tallaPantalon && <Badge variant="secondary" className="text-[10px]">Pantalón: {data.empleado.tallaPantalon}</Badge>}
              {data.empleado.tallaCalzado && <Badge variant="secondary" className="text-[10px]">Calzado: {data.empleado.tallaCalzado}</Badge>}
              {data.empleado.tallaCasco && <Badge variant="secondary" className="text-[10px]">Casco: {data.empleado.tallaCasco}</Badge>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Building2 className="h-4 w-4" /> Imputación</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p><span className="text-muted-foreground">Almacén:</span> {data.almacen.nombre}</p>
            {data.proyecto && <p><span className="text-muted-foreground">Proyecto:</span> {data.proyecto.codigo} — {data.proyecto.nombre}</p>}
            {data.centroCosto && <p><span className="text-muted-foreground">Centro de costo:</span> {data.centroCosto.nombre}</p>}
            {!data.proyecto && !data.centroCosto && <p className="text-xs text-muted-foreground">Sin imputar</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Calendar className="h-4 w-4" /> Trazabilidad</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p><span className="text-muted-foreground">Entregado por:</span> {data.entregadoPor.name}</p>
            <p><span className="text-muted-foreground">Fecha:</span> {formatFecha(data.fechaEntrega)}</p>
            {data.observaciones && <p className="text-xs mt-2 p-2 bg-muted/40 rounded">{data.observaciones}</p>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2"><ClipboardList className="h-4 w-4" /> EPPs entregados ({data.items.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>EPP</TableHead>
                <TableHead>Subcategoría</TableHead>
                <TableHead className="text-center">Cant.</TableHead>
                <TableHead>Talla</TableHead>
                <TableHead className="text-right">Costo unit.</TableHead>
                <TableHead className="text-right">Subtotal</TableHead>
                <TableHead>Reposición</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map(it => (
                <TableRow key={it.id}>
                  <TableCell className="font-mono text-xs">{it.catalogoEpp.codigo}</TableCell>
                  <TableCell className="text-sm">
                    <div className="font-medium">{it.catalogoEpp.descripcion}</div>
                    {it.catalogoEpp.marca && <div className="text-[10px] text-muted-foreground">{it.catalogoEpp.marca}</div>}
                  </TableCell>
                  <TableCell><Badge variant="secondary" className="text-[10px]">{it.catalogoEpp.subcategoria}</Badge></TableCell>
                  <TableCell className="text-center text-sm">{it.cantidad} <span className="text-[10px] text-muted-foreground">{it.catalogoEpp.unidad.nombre}</span></TableCell>
                  <TableCell className="text-xs">{it.talla || '—'}</TableCell>
                  <TableCell className="text-right text-xs font-mono">{formatCosto(it.costoUnitario, it.costoMoneda)}</TableCell>
                  <TableCell className="text-right text-xs font-mono">
                    {it.costoUnitario != null ? formatCosto(it.costoUnitario * it.cantidad, it.costoMoneda) : '—'}
                  </TableCell>
                  <TableCell className="text-xs">{formatFecha(it.fechaReposicionEstimada)}</TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{it.estado}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex justify-end gap-6 px-4 py-3 border-t text-sm">
            <span><span className="text-muted-foreground">Total cantidad:</span> <span className="font-semibold">{totalCantidad}</span></span>
            <span><span className="text-muted-foreground">Total costo:</span> <span className="font-semibold text-blue-700">{formatCosto(totalCosto, monedaTotal)}</span></span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
