'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'
import { Loader2, Plus, X, Home } from 'lucide-react'

interface Solicitud {
  id: string
  fechaInicio: string
  fechaFin: string
  descripcion: string | null
  estado: 'pendiente' | 'aprobado' | 'rechazado' | 'cancelado'
  motivoRechazo: string | null
  createdAt: string
  aprobadoEn: string | null
  aprobador: { id: string; name: string | null } | null
}

function estadoColor(e: string) {
  switch (e) {
    case 'aprobado':
      return 'bg-emerald-100 text-emerald-700'
    case 'pendiente':
      return 'bg-amber-100 text-amber-700'
    case 'rechazado':
      return 'bg-red-100 text-red-700'
    case 'cancelado':
      return 'bg-gray-100 text-gray-600'
    default:
      return 'bg-gray-100 text-gray-700'
  }
}

function hoy() {
  return new Date().toISOString().slice(0, 10)
}

export default function MisSolicitudesRemoto() {
  const [data, setData] = useState<Solicitud[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState({ fechaInicio: hoy(), fechaFin: hoy(), descripcion: '' })
  const [saving, setSaving] = useState(false)

  async function cargar() {
    setLoading(true)
    const r = await fetch('/api/asistencia/solicitudes-remoto?scope=propias')
    setData(await r.json())
    setLoading(false)
  }

  useEffect(() => {
    cargar()
  }, [])

  async function crear() {
    setSaving(true)
    try {
      const r = await fetch('/api/asistencia/solicitudes-remoto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const j = await r.json()
      if (!r.ok) {
        toast.error(j.message || 'Error al crear')
        return
      }
      toast.success('Solicitud enviada')
      setDialogOpen(false)
      setForm({ fechaInicio: hoy(), fechaFin: hoy(), descripcion: '' })
      cargar()
    } finally {
      setSaving(false)
    }
  }

  async function cancelar(id: string) {
    if (!confirm('¿Cancelar esta solicitud pendiente?')) return
    const r = await fetch(`/api/asistencia/solicitudes-remoto/${id}`, { method: 'DELETE' })
    if (r.ok) {
      toast.success('Solicitud cancelada')
      cargar()
    } else {
      toast.error('Error al cancelar')
    }
  }

  return (
    <div className="container mx-auto max-w-5xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Home className="h-6 w-6" /> Mis Solicitudes de Trabajo Remoto
          </h1>
          <p className="text-sm text-muted-foreground">
            Pide permiso para trabajar desde casa. Tu supervisor aprueba.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Nueva solicitud
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Solicitar trabajo remoto</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Desde</Label>
                  <Input
                    type="date"
                    value={form.fechaInicio}
                    onChange={e => setForm({ ...form, fechaInicio: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Hasta</Label>
                  <Input
                    type="date"
                    value={form.fechaFin}
                    onChange={e => setForm({ ...form, fechaFin: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label>Descripción (opcional)</Label>
                <Textarea
                  rows={3}
                  value={form.descripcion}
                  onChange={e => setForm({ ...form, descripcion: e.target.value })}
                  placeholder="Razón breve para el supervisor..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={crear} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Enviar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Desde</TableHead>
                  <TableHead>Hasta</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Aprobador</TableHead>
                  <TableHead className="text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map(s => (
                  <TableRow key={s.id}>
                    <TableCell>{new Date(s.fechaInicio).toLocaleDateString('es-PE')}</TableCell>
                    <TableCell>{new Date(s.fechaFin).toLocaleDateString('es-PE')}</TableCell>
                    <TableCell className="max-w-xs truncate text-xs">
                      {s.descripcion || '—'}
                    </TableCell>
                    <TableCell>
                      <Badge className={estadoColor(s.estado)} variant="outline">
                        {s.estado}
                      </Badge>
                      {s.estado === 'rechazado' && s.motivoRechazo && (
                        <p className="mt-1 text-xs text-red-700">{s.motivoRechazo}</p>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">{s.aprobador?.name || '—'}</TableCell>
                    <TableCell className="text-right">
                      {s.estado === 'pendiente' && (
                        <Button size="sm" variant="ghost" onClick={() => cancelar(s.id)}>
                          <X className="mr-1 h-3 w-3" /> Cancelar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {data.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      No tienes solicitudes registradas.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
