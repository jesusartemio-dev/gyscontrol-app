'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { CrmOportunidad } from '@/lib/services/crm/oportunidades'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { cambiarEstadoOportunidad } from '@/lib/services/crm/oportunidades'
import {
  Target,
  Send,
  Clock,
  Handshake,
  Trophy,
  X,
  Loader2
} from 'lucide-react'

interface Props {
  oportunidad: CrmOportunidad
  onUpdated: (oportunidad: CrmOportunidad) => void
}

const etapasConfig = {
  prospecto: { icon: Target, color: 'bg-purple-500', label: 'Prospecto' },
  contacto_inicial: { icon: Send, color: 'bg-blue-500', label: 'Contacto Inicial' },
  propuesta_enviada: { icon: Clock, color: 'bg-yellow-500', label: 'Propuesta Enviada' },
  negociacion: { icon: Handshake, color: 'bg-orange-500', label: 'Negociación' },
  cerrada_ganada: { icon: Trophy, color: 'bg-green-500', label: 'Cerrada Ganada' },
  cerrada_perdida: { icon: X, color: 'bg-red-500', label: 'Cerrada Perdida' }
}

const etapas = Object.keys(etapasConfig)

export default function CrmEtapasToolbar({ oportunidad, onUpdated }: Props) {
  const [loadingEtapa, setLoadingEtapa] = useState<string | null>(null)

  const handleEtapaChange = async (nuevaEtapa: string) => {
    try {
      setLoadingEtapa(nuevaEtapa)
      const oportunidadActualizada = await cambiarEstadoOportunidad(oportunidad.id, nuevaEtapa)
      onUpdated(oportunidadActualizada)
      toast.success(`Estado actualizado a ${etapasConfig[nuevaEtapa as keyof typeof etapasConfig]?.label || nuevaEtapa}`)
    } catch {
      toast.error('Error al actualizar etapa')
    } finally {
      setLoadingEtapa(null)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-4"
    >
      {/* Estado de Oportunidades */}
      <div className="space-y-2">
        <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
          Estado de Oportunidades
        </h4>
        <div className="flex flex-wrap gap-2">
          {etapas.map(etapa => {
            const config = etapasConfig[etapa as keyof typeof etapasConfig]
            const isActive = oportunidad.estado === etapa
            const isLoading = loadingEtapa === etapa

            return (
              <motion.div
                key={etapa}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  variant={isActive ? 'default' : 'outline'}
                  onClick={() => handleEtapaChange(etapa)}
                  disabled={isLoading || loadingEtapa !== null}
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
                    React.createElement(config?.icon || Target, { className: 'h-3 w-3' })
                  )}
                  <span className="text-xs font-medium">
                    {config?.label || etapa}
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