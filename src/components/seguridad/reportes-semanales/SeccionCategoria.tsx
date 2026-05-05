'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronRight, ImageIcon, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { RegistroSeguridadDetalle } from '@/lib/services/registroSeguridad'
import { TIPO_REGISTRO_LABELS, type TipoRegistroSeguridad } from '@/lib/validators/registroSeguridad'

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

interface Props {
  tipo: TipoRegistroSeguridad
  registros: RegistroSeguridadDetalle[]
  /** Si se pasan, muestra botón "+ Agregar" que pre-llena el formulario de nuevo registro */
  agregarContext?: { proyectoId: string; semanaIso: string; reporteId: string }
}

export function SeccionCategoria({ tipo, registros, agregarContext }: Props) {
  const [open, setOpen] = useState(true)

  const fotos = registros.flatMap((r) => r.fotos)
  const label = TIPO_REGISTRO_LABELS[tipo]

  const agregarHref = agregarContext
    ? `/seguridad/registros/nuevo?tipo=${tipo}&proyectoId=${agregarContext.proyectoId}&semanaIso=${agregarContext.semanaIso}&reporteId=${agregarContext.reporteId}`
    : null

  return (
    <Card>
      <CardHeader className="py-3 px-4 select-none">
        <CardTitle className="flex items-center gap-2 text-sm">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="flex items-center gap-2 flex-1 text-left"
          >
            {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            <Badge className={cn('text-[10px] capitalize border', TIPO_COLOR[tipo])}>{label}</Badge>
            <span className="ml-1 text-muted-foreground font-normal">{registros.length} registro{registros.length !== 1 ? 's' : ''}</span>
          </button>
          {fotos.length > 0 && (
            <span className="flex items-center gap-0.5 text-muted-foreground font-normal">
              <ImageIcon className="h-3 w-3" /> {fotos.length}
            </span>
          )}
          {agregarHref && (
            <Link href={agregarHref}>
              <Button type="button" size="sm" variant="ghost" className="h-7 text-xs">
                <Plus className="h-3 w-3 mr-1" /> Agregar
              </Button>
            </Link>
          )}
        </CardTitle>
      </CardHeader>

      {open && (
        <CardContent className="px-4 pb-4 space-y-3">
          {registros.length === 0 && (
            <div className="text-xs text-muted-foreground italic py-2">
              Sin registros de este tipo en la semana.
            </div>
          )}
          {registros.map((r) => (
            <div key={r.id} className="border rounded-md p-3 space-y-2">
              <p className="text-sm whitespace-pre-wrap">{r.descripcion}</p>
              {r.observaciones && (
                <p className="text-xs text-muted-foreground italic whitespace-pre-wrap">{r.observaciones}</p>
              )}
              {r.tipo === 'charla' && r.asistentes != null && (
                <p className="text-xs text-muted-foreground">Asistentes: <strong>{r.asistentes}</strong></p>
              )}
              {r.fotos.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                  {r.fotos.map((f) => (
                    <a
                      key={f.id}
                      href={`/api/seguridad/registros/fotos/${f.id}/contenido`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block aspect-square rounded overflow-hidden border bg-muted hover:opacity-80 transition"
                      title={f.nombreArchivo}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/api/seguridad/registros/fotos/${f.id}/contenido`}
                        alt={f.nombreArchivo}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={(e) => { e.currentTarget.style.display = 'none' }}
                      />
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </CardContent>
      )}
    </Card>
  )
}
