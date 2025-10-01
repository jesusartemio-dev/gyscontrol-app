/**
 * 🎯 PedidoEstadoFlujoBanner Component
 *
 * Componente para mostrar y gestionar el flujo de estados de un pedido de equipos.
 * Similar a ListaEstadoFlujoBanner pero para pedidos.
 *
 * @author GYS Team
 * @version 1.0.0
 */

'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Clock,
  Send,
  CheckCircle,
  Package,
  Truck,
  X,
  ArrowRight,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { toast } from 'sonner';

// ✅ Props interface
interface PedidoEstadoFlujoBannerProps {
  estado: string;
  pedidoId: string;
  pedidoNombre?: string;
  usuarioId?: string;
  onUpdated?: (nuevoEstado: string) => void;
}

// ✅ Estados del flujo de pedidos
const ESTADOS_FLUJO = [
  {
    key: 'borrador',
    label: 'Borrador',
    icon: Clock,
    color: 'bg-gray-100 text-gray-800 border-gray-200',
    description: 'Pedido en preparación',
    orden: 1
  },
  {
    key: 'enviado',
    label: 'Enviado',
    icon: Send,
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    description: 'Pedido enviado al proveedor',
    orden: 2
  },
  {
    key: 'atendido',
    label: 'Atendido',
    icon: CheckCircle,
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    description: 'Proveedor ha confirmado recepción',
    orden: 3
  },
  {
    key: 'parcial',
    label: 'Parcial',
    icon: Package,
    color: 'bg-orange-100 text-orange-800 border-orange-200',
    description: 'Entregas parciales realizadas',
    orden: 4
  },
  {
    key: 'entregado',
    label: 'Entregado',
    icon: Truck,
    color: 'bg-green-100 text-green-800 border-green-200',
    description: 'Pedido completamente entregado',
    orden: 5
  },
  {
    key: 'cancelado',
    label: 'Cancelado',
    icon: X,
    color: 'bg-red-100 text-red-800 border-red-200',
    description: 'Pedido cancelado',
    orden: 6
  }
];

// ✅ Función para obtener estado por key
const getEstadoInfo = (estadoKey: string) => {
  return ESTADOS_FLUJO.find(estado => estado.key === estadoKey) || ESTADOS_FLUJO[0];
};

// ✅ Función para determinar si un estado puede avanzar al siguiente
const puedeAvanzarA = (estadoActual: string, estadoSiguiente: string): boolean => {
  const estadoActualInfo = getEstadoInfo(estadoActual);
  const estadoSiguienteInfo = getEstadoInfo(estadoSiguiente);

  // No se puede cancelar desde estados finales
  if (estadoSiguiente === 'cancelado' && ['entregado', 'cancelado'].includes(estadoActual)) {
    return false;
  }

  // Solo se puede cancelar desde estados activos
  if (estadoSiguiente === 'cancelado') {
    return ['borrador', 'enviado', 'atendido', 'parcial'].includes(estadoActual);
  }

  // Flujo normal debe ser secuencial
  return estadoSiguienteInfo.orden === estadoActualInfo.orden + 1;
};

// ✅ Componente principal
const PedidoEstadoFlujoBanner: React.FC<PedidoEstadoFlujoBannerProps> = ({
  estado,
  pedidoId,
  pedidoNombre,
  usuarioId,
  onUpdated
}) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingEstado, setPendingEstado] = useState<string>('');

  const estadoActual = getEstadoInfo(estado);

  // ✅ Función para manejar cambio de estado
  const handleEstadoChange = async (nuevoEstado: string) => {
    if (nuevoEstado === estado) return;

    // Verificar si puede avanzar
    if (!puedeAvanzarA(estado, nuevoEstado)) {
      toast.error('No se puede cambiar a este estado desde el estado actual');
      return;
    }

    setPendingEstado(nuevoEstado);
    setShowConfirmDialog(true);
  };

  // ✅ Confirmar cambio de estado
  const confirmarCambioEstado = async () => {
    try {
      setIsUpdating(true);

      // Actualizar el estado a través de la API
      const response = await fetch(`/api/pedido-equipo/${pedidoId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          estado: pendingEstado
        }),
      });

      if (!response.ok) {
        throw new Error('Error al actualizar el estado');
      }

      toast.success(`Estado actualizado a: ${getEstadoInfo(pendingEstado).label}`);

      // Notificar al componente padre
      if (onUpdated) {
        onUpdated(pendingEstado);
      }

    } catch (error) {
      toast.error('Error al actualizar el estado');
    } finally {
      setIsUpdating(false);
      setShowConfirmDialog(false);
      setPendingEstado('');
    }
  };

  return (
    <>
      <Card className="border-l-4 border-l-blue-500 bg-gradient-to-r from-blue-50 to-white">
        <CardContent className="p-6">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Package className="w-5 h-5 text-blue-600" />
                  Estado del Pedido
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Gestiona el flujo de estados del pedido de equipos
                </p>
              </div>
              <Badge className={`${estadoActual.color} px-3 py-1`}>
                <estadoActual.icon className="w-4 h-4 mr-2" />
                {estadoActual.label}
              </Badge>
            </div>

            {/* Flujo de Estados */}
            <div className="flex items-center justify-between">
              {ESTADOS_FLUJO.map((estadoInfo, index) => {
                const isCompleted = estadoInfo.orden < estadoActual.orden;
                const isCurrent = estadoInfo.key === estado;
                const isNext = estadoInfo.orden === estadoActual.orden + 1;
                const canAdvance = isNext && puedeAvanzarA(estado, estadoInfo.key);

                return (
                  <div key={estadoInfo.key} className="flex items-center">
                    {/* Estado */}
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex flex-col items-center"
                    >
                      <Button
                        variant={isCurrent ? "default" : "outline"}
                        size="sm"
                        className={`w-12 h-12 rounded-full p-0 ${
                          isCompleted
                            ? 'bg-green-500 hover:bg-green-600 text-white border-green-500'
                            : isCurrent
                            ? 'bg-blue-500 hover:bg-blue-600 text-white border-blue-500'
                            : canAdvance
                            ? 'hover:bg-blue-100 border-blue-300'
                            : 'opacity-50 cursor-not-allowed'
                        }`}
                        onClick={() => canAdvance && handleEstadoChange(estadoInfo.key)}
                        disabled={!canAdvance && !isCurrent}
                      >
                        <estadoInfo.icon className="w-5 h-5" />
                      </Button>
                      <div className="text-center mt-2">
                        <p className={`text-xs font-medium ${
                          isCurrent ? 'text-blue-600' : 'text-gray-600'
                        }`}>
                          {estadoInfo.label}
                        </p>
                        <p className="text-xs text-gray-500 max-w-20 leading-tight">
                          {estadoInfo.description}
                        </p>
                      </div>
                    </motion.div>

                    {/* Conector */}
                    {index < ESTADOS_FLUJO.length - 1 && (
                      <div className="mx-2">
                        <ArrowRight className={`w-4 h-4 ${
                          estadoInfo.orden < estadoActual.orden
                            ? 'text-green-500'
                            : 'text-gray-300'
                        }`} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Información adicional */}
            <div className="bg-blue-50 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-blue-900">Flujo de Estados</p>
                  <p className="text-blue-700 mt-1">
                    Los estados deben seguirse en orden secuencial.
                    Solo se puede cancelar desde estados activos (Borrador, Enviado, Atendido, Parcial).
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Confirmación de cambio de estado */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Cambio de Estado</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de cambiar el estado del pedido de "{estadoActual.label}" a "
              {pendingEstado ? getEstadoInfo(pendingEstado).label : ''}"?
              <br />
              <br />
              Esta acción quedará registrada en el historial de auditoría.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUpdating}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmarCambioEstado}
              disabled={isUpdating}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isUpdating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Actualizando...
                </>
              ) : (
                'Confirmar Cambio'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default PedidoEstadoFlujoBanner;