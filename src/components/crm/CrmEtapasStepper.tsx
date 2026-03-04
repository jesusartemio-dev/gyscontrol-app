'use client'

import React, { useState } from 'react'
import { CrmOportunidad, cambiarEstadoOportunidad, updateOportunidad } from '@/lib/services/crm/oportunidades'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
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
  ChevronDown,
  CheckCircle,
  FileText,
  MessageSquareWarning
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { StepPill, StepLine, type StepStatus } from '@/components/ui/status-stepper'

interface Props {
  oportunidad: CrmOportunidad
  onUpdated: (oportunidad: CrmOportunidad) => void
  compact?: boolean
}

const etapasConfig = {
  inicio: { icon: Target, color: 'text-purple-600', bgColor: 'bg-purple-100', activeColor: 'bg-purple-600 text-white', label: 'Inicio', shortLabel: 'Inicio', order: 1, group: 'inicio' },
  contacto_cliente: { icon: Users, color: 'text-blue-600', bgColor: 'bg-blue-100', activeColor: 'bg-blue-600 text-white', label: 'Contacto', shortLabel: 'Contacto', order: 2, group: 'contacto' },
  validacion_tecnica: { icon: ClipboardCheck, color: 'text-cyan-600', bgColor: 'bg-cyan-100', activeColor: 'bg-cyan-600 text-white', label: 'Validación Técnica', shortLabel: 'V. Técnica', description: 'Alcance y recursos necesarios', order: 3, group: 'propuesta' },
  validacion_comercial: { icon: FileCheck, color: 'text-violet-600', bgColor: 'bg-violet-100', activeColor: 'bg-violet-600 text-white', label: 'Validación Comercial', shortLabel: 'V. Comercial', description: 'Costeo, margen, condiciones', order: 4, group: 'propuesta' },
  negociacion: { icon: Handshake, color: 'text-orange-600', bgColor: 'bg-orange-100', activeColor: 'bg-orange-600 text-white', label: 'Negociación', shortLabel: 'Negociación', description: 'Post-envío de cotización', order: 5, group: 'negociacion' },
  seguimiento_proyecto: { icon: FolderKanban, color: 'text-green-600', bgColor: 'bg-green-100', activeColor: 'bg-green-600 text-white', label: 'Seguimiento Proyecto', shortLabel: 'Seg. Proyecto', description: 'Seguimiento de ejecución', order: 6, group: 'cierre' },
  feedback_mejora: { icon: MessageSquareWarning, color: 'text-red-600', bgColor: 'bg-red-100', activeColor: 'bg-red-600 text-white', label: 'Feedback de Mejora', shortLabel: 'Feedback', description: 'Motivo, competidor, aprendizajes', order: 6, group: 'cierre' },
  cerrada_ganada: { icon: Trophy, color: 'text-green-600', bgColor: 'bg-green-100', activeColor: 'bg-green-600 text-white', label: 'Cerrada Ganada', shortLabel: 'Ganada', order: 6, group: 'cierre' },
  cerrada_perdida: { icon: XCircle, color: 'text-red-600', bgColor: 'bg-red-100', activeColor: 'bg-red-600 text-white', label: 'Cerrada Perdida', shortLabel: 'Perdida', order: 6, group: 'cierre' },
}

const propuestaStates = ['validacion_tecnica', 'validacion_comercial']
const cierreGanadoStates = ['seguimiento_proyecto', 'cerrada_ganada']
const cierrePerdidoStates = ['feedback_mejora', 'cerrada_perdida']
const allCierreStates = [...cierreGanadoStates, ...cierrePerdidoStates]

const activeStates = ['inicio', 'contacto_cliente', 'validacion_tecnica', 'validacion_comercial', 'negociacion']
const terminalStates = ['seguimiento_proyecto', 'feedback_mejora']

const validTransitions: Record<string, string[]> = {
  inicio: ['contacto_cliente', 'feedback_mejora'],
  contacto_cliente: ['validacion_tecnica', 'validacion_comercial', 'feedback_mejora'],
  validacion_tecnica: ['validacion_comercial', 'negociacion', 'feedback_mejora'],
  validacion_comercial: ['validacion_tecnica', 'negociacion', 'feedback_mejora'],
  negociacion: ['seguimiento_proyecto', 'feedback_mejora'],
  seguimiento_proyecto: [...activeStates, 'feedback_mejora'],
  feedback_mejora: [...activeStates, 'seguimiento_proyecto'],
  cerrada_ganada: [...activeStates, 'seguimiento_proyecto', 'feedback_mejora'],
  cerrada_perdida: [...activeStates, 'seguimiento_proyecto', 'feedback_mejora'],
}

const CRM_MOTIVOS_PERDIDA = [
  { value: 'precio', label: 'Precio más alto que competencia' },
  { value: 'tiempo', label: 'Tiempo de entrega' },
  { value: 'tecnico', label: 'Especificaciones técnicas' },
  { value: 'relacion', label: 'Relación con cliente' },
  { value: 'competidor', label: 'Mejor propuesta de competidor' },
  { value: 'presupuesto', label: 'Cliente sin presupuesto' },
  { value: 'cancelado', label: 'Proyecto cancelado por cliente' },
  { value: 'otro', label: 'Otro motivo' }
]

function isValidTransition(from: string, to: string): boolean {
  const allowed = validTransitions[from]
  if (!allowed) return false
  return allowed.includes(to)
}

export default function CrmEtapasStepper({ oportunidad, onUpdated, compact = false }: Props) {
  const [loadingEtapa, setLoadingEtapa] = useState<string | null>(null)
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [feedbackMotivo, setFeedbackMotivo] = useState('')
  const [feedbackCompetidor, setFeedbackCompetidor] = useState('')
  const [feedbackAprendizajes, setFeedbackAprendizajes] = useState('')
  const [feedbackLoading, setFeedbackLoading] = useState(false)
  const currentEstado = oportunidad.estado || 'inicio'
  const currentConfig = etapasConfig[currentEstado as keyof typeof etapasConfig]
  const currentStepIndex = currentConfig?.order || 1

  const handleEtapaChange = async (nuevaEtapa: string) => {
    if (nuevaEtapa === currentEstado) return

    if (!isValidTransition(currentEstado, nuevaEtapa)) {
      const fromLabel = etapasConfig[currentEstado as keyof typeof etapasConfig]?.label || currentEstado
      const toLabel = etapasConfig[nuevaEtapa as keyof typeof etapasConfig]?.label || nuevaEtapa
      toast.error(`No se puede pasar de ${fromLabel} a ${toLabel} directamente`)
      return
    }

    if (nuevaEtapa === 'feedback_mejora') {
      setFeedbackMotivo('')
      setFeedbackCompetidor('')
      setFeedbackAprendizajes('')
      setFeedbackOpen(true)
      return
    }

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

  const handleFeedbackSubmit = async () => {
    if (!feedbackMotivo) {
      toast.error('Selecciona un motivo de pérdida')
      return
    }
    try {
      setFeedbackLoading(true)
      const oportunidadActualizada = await updateOportunidad(oportunidad.id, {
        estado: 'feedback_mejora',
        motivoPerdida: feedbackMotivo,
        competidorGanador: feedbackCompetidor || undefined,
        aprendizajes: feedbackAprendizajes || undefined,
      })
      onUpdated(oportunidadActualizada)
      setFeedbackOpen(false)
      toast.success('Estado actualizado a Feedback de Mejora')
    } catch {
      toast.error('Error al registrar feedback')
    } finally {
      setFeedbackLoading(false)
    }
  }

  const feedbackDialog = (
    <Dialog open={feedbackOpen} onOpenChange={setFeedbackOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Feedback de Mejora</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="motivoPerdida">Motivo de pérdida *</Label>
            <Select value={feedbackMotivo} onValueChange={setFeedbackMotivo}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecciona un motivo" />
              </SelectTrigger>
              <SelectContent>
                {CRM_MOTIVOS_PERDIDA.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="competidorGanador">Competidor ganador (opcional)</Label>
            <Input
              id="competidorGanador"
              value={feedbackCompetidor}
              onChange={(e) => setFeedbackCompetidor(e.target.value)}
              placeholder="Nombre del competidor"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="aprendizajes">Aprendizajes (opcional)</Label>
            <Textarea
              id="aprendizajes"
              value={feedbackAprendizajes}
              onChange={(e) => setFeedbackAprendizajes(e.target.value)}
              placeholder="Lecciones aprendidas, mejoras a considerar..."
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setFeedbackOpen(false)} disabled={feedbackLoading}>
            Cancelar
          </Button>
          <Button onClick={handleFeedbackSubmit} disabled={feedbackLoading}>
            {feedbackLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Guardar Feedback
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )

  // Compact version: dropdown with current status
  if (compact) {
    return (
      <>
        {feedbackDialog}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn("h-7 gap-1.5 text-xs font-medium border-0", currentConfig?.activeColor)}
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
            <DropdownMenuItem onClick={() => handleEtapaChange('inicio')} disabled={loadingEtapa !== null} className={cn("gap-2", currentEstado === 'inicio' && "bg-muted")}>
              <Target className="h-4 w-4 text-purple-600" />
              Inicio
              {currentEstado === 'inicio' && <CheckCircle className="h-3 w-3 ml-auto text-green-500" />}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground">Contacto</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => handleEtapaChange('contacto_cliente')} disabled={loadingEtapa !== null} className={cn("gap-2", currentEstado === 'contacto_cliente' && "bg-muted")}>
              <Users className="h-4 w-4 text-blue-600" />
              Contacto
              {currentEstado === 'contacto_cliente' && <CheckCircle className="h-3 w-3 ml-auto text-green-500" />}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground">Propuesta</DropdownMenuLabel>
            {propuestaStates.map(estado => {
              const config = etapasConfig[estado as keyof typeof etapasConfig]
              return (
                <DropdownMenuItem key={estado} onClick={() => handleEtapaChange(estado)} disabled={loadingEtapa !== null} className={cn("gap-2", currentEstado === estado && "bg-muted")}>
                  {React.createElement(config.icon, { className: `h-4 w-4 ${config.color}` })}
                  {config.label}
                  {currentEstado === estado && <CheckCircle className="h-3 w-3 ml-auto text-green-500" />}
                </DropdownMenuItem>
              )
            })}
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground">Negociación</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => handleEtapaChange('negociacion')} disabled={loadingEtapa !== null} className={cn("gap-2", currentEstado === 'negociacion' && "bg-muted")}>
              <Handshake className="h-4 w-4 text-orange-600" />
              Negociación
              {currentEstado === 'negociacion' && <CheckCircle className="h-3 w-3 ml-auto text-green-500" />}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground">Cierre</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => handleEtapaChange('seguimiento_proyecto')} disabled={loadingEtapa !== null} className={cn("gap-2", cierreGanadoStates.includes(currentEstado) && "bg-muted")}>
              <FolderKanban className="h-4 w-4 text-green-600" />
              Seguimiento Proyecto
              {cierreGanadoStates.includes(currentEstado) && <CheckCircle className="h-3 w-3 ml-auto text-green-500" />}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleEtapaChange('feedback_mejora')} disabled={loadingEtapa !== null} className={cn("gap-2", cierrePerdidoStates.includes(currentEstado) && "bg-muted")}>
              <MessageSquareWarning className="h-4 w-4 text-red-600" />
              Feedback de Mejora
              {cierrePerdidoStates.includes(currentEstado) && <CheckCircle className="h-3 w-3 ml-auto text-green-500" />}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </>
    )
  }

  // Helper to get pill status for a step
  const getStepStatus = (order: number): StepStatus => {
    if (currentStepIndex > order) return 'completed'
    if (currentStepIndex === order) return 'current'
    return 'future'
  }

  // Propuesta dropdown pill
  const isInPropuesta = propuestaStates.includes(currentEstado)
  const isPropuestaPast = currentStepIndex > 4
  const propuestaStatus: StepStatus = isInPropuesta ? 'current' : isPropuestaPast ? 'completed' : 'future'
  const propuestaLabel = isInPropuesta
    ? (etapasConfig[currentEstado as keyof typeof etapasConfig]?.shortLabel || 'Propuesta')
    : 'Propuesta'

  // Cierre status
  const isInCierre = allCierreStates.includes(currentEstado)
  const cierreStatus: StepStatus = isInCierre
    ? (cierrePerdidoStates.includes(currentEstado) ? 'rejected' : 'current')
    : 'future'

  // Full stepper version with pills
  return (
    <>
      {feedbackDialog}
      <div className="flex items-center gap-1 flex-wrap">
        <div className="flex items-center">
          {/* Phase 1: Inicio */}
          <StepPill
            label="Inicio"
            status={getStepStatus(1)}
            interactive
            loading={loadingEtapa === 'inicio'}
            disabled={loadingEtapa !== null}
            onClick={() => handleEtapaChange('inicio')}
          />

          <StepLine nextStatus={getStepStatus(2)} />

          {/* Phase 2: Contacto */}
          <StepPill
            label="Contacto"
            status={getStepStatus(2)}
            interactive
            loading={loadingEtapa === 'contacto_cliente'}
            disabled={loadingEtapa !== null}
            onClick={() => handleEtapaChange('contacto_cliente')}
          />

          <StepLine nextStatus={propuestaStatus} />

          {/* Phase 3: Propuesta (dropdown) */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <span>
                <StepPill
                  label={propuestaLabel}
                  status={propuestaStatus}
                  interactive
                >
                  <ChevronDown className="h-3 w-3" />
                </StepPill>
              </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuLabel className="text-xs text-muted-foreground">Etapas de Propuesta</DropdownMenuLabel>
              {propuestaStates.map(estado => {
                const config = etapasConfig[estado as keyof typeof etapasConfig]
                return (
                  <DropdownMenuItem
                    key={estado}
                    onClick={() => handleEtapaChange(estado)}
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

          <StepLine nextStatus={getStepStatus(5)} />

          {/* Phase 4: Negociación */}
          <StepPill
            label="Negociación"
            status={getStepStatus(5)}
            interactive
            loading={loadingEtapa === 'negociacion'}
            disabled={loadingEtapa !== null}
            onClick={() => handleEtapaChange('negociacion')}
          />

          <StepLine nextStatus={cierreStatus} />

          {/* Phase 5: Cierre (Seg. Proyecto / Feedback) */}
          {isInCierre ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <span>
                  <StepPill
                    label={currentConfig?.shortLabel || ''}
                    status={cierreStatus}
                  >
                    <ChevronDown className="h-3 w-3" />
                  </StepPill>
                </span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleEtapaChange('seguimiento_proyecto')} disabled={loadingEtapa !== null} className="gap-2">
                  <FolderKanban className="h-4 w-4 text-green-600" />
                  Seguimiento Proyecto
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleEtapaChange('feedback_mejora')} disabled={loadingEtapa !== null} className="gap-2">
                  <MessageSquareWarning className="h-4 w-4 text-red-600" />
                  Feedback de Mejora
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-1">
              <StepPill
                label="Seg. Proyecto"
                status="future"
                interactive
                loading={loadingEtapa === 'seguimiento_proyecto'}
                disabled={loadingEtapa !== null}
                onClick={() => handleEtapaChange('seguimiento_proyecto')}
              />
              <span className="text-muted-foreground text-xs">/</span>
              <StepPill
                label="Feedback"
                status="future"
                interactive
                loading={loadingEtapa === 'feedback_mejora'}
                disabled={loadingEtapa !== null}
                onClick={() => handleEtapaChange('feedback_mejora')}
              />
            </div>
          )}
        </div>
      </div>
    </>
  )
}
