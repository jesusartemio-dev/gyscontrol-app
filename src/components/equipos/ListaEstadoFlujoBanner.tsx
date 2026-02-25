'use client'

import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import {
  ArrowRight,
  X,
  RotateCcw,
  Loader2,
  ChevronRight
} from 'lucide-react'
import { updateListaEstado } from '@/lib/services/listaEquipo'
import { flujoEstados, estadosList, type EstadoListaEquipo } from '@/lib/utils/flujoListaEquipo'

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
import type { EstadoListaEquipo as EstadoListaType } from '@/lib/utils/flujoListaEquipo'

import { useState } from 'react'

const estados = estadosList

interface Props {
  estado: EstadoListaEquipo
  listaId?: string
  totalItems?: number
  itemsVerificados?: number
  onUpdated?: (nuevoEstado: EstadoListaEquipo) => void
  className?: string
}

/**
 * 🎯 ListaEstadoFlujoBanner - Minimalist Status Flow Component
 * 
 * Professional and compact status flow visualization that stays always visible.
 * Positioned between tabs and content for optimal UX.
 * 
 * Features:
 * - ✅ Compact horizontal layout
 * - ✅ Current status highlight
 * - ✅ Progress visualization
 * - ✅ Quick action buttons
 * - ✅ Professional styling
 * - ✅ Responsive design
 */
export default function ListaEstadoFlujoBanner({ estado, listaId, totalItems = 0, itemsVerificados = 0, onUpdated, className }: Props) {
  const { data: session } = useSession()
  const rol = session?.user?.role || ''
  const flujo = flujoEstados[estado] || {}

  const puedeAvanzar = !!listaId && !!flujo.siguiente && flujo.roles.includes(rol)
  const puedeRechazar = !!listaId && !!flujo.rechazar && flujo.roles.includes(rol)
  const puedeResetear = !!listaId && !!flujo.reset && flujo.roles.includes(rol)

  const [justificacion, setJustificacion] = useState('')
  const [openRechazo, setOpenRechazo] = useState(false)
  const [openReset, setOpenReset] = useState(false)
  const [openConfirmAvanzar, setOpenConfirmAvanzar] = useState(false)
  const [loading, setLoading] = useState(false)

  const faltanVerificar = totalItems > 0 && itemsVerificados < totalItems

  // ✅ Get current estado info
  const siguienteEstado = estados.find(e => e.key === flujo.siguiente)
  const currentIndex = estados.findIndex(e => e.key === estado)

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

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-4 py-2 px-3 bg-gray-50/80 border border-gray-200 rounded-lg',
        className
      )}
    >
      {/* 🎯 Minimalist Progress Flow - Text only */}
      <div className="flex items-center gap-1 overflow-x-auto flex-1 min-w-0">
        {estados.map((etapa, i) => {
          const isActive = estado === etapa.key
          const isPast = currentIndex > i

          return (
            <div key={etapa.key} className="flex items-center flex-shrink-0">
              {/* Status text */}
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
                {isPast && <span className="text-green-500 mr-1">✓</span>}
                {etapa.label}
              </span>

              {/* Separator */}
              {i < estados.length - 1 && (
                <ChevronRight className={cn(
                  'w-3 h-3 mx-0.5 flex-shrink-0',
                  isPast ? 'text-gray-400' : 'text-gray-300'
                )} />
              )}
            </div>
          )
        })}
      </div>

      {/* 🎯 Action Buttons - Compact */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {loading && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}

        {/* Verification progress */}
        {totalItems > 0 && (
          <span className={cn(
            'text-[10px] font-medium',
            itemsVerificados === totalItems ? 'text-green-600' : 'text-muted-foreground'
          )}>
            {itemsVerificados}/{totalItems} verificados
          </span>
        )}

        {/* Advance Button */}
        {puedeAvanzar && flujo.siguiente && siguienteEstado && (
          <>
            <Button
              onClick={() => {
                if (faltanVerificar) {
                  setOpenConfirmAvanzar(true)
                } else {
                  cambiarEstado(flujo.siguiente!, `Estado actualizado a "${siguienteEstado.label}"`)
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
                      cambiarEstado(flujo.siguiente!, `Estado actualizado a "${siguienteEstado.label}"`)
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

        {/* Reject Button */}
        {puedeRechazar && flujo.rechazar && (
          <AlertDialog open={openRechazo} onOpenChange={setOpenRechazo}>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={loading}
                className="h-7 px-3 text-xs border-gray-300 text-gray-600 hover:bg-gray-100"
              >
                <X className="w-3 h-3 mr-1" />
                Rechazar
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="sm:max-w-md">
              <AlertDialogHeader>
                <AlertDialogTitle>¿Rechazar esta lista?</AlertDialogTitle>
                <AlertDialogDescription>
                  Indica la razón del rechazo para que el equipo pueda hacer correcciones.
                </AlertDialogDescription>
              </AlertDialogHeader>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Justificación *
                </label>
                <Textarea
                  placeholder="Describe las razones del rechazo..."
                  value={justificacion}
                  onChange={(e) => setJustificacion(e.target.value)}
                  rows={3}
                  className="resize-none"
                />
              </div>

              <AlertDialogFooter>
                <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    if (justificacion.trim().length < 10) {
                      toast.error('La justificación debe tener al menos 10 caracteres')
                      return
                    }
                    cambiarEstado(flujo.rechazar!, 'Lista rechazada', justificacion.trim())
                    setJustificacion('')
                    setOpenRechazo(false)
                  }}
                  disabled={loading || justificacion.trim().length < 10}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {loading ? 'Rechazando...' : 'Rechazar'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

        {/* Rollback Button */}
        {listaId && estado === 'por_aprobar' && (
          <RollbackButton
            entityType="listaEquipo"
            entityId={listaId}
            currentEstado={estado}
            targetEstado="por_validar"
            targetLabel="Volver a Por Validar"
            onSuccess={() => onUpdated?.('por_validar' as EstadoListaEquipo)}
          />
        )}
        {listaId && estado === 'por_validar' && (
          <RollbackButton
            entityType="listaEquipo"
            entityId={listaId}
            currentEstado={estado}
            targetEstado="por_cotizar"
            targetLabel="Volver a Por Cotizar"
            onSuccess={() => onUpdated?.('por_cotizar' as EstadoListaEquipo)}
          />
        )}

        {/* Reset Button */}
        {puedeResetear && flujo.reset && (
          <AlertDialog open={openReset} onOpenChange={setOpenReset}>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={loading}
                className="h-7 px-3 text-xs border-gray-300 text-gray-600 hover:bg-gray-100"
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                Restaurar
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="sm:max-w-md">
              <AlertDialogHeader>
                <AlertDialogTitle>¿Restaurar a Borrador?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta acción reiniciará el flujo de aprobación.
                </AlertDialogDescription>
              </AlertDialogHeader>

              <AlertDialogFooter>
                <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    cambiarEstado(flujo.reset!, 'Estado devuelto a Borrador')
                    setOpenReset(false)
                  }}
                  disabled={loading}
                  className="bg-amber-600 hover:bg-amber-700"
                >
                  {loading ? 'Restaurando...' : 'Restaurar'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  )
}
