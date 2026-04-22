'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, MapPin, Trash2, Home, CheckCircle2, Clock, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { MiModalidadCard } from '@/components/asistencia/MiModalidadCard'

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
  aprobadoPor: { name: string | null } | null
}

const ESTADO_BADGE: Record<string, { label: string; icon: any; className: string }> = {
  pendiente: { label: 'Pendiente de aprobación', icon: Clock, className: 'bg-amber-100 text-amber-700' },
  aprobada: { label: 'Aprobada y activa', icon: CheckCircle2, className: 'bg-emerald-100 text-emerald-700' },
  rechazada: { label: 'Rechazada', icon: XCircle, className: 'bg-red-100 text-red-700' },
  reemplazada: { label: 'Reemplazada', icon: Home, className: 'bg-gray-100 text-gray-600' },
}

export default function SedeRemotaPage() {
  const [activa, setActiva] = useState<Sede | null>(null)
  const [pendiente, setPendiente] = useState<Sede | null>(null)
  const [historico, setHistorico] = useState<Sede[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    nombre: '',
    latitud: '',
    longitud: '',
    radioMetros: 100,
    observaciones: '',
  })
  const [obteniendoGps, setObteniendoGps] = useState(false)

  useEffect(() => {
    cargar()
  }, [])

  async function cargar() {
    setLoading(true)
    const r = await fetch('/api/asistencia/sede-remota')
    const d = await r.json()
    setActiva(d.activa)
    setPendiente(d.pendiente)
    setHistorico(d.historico || [])
    setLoading(false)
  }

  function usarUbicacionActual() {
    if (!navigator.geolocation) {
      toast.error('Tu navegador no soporta geolocalización')
      return
    }
    setObteniendoGps(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm(f => ({
          ...f,
          latitud: pos.coords.latitude.toFixed(6),
          longitud: pos.coords.longitude.toFixed(6),
        }))
        setObteniendoGps(false)
        toast.success(`GPS obtenido (precisión ±${Math.round(pos.coords.accuracy)}m)`)
      },
      (err) => {
        setObteniendoGps(false)
        toast.error('No se pudo obtener la ubicación: ' + err.message)
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  async function guardar() {
    if (!form.nombre || !form.latitud || !form.longitud) {
      toast.error('Completa nombre y ubicación GPS')
      return
    }
    setSaving(true)
    try {
      const r = await fetch('/api/asistencia/sede-remota', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: form.nombre,
          latitud: Number(form.latitud),
          longitud: Number(form.longitud),
          radioMetros: Number(form.radioMetros),
          observaciones: form.observaciones || null,
        }),
      })
      const json = await r.json()
      if (!r.ok) {
        toast.error(json.error || 'Error al registrar')
        return
      }
      toast.success('Sede registrada — esperando aprobación del admin')
      setForm({ nombre: '', latitud: '', longitud: '', radioMetros: 100, observaciones: '' })
      await cargar()
    } finally {
      setSaving(false)
    }
  }

  async function cancelarPendiente() {
    if (!confirm('¿Cancelar tu solicitud de sede?')) return
    const r = await fetch('/api/asistencia/sede-remota', { method: 'DELETE' })
    if (r.ok) {
      toast.success('Solicitud cancelada')
      cargar()
    }
  }

  function renderSedeCard(s: Sede, titulo: string) {
    const est = ESTADO_BADGE[s.estado]
    const Icon = est.icon
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Home className="h-4 w-4" /> {titulo}
            </CardTitle>
            <Badge className={est.className}>
              <Icon className="mr-1 h-3 w-3" /> {est.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="font-semibold">{s.nombre}</p>
          <p className="font-mono text-xs text-muted-foreground">
            {s.latitud.toFixed(6)}, {s.longitud.toFixed(6)} — radio {s.radioMetros}m
          </p>
          <a
            href={`https://www.google.com/maps?q=${s.latitud},${s.longitud}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
          >
            <MapPin className="h-3 w-3" /> Ver en mapa
          </a>
          {s.observaciones && <p className="text-xs text-muted-foreground">{s.observaciones}</p>}
          {s.motivoRechazo && (
            <p className="text-xs text-red-600">Motivo rechazo: {s.motivoRechazo}</p>
          )}
          {s.aprobadoPor && s.aprobadoEn && (
            <p className="text-xs text-muted-foreground">
              {s.estado === 'aprobada' ? 'Aprobada por' : 'Revisado por'} {s.aprobadoPor.name} el{' '}
              {new Date(s.aprobadoEn).toLocaleDateString('es-PE')}
            </p>
          )}
          {s.vigenciaDesde && (
            <p className="text-xs text-muted-foreground">
              Vigente desde {new Date(s.vigenciaDesde).toLocaleDateString('es-PE')}
              {s.vigenciaHasta && ` hasta ${new Date(s.vigenciaHasta).toLocaleDateString('es-PE')}`}
            </p>
          )}
          {s.estado === 'pendiente' && (
            <Button size="sm" variant="outline" className="mt-2" onClick={cancelarPendiente}>
              <Trash2 className="mr-1 h-3 w-3" /> Cancelar solicitud
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Mi sede remota</h1>
        <p className="text-sm text-muted-foreground">
          Registra tu ubicación de trabajo remoto. El admin debe aprobarla para que tus marcajes
          remotos se validen contra ella.
        </p>
      </div>

      <MiModalidadCard mostrarCtaSede={false} />

      <div className="space-y-4">
        {activa && renderSedeCard(activa, 'Sede activa')}
        {pendiente && renderSedeCard(pendiente, 'Sede pendiente')}

        {!pendiente && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {activa ? 'Solicitar cambio de sede' : 'Registrar mi sede remota'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Nombre de la sede *</Label>
                <Input
                  placeholder="Casa - Miraflores"
                  value={form.nombre}
                  onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                />
              </div>

              <div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={usarUbicacionActual}
                  disabled={obteniendoGps}
                  className="w-full"
                >
                  {obteniendoGps ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <MapPin className="mr-2 h-4 w-4" />
                  )}
                  Usar mi ubicación actual
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Latitud *</Label>
                  <Input
                    type="number"
                    step="0.000001"
                    value={form.latitud}
                    onChange={e => setForm(f => ({ ...f, latitud: e.target.value }))}
                    placeholder="-12.1234"
                  />
                </div>
                <div>
                  <Label className="text-xs">Longitud *</Label>
                  <Input
                    type="number"
                    step="0.000001"
                    value={form.longitud}
                    onChange={e => setForm(f => ({ ...f, longitud: e.target.value }))}
                    placeholder="-77.1234"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs">Radio permitido (metros)</Label>
                <Input
                  type="number"
                  min={20}
                  max={500}
                  value={form.radioMetros}
                  onChange={e => setForm(f => ({ ...f, radioMetros: Number(e.target.value) }))}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Recomendado: 100m. El admin puede ajustarlo al aprobar.
                </p>
              </div>

              <div>
                <Label className="text-xs">Observaciones</Label>
                <Textarea
                  rows={2}
                  value={form.observaciones}
                  onChange={e => setForm(f => ({ ...f, observaciones: e.target.value }))}
                  placeholder="Ej. edificio con departamentos, 3er piso..."
                />
              </div>

              <Button onClick={guardar} disabled={saving} className="w-full">
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {activa ? 'Solicitar cambio' : 'Registrar sede'}
              </Button>
            </CardContent>
          </Card>
        )}

        {historico.filter(s => s.estado === 'rechazada' || s.estado === 'reemplazada').length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Histórico</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {historico
                .filter(s => s.estado === 'rechazada' || s.estado === 'reemplazada')
                .map(s => {
                  const est = ESTADO_BADGE[s.estado]
                  return (
                    <div key={s.id} className="rounded border p-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{s.nombre}</span>
                        <Badge className={est.className}>{est.label}</Badge>
                      </div>
                      <p className="mt-1 font-mono text-muted-foreground">
                        {s.latitud.toFixed(4)}, {s.longitud.toFixed(4)}
                      </p>
                      {s.motivoRechazo && <p className="text-red-600">Motivo: {s.motivoRechazo}</p>}
                    </div>
                  )
                })}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
