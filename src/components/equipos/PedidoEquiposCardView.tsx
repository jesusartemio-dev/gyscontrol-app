/**
 * 🎯 PedidoEquiposCardView Component
 *
 * Vista de cards para lista de pedidos de equipos.
 * Similar a EquiposCardView pero adaptado para pedidos.
 *
 * @author GYS Team
 * @version 1.0.0
 */

'use client';

import React, { memo, useMemo, useState } from 'react';
import type { PedidoEquipo } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Filter, Eye, Edit, Trash2, Package, Calendar, DollarSign, User, Truck, Clock, X } from 'lucide-react';
import Link from 'next/link';
import { formatCurrency, formatDate } from '@/lib/utils';

interface Props {
  pedidos: PedidoEquipo[];
  proyectoId: string;
  onEdit?: (pedido: PedidoEquipo) => void;
  onDelete?: (pedidoId: string) => void;
}

// ✅ Función para obtener color del estado
const getEstadoColor = (estado: string) => {
  switch (estado?.toLowerCase()) {
    case 'completado':
    case 'entregado':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'en_proceso':
    case 'parcial':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'pendiente':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'cancelado':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

// ✅ Función para obtener ícono del estado
const getEstadoIcon = (estado: string) => {
  switch (estado?.toLowerCase()) {
    case 'completado':
    case 'entregado':
      return <Truck className="h-4 w-4" />;
    case 'en_proceso':
    case 'parcial':
      return <Package className="h-4 w-4" />;
    case 'pendiente':
      return <Clock className="h-4 w-4" />;
    case 'cancelado':
      return <X className="h-4 w-4" />;
    default:
      return <Package className="h-4 w-4" />;
  }
};

const PedidoEquiposCardView = memo(function PedidoEquiposCardView({
  pedidos,
  proyectoId,
  onEdit,
  onDelete
}: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstado, setFilterEstado] = useState<string>('todos');

  // ✅ Filtrar pedidos
  const filteredPedidos = useMemo(() => {
    return pedidos.filter(pedido => {
      const matchesSearch = searchTerm === '' ||
        pedido.codigo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pedido.responsable?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pedido.items?.some(item => item.descripcion.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesEstado = filterEstado === 'todos' || pedido.estado?.toLowerCase() === filterEstado.toLowerCase();

      return matchesSearch && matchesEstado;
    });
  }, [pedidos, searchTerm, filterEstado]);

  return (
    <div className="space-y-4">
      {/* 🔍 Filtros y búsqueda */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar por código, responsable o items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterEstado} onValueChange={setFilterEstado}>
            <SelectTrigger className="w-48">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filtrar por estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los estados</SelectItem>
              <SelectItem value="pendiente">Pendiente</SelectItem>
              <SelectItem value="en_proceso">En Proceso</SelectItem>
              <SelectItem value="parcial">Parcial</SelectItem>
              <SelectItem value="completado">Completado</SelectItem>
              <SelectItem value="entregado">Entregado</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="text-sm text-gray-600">
          {filteredPedidos.length} de {pedidos.length} pedidos
        </div>
      </div>

      {/* 📋 Grid de Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPedidos.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-500">
            <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No se encontraron pedidos que coincidan con los filtros</p>
          </div>
        ) : (
          filteredPedidos.map((pedido) => {
            const totalItems = pedido.items?.length || 0;
            const montoTotal = pedido.items?.reduce((sum, item) => sum + (item.costoTotal || 0), 0) || 0;
            const itemsEntregados = pedido.items?.filter(item => item.estado === 'entregado').length || 0;
            const progreso = totalItems > 0 ? Math.round((itemsEntregados / totalItems) * 100) : 0;

            return (
              <Card key={pedido.id} className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-blue-500">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg font-semibold text-blue-900 mb-1">
                        {pedido.codigo}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge className={getEstadoColor(pedido.estado || '')}>
                          {getEstadoIcon(pedido.estado || '')}
                          <span className="ml-1">
                            {pedido.estado?.replace('_', ' ').toUpperCase() || 'SIN ESTADO'}
                          </span>
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                      >
                        <Link href={`/proyectos/${proyectoId}/equipos/pedidos/${pedido.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                      {onEdit && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEdit(pedido)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      {onDelete && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDelete(pedido.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Información básica */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <User className="h-4 w-4" />
                      <span>{pedido.responsable?.name || 'Sin asignar'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDate(pedido.fechaPedido)}</span>
                    </div>
                  </div>

                  {/* Estadísticas */}
                  <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-blue-600 mb-1">
                        <Package className="h-4 w-4" />
                        <span className="font-semibold">{totalItems}</span>
                      </div>
                      <p className="text-xs text-gray-500">Items</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-green-600 mb-1">
                        <DollarSign className="h-4 w-4" />
                        <span className="font-semibold text-sm">{formatCurrency(montoTotal)}</span>
                      </div>
                      <p className="text-xs text-gray-500">Total</p>
                    </div>
                  </div>

                  {/* Barra de progreso */}
                  {totalItems > 0 && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs text-gray-600">
                        <span>Progreso</span>
                        <span>{itemsEntregados}/{totalItems} ({progreso}%)</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${progreso}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Observaciones */}
                  {pedido.observacion && (
                    <div className="pt-2 border-t">
                      <p className="text-xs text-gray-600 line-clamp-2" title={pedido.observacion}>
                        {pedido.observacion}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
});

export default PedidoEquiposCardView;