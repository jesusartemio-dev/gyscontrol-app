'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
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
  CheckCircle2, XCircle, Play, CheckSquare, ChevronDown, ChevronUp,
  Wrench, Filter,
} from 'lucide-react'

const ESTADO_BADGE: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  borrador: { label: 'Borrador', variant: 'secondary' },
  enviado: { label: 'Enviado', variant: 'outline' },
  aprobado: { label: 'Aprobado', variant: 'default' },
  en_proceso: { label: 'En proceso', variant: 'default' },
  cerrado: { label: 'Cerrado', variant: 'secondary' },
  rechazado: { label: 'Rechazado', variant: 'destructive' },
}

type SolicitudItem = {
  id: string
  descripcion: string
  unidad: string
  cantidad: number
  precioEstimado: number | null
  totalEstimado: number | null
  fechaInicio: string | null
  fechaFin: string | null
  catalogoRecurso: { nombre: string; categoria: string } | null
}
type Solicitud = {
  id: string
  estado: string
  titulo: string | null
  fechaNecesaria: string | null
  observaciones: string | null
  motivoRechazo: string | null
  createdAt: string
  proyecto: { id: string; nombre: string; codigo: string }
  solicitante: { name: string | null }
  aprobador: { name: string | null } | null
  fechaAprobacion: string | null
  items: SolicitudItem[]
}

export default function SolicitudesRecursoPage() {
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroEstado, setFiltroEstado] = useState('enviado')
  const [busqueda, setBusqueda] = useState('')
  const [expandidas, setExpandidas] = useState<Set<string>>(new Set())

  // Modal acción
  const [accionModal, setAccionModal] = useState<{ sol: Solicitud; tipo: 'aprobar' | 'rechazar' | 'en_proceso' | 'cerrar' } | null>(null)
  const [motivo, setMotivo] = useState('')
  const [procesando, setProcesando] = useState(false)

  useEffect(() => {
    fetchSolicitudes()
  }, [filtroEstado])

  async function fetchSolicitudes() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filtroEstado && filtroEstado !== 'todos') params.set('estado', filtroEstado)
      const res = await fetch(`/api/solicitud-recurso?${params}`)
      setSolicitudes(await res.json())
    } catch {
      toast.error('Error al cargar solicitudes')
    } finally {
      setLoading(false)
    }
  }

  function toggleExpand(id: string) {
    setExpandidas(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function ejecutarAccion() {
    if (!accionModal) return
    const { sol, tipo } = accionModal

    const estadoMap: Record<string, string> = {
      aprobar: 'aprobado',
      rechazar: 'rechazado',
      en_proceso: 'en_proceso',
      cerrar: 'cerrado',
    }

    if (tipo === 'rechazar' && !motivo.trim()) {
      toast.error('Ingresa el motivo de rechazo')
      return
    }

    setProcesando(true)
    try {
      const res = await fetch(`/api/solicitud-recurso/${sol.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          estado: estadoMap[tipo],
          ...(tipo === 'rechazar' ? { motivoRechazo: motivo } : {}),
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error)

      const labels: Record<string, string> = {
        aprobar: 'Solicitud aprobada',
        rechazar: 'Solicitud rechazada',
        en_proceso: 'Marcada en proceso',
        cerrar: 'Solicitud cerrada',
      }
      toast.success(labels[tipo])
      setAccionModal(null)
      setMotivo('')
      fetchSolicitudes()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setProcesando(false)
    }
  }

  const filtradas = solicitudes.filter(s =>
    s.proyecto.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    s.proyecto.codigo.toLowerCase().includes(busqueda.toLowerCase()) ||
    (s.titulo ?? '').toLowerCase().includes(busqueda.toLowerCase())
  )

  const totalEstimado = (items: SolicitudItem[]) =>
    items.reduce((sum, it) => sum + (it.totalEstimado ? Number(it.totalEstimado) : 0), 0)

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Wrench className="h-6 w-6 text-muted-foreground" />
          <div>
            <h1 className="text-xl font-semibold">Solicitudes de Recursos</h1>
            <p className="text-sm text-muted-foreground">
              Gestiona las solicitudes de recursos de ejecución de todos los proyectos
            </p>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={filtroEstado} onValueChange={setFiltroEstado}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="enviado">Enviados</SelectItem>
              <SelectItem value="aprobado">Aprobados</SelectItem>
              <SelectItem value="en_proceso">En proceso</SelectItem>
              <SelectItem value="cerrado">Cerrados</SelectItem>
              <SelectItem value="rechazado">Rechazados</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Input
          placeholder="Buscar por proyecto o título..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          className="max-w-xs"
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : filtradas.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground text-sm">
            No hay solicitudes {filtroEstado !== 'todos' ? `con estado "${ESTADO_BADGE[filtroEstado]?.label ?? filtroEstado}"` : ''}.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtradas.map(sol => {
            const est = ESTADO_BADGE[sol.estado] ?? { label: sol.estado, variant: 'outline' as const }
            const expanded = expandidas.has(sol.id)
            const total = totalEstimado(sol.items)
            return (
              <Card key={sol.id} className="overflow-hidden">
                <div
                  className="py-3 px-4 cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => toggleExpand(sol.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {expanded
                        ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      }
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">
                            {sol.titulo || `Solicitud ${new Date(sol.createdAt).toLocaleDateString('es-PE')}`}
                          </p>
                          <Link
                            href={`/proyectos/${sol.proyecto.id}`}
                            className="text-xs text-primary hover:underline"
                            onClick={e => e.stopPropagation()}
                          >
                            {sol.proyecto.codigo} — {sol.proyecto.nombre}
                          </Link>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Solicitado por {sol.solicitante.name}
                          {' · '}{sol.items.length} ítem{sol.items.length !== 1 ? 's' : ''}
                          {total > 0 && ` · Est. S/ ${total.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`}
                          {sol.fechaNecesaria && ` · Necesario: ${new Date(sol.fechaNecesaria).toLocaleDateString('es-PE')}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                      <Badge variant={est.variant}>{est.label}</Badge>
                      {sol.estado === 'enviado' && (
                        <>
                          <Button size="sm" variant="outline" className="text-green-600 border-green-200"
                            onClick={() => setAccionModal({ sol, tipo: 'aprobar' })}>
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Aprobar
                          </Button>
                          <Button size="sm" variant="outline" className="text-destructive border-destructive/20"
                            onClick={() => setAccionModal({ sol, tipo: 'rechazar' })}>
                            <XCircle className="h-3.5 w-3.5 mr-1" /> Rechazar
                          </Button>
                        </>
                      )}
                      {sol.estado === 'aprobado' && (
                        <Button size="sm" variant="outline"
                          onClick={() => setAccionModal({ sol, tipo: 'en_proceso' })}>
                          <Play className="h-3.5 w-3.5 mr-1" /> Iniciar
                        </Button>
                      )}
                      {sol.estado === 'en_proceso' && (
                        <Button size="sm" variant="outline"
                          onClick={() => setAccionModal({ sol, tipo: 'cerrar' })}>
                          <CheckSquare className="h-3.5 w-3.5 mr-1" /> Cerrar
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
                {expanded && (
                  <div className="border-t px-4 pb-3">
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
                      <p className="text-xs text-muted-foreground mt-2">Obs: {sol.observaciones}</p>
                    )}
                    {sol.motivoRechazo && (
                      <p className="text-xs text-destructive mt-1">Rechazo: {sol.motivoRechazo}</p>
                    )}
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* Modal acción */}
      <Dialog open={!!accionModal} onOpenChange={() => { setAccionModal(null); setMotivo('') }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {accionModal?.tipo === 'aprobar' && 'Aprobar solicitud'}
              {accionModal?.tipo === 'rechazar' && 'Rechazar solicitud'}
              {accionModal?.tipo === 'en_proceso' && 'Iniciar proceso'}
              {accionModal?.tipo === 'cerrar' && 'Cerrar solicitud'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {accionModal?.tipo === 'rechazar' && (
              <div className="space-y-1.5">
                <Label>Motivo de rechazo *</Label>
                <Textarea
                  placeholder="Indica el motivo..."
                  value={motivo}
                  onChange={e => setMotivo(e.target.value)}
                  rows={3}
                />
              </div>
            )}
            {accionModal?.tipo === 'aprobar' && (
              <p className="text-sm text-muted-foreground">
                ¿Confirmas la aprobación de esta solicitud? El equipo de proyecto será notificado y podrás proceder con la gestión logística.
              </p>
            )}
            {accionModal?.tipo === 'en_proceso' && (
              <p className="text-sm text-muted-foreground">
                Marca esta solicitud como &quot;En proceso&quot; para indicar que la gestión logística está en curso.
              </p>
            )}
            {accionModal?.tipo === 'cerrar' && (
              <p className="text-sm text-muted-foreground">
                Marca esta solicitud como cerrada una vez que todos los recursos han sido atendidos.
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setAccionModal(null); setMotivo('') }}>
                Cancelar
              </Button>
              <Button
                onClick={ejecutarAccion}
                disabled={procesando}
                variant={accionModal?.tipo === 'rechazar' ? 'destructive' : 'default'}
              >
                {procesando ? 'Procesando...' : 'Confirmar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
