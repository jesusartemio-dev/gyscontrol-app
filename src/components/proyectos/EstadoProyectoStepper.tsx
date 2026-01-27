'use client'

import React, { useState } from 'react'
import { Proyecto } from '@/types'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import {
  Clock,
  AlertTriangle,
  CheckCircle,
  Truck,
  PlayCircle,
  PauseCircle,
  XCircle,
  Loader2,
  ChevronRight,
  ChevronDown,
  FileEdit,
  FileCheck,
  Lock
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  proyecto: Proyecto
  onUpdated: (estado: string) => void
  compact?: boolean
}

const estadosConfig = {
  creado: {
    icon: Clock,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    activeColor: 'bg-blue-600 text-white',
    label: 'Creado',
    order: 1
  },
  en_planificacion: {
    icon: FileEdit,
    color: 'text-slate-600',
    bgColor: 'bg-slate-100',
    activeColor: 'bg-slate-600 text-white',
    label: 'Planificación',
    order: 2
  },
  listas_pendientes: {
    icon: AlertTriangle,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
    activeColor: 'bg-yellow-600 text-white',
    label: 'Listas Pend.',
    order: 3
  },
  listas_aprobadas: {
    icon: CheckCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    activeColor: 'bg-green-600 text-white',
    label: 'Listas Aprob.',
    order: 4
  },
  pedidos_creados: {
    icon: Truck,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    activeColor: 'bg-purple-600 text-white',
    label: 'Pedidos',
    order: 5
  },
  en_ejecucion: {
    icon: PlayCircle,
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-100',
    activeColor: 'bg-cyan-600 text-white',
    label: 'Ejecución',
    order: 6
  },
  en_cierre: {
    icon: FileCheck,
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
    activeColor: 'bg-amber-600 text-white',
    label: 'Cierre',
    order: 7
  },
  cerrado: {
    icon: Lock,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100',
    activeColor: 'bg-emerald-600 text-white',
    label: 'Cerrado',
    order: 8
  },
  pausado: {
    icon: PauseCircle,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
    activeColor: 'bg-orange-600 text-white',
    label: 'Pausado',
    order: 0
  },
  cancelado: {
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    activeColor: 'bg-red-600 text-white',
    label: 'Cancelado',
    order: 0
  }
}

// Main flow states (shown in stepper) - orden correcto del flujo
const mainFlowStates = ['creado', 'en_planificacion', 'listas_pendientes', 'listas_aprobadas', 'pedidos_creados', 'en_ejecucion', 'en_cierre', 'cerrado']
// Final/special states
const specialStates = ['pausado', 'cancelado']

export default function EstadoProyectoStepper({ proyecto, onUpdated, compact = false }: Props) {
  const [loadingEstado, setLoadingEstado] = useState<string | null>(null)
  const currentEstado = proyecto.estado || 'creado'
  const currentConfig = estadosConfig[currentEstado as keyof typeof estadosConfig]

  const handleEstadoChange = async (nuevoEstado: string) => {
    if (nuevoEstado === currentEstado) return

    try {
      setLoadingEstado(nuevoEstado)
      const response = await fetch(`/api/proyecto/${proyecto.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: nuevoEstado })
      })

      if (!response.ok) {
        throw new Error('Error al actualizar estado')
      }

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
    const index = mainFlowStates.indexOf(currentEstado)
    return index >= 0 ? index : -1
  }

  const currentStepIndex = getCurrentStepIndex()
  const isSpecialState = specialStates.includes(currentEstado)

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
              React.createElement(currentConfig?.icon || Clock, { className: 'h-3 w-3' })
            )}
            {currentConfig?.label}
            <ChevronDown className="h-3 w-3 ml-0.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-44">
          {mainFlowStates.map((estado) => {
            const config = estadosConfig[estado as keyof typeof estadosConfig]
            return (
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
            )
          })}
          <DropdownMenuSeparator />
          {specialStates.map((estado) => {
            const config = estadosConfig[estado as keyof typeof estadosConfig]
            return (
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
            )
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  // Full stepper version (simplified to show key states)
  // Flujo: Creado → Planificación → Listas → Pedidos → Ejecución → Cierre → Cerrado
  const stepperStates = ['creado', 'en_planificacion', 'listas_aprobadas', 'pedidos_creados', 'en_ejecucion', 'en_cierre', 'cerrado']

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {stepperStates.map((estado, index) => {
        const config = estadosConfig[estado as keyof typeof estadosConfig]
        const stepIndex = mainFlowStates.indexOf(estado)
        const isActive = currentEstado === estado ||
          (estado === 'listas_aprobadas' && currentEstado === 'listas_pendientes')
        const isPast = currentStepIndex > stepIndex

        return (
          <React.Fragment key={estado}>
            {index > 0 && (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            )}
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-7 gap-1 text-xs font-medium px-2 transition-all",
                isActive && config.activeColor,
                isPast && !isActive && `${config.bgColor} ${config.color}`,
                !isActive && !isPast && "text-muted-foreground hover:bg-muted"
              )}
              onClick={() => handleEstadoChange(estado)}
              disabled={loadingEstado !== null}
            >
              {loadingEstado === estado ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                React.createElement(config.icon, { className: 'h-3 w-3' })
              )}
              {config.label}
            </Button>
          </React.Fragment>
        )
      })}

      {/* Special states dropdown */}
      {isSpecialState ? (
        <>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
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
                {loadingEstado && specialStates.includes(loadingEstado) ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  React.createElement(currentConfig?.icon || PauseCircle, { className: 'h-3 w-3' })
                )}
                {currentConfig?.label}
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => handleEstadoChange('pausado')}
                disabled={loadingEstado !== null}
                className="gap-2"
              >
                <PauseCircle className="h-4 w-4 text-orange-600" />
                Pausado
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleEstadoChange('cancelado')}
                disabled={loadingEstado !== null}
                className="gap-2"
              >
                <XCircle className="h-4 w-4 text-red-600" />
                Cancelado
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      ) : (
        <>
          <span className="text-muted-foreground text-xs mx-1">|</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1 text-xs font-medium px-2 text-muted-foreground hover:bg-muted"
                disabled={loadingEstado !== null}
              >
                <PauseCircle className="h-3 w-3" />
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => handleEstadoChange('pausado')}
                disabled={loadingEstado !== null}
                className="gap-2"
              >
                <PauseCircle className="h-4 w-4 text-orange-600" />
                Pausar proyecto
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleEstadoChange('cancelado')}
                disabled={loadingEstado !== null}
                className="gap-2"
              >
                <XCircle className="h-4 w-4 text-red-600" />
                Cancelar proyecto
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      )}
    </div>
  )
}
