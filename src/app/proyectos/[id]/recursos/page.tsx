'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Plus, Trash2, Send, ChevronDown, ChevronUp, Wrench, Calendar, PackageSearch,
} from 'lucide-react'

const ESTADO_BADGE: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  borrador: { label: 'Borrador', variant: 'secondary' },
  enviado: { label: 'Enviado', variant: 'outline' },
  aprobado: { label: 'Aprobado', variant: 'default' },
  en_proceso: { label: 'En proceso', variant: 'default' },
  cerrado: { label: 'Cerrado', variant: 'secondary' },
  rechazado: { label: 'Rechazado', variant: 'destructive' },
}

const UNIDADES = ['día', 'semana', 'mes', 'hora', 'global']

type CatalogoRecurso = { id: string; nombre: string; categoria: string; unidad: string }
type SolicitudItem = {
  id: string
  catalogoRecursoId: string | null
  catalogoRecurso: CatalogoRecurso | null
  descripcion: string
  unidad: string
  cantidad: number
  precioEstimado: number | null
  totalEstimado: number | null
  fechaInicio: string | null
  fechaFin: string | null
  observaciones: string | null
}
type Solicitud = {
  id: string
  estado: string
  titulo: string | null
  fechaNecesaria: string | null
  observaciones: string | null
  motivoRechazo: string | null
  solicitante: { name: string | null }
  aprobador: { name: string | null } | null
  fechaAprobacion: string | null
  createdAt: string
  items: SolicitudItem[]
}

const emptyItem = {
  catalogoRecursoId: '',
  descripcion: '',
  unidad: 'día',
  cantidad: '1',
  precioEstimado: '',
  fechaInicio: '',
  fechaFin: '',
  observaciones: '',
}

export default function ProyectoRecursosPage() {
  const { id: proyectoId } = useParams<{ id: string }>()
  const { data: session } = useSession()
  const role = session?.user?.role ?? ''

  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([])
  const [catalogo, setCatalogo] = useState<CatalogoRecurso[]>([])
  const [loading, setLoading] = useState(true)
  const [expandidas, setExpandidas] = useState<Set<string>>(new Set())

  // Nueva solicitud
  const [showNueva, setShowNueva] = useState(false)
  const [titulo, setTitulo] = useState('')
  const [fechaNecesaria, setFechaNecesaria] = useState('')
  const [obsGeneral, setObsGeneral] = useState('')
  const [items, setItems] = useState([{ ...emptyItem }])
  const [guardando, setGuardando] = useState(false)

  const canCreate = ['admin', 'gerente', 'gestor', 'coordinador', 'logistico', 'coordinador_logistico'].includes(role)

  useEffect(() => {
    fetchSolicitudes()
    fetchCatalogo()
  }, [proyectoId])

  async function fetchSolicitudes() {
    setLoading(true)
    try {
      const res = await fetch(`/api/solicitud-recurso?proyectoId=${proyectoId}`)
      setSolicitudes(await res.json())
    } catch {
      toast.error('Error al cargar solicitudes')
    } finally {
      setLoading(false)
    }
  }

  async function fetchCatalogo() {
    try {
      const res = await fetch('/api/catalogo-recurso')
      setCatalogo(await res.json())
    } catch {
      // silencioso
    }
  }

  function toggleExpand(id: string) {
    setExpandidas(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function addItem() {
    setItems(prev => [...prev, { ...emptyItem }])
  }

  function removeItem(i: number) {
    setItems(prev => prev.filter((_, idx) => idx !== i))
  }

  function updateItem(i: number, field: string, value: string) {
    setItems(prev => prev.map((item, idx) => {
      if (idx !== i) return item
      const updated = { ...item, [field]: value }
      // Auto-fill descripcion y unidad desde catálogo
      if (field === 'catalogoRecursoId' && value) {
        const cat = catalogo.find(c => c.id === value)
        if (cat) {
          updated.descripcion = cat.nombre
          updated.unidad = cat.unidad
        }
      }
      return updated
    }))
  }

  async function handleCrear() {
    const validItems = items.filter(it => it.descripcion.trim() && it.cantidad)
    if (validItems.length === 0) {
      toast.error('Agrega al menos un ítem')
      return
    }
    setGuardando(true)
    try {
      const res = await fetch('/api/solicitud-recurso', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proyectoId,
          titulo: titulo || null,
          fechaNecesaria: fechaNecesaria || null,
          observaciones: obsGeneral || null,
          items: validItems.map(it => ({
            catalogoRecursoId: it.catalogoRecursoId || null,
            descripcion: it.descripcion,
            unidad: it.unidad,
            cantidad: Number(it.cantidad),
            precioEstimado: it.precioEstimado ? Number(it.precioEstimado) : null,
            fechaInicio: it.fechaInicio || null,
            fechaFin: it.fechaFin || null,
            observaciones: it.observaciones || null,
          })),
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success('Solicitud creada')
      setShowNueva(false)
      setTitulo('')
      setFechaNecesaria('')
      setObsGeneral('')
      setItems([{ ...emptyItem }])
      fetchSolicitudes()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setGuardando(false)
    }
  }

  async function handleEnviar(solicitud: Solicitud) {
    try {
      const res = await fetch(`/api/solicitud-recurso/${solicitud.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: 'enviado' }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success('Solicitud enviada a logística')
      fetchSolicitudes()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  async function handleEliminar(solicitud: Solicitud) {
    if (!confirm('¿Eliminar esta solicitud?')) return
    try {
      const res = await fetch(`/api/solicitud-recurso/${solicitud.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success('Solicitud eliminada')
      fetchSolicitudes()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const totalEstimado = (items: SolicitudItem[]) =>
    items.reduce((sum, it) => sum + (it.totalEstimado ? Number(it.totalEstimado) : 0), 0)

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Wrench className="h-5 w-5 text-muted-foreground" />
          <div>
            <h2 className="text-lg font-semibold">Recursos de Ejecución</h2>
            <p className="text-sm text-muted-foreground">
              Solicita recursos a logística (Manlift, Andamios, Herramientas, etc.)
            </p>
          </div>
        </div>
        {canCreate && (
          <Button size="sm" onClick={() => setShowNueva(true)}>
            <Plus className="h-4 w-4 mr-1" /> Nueva Solicitud
          </Button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : solicitudes.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground text-sm flex flex-col items-center gap-2">
            <PackageSearch className="h-8 w-8 opacity-40" />
            <p>No hay solicitudes de recursos para este proyecto.</p>
            {canCreate && (
              <Button size="sm" variant="outline" onClick={() => setShowNueva(true)}>
                <Plus className="h-4 w-4 mr-1" /> Crear primera solicitud
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {solicitudes.map(sol => {
            const est = ESTADO_BADGE[sol.estado] ?? { label: sol.estado, variant: 'outline' as const }
            const expanded = expandidas.has(sol.id)
            const total = totalEstimado(sol.items)
            return (
              <Card key={sol.id} className="overflow-hidden">
                <CardHeader
                  className="py-3 px-4 cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => toggleExpand(sol.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                      <div>
                        <p className="font-medium text-sm">
                          {sol.titulo || `Solicitud ${new Date(sol.createdAt).toLocaleDateString('es-PE')}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {sol.items.length} ítem{sol.items.length !== 1 ? 's' : ''}
                          {total > 0 && ` · S/ ${total.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`}
                          {sol.fechaNecesaria && ` · Necesario: ${new Date(sol.fechaNecesaria).toLocaleDateString('es-PE')}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                      <Badge variant={est.variant}>{est.label}</Badge>
                      {sol.estado === 'borrador' && canCreate && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => handleEnviar(sol)}>
                            <Send className="h-3.5 w-3.5 mr-1" /> Enviar
                          </Button>
                          <Button size="icon" variant="ghost" className="text-destructive h-8 w-8" onClick={() => handleEliminar(sol)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                      {sol.estado === 'rechazado' && sol.motivoRechazo && (
                        <span className="text-xs text-destructive">Motivo: {sol.motivoRechazo}</span>
                      )}
                    </div>
                  </div>
                </CardHeader>
                {expanded && (
                  <CardContent className="pt-0 pb-3 px-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Recurso</TableHead>
                          <TableHead>Cantidad</TableHead>
                          <TableHead>Período</TableHead>
                          <TableHead>Precio Est.</TableHead>
                          <TableHead>Total Est.</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sol.items.map(item => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <p className="text-sm font-medium">{item.descripcion}</p>
                              {item.catalogoRecurso && (
                                <p className="text-xs text-muted-foreground">{item.catalogoRecurso.categoria}</p>
                              )}
                            </TableCell>
                            <TableCell className="text-sm">{Number(item.cantidad)} {item.unidad}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {item.fechaInicio && item.fechaFin
                                ? `${new Date(item.fechaInicio).toLocaleDateString('es-PE')} – ${new Date(item.fechaFin).toLocaleDateString('es-PE')}`
                                : item.fechaInicio
                                  ? `Desde ${new Date(item.fechaInicio).toLocaleDateString('es-PE')}`
                                  : '—'}
                            </TableCell>
                            <TableCell className="text-sm">
                              {item.precioEstimado ? `S/ ${Number(item.precioEstimado).toLocaleString()}` : '—'}
                            </TableCell>
                            <TableCell className="text-sm font-medium">
                              {item.totalEstimado ? `S/ ${Number(item.totalEstimado).toLocaleString()}` : '—'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {sol.observaciones && (
                      <p className="text-xs text-muted-foreground mt-2 px-1">Obs: {sol.observaciones}</p>
                    )}
                    {sol.aprobador && (
                      <p className="text-xs text-muted-foreground mt-1 px-1">
                        Aprobado por {sol.aprobador.name}
                        {sol.fechaAprobacion && ` el ${new Date(sol.fechaAprobacion).toLocaleDateString('es-PE')}`}
                      </p>
                    )}
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* Modal nueva solicitud */}
      <Dialog open={showNueva} onOpenChange={setShowNueva}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nueva Solicitud de Recursos</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Título (opcional)</Label>
                <Input
                  placeholder="Ej: Recursos semana 3"
                  value={titulo}
                  onChange={e => setTitulo(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Fecha necesaria</Label>
                <div className="relative">
                  <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="date"
                    className="pl-8"
                    value={fechaNecesaria}
                    onChange={e => setFechaNecesaria(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Observaciones generales</Label>
              <Textarea
                placeholder="Notas adicionales..."
                value={obsGeneral}
                onChange={e => setObsGeneral(e.target.value)}
                rows={2}
              />
            </div>

            <div className="border-t pt-3">
              <div className="flex items-center justify-between mb-3">
                <Label>Ítems a solicitar</Label>
                <Button size="sm" variant="outline" onClick={addItem}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Agregar ítem
                </Button>
              </div>
              <div className="space-y-3">
                {items.map((item, i) => (
                  <div key={i} className="border rounded-lg p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">Ítem {i + 1}</span>
                      {items.length > 1 && (
                        <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => removeItem(i)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-3 space-y-1">
                        <Label className="text-xs">Del catálogo (opcional)</Label>
                        <Select
                          value={item.catalogoRecursoId || 'none'}
                          onValueChange={v => updateItem(i, 'catalogoRecursoId', v === 'none' ? '' : v)}
                        >
                          <SelectTrigger className="text-sm">
                            <SelectValue placeholder="Seleccionar del catálogo..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">— Manual —</SelectItem>
                            {catalogo.map(c => (
                              <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-2 space-y-1">
                        <Label className="text-xs">Descripción *</Label>
                        <Input
                          placeholder="Nombre del recurso"
                          value={item.descripcion}
                          onChange={e => updateItem(i, 'descripcion', e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Unidad *</Label>
                        <Select value={item.unidad} onValueChange={v => updateItem(i, 'unidad', v)}>
                          <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {UNIDADES.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Cantidad *</Label>
                        <Input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={item.cantidad}
                          onChange={e => updateItem(i, 'cantidad', e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Precio Est. (S/)</Label>
                        <Input
                          type="number"
                          placeholder="0.00"
                          value={item.precioEstimado}
                          onChange={e => updateItem(i, 'precioEstimado', e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Total Est.</Label>
                        <Input
                          disabled
                          value={
                            item.precioEstimado && item.cantidad
                              ? `S/ ${(Number(item.precioEstimado) * Number(item.cantidad)).toLocaleString('es-PE', { minimumFractionDigits: 2 })}`
                              : ''
                          }
                          className="bg-muted text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Fecha inicio</Label>
                        <Input
                          type="date"
                          value={item.fechaInicio}
                          onChange={e => updateItem(i, 'fechaInicio', e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Fecha fin</Label>
                        <Input
                          type="date"
                          value={item.fechaFin}
                          onChange={e => updateItem(i, 'fechaFin', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowNueva(false)}>Cancelar</Button>
              <Button onClick={handleCrear} disabled={guardando}>
                {guardando ? 'Guardando...' : 'Crear Solicitud'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
