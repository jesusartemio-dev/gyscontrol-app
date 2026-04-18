'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'
import { Loader2, MapPin, Plus, FileText, Edit, Power } from 'lucide-react'

interface Ubicacion {
  id: string
  nombre: string
  tipo: string
  direccion: string | null
  latitud: number
  longitud: number
  radioMetros: number
  activo: boolean
  toleranciaMinutos: number
  limiteTardeMinutos: number
}

const vacia = {
  id: '',
  nombre: '',
  tipo: 'oficina',
  direccion: '',
  latitud: '',
  longitud: '',
  radioMetros: 150,
  activo: true,
  toleranciaMinutos: 5,
  limiteTardeMinutos: 30,
}

export default function UbicacionesPage() {
  const [data, setData] = useState<Ubicacion[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<any>(vacia)
  const [saving, setSaving] = useState(false)

  async function cargar() {
    setLoading(true)
    const r = await fetch('/api/asistencia/ubicaciones')
    const j = await r.json()
    setData(j)
    setLoading(false)
  }

  useEffect(() => {
    cargar()
  }, [])

  async function usarMiUbicacion() {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(pos => {
      setForm({ ...form, latitud: pos.coords.latitude, longitud: pos.coords.longitude })
      toast.success('GPS capturado')
    })
  }

  async function guardar() {
    setSaving(true)
    try {
      const url = form.id
        ? `/api/asistencia/ubicaciones/${form.id}`
        : '/api/asistencia/ubicaciones'
      const method = form.id ? 'PUT' : 'POST'
      const r = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const j = await r.json()
      if (!r.ok) {
        toast.error(j.message || 'Error al guardar')
        return
      }
      toast.success('Ubicación guardada')
      setDialogOpen(false)
      setForm(vacia)
      cargar()
    } finally {
      setSaving(false)
    }
  }

  async function toggleActivo(u: Ubicacion) {
    await fetch(`/api/asistencia/ubicaciones/${u.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...u, activo: !u.activo }),
    })
    cargar()
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Ubicaciones de Asistencia</h1>
          <p className="text-sm text-muted-foreground">
            Oficinas, plantas y obras con geofence
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setForm(vacia)}>
              <Plus className="mr-2 h-4 w-4" /> Nueva ubicación
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{form.id ? 'Editar' : 'Nueva'} ubicación</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4">
              <div>
                <Label>Nombre</Label>
                <Input
                  value={form.nombre}
                  onChange={e => setForm({ ...form, nombre: e.target.value })}
                />
              </div>
              <div>
                <Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={v => setForm({ ...form, tipo: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="oficina">Oficina</SelectItem>
                    <SelectItem value="planta">Planta</SelectItem>
                    <SelectItem value="obra">Obra</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Dirección</Label>
                <Input
                  value={form.direccion}
                  onChange={e => setForm({ ...form, direccion: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Latitud</Label>
                  <Input
                    type="number"
                    step="any"
                    value={form.latitud}
                    onChange={e => setForm({ ...form, latitud: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Longitud</Label>
                  <Input
                    type="number"
                    step="any"
                    value={form.longitud}
                    onChange={e => setForm({ ...form, longitud: e.target.value })}
                  />
                </div>
              </div>
              <Button variant="outline" type="button" onClick={usarMiUbicacion}>
                <MapPin className="mr-2 h-4 w-4" /> Usar mi ubicación actual
              </Button>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Radio (m)</Label>
                  <Input
                    type="number"
                    value={form.radioMetros}
                    onChange={e =>
                      setForm({ ...form, radioMetros: parseInt(e.target.value || '0') })
                    }
                  />
                </div>
                <div>
                  <Label>Tolerancia (min)</Label>
                  <Input
                    type="number"
                    value={form.toleranciaMinutos}
                    onChange={e =>
                      setForm({ ...form, toleranciaMinutos: parseInt(e.target.value || '0') })
                    }
                  />
                </div>
                <div>
                  <Label>Límite tarde (min)</Label>
                  <Input
                    type="number"
                    value={form.limiteTardeMinutos}
                    onChange={e =>
                      setForm({ ...form, limiteTardeMinutos: parseInt(e.target.value || '0') })
                    }
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={guardar} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Guardar
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
                  <TableHead>Nombre</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Coordenadas</TableHead>
                  <TableHead>Radio</TableHead>
                  <TableHead>Reglas</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map(u => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.nombre}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{u.tipo}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {u.latitud.toFixed(5)}, {u.longitud.toFixed(5)}
                    </TableCell>
                    <TableCell>{u.radioMetros} m</TableCell>
                    <TableCell className="text-xs">
                      ≤{u.toleranciaMinutos}m ok · ≤{u.limiteTardeMinutos}m tarde
                    </TableCell>
                    <TableCell>
                      <Badge variant={u.activo ? 'default' : 'secondary'}>
                        {u.activo ? 'activo' : 'inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="space-x-2 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(`/api/asistencia/ubicaciones/${u.id}/qr-pdf`, '_blank')}
                      >
                        <FileText className="mr-1 h-3 w-3" /> QR PDF
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setForm({ ...u, direccion: u.direccion || '' })
                          setDialogOpen(true)
                        }}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => toggleActivo(u)}>
                        <Power className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {data.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                      No hay ubicaciones registradas.
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
