'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, MessageSquare, Phone, Mail, Users, FileText, Clock, User, Loader2, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { getActividadesOportunidad, CrmActividad, TIPOS_ACTIVIDAD, RESULTADOS_ACTIVIDAD } from '@/lib/services/crm/actividades'

// ✅ Formateadores de utilidad
const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatDateOnly = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

interface ActividadListProps {
  oportunidadId: string
  onNuevaActividad?: () => void
}

export default function ActividadList({ oportunidadId, onNuevaActividad }: ActividadListProps) {
  const [actividades, setActividades] = useState<CrmActividad[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ✅ Cargar actividades
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

  // ✅ Efecto para cargar actividades
  useEffect(() => {
    if (oportunidadId) {
      loadActividades()
    }
  }, [oportunidadId])

  // ✅ Función para agregar nueva actividad a la lista
  const handleNuevaActividad = (nuevaActividad: CrmActividad) => {
    setActividades(prev => [nuevaActividad, ...prev])
  }

  // ✅ Obtener icono según tipo de actividad
  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case TIPOS_ACTIVIDAD.LLAMADA:
        return <Phone className="h-3 w-3" />
      case TIPOS_ACTIVIDAD.EMAIL:
        return <Mail className="h-3 w-3" />
      case TIPOS_ACTIVIDAD.REUNION:
        return <Users className="h-3 w-3" />
      case TIPOS_ACTIVIDAD.PROPUESTA:
        return <FileText className="h-3 w-3" />
      case TIPOS_ACTIVIDAD.SEGUIMIENTO:
        return <Clock className="h-3 w-3" />
      default:
        return <MessageSquare className="h-3 w-3" />
    }
  }

  // ✅ Obtener color del badge según resultado
  const getResultadoVariant = (resultado?: string) => {
    switch (resultado) {
      case RESULTADOS_ACTIVIDAD.POSITIVO:
        return 'default'
      case RESULTADOS_ACTIVIDAD.NEGATIVO:
        return 'destructive'
      case RESULTADOS_ACTIVIDAD.NEUTRO:
        return 'secondary'
      default:
        return 'outline'
    }
  }

  // ✅ Loading state
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center py-8">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground">Cargando actividades...</p>
          </div>
        </div>
      </div>
    )
  }

  // ✅ Error state
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  // ✅ Empty state compacto
  if (actividades.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-8 space-y-3"
      >
        <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
          <MessageSquare className="h-8 w-8 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-semibold">Sin actividades</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Registra la primera actividad para hacer seguimiento
          </p>
        </div>
        {onNuevaActividad && (
          <Button onClick={onNuevaActividad} size="sm">
            <MessageSquare className="h-3 w-3 mr-1" />
            Registrar Primera
          </Button>
        )}
      </motion.div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Header compacto */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary" />
          <h3 className="text-base font-semibold">
            Actividades ({actividades.length})
          </h3>
        </div>
        {onNuevaActividad && (
          <Button onClick={onNuevaActividad} size="sm" variant="outline">
            <MessageSquare className="h-3 w-3 mr-1" />
            Nueva
          </Button>
        )}
      </div>

      {/* Lista de actividades compacta */}
      <div className="space-y-2">
        <AnimatePresence>
          {actividades.map((actividad, index) => (
            <motion.div
              key={actividad.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{
                duration: 0.3,
                delay: index * 0.1,
                ease: [0.4, 0, 0.2, 1]
              }}
            >
              <Card className="hover:shadow-sm transition-shadow">
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    {/* Icono del tipo compacto */}
                    <div className="flex-shrink-0">
                      <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center">
                        {getTipoIcon(actividad.tipo)}
                      </div>
                    </div>

                    {/* Contenido compacto */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium capitalize text-sm">
                            {actividad.tipo}
                          </span>
                          {actividad.resultado && (
                            <Badge variant={getResultadoVariant(actividad.resultado)} className="text-xs px-1.5 py-0.5">
                              {actividad.resultado}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{formatDateOnly(actividad.fecha)}</span>
                          {actividad.user && (
                            <>
                              <span>•</span>
                              <span>{actividad.user.name}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <p className="text-sm text-muted-foreground mb-1">
                        {actividad.descripcion}
                      </p>

                      {actividad.notas && (
                        <p className="text-xs text-muted-foreground italic">
                          "{actividad.notas}"
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
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