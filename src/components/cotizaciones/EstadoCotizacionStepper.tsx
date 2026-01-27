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
  ChevronRight,
  ChevronDown
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  cotizacion: Cotizacion
  onUpdated: (estado: string) => void
  compact?: boolean
}

const estadosConfig = {
  borrador: {
    icon: FileText,
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    activeColor: 'bg-gray-600 text-white',
    label: 'Borrador',
    order: 1
  },
  enviada: {
    icon: Send,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    activeColor: 'bg-blue-600 text-white',
    label: 'Enviada',
    order: 2
  },
  aprobada: {
    icon: CheckCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    activeColor: 'bg-green-600 text-white',
    label: 'Aprobada',
    order: 3
  },
  rechazada: {
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    activeColor: 'bg-red-600 text-white',
    label: 'Rechazada',
    order: 3
  }
}

// Flow: Borrador -> Enviada -> (Aprobada | Rechazada)
const flowSteps = ['borrador', 'enviada', 'final'] as const
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

  // Get the step index for the current estado
  const getCurrentStepIndex = () => {
    if (currentEstado === 'borrador') return 0
    if (currentEstado === 'enviada') return 1
    if (finalStates.includes(currentEstado)) return 2
    return 0
  }

  const currentStepIndex = getCurrentStepIndex()

  // Compact version: just a dropdown with the current status
  if (compact) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-7 gap-1.5 text-xs font-medium border-0",
              currentConfig?.activeColor
            )}
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
              className={cn(
                "gap-2",
                currentEstado === estado && "bg-muted"
              )}
            >
              {React.createElement(config.icon, { className: `h-4 w-4 ${config.color}` })}
              {config.label}
              {currentEstado === estado && (
                <CheckCircle className="h-3 w-3 ml-auto text-green-500" />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  // Full stepper version
  return (
    <div className="flex items-center gap-1">
      {/* Step 1: Borrador */}
      <StepButton
        estado="borrador"
        config={estadosConfig.borrador}
        isActive={currentEstado === 'borrador'}
        isPast={currentStepIndex > 0}
        isLoading={loadingEstado === 'borrador'}
        disabled={loadingEstado !== null}
        onClick={() => handleEstadoChange('borrador')}
      />

      <ChevronRight className="h-4 w-4 text-muted-foreground" />

      {/* Step 2: Enviada */}
      <StepButton
        estado="enviada"
        config={estadosConfig.enviada}
        isActive={currentEstado === 'enviada'}
        isPast={currentStepIndex > 1}
        isLoading={loadingEstado === 'enviada'}
        disabled={loadingEstado !== null}
        onClick={() => handleEstadoChange('enviada')}
      />

      <ChevronRight className="h-4 w-4 text-muted-foreground" />

      {/* Step 3: Final (Aprobada/Rechazada) */}
      {finalStates.includes(currentEstado) ? (
        // Show current final state with dropdown to change
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-7 gap-1 text-xs font-medium px-2",
                currentConfig?.activeColor
              )}
              disabled={loadingEstado !== null}
            >
              {loadingEstado && finalStates.includes(loadingEstado) ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                React.createElement(currentConfig?.icon || CheckCircle, { className: 'h-3 w-3' })
              )}
              {currentConfig?.label}
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => handleEstadoChange('aprobada')}
              disabled={loadingEstado !== null}
              className="gap-2"
            >
              <CheckCircle className="h-4 w-4 text-green-600" />
              Aprobada
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleEstadoChange('rechazada')}
              disabled={loadingEstado !== null}
              className="gap-2"
            >
              <XCircle className="h-4 w-4 text-red-600" />
              Rechazada
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        // Show both options as buttons
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 text-xs font-medium px-2 text-green-600 hover:bg-green-50 hover:text-green-700"
            onClick={() => handleEstadoChange('aprobada')}
            disabled={loadingEstado !== null}
          >
            {loadingEstado === 'aprobada' ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <CheckCircle className="h-3 w-3" />
            )}
            Aprobar
          </Button>
          <span className="text-muted-foreground text-xs">/</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 text-xs font-medium px-2 text-red-600 hover:bg-red-50 hover:text-red-700"
            onClick={() => handleEstadoChange('rechazada')}
            disabled={loadingEstado !== null}
          >
            {loadingEstado === 'rechazada' ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <XCircle className="h-3 w-3" />
            )}
            Rechazar
          </Button>
        </div>
      )}
    </div>
  )
}

interface StepButtonProps {
  estado: string
  config: typeof estadosConfig.borrador
  isActive: boolean
  isPast: boolean
  isLoading: boolean
  disabled: boolean
  onClick: () => void
}

function StepButton({ estado, config, isActive, isPast, isLoading, disabled, onClick }: StepButtonProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn(
        "h-7 gap-1 text-xs font-medium px-2 transition-all",
        isActive && config.activeColor,
        isPast && !isActive && `${config.bgColor} ${config.color}`,
        !isActive && !isPast && "text-muted-foreground hover:bg-muted"
      )}
      onClick={onClick}
      disabled={disabled}
    >
      {isLoading ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        React.createElement(config.icon, { className: 'h-3 w-3' })
      )}
      {config.label}
    </Button>
  )
}
