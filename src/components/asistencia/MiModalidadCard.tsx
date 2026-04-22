'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Loader2,
  Briefcase,
  Home,
  Building2,
  CalendarRange,
  ShieldCheck,
  AlertTriangle,
  MapPin,
  CheckCircle2,
} from 'lucide-react'

type Modalidad = 'presencial' | 'remoto' | 'hibrido' | 'confianza'
type Dia = 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes' | 'sabado' | 'domingo'

interface ModoHoy {
  esRemoto: boolean
  esConfianza?: boolean
  origen?: 'solicitud' | 'modalidad_fija' | 'modalidad_hibrida'
  razon?: string
}

interface MiModalidad {
  tieneFicha: boolean
  modalidadTrabajo: Modalidad | null
  diasRemoto: Dia[]
  sedeRemotaAprobada: { id: string; nombre: string } | null
  modoHoy: ModoHoy
}

const DIAS_LABEL: Record<Dia, string> = {
  lunes: 'Lun',
  martes: 'Mar',
  miercoles: 'Mié',
  jueves: 'Jue',
  viernes: 'Vie',
  sabado: 'Sáb',
  domingo: 'Dom',
}
const DIAS_LABORABLES: Dia[] = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes']

const MODALIDAD_BADGE: Record<Modalidad, { label: string; icon: any; className: string }> = {
  presencial: { label: 'Presencial', icon: Building2, className: 'bg-blue-100 text-blue-700 border-blue-200' },
  remoto: { label: '100% Remoto', icon: Home, className: 'bg-purple-100 text-purple-700 border-purple-200' },
  hibrido: { label: 'Híbrido', icon: CalendarRange, className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  confianza: { label: 'Personal de Confianza', icon: ShieldCheck, className: 'bg-slate-100 text-slate-700 border-slate-300' },
}

interface Props {
  /** Si false, oculta el CTA de "registrar sede remota" (útil cuando ya estás en /sede-remota). */
  mostrarCtaSede?: boolean
}

export function MiModalidadCard({ mostrarCtaSede = true }: Props) {
  const [data, setData] = useState<MiModalidad | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/asistencia/mi-modalidad')
      .then(r => r.json())
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <Card className="mb-6">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (!data) return null

  if (!data.tieneFicha || !data.modalidadTrabajo) {
    return (
      <Card className="mb-6 border-dashed">
        <CardContent className="flex items-start gap-3 py-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div className="text-sm">
            <p className="font-medium">No tienes ficha de empleado configurada</p>
            <p className="text-muted-foreground">
              Pide a Recursos Humanos que registre tu modalidad de trabajo (presencial, remoto, híbrido)
              para que aparezca aquí.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const modalidad = data.modalidadTrabajo
  const badge = MODALIDAD_BADGE[modalidad]
  const ModalidadIcon = badge.icon
  const diasRemoto = data.diasRemoto
  const diasPresencial = DIAS_LABORABLES.filter(d => !diasRemoto.includes(d))

  // CTA de sede remota: solo aplica si es remoto/híbrido y aún no la tiene aprobada
  const necesitaSedeRemota =
    mostrarCtaSede && (modalidad === 'remoto' || modalidad === 'hibrido') && !data.sedeRemotaAprobada

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Briefcase className="h-4 w-4" />
          Mi modalidad de trabajo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className={`gap-1 ${badge.className}`}>
            <ModalidadIcon className="h-3.5 w-3.5" />
            {badge.label}
          </Badge>
          {modalidad === 'confianza' && (
            <span className="text-xs text-muted-foreground">
              Marcas sin QR ni geolocalización
            </span>
          )}
        </div>

        {modalidad === 'hibrido' && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">Días remoto</p>
              <div className="flex flex-wrap gap-1">
                {diasRemoto.length === 0 ? (
                  <span className="text-xs text-muted-foreground">Ninguno configurado</span>
                ) : (
                  diasRemoto.map(d => (
                    <Badge key={d} variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                      {DIAS_LABEL[d]}
                    </Badge>
                  ))
                )}
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">Días en sede</p>
              <div className="flex flex-wrap gap-1">
                {diasPresencial.map(d => (
                  <Badge key={d} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    {DIAS_LABEL[d]}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        )}

        <div
          className={`flex items-start gap-2 rounded-md border p-3 text-sm ${
            data.modoHoy.esConfianza
              ? 'border-slate-300 bg-slate-50'
              : data.modoHoy.esRemoto
              ? 'border-purple-200 bg-purple-50'
              : 'border-blue-200 bg-blue-50'
          }`}
        >
          {data.modoHoy.esRemoto ? (
            <Home className="mt-0.5 h-4 w-4 shrink-0 text-purple-600" />
          ) : (
            <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
          )}
          <div>
            <p className="font-medium">
              Hoy te toca: {data.modoHoy.esRemoto ? 'Trabajo remoto' : 'Presencial en sede'}
            </p>
            {data.modoHoy.razon && (
              <p className="text-xs text-muted-foreground">{data.modoHoy.razon}</p>
            )}
          </div>
        </div>

        {necesitaSedeRemota && (
          <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <div className="flex-1">
              <p className="font-medium text-amber-900">Aún no tienes sede remota aprobada</p>
              <p className="mb-2 text-xs text-amber-800">
                Tus marcajes remotos necesitan validarse contra una ubicación aprobada por el admin.
              </p>
              <Link href="/mi-trabajo/sede-remota">
                <Button size="sm" variant="outline" className="bg-white">
                  <MapPin className="mr-1 h-3 w-3" />
                  Registrar mi sede remota
                </Button>
              </Link>
            </div>
          </div>
        )}

        {mostrarCtaSede && (modalidad === 'remoto' || modalidad === 'hibrido') && data.sedeRemotaAprobada && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            Sede remota aprobada: <span className="font-medium">{data.sedeRemotaAprobada.nombre}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
