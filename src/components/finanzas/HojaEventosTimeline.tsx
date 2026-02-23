'use client'

import {
  FileText,
  Send,
  CheckCircle,
  Banknote,
  FileCheck,
  ShieldCheck,
  Lock,
  XCircle,
  Paperclip,
  User,
} from 'lucide-react'

interface HojaEvento {
  id: string
  tipo: string
  descripcion: string
  estadoAnterior?: string | null
  estadoNuevo?: string | null
  metadata?: any
  usuarioId?: string | null
  usuario?: { id: string; name: string } | null
  creadoEn: string
}

interface HojaEventosTimelineProps {
  eventos: HojaEvento[]
}

const ICON_MAP: Record<string, { icon: typeof FileText; color: string; bg: string }> = {
  creado:        { icon: FileText,    color: 'text-blue-600',    bg: 'bg-blue-100' },
  enviado:       { icon: Send,        color: 'text-indigo-600',  bg: 'bg-indigo-100' },
  aprobado:      { icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-100' },
  depositado:    { icon: Banknote,    color: 'text-purple-600',  bg: 'bg-purple-100' },
  rendido:       { icon: FileCheck,   color: 'text-orange-600',  bg: 'bg-orange-100' },
  validado:      { icon: ShieldCheck, color: 'text-teal-600',    bg: 'bg-teal-100' },
  cerrado:       { icon: Lock,        color: 'text-green-700',   bg: 'bg-green-100' },
  rechazado:     { icon: XCircle,     color: 'text-red-600',     bg: 'bg-red-100' },
  adjunto_subido:{ icon: Paperclip,   color: 'text-gray-600',    bg: 'bg-gray-100' },
}

const formatDateTime = (date: string) => {
  const d = new Date(date)
  return d.toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }) + ' · ' + d.toLocaleTimeString('es-PE', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function HojaEventosTimeline({ eventos }: HojaEventosTimelineProps) {
  if (!eventos || eventos.length === 0) {
    return (
      <div className="text-center py-6 text-sm text-muted-foreground">
        Sin historial registrado
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-[15px] top-3 bottom-3 w-px bg-border" />

      <div className="space-y-4">
        {eventos.map((evento) => {
          const config = ICON_MAP[evento.tipo] || ICON_MAP.creado
          const Icon = config.icon

          return (
            <div key={evento.id} className="flex gap-3 relative">
              {/* Icon circle */}
              <div className={`relative z-10 flex-shrink-0 w-[31px] h-[31px] rounded-full ${config.bg} flex items-center justify-center`}>
                <Icon className={`h-4 w-4 ${config.color}`} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pt-0.5">
                <p className="text-sm font-medium leading-tight">{evento.descripcion}</p>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <span>{formatDateTime(evento.creadoEn)}</span>
                  {evento.usuario && (
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {evento.usuario.name}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
