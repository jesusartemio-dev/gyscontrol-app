'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, AlertTriangle, Clock, Loader2, RotateCcw, Search } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

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

interface Reposicion {
  id: string
  cantidad: number
  talla: string | null
  fechaEntrega: string
  fechaReposicionEstimada: string
  diasRestantes: number
  urgencia: 'vencido' | 'critico' | 'proximo' | 'normal'
  catalogoEpp: {
    codigo: string
    descripcion: string
    marca: string | null
    subcategoria: string
    unidad: { nombre: string }
  }
  entrega: {
    id: string
    numero: string
    fechaEntrega: string
    empleado: {
      documentoIdentidad: string | null
      cargo: { nombre: string } | null
      departamento: { nombre: string } | null
      user: { name: string }
    }
    proyecto: { codigo: string } | null
    centroCosto: { nombre: string } | null
  }
}

interface Resumen {
  vencidos: number
  criticos: number
  proximos: number
  total: number
}

const formatFecha = (s: string) =>
  new Date(s).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: '2-digit' })

const URGENCIA_CONFIG = {
  vencido: { label: 'Vencido', color: 'bg-red-100 text-red-700 border-red-200', dot: 'bg-red-500' },
  critico: { label: 'Crítico', color: 'bg-orange-100 text-orange-700 border-orange-200', dot: 'bg-orange-500' },
  proximo: { label: 'Próximo', color: 'bg-amber-100 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  normal: { label: 'Normal', color: 'bg-gray-100 text-gray-700 border-gray-200', dot: 'bg-gray-400' },
} as const

export default function ReposicionesPage() {
  const [items, setItems] = useState<Reposicion[]>([])
  const [resumen, setResumen] = useState<Resumen>({ vencidos: 0, criticos: 0, proximos: 0, total: 0 })
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtroSub, setFiltroSub] = useState('todas')
  const [diasVentana, setDiasVentana] = useState('30')

  const cargar = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('dias', diasVentana)
      if (filtroSub !== 'todas') params.set('subcategoria', filtroSub)
      const res = await fetch(`/api/seguridad/reposiciones?${params.toString()}`)
      if (!res.ok) throw new Error('Error al cargar')
      const data = await res.json()
      setItems(data.items)
      setResumen(data.resumen)
    } catch {
      toast.error('Error al cargar reposiciones')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { cargar() }, [diasVentana, filtroSub])

  const itemsFiltrados = busqueda
    ? items.filter(i => {
        const q = busqueda.toLowerCase()
        return (
          i.catalogoEpp.codigo.toLowerCase().includes(q) ||
          i.catalogoEpp.descripcion.toLowerCase().includes(q) ||
          i.entrega.empleado.user.name.toLowerCase().includes(q) ||
          (i.entrega.empleado.documentoIdentidad ?? '').includes(q)
        )
      })
    : items

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-4 max-w-6xl">
      <div className="flex items-center gap-3">
        <Link href="/seguridad"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Clock className="h-5 w-5 text-orange-500" /> Reposiciones
          </h1>
          <p className="text-sm text-muted-foreground">EPPs entregados con vida útil próxima a vencer o ya vencida</p>
        </div>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Vencidos</p>
          <p className="text-2xl font-bold text-red-600">{resumen.vencidos}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Críticos (≤7d)</p>
          <p className="text-2xl font-bold text-orange-600">{resumen.criticos}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Próximos (≤30d)</p>
          <p className="text-2xl font-bold text-amber-600">{resumen.proximos}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Total en ventana</p>
          <p className="text-2xl font-bold">{resumen.total}</p>
        </CardContent></Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar por EPP, empleado o DNI..." className="pl-8" />
          </div>
          <Select value={filtroSub} onValueChange={setFiltroSub}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas las subcategorías</SelectItem>
              {SUBCATEGORIAS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={diasVentana} onValueChange={setDiasVentana}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Próximos 7 días</SelectItem>
              <SelectItem value="30">Próximos 30 días</SelectItem>
              <SelectItem value="60">Próximos 60 días</SelectItem>
              <SelectItem value="90">Próximos 90 días</SelectItem>
              <SelectItem value="365">Próximos 365 días</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Tabla */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Items a renovar ({itemsFiltrados.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : itemsFiltrados.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              {items.length === 0 ? 'Sin items próximos a vencer en la ventana seleccionada' : 'No hay coincidencias con el filtro de búsqueda'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-3"></TableHead>
                  <TableHead>Empleado</TableHead>
                  <TableHead>EPP</TableHead>
                  <TableHead>Talla</TableHead>
                  <TableHead className="text-center">Cant.</TableHead>
                  <TableHead>Entregado</TableHead>
                  <TableHead>Vence</TableHead>
                  <TableHead className="text-right">Días</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itemsFiltrados.map(item => {
                  const cfg = URGENCIA_CONFIG[item.urgencia]
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="p-0 pl-2">
                        <span className={`inline-block w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="font-medium text-sm">{item.entrega.empleado.user.name}</div>
                        {item.entrega.empleado.documentoIdentidad && (
                          <div className="font-mono text-[10px] text-muted-foreground">{item.entrega.empleado.documentoIdentidad}</div>
                        )}
                        {item.entrega.empleado.cargo && (
                          <div className="text-[10px] text-muted-foreground">{item.entrega.empleado.cargo.nombre}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="font-medium">{item.catalogoEpp.descripcion}</div>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono">
                          <span>{item.catalogoEpp.codigo}</span>
                          {item.catalogoEpp.marca && <span>· {item.catalogoEpp.marca}</span>}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs font-mono">{item.talla || '—'}</TableCell>
                      <TableCell className="text-center text-sm">{item.cantidad} <span className="text-[10px] text-muted-foreground">{item.catalogoEpp.unidad.nombre}</span></TableCell>
                      <TableCell className="text-xs">
                        <Link href={`/seguridad/entregas/${item.entrega.id}`} className="font-mono hover:underline">
                          {item.entrega.numero}
                        </Link>
                        <div className="text-[10px] text-muted-foreground">{formatFecha(item.fechaEntrega)}</div>
                      </TableCell>
                      <TableCell className="text-xs">{formatFecha(item.fechaReposicionEstimada)}</TableCell>
                      <TableCell className={`text-right font-semibold text-sm ${item.urgencia === 'vencido' ? 'text-red-600' : item.urgencia === 'critico' ? 'text-orange-600' : 'text-muted-foreground'}`}>
                        {item.diasRestantes < 0
                          ? `${Math.abs(item.diasRestantes)}d vencido`
                          : `${item.diasRestantes}d`}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] ${cfg.color}`}>
                          {item.urgencia === 'vencido' && <AlertTriangle className="h-3 w-3 mr-1" />}
                          {cfg.label}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <p className="text-[10px] text-center text-muted-foreground">
        <RotateCcw className="h-3 w-3 inline mr-1" />
        La fecha de reposición se calcula al hacer la entrega usando la vida útil del catálogo. Items consumibles (sin vida útil) no aparecen aquí.
      </p>
    </div>
  )
}
