'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Target, X, CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

interface CrmIntegrationNotificationProps {
  entityType: 'cotizacion' | 'proyecto'
  entityId: string
  entityNombre: string
  clienteNombre: string
  valor: number
  onCreateOportunidad?: () => void
  onDismiss?: () => void
}

export default function CrmIntegrationNotification({
  entityType,
  entityId,
  entityNombre,
  clienteNombre,
  valor,
  onCreateOportunidad,
  onDismiss
}: CrmIntegrationNotificationProps) {
  const [isVisible, setIsVisible] = useState(true)
  const [isCreating, setIsCreating] = useState(false)

  const handleCreateOportunidad = async () => {
    setIsCreating(true)
    try {
      const endpoint = entityType === 'cotizacion'
        ? '/api/crm/oportunidades/crear-desde-cotizacion'
        : '/api/crm/oportunidades/crear-desde-proyecto'

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          [entityType === 'cotizacion' ? 'cotizacionId' : 'proyectoId']: entityId,
          descripcion: `Oportunidad creada automáticamente desde ${entityType} ${entityNombre}`
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al crear oportunidad')
      }

      const oportunidad = await response.json()
      toast.success('Oportunidad CRM creada exitosamente')
      onCreateOportunidad?.()
      setIsVisible(false)
    } catch (error) {
      console.error('Error creating oportunidad:', error)
      toast.error(error instanceof Error ? error.message : 'Error al crear oportunidad')
    } finally {
      setIsCreating(false)
    }
  }

  const handleDismiss = () => {
    setIsVisible(false)
    onDismiss?.()
  }

  if (!isVisible) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        transition={{ duration: 0.3, ease: [0, 0, 0.2, 1] }}
        className="fixed bottom-4 right-4 z-50 max-w-sm"
      >
        <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
                <Target className="h-5 w-5 text-blue-600" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="text-sm font-semibold text-blue-900">
                    Integración CRM
                  </h4>
                  <Badge variant="outline" className="text-xs bg-blue-100 text-blue-700 border-blue-200">
                    Nuevo
                  </Badge>
                </div>

                <p className="text-sm text-blue-800 mb-3">
                  ¿Quieres crear una oportunidad en el CRM para{' '}
                  <span className="font-medium">{clienteNombre}</span>?
                </p>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-blue-700">
                    <span>{entityType === 'cotizacion' ? 'Cotización' : 'Proyecto'}:</span>
                    <span className="font-medium">{entityNombre}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-blue-700">
                    <span>Valor:</span>
                    <span className="font-medium">
                      ${valor.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismiss}
                className="text-blue-600 hover:text-blue-700 hover:bg-blue-100 h-6 w-6 p-0 flex-shrink-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>

            <div className="flex gap-2 mt-4">
              <Button
                size="sm"
                onClick={handleCreateOportunidad}
                disabled={isCreating}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs h-8"
              >
                {isCreating ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border border-white border-t-transparent mr-2" />
                    Creando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-3 w-3 mr-2" />
                    Crear Oportunidad
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleDismiss}
                disabled={isCreating}
                className="flex-1 border-blue-200 text-blue-700 hover:bg-blue-50 text-xs h-8"
              >
                Después
              </Button>
            </div>

            <div className="flex items-center gap-1 mt-3 text-xs text-blue-600">
              <AlertCircle className="h-3 w-3" />
              <span>Mejorar seguimiento comercial</span>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  )
}