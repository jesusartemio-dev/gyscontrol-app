/**
 * 🎯 PedidoEquiposTableView Component
 *
 * Vista de tabla para lista de pedidos de equipos con filtros y ordenamiento.
 * Similar a EquiposTableView pero adaptado para pedidos.
 *
 * @author GYS Team
 * @version 1.0.0
 */

'use client';

import React, { memo, useMemo, useState } from 'react';
import type { PedidoEquipo } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowUpDown, ArrowUp, ArrowDown, Search, Filter, Eye, Edit, Trash2, Package, Calendar, DollarSign, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Props {
  pedidos: PedidoEquipo[];
  proyectoId?: string; // Optional: if not provided, assumes logistics context
  onEdit?: (pedido: PedidoEquipo) => void;
  onDelete?: (pedidoId: string) => void;
}

// ✅ Función para obtener ícono de ordenamiento
const getSortIcon = (field: string, sortField: string, sortDirection: 'asc' | 'desc') => {
  if (sortField !== field) return <ArrowUpDown className="h-4 w-4" />;
  return sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />;
};

// ✅ Función para obtener color del estado
const getEstadoColor = (estado: string) => {
  switch (estado?.toLowerCase()) {
    case 'completado':
    case 'entregado':
      return 'bg-green-100 text-green-800';
    case 'en_proceso':
    case 'parcial':
      return 'bg-blue-100 text-blue-800';
    case 'pendiente':
      return 'bg-yellow-100 text-yellow-800';
    case 'cancelado':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const PedidoEquiposTableView = memo(function PedidoEquiposTableView({
  pedidos,
  proyectoId,
  onEdit,
  onDelete
}: Props) {
  // Determine navigation path based on context
  const isLogisticsContext = !proyectoId || proyectoId === '';
  const getDetailUrl = (pedidoId: string) => {
    return isLogisticsContext
      ? `/logistica/pedidos/${pedidoId}`
      : `/proyectos/${proyectoId}/equipos/pedidos/${pedidoId}`;
  };
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<string>('fechaPedido');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [filterEstado, setFilterEstado] = useState<string>('todos');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [pedidoToDelete, setPedidoToDelete] = useState<PedidoEquipo | null>(null);

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

  // ✅ Ordenar pedidos
  const sortedPedidos = useMemo(() => {
    return [...filteredPedidos].sort((a, b) => {
      let aValue: any = a[sortField as keyof PedidoEquipo];
      let bValue: any = b[sortField as keyof PedidoEquipo];

      // Manejar campos especiales
      if (sortField === 'totalItems') {
        aValue = a.items?.length || 0;
        bValue = b.items?.length || 0;
      } else if (sortField === 'montoTotal') {
        aValue = a.items?.reduce((sum, item) => sum + (item.costoTotal || 0), 0) || 0;
        bValue = b.items?.reduce((sum, item) => sum + (item.costoTotal || 0), 0) || 0;
      } else if (sortField === 'fechaPedido') {
        aValue = new Date(a.fechaPedido).getTime();
        bValue = new Date(b.fechaPedido).getTime();
      } else if (sortField === 'fechaNecesaria') {
        aValue = new Date(a.fechaNecesaria).getTime();
        bValue = new Date(b.fechaNecesaria).getTime();
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredPedidos, sortField, sortDirection]);

  // ✅ Función para manejar ordenamiento
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // ✅ Calcular totales
  const totales = useMemo(() => {
    return sortedPedidos.reduce((acc, pedido) => ({
      items: acc.items + (pedido.items?.length || 0),
      monto: acc.monto + (pedido.items?.reduce((sum, item) => sum + (item.costoTotal || 0), 0) || 0)
    }), { items: 0, monto: 0 });
  }, [sortedPedidos]);

  // ✅ Función para manejar confirmación de eliminación
  const handleDeleteClick = (pedido: PedidoEquipo) => {
    setPedidoToDelete(pedido);
    setDeleteConfirmOpen(true);
  };

  // ✅ Función para confirmar eliminación
  const handleDeleteConfirm = () => {
    if (pedidoToDelete && onDelete) {
      onDelete(pedidoToDelete.id);
      setDeleteConfirmOpen(false);
      setPedidoToDelete(null);
    }
  };

  // ✅ Función para cancelar eliminación
  const handleDeleteCancel = () => {
    setDeleteConfirmOpen(false);
    setPedidoToDelete(null);
  };

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
          {sortedPedidos.length} de {pedidos.length} pedidos
        </div>
      </div>

      {/* 📊 Tabla */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="font-semibold">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('codigo')}
                    className="h-auto p-0 font-semibold hover:bg-transparent"
                  >
                    Código {getSortIcon('codigo', sortField, sortDirection)}
                  </Button>
                </TableHead>
                <TableHead className="font-semibold">Responsable</TableHead>
                <TableHead className="font-semibold">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('fechaPedido')}
                    className="h-auto p-0 font-semibold hover:bg-transparent"
                  >
                    Fecha Pedido {getSortIcon('fechaPedido', sortField, sortDirection)}
                  </Button>
                </TableHead>
                <TableHead className="font-semibold">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('fechaNecesaria')}
                    className="h-auto p-0 font-semibold hover:bg-transparent"
                  >
                    Fecha Necesaria {getSortIcon('fechaNecesaria', sortField, sortDirection)}
                  </Button>
                </TableHead>
                <TableHead className="font-semibold">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('totalItems')}
                    className="h-auto p-0 font-semibold hover:bg-transparent"
                  >
                    Items {getSortIcon('totalItems', sortField, sortDirection)}
                  </Button>
                </TableHead>
                <TableHead className="font-semibold text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('montoTotal')}
                    className="h-auto p-0 font-semibold hover:bg-transparent"
                  >
                    Monto Total {getSortIcon('montoTotal', sortField, sortDirection)}
                  </Button>
                </TableHead>
                <TableHead className="font-semibold">Estado</TableHead>
                <TableHead className="font-semibold">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedPedidos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                    No se encontraron pedidos que coincidan con los filtros
                  </TableCell>
                </TableRow>
              ) : (
                sortedPedidos.map((pedido) => {
                  const totalItems = pedido.items?.length || 0;
                  const montoTotal = pedido.items?.reduce((sum, item) => sum + (item.costoTotal || 0), 0) || 0;

                  return (
                    <TableRow key={pedido.id} className="hover:bg-gray-50">
                      <TableCell className="font-medium">
                        <div>
                          <div className="font-semibold text-blue-600">{pedido.codigo}</div>
                          {pedido.observacion && (
                            <div className="text-xs text-gray-500 truncate max-w-32" title={pedido.observacion}>
                              {pedido.observacion}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {pedido.responsable?.name || 'Sin asignar'}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(pedido.fechaPedido)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(pedido.fechaNecesaria)}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center gap-1">
                          <Package className="h-4 w-4 text-gray-400" />
                          <span className="font-medium">{totalItems}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(montoTotal)}
                      </TableCell>
                      <TableCell>
                        <Badge className={getEstadoColor(pedido.estado || '')}>
                          {pedido.estado?.replace('_', ' ').toUpperCase() || 'SIN ESTADO'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            asChild
                          >
                            <Link href={getDetailUrl(pedido.id)}>
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
                              onClick={() => handleDeleteClick(pedido)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* 📈 Totales */}
      {sortedPedidos.length > 0 && (
        <div className="flex justify-end">
          <div className="bg-gray-50 p-4 rounded-lg border">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Total Items:</span> {totales.items}
              </div>
              <div>
                <span className="font-medium">Monto Total:</span> {formatCurrency(totales.monto)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🗑️ Modal de confirmación de eliminación */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Confirmar Eliminación
            </AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas eliminar el pedido <strong>{pedidoToDelete?.codigo}</strong>?
              <br />
              <br />
              Esta acción no se puede deshacer y eliminará permanentemente el pedido y todos sus items asociados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDeleteCancel}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Eliminar Pedido
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
});

export default PedidoEquiposTableView;