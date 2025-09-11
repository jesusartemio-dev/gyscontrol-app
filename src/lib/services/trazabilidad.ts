/**
 * ===================================================
 * SERVICIO: Trazabilidad
 * ===================================================
 * 
 * Servicio para gestionar la lógica de negocio del sistema 
 * de trazabilidad de entregas y seguimiento de pedidos.
 * 
 * @author GYS Team
 * @version 1.0.0
 */

// 📡 Importaciones
import { prisma } from '../prisma';
import logger from '../logger';
import type {
  TrazabilidadEvent,
  MetricasEntregaData,
  GraficoProgresoData,
  EstadoEntregaItem
} from '../../types/modelos';

// ✅ Configuración base para fetch
const API_BASE = '/api/trazabilidad';

const fetchConfig = {
  headers: {
    'Content-Type': 'application/json',
  },
};

// ============================
// 🔍 CONSULTAS DE TRAZABILIDAD
// ============================

/**
 * Obtiene registros de trazabilidad con filtros
 */
export async function obtenerTrazabilidad(
  entidadId: string,
  entidadTipo: 'PEDIDO' | 'PROYECTO' | 'ITEM'
) {
  try {
    const url = `${API_BASE}?entidadId=${entidadId}&entidadTipo=${entidadTipo}`;
    const response = await fetch(url, fetchConfig);

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    
    // 🔄 Transformar fechas y metadata
    if (result.data?.eventos) {
      result.data.eventos = result.data.eventos.map((evento: any) => ({
        ...evento,
        fecha: new Date(evento.fecha),
        metadata: typeof evento.metadata === 'string' 
          ? JSON.parse(evento.metadata) 
          : evento.metadata
      }));
    }

    return result.data;
  } catch (error) {
    logger.error('Error al obtener trazabilidad', { entidadId, entidadTipo, error });
    throw new Error('Error al obtener trazabilidad');
  }
}

/**
 * Obtiene métricas de entrega para un período específico
 */
export async function obtenerMetricasEntrega(
  periodo: string,
  opciones?: {
    incluirTendencias?: boolean;
    proyectoId?: string;
    proveedorId?: string;
    fechaDesde?: string;
    fechaHasta?: string;
  }
): Promise<MetricasEntregaData> {
  try {
    const params = new URLSearchParams({ periodo });
    
    if (opciones) {
      Object.entries(opciones).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
    }

    const url = `${API_BASE}/metricas?${params.toString()}`;
    const response = await fetch(url, fetchConfig);

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    return result.data;
  } catch (error) {
    logger.error('Error al obtener métricas de entrega', { periodo, opciones, error });
    throw new Error('Error al obtener métricas de entrega');
  }
}

/**
 * Obtiene datos para gráficos de progreso
 */
export async function obtenerDatosGraficoProgreso(
  entidadId: string,
  periodo: 'semanal' | 'mensual' | 'trimestral'
): Promise<GraficoProgresoData> {
  try {
    const url = `${API_BASE}/grafico?entidadId=${entidadId}&periodo=${periodo}`;
    const response = await fetch(url, fetchConfig);

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    return result.data;
  } catch (error) {
    logger.error('Error al obtener datos de gráfico', { entidadId, periodo, error });
    throw new Error('Error al obtener datos de gráfico');
  }
}

/**
 * Obtiene eventos de trazabilidad filtrados
 */
export async function obtenerEventosTrazabilidad(
  filtros: {
    entidadId?: string;
    entidadTipo?: string;
    tipo?: string;
    fechaDesde?: Date;
    fechaHasta?: Date;
  }
) {
  try {
    const params = new URLSearchParams();
    
    Object.entries(filtros).forEach(([key, value]) => {
      if (value) {
        params.append(key, value instanceof Date ? value.toISOString() : String(value));
      }
    });

    const url = `${API_BASE}/eventos?${params.toString()}`;
    const response = await fetch(url, fetchConfig);

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    return result.data;
  } catch (error) {
    logger.error('Error al obtener eventos de trazabilidad', { filtros, error });
    throw new Error('Error al obtener eventos de trazabilidad');
  }
}

// ============================
// ✏️ OPERACIONES DE ESCRITURA
// ============================

/**
 * Crea un nuevo evento de trazabilidad
 */
export async function crearEventoTrazabilidad(
  evento: {
    entidadId: string;
    entidadTipo: 'PEDIDO' | 'PROYECTO' | 'ITEM';
    tipo: 'CREACION' | 'ACTUALIZACION' | 'ENTREGA' | 'CANCELACION';
    descripcion: string;
    metadata?: Record<string, any>;
  }
) {
  try {
    const response = await fetch(`${API_BASE}/eventos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(evento)
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    return result.data;
  } catch (error) {
    logger.error('Error al crear evento de trazabilidad', { evento, error });
    throw new Error('Error al crear evento de trazabilidad');
  }
}

/**
 * Actualiza un evento de trazabilidad existente
 */
export async function actualizarEventoTrazabilidad(
  eventoId: string,
  datos: {
    descripcion?: string;
    metadata?: Record<string, any>;
  }
) {
  try {
    const response = await fetch(`${API_BASE}/eventos/${eventoId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos)
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    return result.data;
  } catch (error) {
    logger.error('Error al actualizar evento de trazabilidad', { eventoId, datos, error });
    throw new Error('Error al actualizar evento de trazabilidad');
  }
}

/**
 * Elimina un evento de trazabilidad
 */
export async function eliminarEventoTrazabilidad(eventoId: string) {
  try {
    const response = await fetch(`${API_BASE}/eventos/${eventoId}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    return true;
  } catch (error) {
    logger.error('Error al eliminar evento de trazabilidad', { eventoId, error });
    throw new Error('Error al eliminar evento de trazabilidad');
  }
}
