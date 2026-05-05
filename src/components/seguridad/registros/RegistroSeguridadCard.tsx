'use client'

import Link from 'next/link'
import { Image as ImageIcon, Users } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { TIPO_REGISTRO_LABELS, type TipoRegistroSeguridad } from '@/lib/validators/registroSeguridad'

interface Props {
  registro: {
    id: string
    tipo: TipoRegistroSeguridad
    descripcion: string
    asistentes: number | null
    createdAt: string
    jornada: {
      fechaTrabajo: string
      proyecto: { codigo: string; nombre: string }
    }
    ingeniero: { name: string | null }
    fotos: Array<{ id: string; urlArchivo: string; nombreArchivo: string }>
  }
}

const TIPO_COLOR: Record<TipoRegistroSeguridad, string> = {
  charla: 'bg-blue-100 text-blue-700 border-blue-200',
  inspeccion: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  observacion: 'bg-amber-100 text-amber-700 border-amber-200',
  incidente: 'bg-red-100 text-red-700 border-red-200',
  actividad_general: 'bg-gray-100 text-gray-700 border-gray-200',
  riesgo_critico: 'bg-rose-100 text-rose-700 border-rose-200',
  medio_ambiente: 'bg-teal-100 text-teal-700 border-teal-200',
  prevencion_salud: 'bg-violet-100 text-violet-700 border-violet-200',
}

const TIPO_BORDER: Record<TipoRegistroSeguridad, string> = {
  charla: 'border-l-blue-500',
  inspeccion: 'border-l-green-500',
  observacion: 'border-l-yellow-500',
  incidente: 'border-l-red-500',
  actividad_general: 'border-l-gray-500',
  riesgo_critico: 'border-l-orange-600',
  medio_ambiente: 'border-l-emerald-600',
  prevencion_salud: 'border-l-cyan-500',
}

const formatFecha = (s: string) =>
  new Date(s).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: '2-digit' })

function isoDay(s: string): string {
  return new Date(s).toISOString().slice(0, 10)
}

export function RegistroSeguridadCard({ registro }: Props) {
  const primeraFoto = registro.fotos[0]
  const tituloTruncado =
    registro.descripcion.length > 80
      ? `${registro.descripcion.slice(0, 80)}…`
      : registro.descripcion

  const fechaTrabajo = registro.jornada.fechaTrabajo
  const mismoDia = isoDay(fechaTrabajo) === isoDay(registro.createdAt)
  const { codigo, nombre } = registro.jornada.proyecto

  return (
    <Link href={`/seguridad/registros/${registro.id}`} className="block">
      <Card
        className={cn(
          'p-3 flex gap-3 hover:shadow-md transition cursor-pointer border-l-4',
          TIPO_BORDER[registro.tipo],
        )}
      >
        <div className="h-20 w-20 shrink-0 rounded-md bg-muted overflow-hidden flex items-center justify-center">
          {primeraFoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/seguridad/registros/fotos/${primeraFoto.id}/contenido`}
              alt={primeraFoto.nombreArchivo}
              className="h-full w-full object-cover"
              loading="lazy"
              onError={(e) => { e.currentTarget.style.display = 'none' }}
            />
          ) : (
            <ImageIcon className="h-6 w-6 text-muted-foreground" />
          )}
        </div>

        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-start justify-between gap-2">
            <Badge className={cn('text-[10px] capitalize border', TIPO_COLOR[registro.tipo])}>
              {TIPO_REGISTRO_LABELS[registro.tipo]}
            </Badge>
            <div className="text-right shrink-0">
              <div className="text-[10px] text-muted-foreground">{formatFecha(fechaTrabajo)}</div>
              {!mismoDia && (
                <div className="text-[9px] text-muted-foreground/70">
                  reg. {formatFecha(registro.createdAt)}
                </div>
              )}
            </div>
          </div>

          <div className="text-xs font-medium leading-tight truncate">{tituloTruncado}</div>

          <div className="text-[11px] text-muted-foreground truncate">
            {codigo} — {nombre}
          </div>

          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>{registro.ingeniero.name ?? '—'}</span>
            <div className="flex items-center gap-2">
              {registro.asistentes != null && (
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" /> {registro.asistentes}
                </span>
              )}
              {registro.fotos.length > 0 && (
                <span className="flex items-center gap-1">
                  <ImageIcon className="h-3 w-3" /> {registro.fotos.length}
                </span>
              )}
            </div>
          </div>
        </div>
      </Card>
    </Link>
  )
}
