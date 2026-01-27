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
  DollarSign,
  FileCheck,
  Send,
  Handshake,
  FolderKanban,
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
    label: 'Contacto Cliente',
    shortLabel: 'Contacto',
    order: 2,
    group: 'preparacion'
  },
  validacion_tecnica: {
    icon: ClipboardCheck,
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-100',
    activeColor: 'bg-cyan-600 text-white',
    label: 'Validación Técnica',
    shortLabel: 'V. Técnica',
    order: 3,
    group: 'preparacion'
  },
  consolidacion_precios: {
    icon: DollarSign,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100',
    activeColor: 'bg-indigo-600 text-white',
    label: 'Consolidación Precios',
    shortLabel: 'Precios',
    order: 4,
    group: 'preparacion'
  },
  validacion_comercial: {
    icon: FileCheck,
    color: 'text-violet-600',
    bgColor: 'bg-violet-100',
    activeColor: 'bg-violet-600 text-white',
    label: 'Validación Comercial',
    shortLabel: 'V. Comercial',
    order: 5,
    group: 'preparacion'
  },
  seguimiento_cliente: {
    icon: Send,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
    activeColor: 'bg-yellow-600 text-white',
    label: 'Seguimiento Cliente',
    shortLabel: 'Seguimiento',
    order: 6,
    group: 'seguimiento'
  },
  negociacion: {
    icon: Handshake,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
    activeColor: 'bg-orange-600 text-white',
    label: 'Negociación',
    shortLabel: 'Negociación',
    order: 7,
    group: 'seguimiento'
  },
  seguimiento_proyecto: {
    icon: FolderKanban,
    color: 'text-teal-600',
    bgColor: 'bg-teal-100',
    activeColor: 'bg-teal-600 text-white',
    label: 'Seguimiento Proyecto',
    shortLabel: 'Proyecto',
    order: 8,
    group: 'seguimiento'
  },
  cerrada_ganada: {
    icon: Trophy,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    activeColor: 'bg-green-600 text-white',
    label: 'Cerrada Ganada',
    shortLabel: 'Ganada',
    order: 9,
    group: 'cierre'
  },
  cerrada_perdida: {
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    activeColor: 'bg-red-600 text-white',
    label: 'Cerrada Perdida',
    shortLabel: 'Perdida',
    order: 9,
    group: 'cierre'
  }
}

// Key phases for simplified stepper view
const keyPhases = ['inicio', 'contacto_cliente', 'seguimiento_cliente', 'negociacion', 'final'] as const
const preparacionStates = ['validacion_tecnica', 'consolidacion_precios', 'validacion_comercial']
const seguimientoStates = ['seguimiento_proyecto']
const finalStates = ['cerrada_ganada', 'cerrada_perdida']

// All states in order for dropdown
const allStatesOrdered = [
  'inicio',
  'contacto_cliente',
  'validacion_tecnica',
  'consolidacion_precios',
  'validacion_comercial',
  'seguimiento_cliente',
  'negociacion',
  'seguimiento_proyecto',
  'cerrada_ganada',
  'cerrada_perdida'
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
          <DropdownMenuLabel className="text-xs text-muted-foreground">Preparación</DropdownMenuLabel>
          {['contacto_cliente', 'validacion_tecnica', 'consolidacion_precios', 'validacion_comercial'].map(estado => {
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
          <DropdownMenuLabel className="text-xs text-muted-foreground">Seguimiento</DropdownMenuLabel>
          {['seguimiento_cliente', 'negociacion', 'seguimiento_proyecto'].map(estado => {
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
          <DropdownMenuLabel className="text-xs text-muted-foreground">Cierre</DropdownMenuLabel>
          <DropdownMenuItem
            onClick={() => handleEtapaChange('cerrada_ganada')}
            disabled={loadingEtapa !== null}
            className={cn("gap-2", currentEstado === 'cerrada_ganada' && "bg-muted")}
          >
            <Trophy className="h-4 w-4 text-green-600" />
            Cerrada Ganada
            {currentEstado === 'cerrada_ganada' && <CheckCircle className="h-3 w-3 ml-auto text-green-500" />}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleEtapaChange('cerrada_perdida')}
            disabled={loadingEtapa !== null}
            className={cn("gap-2", currentEstado === 'cerrada_perdida' && "bg-muted")}
          >
            <XCircle className="h-4 w-4 text-red-600" />
            Cerrada Perdida
            {currentEstado === 'cerrada_perdida' && <CheckCircle className="h-3 w-3 ml-auto text-green-500" />}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  // Full stepper version - simplified with key phases and dropdowns for sub-phases
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

      {/* Phase 2: Preparación (dropdown with sub-phases) */}
      <PreparacionDropdown
        currentEstado={currentEstado}
        currentStepIndex={currentStepIndex}
        loadingEtapa={loadingEtapa}
        onEtapaChange={handleEtapaChange}
      />

      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />

      {/* Phase 3: Seguimiento Cliente */}
      <StepButton
        estado="seguimiento_cliente"
        config={etapasConfig.seguimiento_cliente}
        isActive={currentEstado === 'seguimiento_cliente'}
        isPast={currentStepIndex > 6}
        isLoading={loadingEtapa === 'seguimiento_cliente'}
        disabled={loadingEtapa !== null}
        onClick={() => handleEtapaChange('seguimiento_cliente')}
      />

      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />

      {/* Phase 4: Negociación */}
      <StepButton
        estado="negociacion"
        config={etapasConfig.negociacion}
        isActive={currentEstado === 'negociacion'}
        isPast={currentStepIndex > 7}
        isLoading={loadingEtapa === 'negociacion'}
        disabled={loadingEtapa !== null}
        onClick={() => handleEtapaChange('negociacion')}
      />

      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />

      {/* Phase 5: Seguimiento Proyecto (optional) */}
      <StepButton
        estado="seguimiento_proyecto"
        config={etapasConfig.seguimiento_proyecto}
        isActive={currentEstado === 'seguimiento_proyecto'}
        isPast={currentStepIndex > 8}
        isLoading={loadingEtapa === 'seguimiento_proyecto'}
        disabled={loadingEtapa !== null}
        onClick={() => handleEtapaChange('seguimiento_proyecto')}
      />

      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />

      {/* Phase 6: Final (Ganada/Perdida) */}
      {finalStates.includes(currentEstado) ? (
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
              {currentConfig?.shortLabel}
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

// Dropdown for Preparación sub-phases
interface PreparacionDropdownProps {
  currentEstado: string
  currentStepIndex: number
  loadingEtapa: string | null
  onEtapaChange: (estado: string) => void
}

function PreparacionDropdown({ currentEstado, currentStepIndex, loadingEtapa, onEtapaChange }: PreparacionDropdownProps) {
  const preparacionEstados = ['contacto_cliente', 'validacion_tecnica', 'consolidacion_precios', 'validacion_comercial']
  const isInPreparacion = preparacionEstados.includes(currentEstado)
  const isPast = currentStepIndex > 5

  const currentConfig = isInPreparacion
    ? etapasConfig[currentEstado as keyof typeof etapasConfig]
    : etapasConfig.contacto_cliente

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-7 gap-1 text-xs font-medium px-2 transition-all",
            isInPreparacion && currentConfig.activeColor,
            isPast && !isInPreparacion && "bg-blue-100 text-blue-600",
            !isInPreparacion && !isPast && "text-muted-foreground hover:bg-muted"
          )}
          disabled={loadingEtapa !== null}
        >
          {loadingEtapa && preparacionEstados.includes(loadingEtapa) ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            React.createElement(currentConfig.icon, { className: 'h-3 w-3' })
          )}
          {isInPreparacion ? currentConfig.shortLabel : 'Preparación'}
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        <DropdownMenuLabel className="text-xs text-muted-foreground">Etapas de Preparación</DropdownMenuLabel>
        {preparacionEstados.map(estado => {
          const config = etapasConfig[estado as keyof typeof etapasConfig]
          return (
            <DropdownMenuItem
              key={estado}
              onClick={() => onEtapaChange(estado)}
              disabled={loadingEtapa !== null}
              className={cn("gap-2", currentEstado === estado && "bg-muted")}
            >
              {React.createElement(config.icon, { className: `h-4 w-4 ${config.color}` })}
              {config.label}
              {currentEstado === estado && <CheckCircle className="h-3 w-3 ml-auto text-green-500" />}
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
