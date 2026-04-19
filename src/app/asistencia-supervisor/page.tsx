'use client'

import { useEffect, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { Loader2, MapPin, Play, StopCircle, Users, Wifi } from 'lucide-react'
import QRCode from 'qrcode'
import { useGeolocation } from '@/lib/hooks/useGeolocation'
import { formatearTardanza } from '@/lib/utils/formatTardanza'

interface Ubicacion {
  id: string
  nombre: string
  tipo: string
}

interface Jornada {
  id: string
  ubicacionId: string
  fecha: string
  activa: boolean
  ubicacion: Ubicacion
}

interface Asistencia {
  id: string
  userId: string
  tipo: string
  fechaHora: string
  estado: string
  minutosTarde: number
  dentroGeofence: boolean
  user: { id: string; name: string | null; email: string }
  dispositivo: { nombre: string | null; modelo: string | null; plataforma: string; aprobado: boolean }
}

export default function AsistenciaSupervisorPage() {
  const { data: session, status } = useSession()
  const geo = useGeolocation()
  const [ubicaciones, setUbicaciones] = useState<Ubicacion[]>([])
  const [ubicacionSel, setUbicacionSel] = useState('')
  const [jornada, setJornada] = useState<Jornada | null>(null)
  const [asistencias, setAsistencias] = useState<Asistencia[]>([])
  const [qrImg, setQrImg] = useState('')
  const [expiraEn, setExpiraEn] = useState<number>(0)
  const [now, setNow] = useState(Date.now())
  const [loading, setLoading] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    if (status !== 'authenticated') return
    fetch('/api/asistencia/ubicaciones')
      .then(r => r.json())
      .then((u: Ubicacion[]) => setUbicaciones(u.filter((x: any) => x.activo !== false)))

    fetch('/api/asistencia/jornada/activa')
      .then(r => r.json())
      .then((j: Jornada | null) => {
        if (j) {
          setJornada(j)
          setUbicacionSel(j.ubicacionId)
        }
      })
  }, [status])

  // Poll token cada 10s y live cada 5s
  useEffect(() => {
    if (!jornada) return
    let cancel = false

    async function cargarToken() {
      if (!jornada) return
      const r = await fetch(`/api/asistencia/jornada/${jornada.id}/token`)
      if (!r.ok) return
      const { payload, expiraEn } = await r.json()
      const dataUrl = await QRCode.toDataURL(payload, { width: 400, margin: 2 })
      if (!cancel) {
        setQrImg(dataUrl)
        setExpiraEn(expiraEn)
      }
    }

    async function cargarLive() {
      if (!jornada) return
      const r = await fetch(`/api/asistencia/jornada/${jornada.id}/en-vivo`)
      if (!r.ok) return
      const data = await r.json()
      if (!cancel) setAsistencias(data.asistencias || [])
    }

    cargarToken()
    cargarLive()
    const tTok = setInterval(cargarToken, 10000)
    const tLive = setInterval(cargarLive, 5000)
    const tNow = setInterval(() => setNow(Date.now()), 1000)
    return () => {
      cancel = true
      clearInterval(tTok)
      clearInterval(tLive)
      clearInterval(tNow)
    }
  }, [jornada])

  async function iniciarJornada() {
    if (!ubicacionSel) {
      toast.error('Selecciona una ubicación')
      return
    }
    const coords = geo.coords || (await geo.solicitar())
    if (!coords) {
      toast.error('Se requiere GPS para iniciar la jornada')
      return
    }
    setLoading(true)
    try {
      const r = await fetch('/api/asistencia/jornada/iniciar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ubicacionId: ubicacionSel,
          latitud: coords.latitud,
          longitud: coords.longitud,
        }),
      })
      const j = await r.json()
      if (!r.ok) {
        toast.error(j.message || 'Error al iniciar')
        return
      }
      const jornadaRes = await fetch('/api/asistencia/jornada/activa').then(rr => rr.json())
      setJornada(jornadaRes)
      toast.success('Jornada activa. Comparte el QR con tu equipo.')
    } finally {
      setLoading(false)
    }
  }

  async function cerrarJornada() {
    if (!jornada) return
    if (!confirm('¿Cerrar jornada de asistencia? Los trabajadores ya no podrán marcar con este QR.')) return
    setLoading(true)
    try {
      await fetch(`/api/asistencia/jornada/${jornada.id}/cerrar`, { method: 'POST' })
      setJornada(null)
      setQrImg('')
      setAsistencias([])
      toast.success('Jornada cerrada')
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const segundosRestantes = Math.max(0, Math.floor((expiraEn - now) / 1000))

  return (
    <div className="container mx-auto max-w-4xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Supervisor - Jornada de Asistencia</h1>
        <p className="text-sm text-muted-foreground">
          Activa el QR del día para que tu equipo pueda marcar en esta ubicación
        </p>
      </div>

      {!jornada && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="h-5 w-5" /> Iniciar jornada
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium">Ubicación</label>
              <Select value={ubicacionSel} onValueChange={setUbicacionSel}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona oficina o planta" />
                </SelectTrigger>
                <SelectContent>
                  {ubicaciones.map(u => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.nombre} ({u.tipo})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">
              <MapPin className="mr-1 inline h-3 w-3" />
              {geo.coords
                ? `GPS listo (±${Math.round(geo.coords.precision)}m)`
                : 'Se solicitará GPS al iniciar'}
            </p>
            <Button
              className="w-full"
              size="lg"
              disabled={loading || !ubicacionSel}
              onClick={iniciarJornada}
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-2 h-4 w-4" />
              )}
              Iniciar Jornada
            </Button>
          </CardContent>
        </Card>
      )}

      {jornada && (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wifi className="h-5 w-5 text-emerald-600" />
                {jornada.ubicacion.nombre}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Rota en {segundosRestantes}s
              </p>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              {qrImg ? (
                <img src={qrImg} alt="QR" className="w-full max-w-xs" />
              ) : (
                <div className="flex h-64 w-full items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              )}
              <Button
                variant="destructive"
                className="mt-4 w-full"
                onClick={cerrarJornada}
                disabled={loading}
              >
                <StopCircle className="mr-2 h-4 w-4" />
                Cerrar jornada
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" /> Marcajes en tiempo real
              </CardTitle>
            </CardHeader>
            <CardContent>
              {asistencias.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Aún nadie ha marcado. Comparte el QR con tu equipo.
                </p>
              ) : (
                <ul className="space-y-2">
                  {asistencias.map(a => (
                    <li
                      key={a.id}
                      className="flex items-center justify-between rounded-md border p-2"
                    >
                      <div>
                        <p className="text-sm font-medium">{a.user.name || a.user.email}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(a.fechaHora).toLocaleTimeString('es-PE')} — {a.tipo}
                          {a.dispositivo && (
                            <> · {a.dispositivo.modelo || a.dispositivo.plataforma}</>
                          )}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge
                          variant="outline"
                          className={
                            a.estado === 'a_tiempo'
                              ? 'bg-emerald-100 text-emerald-700'
                              : a.estado === 'tarde'
                              ? 'bg-amber-100 text-amber-700'
                              : a.estado === 'muy_tarde'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-orange-100 text-orange-700'
                          }
                        >
                          {a.estado.replace('_', ' ')}
                        </Badge>
                        {a.minutosTarde > 0 && (
                          <span className="text-xs text-red-600">+{formatearTardanza(a.minutosTarde)}</span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
