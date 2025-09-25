'use client'

import { motion } from 'framer-motion'
import { Activity, Phone, Mail, Calendar, User, MessageSquare, CheckCircle, XCircle, Clock } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

interface Actividad {
  id: string
  tipo: string
  descripcion: string
  fecha: string
  resultado?: string
  oportunidad: {
    nombre: string
    cliente?: { nombre: string }
  }
  usuario: { name?: string }
}

interface ActividadesRecientesProps {
  actividades: Actividad[]
}

export default function ActividadesRecientes({ actividades }: ActividadesRecientesProps) {
  const getTipoIcon = (tipo: string) => {
    switch (tipo.toLowerCase()) {
      case 'llamada':
        return Phone
      case 'email':
        return Mail
      case 'reunion':
        return Calendar
      case 'seguimiento':
        return User
      default:
        return MessageSquare
    }
  }

  const getResultadoColor = (resultado?: string) => {
    switch (resultado?.toLowerCase()) {
      case 'positivo':
        return 'text-green-600 bg-green-100'
      case 'neutro':
        return 'text-yellow-600 bg-yellow-100'
      case 'negativo':
        return 'text-red-600 bg-red-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const formatFecha = (fecha: string) => {
    const date = new Date(fecha)
    const ahora = new Date()
    const diffMs = ahora.getTime() - date.getTime()
    const diffHoras = diffMs / (1000 * 60 * 60)
    const diffDias = diffMs / (1000 * 60 * 60 * 24)

    if (diffHoras < 1) {
      return 'Hace menos de 1 hora'
    } else if (diffHoras < 24) {
      return `Hace ${Math.floor(diffHoras)} horas`
    } else if (diffDias < 7) {
      return `Hace ${Math.floor(diffDias)} días`
    } else {
      return date.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short'
      })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-green-600" />
          Actividades Recientes
        </CardTitle>
        <CardDescription>
          Últimas actividades registradas en el sistema
        </CardDescription>
      </CardHeader>
      <CardContent>
        {actividades.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No hay actividades recientes</p>
          </div>
        ) : (
          <div className="space-y-4">
            {actividades.map((actividad, index) => {
              const TipoIcon = getTipoIcon(actividad.tipo)

              return (
                <motion.div
                  key={actividad.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
                    <TipoIcon className="h-4 w-4 text-blue-600" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-sm truncate">
                        {actividad.oportunidad.nombre}
                      </h4>
                      {actividad.resultado && (
                        <Badge
                          variant="outline"
                          className={`text-xs ${getResultadoColor(actividad.resultado)}`}
                        >
                          {actividad.resultado}
                        </Badge>
                      )}
                    </div>

                    <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                      {actividad.descripcion}
                    </p>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatFecha(actividad.fecha)}
                      </div>

                      {actividad.oportunidad.cliente && (
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {actividad.oportunidad.cliente.nombre}
                        </div>
                      )}

                      {actividad.usuario.name && (
                        <div className="flex items-center gap-1">
                          <Avatar className="h-4 w-4">
                            <AvatarFallback className="text-xs">
                              {actividad.usuario.name.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          {actividad.usuario.name}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}

        {actividades.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Mostrando las {Math.min(actividades.length, 10)} actividades más recientes
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}