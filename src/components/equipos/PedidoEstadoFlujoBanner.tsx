/**
 * 📦 PedidoEstadoFlujoBanner - Diseño minimalista
 * @author GYS Team
 */

'use client'

import React, { useState } from 'react'
import {
  Clock,
  Send,
  CheckCircle,
  Package,
  Truck,
  X,
  Loader2,
  ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import { cn } from '@/lib/utils'
import { flujoEstadosPedido, estadosPedidoList, estadoPedidoLabels, validarTransicionPedido, type EstadoPedidoEquipo } from '@/lib/utils/flujoPedidoEquipo'
import { useSession } from 'next-auth/react'
import { RollbackButton } from '@/components/RollbackButton'

interface PedidoEstadoFlujoBannerProps {
  estado: string
  pedidoId: string
  pedidoNombre?: string
  usuarioId?: string
  contexto?: 'proyectos' | 'logistica'
  onUpdated?: (nuevoEstado: string) => void
}

const ESTADOS_FLUJO = [
  { key: 'borrador', label: 'Borrador', icon: Clock, color: 'gray', orden: 1 },
  { key: 'enviado', label: 'Enviado', icon: Send, color: 'blue', orden: 2 },
  { key: 'atendido', label: 'Atendido', icon: CheckCircle, color: 'amber', orden: 3 },
  { key: 'parcial', label: 'Parcial', icon: Package, color: 'orange', orden: 4 },
  { key: 'entregado', label: 'Entregado', icon: Truck, color: 'green', orden: 5 },
  { key: 'cancelado', label: 'Cancelado', icon: X, color: 'red', orden: 6 },
]

const getEstadoInfo = (estadoKey: string) => {
  return ESTADOS_FLUJO.find((e) => e.key === estadoKey) || ESTADOS_FLUJO[0]
}

const puedeAvanzarA = (estadoActual: string, estadoSiguiente: string, rol: string): boolean => {
  const resultado = validarTransicionPedido(estadoActual, estadoSiguiente, rol)
  return resultado.valido
}

// Transiciones de avanzar permitidas por contexto (admin/gerente ven todo)
const AVANZAR_POR_CONTEXTO: Record<string, string[]> = {
  proyectos: ['enviado'],          // borrador → enviado
  logistica: ['atendido', 'parcial', 'entregado'], // enviado→atendido, atendido→parcial, parcial→entregado
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

  const estadoActual = getEstadoInfo(estado)

  const handleEstadoChange = (nuevoEstado: string) => {
    if (nuevoEstado === estado) return
    if (!puedeAvanzarA(estado, nuevoEstado, userRole)) {
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

      toast.success(`Estado: ${getEstadoInfo(pendingEstado).label}`)
      onUpdated?.(pendingEstado)
    } catch {
      toast.error('Error al actualizar el estado')
    } finally {
      setIsUpdating(false)
      setShowConfirmDialog(false)
      setPendingEstado('')
    }
  }

  // Estados principales (sin cancelado en la línea)
  const estadosPrincipales = ESTADOS_FLUJO.filter((e) => e.key !== 'cancelado')
  const puedeCancelar = puedeAvanzarA(estado, 'cancelado', userRole)

  return (
    <>
      <div className="bg-white rounded-lg border p-3">
        <div className="flex items-center justify-between gap-4">
          {/* Flujo de estados horizontal */}
          <div className="flex items-center gap-1 flex-1 overflow-x-auto">
            {estadosPrincipales.map((est, idx) => {
              const isCompleted = est.orden < estadoActual.orden
              const isCurrent = est.key === estado
              const isNext = est.orden === estadoActual.orden + 1
              const isSuperUser = ['admin', 'gerente'].includes(userRole)
              const contextoPermiteAvanzar = isSuperUser || (AVANZAR_POR_CONTEXTO[contexto] || []).includes(est.key)
              const canAdvance = isNext && contextoPermiteAvanzar && puedeAvanzarA(estado, est.key, userRole)
              const Icon = est.icon

              return (
                <React.Fragment key={est.key}>
                  <button
                    onClick={() => canAdvance && handleEstadoChange(est.key)}
                    disabled={!canAdvance}
                    className={cn(
                      'flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-all whitespace-nowrap',
                      isCurrent && 'bg-blue-100 text-blue-700 ring-1 ring-blue-300',
                      isCompleted && 'bg-green-50 text-green-600',
                      !isCurrent && !isCompleted && !canAdvance && 'text-gray-400',
                      canAdvance && 'hover:bg-blue-50 text-blue-600 cursor-pointer',
                      !canAdvance && !isCurrent && !isCompleted && 'cursor-default'
                    )}
                  >
                    <Icon className={cn(
                      'h-3.5 w-3.5',
                      isCompleted && 'text-green-500',
                      isCurrent && 'text-blue-600'
                    )} />
                    <span className="hidden sm:inline">{est.label}</span>
                  </button>

                  {idx < estadosPrincipales.length - 1 && (
                    <ChevronRight className={cn(
                      'h-3 w-3 shrink-0',
                      est.orden < estadoActual.orden ? 'text-green-400' : 'text-gray-300'
                    )} />
                  )}
                </React.Fragment>
              )
            })}
          </div>

          {/* Rollback buttons por estado */}
          {estado === 'enviado' && ['admin', 'gerente', 'proyectos'].includes(userRole) && (
            <RollbackButton
              entityType="pedidoEquipo"
              entityId={pedidoId}
              currentEstado={estado}
              targetEstado="borrador"
              targetLabel="Volver a Borrador"
              onSuccess={() => onUpdated?.('borrador')}
            />
          )}
          {contexto === 'logistica' && estado === 'atendido' && ['admin', 'gerente', 'logistico'].includes(userRole) && (
            <RollbackButton
              entityType="pedidoEquipo"
              entityId={pedidoId}
              currentEstado={estado}
              targetEstado="enviado"
              targetLabel="Volver a Enviado"
              onSuccess={() => onUpdated?.('enviado')}
            />
          )}
          {contexto === 'logistica' && estado === 'parcial' && ['admin', 'gerente', 'logistico'].includes(userRole) && (
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

          {/* Botón cancelar */}
          {puedeCancelar && estado !== 'cancelado' && (
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

          {/* Estado cancelado badge */}
          {estado === 'cancelado' && (
            <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200 text-xs">
              <X className="h-3 w-3 mr-1" />
              Cancelado
            </Badge>
          )}
        </div>
      </div>

      {/* Dialog de confirmación compacto */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base">Cambiar estado</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              ¿Cambiar de <strong>{estadoActual.label}</strong> a{' '}
              <strong>{pendingEstado ? getEstadoInfo(pendingEstado).label : ''}</strong>?
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
