'use client';

import React from 'react';
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
  // 🔁 Event handlers
  const handleEdit = (pedido: PedidoEquipo) => {
    console.log('Edit pedido:', pedido.id);
    // TODO: Implement edit functionality
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
    window.location.href = `/finanzas/aprovisionamiento/pedidos/${pedido.id}/tracking`;
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
      onEdit={handleEdit}
      onDelete={handleDelete}
      onUpdateStatus={handleUpdateStatus}
      onViewTracking={handleViewTracking}
      onContactSupplier={handleContactSupplier}
    />
  );
};

export default PedidoEquipoTableWrapper;
