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

import { useState } from 'react'

const estados: { key: EstadoListaEquipo; label: string; icon: any }[] = [
  { key: 'borrador', label: 'Borrador', icon: Clock },
  { key: 'por_revisar', label: 'Por revisar', icon: RefreshCcw },
  { key: 'por_cotizar', label: 'Por cotizar', icon: RefreshCcw },
  { key: 'por_validar', label: 'Por validar', icon: ShieldCheck },
  { key: 'por_aprobar', label: 'Por aprobar', icon: AlertCircle },
  { key: 'aprobado', label: 'Aprobado', icon: CheckCircle },
  { key: 'rechazado', label: 'Rechazado', icon: Ban },
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

  const cambiarEstado = async (nuevoEstado: EstadoListaEquipo, mensaje: string) => {
    if (!listaId) return
    try {
      const updated = await updateListaEstado(listaId, nuevoEstado)
      if (updated) {
        toast.success(mensaje)
        onUpdated?.(nuevoEstado)
      }
    } catch {
      toast.error('❌ Error al cambiar el estado')
    }
  }

  return (
    <div className="flex items-center gap-2 overflow-x-auto relative">
      {estados.map((etapa, i) => {
        const Icon = etapa.icon
        const isActive = estado === etapa.key
        return (
          <motion.div
            key={etapa.key}
            className={`flex items-center gap-1 text-xs px-3 py-1 rounded-full border whitespace-nowrap transition-all 
              ${isActive ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-gray-100 text-gray-600 border-gray-300'}`}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: i * 0.05 }}
          >
            <Icon size={14} className="mr-1" />
            {etapa.label}
          </motion.div>
        )
      })}

      {(puedeAvanzar || puedeRechazar || puedeResetear) && (
        <div className="flex gap-2 ml-4">
          {puedeAvanzar && flujo.siguiente && (
            <button
              onClick={() => cambiarEstado(flujo.siguiente!, `➡️ Estado actualizado a "${flujo.siguiente!.replace('_', ' ')}"`)}
              className="flex items-center gap-1 text-xs px-3 py-1 rounded-full border border-indigo-600 text-indigo-600 bg-white hover:bg-indigo-50 transition"
            >
              <ArrowRight size={14} />
              Avanzar
            </button>
          )}

          {puedeRechazar && flujo.rechazar && (
            <AlertDialog open={openRechazo} onOpenChange={setOpenRechazo}>
              <AlertDialogTrigger asChild>
                <button
                  className="flex items-center gap-1 text-xs px-3 py-1 rounded-full border border-red-600 text-red-600 bg-white hover:bg-red-50 transition"
                >
                  <X size={14} />
                  Rechazar
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Deseas rechazar esta lista?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Indica la razón del rechazo.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <textarea
                  className="w-full mt-2 p-2 border rounded text-sm"
                  rows={3}
                  placeholder="Escribe la justificación..."
                  value={justificacion}
                  onChange={(e) => setJustificacion(e.target.value)}
                />
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      if (justificacion.trim().length < 3) {
                        toast.error('❗ Justificación obligatoria.')
                        return
                      }
                      cambiarEstado(flujo.rechazar!, '❌ Lista rechazada')
                      setJustificacion('')
                      setOpenRechazo(false)
                    }}
                  >
                    Sí, rechazar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          {puedeResetear && flujo.reset && (
            <AlertDialog open={openReset} onOpenChange={setOpenReset}>
              <AlertDialogTrigger asChild>
                <button
                  className="flex items-center gap-1 text-xs px-3 py-1 rounded-full border border-gray-500 text-gray-700 bg-white hover:bg-gray-100 transition"
                >
                  <RotateCcw size={14} />
                  Restaurar
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Restaurar esta lista a "Borrador"?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta acción reiniciará el flujo. ¿Deseas continuar?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      cambiarEstado(flujo.reset!, '🔄 Estado devuelto a "Borrador"')
                      setOpenReset(false)
                    }}
                  >
                    Sí, restaurar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      )}
    </div>
  )
}
