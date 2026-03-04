'use client'

import { useState, useEffect } from 'react'
import { MessageSquare, Phone, Mail, Users, FileText, Clock, Loader2, AlertCircle, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { getActividadesOportunidad, CrmActividad, TIPOS_ACTIVIDAD, RESULTADOS_ACTIVIDAD } from '@/lib/services/crm/actividades'

const formatDateShort = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short'
  })
}

const formatRelativeDate = (dateString: string): string => {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffHours = diffMs / (1000 * 60 * 60)
  const diffDays = diffMs / (1000 * 60 * 60 * 24)

  if (diffHours < 1) return 'Hace <1h'
  if (diffHours < 24) return `Hace ${Math.floor(diffHours)}h`
  if (diffDays < 7) return `Hace ${Math.floor(diffDays)}d`
  return formatDateShort(dateString)
}

interface ActividadListProps {
  oportunidadId: string
  onNuevaActividad?: () => void
}

const tipoConfig: Record<string, { icon: typeof Phone; label: string }> = {
  [TIPOS_ACTIVIDAD.LLAMADA]: { icon: Phone, label: 'Llamada' },
  [TIPOS_ACTIVIDAD.EMAIL]: { icon: Mail, label: 'Email' },
  [TIPOS_ACTIVIDAD.REUNION]: { icon: Users, label: 'Reunion' },
  [TIPOS_ACTIVIDAD.PROPUESTA]: { icon: FileText, label: 'Propuesta' },
  [TIPOS_ACTIVIDAD.SEGUIMIENTO]: { icon: Clock, label: 'Seguimiento' },
}

const resultadoConfig: Record<string, { className: string; dot: string }> = {
  [RESULTADOS_ACTIVIDAD.POSITIVO]: { className: 'text-green-700 bg-green-50', dot: 'bg-green-500' },
  [RESULTADOS_ACTIVIDAD.NEGATIVO]: { className: 'text-red-700 bg-red-50', dot: 'bg-red-500' },
  [RESULTADOS_ACTIVIDAD.NEUTRO]: { className: 'text-yellow-700 bg-yellow-50', dot: 'bg-yellow-500' },
  [RESULTADOS_ACTIVIDAD.PENDIENTE]: { className: 'text-gray-600 bg-gray-50', dot: 'bg-gray-400' },
}

export default function ActividadList({ oportunidadId, onNuevaActividad }: ActividadListProps) {
  const [actividades, setActividades] = useState<CrmActividad[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadActividades = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await getActividadesOportunidad(oportunidadId)
      setActividades(response.data)
    } catch (err) {
      console.error('Error al cargar actividades:', err)
      setError('No se pudieron cargar las actividades')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (oportunidadId) {
      loadActividades()
    }
  }, [oportunidadId])

  const handleNuevaActividad = (nuevaActividad: CrmActividad) => {
    setActividades(prev => [nuevaActividad, ...prev])
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (actividades.length === 0) {
    return (
      <div className="text-center py-6 space-y-2">
        <MessageSquare className="h-6 w-6 text-muted-foreground mx-auto" />
        <p className="text-sm text-muted-foreground">Sin actividades registradas</p>
        {onNuevaActividad && (
          <Button onClick={onNuevaActividad} size="sm" variant="outline">
            <Plus className="h-3 w-3 mr-1" />
            Registrar Primera
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Actividades ({actividades.length})
        </h3>
        {onNuevaActividad && (
          <Button onClick={onNuevaActividad} size="sm" variant="ghost" className="h-7 px-2 text-xs">
            <Plus className="h-3 w-3 mr-1" />
            Nueva
          </Button>
        )}
      </div>

      {/* Lista plana */}
      <TooltipProvider delayDuration={300}>
        <div className="divide-y divide-border">
          {actividades.map((actividad) => {
            const tipo = tipoConfig[actividad.tipo] || { icon: MessageSquare, label: actividad.tipo }
            const TipoIcon = tipo.icon
            const resultado = actividad.resultado ? resultadoConfig[actividad.resultado] : null

            return (
              <div key={actividad.id} className="flex items-center gap-3 py-2 group hover:bg-muted/30 -mx-2 px-2 rounded-sm transition-colors">
                {/* Icono tipo */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="shrink-0 w-7 h-7 rounded-full bg-muted flex items-center justify-center">
                      <TipoIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="left"><p>{tipo.label}</p></TooltipContent>
                </Tooltip>

                {/* Contenido principal */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">
                    <span className="font-medium capitalize">{actividad.tipo}</span>
                    <span className="text-muted-foreground mx-1.5">-</span>
                    <span className="text-muted-foreground">{actividad.descripcion}</span>
                  </p>
                  {actividad.notas && (
                    <p className="text-xs text-muted-foreground/70 truncate italic">
                      {actividad.notas}
                    </p>
                  )}
                </div>

                {/* Resultado */}
                {resultado && (
                  <Badge variant="outline" className={`shrink-0 text-[10px] px-1.5 py-0 h-5 border-0 ${resultado.className}`}>
                    <span className={`w-1.5 h-1.5 rounded-full mr-1 ${resultado.dot}`} />
                    {actividad.resultado}
                  </Badge>
                )}

                {/* Fecha + Usuario */}
                <div className="shrink-0 text-right">
                  <span className="text-xs text-muted-foreground">{formatRelativeDate(actividad.fecha)}</span>
                  {actividad.user && (
                    <p className="text-[10px] text-muted-foreground/60">{actividad.user.name}</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </TooltipProvider>
    </div>
  )
}

// ✅ Hook personalizado para usar en otros componentes
export function useActividades(oportunidadId: string) {
  const [actividades, setActividades] = useState<CrmActividad[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadActividades = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await getActividadesOportunidad(oportunidadId)
      setActividades(response.data)
    } catch (err) {
      console.error('Error al cargar actividades:', err)
      setError('No se pudieron cargar las actividades')
    } finally {
      setLoading(false)
    }
  }

  const addActividad = (nuevaActividad: CrmActividad) => {
    setActividades(prev => [nuevaActividad, ...prev])
  }

  return {
    actividades,
    loading,
    error,
    loadActividades,
    addActividad
  }
}