'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import {
  PedidoEquipo,
  PedidoEquipoPayload,
  PedidoEquipoUpdatePayload,
  PedidoEquipoItemUpdatePayload,
  ListaEquipo,
} from '@/types'

import {
  getPedidoEquipos,
  createPedidoEquipo,
  updatePedidoEquipo,
  deletePedidoEquipo,
} from '@/lib/services/pedidoEquipo'
import {
  updatePedidoEquipoItem,
  deletePedidoEquipoItem,
} from '@/lib/services/pedidoEquipoItem'
import { getListaEquipo } from '@/lib/services/listaEquipo'

import PedidoEquipoForm from '@/components/equipos/PedidoEquipoForm'
import PedidoEquipoAccordion from '@/components/equipos/PedidoEquipoAccordion'

export default function PedidosProyectoPage() {
  const { id: proyectoId } = useParams<{ id: string }>()
  const { data: session } = useSession()

  const [pedidos, setPedidos] = useState<PedidoEquipo[]>([])
  const [listas, setListas] = useState<ListaEquipo[]>([])

  const cargarPedidos = async () => {
    try {
      const data = await getPedidoEquipos()
      const pedidosProyecto = (data || []).filter(p => p.proyectoId === proyectoId)
      setPedidos(pedidosProyecto)
    } catch {
      toast.error('Error al cargar pedidos')
    }
  }

  const cargarListas = async () => {
    const data = await getListaEquipo(proyectoId)
    setListas(data || [])
  }

  useEffect(() => {
    if (proyectoId) {
      cargarPedidos()
      cargarListas()
    }
  }, [proyectoId])

  const handleCreate = async (payload: PedidoEquipoPayload) => {
    const nuevo = await createPedidoEquipo(payload)
    if (nuevo) {
      toast.success('Pedido registrado')
      cargarPedidos()
    } else {
      toast.error('Error al registrar pedido')
    }
  }

  const handleUpdate = async (id: string, payload: PedidoEquipoUpdatePayload) => {
    const actualizado = await updatePedidoEquipo(id, payload)
    if (actualizado) {
      toast.success('Pedido actualizado')
      cargarPedidos()
    } else {
      toast.error('Error al actualizar pedido')
    }
  }

  const handleDelete = async (id: string) => {
    const ok = await deletePedidoEquipo(id)
    if (ok) {
      toast.success('Pedido eliminado')
      cargarPedidos()
    } else {
      toast.error('Error al eliminar pedido')
    }
  }

  const handleUpdateItem = async (id: string, payload: PedidoEquipoItemUpdatePayload) => {
    const actualizado = await updatePedidoEquipoItem(id, payload)
    if (actualizado) {
      toast.success('Item actualizado')
      cargarPedidos()
    } else {
      toast.error('Error al actualizar ítem')
    }
  }

  const handleDeleteItem = async (id: string) => {
    const ok = await deletePedidoEquipoItem(id)
    if (ok) {
      toast.success('Ítem eliminado')
      cargarPedidos()
    } else {
      toast.error('Error al eliminar ítem')
    }
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">📦 Pedidos de Equipos</h1>

      <PedidoEquipoForm
        listas={listas}
        proyectoId={proyectoId}
        responsableId={session?.user.id || ''}
        onCreated={handleCreate}
      />

      <h2 className="text-xl font-semibold text-gray-800">📋 Pedidos Realizados</h2>

      {pedidos.length === 0 ? (
        <p className="text-sm text-gray-500">No hay pedidos registrados aún.</p>
      ) : (
        pedidos.map(pedido => (
          <PedidoEquipoAccordion
            key={pedido.id}
            pedido={pedido}
            onUpdateItem={handleUpdateItem}
            onDeleteItem={handleDeleteItem}
            onDelete={handleDelete}
            onUpdate={handleUpdate}
          />
        ))
      )}
    </div>
  )
}
