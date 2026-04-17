/**
 * PedidoEstadoFlujoBanner - Flujo de estados con píldoras conectadas
 */

'use client'

import React, { useState } from 'react'
import {
  Loader2,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { validarTransicionPedido } from '@/lib/utils/flujoPedidoEquipo'
import { useSession } from 'next-auth/react'
import { RollbackButton } from '@/components/RollbackButton'
import { StepPill, StepLine, type StepStatus } from '@/components/ui/status-stepper'

interface PedidoEstadoFlujoBannerProps {
  estado: string
  pedidoId: string
  pedidoNombre?: string
  usuarioId?: string
  contexto?: 'proyectos' | 'logistica'
  onUpdated?: (nuevoEstado: string) => void
}

const ESTADOS_FLUJO = [
  { key: 'borrador',  label: 'Borrador',  orden: 1 },
  { key: 'enviado',   label: 'Enviado',   orden: 2 },
  { key: 'aprobado',  label: 'Aprobado',  orden: 3 },
  { key: 'atendido',  label: 'Atendido',  orden: 4 },
  { key: 'parcial',   label: 'Parcial',   orden: 5 },
  { key: 'entregado', label: 'Entregado', orden: 6 },
]

const getEstadoLabel = (key: string) => {
  return ESTADOS_FLUJO.find(e => e.key === key)?.label || key
}

const getEstadoOrden = (key: string) => {
  return ESTADOS_FLUJO.find(e => e.key === key)?.orden || 0
}

const AVANZAR_POR_CONTEXTO: Record<string, string[]> = {
  proyectos: ['enviado', 'aprobado'],
  logistica: ['aprobado', 'atendido', 'parcial', 'entregado'],
}

const PedidoEstadoFlujoBanner: React.FC<PedidoEstadoFlujoBannerProps> = ({
  estado,
  pedidoId,
  contexto = 'logistica',
  onUpdated,
}) => {
  const { data: session } = useSession()
  const userRole = session?.user?.role || ''
  const [isUpdating, setIsUpdating] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [pendingEstado, setPendingEstado] = useState('')

  const currentOrden = getEstadoOrden(estado)

  const puedeAvanzarA = (target: string): boolean => {
    return validarTransicionPedido(estado, target, userRole).valido
  }

  const handleEstadoChange = (nuevoEstado: string) => {
    if (nuevoEstado === estado) return
    if (!puedeAvanzarA(nuevoEstado)) {
      toast.error('No se puede cambiar a este estado')
      return
    }
    setPendingEstado(nuevoEstado)
    setShowConfirmDialog(true)
  }

  const confirmarCambioEstado = async () => {
    try {
      setIsUpdating(true)
      const response = await fetch(`/api/pedido-equipo/${pedidoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: pendingEstado }),
      })

      if (!response.ok) throw new Error('Error al actualizar')

      toast.success(`Estado: ${getEstadoLabel(pendingEstado)}`)
      onUpdated?.(pendingEstado)
    } catch {
      toast.error('Error al actualizar el estado')
    } finally {
      setIsUpdating(false)
      setShowConfirmDialog(false)
      setPendingEstado('')
    }
  }

  const isCancelled = estado === 'cancelado'
  const puedeCancelar = !isCancelled && puedeAvanzarA('cancelado')

  // Build pill steps
  const steps = ESTADOS_FLUJO.map((est) => {
    let status: StepStatus = 'future'
    if (isCancelled) {
      status = 'future'
    } else if (est.orden < currentOrden) {
      status = 'completed'
    } else if (est.key === estado) {
      status = 'current'
    }

    const isSuperUser = ['admin', 'gerente'].includes(userRole)
    const isNext = est.orden === currentOrden + 1
    const contextoPermiteAvanzar = isSuperUser || (AVANZAR_POR_CONTEXTO[contexto] || []).includes(est.key)
    const canAdvance = !isCancelled && isNext && contextoPermiteAvanzar && puedeAvanzarA(est.key)

    return { ...est, status, canAdvance }
  })

  return (
    <>
      <div className="bg-white rounded-lg border p-3">
        <div className="flex items-center justify-between gap-4">
          {/* Flow pills */}
          <div className="flex items-center flex-1 overflow-x-auto">
            {steps.map((step, idx) => (
              <React.Fragment key={step.key}>
                {idx > 0 && <StepLine nextStatus={step.status} />}
                <StepPill
                  label={step.label}
                  status={step.status}
                  interactive={step.canAdvance}
                  disabled={isUpdating}
                  onClick={step.canAdvance ? () => handleEstadoChange(step.key) : undefined}
                />
              </React.Fragment>
            ))}

            {/* Cancelled pill */}
            {isCancelled && (
              <>
                <StepLine nextStatus="cancelled" />
                <StepPill label="Cancelado" status="cancelled" />
              </>
            )}
          </div>

          {/* Rollback buttons */}
          {estado === 'enviado' && ['admin', 'gerente', 'gestor', 'coordinador', 'coordinador_logistico'].includes(userRole) && (
            <RollbackButton
              entityType="pedidoEquipo"
              entityId={pedidoId}
              currentEstado={estado}
              targetEstado="borrador"
              targetLabel="Volver a Borrador"
              onSuccess={() => onUpdated?.('borrador')}
            />
          )}
          {estado === 'aprobado' && ['admin', 'gerente', 'gestor', 'coordinador', 'coordinador_logistico'].includes(userRole) && (
            <RollbackButton
              entityType="pedidoEquipo"
              entityId={pedidoId}
              currentEstado={estado}
              targetEstado="enviado"
              targetLabel="Volver a Enviado"
              onSuccess={() => onUpdated?.('enviado')}
            />
          )}
          {contexto === 'logistica' && estado === 'atendido' && ['admin', 'gerente', 'logistico', 'coordinador_logistico'].includes(userRole) && (
            <RollbackButton
              entityType="pedidoEquipo"
              entityId={pedidoId}
              currentEstado={estado}
              targetEstado="aprobado"
              targetLabel="Volver a Aprobado"
              onSuccess={() => onUpdated?.('aprobado')}
            />
          )}
          {contexto === 'logistica' && estado === 'parcial' && ['admin', 'gerente', 'logistico', 'coordinador_logistico'].includes(userRole) && (
            <RollbackButton
              entityType="pedidoEquipo"
              entityId={pedidoId}
              currentEstado={estado}
              targetEstado="atendido"
              targetLabel="Volver a Atendido"
              onSuccess={() => onUpdated?.('atendido')}
            />
          )}
          {contexto === 'logistica' && estado === 'entregado' && ['admin', 'gerente'].includes(userRole) && (
            <RollbackButton
              entityType="pedidoEquipo"
              entityId={pedidoId}
              currentEstado={estado}
              targetEstado="parcial"
              targetLabel="Volver a Parcial"
              onSuccess={() => onUpdated?.('parcial')}
            />
          )}

          {/* Cancel button */}
          {puedeCancelar && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleEstadoChange('cancelado')}
              className="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 shrink-0"
            >
              <X className="h-3 w-3 mr-1" />
              Cancelar
            </Button>
          )}
        </div>
      </div>

      {/* Confirmation dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base">Cambiar estado</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              ¿Cambiar de <strong>{getEstadoLabel(estado)}</strong> a{' '}
              <strong>{getEstadoLabel(pendingEstado)}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUpdating} className="h-8 text-xs">
              No
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmarCambioEstado}
              disabled={isUpdating}
              className="h-8 text-xs bg-blue-600 hover:bg-blue-700"
            >
              {isUpdating ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                'Sí, cambiar'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export default PedidoEstadoFlujoBanner
