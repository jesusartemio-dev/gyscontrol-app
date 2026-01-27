'use client'

import React, { useState } from 'react'
import { CrmOportunidad } from '@/lib/services/crm/oportunidades'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { cambiarEstadoOportunidad } from '@/lib/services/crm/oportunidades'
import {
  Target,
  Users,
  ClipboardCheck,
  FileCheck,
  Handshake,
  FolderKanban,
  Trophy,
  XCircle,
  Loader2,
  ChevronRight,
  ChevronDown,
  CheckCircle,
  FileText,
  MessageSquareWarning
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  oportunidad: CrmOportunidad
  onUpdated: (oportunidad: CrmOportunidad) => void
  compact?: boolean
}

// Configuración de etapas del flujo CRM
// Flujo: Inicio → Contacto → Propuesta (V.Técnica / V.Comercial) → Negociación → [Seg.Proyecto / Feedback]
const etapasConfig = {
  inicio: {
    icon: Target,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    activeColor: 'bg-purple-600 text-white',
    label: 'Inicio',
    shortLabel: 'Inicio',
    order: 1,
    group: 'inicio'
  },
  contacto_cliente: {
    icon: Users,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    activeColor: 'bg-blue-600 text-white',
    label: 'Contacto',
    shortLabel: 'Contacto',
    order: 2,
    group: 'contacto'
  },
  validacion_tecnica: {
    icon: ClipboardCheck,
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-100',
    activeColor: 'bg-cyan-600 text-white',
    label: 'Validación Técnica',
    shortLabel: 'V. Técnica',
    description: 'Alcance y recursos necesarios',
    order: 3,
    group: 'propuesta'
  },
  validacion_comercial: {
    icon: FileCheck,
    color: 'text-violet-600',
    bgColor: 'bg-violet-100',
    activeColor: 'bg-violet-600 text-white',
    label: 'Validación Comercial',
    shortLabel: 'V. Comercial',
    description: 'Costeo, margen, condiciones',
    order: 4,
    group: 'propuesta'
  },
  negociacion: {
    icon: Handshake,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
    activeColor: 'bg-orange-600 text-white',
    label: 'Negociación',
    shortLabel: 'Negociación',
    description: 'Post-envío de cotización',
    order: 5,
    group: 'negociacion'
  },
  seguimiento_proyecto: {
    icon: FolderKanban,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    activeColor: 'bg-green-600 text-white',
    label: 'Seguimiento Proyecto',
    shortLabel: 'Seg. Proyecto',
    description: 'Seguimiento de ejecución',
    order: 6,
    group: 'cierre'
  },
  feedback_mejora: {
    icon: MessageSquareWarning,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    activeColor: 'bg-red-600 text-white',
    label: 'Feedback de Mejora',
    shortLabel: 'Feedback',
    description: 'Motivo, competidor, aprendizajes',
    order: 6,
    group: 'cierre'
  },
  // Legacy states - mantener para compatibilidad con datos existentes
  cerrada_ganada: {
    icon: Trophy,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    activeColor: 'bg-green-600 text-white',
    label: 'Cerrada Ganada',
    shortLabel: 'Ganada',
    order: 6,
    group: 'cierre'
  },
  cerrada_perdida: {
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    activeColor: 'bg-red-600 text-white',
    label: 'Cerrada Perdida',
    shortLabel: 'Perdida',
    order: 6,
    group: 'cierre'
  }
}

// Estados por grupo
const propuestaStates = ['validacion_tecnica', 'validacion_comercial']
const cierreGanadoStates = ['seguimiento_proyecto', 'cerrada_ganada']
const cierrePerdidoStates = ['feedback_mejora', 'cerrada_perdida']
const allCierreStates = [...cierreGanadoStates, ...cierrePerdidoStates]

// Todos los estados en orden para dropdown
const allStatesOrdered = [
  'inicio',
  'contacto_cliente',
  'validacion_tecnica',
  'validacion_comercial',
  'negociacion',
  'seguimiento_proyecto',
  'feedback_mejora'
]

export default function CrmEtapasStepper({ oportunidad, onUpdated, compact = false }: Props) {
  const [loadingEtapa, setLoadingEtapa] = useState<string | null>(null)
  const currentEstado = oportunidad.estado || 'inicio'
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

  // Get the step index for the current estado (for visual progress)
  const getCurrentStepIndex = () => {
    const config = etapasConfig[currentEstado as keyof typeof etapasConfig]
    return config?.order || 1
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
            {currentConfig?.shortLabel}
            <ChevronDown className="h-3 w-3 ml-0.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-52">
          <DropdownMenuLabel className="text-xs text-muted-foreground">Inicio</DropdownMenuLabel>
          <DropdownMenuItem
            onClick={() => handleEtapaChange('inicio')}
            disabled={loadingEtapa !== null}
            className={cn("gap-2", currentEstado === 'inicio' && "bg-muted")}
          >
            <Target className="h-4 w-4 text-purple-600" />
            Inicio
            {currentEstado === 'inicio' && <CheckCircle className="h-3 w-3 ml-auto text-green-500" />}
          </DropdownMenuItem>

          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-xs text-muted-foreground">Contacto</DropdownMenuLabel>
          <DropdownMenuItem
            onClick={() => handleEtapaChange('contacto_cliente')}
            disabled={loadingEtapa !== null}
            className={cn("gap-2", currentEstado === 'contacto_cliente' && "bg-muted")}
          >
            <Users className="h-4 w-4 text-blue-600" />
            Contacto
            {currentEstado === 'contacto_cliente' && <CheckCircle className="h-3 w-3 ml-auto text-green-500" />}
          </DropdownMenuItem>

          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-xs text-muted-foreground">Propuesta</DropdownMenuLabel>
          {propuestaStates.map(estado => {
            const config = etapasConfig[estado as keyof typeof etapasConfig]
            return (
              <DropdownMenuItem
                key={estado}
                onClick={() => handleEtapaChange(estado)}
                disabled={loadingEtapa !== null}
                className={cn("gap-2", currentEstado === estado && "bg-muted")}
              >
                {React.createElement(config.icon, { className: `h-4 w-4 ${config.color}` })}
                {config.label}
                {currentEstado === estado && <CheckCircle className="h-3 w-3 ml-auto text-green-500" />}
              </DropdownMenuItem>
            )
          })}

          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-xs text-muted-foreground">Negociación</DropdownMenuLabel>
          <DropdownMenuItem
            onClick={() => handleEtapaChange('negociacion')}
            disabled={loadingEtapa !== null}
            className={cn("gap-2", currentEstado === 'negociacion' && "bg-muted")}
          >
            <Handshake className="h-4 w-4 text-orange-600" />
            Negociación
            {currentEstado === 'negociacion' && <CheckCircle className="h-3 w-3 ml-auto text-green-500" />}
          </DropdownMenuItem>

          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-xs text-muted-foreground">Cierre</DropdownMenuLabel>
          <DropdownMenuItem
            onClick={() => handleEtapaChange('seguimiento_proyecto')}
            disabled={loadingEtapa !== null}
            className={cn("gap-2", cierreGanadoStates.includes(currentEstado) && "bg-muted")}
          >
            <FolderKanban className="h-4 w-4 text-green-600" />
            Seguimiento Proyecto
            {cierreGanadoStates.includes(currentEstado) && <CheckCircle className="h-3 w-3 ml-auto text-green-500" />}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleEtapaChange('feedback_mejora')}
            disabled={loadingEtapa !== null}
            className={cn("gap-2", cierrePerdidoStates.includes(currentEstado) && "bg-muted")}
          >
            <MessageSquareWarning className="h-4 w-4 text-red-600" />
            Feedback de Mejora
            {cierrePerdidoStates.includes(currentEstado) && <CheckCircle className="h-3 w-3 ml-auto text-green-500" />}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  // Full stepper version - Flujo: Inicio → Contacto → Propuesta → Negociación → [Seg. Proyecto / Feedback]
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {/* Phase 1: Inicio */}
      <StepButton
        estado="inicio"
        config={etapasConfig.inicio}
        isActive={currentEstado === 'inicio'}
        isPast={currentStepIndex > 1}
        isLoading={loadingEtapa === 'inicio'}
        disabled={loadingEtapa !== null}
        onClick={() => handleEtapaChange('inicio')}
      />

      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />

      {/* Phase 2: Contacto */}
      <StepButton
        estado="contacto_cliente"
        config={etapasConfig.contacto_cliente}
        isActive={currentEstado === 'contacto_cliente'}
        isPast={currentStepIndex > 2}
        isLoading={loadingEtapa === 'contacto_cliente'}
        disabled={loadingEtapa !== null}
        onClick={() => handleEtapaChange('contacto_cliente')}
      />

      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />

      {/* Phase 3: Propuesta (dropdown con validacion_tecnica, validacion_comercial) */}
      <PropuestaDropdown
        currentEstado={currentEstado}
        currentStepIndex={currentStepIndex}
        loadingEtapa={loadingEtapa}
        onEtapaChange={handleEtapaChange}
      />

      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />

      {/* Phase 4: Negociación (estado único) */}
      <StepButton
        estado="negociacion"
        config={etapasConfig.negociacion}
        isActive={currentEstado === 'negociacion'}
        isPast={currentStepIndex > 5}
        isLoading={loadingEtapa === 'negociacion'}
        disabled={loadingEtapa !== null}
        onClick={() => handleEtapaChange('negociacion')}
      />

      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />

      {/* Phase 5: Cierre (Seguimiento Proyecto / Feedback de Mejora) */}
      {allCierreStates.includes(currentEstado) ? (
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
              {loadingEtapa && allCierreStates.includes(loadingEtapa) ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                React.createElement(currentConfig?.icon || FolderKanban, { className: 'h-3 w-3' })
              )}
              {currentConfig?.shortLabel}
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => handleEtapaChange('seguimiento_proyecto')}
              disabled={loadingEtapa !== null}
              className="gap-2"
            >
              <FolderKanban className="h-4 w-4 text-green-600" />
              Seguimiento Proyecto
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleEtapaChange('feedback_mejora')}
              disabled={loadingEtapa !== null}
              className="gap-2"
            >
              <MessageSquareWarning className="h-4 w-4 text-red-600" />
              Feedback de Mejora
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 text-xs font-medium px-2 text-green-600 hover:bg-green-50 hover:text-green-700"
            onClick={() => handleEtapaChange('seguimiento_proyecto')}
            disabled={loadingEtapa !== null}
          >
            {loadingEtapa === 'seguimiento_proyecto' ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <FolderKanban className="h-3 w-3" />
            )}
            Seg. Proyecto
          </Button>
          <span className="text-muted-foreground text-xs">/</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 text-xs font-medium px-2 text-red-600 hover:bg-red-50 hover:text-red-700"
            onClick={() => handleEtapaChange('feedback_mejora')}
            disabled={loadingEtapa !== null}
          >
            {loadingEtapa === 'feedback_mejora' ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <MessageSquareWarning className="h-3 w-3" />
            )}
            Feedback
          </Button>
        </div>
      )}
    </div>
  )
}

// Dropdown for Propuesta sub-phases (Validación Técnica + Validación Comercial)
interface PropuestaDropdownProps {
  currentEstado: string
  currentStepIndex: number
  loadingEtapa: string | null
  onEtapaChange: (estado: string) => void
}

function PropuestaDropdown({ currentEstado, currentStepIndex, loadingEtapa, onEtapaChange }: PropuestaDropdownProps) {
  const isInPropuesta = propuestaStates.includes(currentEstado)
  const isPast = currentStepIndex > 4

  const currentConfig = isInPropuesta
    ? etapasConfig[currentEstado as keyof typeof etapasConfig]
    : etapasConfig.validacion_tecnica

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-7 gap-1 text-xs font-medium px-2 transition-all",
            isInPropuesta && currentConfig.activeColor,
            isPast && !isInPropuesta && "bg-cyan-100 text-cyan-600",
            !isInPropuesta && !isPast && "text-muted-foreground hover:bg-muted"
          )}
          disabled={loadingEtapa !== null}
        >
          {loadingEtapa && propuestaStates.includes(loadingEtapa) ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <FileText className="h-3 w-3" />
          )}
          {isInPropuesta ? currentConfig.shortLabel : 'Propuesta'}
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel className="text-xs text-muted-foreground">Etapas de Propuesta</DropdownMenuLabel>
        {propuestaStates.map(estado => {
          const config = etapasConfig[estado as keyof typeof etapasConfig]
          return (
            <DropdownMenuItem
              key={estado}
              onClick={() => onEtapaChange(estado)}
              disabled={loadingEtapa !== null}
              className={cn("gap-2 flex-col items-start", currentEstado === estado && "bg-muted")}
            >
              <div className="flex items-center gap-2 w-full">
                {React.createElement(config.icon, { className: `h-4 w-4 ${config.color}` })}
                <span className="flex-1">{config.label}</span>
                {currentEstado === estado && <CheckCircle className="h-3 w-3 text-green-500" />}
              </div>
              {'description' in config && (
                <span className="text-xs text-muted-foreground ml-6">{config.description}</span>
              )}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

interface StepButtonProps {
  estado: string
  config: typeof etapasConfig.inicio
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
      {config.shortLabel}
    </Button>
  )
}
