/**
 * Componentes para diferentes opciones de visualización de la columna Pedidos
 * Permite mostrar múltiples códigos de pedidos y disponibilidad
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ListaEquipoItem } from '@/types/modelos';
import {
  obtenerTodosLosPedidos,
  obtenerPedidosPorEstado,
  calcularDisponibilidad,
  generarResumenPedidos,
  obtenerColorDisponibilidad
} from '@/lib/utils/pedidoDisplayHelpers';
import { Package, Eye, ChevronDown } from 'lucide-react';

interface PedidosColumnProps {
  item: ListaEquipoItem;
  onNavigateToPedido?: (codigo: string) => void;
}

// ✅ OPCIÓN 1: Columna mejorada con lista vertical + disponibilidad
export function PedidosColumnEnhanced({ item, onNavigateToPedido }: PedidosColumnProps) {
  const pedidos = obtenerTodosLosPedidos(item);
  const disponibilidad = calcularDisponibilidad(item);
  const resumen = generarResumenPedidos(item);

  if (pedidos.length === 0) {
    return (
      <div className="flex flex-col gap-1">
        <Badge variant="outline" className={obtenerColorDisponibilidad('disponible')}>
          Disponible
        </Badge>
        <span className="text-xs text-muted-foreground">
          {disponibilidad.cantidadDisponible} {item.unidad}
        </span>
      </div>
    );
  }

  if (pedidos.length === 1) {
    return (
      <div className="flex flex-col gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-auto p-1 justify-start font-mono text-xs"
          onClick={() => onNavigateToPedido?.(pedidos[0])}
        >
          {pedidos[0]}
        </Button>
        {disponibilidad.cantidadDisponible > 0 && (
          <Badge variant="outline" className={obtenerColorDisponibilidad('parcial')}>
            +{disponibilidad.cantidadDisponible} disp.
          </Badge>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-auto p-1 justify-between">
            <span className="font-mono text-xs">{pedidos.length} pedidos</span>
            <ChevronDown className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3">
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Pedidos del ítem</h4>
            <div className="space-y-1">
              {pedidos.map((codigo) => (
                <Button
                  key={codigo}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start font-mono text-xs"
                  onClick={() => onNavigateToPedido?.(codigo)}
                >
                  {codigo}
                </Button>
              ))}
            </div>
            <div className="pt-2 border-t">
              <div className="text-xs text-muted-foreground">
                Disponible: {disponibilidad.cantidadDisponible} {item.unidad}
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
      {disponibilidad.cantidadDisponible > 0 && (
        <Badge variant="outline" className={obtenerColorDisponibilidad('parcial')}>
          +{disponibilidad.cantidadDisponible} disp.
        </Badge>
      )}
    </div>
  );
}

// ✅ OPCIÓN 2: Componente para columna de Pedidos (separada de Disponibilidad)
export function PedidosColumnSeparate({ item, onNavigateToPedido }: PedidosColumnProps) {
  const pedidos = obtenerTodosLosPedidos(item);

  if (pedidos.length === 0) {
    return (
      <Badge variant="outline" className="text-muted-foreground">
        Sin pedidos
      </Badge>
    );
  }

  if (pedidos.length === 1) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="h-auto p-1 justify-start font-mono text-xs"
        onClick={() => onNavigateToPedido?.(pedidos[0])}
      >
        {pedidos[0]}
      </Button>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-auto p-1 justify-between">
          <span className="font-mono text-xs">{pedidos.length} pedidos</span>
          <ChevronDown className="h-3 w-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-3">
        <div className="space-y-2">
          <h4 className="font-medium text-sm">Pedidos</h4>
          <div className="space-y-1">
            {pedidos.map((codigo) => (
              <Button
                key={codigo}
                variant="ghost"
                size="sm"
                className="w-full justify-start font-mono text-xs"
                onClick={() => onNavigateToPedido?.(codigo)}
              >
                {codigo}
              </Button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ✅ OPCIÓN 2: Componente para columna de Disponibilidad (separada de Pedidos)
export function DisponibilidadColumn({ item }: { item: ListaEquipoItem }) {
  const disponibilidad = calcularDisponibilidad(item);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex flex-col gap-1">
            <Badge 
              variant="outline" 
              className={obtenerColorDisponibilidad(disponibilidad.estado)}
            >
              {disponibilidad.cantidadDisponible} {item.unidad}
            </Badge>
            <div className="text-xs text-muted-foreground">
              {disponibilidad.porcentajeDisponible.toFixed(0)}% disp.
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-xs">
            <div>Total: {disponibilidad.cantidadTotal} {item.unidad}</div>
            <div>Pedido: {disponibilidad.cantidadPedida} {item.unidad}</div>
            <div>Disponible: {disponibilidad.cantidadDisponible} {item.unidad}</div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ✅ OPCIÓN 3: Integrar disponibilidad en columna Cat./Unidad
export function CategoriaUnidadEnhanced({ 
  item, 
  categoria, 
  unidad 
}: { 
  item: ListaEquipoItem;
  categoria: string;
  unidad: string;
}) {
  const disponibilidad = calcularDisponibilidad(item);
  const pedidos = obtenerTodosLosPedidos(item);

  return (
    <div className="flex flex-col gap-1">
      <div className="text-sm">
        <div>{categoria}</div>
        <div className="text-muted-foreground">{unidad}</div>
      </div>
      
      {/* Indicador de disponibilidad */}
      <div className="flex items-center gap-1">
        <div 
          className={`w-2 h-2 rounded-full ${
            disponibilidad.estado === 'disponible' ? 'bg-green-500' :
            disponibilidad.estado === 'parcial' ? 'bg-yellow-500' : 'bg-red-500'
          }`}
        />
        <span className="text-xs text-muted-foreground">
          {disponibilidad.cantidadDisponible}/{disponibilidad.cantidadTotal}
        </span>
        {pedidos.length > 0 && (
          <Badge variant="outline" className="text-xs px-1 py-0">
            {pedidos.length}P
          </Badge>
        )}
      </div>
    </div>
  );
}

// ✅ Componente de demostración con todas las opciones
export function PedidosColumnDemo({ item }: { item: ListaEquipoItem }) {
  const handleNavigate = (codigo: string) => {
    console.log(`Navegando a pedido: ${codigo}`);
  };

  return (
    <div className="space-y-6 p-4 border rounded-lg">
      <div>
        <h3 className="font-medium mb-2">Opción 1: Columna Mejorada</h3>
        <PedidosColumnEnhanced item={item} onNavigateToPedido={handleNavigate} />
      </div>
      
      <div className="flex gap-4">
        <div>
          <h3 className="font-medium mb-2">Opción 2A: Solo Pedidos</h3>
          <PedidosColumnSeparate item={item} onNavigateToPedido={handleNavigate} />
        </div>
        <div>
          <h3 className="font-medium mb-2">Opción 2B: Solo Disponibilidad</h3>
          <DisponibilidadColumn item={item} />
        </div>
      </div>
      
      <div>
        <h3 className="font-medium mb-2">Opción 3: Cat./Unidad Mejorada</h3>
        <CategoriaUnidadEnhanced 
          item={item} 
          categoria="VÁLVULAS" 
          unidad="pieza"
        />
      </div>
    </div>
  );
}
