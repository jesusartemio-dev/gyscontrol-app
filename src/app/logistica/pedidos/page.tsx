// ===================================================
// 📁 Archivo: page.tsx
// 📌 Ubicación: src/app/logistica/pedidos/page.tsx
// 🔧 Descripción: Página principal para gestionar pedidos de equipos.
// 🧠 Uso: Vista para logística donde se listan y actualizan pedidos.
// ✍️ Autor: Asistente IA GYS
// 📅 Última actualización: 2025-05-21
// ===================================================

'use client'

import { toast } from 'sonner'
import {
  PedidoEquipoUpdatePayload,
  PedidoEquipoItemUpdatePayload,
} from '@/types'
import {
  updatePedidoEquipo,
  deletePedidoEquipo,
} from '@/lib/services/pedidoEquipo'
import {
  updatePedidoEquipoItem,
  deletePedidoEquipoItem,
} from '@/lib/services/pedidoEquipoItem'
import PedidoEquipoListWithFilters from '@/components/equipos/PedidoEquipoListWithFilters'

export default function PedidosPage() {

  const handleUpdate = async (id: string, payload: PedidoEquipoUpdatePayload) => {
    const actualizado = await updatePedidoEquipo(id, payload)
    if (actualizado) {
      toast.success('Pedido actualizado')
    } else {
      toast.error('Error al actualizar pedido')
    }
  }

  const handleDelete = async (id: string) => {
    const eliminado = await deletePedidoEquipo(id)
    if (eliminado) {
      toast.success('Pedido eliminado')
    } else {
      toast.error('Error al eliminar pedido')
    }
  }

  const handleUpdateItem = async (
    id: string,
    payload: PedidoEquipoItemUpdatePayload
  ) => {
    const actualizado = await updatePedidoEquipoItem(id, payload)
    if (actualizado) {
      toast.success('Item actualizado')
    } else {
      toast.error('Error al actualizar item')
    }
  }

  const handleDeleteItem = async (id: string) => {
    const eliminado = await deletePedidoEquipoItem(id)
    if (eliminado) {
      toast.success('Item eliminado')
    } else {
      toast.error('Error al eliminar item')
    }
  }

  return (
    <div className="container mx-auto p-6">
      <PedidoEquipoListWithFilters
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        onUpdateItem={handleUpdateItem}
        onDeleteItem={handleDeleteItem}
      />
    </div>
  )
}
