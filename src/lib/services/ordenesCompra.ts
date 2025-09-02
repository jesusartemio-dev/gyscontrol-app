// ===================================================
// 📁 Archivo: src/lib/services/ordenesCompra.ts
// 📌 Descripción: Servicio para gestión de Órdenes de Compra
// 🧠 Uso: Funciones para CRUD y workflows de órdenes de compra
// ✍️ Autor: Sistema GYS - Módulo Aprovisionamiento Financiero
// 📅 Fecha: 2025-01-21
// ===================================================

import { logger } from '@/lib/logger';
import {
  CreateOrdenCompraPayload,
  UpdateOrdenCompraPayload,
  OrdenCompraFilters
} from '@/types/payloads';
import {
  OrdenCompra,
  OrdenCompraConTodo,
  EstadoOrdenCompra
} from '@/types/modelos';
import {
  AprobarOrdenCompraData,
  CancelarOrdenCompraData,
  RechazarOrdenCompraData
} from '@/lib/validators/logistica';

// ===================================================
// 🔍 Función: Obtener todas las órdenes de compra
// ===================================================
export async function obtenerOrdenesCompra(
  filtros: OrdenCompraFilters = {},
  page: number = 1,
  limit: number = 10
): Promise<{
  ordenes: OrdenCompraConTodo[];
  total: number;
  totalPages: number;
  currentPage: number;
}> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
    const searchParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...Object.entries(filtros).reduce((acc, [key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          acc[key] = value.toString();
        }
        return acc;
      }, {} as Record<string, string>)
    });

    const response = await fetch(`${baseUrl}/api/logistica/ordenes-compra?${searchParams}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const data = await response.json();
    
    logger.info('Órdenes de compra obtenidas exitosamente', {
      filtros,
      page,
      limit,
      total: data.total
    });

    return data;

  } catch (error) {
    logger.error('Error al obtener órdenes de compra', {
      error: error instanceof Error ? error.message : 'Error desconocido',
      filtros,
      page,
      limit
    });
    throw error;
  }
}

// ===================================================
// 🔍 Función: Obtener orden de compra por ID
// ===================================================
export async function obtenerOrdenCompraPorId(
  id: string
): Promise<OrdenCompraConTodo> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
    const response = await fetch(`${baseUrl}/api/logistica/ordenes-compra/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const data = await response.json();
    
    logger.info('Orden de compra obtenida exitosamente', {
      ordenId: id
    });

    return data.orden;

  } catch (error) {
    logger.error('Error al obtener orden de compra', {
      error: error instanceof Error ? error.message : 'Error desconocido',
      ordenId: id
    });
    throw error;
  }
}

// ===================================================
// ✅ Función: Crear nueva orden de compra
// ===================================================
export async function crearOrdenCompra(
  datos: CreateOrdenCompraPayload
): Promise<OrdenCompraConTodo> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
    const response = await fetch(`${baseUrl}/api/logistica/ordenes-compra`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(datos)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const data = await response.json();
    
    logger.info('Orden de compra creada exitosamente', {
      ordenId: data.orden.id,
      numero: data.orden.numero,
      proveedorId: datos.proveedorId,
      total: datos.items?.reduce((sum, item) => sum + (item.cantidad * item.precioUnitario), 0)
    });

    return data.orden;

  } catch (error) {
    logger.error('Error al crear orden de compra', {
      error: error instanceof Error ? error.message : 'Error desconocido',
      datos: {
        proveedorId: datos.proveedorId,
        itemsCount: datos.items?.length || 0
      }
    });
    throw error;
  }
}

// ===================================================
// 🔄 Función: Actualizar orden de compra
// ===================================================
export async function actualizarOrdenCompra(
  id: string,
  datos: UpdateOrdenCompraPayload
): Promise<OrdenCompraConTodo> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
    const response = await fetch(`${baseUrl}/api/logistica/ordenes-compra/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(datos)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const data = await response.json();
    
    logger.info('Orden de compra actualizada exitosamente', {
      ordenId: id,
      cambios: Object.keys(datos)
    });

    return data.orden;

  } catch (error) {
    logger.error('Error al actualizar orden de compra', {
      error: error instanceof Error ? error.message : 'Error desconocido',
      ordenId: id,
      datos: Object.keys(datos)
    });
    throw error;
  }
}

// ===================================================
// 🗑️ Función: Eliminar orden de compra
// ===================================================
export async function eliminarOrdenCompra(
  id: string
): Promise<{ success: boolean; message: string }> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
    const response = await fetch(`${baseUrl}/api/logistica/ordenes-compra/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const data = await response.json();
    
    logger.info('Orden de compra eliminada exitosamente', {
      ordenId: id
    });

    return data;

  } catch (error) {
    logger.error('Error al eliminar orden de compra', {
      error: error instanceof Error ? error.message : 'Error desconocido',
      ordenId: id
    });
    throw error;
  }
}

// ===================================================
// ✅ Función: Aprobar orden de compra
// ===================================================
export async function aprobarOrdenCompra(
  id: string,
  datos: AprobarOrdenCompraData
): Promise<{ success: boolean; message: string; orden: OrdenCompraConTodo }> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
    const response = await fetch(`${baseUrl}/api/logistica/ordenes-compra/${id}/aprobar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(datos)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const data = await response.json();
    
    logger.info('Orden de compra aprobada exitosamente', {
      ordenId: id,
      crearAprovisionamiento: datos.crearAprovisionamiento,
      observaciones: datos.observaciones
    });

    return data;

  } catch (error) {
    logger.error('Error al aprobar orden de compra', {
      error: error instanceof Error ? error.message : 'Error desconocido',
      ordenId: id,
      datos
    });
    throw error;
  }
}

// ===================================================
// ❌ Función: Cancelar orden de compra
// ===================================================
export async function cancelarOrdenCompra(
  id: string,
  datos: CancelarOrdenCompraData
): Promise<{ success: boolean; message: string; orden: OrdenCompraConTodo }> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
    const response = await fetch(`${baseUrl}/api/logistica/ordenes-compra/${id}/cancelar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(datos)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const data = await response.json();
    
    logger.info('Orden de compra cancelada exitosamente', {
      ordenId: id,
      motivo: datos.motivo,
      observaciones: datos.observaciones
    });

    return data;

  } catch (error) {
    logger.error('Error al cancelar orden de compra', {
      error: error instanceof Error ? error.message : 'Error desconocido',
      ordenId: id,
      datos
    });
    throw error;
  }
}

// ===================================================
// 🚫 Función: Rechazar orden de compra
// ===================================================
export async function rechazarOrdenCompra(
  id: string,
  datos: RechazarOrdenCompraData
): Promise<{ success: boolean; message: string; orden: OrdenCompraConTodo }> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
    const response = await fetch(`${baseUrl}/api/logistica/ordenes-compra/${id}/rechazar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(datos)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const data = await response.json();
    
    logger.info('Orden de compra rechazada exitosamente', {
      ordenId: id,
      motivo: datos.motivo,
      requiereRevision: datos.requiereRevision,
      observaciones: datos.observaciones
    });

    return data;

  } catch (error) {
    logger.error('Error al rechazar orden de compra', {
      error: error instanceof Error ? error.message : 'Error desconocido',
      ordenId: id,
      datos
    });
    throw error;
  }
}

// ===================================================
// 📊 Función: Obtener estadísticas de órdenes de compra
// ===================================================
export async function obtenerEstadisticasOrdenesCompra(
  filtros: {
    fechaInicio?: string;
    fechaFin?: string;
    proveedorId?: string;
    estado?: EstadoOrdenCompra;
  } = {}
): Promise<{
  totalOrdenes: number;
  montoTotal: number;
  porEstado: Record<EstadoOrdenCompra, number>;
  porProveedor: Array<{ proveedor: string; cantidad: number; monto: number }>;
  tendenciaMensual: Array<{ mes: string; cantidad: number; monto: number }>;
}> {
  try {
    // 📊 Esta función podría hacer múltiples llamadas a la API para obtener estadísticas
    // o podríamos crear un endpoint específico para estadísticas
    
    const ordenes = await obtenerOrdenesCompra(filtros, 1, 1000); // Obtener todas para calcular estadísticas
    
    const estadisticas = {
      totalOrdenes: ordenes.total,
      montoTotal: ordenes.ordenes.reduce((sum, orden) => sum + (orden.total || 0), 0),
      porEstado: ordenes.ordenes.reduce((acc, orden) => {
        acc[orden.estado] = (acc[orden.estado] || 0) + 1;
        return acc;
      }, {} as Record<EstadoOrdenCompra, number>),
      porProveedor: Object.values(
        ordenes.ordenes.reduce((acc, orden) => {
          const proveedorNombre = orden.proveedor?.nombre || 'Sin proveedor';
          if (!acc[proveedorNombre]) {
            acc[proveedorNombre] = { proveedor: proveedorNombre, cantidad: 0, monto: 0 };
          }
          acc[proveedorNombre].cantidad += 1;
          acc[proveedorNombre].monto += orden.total || 0;
          return acc;
        }, {} as Record<string, { proveedor: string; cantidad: number; monto: number }>)
      ),
      tendenciaMensual: [] // Se podría implementar agrupando por mes
    };
    
    logger.info('Estadísticas de órdenes de compra calculadas', {
      filtros,
      totalOrdenes: estadisticas.totalOrdenes,
      montoTotal: estadisticas.montoTotal
    });

    return estadisticas;

  } catch (error) {
    logger.error('Error al obtener estadísticas de órdenes de compra', {
      error: error instanceof Error ? error.message : 'Error desconocido',
      filtros
    });
    throw error;
  }
}

// ===================================================
// 🔍 Función: Buscar órdenes de compra
// ===================================================
export async function buscarOrdenesCompra(
  termino: string,
  filtros: OrdenCompraFilters = {},
  limit: number = 10
): Promise<OrdenCompraConTodo[]> {
  try {
    // 🔍 Buscar por número, proveedor, o descripción
    const filtrosBusqueda: FiltrosOrdenCompra = {
      ...filtros,
      busqueda: termino
    };

    const resultado = await obtenerOrdenesCompra(filtrosBusqueda, 1, limit);
    
    logger.info('Búsqueda de órdenes de compra realizada', {
      termino,
      filtros,
      resultados: resultado.ordenes.length
    });

    return resultado.ordenes;

  } catch (error) {
    logger.error('Error al buscar órdenes de compra', {
      error: error instanceof Error ? error.message : 'Error desconocido',
      termino,
      filtros
    });
    throw error;
  }
}

// ===================================================
// 📋 Función: Validar orden de compra antes de aprobar
// ===================================================
export async function validarOrdenCompraParaAprobacion(
  id: string
): Promise<{
  esValida: boolean;
  errores: string[];
  advertencias: string[];
}> {
  try {
    const orden = await obtenerOrdenCompraPorId(id);
    
    const errores: string[] = [];
    const advertencias: string[] = [];

    // ✅ Validaciones obligatorias
    if (orden.estado !== 'PENDIENTE') {
      errores.push('La orden debe estar en estado PENDIENTE para ser aprobada');
    }

    if (!orden.items || orden.items.length === 0) {
      errores.push('La orden debe tener al menos un item');
    }

    if (orden.items) {
      for (const item of orden.items) {
        if (!item.precioUnitario || item.precioUnitario <= 0) {
          errores.push(`El item ${item.producto?.nombre || item.productoId} no tiene precio unitario válido`);
        }
        if (!item.cantidad || item.cantidad <= 0) {
          errores.push(`El item ${item.producto?.nombre || item.productoId} no tiene cantidad válida`);
        }
      }
    }

    if (!orden.proveedor) {
      errores.push('La orden debe tener un proveedor asignado');
    }

    // ⚠️ Validaciones de advertencia
    if (!orden.fechaEntregaEstimada) {
      advertencias.push('No se ha especificado fecha de entrega estimada');
    }

    if (orden.total && orden.total > 10000) {
      advertencias.push('El monto de la orden es superior a $10,000 - requiere aprobación especial');
    }

    const resultado = {
      esValida: errores.length === 0,
      errores,
      advertencias
    };
    
    logger.info('Validación de orden de compra completada', {
      ordenId: id,
      esValida: resultado.esValida,
      erroresCount: errores.length,
      advertenciasCount: advertencias.length
    });

    return resultado;

  } catch (error) {
    logger.error('Error al validar orden de compra', {
      error: error instanceof Error ? error.message : 'Error desconocido',
      ordenId: id
    });
    throw error;
  }
}

// ===================================================
// 📄 Función: Generar PDF de orden de compra
// ===================================================
export async function generarPDFOrdenCompra(
  id: string
): Promise<Blob> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
    const response = await fetch(`${baseUrl}/api/logistica/ordenes-compra/${id}/pdf`, {
      method: 'GET',
      headers: {
        'Accept': 'application/pdf',
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const pdfBlob = await response.blob();
    
    logger.info('PDF de orden de compra generado exitosamente', {
      ordenId: id,
      size: pdfBlob.size
    });

    return pdfBlob;

  } catch (error) {
    logger.error('Error al generar PDF de orden de compra', {
      error: error instanceof Error ? error.message : 'Error desconocido',
      ordenId: id
    });
    throw error;
  }
}