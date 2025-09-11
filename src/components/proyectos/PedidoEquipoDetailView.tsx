/**
 * PedidoEquipoDetailView Component
 * 
 * Vista detallada de un pedido de equipos que muestra:
 * - Información general del pedido
 * - Lista de items del pedido con detalles
 * - Acciones de edición y gestión
 * 
 * @author GYS Team
 * @version 1.0.0
 */

'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  Calendar,
  User,
  FileText,
  Package,
  AlertCircle,
  CheckCircle,
  Clock,
  Edit,
  Trash2,
  Plus
} from 'lucide-react';
import { PedidoEquipo } from '@/types/modelos';
import { formatCurrency, formatDate } from '@/lib/utils';

// ✅ Props interface
interface PedidoEquipoDetailViewProps {
  pedido: PedidoEquipo;
  proyectoId: string;
  onEdit?: (pedido: PedidoEquipo) => void;
  onDelete?: (pedidoId: string) => void;
  onAddItem?: (pedidoId: string) => void;
  onEditItem?: (itemId: string) => void;
  onDeleteItem?: (itemId: string) => void;
}

// ✅ Status configuration
const getStatusConfig = (estado: string) => {
  const configs = {
    'BORRADOR': {
      variant: 'secondary' as const,
      icon: FileText,
      color: 'text-gray-600',
      bgColor: 'bg-gray-100'
    },
    'PENDIENTE': {
      variant: 'default' as const,
      icon: Clock,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    'APROBADO': {
      variant: 'outline' as const,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    'RECHAZADO': {
      variant: 'destructive' as const,
      icon: AlertCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-100'
    },
    'ENTREGADO': {
      variant: 'outline' as const,
      icon: Package,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100'
    }
  };
  
  return configs[estado as keyof typeof configs] || configs['BORRADOR'];
};

// ✅ Main component
export default function PedidoEquipoDetailView({
  pedido,
  proyectoId,
  onEdit,
  onDelete,
  onAddItem,
  onEditItem,
  onDeleteItem
}: PedidoEquipoDetailViewProps) {
  const statusConfig = getStatusConfig(pedido.estado);
  const StatusIcon = statusConfig.icon;
  
  // 📡 Calculate totals
  const totalItems = pedido.items?.length || 0;
  const totalMonto = pedido.items?.reduce((sum, item) => {
    return sum + (item.cantidadPedida * (item.precioUnitario || 0));
  }, 0) || 0;

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={`p-2 rounded-lg ${statusConfig.bgColor}`}>
            <StatusIcon className={`h-6 w-6 ${statusConfig.color}`} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Pedido {pedido.codigo}
            </h1>
            <p className="text-sm text-gray-500">
              Secuencia #{pedido.numeroSecuencia}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant={statusConfig.variant}>
            {pedido.estado}
          </Badge>
          {onEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(pedido)}
            >
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
          )}
          {onDelete && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => onDelete(pedido.id)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Eliminar
            </Button>
          )}
        </div>
      </div>

      {/* General Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Información General
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-500">
                Responsable
              </label>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-400" />
                <span className="text-sm">
                  {pedido.responsable?.name || 'No asignado'}
                </span>
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-500">
                Fecha de Pedido
              </label>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span className="text-sm">
                  {formatDate(pedido.fechaPedido)}
                </span>
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-500">
                Fecha Necesaria
              </label>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span className="text-sm">
                  {pedido.fechaNecesaria ? formatDate(pedido.fechaNecesaria) : 'No definida'}
                </span>
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-500">
                Fecha Entrega Estimada
              </label>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span className="text-sm">
                  {pedido.fechaEntregaEstimada ? formatDate(pedido.fechaEntregaEstimada) : 'No definida'}
                </span>
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-500">
                Fecha Entrega Real
              </label>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span className="text-sm">
                  {pedido.fechaEntregaReal ? formatDate(pedido.fechaEntregaReal) : 'Pendiente'}
                </span>
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-500">
                Coherencia
              </label>
              <Badge variant={pedido.coherencia ? 'default' : 'secondary'}>
                {pedido.coherencia ? 'Coherente' : 'Revisar'}
              </Badge>
            </div>
          </div>
          
          {pedido.observacion && (
            <>
              <Separator />
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-500">
                  Observaciones
                </label>
                <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                  {pedido.observacion}
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Items Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Items del Pedido ({totalItems})
            </CardTitle>
            {onAddItem && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onAddItem(pedido.id)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Agregar Item
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {totalItems === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">No hay items en este pedido</p>
              {onAddItem && (
                <Button
                  variant="outline"
                  onClick={() => onAddItem(pedido.id)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Primer Item
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Items Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-3 text-sm font-medium text-gray-500">
                        Equipo
                      </th>
                      <th className="text-left py-2 px-3 text-sm font-medium text-gray-500">
                        Cantidad
                      </th>
                      <th className="text-left py-2 px-3 text-sm font-medium text-gray-500">
                        Precio Unit.
                      </th>
                      <th className="text-left py-2 px-3 text-sm font-medium text-gray-500">
                        Subtotal
                      </th>
                      <th className="text-left py-2 px-3 text-sm font-medium text-gray-500">
                        Estado
                      </th>
                      <th className="text-right py-2 px-3 text-sm font-medium text-gray-500">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {pedido.items?.map((item, index) => {
                      const subtotal = item.cantidadPedida * (item.precioUnitario || 0);
                      return (
                        <tr key={item.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-3">
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {item.descripcion || 'Equipo no especificado'}
                              </p>
                              <p className="text-xs text-gray-500">
                                {item.codigo || ''}
                              </p>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-sm text-gray-900">
                            {item.cantidadPedida}
                          </td>
                          <td className="py-3 px-3 text-sm text-gray-900">
                            {formatCurrency(item.precioUnitario || 0)}
                          </td>
                          <td className="py-3 px-3 text-sm font-medium text-gray-900">
                            {formatCurrency(subtotal)}
                          </td>
                          <td className="py-3 px-3">
                            <Badge variant="outline" className="text-xs">
                              {item.estado || 'Pendiente'}
                            </Badge>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {onEditItem && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => onEditItem(item.id)}
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                              )}
                              {onDeleteItem && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => onDeleteItem(item.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              
              {/* Summary */}
              <div className="flex justify-end">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between gap-8">
                    <span className="text-sm font-medium text-gray-600">
                      Total Items:
                    </span>
                    <span className="text-sm font-bold text-gray-900">
                      {totalItems}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-8 mt-2">
                    <span className="text-base font-medium text-gray-900">
                      Monto Total:
                    </span>
                    <span className="text-lg font-bold text-blue-600">
                      {formatCurrency(totalMonto)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
