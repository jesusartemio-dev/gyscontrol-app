'use client'

import { Image as ImageIcon, Gauge, Wrench } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { TIPO_REGISTRO_AVANCE_LABELS, type TipoRegistroAvance } from '@/lib/validators/registroAvance'

interface Props {
  registro: {
    id: string
    tipo: TipoRegistroAvance
    descripcion: string
    disciplina: string | null
    porcentajeAvance: number | null
    createdAt: string
    jornada: {
      fechaTrabajo: string
      proyecto: { codigo: string; nombre: string }
    }
    autor: { name: string | null }
    fotos: Array<{ id: string; urlArchivo: string; nombreArchivo: string }>
  }
}

// Mapas de color/borde por tipo definidos aquí (no hay archivo central).
const TIPO_COLOR: Record<TipoRegistroAvance, string> = {
  avance_general: 'bg-blue-100 text-blue-700 border-blue-200',
  montaje_instalacion: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  conexionado_electrico: 'bg-amber-100 text-amber-700 border-amber-200',
  instrumentacion: 'bg-violet-100 text-violet-700 border-violet-200',
  pruebas_comisionamiento: 'bg-teal-100 text-teal-700 border-teal-200',
  inspeccion_calidad: 'bg-rose-100 text-rose-700 border-rose-200',
}

const TIPO_BORDER: Record<TipoRegistroAvance, string> = {
  avance_general: 'border-l-blue-500',
  montaje_instalacion: 'border-l-emerald-500',
  conexionado_electrico: 'border-l-amber-500',
  instrumentacion: 'border-l-violet-500',
  pruebas_comisionamiento: 'border-l-teal-500',
  inspeccion_calidad: 'border-l-rose-500',
}

const formatFecha = (s: string) =>
  new Date(s).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: '2-digit' })

const formatHora = (s: string) =>
  new Date(s).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })

export function RegistroAvanceCard({ registro }: Props) {
  const primeraFoto = registro.fotos[0]
  const tituloTruncado =
    registro.descripcion.length > 80
      ? `${registro.descripcion.slice(0, 80)}…`
      : registro.descripcion

  const { codigo, nombre } = registro.jornada.proyecto

  return (
    <Card
      className={cn(
        'p-3 flex gap-3 hover:shadow-md transition border-l-4',
        TIPO_BORDER[registro.tipo],
      )}
    >
      <div className="h-20 w-20 shrink-0 rounded-md bg-muted overflow-hidden flex items-center justify-center">
        {primeraFoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/proyectos/registros-evidencia/fotos/${primeraFoto.id}/contenido`}
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
          <Badge className={cn('text-[10px] border', TIPO_COLOR[registro.tipo])}>
            {TIPO_REGISTRO_AVANCE_LABELS[registro.tipo]}
          </Badge>
          <div className="text-right shrink-0">
            <div className="text-[10px] text-muted-foreground">{formatFecha(registro.jornada.fechaTrabajo)}</div>
            <div className="text-[9px] text-muted-foreground/70">{formatHora(registro.createdAt)}</div>
          </div>
        </div>

        <div className="text-xs font-medium leading-tight truncate">{tituloTruncado}</div>

        <div className="text-[11px] text-muted-foreground truncate">
          {codigo} — {nombre}
        </div>

        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>{registro.autor.name ?? '—'}</span>
          <div className="flex items-center gap-2">
            {registro.disciplina && (
              <span className="flex items-center gap-1">
                <Wrench className="h-3 w-3" /> {registro.disciplina}
              </span>
            )}
            {registro.porcentajeAvance != null && (
              <span className="flex items-center gap-1">
                <Gauge className="h-3 w-3" /> {registro.porcentajeAvance}%
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
  )
}
