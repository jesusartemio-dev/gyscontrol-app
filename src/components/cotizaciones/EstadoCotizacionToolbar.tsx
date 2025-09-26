'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Cotizacion } from '@/types'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { updateCotizacion } from '@/lib/services/cotizacion'
import {
  FileText,
  Send,
  CheckCircle,
  XCircle,
  Loader2
} from 'lucide-react'

interface Props {
  cotizacion: Cotizacion
  onUpdated: (estado: string) => void
}

const estadosConfig = {
  borrador: { icon: FileText, color: 'bg-gray-500', label: 'Borrador' },
  enviada: { icon: Send, color: 'bg-blue-500', label: 'Enviada' },
  aprobada: { icon: CheckCircle, color: 'bg-green-500', label: 'Aprobada' },
  rechazada: { icon: XCircle, color: 'bg-red-500', label: 'Rechazada' }
}

const estados = Object.keys(estadosConfig)

export default function EstadoCotizacionToolbar({ cotizacion, onUpdated }: Props) {
  const [loadingEstado, setLoadingEstado] = useState<string | null>(null)

  const handleEstadoChange = async (nuevoEstado: string) => {
    try {
      setLoadingEstado(nuevoEstado)
      await updateCotizacion(cotizacion.id, { estado: nuevoEstado as any })
      onUpdated(nuevoEstado)
      toast.success(`Estado actualizado a ${estadosConfig[nuevoEstado as keyof typeof estadosConfig]?.label || nuevoEstado}`)
    } catch {
      toast.error('Error al actualizar estado')
    } finally {
      setLoadingEstado(null)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-4"
    >
      {/* Estado de Cotización */}
      <div className="space-y-2">
        <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
          Estado de Cotización
        </h4>
        <div className="flex flex-wrap gap-2">
          {estados.map(estado => {
            const config = estadosConfig[estado as keyof typeof estadosConfig]
            const isActive = cotizacion.estado === estado
            const isLoading = loadingEstado === estado

            return (
              <motion.div
                key={estado}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  variant={isActive ? 'default' : 'outline'}
                  onClick={() => handleEstadoChange(estado)}
                  disabled={isLoading || loadingEstado !== null}
                  className={`justify-center gap-2 h-9 px-3 ${
                    isActive
                      ? `${config?.color} hover:${config?.color}/90 text-white border-0`
                      : 'hover:bg-muted'
                  }`}
                  size="sm"
                >
                  {isLoading ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    React.createElement(config?.icon || FileText, { className: 'h-3 w-3' })
                  )}
                  <span className="text-xs font-medium">
                    {config?.label || estado}
                  </span>
                </Button>
              </motion.div>
            )
          })}
        </div>
      </div>
    </motion.div>
  )
}
