'use client'

import React, { useState } from 'react'
import { Cotizacion } from '@/types'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { updateCotizacion } from '@/lib/services/cotizacion'
import {
  FileText,
  Send,
  CheckCircle,
  XCircle,
  Loader2,
  ChevronDown
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { StepPill, StepLine, type StepStatus } from '@/components/ui/status-stepper'

interface Props {
  cotizacion: Cotizacion
  onUpdated: (estado: string) => void
  compact?: boolean
}

const estadosConfig = {
  borrador: { icon: FileText, color: 'text-gray-600', bgColor: 'bg-gray-100', activeColor: 'bg-gray-600 text-white', label: 'Borrador', order: 1 },
  enviada: { icon: Send, color: 'text-blue-600', bgColor: 'bg-blue-100', activeColor: 'bg-blue-600 text-white', label: 'Enviada', order: 2 },
  aprobada: { icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-100', activeColor: 'bg-green-600 text-white', label: 'Aprobada', order: 3 },
  rechazada: { icon: XCircle, color: 'text-red-600', bgColor: 'bg-red-100', activeColor: 'bg-red-600 text-white', label: 'Rechazada', order: 3 },
}

const finalStates = ['aprobada', 'rechazada']

export default function EstadoCotizacionStepper({ cotizacion, onUpdated, compact = false }: Props) {
  const [loadingEstado, setLoadingEstado] = useState<string | null>(null)
  const currentEstado = cotizacion.estado || 'borrador'
  const currentConfig = estadosConfig[currentEstado as keyof typeof estadosConfig]

  const handleEstadoChange = async (nuevoEstado: string) => {
    if (nuevoEstado === currentEstado) return

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

  const getCurrentStepIndex = () => {
    if (currentEstado === 'borrador') return 0
    if (currentEstado === 'enviada') return 1
    if (finalStates.includes(currentEstado)) return 2
    return 0
  }

  const currentStepIndex = getCurrentStepIndex()

  // Compact version: dropdown with current status
  if (compact) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn("h-7 gap-1.5 text-xs font-medium border-0", currentConfig?.activeColor)}
            disabled={loadingEstado !== null}
          >
            {loadingEstado ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              React.createElement(currentConfig?.icon || FileText, { className: 'h-3 w-3' })
            )}
            {currentConfig?.label}
            <ChevronDown className="h-3 w-3 ml-0.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-40">
          {Object.entries(estadosConfig).map(([estado, config]) => (
            <DropdownMenuItem
              key={estado}
              onClick={() => handleEstadoChange(estado)}
              disabled={loadingEstado !== null}
              className={cn("gap-2", currentEstado === estado && "bg-muted")}
            >
              {React.createElement(config.icon, { className: `h-4 w-4 ${config.color}` })}
              {config.label}
              {currentEstado === estado && <CheckCircle className="h-3 w-3 ml-auto text-green-500" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  // Build pill statuses for first two steps
  const borradorStatus: StepStatus = currentStepIndex > 0 ? 'completed' : currentEstado === 'borrador' ? 'current' : 'future'
  const enviadaStatus: StepStatus = currentStepIndex > 1 ? 'completed' : currentEstado === 'enviada' ? 'current' : 'future'

  // Full stepper version with pills
  return (
    <div className="flex items-center gap-1 flex-wrap">
      <div className="flex items-center">
        {/* Step 1: Borrador */}
        <StepPill
          label="Borrador"
          status={borradorStatus}
          interactive
          loading={loadingEstado === 'borrador'}
          disabled={loadingEstado !== null}
          onClick={() => handleEstadoChange('borrador')}
        />

        <StepLine nextStatus={enviadaStatus} />

        {/* Step 2: Enviada */}
        <StepPill
          label="Enviada"
          status={enviadaStatus}
          interactive
          loading={loadingEstado === 'enviada'}
          disabled={loadingEstado !== null}
          onClick={() => handleEstadoChange('enviada')}
        />

        <StepLine nextStatus={finalStates.includes(currentEstado) ? (currentEstado === 'rechazada' ? 'rejected' : 'current') : 'future'} />

        {/* Step 3: Final (Aprobada/Rechazada) */}
        {finalStates.includes(currentEstado) ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <span>
                <StepPill
                  label={currentConfig?.label || ''}
                  status={currentEstado === 'rechazada' ? 'rejected' : 'current'}
                >
                  <ChevronDown className="h-3 w-3" />
                </StepPill>
              </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleEstadoChange('aprobada')} disabled={loadingEstado !== null} className="gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                Aprobada
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleEstadoChange('rechazada')} disabled={loadingEstado !== null} className="gap-2">
                <XCircle className="h-4 w-4 text-red-600" />
                Rechazada
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="flex items-center gap-1">
            <StepPill
              label="Aprobar"
              status="future"
              interactive
              loading={loadingEstado === 'aprobada'}
              disabled={loadingEstado !== null}
              onClick={() => handleEstadoChange('aprobada')}
            />
            <span className="text-muted-foreground text-xs">/</span>
            <StepPill
              label="Rechazar"
              status="future"
              interactive
              loading={loadingEstado === 'rechazada'}
              disabled={loadingEstado !== null}
              onClick={() => handleEstadoChange('rechazada')}
            />
          </div>
        )}
      </div>
    </div>
  )
}
