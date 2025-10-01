'use client'

import { motion } from 'framer-motion'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import {
  CheckCircle,
  Clock,
  RefreshCcw,
  ShieldCheck,
  AlertCircle,
  Ban,
  ArrowRight,
  X,
  RotateCcw,
  Loader2,
  ChevronRight
} from 'lucide-react'
import { updateListaEstado } from '@/lib/services/listaEquipo'
import type { EstadoListaEquipo } from '@/types/modelos'

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
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

import { useState } from 'react'

// ✅ Minimalist estado configuration
const estados: { 
  key: EstadoListaEquipo; 
  label: string; 
  icon: any;
  color: string;
  bgColor: string;
  description: string;
}[] = [
  { 
    key: 'borrador', 
    label: 'Borrador', 
    icon: Clock, 
    color: 'text-slate-600', 
    bgColor: 'bg-slate-50 border-slate-200',
    description: 'En creación'
  },
  { 
    key: 'por_revisar', 
    label: 'Por revisar', 
    icon: RefreshCcw, 
    color: 'text-amber-600', 
    bgColor: 'bg-amber-50 border-amber-200',
    description: 'Pendiente revisión'
  },
  { 
    key: 'por_cotizar', 
    label: 'Por cotizar', 
    icon: RefreshCcw, 
    color: 'text-orange-600', 
    bgColor: 'bg-orange-50 border-orange-200',
    description: 'Requiere cotización'
  },
  { 
    key: 'por_validar', 
    label: 'Por validar', 
    icon: ShieldCheck, 
    color: 'text-blue-600', 
    bgColor: 'bg-blue-50 border-blue-200',
    description: 'En validación'
  },
  { 
    key: 'por_aprobar', 
    label: 'Por aprobar', 
    icon: AlertCircle, 
    color: 'text-purple-600', 
    bgColor: 'bg-purple-50 border-purple-200',
    description: 'Pendiente aprobación'
  },
  { 
    key: 'aprobado', 
    label: 'Aprobado', 
    icon: CheckCircle, 
    color: 'text-green-600', 
    bgColor: 'bg-green-50 border-green-200',
    description: 'Lista aprobada'
  },
  { 
    key: 'rechazado', 
    label: 'Rechazado', 
    icon: Ban, 
    color: 'text-red-600', 
    bgColor: 'bg-red-50 border-red-200',
    description: 'Requiere correcciones'
  },
]

const flujoEstados: Record<
  EstadoListaEquipo,
  {
    siguiente?: EstadoListaEquipo
    rechazar?: EstadoListaEquipo
    reset?: EstadoListaEquipo
    roles: string[]
  }
> = {
  borrador: { siguiente: 'por_revisar', roles: ['proyectos', 'admin'] },
  por_revisar: { siguiente: 'por_cotizar', rechazar: 'rechazado', roles: ['coordinador', 'admin'] },
  por_cotizar: { siguiente: 'por_validar', rechazar: 'rechazado', roles: ['logistico', 'admin'] },
  por_validar: { siguiente: 'por_aprobar', rechazar: 'rechazado', roles: ['gestor', 'admin'] },
  por_aprobar: { siguiente: 'aprobado', rechazar: 'rechazado', roles: ['gerente', 'admin'] },
  aprobado: { rechazar: 'rechazado', roles: ['gerente', 'admin'] },
  rechazado: { reset: 'borrador', roles: ['proyectos', 'admin'] },
}

interface Props {
  estado: EstadoListaEquipo
  listaId?: string
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
export default function ListaEstadoFlujoBanner({ estado, listaId, onUpdated, className }: Props) {
  const { data: session } = useSession()
  const rol = session?.user?.role || ''
  const flujo = flujoEstados[estado] || {}

  const puedeAvanzar = !!listaId && !!flujo.siguiente && flujo.roles.includes(rol)
  const puedeRechazar = !!listaId && !!flujo.rechazar && flujo.roles.includes(rol)
  const puedeResetear = !!listaId && !!flujo.reset && flujo.roles.includes(rol)

  const [justificacion, setJustificacion] = useState('')
  const [openRechazo, setOpenRechazo] = useState(false)
  const [openReset, setOpenReset] = useState(false)
  const [loading, setLoading] = useState(false)
  
  // ✅ Get current estado info
  const estadoActual = estados.find(e => e.key === estado)
  const siguienteEstado = estados.find(e => e.key === flujo.siguiente)
  const currentIndex = estados.findIndex(e => e.key === estado)

  // ✅ Enhanced state change with loading states and audit logging
  const cambiarEstado = async (nuevoEstado: EstadoListaEquipo, mensaje: string) => {
    if (!listaId || !session?.user?.id) return

    setLoading(true)
    try {
      const updated = await updateListaEstado(listaId, nuevoEstado)
      if (updated) {
        toast.success(mensaje)
        onUpdated?.(nuevoEstado)
      }
    } catch (error) {
      console.error('Error updating estado:', error)
      toast.error('❌ Error al cambiar el estado')
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      className={cn(
        'bg-white border border-gray-200 rounded-lg p-3 shadow-sm',
        'sticky top-0 z-10 backdrop-blur-sm bg-white/95',
        className
      )}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center justify-between gap-4">
        {/* 📊 Current Status Badge - Left */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {estadoActual && (
            <Badge
              variant="outline"
              className={cn(
                'px-2 py-0.5 text-xs font-medium border shadow-sm',
                estadoActual.bgColor,
                estadoActual.color
              )}
            >
              <estadoActual.icon className="w-3 h-3 mr-1" />
              {estadoActual.label}
            </Badge>
          )}
          <span className="text-xs text-muted-foreground hidden sm:inline">
            {currentIndex + 1}/{estados.length}
          </span>
        </div>

        {/* 🎯 Compact Progress Flow - Center */}
        <div className="flex-1 min-w-0">
          <div className="relative overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <div className="flex items-center justify-center min-w-max px-2 py-2 gap-3">
              {estados.map((etapa, i) => {
                const isActive = estado === etapa.key
                const isPast = currentIndex > i
                const isCurrent = currentIndex === i
                const isFuture = currentIndex < i

                return (
                  <div key={etapa.key} className="flex flex-col items-center gap-1 flex-shrink-0">
                    {/* Status Circle */}
                    <div className="relative">
                      <div
                        className={cn(
                          'w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all duration-300',
                          isActive ? `${etapa.bgColor} ${etapa.color} border-current shadow-md scale-105 ring-2 ring-current ring-opacity-30` :
                          isPast ? 'bg-green-500 border-green-500 text-white' :
                          isCurrent ? `${etapa.bgColor} ${etapa.color} border-current` :
                          'bg-gray-100 border-gray-300 text-gray-400'
                        )}
                      >
                        <etapa.icon className="w-3.5 h-3.5" />
                      </div>

                      {/* Current status indicator */}
                      {isActive && (
                        <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-blue-500 rounded-full animate-pulse border border-white" />
                      )}
                    </div>

                    {/* Status Label */}
                    <div className="text-center min-w-14 max-w-16">
                      <span
                        className={cn(
                          'text-xs font-medium block leading-tight text-center',
                          isActive ? `${etapa.color} font-bold` :
                          isPast ? 'text-green-600' :
                          isCurrent ? etapa.color :
                          'text-gray-400'
                        )}
                      >
                        {etapa.label}
                      </span>
                    </div>

                    {/* Connection Line */}
                    {i < estados.length - 1 && (
                      <div className="absolute top-3.5 left-full w-3 h-0.5 bg-gray-300 -translate-x-1/2 z-0">
                        <div
                          className={cn(
                            'w-full h-full transition-all duration-500 rounded',
                            isPast ? 'bg-green-500' : 'bg-gray-300'
                          )}
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* 🎯 Action Buttons - Right */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="hidden sm:inline">Actualizando...</span>
            </div>
          )}

          {/* Advance Button */}
          {puedeAvanzar && flujo.siguiente && siguienteEstado && (
            <Button
              onClick={() => cambiarEstado(flujo.siguiente!, `➡️ Estado actualizado a "${siguienteEstado.label}"`)}
              size="sm"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <ArrowRight className="w-4 h-4 mr-1" />
                  <span className="hidden sm:inline">Avanzar</span>
                </>
              )}
            </Button>
          )}

          {/* Reject Button */}
          {puedeRechazar && flujo.rechazar && (
            <AlertDialog open={openRechazo} onOpenChange={setOpenRechazo}>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={loading}
                  className="border-red-200 text-red-600 hover:bg-red-50 shadow-sm"
                >
                  <X className="w-4 h-4 mr-1" />
                  <span className="hidden sm:inline">Rechazar</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="sm:max-w-md">
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    ¿Deseas rechazar esta lista?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta acción cambiará el estado a "Rechazado". Por favor, indica la razón del rechazo.
                  </AlertDialogDescription>
                </AlertDialogHeader>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Justificación del rechazo *
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
                  <AlertDialogCancel disabled={loading}>
                    Cancelar
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      if (justificacion.trim().length < 10) {
                        toast.error('❗ La justificación debe tener al menos 10 caracteres')
                        return
                      }
                      cambiarEstado(flujo.rechazar!, '❌ Lista rechazada')
                      setJustificacion('')
                      setOpenRechazo(false)
                    }}
                    disabled={loading || justificacion.trim().length < 10}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Rechazando...
                      </>
                    ) : (
                      'Sí, rechazar'
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          {/* Reset Button */}
          {puedeResetear && flujo.reset && (
            <AlertDialog open={openReset} onOpenChange={setOpenReset}>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={loading}
                  className="border-amber-200 text-amber-600 hover:bg-amber-50 shadow-sm"
                >
                  <RotateCcw className="w-4 h-4 mr-1" />
                  <span className="hidden sm:inline">Restaurar</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="sm:max-w-md">
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <RotateCcw className="w-5 h-5 text-amber-500" />
                    ¿Restaurar a "Borrador"?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta acción reiniciará completamente el flujo de aprobación.
                  </AlertDialogDescription>
                </AlertDialogHeader>

                <AlertDialogFooter>
                  <AlertDialogCancel disabled={loading}>
                    Cancelar
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      cambiarEstado(flujo.reset!, '🔄 Estado devuelto a "Borrador"')
                      setOpenReset(false)
                    }}
                    disabled={loading}
                    className="bg-amber-600 hover:bg-amber-700"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Restaurando...
                      </>
                    ) : (
                      'Sí, restaurar'
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>
    </motion.div>
  )
}
