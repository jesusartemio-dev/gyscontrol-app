/**
 * Helpers para mejorar la visualización de pedidos en ListaEquipoItem
 * Permite mostrar múltiples códigos de pedidos y estados de disponibilidad
 */

import { ListaEquipoItem, PedidoEquipoItem } from '@/types/modelos';


// ✅ Obtener todos los códigos de pedidos de un item
export function obtenerTodosLosPedidos(item: ListaEquipoItem): string[] {
  if (!item.pedidos || item.pedidos.length === 0) {
    return [];
  }

  return item.pedidos
    .map(pedidoItem => pedidoItem.pedido?.codigo)
    .filter((codigo): codigo is string => Boolean(codigo))
    .sort(); // Ordenar alfabéticamente
}

// ✅ Obtener pedidos agrupados por estado
export function obtenerPedidosPorEstado(item: ListaEquipoItem) {
  if (!item.pedidos || item.pedidos.length === 0) {
    return {
      activos: [],
      completados: [],
      cancelados: []
    };
  }

  const activos: string[] = [];
  const completados: string[] = [];
  const cancelados: string[] = [];

  item.pedidos.forEach(pedidoItem => {
    const codigo = pedidoItem.pedido?.codigo;
    const estado = pedidoItem.pedido?.estado;
    
    if (!codigo) return;

    switch (estado) {
      case 'borrador':
      case 'enviado':
      case 'atendido':
      case 'parcial':
        activos.push(codigo);
        break;
      case 'entregado':
        completados.push(codigo);
        break;
      case 'cancelado':
        cancelados.push(codigo);
        break;
      default:
        activos.push(codigo);
    }
  });

  return {
    activos: activos.sort(),
    completados: completados.sort(),
    cancelados: cancelados.sort()
  };
}

// ✅ Calcular disponibilidad del item
export function calcularDisponibilidad(item: ListaEquipoItem): {
  cantidadTotal: number;
  cantidadPedida: number;
  cantidadDisponible: number;
  porcentajeDisponible: number;
  estado: 'disponible' | 'parcial' | 'agotado';
} {
  const cantidadTotal = item.cantidad || 0;
  const cantidadPedida = item.cantidadPedida || 0;
  const cantidadDisponible = Math.max(0, cantidadTotal - cantidadPedida);
  const porcentajeDisponible = cantidadTotal > 0 ? (cantidadDisponible / cantidadTotal) * 100 : 0;

  let estado: 'disponible' | 'parcial' | 'agotado';
  if (cantidadDisponible === cantidadTotal) {
    estado = 'disponible';
  } else if (cantidadDisponible > 0) {
    estado = 'parcial';
  } else {
    estado = 'agotado';
  }

  return {
    cantidadTotal,
    cantidadPedida,
    cantidadDisponible,
    porcentajeDisponible,
    estado
  };
}

// ✅ Generar texto de resumen para la columna
export function generarResumenPedidos(item: ListaEquipoItem): {
  textoPrincipal: string;
  textoSecundario?: string;
  tieneMultiplesPedidos: boolean;
} {
  const pedidos = obtenerTodosLosPedidos(item);
  const disponibilidad = calcularDisponibilidad(item);

  if (pedidos.length === 0) {
    return {
      textoPrincipal: 'Disponible',
      textoSecundario: `${disponibilidad.cantidadDisponible} ${item.unidad}`,
      tieneMultiplesPedidos: false
    };
  }

  if (pedidos.length === 1) {
    return {
      textoPrincipal: pedidos[0],
      textoSecundario: disponibilidad.cantidadDisponible > 0 
        ? `+${disponibilidad.cantidadDisponible} disp.`
        : undefined,
      tieneMultiplesPedidos: false
    };
  }

  return {
    textoPrincipal: `${pedidos.length} pedidos`,
    textoSecundario: pedidos.slice(0, 2).join(', ') + (pedidos.length > 2 ? '...' : ''),
    tieneMultiplesPedidos: true
  };
}

// ✅ Obtener color del badge según disponibilidad
export function obtenerColorDisponibilidad(estado: 'disponible' | 'parcial' | 'agotado'): string {
  switch (estado) {
    case 'disponible':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'parcial':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'agotado':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}