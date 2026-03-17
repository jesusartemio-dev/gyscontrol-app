'use client'

import React, { useState } from 'react'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import {
  ArrowRight,
  Ban,
  Loader2,
} from 'lucide-react'
import { updateListaEstado } from '@/lib/services/listaEquipo'
import {
  flujoEstados,
  estadosFlujoPrincipal,
  estadoLabels,
  canAnular,
  anulacionRoles,
  type EstadoListaEquipo,
} from '@/lib/utils/flujoListaEquipo'
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { RollbackButton } from '@/components/RollbackButton'
import { StepPill, StepLine, type StepStatus } from '@/components/ui/status-stepper'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

interface Props {
  estado: EstadoListaEquipo
  listaId?: string
  totalItems?: number
  itemsVerificados?: number
  motivoAnulacion?: string
  onUpdated?: (nuevoEstado: EstadoListaEquipo) => void
  className?: string
}

export default function ListaEstadoFlujoBanner({ estado, listaId, totalItems = 0, itemsVerificados = 0, motivoAnulacion, onUpdated, className }: Props) {
  const { data: session } = useSession()
  const rol = session?.user?.role || ''
  const flujo = flujoEstados[estado] || { roles: [] }

  const puedeAvanzar = !!listaId && !!flujo.siguiente && flujo.roles.includes(rol)
  const puedeRetroceder = !!listaId && !!flujo.retroceder && flujo.roles.includes(rol)
  const puedeAnular = !!listaId && canAnular(estado, rol)

  const [motivoAnulacionInput, setMotivoAnulacionInput] = useState('')
  const [openAnulacion, setOpenAnulacion] = useState(false)
  const [openConfirmAvanzar, setOpenConfirmAvanzar] = useState(false)
  const [loading, setLoading] = useState(false)

  const faltanVerificar = estado === 'por_revisar' && totalItems > 0 && itemsVerificados < totalItems
  const siguienteLabel = flujo.siguiente ? (estadoLabels[flujo.siguiente] || flujo.siguiente) : ''
  const currentIndex = estadosFlujoPrincipal.indexOf(estado)
  const isAnulada = estado === 'anulada'

  const cambiarEstado = async (nuevoEstado: EstadoListaEquipo, mensaje: string, motivo?: string) => {
    if (!listaId || !session?.user?.id) return

    setLoading(true)
    try {
      const updated = await updateListaEstado(listaId, nuevoEstado, motivo)
      if (updated) {
        toast.success(mensaje)
        onUpdated?.(nuevoEstado)
      }
    } catch (error: any) {
      console.error('Error updating estado:', error)
      toast.error(error?.message || 'Error al cambiar el estado')
    } finally {
      setLoading(false)
    }
  }

  // Anulada banner
  if (isAnulada) {
    return (
      <Alert variant="destructive" className={cn('border-red-300 bg-red-50', className)}>
        <Ban className="h-4 w-4" />
        <AlertTitle>Lista Anulada</AlertTitle>
        <AlertDescription>
          {motivoAnulacion
            ? <>Motivo: {motivoAnulacion}</>
            : 'Esta lista ha sido anulada.'}
        </AlertDescription>
      </Alert>
    )
  }

  // Build pill steps from the 5 main states
  const steps = estadosFlujoPrincipal.map((key, i) => {
    let status: StepStatus = 'future'
    if (i < currentIndex) status = 'completed'
    else if (key === estado) status = 'current'
    return { key, label: estadoLabels[key] || key, status }
  })

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-4 py-2 px-3 bg-gray-50/80 border border-gray-200 rounded-lg',
        className
      )}
    >
      {/* Pill flow */}
      <div className="flex items-center overflow-x-auto flex-1 min-w-0">
        {steps.map((step, i) => (
          <React.Fragment key={step.key}>
            {i > 0 && <StepLine nextStatus={step.status} />}
            <StepPill label={step.label} status={step.status} />
          </React.Fragment>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {loading && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}

        {/* Verification progress - only relevant in por_revisar */}
        {estado === 'por_revisar' && totalItems > 0 && (
          <span className={cn(
            'text-[10px] font-medium',
            itemsVerificados === totalItems ? 'text-green-600' : 'text-muted-foreground'
          )}>
            {itemsVerificados}/{totalItems} verificados
          </span>
        )}

        {/* Advance Button */}
        {puedeAvanzar && flujo.siguiente && (
          <>
            <Button
              onClick={() => {
                if (faltanVerificar) {
                  setOpenConfirmAvanzar(true)
                } else {
                  cambiarEstado(flujo.siguiente!, `Estado actualizado a "${siguienteLabel}"`)
                }
              }}
              size="sm"
              disabled={loading}
              className="h-7 px-3 text-xs bg-blue-600 hover:bg-blue-700 text-white"
            >
              <ArrowRight className="w-3 h-3 mr-1" />
              Avanzar
            </Button>

            <AlertDialog open={openConfirmAvanzar} onOpenChange={setOpenConfirmAvanzar}>
              <AlertDialogContent className="sm:max-w-md">
                <AlertDialogHeader>
                  <AlertDialogTitle>Items sin verificar</AlertDialogTitle>
                  <AlertDialogDescription>
                    Hay {totalItems - itemsVerificados} de {totalItems} items sin verificar.
                    ¿Desea avanzar de todas formas?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      cambiarEstado(flujo.siguiente!, `Estado actualizado a "${siguienteLabel}"`)
                      setOpenConfirmAvanzar(false)
                    }}
                    disabled={loading}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Avanzar de todas formas
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}

        {/* Retroceder Button - uses RollbackButton with the retroceder target from flujoEstados */}
        {puedeRetroceder && flujo.retroceder && listaId && (
          <RollbackButton
            entityType="listaEquipo"
            entityId={listaId}
            currentEstado={estado}
            targetEstado={flujo.retroceder}
            targetLabel={`Volver a ${estadoLabels[flujo.retroceder] || flujo.retroceder}`}
            onSuccess={() => onUpdated?.(flujo.retroceder as EstadoListaEquipo)}
          />
        )}

        {/* Anular Button */}
        {puedeAnular && (
          <AlertDialog open={openAnulacion} onOpenChange={setOpenAnulacion}>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={loading}
                className="h-7 px-3 text-xs border-red-300 text-red-600 hover:bg-red-50"
              >
                <Ban className="w-3 h-3 mr-1" />
                Anular
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="sm:max-w-md">
              <AlertDialogHeader>
                <AlertDialogTitle>¿Anular esta lista?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta acción anulará la lista de equipos. Indica el motivo de la anulación.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Motivo de anulación *
                </label>
                <Textarea
                  placeholder="Describe el motivo de la anulación (mínimo 10 caracteres)..."
                  value={motivoAnulacionInput}
                  onChange={(e) => setMotivoAnulacionInput(e.target.value)}
                  rows={3}
                  className="resize-none"
                />
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    if (motivoAnulacionInput.trim().length < 10) {
                      toast.error('El motivo debe tener al menos 10 caracteres')
                      return
                    }
                    cambiarEstado('anulada' as EstadoListaEquipo, 'Lista anulada', motivoAnulacionInput.trim())
                    setMotivoAnulacionInput('')
                    setOpenAnulacion(false)
                  }}
                  disabled={loading || motivoAnulacionInput.trim().length < 10}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {loading ? 'Anulando...' : 'Anular'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  )
}
