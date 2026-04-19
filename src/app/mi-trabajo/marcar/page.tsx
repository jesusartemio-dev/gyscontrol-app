'use client'

import { useEffect, useRef, useState } from 'react'
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
} from 'lucide-react'
import { getDeviceInfo } from '@/lib/utils/deviceFingerprint'
import { useGeolocation } from '@/lib/hooks/useGeolocation'
import { useQrScanner } from '@/lib/hooks/useQrScanner'
import type { TipoMarcaje } from '@prisma/client'

type TipoBotón = TipoMarcaje

const TIPOS: Array<{ value: TipoBotón; label: string; icon: any; color: string }> = [
  { value: 'ingreso', label: 'Ingreso', icon: LogIn, color: 'bg-emerald-600 hover:bg-emerald-700' },
  { value: 'salida', label: 'Salida', icon: LogOut, color: 'bg-blue-600 hover:bg-blue-700' },
]

interface ModoHoy {
  esRemoto: boolean
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
  }, [])

  async function enviarMarcaje(tipo: TipoBotón, qrPayload?: string) {
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
        }),
      })
      const json = await res.json()
      if (!res.ok) {
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

  async function onClickTipo(tipo: TipoBotón) {
    setTipoSel(tipo)
    // En modo remoto no pedimos GPS ni QR
    if (modoHoy?.esRemoto) {
      await enviarMarcaje(tipo)
      return
    }
    const c = geo.coords || (await geo.solicitar())
    if (!c) {
      toast.error('Se requiere permiso de ubicación')
      return
    }
    setScannerOpen(true)
    setTimeout(() => iniciar(scannerElemId), 100)
  }

  async function marcarSinQr() {
    if (!tipoSel) return
    await enviarMarcaje(tipoSel)
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

      {modoHoy?.esRemoto && (
        <Card className="mb-6 border-2 border-purple-400 bg-purple-50">
          <CardContent className="flex items-start gap-3 py-4">
            <Home className="h-6 w-6 shrink-0 text-purple-600" />
            <div className="text-sm">
              <p className="text-base font-bold text-purple-900">
                Hoy estás en modalidad remota
              </p>
              <p className="mt-1 text-purple-800">
                {modoHoy.razon || 'Trabajo desde casa autorizado'} — marca sin QR ni ubicación.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {ultimoResultado && (
        <Card
          className={`mb-6 border-2 ${
            ultimoResultado.ok ? 'border-emerald-500 bg-emerald-50' : 'border-red-500 bg-red-50'
          }`}
        >
          <CardContent className="flex items-start gap-3 py-4">
            {ultimoResultado.ok ? (
              <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-600" />
            ) : (
              <AlertTriangle className="h-6 w-6 shrink-0 text-red-600" />
            )}
            <div className="flex-1 text-sm">
              <p className="text-base font-bold">
                {ultimoResultado.titulo ||
                  (ultimoResultado.ok ? '✅ Marcaje guardado' : '❌ No se pudo marcar')}
              </p>
              {ultimoResultado.ok && ultimoResultado.lineas?.length ? (
                <ul className="mt-2 space-y-1">
                  {ultimoResultado.lineas.map((l, i) => (
                    <li key={i}>{l}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 whitespace-pre-line">{ultimoResultado.mensaje}</p>
              )}
              {ultimoResultado.estado && (
                <Badge className="mt-3" variant="outline">
                  Estado: {ultimoResultado.estado.replace('_', ' ')}
                </Badge>
              )}
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
              return (
                <Button
                  key={t.value}
                  className={`h-16 w-full text-base ${t.color}`}
                  disabled={loading}
                  onClick={() => onClickTipo(t.value)}
                >
                  <Icon className="mr-2 h-5 w-5" />
                  {t.label}
                </Button>
              )
            })}
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
    </div>
  )
}
