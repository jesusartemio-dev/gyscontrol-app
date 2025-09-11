/**
 * ===================================================
 * COMPONENTE: EstadoEntregaBadge
 * ===================================================
 * 
 * Badge personalizado para mostrar estados de entrega
 * con colores, iconos y animaciones apropiadas.
 * 
 * @author GYS Team
 * @version 1.0.0
 */

'use client';

import React from 'react';
import { 
  Clock, 
  Truck, 
  Package, 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  Loader2
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import { EstadoEntregaItem } from '@/types/modelos';
import { cn } from '@/lib/utils';

// ============================
// 🏷️ TIPOS E INTERFACES
// ============================

interface EstadoEntregaBadgeProps {
  /** Estado de entrega a mostrar */
  estado: EstadoEntregaItem;
  /** Mostrar icono junto al texto */
  mostrarIcono?: boolean;
  /** Mostrar tooltip con descripción */
  mostrarTooltip?: boolean;
  /** Tamaño del badge */
  tamaño?: 'sm' | 'md' | 'lg';
  /** Variante del badge */
  variante?: 'default' | 'outline' | 'secondary';
  /** Animación para estados en proceso */
  animado?: boolean;
  /** Función onClick para interactividad */
  onClick?: () => void;
  /** Clase CSS adicional */
  className?: string;
}

// ============================
// 🎨 CONFIGURACIÓN DE ESTILOS
// ============================

const configuracionEstados = {
  [EstadoEntregaItem.PENDIENTE]: {
    label: 'Pendiente',
    descripcion: 'El item está pendiente de procesamiento',
    icono: Clock,
    colores: {
      default: 'bg-gray-100 text-gray-800 hover:bg-gray-200',
      outline: 'border-gray-300 text-gray-700 hover:bg-gray-50',
      secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300'
    },
    animado: false
  },
  [EstadoEntregaItem.EN_PROCESO]: {
    label: 'En Proceso',
    descripcion: 'El item está siendo procesado para entrega',
    icono: Truck,
    colores: {
      default: 'bg-blue-100 text-blue-800 hover:bg-blue-200',
      outline: 'border-blue-300 text-blue-700 hover:bg-blue-50',
      secondary: 'bg-blue-200 text-blue-900 hover:bg-blue-300'
    },
    animado: true
  },
  [EstadoEntregaItem.PARCIAL]: {
    label: 'Parcial',
    descripcion: 'El item ha sido entregado parcialmente',
    icono: Package,
    colores: {
      default: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200',
      outline: 'border-yellow-300 text-yellow-700 hover:bg-yellow-50',
      secondary: 'bg-yellow-200 text-yellow-900 hover:bg-yellow-300'
    },
    animado: false
  },
  [EstadoEntregaItem.ENTREGADO]: {
    label: 'Entregado',
    descripcion: 'El item ha sido entregado completamente',
    icono: CheckCircle,
    colores: {
      default: 'bg-green-100 text-green-800 hover:bg-green-200',
      outline: 'border-green-300 text-green-700 hover:bg-green-50',
      secondary: 'bg-green-200 text-green-900 hover:bg-green-300'
    },
    animado: false
  },
  [EstadoEntregaItem.RETRASADO]: {
    label: 'Retrasado',
    descripcion: 'El item tiene retraso en su entrega',
    icono: AlertTriangle,
    colores: {
      default: 'bg-red-100 text-red-800 hover:bg-red-200',
      outline: 'border-red-300 text-red-700 hover:bg-red-50',
      secondary: 'bg-red-200 text-red-900 hover:bg-red-300'
    },
    animado: false
  },
  [EstadoEntregaItem.CANCELADO]: {
    label: 'Cancelado',
    descripcion: 'El item ha sido cancelado',
    icono: XCircle,
    colores: {
      default: 'bg-gray-100 text-gray-600 hover:bg-gray-200',
      outline: 'border-gray-300 text-gray-600 hover:bg-gray-50',
      secondary: 'bg-gray-200 text-gray-700 hover:bg-gray-300'
    },
    animado: false
  }
};

const tamañosIcono = {
  sm: 'h-3 w-3',
  md: 'h-4 w-4',
  lg: 'h-5 w-5'
};

const tamañosTexto = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base'
};

// ============================
// 🎨 COMPONENTE PRINCIPAL
// ============================

export function EstadoEntregaBadge({
  estado,
  mostrarIcono = true,
  mostrarTooltip = true,
  tamaño = 'md',
  variante = 'default',
  animado = true,
  className,
  onClick
}: EstadoEntregaBadgeProps) {

  // ============================
  // 🧮 CONFIGURACIÓN DEL ESTADO
  // ============================

  const config = configuracionEstados[estado];
  if (!config) {
    console.warn(`Estado de entrega no reconocido: ${estado}`);
    return null;
  }

  const IconoEstado = config.icono;
  const deberiaAnimarse = animado && config.animado;
  const coloresEstado = config.colores[variante];

  // ============================
  // 🎨 COMPONENTE BADGE
  // ============================

  const BadgeComponent = onClick ? (
    <button
      type="button"
      className={cn(
        'inline-flex items-center gap-1.5 font-medium transition-colors rounded-md px-2.5 py-0.5 text-xs font-semibold border-0 bg-transparent',
        coloresEstado,
        tamañosTexto[tamaño],
        deberiaAnimarse && 'animate-pulse',
        'cursor-pointer hover:opacity-80',
        className
      )}
      onClick={onClick}
    >
      {mostrarIcono && (
        <>
          {deberiaAnimarse ? (
            <Loader2 className={cn(tamañosIcono[tamaño], 'animate-spin')} />
          ) : (
            <IconoEstado className={tamañosIcono[tamaño]} />
          )}
        </>
      )}
      <span>{config.label}</span>
    </button>
  ) : (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 font-medium transition-colors rounded-md px-2.5 py-0.5 text-xs font-semibold',
        coloresEstado,
        tamañosTexto[tamaño],
        deberiaAnimarse && 'animate-pulse',
        className
      )}

    >
      {mostrarIcono && (
        <>
          {deberiaAnimarse ? (
            <Loader2 className={cn(tamañosIcono[tamaño], 'animate-spin')} />
          ) : (
            <IconoEstado className={tamañosIcono[tamaño]} />
          )}
        </>
      )}
      <span>{config.label}</span>
    </div>
  );

  // ============================
  // 🎨 RENDERIZADO CON/SIN TOOLTIP
  // ============================

  if (!mostrarTooltip) {
    return BadgeComponent;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {BadgeComponent}
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-center">
            <p className="font-medium">{config.label}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {config.descripcion}
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ============================
// 🔧 COMPONENTES AUXILIARES
// ============================

/**
 * Badge compacto para listas densas
 */
export function EstadoEntregaBadgeCompacto({
  estado,
  className
}: {
  estado: EstadoEntregaItem;
  className?: string;
}) {
  return (
    <EstadoEntregaBadge
      estado={estado}
      tamaño="sm"
      mostrarIcono={false}
      mostrarTooltip={false}
      variante="outline"
      className={className}
    />
  );
}

/**
 * Badge con icono solamente (sin texto)
 */
export function EstadoEntregaIcono({
  estado,
  tamaño = 'md',
  className
}: {
  estado: EstadoEntregaItem;
  tamaño?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const config = configuracionEstados[estado];
  if (!config) return null;

  const IconoEstado = config.icono;
  const deberiaAnimarse = config.animado;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn(
            'inline-flex items-center justify-center rounded-full p-1',
            estado === 'entregado' ? 'bg-green-100 text-green-600' :
            estado === 'retrasado' ? 'bg-red-100 text-red-600' :
            estado === 'cancelado' ? 'bg-gray-100 text-gray-600' :
            estado === 'en_proceso' ? 'bg-blue-100 text-blue-600' :
            estado === 'parcial' ? 'bg-yellow-100 text-yellow-600' :
            'bg-gray-100 text-gray-600',
            className
          )}>
            {deberiaAnimarse ? (
              <Loader2 className={cn(tamañosIcono[tamaño], 'animate-spin')} />
            ) : (
              <IconoEstado className={tamañosIcono[tamaño]} />
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{config.label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Lista de todos los estados disponibles (útil para filtros)
 */
export function ListaEstadosEntrega({
  estadoSeleccionado,
  onSeleccionarEstado,
  mostrarTodos = true
}: {
  estadoSeleccionado?: EstadoEntregaItem;
  onSeleccionarEstado?: (estado: EstadoEntregaItem | null) => void;
  mostrarTodos?: boolean;
}) {
  const estados = Object.keys(configuracionEstados) as EstadoEntregaItem[];

  return (
    <div className="flex flex-wrap gap-2">
      {mostrarTodos && (
        <Badge
          variant={!estadoSeleccionado ? 'default' : 'outline'}
          className="cursor-pointer"
          onClick={() => onSeleccionarEstado?.(null)}
        >
          Todos
        </Badge>
      )}
      {estados.map((estado) => {
        const handleClick = () => onSeleccionarEstado?.(estado);
        return (
          <EstadoEntregaBadge
            key={estado}
            estado={estado}
            variante={estadoSeleccionado === estado ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={handleClick}
          />
        );
      })}
    </div>
  );
}

export default EstadoEntregaBadge;
