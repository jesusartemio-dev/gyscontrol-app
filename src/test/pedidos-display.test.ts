/**
 * Tests para los helpers y componentes de visualización de pedidos
 * Valida la lógica de múltiples pedidos y disponibilidad
 */

import {
  obtenerTodosLosPedidos,
  obtenerPedidosPorEstado,
  calcularDisponibilidad,
  generarResumenPedidos,
  obtenerColorDisponibilidad
} from '@/lib/utils/pedidoDisplayHelpers';
import { ListaEquipoItem, PedidoEquipoItem } from '@/types/modelos';

// ✅ Mock data para tests
const mockItemSinPedidos: ListaEquipoItem = {
  id: '1',
  listaId: 'lista1',
  codigo: 'TEST-001',
  descripcion: 'Item de prueba sin pedidos',
  unidad: 'pieza',
  cantidad: 10,
  cantidadPedida: 0,
  cantidadEntregada: 0,
  verificado: true,
  estado: 'aprobado' as any,
  createdAt: new Date(),
  updatedAt: new Date(),
  origen: 'nuevo' as any,
  responsableId: 'user1',
  pedidos: []
};

const mockItemConMultiplesPedidos: ListaEquipoItem = {
  id: '2',
  listaId: 'lista1',
  codigo: 'TEST-002',
  descripcion: 'Item con múltiples pedidos',
  unidad: 'pieza',
  cantidad: 10,
  cantidadPedida: 8,
  cantidadEntregada: 3,
  verificado: true,
  estado: 'aprobado' as any,
  createdAt: new Date(),
  updatedAt: new Date(),
  origen: 'nuevo' as any,
  responsableId: 'user1',
  pedidos: [
    {
      id: 'pedido1',
      pedidoId: 'ped1',
      listaEquipoItemId: '2',
      cantidadPedida: 3,
      estado: 'aprobado' as any,
      createdAt: new Date(),
      updatedAt: new Date(),
      codigo: 'TEST-002',
      descripcion: 'Item con múltiples pedidos',
      unidad: 'pieza',
      responsableId: 'user1',
      pedido: {
        id: 'ped1',
        codigo: 'PED-001',
        estado: 'aprobado' as any,
        fechaPedido: new Date(),
        fechaNecesaria: new Date(),
        numeroSecuencia: 1,
        proyectoId: 'proj1',
        responsableId: 'user1',
        createdAt: new Date(),
        updatedAt: new Date(),
        costoRealTotal: 0,
        esUrgente: false,
        presupuestoTotal: 1000
      }
    },
    {
      id: 'pedido2',
      pedidoId: 'ped2',
      listaEquipoItemId: '2',
      cantidadPedida: 3,
      estado: 'pendiente' as any,
      createdAt: new Date(),
      updatedAt: new Date(),
      codigo: 'TEST-002',
      descripcion: 'Item con múltiples pedidos',
      unidad: 'pieza',
      responsableId: 'user1',
      pedido: {
        id: 'ped2',
        codigo: 'PED-002',
        estado: 'pendiente' as any,
        fechaPedido: new Date(),
        fechaNecesaria: new Date(),
        numeroSecuencia: 2,
        proyectoId: 'proj1',
        responsableId: 'user1',
        createdAt: new Date(),
        updatedAt: new Date(),
        costoRealTotal: 0,
        esUrgente: true,
        presupuestoTotal: 800
      }
    },
    {
      id: 'pedido3',
      pedidoId: 'ped3',
      listaEquipoItemId: '2',
      cantidadPedida: 2,
      estado: 'entregado' as any,
      createdAt: new Date(),
      updatedAt: new Date(),
      codigo: 'TEST-002',
      descripcion: 'Item con múltiples pedidos',
      unidad: 'pieza',
      responsableId: 'user1',
      pedido: {
        id: 'ped3',
        codigo: 'PED-003',
        estado: 'entregado' as any,
        fechaPedido: new Date(),
        fechaNecesaria: new Date(),
        numeroSecuencia: 3,
        proyectoId: 'proj1',
        responsableId: 'user1',
        createdAt: new Date(),
        updatedAt: new Date(),
        costoRealTotal: 0,
        esUrgente: false,
        presupuestoTotal: 600
      }
    }
  ]
};

describe('Pedidos Display Helpers', () => {
  describe('obtenerTodosLosPedidos', () => {
    test('debe retornar array vacío para item sin pedidos', () => {
      const result = obtenerTodosLosPedidos(mockItemSinPedidos);
      expect(result).toEqual([]);
    });

    test('debe retornar todos los pedidos para item con múltiples pedidos', () => {
      const result = obtenerTodosLosPedidos(mockItemConMultiplesPedidos);
      expect(result).toHaveLength(3);
      expect(result.map(p => p.pedido.codigo)).toEqual(['PED-001', 'PED-002', 'PED-003']);
    });
  });

  describe('obtenerPedidosPorEstado', () => {
    test('debe filtrar pedidos por estado correctamente', () => {
      const aprobados = obtenerPedidosPorEstado(mockItemConMultiplesPedidos, 'aprobado');
      const pendientes = obtenerPedidosPorEstado(mockItemConMultiplesPedidos, 'pendiente');
      const entregados = obtenerPedidosPorEstado(mockItemConMultiplesPedidos, 'entregado');

      expect(aprobados).toHaveLength(1);
      expect(pendientes).toHaveLength(1);
      expect(entregados).toHaveLength(1);
      expect(aprobados[0].pedido.codigo).toBe('PED-001');
      expect(pendientes[0].pedido.codigo).toBe('PED-002');
      expect(entregados[0].pedido.codigo).toBe('PED-003');
    });
  });

  describe('calcularDisponibilidad', () => {
    test('debe calcular disponibilidad correctamente para item sin pedidos', () => {
      const result = calcularDisponibilidad(mockItemSinPedidos);
      expect(result).toEqual({
        cantidadDisponible: 10,
        porcentajeDisponible: 100,
        estado: 'disponible'
      });
    });

    test('debe calcular disponibilidad correctamente para item con pedidos', () => {
      const result = calcularDisponibilidad(mockItemConMultiplesPedidos);
      expect(result).toEqual({
        cantidadDisponible: 2, // 10 total - 8 pedida = 2
        porcentajeDisponible: 20, // 2/10 * 100 = 20%
        estado: 'parcial'
      });
    });
  });

  describe('generarResumenPedidos', () => {
    test('debe generar resumen correcto para item sin pedidos', () => {
      const result = generarResumenPedidos(mockItemSinPedidos);
      expect(result).toEqual({
        totalPedidos: 0,
        pedidosActivos: 0,
        cantidadTotalPedida: 0,
        ultimoPedido: null,
        pedidoRelevante: null
      });
    });

    test('debe generar resumen correcto para item con múltiples pedidos', () => {
      const result = generarResumenPedidos(mockItemConMultiplesPedidos);
      expect(result.totalPedidos).toBe(3);
      expect(result.pedidosActivos).toBe(2); // aprobado + pendiente
      expect(result.cantidadTotalPedida).toBe(8);
      expect(result.ultimoPedido?.pedido.codigo).toBe('PED-003');
      expect(result.pedidoRelevante?.pedido.codigo).toBe('PED-002'); // pendiente tiene prioridad
    });
  });

  describe('obtenerColorDisponibilidad', () => {
    test('debe retornar colores correctos según estado', () => {
      expect(obtenerColorDisponibilidad('disponible')).toContain('bg-green');
      expect(obtenerColorDisponibilidad('parcial')).toContain('bg-yellow');
      expect(obtenerColorDisponibilidad('agotado')).toContain('bg-red');
      expect(obtenerColorDisponibilidad('pedido_completo')).toContain('bg-blue');
    });
  });
});

// ✅ Tests de integración para verificar el flujo completo
describe('Flujo completo de visualización de pedidos', () => {
  test('debe manejar correctamente un ítem con múltiples códigos de pedido', () => {
    // Simula el caso: PED-001, PED-002, PED-003
    const pedidos = obtenerTodosLosPedidos(mockItemConMultiplesPedidos);
    const codigos = pedidos.map(p => p.pedido.codigo);
    
    expect(codigos).toContain('PED-001');
    expect(codigos).toContain('PED-002');
    expect(codigos).toContain('PED-003');
    expect(codigos).toHaveLength(3);
  });

  test('debe priorizar pedidos activos sobre entregados', () => {
    const resumen = generarResumenPedidos(mockItemConMultiplesPedidos);
    const pedidoRelevante = resumen.pedidoRelevante;
    
    // Debe priorizar pendiente (PED-002) sobre aprobado (PED-001) y entregado (PED-003)
    expect(pedidoRelevante?.pedido.codigo).toBe('PED-002');
    expect(pedidoRelevante?.pedido.estado).toBe('pendiente');
  });

  test('debe calcular disponibilidad considerando todos los pedidos', () => {
    const disponibilidad = calcularDisponibilidad(mockItemConMultiplesPedidos);
    
    // 10 total - 8 pedida = 2 disponible
    expect(disponibilidad.cantidadDisponible).toBe(2);
    expect(disponibilidad.estado).toBe('parcial');
  });
});