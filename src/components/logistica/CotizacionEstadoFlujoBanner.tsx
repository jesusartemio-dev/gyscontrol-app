'use client'

import React, { useState } from 'react'
import { EstadoCotizacionProveedor } from '@/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Clock,
  Send,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  ChevronRight,
} from 'lucide-react'
import { toast } from 'sonner'

interface CotizacionEstadoFlujoBannerProps {
  estado: string
  cotizacionId: string
  cotizacionNombre?: string
  usuarioId?: string
  onUpdated?: (nuevoEstado: string) => void
}

const ESTADOS: EstadoCotizacionProveedor[] = [
  'pendiente',
  'solicitado',
  'cotizado',
  'rechazado',
  'seleccionado',
]

const getEstadoInfo = (estado: string) => {
  switch (estado) {
    case 'pendiente':
      return {
        label: 'Pendiente',
        icon: Clock,
        color: 'text-orange-600',
        bgColor: 'bg-orange-100',
      }
    case 'solicitado':
      return {
        label: 'Solicitado',
        icon: Send,
        color: 'text-blue-600',
        bgColor: 'bg-blue-100',
      }
    case 'cotizado':
      return {
        label: 'Cotizado',
        icon: CheckCircle,
        color: 'text-green-600',
        bgColor: 'bg-green-100',
      }
    case 'rechazado':
      return {
        label: 'Rechazado',
        icon: XCircle,
        color: 'text-red-600',
        bgColor: 'bg-red-100',
      }
    case 'seleccionado':
      return {
        label: 'Seleccionado',
        icon: CheckCircle,
        color: 'text-purple-600',
        bgColor: 'bg-purple-100',
      }
    default:
      return {
        label: 'Desconocido',
        icon: AlertCircle,
        color: 'text-gray-600',
        bgColor: 'bg-gray-100',
      }
  }
}

const esEstadoAccesible = (estadoActual: string, estadoDestino: string): boolean => {
  const flujoPermitido: Record<string, string[]> = {
    pendiente: ['solicitado', 'rechazado'],
    solicitado: ['cotizado', 'rechazado'],
    cotizado: ['seleccionado', 'rechazado'],
    rechazado: [],
    seleccionado: [],
  }
  return flujoPermitido[estadoActual]?.includes(estadoDestino) || false
}

const CotizacionEstadoFlujoBanner: React.FC<CotizacionEstadoFlujoBannerProps> = ({
  estado,
  cotizacionId,
  cotizacionNombre,
  usuarioId,
  onUpdated,
}) => {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [pendingEstado, setPendingEstado] = useState<string>('')
  const [isUpdating, setIsUpdating] = useState(false)

  const confirmarCambioEstado = async () => {
    try {
      setIsUpdating(true)
      await new Promise((resolve) => setTimeout(resolve, 1000))

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
              description: cotizacionNombre || `Cotización ${cotizacionId}`,
            }),
          })
        } catch (auditError) {
          console.warn('Error logging status change:', auditError)
        }
      }

      toast.success(`Estado actualizado a: ${getEstadoInfo(pendingEstado).label}`)
      onUpdated?.(pendingEstado)
    } catch {
      toast.error('Error al actualizar el estado')
    } finally {
      setIsUpdating(false)
      setShowConfirmDialog(false)
      setPendingEstado('')
    }
  }

  const estadoActual = getEstadoInfo(estado)
  const estadosAccesibles = ESTADOS.filter(
    (e) => e !== estado && esEstadoAccesible(estado, e)
  )

  return (
    <>
      <div className="bg-white rounded-lg border px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Estado actual */}
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-md ${estadoActual.bgColor}`}>
              <estadoActual.icon className={`h-4 w-4 ${estadoActual.color}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{estadoActual.label}</span>
                <Badge variant="outline" className="text-[10px] h-5">
                  Actual
                </Badge>
              </div>
            </div>
          </div>

          {/* Acciones */}
          {estadosAccesibles.length > 0 ? (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground">Cambiar a:</span>
              {estadosAccesibles.map((estadoOption) => {
                const info = getEstadoInfo(estadoOption)
                return (
                  <Button
                    key={estadoOption}
                    variant="outline"
                    size="sm"
                    disabled={isUpdating}
                    onClick={() => {
                      setPendingEstado(estadoOption)
                      setShowConfirmDialog(true)
                    }}
                    className="h-7 text-xs gap-1"
                  >
                    <info.icon className={`h-3 w-3 ${info.color}`} />
                    {info.label}
                  </Button>
                )
              })}
            </div>
          ) : (
            <span className="text-[10px] text-muted-foreground">Estado final</span>
          )}
        </div>
      </div>

      {/* Dialog de Confirmación */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">Confirmar Cambio</DialogTitle>
            <DialogDescription className="text-xs">
              ¿Cambiar estado de <strong>{cotizacionNombre || 'cotización'}</strong>?
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-center gap-3 py-3">
            <div className="flex items-center gap-1.5">
              <div className={`p-1.5 rounded-md ${getEstadoInfo(estado).bgColor}`}>
                {React.createElement(getEstadoInfo(estado).icon, {
                  className: `h-3.5 w-3.5 ${getEstadoInfo(estado).color}`,
                })}
              </div>
              <span className="text-xs font-medium">{getEstadoInfo(estado).label}</span>
            </div>

            <ChevronRight className="h-4 w-4 text-muted-foreground" />

            <div className="flex items-center gap-1.5">
              <div className={`p-1.5 rounded-md ${getEstadoInfo(pendingEstado).bgColor}`}>
                {React.createElement(getEstadoInfo(pendingEstado).icon, {
                  className: `h-3.5 w-3.5 ${getEstadoInfo(pendingEstado).color}`,
                })}
              </div>
              <span className="text-xs font-medium">
                {getEstadoInfo(pendingEstado).label}
              </span>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowConfirmDialog(false)}
              disabled={isUpdating}
              className="h-7 text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={confirmarCambioEstado}
              disabled={isUpdating}
              className="h-7 text-xs"
            >
              {isUpdating ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Actualizando...
                </>
              ) : (
                'Confirmar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default CotizacionEstadoFlujoBanner