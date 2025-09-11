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

  // ✅ Enhanced state change with loading states
  const cambiarEstado = async (nuevoEstado: EstadoListaEquipo, mensaje: string) => {
    if (!listaId) return
    
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
        'bg-white border border-gray-200 rounded-lg p-4 shadow-sm',
        'sticky top-0 z-10 backdrop-blur-sm bg-white/95',
        className
      )}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center justify-between gap-4">
        {/* 📊 Current Status & Progress */}
        <div className="flex items-center gap-4 flex-1">
          {/* Current Status Badge */}
          {estadoActual && (
            <div className="flex items-center gap-2">
              <Badge 
                variant="outline"
                className={cn(
                  'px-3 py-1.5 text-sm font-medium border-2',
                  estadoActual.bgColor,
                  estadoActual.color
                )}
              >
                <estadoActual.icon className="w-4 h-4 mr-2" />
                {estadoActual.label}
              </Badge>
              <span className="text-sm text-muted-foreground hidden sm:inline">
                {estadoActual.description}
              </span>
            </div>
          )}
          
          {/* Progress Indicator */}
          <div className="flex items-center gap-1 flex-1 max-w-md">
            {estados.map((etapa, i) => {
              const isActive = estado === etapa.key
              const isPast = currentIndex > i
              const isCurrent = currentIndex === i
              
              return (
                <div key={etapa.key} className="flex items-center">
                  <div 
                    className={cn(
                      'w-2 h-2 rounded-full transition-all duration-300',
                      isPast ? 'bg-green-500' : 
                      isCurrent ? etapa.color.replace('text-', 'bg-') : 
                      'bg-gray-200'
                    )}
                  />
                  {i < estados.length - 1 && (
                    <div 
                      className={cn(
                        'w-4 h-0.5 transition-all duration-300',
                        isPast ? 'bg-green-300' : 'bg-gray-200'
                      )}
                    />
                  )}
                </div>
              )
            })}
            
            {/* Progress Text */}
            <span className="text-xs text-muted-foreground ml-2 hidden md:inline">
              {currentIndex + 1} de {estados.length}
            </span>
          </div>
        </div>

        {/* 🎯 Action Buttons */}
        <div className="flex items-center gap-2">
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
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <ArrowRight className="w-4 h-4 mr-1" />
                  <span className="hidden sm:inline">Avanzar a </span>
                  {siguienteEstado.label}
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
                  className="border-red-200 text-red-600 hover:bg-red-50"
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
                  className="border-amber-200 text-amber-600 hover:bg-amber-50"
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
