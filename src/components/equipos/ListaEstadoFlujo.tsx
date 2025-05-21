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
} from 'lucide-react'
import { updateListaEstado } from '@/lib/services/listaEquipo'
import type { EstadoListaEquipo } from '@/types/modelos' // ✅ Importación correcta

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
  borrador: { siguiente: 'por_revisar', roles: ['proyectos'] },
  por_revisar: { siguiente: 'por_cotizar', rechazar: 'rechazado', roles: ['coordinador'] },
  por_cotizar: { siguiente: 'por_validar', rechazar: 'rechazado', roles: ['logistico'] },
  por_validar: { siguiente: 'por_aprobar', rechazar: 'rechazado', roles: ['gestor'] },
  por_aprobar: { siguiente: 'aprobado', rechazar: 'rechazado', roles: ['gerente'] },
  aprobado: { roles: [] },
  rechazado: { reset: 'borrador', roles: ['proyectos'] },
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
              className="text-xs bg-indigo-600 text-white px-3 py-1 rounded-full hover:bg-indigo-700 transition"
            >
              ➡️ Avanzar
            </button>
          )}
          {puedeRechazar && flujo.rechazar && (
            <button
              onClick={() => cambiarEstado(flujo.rechazar!, '❌ Lista rechazada')}
              className="text-xs bg-red-600 text-white px-3 py-1 rounded-full hover:bg-red-700 transition"
            >
              ❌ Rechazar
            </button>
          )}
          {puedeResetear && flujo.reset && (
            <button
              onClick={() => cambiarEstado(flujo.reset!, '🔄 Estado devuelto a "Borrador"')}
              className="text-xs bg-gray-600 text-white px-3 py-1 rounded-full hover:bg-gray-700 transition"
            >
              🔄 Restaurar a Borrador
            </button>
          )}
        </div>
      )}
    </div>
  )
}
