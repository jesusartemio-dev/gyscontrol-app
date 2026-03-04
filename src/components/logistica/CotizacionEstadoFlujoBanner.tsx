'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog'
import {
  ArrowRight,
  X,
  Info,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { updateCotizacionProveedor } from '@/lib/services/cotizacionProveedor'
import { StepPill, StepLine, type StepStatus } from '@/components/ui/status-stepper'

interface CotizacionEstadoFlujoBannerProps {
  estado: string
  cotizacionId: string
  cotizacionNombre?: string
  usuarioId?: string
  onUpdated?: (nuevoEstado: string) => void
}

const ESTADOS = [
  { key: 'pendiente', label: 'Pendiente' },
  { key: 'solicitado', label: 'Solicitado' },
  { key: 'cotizado', label: 'Cotizado' },
]

const FLUJO: Record<string, { siguiente?: string; rechazar?: string }> = {
  pendiente: { siguiente: 'solicitado', rechazar: 'rechazado' },
  solicitado: { siguiente: 'cotizado', rechazar: 'rechazado' },
  cotizado: { rechazar: 'rechazado' },
  rechazado: {},
}

export default function CotizacionEstadoFlujoBanner({
  estado,
  cotizacionId,
  cotizacionNombre,
  usuarioId,
  onUpdated,
}: CotizacionEstadoFlujoBannerProps) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [pendingEstado, setPendingEstado] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)

  const isLegacySeleccionado = estado === 'seleccionado'
  const flujo = FLUJO[estado] || {}
  const currentIndex = isLegacySeleccionado ? ESTADOS.length : ESTADOS.findIndex(e => e.key === estado)
  const siguienteEstado = ESTADOS.find(e => e.key === flujo.siguiente)

  const confirmarCambioEstado = async () => {
    if (!pendingEstado) return
    try {
      setIsUpdating(true)

      const updated = await updateCotizacionProveedor(cotizacionId, { estado: pendingEstado as any })
      if (!updated) {
        throw new Error('Error al actualizar el estado')
      }

      if (usuarioId) {
        try {
          await fetch('/api/audit/log-status-change', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              entityType: 'COTIZACION_PROVEEDOR',
              entityId: cotizacionId,
              userId: usuarioId,
              oldStatus: estado,
              newStatus: pendingEstado,
              description: cotizacionNombre || `Cotizacion ${cotizacionId}`,
            }),
          })
        } catch (auditError) {
          console.warn('Error logging status change:', auditError)
        }
      }

      const label = ESTADOS.find(e => e.key === pendingEstado)?.label || pendingEstado
      toast.success(`Estado actualizado a "${label}"`)
      onUpdated?.(pendingEstado)
    } catch (error: any) {
      toast.error(error?.message || 'Error al actualizar el estado')
    } finally {
      setIsUpdating(false)
      setShowConfirmDialog(false)
      setPendingEstado('')
    }
  }

  const handleAvanzar = () => {
    if (!flujo.siguiente) return
    setPendingEstado(flujo.siguiente)
    setShowConfirmDialog(true)
  }

  const handleRechazar = () => {
    if (!flujo.rechazar) return
    setPendingEstado(flujo.rechazar)
    setShowConfirmDialog(true)
  }

  // Build pill steps
  const isRechazado = estado === 'rechazado'
  const steps = ESTADOS.map((etapa, i) => {
    let status: StepStatus = 'future'
    if (isRechazado) {
      // When rejected, show steps before rejection point as completed
      if (i < currentIndex) status = 'completed'
    } else if (i < currentIndex || isLegacySeleccionado) {
      status = 'completed'
    } else if (estado === etapa.key) {
      status = 'current'
    }
    return { key: etapa.key, label: etapa.label, status }
  })

  return (
    <div className="flex items-center justify-between gap-4 py-2 px-3 bg-gray-50/80 border border-gray-200 rounded-lg">
      {/* Progress Flow */}
      <div className="flex items-center overflow-x-auto flex-1 min-w-0">
        {steps.map((step, i) => (
          <React.Fragment key={step.key}>
            {i > 0 && <StepLine nextStatus={step.status} />}
            <StepPill label={step.label} status={step.status} />
          </React.Fragment>
        ))}

        {/* Rechazado pill */}
        {isRechazado && (
          <>
            <StepLine nextStatus="rejected" />
            <StepPill label="Rechazado" status="rejected" />
          </>
        )}

        {/* Legacy seleccionado pill */}
        {isLegacySeleccionado && (
          <>
            <StepLine nextStatus="current" />
            <StepPill label="Seleccionado" status="current" />
          </>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {flujo.siguiente && siguienteEstado && (
          <Button
            onClick={handleAvanzar}
            size="sm"
            disabled={isUpdating}
            className="h-7 px-3 text-xs bg-blue-600 hover:bg-blue-700 text-white"
          >
            <ArrowRight className="w-3 h-3 mr-1" />
            Avanzar
          </Button>
        )}

        {flujo.rechazar && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleRechazar}
            disabled={isUpdating}
            className="h-7 px-3 text-xs border-gray-300 text-gray-600 hover:bg-gray-100"
          >
            <X className="w-3 h-3 mr-1" />
            Rechazar
          </Button>
        )}

        {!flujo.siguiente && (estado === 'cotizado' || isLegacySeleccionado) && (
          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Info className="h-3 w-3" />
            Selección desde la lista
          </span>
        )}

        {!flujo.siguiente && !flujo.rechazar && (
          <span className="text-[10px] text-muted-foreground">Estado final</span>
        )}
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm">
              {pendingEstado === 'rechazado' ? 'Rechazar cotizacion' : 'Confirmar cambio de estado'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              {pendingEstado === 'rechazado'
                ? `Se rechazara la cotizacion "${cotizacionNombre || cotizacionId}".`
                : `Se cambiara el estado de "${cotizacionNombre || cotizacionId}" a "${ESTADOS.find(e => e.key === pendingEstado)?.label || pendingEstado}".`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUpdating} className="h-7 text-xs">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmarCambioEstado}
              disabled={isUpdating}
              className={cn(
                'h-7 text-xs',
                pendingEstado === 'rechazado'
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-blue-600 hover:bg-blue-700'
              )}
            >
              {isUpdating ? 'Actualizando...' : 'Confirmar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
