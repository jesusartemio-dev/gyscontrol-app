/**
 * ===================================================
 * COMPONENTE: ProgresoItemCard
 * ===================================================
 * 
 * Tarjeta que muestra el progreso de entrega de un item
 * con indicadores visuales y métricas de seguimiento.
 * 
 * @author GYS Team
 * @version 1.0.0
 */

'use client';

import React from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Package, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Truck,
  Calendar,
  User,
  MapPin
} from 'lucide-react';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

import { EstadoEntregaItem } from '@/types/modelos';
import { obtenerColorEstado } from '@/lib/validators/trazabilidad';
import { cn } from '@/lib/utils';

// ============================
// 🏷️ TIPOS E INTERFACES
// ============================

interface ItemEntrega {
  id: string;
  nombre: string;
  descripcion?: string;
  cantidadSolicitada: number;
  cantidadEntregada: number;
  estadoEntrega: EstadoEntregaItem;
  fechaSolicitud: Date;
  fechaEntregaEstimada?: Date;
  fechaEntregaReal?: Date;
  proveedor?: {
    id: string;
    nombre: string;
  };
  ubicacionEntrega?: string;
  responsableLogistica?: string;
  observaciones?: string;
}

interface ProgresoItemCardProps {
  /** Datos del item */
  item: ItemEntrega;
  /** Mostrar acciones de gestión */
  mostrarAcciones?: boolean;
  /** Función callback para actualizar entrega */
  onActualizarEntrega?: (itemId: string) => void;
  /** Función callback para ver detalles */
  onVerDetalles?: (itemId: string) => void;
  /** Modo compacto */
  compacto?: boolean;
}

// ============================
// 🎨 COMPONENTE PRINCIPAL
// ============================

export function ProgresoItemCard({
  item,
  mostrarAcciones = true,
  onActualizarEntrega,
  onVerDetalles,
  compacto = false
}: ProgresoItemCardProps) {

  // ============================
  // 🧮 CÁLCULOS Y UTILIDADES
  // ============================

  const porcentajeProgreso = item.cantidadSolicitada > 0 
    ? Math.round((item.cantidadEntregada / item.cantidadSolicitada) * 100)
    : 0;

  const cantidadPendiente = item.cantidadSolicitada - item.cantidadEntregada;

  const obtenerIconoEstado = (estado: EstadoEntregaItem) => {
    switch (estado) {
      case EstadoEntregaItem.PENDIENTE:
        return Clock;
      case EstadoEntregaItem.EN_PROCESO:
        return Truck;
      case EstadoEntregaItem.PARCIAL:
        return Package;
      case EstadoEntregaItem.ENTREGADO:
        return CheckCircle;
      case EstadoEntregaItem.RETRASADO:
        return AlertTriangle;
      case EstadoEntregaItem.CANCELADO:
        return XCircle;
      default:
        return Clock;
    }
  };

  const obtenerColorProgreso = (estado: EstadoEntregaItem, porcentaje: number) => {
    if (estado === EstadoEntregaItem.ENTREGADO) return 'bg-green-500';
    if (estado === EstadoEntregaItem.RETRASADO) return 'bg-red-500';
    if (estado === EstadoEntregaItem.CANCELADO) return 'bg-gray-400';
    if (porcentaje >= 75) return 'bg-blue-500';
    if (porcentaje >= 50) return 'bg-yellow-500';
    return 'bg-gray-300';
  };

  const estaRetrasado = () => {
    if (!item.fechaEntregaEstimada) return false;
    return new Date() > item.fechaEntregaEstimada && item.estadoEntrega !== EstadoEntregaItem.ENTREGADO;
  };

  const IconoEstado = obtenerIconoEstado(item.estadoEntrega);

  // ============================
  // 🎨 RENDERIZADO
  // ============================

  return (
    <Card className={cn(
      "w-full transition-all duration-200 hover:shadow-md",
      compacto && "p-2"
    )}>
      <CardHeader className={cn(
        "pb-3",
        compacto && "pb-2 pt-2"
      )}>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <div className={cn(
              "p-2 rounded-lg",
              item.estadoEntrega === EstadoEntregaItem.ENTREGADO ? 'bg-green-100' :
              item.estadoEntrega === EstadoEntregaItem.RETRASADO ? 'bg-red-100' :
              item.estadoEntrega === EstadoEntregaItem.CANCELADO ? 'bg-gray-100' :
              'bg-blue-100'
            )}>
              <IconoEstado className={cn(
                "h-4 w-4",
                item.estadoEntrega === EstadoEntregaItem.ENTREGADO ? 'text-green-600' :
                item.estadoEntrega === EstadoEntregaItem.RETRASADO ? 'text-red-600' :
                item.estadoEntrega === EstadoEntregaItem.CANCELADO ? 'text-gray-600' :
                'text-blue-600'
              )} />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className={cn(
                  "font-semibold text-gray-900 truncate",
                  compacto ? "text-sm" : "text-base"
                )}>
                  {item.nombre}
                </h3>
                {estaRetrasado() && (
                  <Badge variant="destructive" className="text-xs">
                    Retrasado
                  </Badge>
                )}
              </div>
              
              {!compacto && item.descripcion && (
                <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                  {item.descripcion}
                </p>
              )}
              
              <div className="flex items-center gap-4 text-xs text-gray-500">
                {item.proveedor && (
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    <span>{item.proveedor.nombre}</span>
                  </div>
                )}
                {item.ubicacionEntrega && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    <span>{item.ubicacionEntrega}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <Badge className={obtenerColorEstado(item.estadoEntrega)}>
            {item.estadoEntrega.replace('_', ' ').toUpperCase()}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className={cn(
        "pt-0",
        compacto && "px-3 pb-2"
      )}>
        {/* Progreso de Entrega */}
        <div className="space-y-2 mb-4">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">Progreso de Entrega</span>
            <span className="font-medium">
              {item.cantidadEntregada} / {item.cantidadSolicitada}
            </span>
          </div>
          
          <Progress 
            value={porcentajeProgreso} 
            className="h-2"
          />
          
          <div className="flex justify-between items-center text-xs text-gray-500">
            <span>{porcentajeProgreso}% completado</span>
            {cantidadPendiente > 0 && (
              <span>{cantidadPendiente} pendientes</span>
            )}
          </div>
        </div>

        {!compacto && (
          <>
            <Separator className="my-3" />
            
            {/* Fechas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-gray-600">Solicitado</p>
                  <p className="font-medium">
                    {format(item.fechaSolicitud, 'dd/MM/yyyy', { locale: es })}
                  </p>
                </div>
              </div>
              
              {item.fechaEntregaEstimada && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-gray-600">Estimada</p>
                    <p className={cn(
                      "font-medium",
                      estaRetrasado() && "text-red-600"
                    )}>
                      {format(item.fechaEntregaEstimada, 'dd/MM/yyyy', { locale: es })}
                    </p>
                  </div>
                </div>
              )}
              
              {item.fechaEntregaReal && (
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <div>
                    <p className="text-gray-600">Entregado</p>
                    <p className="font-medium text-green-600">
                      {format(item.fechaEntregaReal, 'dd/MM/yyyy', { locale: es })}
                    </p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Observaciones */}
            {item.observaciones && (
              <div className="mt-3 p-2 bg-gray-50 rounded-md">
                <p className="text-xs text-gray-600 mb-1">Observaciones:</p>
                <p className="text-sm text-gray-800">{item.observaciones}</p>
              </div>
            )}
          </>
        )}

        {/* Acciones */}
        {mostrarAcciones && (
          <div className={cn(
            "flex gap-2 pt-3",
            compacto && "pt-2"
          )}>
            {item.estadoEntrega !== EstadoEntregaItem.ENTREGADO && item.estadoEntrega !== EstadoEntregaItem.CANCELADO && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onActualizarEntrega?.(item.id)}
                className="flex-1"
              >
                <Truck className="h-3 w-3 mr-1" />
                Actualizar
              </Button>
            )}
            
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onVerDetalles?.(item.id)}
              className="flex-1"
            >
              Ver Detalles
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ProgresoItemCard;
