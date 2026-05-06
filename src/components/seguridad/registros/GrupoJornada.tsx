'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Calendar, ChevronDown, HardHat, Image as ImageIcon, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { TIPO_REGISTRO_LABELS, type TipoRegistroSeguridad } from '@/lib/validators/registroSeguridad'

interface Jornada {
  id: string
  fechaTrabajo: string
  proyecto: { id: string; codigo: string; nombre: string }
  supervisor: { id: string; name: string | null }
}

export interface RegistroFila {
  id: string
  tipo: TipoRegistroSeguridad
  descripcion: string
  asistentes: number | null
  fotos: Array<{ id: string; nombreArchivo: string }>
}

interface Props {
  jornada: Jornada
  registros: RegistroFila[]
  defaultOpen?: boolean
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
  actividad_general: 'border-l-gray-400',
  riesgo_critico: 'border-l-orange-600',
  medio_ambiente: 'border-l-emerald-600',
  prevencion_salud: 'border-l-cyan-500',
}

const formatFecha = (s: string) =>
  new Date(s).toLocaleDateString('es-PE', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  })

export function GrupoJornada({ jornada, registros, defaultOpen = true }: Props) {
  const [open, setOpen] = useState(defaultOpen)

  const { codigo, nombre } = jornada.proyecto

  // Conteo por tipo para el resumen del header
  const tipoCount = registros.reduce(
    (acc, r) => ({ ...acc, [r.tipo]: (acc[r.tipo] ?? 0) + 1 }),
    {} as Partial<Record<TipoRegistroSeguridad, number>>,
  )

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
      {/* ── Header del grupo ──────────────────────────────── */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full text-left bg-gray-50 hover:bg-gray-100 transition-colors px-4 py-3"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2 min-w-0">
            <HardHat className="h-4 w-4 text-orange-600 shrink-0 mt-0.5" />
            <div className="min-w-0 space-y-1">
              {/* Proyecto */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold leading-tight">{nombre}</span>
                <span className="text-[10px] font-mono text-muted-foreground bg-gray-200 px-1.5 py-0.5 rounded shrink-0">
                  {codigo}
                </span>
              </div>
              {/* Fecha + supervisor + resumen tipos */}
              <div className="flex items-center gap-3 flex-wrap">
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {formatFecha(jornada.fechaTrabajo)}
                </span>
                {jornada.supervisor.name && (
                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Users className="h-3 w-3" />
                    {jornada.supervisor.name}
                  </span>
                )}
                <div className="flex gap-1 flex-wrap">
                  {(Object.entries(tipoCount) as [TipoRegistroSeguridad, number][]).map(
                    ([tipo, count]) => (
                      <span
                        key={tipo}
                        className={cn(
                          'text-[9px] px-1.5 py-0.5 rounded border font-medium',
                          TIPO_COLOR[tipo],
                        )}
                      >
                        {TIPO_REGISTRO_LABELS[tipo]}
                        {count > 1 && ` ×${count}`}
                      </span>
                    ),
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 pt-0.5">
            <span className="text-[11px] text-muted-foreground whitespace-nowrap">
              {registros.length} reg.
            </span>
            <ChevronDown
              className={cn(
                'h-4 w-4 text-muted-foreground transition-transform duration-200',
                open && 'rotate-180',
              )}
            />
          </div>
        </div>
      </button>

      {/* ── Filas de registros ────────────────────────────── */}
      {open && (
        <div className="divide-y divide-gray-100">
          {registros.map((r) => (
            <Link
              key={r.id}
              href={`/seguridad/registros/${r.id}`}
              className={cn(
                'flex items-center gap-3 px-4 py-2.5 bg-white hover:bg-orange-50/40 transition-colors border-l-4',
                TIPO_BORDER[r.tipo],
              )}
            >
              {/* Thumbnail pequeño */}
              <div className="h-10 w-10 shrink-0 rounded bg-muted overflow-hidden flex items-center justify-center">
                {r.fotos[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`/api/seguridad/registros/fotos/${r.fotos[0].id}/contenido`}
                    alt={r.fotos[0].nombreArchivo}
                    className="h-full w-full object-cover"
                    loading="lazy"
                    onError={(e) => { e.currentTarget.style.display = 'none' }}
                  />
                ) : (
                  <ImageIcon className="h-4 w-4 text-muted-foreground" />
                )}
              </div>

              {/* Tipo + descripción */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <Badge
                    className={cn('text-[9px] capitalize border shrink-0', TIPO_COLOR[r.tipo])}
                  >
                    {TIPO_REGISTRO_LABELS[r.tipo]}
                  </Badge>
                  <span className="text-xs text-gray-700 truncate">{r.descripcion}</span>
                </div>
                {r.asistentes != null && (
                  <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                    <Users className="h-3 w-3" /> {r.asistentes} asistentes
                  </p>
                )}
              </div>

              {/* Conteo fotos */}
              {r.fotos.length > 0 && (
                <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground shrink-0">
                  <ImageIcon className="h-3 w-3" /> {r.fotos.length}
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
