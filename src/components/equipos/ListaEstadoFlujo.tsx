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
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { RollbackButton } from '@/components/RollbackButton'

import { useState } from 'react'

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
    key: 'por_aprobar',
    label: 'Por aprobar',
    icon: AlertCircle,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 border-purple-300',
    description: 'Pendiente de aprobación final'
  },
  {
    key: 'aprobada',
    label: 'Aprobada',
    icon: CheckCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-50 border-green-300',
    description: 'Lista aprobada y lista para uso'
  },
  {
    key: 'anulada',
    label: 'Anulada',
    icon: Ban,
    color: 'text-red-600',
    bgColor: 'bg-red-50 border-red-300',
    description: 'Lista anulada'
  },
]

interface Props {
  estado: EstadoListaEquipo
  listaId?: string
  onUpdated?: (nuevoEstado: EstadoListaEquipo) => void
}

export default function ListaEstadoFlujo({ estado, listaId, onUpdated }: Props) {
  const { data: session } = useSession()
  const rol = session?.user?.role || ''
  const flujo = flujoEstados[estado] || { roles: [] }

  const puedeAvanzar = !!listaId && !!flujo.siguiente && flujo.roles.includes(rol)
  const puedeRetroceder = !!listaId && !!flujo.retroceder && flujo.roles.includes(rol)
  const puedeAnular = !!listaId && canAnular(estado, rol)

  const [motivoAnulacion, setMotivoAnulacion] = useState('')
  const [openAnulacion, setOpenAnulacion] = useState(false)
  const [loading, setLoading] = useState(false)

  const estadoActual = estados.find(e => e.key === estado)
  const siguienteEstado = estados.find(e => e.key === flujo.siguiente)

  const cambiarEstado = async (nuevoEstado: EstadoListaEquipo, mensaje: string, motivo?: string) => {
    if (!listaId) return

    setLoading(true)
    try {
      const updated = await updateListaEstado(listaId, nuevoEstado, motivo)
      if (updated) {
        toast.success(mensaje)
        onUpdated?.(nuevoEstado)
      }
    } catch (error) {
      console.error('Error updating estado:', error)
      toast.error('Error al cambiar el estado')
    } finally {
      setLoading(false)
    }
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
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
      {/* Current Status Display */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge
            variant={estado === 'aprobada' ? 'default' : estado === 'anulada' ? 'destructive' : 'secondary'}
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

      {/* Estado Flow Visualization */}
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

                {/* Tooltip on hover */}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-20 shadow-lg">
                  {etapa.description}
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                </div>

                {/* Connection line */}
                {i < estados.length - 1 && (
                  <div className={`absolute top-1/2 -right-2 w-4 h-0.5 transform -translate-y-1/2 transition-colors z-10
                    ${isPast ? 'bg-green-400' : 'bg-gray-300'}`} />
                )}
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Action Buttons */}
      {(puedeAvanzar || puedeRetroceder || puedeAnular) && (
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
              onClick={() => cambiarEstado(flujo.siguiente!, `Estado actualizado a "${siguienteEstado.label}"`)}
              variant="default"
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

          {/* Retroceder Button */}
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
                  variant="destructive"
                  size="sm"
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  <Ban className="w-4 h-4" />
                  Anular
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="sm:max-w-md">
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    ¿Deseas anular esta lista?
                  </AlertDialogTitle>
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
                    value={motivoAnulacion}
                    onChange={(e) => setMotivoAnulacion(e.target.value)}
                    rows={4}
                    className="resize-none"
                  />
                  {motivoAnulacion.trim().length > 0 && motivoAnulacion.trim().length < 10 && (
                    <p className="text-xs text-amber-600">
                      El motivo debe tener al menos 10 caracteres
                    </p>
                  )}
                </div>

                <AlertDialogFooter>
                  <AlertDialogCancel disabled={loading}>
                    Cancelar
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      if (motivoAnulacion.trim().length < 10) {
                        toast.error('El motivo debe tener al menos 10 caracteres')
                        return
                      }
                      cambiarEstado('anulada' as EstadoListaEquipo, 'Lista anulada', motivoAnulacion.trim())
                      setMotivoAnulacion('')
                      setOpenAnulacion(false)
                    }}
                    disabled={loading || motivoAnulacion.trim().length < 10}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Anulando...
                      </>
                    ) : (
                      'Anular lista'
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
