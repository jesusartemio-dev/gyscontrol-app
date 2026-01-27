'use client'

import React, { useState } from 'react'
import { CrmOportunidad } from '@/lib/services/crm/oportunidades'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { cambiarEstadoOportunidad } from '@/lib/services/crm/oportunidades'
import {
  Target,
  Send,
  FileText,
  Handshake,
  Trophy,
  XCircle,
  Loader2,
  ChevronRight,
  ChevronDown,
  CheckCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  oportunidad: CrmOportunidad
  onUpdated: (oportunidad: CrmOportunidad) => void
  compact?: boolean
}

const etapasConfig = {
  prospecto: {
    icon: Target,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    activeColor: 'bg-purple-600 text-white',
    label: 'Prospecto',
    order: 1
  },
  contacto_inicial: {
    icon: Send,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    activeColor: 'bg-blue-600 text-white',
    label: 'Contacto',
    order: 2
  },
  propuesta_enviada: {
    icon: FileText,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
    activeColor: 'bg-yellow-600 text-white',
    label: 'Propuesta',
    order: 3
  },
  negociacion: {
    icon: Handshake,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
    activeColor: 'bg-orange-600 text-white',
    label: 'Negociación',
    order: 4
  },
  cerrada_ganada: {
    icon: Trophy,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    activeColor: 'bg-green-600 text-white',
    label: 'Ganada',
    order: 5
  },
  cerrada_perdida: {
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    activeColor: 'bg-red-600 text-white',
    label: 'Perdida',
    order: 5
  }
}

// Flow steps (final can be ganada or perdida)
const flowSteps = ['prospecto', 'contacto_inicial', 'propuesta_enviada', 'negociacion', 'final'] as const
const finalStates = ['cerrada_ganada', 'cerrada_perdida']

export default function CrmEtapasStepper({ oportunidad, onUpdated, compact = false }: Props) {
  const [loadingEtapa, setLoadingEtapa] = useState<string | null>(null)
  const currentEstado = oportunidad.estado || 'prospecto'
  const currentConfig = etapasConfig[currentEstado as keyof typeof etapasConfig]

  const handleEtapaChange = async (nuevaEtapa: string) => {
    if (nuevaEtapa === currentEstado) return

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

  // Get the step index for the current estado
  const getCurrentStepIndex = () => {
    if (currentEstado === 'prospecto') return 0
    if (currentEstado === 'contacto_inicial') return 1
    if (currentEstado === 'propuesta_enviada') return 2
    if (currentEstado === 'negociacion') return 3
    if (finalStates.includes(currentEstado)) return 4
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
            disabled={loadingEtapa !== null}
          >
            {loadingEtapa ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              React.createElement(currentConfig?.icon || Target, { className: 'h-3 w-3' })
            )}
            {currentConfig?.label}
            <ChevronDown className="h-3 w-3 ml-0.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-44">
          {Object.entries(etapasConfig).map(([estado, config]) => (
            <DropdownMenuItem
              key={estado}
              onClick={() => handleEtapaChange(estado)}
              disabled={loadingEtapa !== null}
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
    <div className="flex items-center gap-1 flex-wrap">
      {/* Step 1: Prospecto */}
      <StepButton
        estado="prospecto"
        config={etapasConfig.prospecto}
        isActive={currentEstado === 'prospecto'}
        isPast={currentStepIndex > 0}
        isLoading={loadingEtapa === 'prospecto'}
        disabled={loadingEtapa !== null}
        onClick={() => handleEtapaChange('prospecto')}
      />

      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />

      {/* Step 2: Contacto */}
      <StepButton
        estado="contacto_inicial"
        config={etapasConfig.contacto_inicial}
        isActive={currentEstado === 'contacto_inicial'}
        isPast={currentStepIndex > 1}
        isLoading={loadingEtapa === 'contacto_inicial'}
        disabled={loadingEtapa !== null}
        onClick={() => handleEtapaChange('contacto_inicial')}
      />

      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />

      {/* Step 3: Propuesta */}
      <StepButton
        estado="propuesta_enviada"
        config={etapasConfig.propuesta_enviada}
        isActive={currentEstado === 'propuesta_enviada'}
        isPast={currentStepIndex > 2}
        isLoading={loadingEtapa === 'propuesta_enviada'}
        disabled={loadingEtapa !== null}
        onClick={() => handleEtapaChange('propuesta_enviada')}
      />

      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />

      {/* Step 4: Negociación */}
      <StepButton
        estado="negociacion"
        config={etapasConfig.negociacion}
        isActive={currentEstado === 'negociacion'}
        isPast={currentStepIndex > 3}
        isLoading={loadingEtapa === 'negociacion'}
        disabled={loadingEtapa !== null}
        onClick={() => handleEtapaChange('negociacion')}
      />

      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />

      {/* Step 5: Final (Ganada/Perdida) */}
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
              disabled={loadingEtapa !== null}
            >
              {loadingEtapa && finalStates.includes(loadingEtapa) ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                React.createElement(currentConfig?.icon || Trophy, { className: 'h-3 w-3' })
              )}
              {currentConfig?.label}
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => handleEtapaChange('cerrada_ganada')}
              disabled={loadingEtapa !== null}
              className="gap-2"
            >
              <Trophy className="h-4 w-4 text-green-600" />
              Cerrada Ganada
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleEtapaChange('cerrada_perdida')}
              disabled={loadingEtapa !== null}
              className="gap-2"
            >
              <XCircle className="h-4 w-4 text-red-600" />
              Cerrada Perdida
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
            onClick={() => handleEtapaChange('cerrada_ganada')}
            disabled={loadingEtapa !== null}
          >
            {loadingEtapa === 'cerrada_ganada' ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Trophy className="h-3 w-3" />
            )}
            Ganada
          </Button>
          <span className="text-muted-foreground text-xs">/</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 text-xs font-medium px-2 text-red-600 hover:bg-red-50 hover:text-red-700"
            onClick={() => handleEtapaChange('cerrada_perdida')}
            disabled={loadingEtapa !== null}
          >
            {loadingEtapa === 'cerrada_perdida' ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <XCircle className="h-3 w-3" />
            )}
            Perdida
          </Button>
        </div>
      )}
    </div>
  )
}

interface StepButtonProps {
  estado: string
  config: typeof etapasConfig.prospecto
  isActive: boolean
  isPast: boolean
  isLoading: boolean
  disabled: boolean
  onClick: () => void
}

function StepButton({ config, isActive, isPast, isLoading, disabled, onClick }: StepButtonProps) {
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
