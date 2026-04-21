'use client'

import { useEffect, useMemo, useRef, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import {
  Loader2, ArrowLeft, Plus, Trash2, Search, Send, Check, AlertTriangle, Wrench,
  FileCheck2, RotateCcw, XCircle, Pencil, CheckCircle2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Herramienta {
  id: string
  codigo: string
  nombre: string
  categoria: string
  unidadMedida: string
  gestionPorUnidad: boolean
  stock: { cantidadDisponible: number }[]
  unidades: { estado: string }[]
  prestadosActivos: number
}

interface Proyecto {
  id: string
  codigo: string
  nombre: string
}

interface SolicitudItem {
  id: string
  cantidad: number
  catalogoHerramienta: {
    id: string
    codigo: string
    nombre: string
    unidadMedida: string
    stock: { cantidadDisponible: number }[]
  }
}

interface Solicitud {
  id: string
  numero: string
  estado: 'borrador' | 'enviado' | 'atendida' | 'cancelada'
  observaciones: string | null
  notaAtencion: string | null
  fechaAtencion: string | null
  fechaEnvio: string | null
  fechaRequerida: string | null
  fechaDevolucionEstimada: string | null
  proyecto: Proyecto | null
  atendidaPor: { name: string | null; email: string } | null
  items: SolicitudItem[]
}

interface ItemCarrito {
  catalogoHerramientaId: string
  codigo: string
  nombre: string
  unidadMedida: string
  cantidad: number
  disponible: number
}

const ESTADO_META = {
  borrador: { label: 'Borrador', classes: 'bg-gray-200 text-gray-700', icon: Pencil },
  enviado: { label: 'Enviado', classes: 'bg-blue-100 text-blue-700', icon: Send },
  atendida: { label: 'Atendida', classes: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  cancelada: { label: 'Cancelada', classes: 'bg-gray-100 text-gray-500', icon: XCircle },
} as const

export default function DetalleSolicitudHerramientaPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { id } = use(params)

  const [solicitud, setSolicitud] = useState<Solicitud | null>(null)
  const [herramientas, setHerramientas] = useState<Herramienta[]>([])
  const [proyectos, setProyectos] = useState<Proyecto[]>([])
  const [loading, setLoading] = useState(true)

  const [items, setItems] = useState<ItemCarrito[]>([])
  const [proyectoId, setProyectoId] = useState<string>('')
  const [observaciones, setObservaciones] = useState('')
  const [fechaRequerida, setFechaRequerida] = useState('')
  const [fechaDevolucionEstimada, setFechaDevolucionEstimada] = useState('')

  const [estadoGuardado, setEstadoGuardado] = useState<'idle' | 'guardando' | 'guardado'>('idle')
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const initialized = useRef(false)

  // Dialogs
  const [agregarOpen, setAgregarOpen] = useState(false)
  const [agregarQuery, setAgregarQuery] = useState('')
  const [agregarCategoria, setAgregarCategoria] = useState('todas')
  const [agregarCantidad, setAgregarCantidad] = useState<Record<string, number>>({})
  const [confirmEnvio, setConfirmEnvio] = useState(false)
  const [confirmEliminar, setConfirmEliminar] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [eliminando, setEliminando] = useState(false)

  function disponibleDe(h: Herramienta): number {
    return h.gestionPorUnidad
      ? h.unidades.filter(u => u.estado === 'disponible').length
      : (h.stock[0]?.cantidadDisponible ?? 0)
  }

  useEffect(() => {
    (async () => {
      setLoading(true)
      try {
        const [rS, rH, rP] = await Promise.all([
          fetch(`/api/solicitud-herramienta/${id}`),
          fetch('/api/logistica/almacen/herramientas'),
          fetch('/api/proyectos?lightweight=true').catch(() => null),
        ])
        if (!rS.ok) {
          toast.error('No se pudo cargar la solicitud')
          router.push('/mi-trabajo/herramientas')
          return
        }
        const sol = await rS.json()
        setSolicitud(sol)
        setProyectoId(sol.proyecto?.id || '')
        setObservaciones(sol.observaciones || '')
        setFechaRequerida(sol.fechaRequerida ? sol.fechaRequerida.slice(0, 10) : '')
        setFechaDevolucionEstimada(sol.fechaDevolucionEstimada ? sol.fechaDevolucionEstimada.slice(0, 10) : '')
        setItems(sol.items.map((it: SolicitudItem) => ({
          catalogoHerramientaId: it.catalogoHerramienta.id,
          codigo: it.catalogoHerramienta.codigo,
          nombre: it.catalogoHerramienta.nombre,
          unidadMedida: it.catalogoHerramienta.unidadMedida,
          cantidad: it.cantidad,
          disponible: it.catalogoHerramienta.stock[0]?.cantidadDisponible ?? 0,
        })))

        const herrData = await rH.json().catch(() => [])
        setHerramientas(Array.isArray(herrData) ? herrData : [])

        if (rP && rP.ok) {
          const dp: any = await rP.json().catch(() => null)
          const list = Array.isArray(dp) ? dp : Array.isArray(dp?.proyectos) ? dp.proyectos : Array.isArray(dp?.data) ? dp.data : []
          setProyectos(list)
        }
      } finally {
        setLoading(false)
        setTimeout(() => { initialized.current = true }, 200)
      }
    })()
  }, [id, router])

  // Auto-save
  useEffect(() => {
    if (!initialized.current) return
    if (!solicitud || solicitud.estado !== 'borrador') return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    setEstadoGuardado('guardando')
    saveTimer.current = setTimeout(async () => {
      try {
        const r = await fetch(`/api/solicitud-herramienta/${id}/items`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            proyectoId: proyectoId || null,
            observaciones: observaciones.trim() || null,
            fechaRequerida: fechaRequerida || null,
            fechaDevolucionEstimada: fechaDevolucionEstimada || null,
            items: items.map(c => ({ catalogoHerramientaId: c.catalogoHerramientaId, cantidad: c.cantidad })),
          }),
        })
        if (!r.ok) {
          const j = await r.json().catch(() => ({}))
          toast.error(j.error || 'Error al guardar')
          setEstadoGuardado('idle')
          return
        }
        setEstadoGuardado('guardado')
      } catch {
        setEstadoGuardado('idle')
      }
    }, 700)
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current) }
  }, [items, proyectoId, observaciones, fechaRequerida, fechaDevolucionEstimada, id, solicitud])

  const categorias = useMemo(() => {
    const set = new Set(herramientas.map(h => h.categoria))
    return Array.from(set).sort()
  }, [herramientas])

  const herramientasDisponibles = useMemo(() => {
    const idsEnItems = new Set(items.map(i => i.catalogoHerramientaId))
    const q = agregarQuery.trim().toLowerCase()
    return herramientas
      .filter(h => !idsEnItems.has(h.id))
      .filter(h => agregarCategoria === 'todas' || h.categoria === agregarCategoria)
      .filter(h => !q || h.nombre.toLowerCase().includes(q) || h.codigo.toLowerCase().includes(q))
      .sort((a, b) => a.nombre.localeCompare(b.nombre))
  }, [herramientas, agregarQuery, agregarCategoria, items])

  function abrirAgregar() {
    setAgregarCantidad({})
    setAgregarQuery('')
    setAgregarCategoria('todas')
    setAgregarOpen(true)
  }

  function confirmarAgregar() {
    const nuevos: ItemCarrito[] = []
    for (const h of herramientas) {
      const cant = agregarCantidad[h.id]
      if (cant && cant > 0) {
        nuevos.push({
          catalogoHerramientaId: h.id,
          codigo: h.codigo,
          nombre: h.nombre,
          unidadMedida: h.unidadMedida,
          cantidad: cant,
          disponible: disponibleDe(h),
        })
      }
    }
    if (nuevos.length === 0) { toast.error('Selecciona al menos una herramienta'); return }
    setItems(prev => [...prev, ...nuevos])
    setAgregarOpen(false)
  }

  function cambiarCantidad(catalogoHerramientaId: string, nueva: number) {
    if (nueva <= 0) {
      setItems(prev => prev.filter(i => i.catalogoHerramientaId !== catalogoHerramientaId))
      return
    }
    setItems(prev => prev.map(i => i.catalogoHerramientaId === catalogoHerramientaId ? { ...i, cantidad: nueva } : i))
  }

  function quitarItem(catalogoHerramientaId: string) {
    setItems(prev => prev.filter(i => i.catalogoHerramientaId !== catalogoHerramientaId))
  }

  async function enviarSolicitud() {
    if (!solicitud) return
    if (items.length === 0) { toast.error('Agrega al menos una herramienta'); return }

    // Forzar guardado pendiente
    if (saveTimer.current) {
      clearTimeout(saveTimer.current)
      await fetch(`/api/solicitud-herramienta/${id}/items`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proyectoId: proyectoId || null,
          observaciones: observaciones.trim() || null,
          fechaRequerida: fechaRequerida || null,
          fechaDevolucionEstimada: fechaDevolucionEstimada || null,
          items: items.map(i => ({ catalogoHerramientaId: i.catalogoHerramientaId, cantidad: i.cantidad })),
        }),
      })
    }

    setEnviando(true)
    try {
      const r = await fetch(`/api/solicitud-herramienta/${id}/enviar`, { method: 'POST' })
      const j = await r.json()
      if (!r.ok) { toast.error(j.error || 'Error al enviar'); return }
      toast.success(`Solicitud ${solicitud.numero} enviada al almacén`)
      setConfirmEnvio(false)
      router.push('/mi-trabajo/herramientas')
    } finally {
      setEnviando(false)
    }
  }

  async function eliminarBorrador() {
    if (!solicitud) return
    setEliminando(true)
    try {
      const r = await fetch(`/api/solicitud-herramienta/${id}`, { method: 'DELETE' })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) { toast.error(j.error || 'Error al eliminar'); return }
      toast.success('Borrador eliminado')
      router.push('/mi-trabajo/herramientas')
    } finally {
      setEliminando(false)
    }
  }

  if (loading || !solicitud) {
    return (
      <div className="container mx-auto max-w-5xl px-4 py-12">
        <div className="flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
      </div>
    )
  }

  const readOnly = solicitud.estado !== 'borrador'
  const devuelto = solicitud.estado === 'borrador' && !!solicitud.notaAtencion && !!solicitud.fechaAtencion
  const meta = ESTADO_META[solicitud.estado]
  const StatusIcon = meta.icon

  return (
    <div className="container mx-auto max-w-5xl px-4 py-6">
      {/* Header */}
      <div className="mb-4">
        <Link
          href="/mi-trabajo/herramientas"
          className="mb-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-gray-900"
        >
          <ArrowLeft className="h-3 w-3" /> Mis solicitudes
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">Solicitud {solicitud.numero}</h1>
              <Badge variant="outline" className={meta.classes}>
                <StatusIcon className="mr-1 h-3 w-3" />
                {meta.label}
              </Badge>
            </div>
            {solicitud.fechaEnvio && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                Enviada el {new Date(solicitud.fechaEnvio).toLocaleString('es-PE')}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!readOnly && (
              <>
                <span className="text-xs text-muted-foreground">
                  {estadoGuardado === 'guardando' && <><Loader2 className="mr-1 inline h-3 w-3 animate-spin" />Guardando…</>}
                  {estadoGuardado === 'guardado' && <><Check className="mr-1 inline h-3 w-3 text-emerald-600" />Guardado</>}
                </span>
                <Button
                  variant="outline"
                  className="text-red-600 hover:bg-red-50"
                  onClick={() => setConfirmEliminar(true)}
                  disabled={eliminando || enviando}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Eliminar
                </Button>
                <Button
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={() => {
                    if (items.length === 0) { toast.error('Agrega al menos una herramienta'); return }
                    if (!fechaRequerida) { toast.error('Indica para cuándo las necesitas'); return }
                    setConfirmEnvio(true)
                  }}
                  disabled={enviando || eliminando}
                >
                  <Send className="mr-2 h-4 w-4" />
                  Enviar al almacén
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Banner de devolución si aplica */}
      {devuelto && (
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-amber-800">
                Logística devolvió tu solicitud para que la ajustes
                {solicitud.atendidaPor && <span className="font-normal"> · {solicitud.atendidaPor.name || solicitud.atendidaPor.email}</span>}
              </p>
              <p className="mt-1 text-sm text-gray-700">{solicitud.notaAtencion}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Edita lo necesario y pulsa "Enviar al almacén" cuando esté listo.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Metadatos */}
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Datos de la solicitud</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label className="text-xs">
                ¿Para cuándo las necesitas? <span className="text-red-500">*</span>
              </Label>
              <Input
                type="date"
                value={fechaRequerida}
                onChange={e => setFechaRequerida(e.target.value)}
                min={new Date().toISOString().slice(0, 10)}
                disabled={readOnly}
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Logística prioriza por esta fecha. Planifica con anticipación.
              </p>
            </div>
            <div>
              <Label className="text-xs">¿Hasta cuándo la tendrás? (opcional)</Label>
              <Input
                type="date"
                value={fechaDevolucionEstimada}
                onChange={e => setFechaDevolucionEstimada(e.target.value)}
                min={fechaRequerida || new Date().toISOString().slice(0, 10)}
                disabled={readOnly}
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Ayuda a logística a saber cuándo puede prestarla a otros.
              </p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label className="text-xs">Proyecto (opcional)</Label>
              <Select
                value={proyectoId || '__none__'}
                onValueChange={v => setProyectoId(v === '__none__' ? '' : v)}
                disabled={readOnly}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sin proyecto específico" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Sin proyecto —</SelectItem>
                  {proyectos.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.codigo} — {p.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Observaciones</Label>
              <Textarea
                rows={2}
                value={observaciones}
                onChange={e => setObservaciones(e.target.value)}
                placeholder="Para qué las necesitas, dónde trabajarás..."
                disabled={readOnly}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de items */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">
              Herramientas solicitadas ({items.length})
            </CardTitle>
            {!readOnly && (
              <Button size="sm" onClick={abrirAgregar}>
                <Plus className="mr-2 h-3 w-3" /> Agregar herramienta
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {items.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-muted-foreground">
              {readOnly ? (
                'Esta solicitud no tiene ítems.'
              ) : (
                <>
                  Aún no has agregado herramientas.
                  <br />
                  <Button variant="link" onClick={abrirAgregar} className="mt-2">
                    <Plus className="mr-1 h-3 w-3" /> Agregar la primera
                  </Button>
                </>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">Código</TableHead>
                  <TableHead>Herramienta</TableHead>
                  <TableHead className="w-24 text-right">Stock</TableHead>
                  <TableHead className="w-32 text-right">Cantidad</TableHead>
                  {!readOnly && <TableHead className="w-12" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map(it => {
                  const sinStock = it.cantidad > it.disponible
                  return (
                    <TableRow key={it.catalogoHerramientaId}>
                      <TableCell className="font-mono text-xs">{it.codigo}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Wrench className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                          <span className="text-sm">{it.nombre}</span>
                        </div>
                      </TableCell>
                      <TableCell className={cn(
                        'text-right text-sm tabular-nums',
                        it.disponible > 0 ? 'text-emerald-700' : 'text-amber-700'
                      )}>
                        {it.disponible}
                      </TableCell>
                      <TableCell className="text-right">
                        {readOnly ? (
                          <span className="text-sm font-medium tabular-nums">
                            {it.cantidad} {it.unidadMedida}
                          </span>
                        ) : (
                          <div className="flex items-center justify-end gap-1">
                            <Input
                              type="number"
                              min="1"
                              value={it.cantidad}
                              onChange={e => cambiarCantidad(it.catalogoHerramientaId, Number(e.target.value) || 0)}
                              className={cn('h-7 w-16 text-right text-xs tabular-nums', sinStock && 'border-amber-400')}
                            />
                            <span className="text-[10px] text-muted-foreground">{it.unidadMedida}</span>
                          </div>
                        )}
                        {sinStock && (
                          <p className="mt-0.5 text-[10px] text-amber-700">
                            <AlertTriangle className="mr-0.5 inline h-2.5 w-2.5" />
                            Excede el stock
                          </p>
                        )}
                      </TableCell>
                      {!readOnly && (
                        <TableCell className="text-right">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-red-500 hover:bg-red-50"
                            onClick={() => quitarItem(it.catalogoHerramientaId)}
                            title="Quitar de la solicitud"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modal: Agregar herramienta */}
      <Dialog open={agregarOpen} onOpenChange={setAgregarOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Agregar herramientas</DialogTitle>
            <DialogDescription>
              Ingresa la cantidad para cada herramienta que necesites. Las que dejes en blanco no se agregan.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={agregarQuery}
                onChange={e => setAgregarQuery(e.target.value)}
                placeholder="Buscar por nombre o código..."
                className="pl-8"
                autoFocus
              />
            </div>
            <Select value={agregarCategoria} onValueChange={setAgregarCategoria}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas las categorías</SelectItem>
                {categorias.map(c => (
                  <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="max-h-[50vh] overflow-y-auto rounded-md border">
            {herramientasDisponibles.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {items.length > 0 && herramientas.length > 0 && !agregarQuery
                  ? 'Ya agregaste todas las herramientas del catálogo.'
                  : 'Sin resultados'}
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24">Código</TableHead>
                    <TableHead>Herramienta</TableHead>
                    <TableHead className="w-20 text-right">Stock</TableHead>
                    <TableHead className="w-28 text-right">Cantidad</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {herramientasDisponibles.map(h => {
                    const disp = disponibleDe(h)
                    const cant = agregarCantidad[h.id] || 0
                    return (
                      <TableRow key={h.id}>
                        <TableCell className="font-mono text-xs">{h.codigo}</TableCell>
                        <TableCell>
                          <div className="text-sm">{h.nombre}</div>
                          <div className="text-[11px] capitalize text-muted-foreground">{h.categoria}</div>
                        </TableCell>
                        <TableCell className={cn(
                          'text-right text-sm tabular-nums',
                          disp > 0 ? 'text-emerald-700' : 'text-amber-700'
                        )}>
                          {disp}
                        </TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            min="0"
                            value={cant || ''}
                            onChange={e => {
                              const v = Number(e.target.value) || 0
                              setAgregarCantidad(prev => ({ ...prev, [h.id]: v }))
                            }}
                            placeholder="0"
                            className="h-7 w-20 text-right text-xs tabular-nums"
                          />
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAgregarOpen(false)}>Cancelar</Button>
            <Button onClick={confirmarAgregar}>
              <Plus className="mr-2 h-4 w-4" />
              Agregar seleccionadas
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AlertDialog: Confirmar envío */}
      <AlertDialog open={confirmEnvio} onOpenChange={setConfirmEnvio}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <FileCheck2 className="h-5 w-5 text-blue-600" />
              Enviar solicitud al almacén
            </AlertDialogTitle>
            <AlertDialogDescription>
              Revisa los ítems antes de enviar. Una vez enviada, el área logística la verá y coordinará la entrega.
              Ya no podrás editar los ítems; solo podrás cancelarla si aún no te la atienden.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-2 text-sm">
            {(() => {
              // Anticipación = días entre hoy y fechaRequerida (redondeo hacia arriba)
              const dias = fechaRequerida
                ? Math.ceil((new Date(fechaRequerida).getTime() - Date.now()) / 86400000)
                : null
              if (dias !== null && dias < 1) {
                return (
                  <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    <AlertTriangle className="mr-1 inline h-3 w-3" />
                    Estás pidiendo para {dias <= 0 ? 'hoy' : 'mañana'}. Logística tiene poco tiempo para prepararlo. Planifica con más anticipación la próxima vez.
                  </div>
                )
              }
              return null
            })()}
            <div className="rounded-lg border bg-gray-50 p-3">
              <p className="mb-2 text-xs font-medium text-gray-700">
                Solicitud <span className="font-mono">{solicitud.numero}</span>
                {proyectoId && proyectos.find(p => p.id === proyectoId) && (
                  <span className="ml-2 text-muted-foreground">
                    · Proyecto {proyectos.find(p => p.id === proyectoId)?.codigo}
                  </span>
                )}
              </p>
              <div className="mb-2 flex flex-wrap gap-3 text-[11px] text-gray-700">
                <span>📅 Para: <strong>{fechaRequerida ? new Date(fechaRequerida).toLocaleDateString('es-PE') : '—'}</strong></span>
                {fechaDevolucionEstimada && (
                  <span>↩️ Devuelvo: <strong>{new Date(fechaDevolucionEstimada).toLocaleDateString('es-PE')}</strong></span>
                )}
              </div>
              <ul className="max-h-[40vh] space-y-1 overflow-y-auto">
                {items.map(c => {
                  const sinStock = c.cantidad > c.disponible
                  return (
                    <li key={c.catalogoHerramientaId} className="flex items-center justify-between rounded border bg-white px-2 py-1 text-xs">
                      <span className="min-w-0 truncate">
                        <span className="mr-2 font-mono text-[10px] text-muted-foreground">{c.codigo}</span>
                        {c.nombre}
                      </span>
                      <span className={cn('flex items-center gap-1 whitespace-nowrap', sinStock ? 'text-amber-700' : '')}>
                        {sinStock && <AlertTriangle className="h-3 w-3" />}
                        <span className="font-semibold">{c.cantidad}</span>
                        <span className="text-muted-foreground">{c.unidadMedida}</span>
                      </span>
                    </li>
                  )
                })}
              </ul>
              {observaciones.trim() && (
                <p className="mt-2 border-t pt-2 text-xs text-muted-foreground">
                  💬 {observaciones.trim()}
                </p>
              )}
            </div>

            {items.some(c => c.cantidad > c.disponible) && (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                <AlertTriangle className="mr-1 inline h-3 w-3" />
                Algunos ítems exceden el stock disponible. Logística evaluará cómo atenderte.
              </div>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={enviando}>Volver a editar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); enviarSolicitud() }}
              disabled={enviando}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {enviando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Confirmar envío
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* AlertDialog: Confirmar eliminación */}
      <AlertDialog open={confirmEliminar} onOpenChange={setConfirmEliminar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-600" />
              Eliminar borrador
            </AlertDialogTitle>
            <AlertDialogDescription>
              ¿Eliminar el borrador <span className="font-mono font-semibold">{solicitud.numero}</span>?
              Desaparecerá de tu lista y no podrás recuperarlo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={eliminando}>Volver</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); eliminarBorrador() }}
              disabled={eliminando}
              className="bg-red-600 hover:bg-red-700"
            >
              {eliminando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
