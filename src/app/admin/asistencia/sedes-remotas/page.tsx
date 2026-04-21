'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Loader2, MapPin, CheckCircle2, XCircle, Clock, Home } from 'lucide-react'
import { toast } from 'sonner'

interface Sede {
  id: string
  nombre: string
  latitud: number
  longitud: number
  radioMetros: number
  estado: 'pendiente' | 'aprobada' | 'rechazada' | 'reemplazada'
  motivoRechazo: string | null
  observaciones: string | null
  vigenciaDesde: string | null
  vigenciaHasta: string | null
  aprobadoEn: string | null
  createdAt: string
  user: { id: string; name: string | null; email: string }
  aprobadoPor: { name: string | null } | null
}

const ESTADO_COLORS: Record<string, string> = {
  pendiente: 'bg-amber-100 text-amber-700',
  aprobada: 'bg-emerald-100 text-emerald-700',
  rechazada: 'bg-red-100 text-red-700',
  reemplazada: 'bg-gray-100 text-gray-600',
}

export default function AdminSedesRemotasPage() {
  const [sedes, setSedes] = useState<Sede[]>([])
  const [loading, setLoading] = useState(false)
  const [filtroEstado, setFiltroEstado] = useState('pendiente')

  const [dialogAbierto, setDialogAbierto] = useState<'aprobar' | 'rechazar' | null>(null)
  const [sedeSeleccionada, setSedeSeleccionada] = useState<Sede | null>(null)
  const [radioAjustado, setRadioAjustado] = useState(100)
  const [motivoRechazo, setMotivoRechazo] = useState('')
  const [procesando, setProcesando] = useState(false)

  const cargar = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filtroEstado !== 'todos') params.set('estado', filtroEstado)
    const r = await fetch(`/api/admin/sedes-remotas?${params}`)
    setSedes(await r.json())
    setLoading(false)
  }, [filtroEstado])

  useEffect(() => {
    cargar()
  }, [cargar])

  function abrirAprobar(s: Sede) {
    setSedeSeleccionada(s)
    setRadioAjustado(s.radioMetros)
    setDialogAbierto('aprobar')
  }

  function abrirRechazar(s: Sede) {
    setSedeSeleccionada(s)
    setMotivoRechazo('')
    setDialogAbierto('rechazar')
  }

  async function confirmarAprobar() {
    if (!sedeSeleccionada) return
    setProcesando(true)
    try {
      const r = await fetch(`/api/admin/sedes-remotas/${sedeSeleccionada.id}/aprobar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ radioMetros: radioAjustado }),
      })
      if (!r.ok) {
        const j = await r.json()
        toast.error(j.error || 'Error')
        return
      }
      toast.success('Sede aprobada')
      setDialogAbierto(null)
      await cargar()
    } finally {
      setProcesando(false)
    }
  }

  async function confirmarRechazar() {
    if (!sedeSeleccionada) return
    if (!motivoRechazo.trim()) {
      toast.error('Indica el motivo del rechazo')
      return
    }
    setProcesando(true)
    try {
      const r = await fetch(`/api/admin/sedes-remotas/${sedeSeleccionada.id}/rechazar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motivoRechazo }),
      })
      if (!r.ok) {
        const j = await r.json()
        toast.error(j.error || 'Error')
        return
      }
      toast.success('Sede rechazada')
      setDialogAbierto(null)
      await cargar()
    } finally {
      setProcesando(false)
    }
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Sedes remotas — Aprobaciones</h1>
        <p className="text-sm text-muted-foreground">
          Revisa y aprueba las ubicaciones remotas declaradas por los trabajadores.
        </p>
      </div>

      <Card className="mb-4">
        <CardContent className="flex items-end gap-3 py-4">
          <div>
            <Label className="text-xs">Estado</Label>
            <Select value={filtroEstado} onValueChange={setFiltroEstado}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pendiente">Pendientes</SelectItem>
                <SelectItem value="aprobada">Aprobadas</SelectItem>
                <SelectItem value="rechazada">Rechazadas</SelectItem>
                <SelectItem value="reemplazada">Reemplazadas</SelectItem>
                <SelectItem value="todos">Todos</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={cargar} disabled={loading} variant="outline">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Actualizar
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Trabajador</TableHead>
                <TableHead>Sede</TableHead>
                <TableHead>Ubicación GPS</TableHead>
                <TableHead>Radio</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sedes.map(s => (
                <TableRow key={s.id}>
                  <TableCell className="text-sm">
                    <p className="font-medium">{s.user.name || '—'}</p>
                    <p className="text-xs text-muted-foreground">{s.user.email}</p>
                  </TableCell>
                  <TableCell className="text-sm">
                    <p className="flex items-center gap-1 font-medium">
                      <Home className="h-3 w-3" /> {s.nombre}
                    </p>
                    {s.observaciones && (
                      <p className="text-xs text-muted-foreground">{s.observaciones}</p>
                    )}
                    {s.motivoRechazo && (
                      <p className="text-xs text-red-600">Rechazo: {s.motivoRechazo}</p>
                    )}
                  </TableCell>
                  <TableCell>
                    <a
                      href={`https://www.google.com/maps?q=${s.latitud},${s.longitud}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 font-mono text-xs text-blue-600 hover:underline"
                    >
                      <MapPin className="h-3 w-3" />
                      {s.latitud.toFixed(4)}, {s.longitud.toFixed(4)}
                    </a>
                  </TableCell>
                  <TableCell className="text-xs">{s.radioMetros}m</TableCell>
                  <TableCell>
                    <Badge className={ESTADO_COLORS[s.estado]}>
                      {s.estado === 'pendiente' && <Clock className="mr-1 h-3 w-3" />}
                      {s.estado === 'aprobada' && <CheckCircle2 className="mr-1 h-3 w-3" />}
                      {s.estado === 'rechazada' && <XCircle className="mr-1 h-3 w-3" />}
                      {s.estado}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs whitespace-nowrap">
                    {new Date(s.createdAt).toLocaleDateString('es-PE')}
                  </TableCell>
                  <TableCell>
                    {s.estado === 'pendiente' ? (
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" className="h-7 text-xs text-emerald-700"
                          onClick={() => abrirAprobar(s)}>
                          <CheckCircle2 className="mr-1 h-3 w-3" /> Aprobar
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs text-red-700"
                          onClick={() => abrirRechazar(s)}>
                          <XCircle className="mr-1 h-3 w-3" /> Rechazar
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {sedes.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    Sin sedes en este estado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog aprobar */}
      <Dialog open={dialogAbierto === 'aprobar'} onOpenChange={v => !v && setDialogAbierto(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aprobar sede remota</DialogTitle>
          </DialogHeader>
          {sedeSeleccionada && (
            <div className="space-y-3">
              <div className="rounded bg-muted p-3 text-sm">
                <p className="font-semibold">{sedeSeleccionada.user.name}</p>
                <p className="text-xs text-muted-foreground">{sedeSeleccionada.nombre}</p>
                <p className="mt-1 font-mono text-xs">
                  {sedeSeleccionada.latitud.toFixed(6)}, {sedeSeleccionada.longitud.toFixed(6)}
                </p>
              </div>
              <div>
                <Label>Radio permitido (metros)</Label>
                <Input
                  type="number"
                  min={20}
                  max={500}
                  value={radioAjustado}
                  onChange={e => setRadioAjustado(Number(e.target.value))}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Puedes ajustar el radio antes de aprobar. Recomendado: 50–150m.
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogAbierto(null)}>Cancelar</Button>
            <Button onClick={confirmarAprobar} disabled={procesando}>
              {procesando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Aprobar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog rechazar */}
      <Dialog open={dialogAbierto === 'rechazar'} onOpenChange={v => !v && setDialogAbierto(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rechazar sede remota</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label>Motivo del rechazo *</Label>
            <Textarea
              rows={3}
              value={motivoRechazo}
              onChange={e => setMotivoRechazo(e.target.value)}
              placeholder="Ej. La ubicación no corresponde a un lugar apto para trabajo remoto"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogAbierto(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={confirmarRechazar} disabled={procesando}>
              {procesando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Rechazar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
