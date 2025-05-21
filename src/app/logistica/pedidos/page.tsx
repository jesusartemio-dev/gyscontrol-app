// ===================================================
// 📁 Archivo: page.tsx
// 📌 Ubicación: src/app/logistica/pedidos/page.tsx
// 🔧 Descripción: Página principal para gestionar pedidos de equipos.
// 🧠 Uso: Vista para logística donde se listan y actualizan pedidos.
// ✍️ Autor: Asistente IA GYS
// 📅 Última actualización: 2025-05-21
// ===================================================

'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  PedidoEquipo,
  PedidoEquipoUpdatePayload,
  PedidoEquipoItemUpdatePayload,
} from '@/types'
import {
  getPedidoEquipos,
  updatePedidoEquipo,
  deletePedidoEquipo,
} from '@/lib/services/pedidoEquipo'
import {
  updatePedidoEquipoItem,
  deletePedidoEquipoItem,
} from '@/lib/services/pedidoEquipoItem'
import PedidoEquipoList from '@/components/equipos/PedidoEquipoList'

export default function PedidosPage() {
  const [pedidos, setPedidos] = useState<PedidoEquipo[]>([])

  const cargarPedidos = async () => {
    try {
      const data = await getPedidoEquipos()
      setPedidos(data || [])
    } catch {
      toast.error('Error al cargar pedidos')
    }
  }

  useEffect(() => {
    cargarPedidos()
  }, [])

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
      toast.success('Ítem actualizado')
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
      <h1 className="text-2xl font-bold">📋 Pedidos de Equipos</h1>

      <PedidoEquipoList
        data={pedidos}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        onUpdateItem={handleUpdateItem}
        onDeleteItem={handleDeleteItem}
      />
    </div>
  )
}
