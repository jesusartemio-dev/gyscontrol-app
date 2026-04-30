'use client'

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  MapPin,
  QrCode,
  LogIn,
  LogOut,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Camera,
  X,
  Home,
  Briefcase,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

// Leaflet usa window/document en su inicialización. Lo cargamos client-side
// para evitar SSR errors y para que su bundle no pese en el primer render.
const MapaSedesCercanas = dynamic(
  () => import('@/components/asistencia/MapaSedesCercanas'),
  { ssr: false, loading: () => <div className="h-[280px] w-full animate-pulse rounded-md bg-muted" /> },
)
import { getDeviceInfo } from '@/lib/utils/deviceFingerprint'
import { useGeolocation } from '@/lib/hooks/useGeolocation'
import { useQrScanner } from '@/lib/hooks/useQrScanner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { TipoMarcaje } from '@prisma/client'

type TipoBotón = TipoMarcaje

const TIPOS: Array<{ value: TipoBotón; label: string; icon: any; color: string }> = [
  { value: 'ingreso', label: 'Ingreso', icon: LogIn, color: 'bg-emerald-600 hover:bg-emerald-700' },
  { value: 'salida', label: 'Salida', icon: LogOut, color: 'bg-blue-600 hover:bg-blue-700' },
]

interface ModoHoy {
  esRemoto: boolean
  esConfianza?: boolean
  origen?: 'solicitud' | 'modalidad_fija' | 'modalidad_hibrida'
  razon?: string
}

export default function MarcarPage() {
  const { status } = useSession()
  const geo = useGeolocation()
  const [tipoSel, setTipoSel] = useState<TipoBotón | null>(null)
  const [scannerOpen, setScannerOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [modoHoy, setModoHoy] = useState<ModoHoy | null>(null)
  const [permisoGps, setPermisoGps] = useState<'prompt' | 'granted' | 'denied' | 'unknown'>('unknown')
  const [dialogGpsBloqueado, setDialogGpsBloqueado] = useState(false)
  const [cercanas, setCercanas] = useState<null | {
    sedeEnZona: { id: string; nombre: string; tipo: string; latitud: number; longitud: number; distanciaMetros: number; radioMetros: number } | null
    sedesCercanas: Array<{ id: string; nombre: string; tipo: string; latitud: number; longitud: number; distanciaMetros: number; radioMetros: number; dentro: boolean }>
    sedeRemota: { id: string; nombre: string; latitud: number; longitud: number; distanciaMetros: number; radioMetros: number; dentro: boolean } | null
  }>(null)
  const [cargandoCercanas, setCargandoCercanas] = useState(false)
  const [dialogVisitaExterna, setDialogVisitaExterna] = useState(false)
  const [visitaTipo, setVisitaTipo] = useState<TipoBotón>('ingreso')
  const [visitaLugar, setVisitaLugar] = useState('')
  const [dialogContinuidad, setDialogContinuidad] = useState<null | {
    tipo: TipoBotón
    sedeAnterior: { id: string; nombre: string; tipo: string; radioMetros: number; distanciaAhora: number }
    ultimoMarcajeMinutos: number
  }>(null)
  const [ultimoResultado, setUltimoResultado] = useState<null | {
    ok: boolean
    titulo?: string
    lineas?: string[]
    mensaje: string
    estado?: string
  }>(null)
  const scannerElemId = 'qr-scanner-target'
  const deviceRef = useRef<Awaited<ReturnType<typeof getDeviceInfo>> | null>(null)

  const { scanning, error: scanError, iniciar, detener } = useQrScanner(async qrPayload => {
    await detener()
    setScannerOpen(false)
    if (tipoSel) await enviarMarcaje(tipoSel, qrPayload)
  })

  useEffect(() => {
    getDeviceInfo().then(d => {
      deviceRef.current = d
    })
    fetch('/api/asistencia/modo-hoy')
      .then(r => r.json())
      .then(setModoHoy)
      .catch(() => setModoHoy({ esRemoto: false }))

    // Consultar el estado del permiso de geolocalización para detectar de antemano
    // si el navegador lo tiene bloqueado y poder mostrar instrucciones de recuperación.
    if (typeof navigator !== 'undefined' && navigator.permissions?.query) {
      navigator.permissions
        .query({ name: 'geolocation' as PermissionName })
        .then(p => {
          setPermisoGps(p.state)
          p.onchange = () => setPermisoGps(p.state)
        })
        .catch(() => setPermisoGps('unknown'))
    }
  }, [])

  // Cargar sedes cercanas cuando obtenemos GPS. Para confianza también — el mapa es
  // informativo (puede marcar igual estando fuera) pero sirve para ubicarse en zona.
  useEffect(() => {
    if (!geo.coords) return
    setCargandoCercanas(true)
    fetch(`/api/asistencia/ubicaciones/cercanas?lat=${geo.coords.latitud}&lon=${geo.coords.longitud}`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => setCercanas(d))
      .catch(() => setCercanas(null))
      .finally(() => setCargandoCercanas(false))
  }, [geo.coords])

  // Pre-solicitar GPS al cargar para que aparezca el mapa de sedes sin que el usuario
  // tenga que tocar "Marcar" primero. Aplica a todos (incluido confianza, donde el
  // mapa es informativo). Si el permiso esta denegado no insistimos.
  useEffect(() => {
    if (permisoGps === 'denied') return
    if (geo.coords) return
    geo.solicitar()
  }, [permisoGps, geo.coords, geo.solicitar])

  async function enviarMarcaje(
    tipo: TipoBotón,
    qrPayload?: string,
    visitaExterna?: { lugar: string },
    extras?: { confirmarContinuidad?: { ubicacionId: string }; ignorarContinuidad?: boolean },
  ) {
    if (!deviceRef.current) deviceRef.current = await getDeviceInfo()
    setLoading(true)
    setUltimoResultado(null)
    try {
      const res = await fetch('/api/asistencia/marcar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo,
          qrPayload,
          latitud: geo.coords?.latitud,
          longitud: geo.coords?.longitud,
          precisionGps: geo.coords?.precision,
          device: deviceRef.current,
          visitaExterna,
          confirmarContinuidad: extras?.confirmarContinuidad,
          ignorarContinuidad: extras?.ignorarContinuidad,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        // GPS alejado de la sede del último marcaje del día — pedir confirmación al usuario.
        if (res.status === 409 && json.codigo === 'continuidad_sugerida') {
          setDialogContinuidad({
            tipo,
            sedeAnterior: json.sedeAnterior,
            ultimoMarcajeMinutos: json.ultimoMarcajeMinutos,
          })
          return
        }
        // Si el server detecta que está fuera de toda sede, abrimos el flujo de visita externa.
        if (res.status === 409 && json.codigo === 'fuera_de_toda_sede') {
          setVisitaTipo(tipo)
          setVisitaLugar('')
          setDialogVisitaExterna(true)
          return
        }
        setUltimoResultado({ ok: false, mensaje: json.message || 'Error al marcar' })
        toast.error(json.message || 'Error al marcar')
      } else {
        setUltimoResultado({
          ok: true,
          titulo: json.titulo,
          lineas: json.lineas,
          mensaje: json.mensaje,
          estado: json.asistencia.estado,
        })
        toast.success(`Marcaje guardado a las ${json.hora}`)
      }
    } catch (e) {
      toast.error('Error de red')
    } finally {
      setLoading(false)
    }
  }

  async function confirmarContinuidad() {
    if (!dialogContinuidad) return
    const { tipo, sedeAnterior } = dialogContinuidad
    setDialogContinuidad(null)
    await enviarMarcaje(tipo, undefined, undefined, {
      confirmarContinuidad: { ubicacionId: sedeAnterior.id },
    })
  }

  async function continuarComoSalida() {
    if (!dialogContinuidad) return
    const { tipo } = dialogContinuidad
    setDialogContinuidad(null)
    // Re-enviar ignorando la continuidad: el server seguirá su flujo normal —
    // si tiene modalidad remota validará contra sede remota personal,
    // si no, devolverá 409 fuera_de_toda_sede y abrirá el modal de visita externa.
    await enviarMarcaje(tipo, undefined, undefined, { ignorarContinuidad: true })
  }

  async function abrirDialogVisitaExterna(tipo: TipoBotón) {
    setTipoSel(tipo)
    if (permisoGps === 'denied') {
      setDialogGpsBloqueado(true)
      return
    }
    const c = geo.coords || (await geo.solicitar())
    if (!c) {
      setDialogGpsBloqueado(true)
      return
    }
    setVisitaTipo(tipo)
    setVisitaLugar('')
    setDialogVisitaExterna(true)
  }

  async function confirmarVisitaExterna() {
    const lugar = visitaLugar.trim()
    if (lugar.length < 5) {
      toast.error('Describe el lugar (mínimo 5 caracteres)')
      return
    }
    setDialogVisitaExterna(false)
    await enviarMarcaje(visitaTipo, undefined, { lugar })
  }

  async function onClickTipo(tipo: TipoBotón) {
    setTipoSel(tipo)
    // Personal de confianza: marcaje voluntario sin GPS ni QR
    if (modoHoy?.esConfianza) {
      await enviarMarcaje(tipo)
      return
    }
    // Modo remoto declarado: marca sin GPS ni QR (validación remota se hace server-side)
    if (modoHoy?.esRemoto) {
      await enviarMarcaje(tipo)
      return
    }
    // Presencial: si el navegador tiene GPS bloqueado, no tiene sentido intentar.
    if (permisoGps === 'denied') {
      setDialogGpsBloqueado(true)
      return
    }
    const c = geo.coords || (await geo.solicitar())
    if (!c) {
      // Si después de pedirlo no hay coords, casi siempre es porque lo bloqueó el navegador.
      setDialogGpsBloqueado(true)
      return
    }
    // Si ya sabemos por las sedes cercanas que NO está en ninguna sede ni en su sede remota
    // aprobada, el scanner QR no aplica — saltamos directo al flujo de visita externa para
    // no obligar al usuario a abrir una cámara que no usará.
    if (cercanas && !cercanas.sedeEnZona && !cercanas.sedeRemota?.dentro) {
      setVisitaTipo(tipo)
      setVisitaLugar('')
      setDialogVisitaExterna(true)
      return
    }
    setScannerOpen(true)
    setTimeout(() => iniciar(scannerElemId), 100)
  }

  async function marcarSinQr() {
    if (!tipoSel) return
    await enviarMarcaje(tipoSel)
  }

  // Para remotos que van a oficina: abrir el scanner aunque su modalidad sea remota.
  async function abrirScannerDesdeRemoto(tipo: TipoBotón) {
    setTipoSel(tipo)
    if (permisoGps === 'denied') {
      setDialogGpsBloqueado(true)
      return
    }
    const c = geo.coords || (await geo.solicitar())
    if (!c) {
      setDialogGpsBloqueado(true)
      return
    }
    setScannerOpen(true)
    setTimeout(() => iniciar(scannerElemId), 100)
  }

  if (status === 'loading') {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Marcar Asistencia</h1>
        <p className="text-sm text-muted-foreground">
          Control administrativo de ingreso y salida
        </p>
      </div>

      {modoHoy?.esConfianza && (
        <div className="mb-3 flex items-center gap-2 rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-700">
          <Home className="h-4 w-4 shrink-0 text-slate-600" />
          <span>
            <strong className="text-slate-900">Personal de confianza:</strong>{' '}
            marcaje voluntario, sin QR ni GPS.
          </span>
        </div>
      )}

      {modoHoy?.esRemoto && !modoHoy?.esConfianza && (
        <div className="mb-3 flex items-center gap-2 rounded-md border border-purple-300 bg-purple-50 px-3 py-2 text-xs text-purple-800">
          <Home className="h-4 w-4 shrink-0 text-purple-600" />
          <span>
            <strong className="text-purple-900">Modalidad remota hoy:</strong>{' '}
            {modoHoy.razon || 'autorizado'}.
          </span>
        </div>
      )}

      {ultimoResultado && (
        <div
          className={`mb-3 rounded-md border px-3 py-2 text-xs ${
            ultimoResultado.ok
              ? 'border-emerald-400 bg-emerald-50 text-emerald-900'
              : 'border-red-400 bg-red-50 text-red-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {ultimoResultado.ok ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
            )}
            <strong className="text-sm">
              {ultimoResultado.titulo ||
                (ultimoResultado.ok ? 'Marcaje guardado' : 'No se pudo marcar')}
            </strong>
            {ultimoResultado.estado && (
              <Badge className="ml-auto h-5" variant="outline">
                {ultimoResultado.estado.replace('_', ' ')}
              </Badge>
            )}
          </div>
          {ultimoResultado.ok && ultimoResultado.lineas?.length ? (
            <ul className="mt-1 ml-6 list-disc space-y-0.5">
              {ultimoResultado.lineas.map((l, i) => (
                <li key={i}>{l}</li>
              ))}
            </ul>
          ) : !ultimoResultado.ok ? (
            <p className="ml-6 mt-1 whitespace-pre-line">{ultimoResultado.mensaje}</p>
          ) : null}
        </div>
      )}

      {!scannerOpen && geo.coords && cercanas && (
        <Card className={`mb-4 border-2 ${
          cercanas.sedeEnZona
            ? 'border-emerald-400'
            : cercanas.sedeRemota?.dentro
              ? 'border-purple-400'
              : modoHoy?.esConfianza
                ? 'border-slate-300'
                : 'border-amber-400'
        }`}>
          <CardContent className="space-y-3 py-3">
            {cercanas.sedeEnZona ? (
              <div className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
                <div>
                  <p className="font-bold text-emerald-900">
                    Estás en {cercanas.sedeEnZona.nombre}
                  </p>
                  <p className="text-xs text-emerald-800">
                    A {cercanas.sedeEnZona.distanciaMetros}m del centro · radio {cercanas.sedeEnZona.radioMetros}m
                  </p>
                </div>
              </div>
            ) : cercanas.sedeRemota?.dentro ? (
              <div className="flex items-start gap-2 text-sm">
                <Home className="h-5 w-5 shrink-0 text-purple-600" />
                <div>
                  <p className="font-bold text-purple-900">
                    En tu sede remota: {cercanas.sedeRemota.nombre}
                  </p>
                  <p className="text-xs text-purple-800">
                    A {cercanas.sedeRemota.distanciaMetros}m del centro
                  </p>
                </div>
              </div>
            ) : modoHoy?.esConfianza ? (
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="h-5 w-5 shrink-0 text-slate-600" />
                <div>
                  <p className="font-bold text-slate-900">Vista informativa</p>
                  <p className="text-xs text-slate-700">
                    Puedes marcar desde donde estés. El mapa te ubica respecto a las sedes.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2 text-sm">
                <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
                <div>
                  <p className="font-bold text-amber-900">No estás en ninguna sede registrada</p>
                  <p className="text-xs text-amber-800">
                    Acércate al círculo verde para marcar presencial, o usa visita externa
                  </p>
                </div>
              </div>
            )}

            <MapaSedesCercanas
              usuarioLat={geo.coords.latitud}
              usuarioLon={geo.coords.longitud}
              precisionGps={geo.coords.precision}
              sedes={cercanas.sedesCercanas}
              sedeRemota={cercanas.sedeRemota}
              alturaPx={260}
            />

            <p className="text-center text-[10px] text-muted-foreground">
              🔵 Tu posición · 🟢 sede en zona · 🟠 sede fuera de tu radio · 🟣 sede remota personal
            </p>
          </CardContent>
        </Card>
      )}

      {!scannerOpen && cargandoCercanas && !cercanas && (
        <Card className="mb-4">
          <CardContent className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Buscando sedes cercanas...
          </CardContent>
        </Card>
      )}

      {!scannerOpen && permisoGps === 'denied' && !modoHoy?.esConfianza && !modoHoy?.esRemoto && (
        <Card className="mb-4 border-2 border-red-500 bg-red-50">
          <CardContent className="flex items-start gap-3 py-4">
            <AlertTriangle className="h-6 w-6 shrink-0 text-red-600" />
            <div className="flex-1 text-sm">
              <p className="text-base font-bold text-red-900">
                Tu navegador tiene bloqueado el GPS
              </p>
              <p className="mt-1 text-red-800">
                No puedes marcar asistencia presencial sin permiso de ubicación.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => setDialogGpsBloqueado(true)}
              >
                Ver cómo activarlo
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!scannerOpen && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              {modoHoy?.esRemoto ? (
                <>
                  <Home className="h-4 w-4" />
                  Marcaje remoto (sin GPS)
                </>
              ) : (
                <>
                  <MapPin className="h-4 w-4" />
                  {geo.coords
                    ? `GPS listo (±${Math.round(geo.coords.precision)}m)`
                    : 'Se solicitará GPS al marcar'}
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {TIPOS.map(t => {
              const Icon = t.icon
              const gpsBloqueadoYRequerido =
                permisoGps === 'denied' && !modoHoy?.esConfianza && !modoHoy?.esRemoto
              return (
                <Button
                  key={t.value}
                  className={`h-16 w-full text-base ${t.color}`}
                  disabled={loading || gpsBloqueadoYRequerido}
                  onClick={() => onClickTipo(t.value)}
                >
                  <Icon className="mr-2 h-5 w-5" />
                  {t.label}
                </Button>
              )
            })}
            {modoHoy?.esRemoto && !modoHoy?.esConfianza && (
              <div className="rounded border border-dashed border-muted-foreground/30 p-3 text-center text-xs text-muted-foreground">
                <p className="mb-2">¿Hoy viniste a oficina en lugar de trabajar remoto?</p>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={loading}
                  onClick={() => abrirScannerDesdeRemoto('ingreso')}
                >
                  <QrCode className="mr-2 h-4 w-4" />
                  Escanear QR de oficina
                </Button>
              </div>
            )}
            {!modoHoy?.esConfianza && (
              <div className="rounded border border-dashed border-amber-300 bg-amber-50/50 p-3 text-center text-xs">
                <p className="mb-2 text-amber-900">
                  ¿Estás de visita en planta de cliente, obra externa o viaje?
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={loading || (permisoGps === 'denied' && !geo.coords)}
                  onClick={() => abrirDialogVisitaExterna('ingreso')}
                >
                  <Briefcase className="mr-2 h-4 w-4" />
                  Marcar visita externa
                </Button>
              </div>
            )}
            {geo.error && (
              <p className="pt-2 text-center text-sm text-red-600">{geo.error}</p>
            )}
          </CardContent>
        </Card>
      )}

      {scannerOpen && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2">
                <QrCode className="h-4 w-4" />
                Escanea el QR de tu {tipoSel === 'ingreso' ? 'ubicación o supervisor' : 'ubicación'}
              </span>
              <Button
                size="icon"
                variant="ghost"
                onClick={async () => {
                  await detener()
                  setScannerOpen(false)
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              id={scannerElemId}
              className="aspect-square w-full overflow-hidden rounded-lg bg-black"
            />
            {scanError && (
              <p className="mt-3 flex items-center gap-2 text-sm text-red-600">
                <Camera className="h-4 w-4" /> {scanError}
              </p>
            )}
            {!scanning && !scanError && (
              <p className="mt-3 text-center text-sm text-muted-foreground">
                Iniciando cámara...
              </p>
            )}
            <Button
              variant="outline"
              className="mt-4 w-full"
              onClick={async () => {
                await detener()
                setScannerOpen(false)
                await marcarSinQr()
              }}
              disabled={loading}
            >
              Marcar sin QR (solo GPS)
            </Button>
          </CardContent>
        </Card>
      )}

      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
        </div>
      )}

      <Dialog open={!!dialogContinuidad} onOpenChange={v => !v && setDialogContinuidad(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-amber-600" />
              ¿Sigues en {dialogContinuidad?.sedeAnterior.nombre}?
            </DialogTitle>
            <DialogDescription>
              Tu último marcaje fue presencial en{' '}
              <strong>{dialogContinuidad?.sedeAnterior.nombre}</strong> hace{' '}
              {dialogContinuidad?.ultimoMarcajeMinutos} min. Tu GPS ahora te ubica a{' '}
              {dialogContinuidad
                ? dialogContinuidad.sedeAnterior.distanciaAhora < 1000
                  ? `${dialogContinuidad.sedeAnterior.distanciaAhora}m`
                  : `${(dialogContinuidad.sedeAnterior.distanciaAhora / 1000).toFixed(2)}km`
                : ''}{' '}
              de la sede.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <p className="rounded bg-amber-50 p-3 text-amber-900">
              💡 En plantas grandes el GPS puede fluctuar (techo metálico, sombras de
              edificios). Si sigues en la planta, confirma. Si ya saliste de la planta,
              elige la otra opción.
            </p>
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              className="w-full bg-emerald-600 hover:bg-emerald-700"
              disabled={loading}
              onClick={confirmarContinuidad}
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
              Sigo en {dialogContinuidad?.sedeAnterior.nombre}
            </Button>
            <Button
              variant="outline"
              className="w-full"
              disabled={loading}
              onClick={continuarComoSalida}
            >
              Ya salí — registrar como remoto / visita externa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogVisitaExterna} onOpenChange={setDialogVisitaExterna}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Marcar visita externa
            </DialogTitle>
            <DialogDescription>
              Describe brevemente dónde estás (planta de cliente, obra, sede de proveedor, etc.).
              Se registrará tu GPS como evidencia para que tu supervisor pueda auditar la visita.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Tipo de marcaje</Label>
              <div className="mt-1 flex gap-2">
                <Button
                  size="sm"
                  variant={visitaTipo === 'ingreso' ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => setVisitaTipo('ingreso')}
                >
                  <LogIn className="mr-1 h-3 w-3" /> Ingreso
                </Button>
                <Button
                  size="sm"
                  variant={visitaTipo === 'salida' ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => setVisitaTipo('salida')}
                >
                  <LogOut className="mr-1 h-3 w-3" /> Salida
                </Button>
              </div>
            </div>
            <div>
              <Label className="text-xs">Lugar de la visita</Label>
              <Input
                autoFocus
                placeholder="Ej. Planta Antamina - Cajamarca"
                value={visitaLugar}
                onChange={e => setVisitaLugar(e.target.value)}
                maxLength={120}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {visitaLugar.trim().length} / mín. 5 caracteres
              </p>
            </div>
            {geo.coords && (
              <div className="rounded bg-muted/40 p-2 text-xs text-muted-foreground">
                <MapPin className="mr-1 inline h-3 w-3" />
                GPS capturado (±{Math.round(geo.coords.precision)}m)
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogVisitaExterna(false)}>
              Cancelar
            </Button>
            <Button
              onClick={confirmarVisitaExterna}
              disabled={loading || visitaLugar.trim().length < 5}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Registrar visita
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogGpsBloqueado} onOpenChange={setDialogGpsBloqueado}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-red-600" />
              Activa el GPS para poder marcar
            </DialogTitle>
            <DialogDescription>
              Sin permiso de ubicación no se puede validar tu asistencia presencial.
              Sigue los pasos según tu navegador:
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="rounded-md border bg-muted/40 p-3">
              <p className="font-semibold">📱 Chrome / Edge (Android y PC)</p>
              <ol className="ml-4 mt-1 list-decimal space-y-0.5 text-muted-foreground">
                <li>Toca el candado 🔒 a la izquierda de la URL</li>
                <li>Entra a "Permisos del sitio" o "Configuración del sitio"</li>
                <li>Cambia "Ubicación" a <strong>Permitir</strong></li>
                <li>Recarga la página</li>
              </ol>
            </div>
            <div className="rounded-md border bg-muted/40 p-3">
              <p className="font-semibold">🍎 Safari (iPhone)</p>
              <ol className="ml-4 mt-1 list-decimal space-y-0.5 text-muted-foreground">
                <li>Ajustes → Safari → Ubicación → <strong>Permitir</strong></li>
                <li>Ajustes → Privacidad → Localización → activado</li>
                <li>Vuelve a Safari y recarga</li>
              </ol>
            </div>
            <div className="rounded-md border bg-muted/40 p-3">
              <p className="font-semibold">🦊 Firefox</p>
              <ol className="ml-4 mt-1 list-decimal space-y-0.5 text-muted-foreground">
                <li>Toca el candado 🔒 → "Conexión segura" → "Más información"</li>
                <li>Permisos → "Acceder a tu ubicación" → quita el bloqueo</li>
                <li>Recarga la página</li>
              </ol>
            </div>
            <p className="rounded bg-amber-50 p-2 text-xs text-amber-900">
              💡 Si trabajas remoto autorizado o eres personal de confianza, no necesitas GPS para marcar.
              Si crees que tu modalidad no es la correcta, contacta a Recursos Humanos.
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => setDialogGpsBloqueado(false)}>Entendido</Button>
            <Button
              variant="outline"
              onClick={() => {
                setDialogGpsBloqueado(false)
                window.location.reload()
              }}
            >
              Recargar página
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
