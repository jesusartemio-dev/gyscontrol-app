'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import { Loader2, Plus, ArrowLeftRight, AlertTriangle, Inbox, CheckCircle2, XCircle, RotateCcw, User as UserIcon, MessageSquare, PackageCheck } from 'lucide-react'
import { toast } from 'sonner'

interface PrestamoItem {
  id: string
  cantidadPrestada: number
  cantidadDevuelta: number
  estado: string
  observacionDevolucion: string | null
  herramientaUnidad: { serie: string; catalogoHerramienta: { nombre: string; codigo: string } } | null
  catalogoHerramienta: { nombre: string; codigo: string } | null
}

interface Prestamo {
  id: string
  fechaPrestamo: string
  fechaDevolucionEstimada: string | null
  estado: string
  usuario: { name: string | null; email: string }
  proyecto: { nombre: string; codigo: string } | null
  entregadoPor: { name: string | null }
  items: PrestamoItem[]
}

// Estado del formulario por ítem en el dialog de devolución parcial.
interface DevolucionFormItem {
  prestamoItemId: string
  pendiente: number
  serializada: boolean
  nombre: string
  devuelve: boolean
  cantidad: string
  observacion: string
}

interface SolicitudPendiente {
  id: string
  numero: string
  estado: 'enviado' | 'atendida_parcial'
  observaciones: string | null
  createdAt: string
  fechaEnvio: string | null
  fechaRequerida: string | null
  fechaDevolucionEstimada: string | null
  solicitante: { id: string; name: string | null; email: string }
  proyecto: { codigo: string; nombre: string } | null
  items: {
    id: string
    cantidad: number
    cantidadEntregada: number
    catalogoHerramienta: {
      id: string
      codigo: string
      nombre: string
      unidadMedida: string
      stock: { cantidadDisponible: number }[]
    }
  }[]
}

const ESTADO_COLORS: Record<string, string> = {
  activo: 'bg-emerald-100 text-emerald-700',
  devuelto: 'bg-gray-100 text-gray-600',
  devuelto_parcial: 'bg-amber-100 text-amber-700',
  vencido: 'bg-red-100 text-red-700',
  perdido: 'bg-red-200 text-red-800',
}

export default function PrestamosPage() {
  const [data, setData] = useState<Prestamo[]>([])
  const [loading, setLoading] = useState(false)
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [devolviendoPrestamo, setDevolviendoPrestamo] = useState<Prestamo | null>(null)
  const [devForm, setDevForm] = useState<DevolucionFormItem[]>([])
  const [devEnviando, setDevEnviando] = useState(false)
  const [pendientes, setPendientes] = useState<SolicitudPendiente[]>([])
  const [devolviendoSol, setDevolviendoSol] = useState<SolicitudPendiente | null>(null)
  const [devolverNota, setDevolverNota] = useState('')
  const [devolverEnviando, setDevolverEnviando] = useState(false)
  const [cerrandoSol, setCerrandoSol] = useState<SolicitudPendiente | null>(null)
  const [cerrarNota, setCerrarNota] = useState('')
  const [cerrarEnviando, setCerrarEnviando] = useState(false)

  async function cargarPendientes() {
    const r = await fetch('/api/solicitud-herramienta?abiertas=true')
    const json = await r.json()
    const solicitudes: SolicitudPendiente[] = json.solicitudes || []
    // Ordenar por urgencia: las que tienen fecha requerida más próxima primero.
    solicitudes.sort((a, b) => {
      const ta = a.fechaRequerida ? new Date(a.fechaRequerida).getTime() : Infinity
      const tb = b.fechaRequerida ? new Date(b.fechaRequerida).getTime() : Infinity
      return ta - tb
    })
    setPendientes(solicitudes)
  }

  function fmtFecha(iso: string | null): string {
    if (!iso) return ''
    return new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: '2-digit' })
  }

  function urgenciaDe(iso: string | null): { label: string; classes: string } | null {
    if (!iso) return null
    const dias = Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000)
    if (dias < 1) return { label: 'Urgente', classes: 'bg-red-100 text-red-700 border-red-300' }
    if (dias < 3) return { label: 'Próximo', classes: 'bg-amber-100 text-amber-700 border-amber-300' }
    return null
  }

  function abrirDevolver(s: SolicitudPendiente) {
    setDevolviendoSol(s)
    setDevolverNota('')
  }

  async function confirmarDevolucion() {
    if (!devolviendoSol) return
    const nota = devolverNota.trim()
    if (!nota) { toast.error('Indica un motivo para devolver'); return }
    setDevolverEnviando(true)
    try {
      const r = await fetch(`/api/solicitud-herramienta/${devolviendoSol.id}/devolver`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nota }),
      })
      const json = await r.json()
      if (!r.ok) { toast.error(json.error || 'Error al devolver'); return }
      toast.success(`Solicitud ${devolviendoSol.numero} devuelta al solicitante`)
      setDevolviendoSol(null)
      cargarPendientes()
    } finally {
      setDevolverEnviando(false)
    }
  }

  function abrirCerrar(s: SolicitudPendiente) {
    setCerrandoSol(s)
    setCerrarNota('')
  }

  async function confirmarCerrar() {
    if (!cerrandoSol) return
    const nota = cerrarNota.trim()
    if (!nota) { toast.error('Indica un motivo para cerrar'); return }
    setCerrarEnviando(true)
    try {
      const r = await fetch(`/api/solicitud-herramienta/${cerrandoSol.id}/cerrar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nota }),
      })
      const json = await r.json()
      if (!r.ok) { toast.error(json.error || 'Error al cerrar'); return }
      toast.success(`Solicitud ${cerrandoSol.numero} cerrada`)
      setCerrandoSol(null)
      cargarPendientes()
    } finally {
      setCerrarEnviando(false)
    }
  }

  async function cargar() {
    setLoading(true)
    const params = new URLSearchParams()
    if (filtroEstado !== 'todos') params.set('estado', filtroEstado)
    const r = await fetch(`/api/logistica/almacen/prestamos?${params}`)
    const json = await r.json()
    setData(json.prestamos || [])
    setLoading(false)
  }

  useEffect(() => { cargar() }, [filtroEstado])
  useEffect(() => { cargarPendientes() }, [])

  function abrirDevolucionPrestamo(p: Prestamo) {
    const pendientes: DevolucionFormItem[] = p.items
      .filter(i => i.estado === 'prestado')
      .map(i => {
        const pendiente = i.cantidadPrestada - i.cantidadDevuelta
        const nombre = i.herramientaUnidad
          ? `${i.herramientaUnidad.catalogoHerramienta.nombre} — Serie: ${i.herramientaUnidad.serie}`
          : i.catalogoHerramienta?.nombre || ''
        return {
          prestamoItemId: i.id,
          pendiente,
          serializada: !!i.herramientaUnidad,
          nombre,
          devuelve: true,
          cantidad: String(pendiente),
          observacion: '',
        }
      })
    setDevolviendoPrestamo(p)
    setDevForm(pendientes)
  }

  function actualizarDevItem(prestamoItemId: string, patch: Partial<DevolucionFormItem>) {
    setDevForm(prev => prev.map(it => it.prestamoItemId === prestamoItemId ? { ...it, ...patch } : it))
  }

  async function confirmarDevolucionPrestamo() {
    if (!devolviendoPrestamo) return
    const aDevolver = devForm.filter(i => i.devuelve)
    if (aDevolver.length === 0) {
      toast.error('Marca al menos un ítem para devolver')
      return
    }
    for (const it of aDevolver) {
      const cant = Number(it.cantidad)
      if (!cant || cant <= 0) {
        toast.error(`Cantidad inválida en "${it.nombre}"`)
        return
      }
      if (cant > it.pendiente) {
        toast.error(`"${it.nombre}": solo quedan ${it.pendiente} pendientes`)
        return
      }
      if (it.serializada && cant !== 1) {
        toast.error(`"${it.nombre}" es serializada, debe devolverse 1 unidad`)
        return
      }
    }
    setDevEnviando(true)
    try {
      const r = await fetch(`/api/logistica/almacen/prestamos/${devolviendoPrestamo.id}/devolver`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: aDevolver.map(i => ({
            prestamoItemId: i.prestamoItemId,
            cantidadDevuelta: Number(i.cantidad),
            observacionDevolucion: i.observacion.trim() || undefined,
          })),
        }),
      })
      const json = await r.json()
      if (!r.ok) { toast.error(json.error || 'Error al registrar devolución'); return }
      const totalPend = devForm.length
      const totalDev = aDevolver.length
      toast.success(
        totalDev === totalPend
          ? 'Devolución total registrada'
          : `Devolución parcial registrada (${totalDev}/${totalPend} ítems)`
      )
      setDevolviendoPrestamo(null)
      setDevForm([])
      cargar()
    } finally {
      setDevEnviando(false)
    }
  }

  return (
    <div className="container mx-auto max-w-5xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Préstamos de Herramientas</h1>
          <p className="text-sm text-muted-foreground">Herramientas prestadas al personal</p>
        </div>
        <Link href="/logistica/almacen/prestamos/nuevo">
          <Button><Plus className="mr-2 h-4 w-4" /> Nuevo préstamo</Button>
        </Link>
      </div>

      {pendientes.length > 0 && (
        <Card className="mb-4 border-amber-300 bg-amber-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Inbox className="h-4 w-4 text-amber-700" />
              Solicitudes enviadas
              <Badge variant="outline" className="ml-1 bg-amber-100 text-amber-700">{pendientes.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendientes.map(s => {
              const urg = urgenciaDe(s.fechaRequerida)
              return (
              <div key={s.id} className={cn(
                'rounded-lg border bg-white p-3',
                urg && urg.label === 'Urgente' && 'border-red-300 ring-1 ring-red-100'
              )}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-semibold">{s.numero}</span>
                      {s.estado === 'atendida_parcial' && (
                        <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-300 text-[10px]">
                          Entrega parcial
                        </Badge>
                      )}
                      {urg && (
                        <Badge variant="outline" className={cn('text-[10px]', urg.classes)}>
                          {urg.label}
                        </Badge>
                      )}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-sm">
                      <UserIcon className="h-3 w-3 text-muted-foreground" />
                      <span>{s.solicitante.name || s.solicitante.email}</span>
                      {s.proyecto && (
                        <Badge variant="outline" className="text-[10px]">
                          {s.proyecto.codigo}
                        </Badge>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                      {s.fechaEnvio && <span>Enviada: {new Date(s.fechaEnvio).toLocaleString('es-PE')}</span>}
                      {s.fechaRequerida && <span>📅 Para: <strong className="text-gray-700">{fmtFecha(s.fechaRequerida)}</strong></span>}
                      {s.fechaDevolucionEstimada && <span>↩️ Devuelve: <strong className="text-gray-700">{fmtFecha(s.fechaDevolucionEstimada)}</strong></span>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/logistica/almacen/prestamos/nuevo?solicitudId=${s.id}`}>
                      <Button size="sm" className="h-8">
                        <CheckCircle2 className="mr-1 h-3 w-3" /> Convertir en préstamo
                      </Button>
                    </Link>
                    {s.estado === 'enviado' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-amber-700 hover:bg-amber-50"
                        onClick={() => abrirDevolver(s)}
                      >
                        <RotateCcw className="mr-1 h-3 w-3" />
                        Devolver para editar
                      </Button>
                    )}
                    {s.estado === 'atendida_parcial' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-gray-700 hover:bg-gray-50"
                        onClick={() => abrirCerrar(s)}
                      >
                        <XCircle className="mr-1 h-3 w-3" />
                        Cerrar sin completar
                      </Button>
                    )}
                  </div>
                </div>
                <ul className="mt-2 space-y-1 text-xs">
                  {s.items.map(it => {
                    const disp = it.catalogoHerramienta.stock[0]?.cantidadDisponible ?? 0
                    const entregada = it.cantidadEntregada || 0
                    const falta = it.cantidad - entregada
                    const stockInsuficiente = disp < falta
                    const completo = falta <= 0
                    return (
                      <li
                        key={it.id}
                        className={cn(
                          'flex items-center justify-between rounded border px-2 py-1',
                          completo && 'bg-emerald-50 text-muted-foreground line-through decoration-emerald-400'
                        )}
                      >
                        <span>
                          <span className="font-mono text-[10px] text-muted-foreground mr-1.5">{it.catalogoHerramienta.codigo}</span>
                          {it.catalogoHerramienta.nombre}
                        </span>
                        <span className={cn('flex items-center gap-2', stockInsuficiente && !completo ? 'text-amber-700' : '')}>
                          {stockInsuficiente && !completo && <AlertTriangle className="h-3 w-3" />}
                          {entregada > 0 && (
                            <span className="text-[10px] text-purple-700">entregado {entregada}</span>
                          )}
                          <span>{completo ? 'completo' : `falta ${falta}`}</span>
                          {!completo && <span className="text-muted-foreground">/ disp. {disp}</span>}
                        </span>
                      </li>
                    )
                  })}
                </ul>
                {s.observaciones && (
                  <p className="mt-2 text-[11px] text-muted-foreground">💬 {s.observaciones}</p>
                )}
              </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      <div className="mb-4 flex gap-3">
        <Select value={filtroEstado} onValueChange={setFiltroEstado}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="activo">Activos</SelectItem>
            <SelectItem value="devuelto_parcial">Parciales</SelectItem>
            <SelectItem value="vencido">Vencidos</SelectItem>
            <SelectItem value="devuelto">Devueltos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex h-32 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : data.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Sin préstamos en el período seleccionado.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {data.map(p => {
            const vencido = p.fechaDevolucionEstimada && new Date(p.fechaDevolucionEstimada) < new Date() && p.estado === 'activo'
            return (
              <Card key={p.id} className={vencido ? 'border-red-300' : ''}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between text-base">
                    <span className="flex items-center gap-2">
                      <ArrowLeftRight className="h-4 w-4" />
                      {p.usuario.name || p.usuario.email}
                    </span>
                    <div className="flex items-center gap-2">
                      {vencido && <AlertTriangle className="h-4 w-4 text-red-500" />}
                      <Badge variant="outline" className={ESTADO_COLORS[p.estado] || 'bg-gray-100'}>
                        {p.estado.replace('_', ' ')}
                      </Badge>
                    </div>
                  </CardTitle>
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span>Prestado: {new Date(p.fechaPrestamo).toLocaleDateString('es-PE')}</span>
                    {p.fechaDevolucionEstimada && (
                      <span className={vencido ? 'text-red-600 font-semibold' : ''}>
                        Dev. estimada: {new Date(p.fechaDevolucionEstimada).toLocaleDateString('es-PE')}
                      </span>
                    )}
                    {p.proyecto && <span>Proyecto: {p.proyecto.codigo}</span>}
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1 text-sm">
                    {p.items.map(item => {
                      const nombre = item.herramientaUnidad
                        ? `${item.herramientaUnidad.catalogoHerramienta.nombre} — Serie: ${item.herramientaUnidad.serie}`
                        : item.catalogoHerramienta?.nombre
                      const totalmenteDevuelto = item.estado === 'devuelto'
                      const parcial = item.cantidadDevuelta > 0 && !totalmenteDevuelto
                      return (
                        <li key={item.id} className={cn(
                          'rounded border px-2 py-1',
                          totalmenteDevuelto && 'bg-emerald-50/50 border-emerald-200',
                          parcial && 'bg-amber-50/50 border-amber-200'
                        )}>
                          <div className="flex items-center justify-between">
                            <span className={cn(totalmenteDevuelto && 'text-muted-foreground')}>{nombre}</span>
                            <span className="text-xs text-muted-foreground">
                              {item.cantidadDevuelta}/{item.cantidadPrestada} devueltos
                            </span>
                          </div>
                          {item.observacionDevolucion && (
                            <div className="mt-1 flex items-start gap-1 text-[11px] text-muted-foreground">
                              <MessageSquare className="mt-0.5 h-3 w-3 shrink-0" />
                              <span className="whitespace-pre-line">{item.observacionDevolucion}</span>
                            </div>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                  {(p.estado === 'activo' || p.estado === 'devuelto_parcial') && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-3"
                      onClick={() => abrirDevolucionPrestamo(p)}
                    >
                      <PackageCheck className="mr-2 h-3 w-3" />
                      Registrar devolución
                    </Button>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Dialog open={!!devolviendoSol} onOpenChange={(open) => { if (!open) setDevolviendoSol(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-amber-600" />
              Devolver solicitud al solicitante
            </DialogTitle>
            <DialogDescription>
              Solicitud <span className="font-mono font-semibold">{devolviendoSol?.numero}</span> de{' '}
              <strong>{devolviendoSol?.solicitante.name || devolviendoSol?.solicitante.email}</strong>.
              Al devolver, vuelve a borrador para que el solicitante pueda ajustar los ítems o descartarla.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-xs font-medium">Motivo (visible para el solicitante) *</label>
            <Textarea
              rows={3}
              value={devolverNota}
              onChange={e => setDevolverNota(e.target.value)}
              placeholder="Ej: ya tenemos 2 de esos prestados al proyecto X, considera otro modelo. / No contamos con stock, pide cuando vuelvan del proyecto Y."
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDevolviendoSol(null)} disabled={devolverEnviando}>
              Cancelar
            </Button>
            <Button
              onClick={confirmarDevolucion}
              disabled={devolverEnviando || !devolverNota.trim()}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {devolverEnviando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-2 h-4 w-4" />}
              Devolver
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!devolviendoPrestamo}
        onOpenChange={(open) => { if (!open && !devEnviando) { setDevolviendoPrestamo(null); setDevForm([]) } }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PackageCheck className="h-5 w-5 text-emerald-600" />
              Registrar devolución
            </DialogTitle>
            <DialogDescription>
              Préstamo de <strong>{devolviendoPrestamo?.usuario.name || devolviendoPrestamo?.usuario.email}</strong>.
              Marca solo los ítems que regresan ahora. Lo no marcado queda pendiente.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[55vh] space-y-3 overflow-y-auto pr-1">
            {devForm.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No hay ítems pendientes en este préstamo.
              </p>
            ) : devForm.map(it => (
              <div
                key={it.prestamoItemId}
                className={cn(
                  'rounded-lg border p-3 transition-colors',
                  it.devuelve ? 'border-emerald-300 bg-emerald-50/40' : 'border-gray-200 bg-gray-50/40'
                )}
              >
                <div className="flex items-start gap-2">
                  <Checkbox
                    checked={it.devuelve}
                    onCheckedChange={(v) => actualizarDevItem(it.prestamoItemId, { devuelve: !!v })}
                    className="mt-1"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className={cn('text-sm font-medium', !it.devuelve && 'text-muted-foreground')}>
                        {it.nombre}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {it.pendiente} pendiente{it.pendiente !== 1 ? 's' : ''}
                      </span>
                    </div>
                    {it.devuelve && (
                      <div className="mt-2 grid gap-2 sm:grid-cols-[110px_1fr]">
                        <div>
                          <label className="text-[11px] font-medium text-muted-foreground">Cantidad</label>
                          <Input
                            type="number"
                            step={1}
                            min={0}
                            max={it.pendiente}
                            disabled={it.serializada}
                            value={it.cantidad}
                            onChange={(e) => {
                              const v = e.target.value
                              actualizarDevItem(it.prestamoItemId, {
                                cantidad: v === '' ? '' : String(Math.floor(Number(v) || 0)),
                              })
                            }}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-medium text-muted-foreground">Observación (opcional)</label>
                          <Input
                            value={it.observacion}
                            onChange={(e) => actualizarDevItem(it.prestamoItemId, { observacion: e.target.value })}
                            placeholder="Ej: regresa con golpe, falta cargador, OK"
                            className="h-8 text-sm"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
            <Button
              variant="outline"
              onClick={() => { setDevolviendoPrestamo(null); setDevForm([]) }}
              disabled={devEnviando}
            >
              Cancelar
            </Button>
            <Button
              onClick={confirmarDevolucionPrestamo}
              disabled={devEnviando || devForm.length === 0 || devForm.every(i => !i.devuelve)}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {devEnviando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PackageCheck className="mr-2 h-4 w-4" />}
              Registrar devolución
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!cerrandoSol} onOpenChange={(open) => { if (!open) setCerrandoSol(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-gray-700" />
              Cerrar solicitud sin completar
            </DialogTitle>
            <DialogDescription>
              Solicitud <span className="font-mono font-semibold">{cerrandoSol?.numero}</span>.
              Se marcará como atendida aunque no se haya entregado todo. Úsalo cuando ya no habrá más stock disponible.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-xs font-medium">Motivo (visible para el solicitante) *</label>
            <Textarea
              rows={3}
              value={cerrarNota}
              onChange={e => setCerrarNota(e.target.value)}
              placeholder="Ej: ya no se va a comprar más stock, descatalogado, etc."
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCerrandoSol(null)} disabled={cerrarEnviando}>
              Cancelar
            </Button>
            <Button
              onClick={confirmarCerrar}
              disabled={cerrarEnviando || !cerrarNota.trim()}
              className="bg-gray-700 hover:bg-gray-800"
            >
              {cerrarEnviando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
              Cerrar solicitud
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
