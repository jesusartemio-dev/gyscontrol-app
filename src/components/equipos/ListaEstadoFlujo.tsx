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
import { Separator } from '@/components/ui/separator'

import { useState } from 'react'

// ✅ Enhanced estado configuration with colors and descriptions
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
    bgColor: 'bg-slate-100 border-slate-300',
    description: 'Lista en proceso de creación'
  },
  { 
    key: 'por_revisar', 
    label: 'Por revisar', 
    icon: RefreshCcw, 
    color: 'text-amber-600', 
    bgColor: 'bg-amber-50 border-amber-300',
    description: 'Pendiente de revisión técnica'
  },
  { 
    key: 'por_cotizar', 
    label: 'Por cotizar', 
    icon: RefreshCcw, 
    color: 'text-orange-600', 
    bgColor: 'bg-orange-50 border-orange-300',
    description: 'Requiere cotización de proveedores'
  },
  { 
    key: 'por_validar', 
    label: 'Por validar', 
    icon: ShieldCheck, 
    color: 'text-blue-600', 
    bgColor: 'bg-blue-50 border-blue-300',
    description: 'En proceso de validación'
  },
  { 
    key: 'por_aprobar', 
    label: 'Por aprobar', 
    icon: AlertCircle, 
    color: 'text-purple-600', 
    bgColor: 'bg-purple-50 border-purple-300',
    description: 'Pendiente de aprobación final'
  },
  { 
    key: 'aprobado', 
    label: 'Aprobado', 
    icon: CheckCircle, 
    color: 'text-green-600', 
    bgColor: 'bg-green-50 border-green-300',
    description: 'Lista aprobada y lista para uso'
  },
  { 
    key: 'rechazado', 
    label: 'Rechazado', 
    icon: Ban, 
    color: 'text-red-600', 
    bgColor: 'bg-red-50 border-red-300',
    description: 'Lista rechazada, requiere correcciones'
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
}

export default function ListaEstadoFlujo({ estado, listaId, onUpdated }: Props) {
  const { data: session } = useSession()
  const rol = session?.user?.role || ''
  const flujo = flujoEstados[estado] || {}

  const puedeAvanzar = !!listaId && !!flujo.siguiente && flujo.roles.includes(rol)
  const puedeRechazar = !!listaId && !!flujo.rechazar && flujo.roles.includes(rol)
  const puedeResetear = !!listaId && !!flujo.reset && flujo.roles.includes(rol)

  const [justificacion, setJustificacion] = useState('')
  const [openRechazo, setOpenRechazo] = useState(false)
  const [openReset, setOpenReset] = useState(false)
  const [loading, setLoading] = useState(false) // ✅ Loading state
  
  // ✅ Get current estado info
  const estadoActual = estados.find(e => e.key === estado)
  const siguienteEstado = estados.find(e => e.key === flujo.siguiente)

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
  
  // ✅ Animation variants for better UX
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }
  
  const itemVariants = {
    hidden: { opacity: 0, scale: 0.8, y: 20 },
    visible: { 
      opacity: 1, 
      scale: 1, 
      y: 0,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 24
      }
    }
  }

  return (
    <motion.div 
      className="space-y-4"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* ✅ Current Status Display */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge 
            variant={estado === 'aprobado' ? 'default' : estado === 'rechazado' ? 'secondary' : 'secondary'}
            className="text-sm px-3 py-1"
          >
            {estadoActual && (
              <>
                <estadoActual.icon className="w-4 h-4 mr-2" />
                {estadoActual.label}
              </>
            )}
          </Badge>
          {estadoActual && (
            <span className="text-sm text-muted-foreground">
              {estadoActual.description}
            </span>
          )}
        </div>
        
        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Actualizando...
          </div>
        )}
      </div>
      
      <Separator />
      
      {/* ✅ Enhanced Estado Flow Visualization */}
      <div className="w-full">
        <div className="flex items-center gap-3 overflow-x-auto pb-4 pt-2 px-1 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
          {estados.map((etapa, i) => {
            const Icon = etapa.icon
            const isActive = estado === etapa.key
            const isPast = estados.findIndex(e => e.key === estado) > i
            const isFuture = estados.findIndex(e => e.key === estado) < i
            
            return (
              <motion.div
                key={etapa.key}
                variants={{
                  hidden: { 
                    opacity: 0, 
                    scale: 0.8, 
                    y: 20 
                  },
                  visible: { 
                    opacity: 1, 
                    scale: 1, 
                    y: 0,
                    transition: {
                      type: "spring" as const,
                      stiffness: 300,
                      damping: 24
                    }
                  }
                }}
                className={`relative flex items-center gap-2 text-sm px-4 py-3 rounded-lg border whitespace-nowrap transition-all duration-300 hover:shadow-md group min-w-fit
                  ${isActive 
                    ? `${etapa.bgColor} ${etapa.color} border-current shadow-sm ring-2 ring-current ring-opacity-20` 
                    : isPast 
                      ? 'bg-green-50 text-green-600 border-green-200' 
                      : isFuture 
                        ? 'bg-gray-50 text-gray-400 border-gray-200'
                        : 'bg-gray-100 text-gray-600 border-gray-300'
                  }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Icon size={18} className={`${isActive ? 'animate-pulse' : ''} flex-shrink-0`} />
                <span className="font-medium">{etapa.label}</span>
                
                {/* ✅ Tooltip on hover */}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-20 shadow-lg">
                  {etapa.description}
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                </div>
                
                {/* ✅ Connection line */}
                {i < estados.length - 1 && (
                  <div className={`absolute top-1/2 -right-2 w-4 h-0.5 transform -translate-y-1/2 transition-colors z-10
                    ${isPast ? 'bg-green-400' : 'bg-gray-300'}`} />
                )}
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* ✅ Enhanced Action Buttons */}
      {(puedeAvanzar || puedeRechazar || puedeResetear) && (
        <motion.div 
          className="flex flex-wrap gap-3 pt-4"
          variants={{
            hidden: { 
              opacity: 0, 
              scale: 0.8, 
              y: 20 
            },
            visible: { 
              opacity: 1, 
              scale: 1, 
              y: 0,
              transition: {
                type: "spring" as const,
                stiffness: 300,
                damping: 24
              }
            }
          }}
        >
          {puedeAvanzar && flujo.siguiente && siguienteEstado && (
            <Button
              onClick={() => cambiarEstado(flujo.siguiente!, `➡️ Estado actualizado a "${siguienteEstado.label}"`)}              variant="default"
              size="sm"
              disabled={loading}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ArrowRight className="w-4 h-4" />
              )}
              Avanzar a {siguienteEstado.label}
            </Button>
          )}

          {puedeRechazar && flujo.rechazar && (
            <AlertDialog open={openRechazo} onOpenChange={setOpenRechazo}>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Rechazar
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="sm:max-w-md">
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    ¿Deseas rechazar esta lista?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta acción cambiará el estado a "Rechazado". Por favor, indica la razón del rechazo para que el equipo pueda realizar las correcciones necesarias.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Justificación del rechazo *
                  </label>
                  <Textarea
                    placeholder="Describe las razones del rechazo y las correcciones necesarias..."
                    value={justificacion}
                    onChange={(e) => setJustificacion(e.target.value)}
                    rows={4}
                    className="resize-none"
                  />
                  {justificacion.trim().length > 0 && justificacion.trim().length < 10 && (
                    <p className="text-xs text-amber-600">
                      La justificación debe tener al menos 10 caracteres
                    </p>
                  )}
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

          {puedeResetear && flujo.reset && (
            <AlertDialog open={openReset} onOpenChange={setOpenReset}>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={loading}
                  className="flex items-center gap-2 border-amber-300 text-amber-700 hover:bg-amber-50"
                >
                  <RotateCcw className="w-4 h-4" />
                  Restaurar
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="sm:max-w-md">
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <RotateCcw className="w-5 h-5 text-amber-500" />
                    ¿Restaurar esta lista a "Borrador"?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta acción reiniciará completamente el flujo de aprobación, devolviendo la lista al estado inicial. Todos los avances en el proceso se perderán.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-amber-800">
                      <p className="font-medium mb-1">Consecuencias de esta acción:</p>
                      <ul className="list-disc list-inside space-y-1 text-xs">
                        <li>El estado volverá a "Borrador"</li>
                        <li>Se perderán todas las aprobaciones previas</li>
                        <li>Será necesario repetir todo el proceso</li>
                      </ul>
                    </div>
                  </div>
                </div>
                
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
        </motion.div>
      )}
    </motion.div>
  )
}
