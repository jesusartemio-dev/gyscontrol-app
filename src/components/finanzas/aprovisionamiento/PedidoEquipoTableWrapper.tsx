'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { PedidoEquipoTable } from './PedidoEquipoTable';
import type { PedidoEquipo, EstadoPedido } from '@/types/modelos';

interface PedidoEquipoTableWrapperProps {
  data: PedidoEquipo[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  sorting?: {
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  };
}

/**
 * ✅ Client Component wrapper for PedidoEquipoTable
 * Handles event handlers that cannot be passed from Server Components
 */
export const PedidoEquipoTableWrapper: React.FC<PedidoEquipoTableWrapperProps> = ({
  data,
  pagination,
  sorting
}) => {
  const router = useRouter();

  // 🔁 Event handlers
  const handlePedidoClick = (pedido: PedidoEquipo) => {
    // Navegar al detalle del pedido dentro del proyecto
    if (pedido.proyectoId) {
      router.push(`/proyectos/${pedido.proyectoId}/equipos/pedidos/${pedido.id}`);
    } else {
      // Fallback si no hay proyectoId
      router.push(`/finanzas/aprovisionamiento/pedidos/${pedido.id}`);
    }
  };

  const handleEdit = (pedido: PedidoEquipo) => {
    console.log('Edit pedido:', pedido.id);
    // Navegar a edición
    if (pedido.proyectoId) {
      router.push(`/proyectos/${pedido.proyectoId}/equipos/pedidos/${pedido.id}?edit=true`);
    }
  };

  const handleDelete = (pedido: PedidoEquipo) => {
    console.log('Delete pedido:', pedido.id);
    // TODO: Implement delete functionality
  };

  const handleUpdateStatus = (pedido: PedidoEquipo, newStatus: EstadoPedido) => {
    console.log('Update status:', pedido.id, newStatus);
    // TODO: Implement status update functionality
  };

  const handleViewTracking = (pedido: PedidoEquipo) => {
    if (pedido.proyectoId) {
      router.push(`/proyectos/${pedido.proyectoId}/equipos/pedidos/${pedido.id}#tracking`);
    } else {
      router.push(`/finanzas/aprovisionamiento/pedidos/${pedido.id}/tracking`);
    }
  };

  const handleContactSupplier = (pedido: PedidoEquipo) => {
    console.log('Contact supplier for pedido:', pedido.id);
    // TODO: Implement supplier contact functionality
  };

  return (
    <PedidoEquipoTable
      data={data}
      pagination={pagination}
      sorting={sorting}
      onPedidoClick={handlePedidoClick}
      onEdit={handleEdit}
      onDelete={handleDelete}
      onUpdateStatus={handleUpdateStatus}
      onViewTracking={handleViewTracking}
      onContactSupplier={handleContactSupplier}
    />
  );
};

export default PedidoEquipoTableWrapper;
