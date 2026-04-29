'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, ChevronRight, Loader2, Search, Users } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

interface ResumenEmpleado {
  empleadoId: string
  nombre: string
  documentoIdentidad: string | null
  cargo: string | null
  departamento: string | null
  cantidadItems: number
  cantidadTotal: number
  costoPEN: number
  costoUSD: number
}

interface DetalleData {
  empleado: {
    id: string
    documentoIdentidad: string | null
    tallaCamisa: string | null
    tallaPantalon: string | null
    tallaCalzado: string | null
    tallaCasco: string | null
    cargo: { nombre: string } | null
    departamento: { nombre: string } | null
    user: { name: string; email: string }
  }
  totales: { items: number; cantidad: number; costoPEN: number; costoUSD: number }
  items: Array<{
    id: string
    cantidad: number
    talla: string | null
    costoUnitario: number | null
    costoMoneda: string
    fechaEntrega: string
    fechaReposicionEstimada: string | null
    estado: string
    catalogoEpp: { codigo: string; descripcion: string; marca: string | null; subcategoria: string; unidad: { nombre: string } }
    entrega: {
      numero: string
      fechaEntrega: string
      proyecto: { codigo: string } | null
      centroCosto: { nombre: string } | null
      entregadoPor: { name: string }
    }
  }>
}

const formatMonto = (n: number, m: string) => {
  if (!n) return '—'
  const sym = m === 'USD' ? 'US$' : 'S/'
  return `${sym} ${n.toFixed(2)}`
}
const formatFecha = (s: string | null) =>
  s ? new Date(s).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'
const isoDate = (d: Date) => d.toISOString().slice(0, 10)

export default function ReportePorEmpleadoPage() {
  const today = new Date()
  const haceAño = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate())
  const [desde, setDesde] = useState(isoDate(haceAño))
  const [hasta, setHasta] = useState(isoDate(today))
  const [busqueda, setBusqueda] = useState('')
  const [resumen, setResumen] = useState<ResumenEmpleado[]>([])
  const [empleadoSel, setEmpleadoSel] = useState<string | null>(null)
  const [detalle, setDetalle] = useState<DetalleData | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingDetalle, setLoadingDetalle] = useState(false)

  useEffect(() => {
    const cargar = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams({ desde, hasta })
        const res = await fetch(`/api/seguridad/reportes/por-empleado?${params.toString()}`)
        if (!res.ok) throw new Error()
        const data = await res.json()
        setResumen(data.empleados)
      } catch {
        toast.error('Error al cargar reporte')
      } finally {
        setLoading(false)
      }
    }
    cargar()
  }, [desde, hasta])

  useEffect(() => {
    if (!empleadoSel) {
      setDetalle(null)
      return
    }
    const cargar = async () => {
      setLoadingDetalle(true)
      try {
        const params = new URLSearchParams({ desde, hasta, empleadoId: empleadoSel })
        const res = await fetch(`/api/seguridad/reportes/por-empleado?${params.toString()}`)
        if (!res.ok) throw new Error()
        setDetalle(await res.json())
      } catch {
        toast.error('Error al cargar detalle')
      } finally {
        setLoadingDetalle(false)
      }
    }
    cargar()
  }, [empleadoSel, desde, hasta])

  const filtrados = busqueda
    ? resumen.filter(e => {
        const q = busqueda.toLowerCase()
        return e.nombre.toLowerCase().includes(q) ||
          (e.documentoIdentidad ?? '').includes(q) ||
          (e.cargo ?? '').toLowerCase().includes(q)
      })
    : resumen

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-4 max-w-7xl">
      <div className="flex items-center gap-3">
        <Link href="/seguridad/reportes"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Users className="h-5 w-5 text-emerald-500" /> EPPs por empleado
          </h1>
          <p className="text-sm text-muted-foreground">Auditoría laboral — qué EPPs ha recibido cada trabajador</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Desde</Label>
            <Input type="date" value={desde} onChange={e => setDesde(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Hasta</Label>
            <Input type="date" value={hasta} onChange={e => setHasta(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Buscar</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Nombre, DNI o cargo..." className="pl-8" />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Lista resumen */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Resumen por empleado ({filtrados.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0 max-h-[600px] overflow-auto">
            {loading ? (
              <div className="flex items-center justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : filtrados.length === 0 ? (
              <div className="py-16 text-center text-sm text-muted-foreground">Sin datos en el rango</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empleado</TableHead>
                    <TableHead className="text-right">Items</TableHead>
                    <TableHead className="text-right">Costo PEN</TableHead>
                    <TableHead className="text-right">Costo USD</TableHead>
                    <TableHead className="w-8"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtrados.map(e => (
                    <TableRow
                      key={e.empleadoId}
                      className={`cursor-pointer ${empleadoSel === e.empleadoId ? 'bg-emerald-50' : 'hover:bg-muted/40'}`}
                      onClick={() => setEmpleadoSel(e.empleadoId)}
                    >
                      <TableCell className="text-xs">
                        <div className="font-medium text-sm">{e.nombre}</div>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          {e.documentoIdentidad && <span className="font-mono">{e.documentoIdentidad}</span>}
                          {e.cargo && <span>· {e.cargo}</span>}
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-sm font-semibold">{e.cantidadItems}</TableCell>
                      <TableCell className="text-right text-xs font-mono">{formatMonto(e.costoPEN, 'PEN')}</TableCell>
                      <TableCell className="text-right text-xs font-mono">{formatMonto(e.costoUSD, 'USD')}</TableCell>
                      <TableCell><ChevronRight className="h-3.5 w-3.5 text-muted-foreground" /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Detalle del empleado seleccionado */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">
              {detalle ? `Detalle: ${detalle.empleado.user.name}` : 'Detalle'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 max-h-[600px] overflow-auto">
            {!empleadoSel ? (
              <div className="py-16 text-center text-sm text-muted-foreground">
                Selecciona un empleado en la lista de la izquierda
              </div>
            ) : loadingDetalle ? (
              <div className="flex items-center justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : !detalle ? null : (
              <div>
                <div className="px-4 pt-2 pb-3 border-b space-y-1 text-xs">
                  {detalle.empleado.documentoIdentidad && (
                    <p><span className="text-muted-foreground">DNI:</span> <span className="font-mono">{detalle.empleado.documentoIdentidad}</span></p>
                  )}
                  {detalle.empleado.cargo && <p><span className="text-muted-foreground">Cargo:</span> {detalle.empleado.cargo.nombre}</p>}
                  {detalle.empleado.departamento && <p><span className="text-muted-foreground">Depto:</span> {detalle.empleado.departamento.nombre}</p>}
                  <div className="flex flex-wrap gap-1 pt-1">
                    {detalle.empleado.tallaCamisa && <Badge variant="secondary" className="text-[9px]">Camisa: {detalle.empleado.tallaCamisa}</Badge>}
                    {detalle.empleado.tallaPantalon && <Badge variant="secondary" className="text-[9px]">Pantalón: {detalle.empleado.tallaPantalon}</Badge>}
                    {detalle.empleado.tallaCalzado && <Badge variant="secondary" className="text-[9px]">Calzado: {detalle.empleado.tallaCalzado}</Badge>}
                    {detalle.empleado.tallaCasco && <Badge variant="secondary" className="text-[9px]">Casco: {detalle.empleado.tallaCasco}</Badge>}
                  </div>
                  <div className="flex gap-4 pt-2">
                    <span><span className="text-muted-foreground">Items:</span> <strong>{detalle.totales.items}</strong></span>
                    <span><span className="text-muted-foreground">PEN:</span> <strong>{formatMonto(detalle.totales.costoPEN, 'PEN')}</strong></span>
                    <span><span className="text-muted-foreground">USD:</span> <strong>{formatMonto(detalle.totales.costoUSD, 'USD')}</strong></span>
                  </div>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>EPP</TableHead>
                      <TableHead>Talla</TableHead>
                      <TableHead className="text-center">Cant</TableHead>
                      <TableHead>Entrega</TableHead>
                      <TableHead>Vence</TableHead>
                      <TableHead className="text-right">Costo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detalle.items.map(it => (
                      <TableRow key={it.id} className="text-xs">
                        <TableCell>
                          <div className="font-medium">{it.catalogoEpp.descripcion}</div>
                          <div className="font-mono text-[10px] text-muted-foreground">{it.catalogoEpp.codigo}</div>
                        </TableCell>
                        <TableCell className="font-mono">{it.talla || '—'}</TableCell>
                        <TableCell className="text-center">{it.cantidad}</TableCell>
                        <TableCell>
                          <div className="font-mono text-[10px]">{it.entrega.numero}</div>
                          <div className="text-[10px] text-muted-foreground">{formatFecha(it.fechaEntrega)}</div>
                        </TableCell>
                        <TableCell>{formatFecha(it.fechaReposicionEstimada)}</TableCell>
                        <TableCell className="text-right font-mono">
                          {it.costoUnitario != null
                            ? formatMonto(it.costoUnitario * it.cantidad, it.costoMoneda)
                            : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
