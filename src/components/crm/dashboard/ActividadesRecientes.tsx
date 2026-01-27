'use client'

import { Phone, Mail, Calendar, MessageSquare, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Actividad {
  id: string
  tipo: string
  descripcion: string
  fecha: string
  resultado?: string
  crmOportunidad?: {
    nombre: string
    cliente?: { nombre: string }
  }
  user?: { name?: string }
}

interface ActividadesRecientesProps {
  actividades: Actividad[]
}

export default function ActividadesRecientes({ actividades }: ActividadesRecientesProps) {
  const getTipoIcon = (tipo: string) => {
    const icons: Record<string, typeof Phone> = {
      llamada: Phone,
      email: Mail,
      reunion: Calendar
    }
    return icons[tipo.toLowerCase()] || MessageSquare
  }

  const formatFecha = (fecha: string) => {
    const date = new Date(fecha)
    const ahora = new Date()
    const diffMs = ahora.getTime() - date.getTime()
    const diffHoras = diffMs / (1000 * 60 * 60)
    const diffDias = diffMs / (1000 * 60 * 60 * 24)

    if (diffHoras < 1) return 'Hace <1h'
    if (diffHoras < 24) return `Hace ${Math.floor(diffHoras)}h`
    if (diffDias < 7) return `Hace ${Math.floor(diffDias)}d`
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
  }

  const getResultadoColor = (resultado?: string) => {
    if (!resultado) return ''
    const colors: Record<string, string> = {
      positivo: 'text-green-600',
      neutro: 'text-yellow-600',
      negativo: 'text-red-600'
    }
    return colors[resultado.toLowerCase()] || ''
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Actividades Recientes</CardTitle>
      </CardHeader>
      <CardContent>
        {actividades.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Sin actividades recientes</p>
        ) : (
          <div className="space-y-3">
            {actividades.slice(0, 6).map((actividad) => {
              const TipoIcon = getTipoIcon(actividad.tipo)

              return (
                <div key={actividad.id} className="flex items-start gap-3">
                  <TipoIcon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {actividad.crmOportunidad?.nombre || 'Sin oportunidad'}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {actividad.descripcion}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatFecha(actividad.fecha)}
                    </span>
                    {actividad.resultado && (
                      <span className={`text-xs ${getResultadoColor(actividad.resultado)}`}>
                        {actividad.resultado}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
