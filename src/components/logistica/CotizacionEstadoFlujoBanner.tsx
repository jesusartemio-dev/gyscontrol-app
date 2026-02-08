'use client'

import { useState } from 'react'
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
  Loader2,
  ChevronRight,
  Info,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { updateCotizacionProveedor } from '@/lib/services/cotizacionProveedor'

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

      // Persist estado to database via service layer
      const updated = await updateCotizacionProveedor(cotizacionId, { estado: pendingEstado as any })
      if (!updated) {
        throw new Error('Error al actualizar el estado')
      }

      // Log audit
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

  return (
    <div className="flex items-center justify-between gap-4 py-2 px-3 bg-gray-50/80 border border-gray-200 rounded-lg">
      {/* Progress Flow */}
      <div className="flex items-center gap-1 overflow-x-auto flex-1 min-w-0">
        {ESTADOS.map((etapa, i) => {
          const isActive = estado === etapa.key
          const isPast = currentIndex > i

          return (
            <div key={etapa.key} className="flex items-center flex-shrink-0">
              <span
                className={cn(
                  'text-xs px-2 py-1 rounded-md transition-all whitespace-nowrap',
                  isActive
                    ? 'bg-white font-semibold text-gray-900 shadow-sm border border-gray-300'
                    : isPast
                      ? 'text-gray-500'
                      : 'text-gray-400'
                )}
              >
                {isPast && <span className="text-green-500 mr-1">&#10003;</span>}
                {etapa.label}
              </span>

              {i < ESTADOS.length - 1 && (
                <ChevronRight className={cn(
                  'w-3 h-3 mx-0.5 flex-shrink-0',
                  isPast ? 'text-gray-400' : 'text-gray-300'
                )} />
              )}
            </div>
          )
        })}

        {/* Show rechazado tag when active */}
        {estado === 'rechazado' && (
          <>
            <span className="text-gray-300 mx-1">|</span>
            <span className="text-xs px-2 py-1 rounded-md bg-red-50 font-semibold text-red-600 border border-red-200">
              Rechazado
            </span>
          </>
        )}

        {/* Show legacy seleccionado tag */}
        {isLegacySeleccionado && (
          <>
            <span className="text-gray-300 mx-1">|</span>
            <span className="text-xs px-2 py-1 rounded-md bg-green-50 font-semibold text-green-600 border border-green-200">
              Seleccionado
            </span>
          </>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {isUpdating && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}

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
