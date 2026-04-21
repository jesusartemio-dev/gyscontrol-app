'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import {
  Loader2, Plus, CheckCircle2, XCircle, Pencil, Send, RotateCcw, Trash2, Eye, Search,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Solicitud {
  id: string
  numero: string
  estado: 'borrador' | 'enviado' | 'atendida' | 'cancelada'
  observaciones: string | null
  notaAtencion: string | null
  fechaEnvio: string | null
  fechaAtencion: string | null
  fechaRequerida: string | null
  fechaDevolucionEstimada: string | null
  createdAt: string
  proyecto: { id: string; codigo: string; nombre: string } | null
  atendidaPor: { name: string | null; email: string } | null
  prestamo: { id: string; estado: string } | null
  items: {
    id: string
    cantidad: number
    catalogoHerramienta: {
      id: string
      codigo: string
      nombre: string
      unidadMedida: string
      stock: { cantidadDisponible: number }[]
    }
  }[]
}

const ESTADO_META = {
  borrador: { label: 'Borrador', classes: 'bg-gray-200 text-gray-700 border-gray-300', icon: Pencil },
  enviado: { label: 'Enviado', classes: 'bg-blue-100 text-blue-700 border-blue-300', icon: Send },
  atendida: { label: 'Atendida', classes: 'bg-emerald-100 text-emerald-700 border-emerald-300', icon: CheckCircle2 },
  cancelada: { label: 'Cancelada', classes: 'bg-gray-100 text-gray-500 border-gray-200', icon: XCircle },
} as const

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: '2-digit' })
}

function urgenciaFecha(iso: string | null): { label: string; classes: string } | null {
  if (!iso) return null
  const dias = Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000)
  if (dias < 1) return { label: 'Urgente', classes: 'bg-red-100 text-red-700 border-red-300' }
  if (dias < 3) return { label: 'Próximo', classes: 'bg-amber-100 text-amber-700 border-amber-300' }
  return null
}

type FiltroEstado = 'todos' | 'borrador' | 'enviado' | 'atendida' | 'cancelada'

export default function MisSolicitudesHerramientasPage() {
  const router = useRouter()
  const [data, setData] = useState<Solicitud[]>([])
  const [loading, setLoading] = useState(true)
  const [verCanceladas, setVerCanceladas] = useState(false)
  const [creando, setCreando] = useState(false)
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>('todos')
  const [busqueda, setBusqueda] = useState('')
  const [confirmAccion, setConfirmAccion] = useState<
    { tipo: 'eliminar' | 'cancelar'; id: string; numero: string } | null
  >(null)
  const [procesando, setProcesando] = useState(false)

  async function crearBorrador() {
    setCreando(true)
    try {
      const r = await fetch('/api/solicitud-herramienta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const json = await r.json()
      if (!r.ok) { toast.error(json.error || 'Error al crear'); return }
      router.push(`/mi-trabajo/herramientas/${json.id}`)
    } finally {
      setCreando(false)
    }
  }

  async function cargar() {
    setLoading(true)
    const params = new URLSearchParams({ mias: 'true' })
    if (verCanceladas) params.set('incluirCanceladas', 'true')
    const r = await fetch(`/api/solicitud-herramienta?${params.toString()}`)
    const json = await r.json()
    setData(json.solicitudes || [])
    setLoading(false)
  }

  useEffect(() => { cargar() }, [verCanceladas])

  async function ejecutarAccion() {
    if (!confirmAccion) return
    setProcesando(true)
    try {
      if (confirmAccion.tipo === 'eliminar') {
        const r = await fetch(`/api/solicitud-herramienta/${confirmAccion.id}`, { method: 'DELETE' })
        const json = await r.json().catch(() => ({}))
        if (!r.ok) { toast.error(json.error || 'Error al eliminar'); return }
        toast.success('Borrador eliminado')
      } else {
        const r = await fetch(`/api/solicitud-herramienta/${confirmAccion.id}/cancelar`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        })
        const json = await r.json().catch(() => ({}))
        if (!r.ok) { toast.error(json.error || 'Error al cancelar'); return }
        toast.success('Solicitud cancelada')
      }
      setConfirmAccion(null)
      cargar()
    } finally {
      setProcesando(false)
    }
  }

  const solicitudesFiltradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return data
      .filter(s => filtroEstado === 'todos' || s.estado === filtroEstado)
      .filter(s => !q || s.numero.toLowerCase().includes(q))
      .sort((a, b) => {
        // Orden por fecha de creación desc (más reciente primero).
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      })
  }, [data, filtroEstado, busqueda])

  const stats = useMemo(() => {
    return {
      total: data.length,
      borradores: data.filter(s => s.estado === 'borrador').length,
      enviadas: data.filter(s => s.estado === 'enviado').length,
      atendidas: data.filter(s => s.estado === 'atendida').length,
    }
  }, [data])

  return (
    <div className="container mx-auto max-w-7xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Mis Solicitudes de Herramientas</h1>
          <p className="text-sm text-muted-foreground">
            Pide herramientas al almacén y sigue el estado de cada solicitud.
          </p>
        </div>
        <Button onClick={crearBorrador} disabled={creando}>
          {creando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
          Nueva solicitud
        </Button>
      </div>

      {/* Stats cards */}
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Total" value={stats.total} />
        <StatCard label="Borradores" value={stats.borradores} color="text-gray-600" />
        <StatCard label="Enviadas" value={stats.enviadas} color="text-blue-600" />
        <StatCard label="Atendidas" value={stats.atendidas} color="text-emerald-600" />
      </div>

      {/* Filtros */}
      <Card className="mb-4">
        <CardContent className="flex flex-wrap items-center gap-3 py-3">
          <div className="relative max-w-xs flex-1">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por número..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              className="pl-8"
            />
          </div>
          <Select value={filtroEstado} onValueChange={(v: FiltroEstado) => setFiltroEstado(v)}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los estados</SelectItem>
              <SelectItem value="borrador">Borradores</SelectItem>
              <SelectItem value="enviado">Enviadas</SelectItem>
              <SelectItem value="atendida">Atendidas</SelectItem>
              {verCanceladas && <SelectItem value="cancelada">Canceladas</SelectItem>}
            </SelectContent>
          </Select>
          <label className="ml-auto flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={verCanceladas}
              onChange={e => setVerCanceladas(e.target.checked)}
              className="h-3 w-3"
            />
            Incluir canceladas
          </label>
        </CardContent>
      </Card>

      {/* Tabla */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex h-40 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : solicitudesFiltradas.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              {data.length === 0
                ? 'Aún no tienes solicitudes. Clic en "Nueva solicitud" para empezar.'
                : 'No hay solicitudes que coincidan con los filtros.'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-32">Número</TableHead>
                  <TableHead className="w-32">Estado</TableHead>
                  <TableHead>Proyecto</TableHead>
                  <TableHead className="w-24 text-center">Items</TableHead>
                  <TableHead className="w-28">Enviada</TableHead>
                  <TableHead className="w-28">Para</TableHead>
                  <TableHead className="w-28">Devuelve</TableHead>
                  <TableHead className="w-24 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {solicitudesFiltradas.map(s => {
                  const meta = ESTADO_META[s.estado]
                  const Icon = meta.icon
                  const devuelto = s.estado === 'borrador' && !!s.notaAtencion && !!s.fechaAtencion
                  const urg = s.estado === 'enviado' ? urgenciaFecha(s.fechaRequerida) : null
                  return (
                    <TableRow key={s.id} className={cn(devuelto && 'bg-amber-50/40')}>
                      <TableCell className="font-mono text-xs">{s.numero}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {devuelto ? (
                            <Badge variant="outline" className="w-fit bg-amber-100 text-amber-800 border-amber-300">
                              <RotateCcw className="mr-1 h-3 w-3" />
                              Devuelta
                            </Badge>
                          ) : (
                            <Badge variant="outline" className={cn('w-fit', meta.classes)}>
                              <Icon className="mr-1 h-3 w-3" />
                              {meta.label}
                            </Badge>
                          )}
                          {urg && (
                            <Badge variant="outline" className={cn('w-fit text-[10px]', urg.classes)}>
                              {urg.label}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        {s.proyecto ? (
                          <span>
                            <span className="font-medium">{s.proyecto.codigo}</span>
                            <span className="ml-1 text-muted-foreground">— {s.proyecto.nombre}</span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center text-sm tabular-nums">{s.items.length}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {s.fechaEnvio ? fmtDate(s.fechaEnvio) : '—'}
                      </TableCell>
                      <TableCell className="text-xs">{fmtDate(s.fechaRequerida)}</TableCell>
                      <TableCell className="text-xs">{fmtDate(s.fechaDevolucionEstimada)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Link href={`/mi-trabajo/herramientas/${s.id}`}>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              title="Ver detalle"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          </Link>
                          {s.estado === 'borrador' && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-red-600 hover:bg-red-50"
                              title="Eliminar borrador"
                              onClick={() => setConfirmAccion({ tipo: 'eliminar', id: s.id, numero: s.numero })}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {s.estado === 'enviado' && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-red-600 hover:bg-red-50"
                              title="Cancelar solicitud"
                              onClick={() => setConfirmAccion({ tipo: 'cancelar', id: s.id, numero: s.numero })}
                            >
                              <XCircle className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!confirmAccion} onOpenChange={(open) => { if (!open) setConfirmAccion(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {confirmAccion?.tipo === 'eliminar' ? (
                <><Trash2 className="h-5 w-5 text-red-600" /> Eliminar borrador</>
              ) : (
                <><XCircle className="h-5 w-5 text-red-600" /> Cancelar solicitud</>
              )}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAccion?.tipo === 'eliminar' ? (
                <>
                  ¿Eliminar el borrador <span className="font-mono font-semibold">{confirmAccion.numero}</span>?
                  Desaparecerá de tu lista y no podrás recuperarlo.
                </>
              ) : (
                <>
                  ¿Cancelar la solicitud <span className="font-mono font-semibold">{confirmAccion?.numero}</span>?
                  Quedará marcada como cancelada y logística ya no la atenderá.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={procesando}>Volver</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); ejecutarAccion() }}
              disabled={procesando}
              className="bg-red-600 hover:bg-red-700"
            >
              {procesando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {confirmAccion?.tipo === 'eliminar' ? 'Eliminar' : 'Cancelar solicitud'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <Card>
      <CardContent className="py-3">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={cn('mt-0.5 text-2xl font-bold tabular-nums', color)}>{value}</p>
      </CardContent>
    </Card>
  )
}
