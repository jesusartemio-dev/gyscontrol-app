/**
 * 🎯 CotizacionEstadoFlujoBanner Component
 *
 * Componente para mostrar y gestionar el flujo de estados de una cotización de proveedor.
 * Incluye auditoría automática de cambios de estado.
 *
 * @author GYS Team
 * @version 1.0.0
 */

'use client';

import React, { useState } from 'react';
import { EstadoCotizacionProveedor } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Clock,
  Send,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  TrendingUp
} from 'lucide-react';
import { toast } from 'sonner';
import { logStatusChange } from '@/lib/services/auditLogger';

// ✅ Props interface
interface CotizacionEstadoFlujoBannerProps {
  estado: string;
  cotizacionId: string;
  cotizacionNombre?: string;
  usuarioId?: string;
  onUpdated?: (nuevoEstado: string) => void;
}

// ✅ Estados disponibles para cotizaciones de proveedor
const ESTADOS: EstadoCotizacionProveedor[] = [
  'pendiente',
  'solicitado',
  'cotizado',
  'rechazado',
  'seleccionado',
];

// ✅ Función para obtener información del estado
const getEstadoInfo = (estado: string) => {
  switch (estado) {
    case 'pendiente':
      return {
        label: 'Pendiente',
        description: 'Cotización creada pero no enviada',
        icon: Clock,
        color: 'text-orange-600',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200'
      };
    case 'solicitado':
      return {
        label: 'Solicitado',
        description: 'Cotización enviada al proveedor',
        icon: Send,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200'
      };
    case 'cotizado':
      return {
        label: 'Cotizado',
        description: 'Proveedor ha enviado la cotización',
        icon: CheckCircle,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200'
      };
    case 'rechazado':
      return {
        label: 'Rechazado',
        description: 'Cotización rechazada',
        icon: XCircle,
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200'
      };
    case 'seleccionado':
      return {
        label: 'Seleccionado',
        description: 'Cotización seleccionada como ganadora',
        icon: CheckCircle,
        color: 'text-purple-600',
        bgColor: 'bg-purple-50',
        borderColor: 'border-purple-200'
      };
    default:
      return {
        label: 'Desconocido',
        description: 'Estado no reconocido',
        icon: AlertCircle,
        color: 'text-gray-600',
        bgColor: 'bg-gray-50',
        borderColor: 'border-gray-200'
      };
  }
};

// ✅ Función para determinar si un estado es accesible desde el estado actual
const esEstadoAccesible = (estadoActual: string, estadoDestino: string): boolean => {
  const flujoPermitido: Record<string, string[]> = {
    'pendiente': ['solicitado', 'rechazado'],
    'solicitado': ['cotizado', 'rechazado'],
    'cotizado': ['seleccionado', 'rechazado'],
    'rechazado': [], // Estado final
    'seleccionado': [] // Estado final
  };

  return flujoPermitido[estadoActual]?.includes(estadoDestino) || false;
};

// ✅ Componente principal
const CotizacionEstadoFlujoBanner: React.FC<CotizacionEstadoFlujoBannerProps> = ({
  estado,
  cotizacionId,
  cotizacionNombre,
  usuarioId,
  onUpdated
}) => {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingEstado, setPendingEstado] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState(false);

  // ✅ Confirmar cambio de estado
  const confirmarCambioEstado = async () => {
    try {
      setIsUpdating(true);

      // Aquí iría la llamada a la API para actualizar el estado
      // Por ahora simulamos la actualización
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Registrar auditoría del cambio de estado
      if (usuarioId) {
        await logStatusChange({
          entityType: 'COTIZACION',
          entityId: cotizacionId,
          userId: usuarioId,
          oldStatus: estado,
          newStatus: pendingEstado,
          description: cotizacionNombre || `Cotización ${cotizacionId}`
        });
      }

      toast.success(`✅ Estado actualizado a: ${getEstadoInfo(pendingEstado).label}`);

      // Notificar al componente padre
      if (onUpdated) {
        onUpdated(pendingEstado);
      }

    } catch (error) {
      toast.error('❌ Error al actualizar el estado');
    } finally {
      setIsUpdating(false);
      setShowConfirmDialog(false);
      setPendingEstado('');
    }
  };

  const estadoActual = getEstadoInfo(estado);

  return (
    <>
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            Estado del Flujo de Cotización
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Estado Actual */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-full ${estadoActual.bgColor} border ${estadoActual.borderColor}`}>
                <estadoActual.icon className={`h-6 w-6 ${estadoActual.color}`} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {estadoActual.label}
                </h3>
                <p className="text-sm text-gray-600">
                  {estadoActual.description}
                </p>
              </div>
            </div>

            <Badge
              className={`${estadoActual.bgColor} ${estadoActual.color} border ${estadoActual.borderColor} px-3 py-1`}
            >
              Estado Actual
            </Badge>
          </div>

          {/* Estados Disponibles */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Cambiar a otro estado:</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {ESTADOS.filter(estadoOption => estadoOption !== estado).map((estadoOption) => {
                const estadoInfo = getEstadoInfo(estadoOption);
                const isAccessible = esEstadoAccesible(estado, estadoOption);

                return (
                  <Button
                    key={estadoOption}
                    variant={isAccessible ? "outline" : "ghost"}
                    disabled={!isAccessible || isUpdating}
                    onClick={() => {
                      setPendingEstado(estadoOption);
                      setShowConfirmDialog(true);
                    }}
                    className={`h-auto p-4 flex flex-col items-center gap-2 transition-all duration-200 ${
                      isAccessible
                        ? 'hover:bg-blue-50 hover:border-blue-300 border-2'
                        : 'opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <estadoInfo.icon className={`h-5 w-5 ${estadoInfo.color}`} />
                    <span className="font-medium text-sm">{estadoInfo.label}</span>
                    <span className="text-xs text-gray-600 text-center">
                      {estadoInfo.description}
                    </span>
                  </Button>
                );
              })}
            </div>

            {!ESTADOS.filter(estadoOption => estadoOption !== estado && esEstadoAccesible(estado, estadoOption)).length && (
              <div className="text-center py-4">
                <p className="text-sm text-gray-600">
                  No hay estados disponibles para cambiar desde el estado actual.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dialog de Confirmación */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Cambio de Estado</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que quieres cambiar el estado de la cotización
              <strong> {cotizacionNombre || cotizacionId} </strong>
              de <strong>{getEstadoInfo(estado).label}</strong> a{' '}
              <strong>{getEstadoInfo(pendingEstado).label}</strong>?
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-4 py-4">
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-full ${getEstadoInfo(estado).bgColor}`}>
                {React.createElement(getEstadoInfo(estado).icon, {
                  className: `h-4 w-4 ${getEstadoInfo(estado).color}`
                })}
              </div>
              <span className="text-sm">{getEstadoInfo(estado).label}</span>
            </div>

            <div className="flex-1 flex justify-center">
              <div className="flex items-center gap-2 text-blue-600">
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm font-medium">Cambiar a</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-full ${getEstadoInfo(pendingEstado).bgColor}`}>
                {React.createElement(getEstadoInfo(pendingEstado).icon, {
                  className: `h-4 w-4 ${getEstadoInfo(pendingEstado).color}`
                })}
              </div>
              <span className="text-sm">{getEstadoInfo(pendingEstado).label}</span>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
              disabled={isUpdating}
            >
              Cancelar
            </Button>
            <Button
              onClick={confirmarCambioEstado}
              disabled={isUpdating}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isUpdating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Actualizando...
                </>
              ) : (
                'Confirmar Cambio'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CotizacionEstadoFlujoBanner;