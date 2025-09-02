// ===================================================
// 📁 Archivo: src/lib/services/recepciones.ts
// 📌 Descripción: Servicio para gestión de Recepciones de Material
// 🧠 Uso: Funciones para CRUD y workflows de recepciones
// ✍️ Autor: Sistema GYS - Módulo Logística
// 📅 Fecha: 2025-01-21
// ===================================================

import { logger } from '@/lib/logger';
import {
  CreateRecepcionPayload,
  UpdateRecepcionPayload,
  RecepcionFilters
} from '@/types/payloads';
import {
  Recepcion,
  RecepcionConTodo,
  EstadoRecepcion,
  EstadoInspeccion
} from '@/types/modelos';
import {
  CompletarRecepcionData,
  InspeccionarRecepcionData
} from '@/lib/validators/logistica';

// ===================================================
// 🔍 Función: Obtener todas las recepciones
// ===================================================
export async function obtenerRecepciones(
  filtros: RecepcionFilters = {},
  page: number = 1,
  limit: number = 10
): Promise<{
  recepciones: RecepcionConTodo[];
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

    const response = await fetch(`${baseUrl}/api/logistica/recepciones?${searchParams}`, {
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
    
    logger.info('Recepciones obtenidas exitosamente', {
      filtros,
      page,
      limit,
      total: data.total
    });

    return data;

  } catch (error) {
    logger.error('Error al obtener recepciones', {
      error: error instanceof Error ? error.message : 'Error desconocido',
      filtros,
      page,
      limit
    });
    throw error;
  }
}

// ===================================================
// 🔍 Función: Obtener recepción por ID
// ===================================================
export async function obtenerRecepcionPorId(
  id: string
): Promise<RecepcionConTodo> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
    const response = await fetch(`${baseUrl}/api/logistica/recepciones/${id}`, {
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
    
    logger.info('Recepción obtenida exitosamente', {
      recepcionId: id
    });

    return data.recepcion;

  } catch (error) {
    logger.error('Error al obtener recepción', {
      error: error instanceof Error ? error.message : 'Error desconocido',
      recepcionId: id
    });
    throw error;
  }
}

// ===================================================
// ✅ Función: Crear nueva recepción
// ===================================================
export async function crearRecepcion(
  datos: CreateRecepcionPayload
): Promise<RecepcionConTodo> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
    const response = await fetch(`${baseUrl}/api/logistica/recepciones`, {
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
    
    logger.info('Recepción creada exitosamente', {
      recepcionId: data.recepcion.id,
      numeroRecepcion: data.recepcion.numeroRecepcion,
  
      itemsCount: datos.items?.length || 0
    });

    return data.recepcion;

  } catch (error) {
    logger.error('Error al crear recepción', {
      error: error instanceof Error ? error.message : 'Error desconocido',
      datos: {
    
        itemsCount: datos.items?.length || 0
      }
    });
    throw error;
  }
}

// ===================================================
// 🔄 Función: Actualizar recepción
// ===================================================
export async function actualizarRecepcion(
  id: string,
  datos: UpdateRecepcionPayload
): Promise<RecepcionConTodo> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
    const response = await fetch(`${baseUrl}/api/logistica/recepciones/${id}`, {
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
    
    logger.info('Recepción actualizada exitosamente', {
      recepcionId: id,
      cambios: Object.keys(datos)
    });

    return data.recepcion;

  } catch (error) {
    logger.error('Error al actualizar recepción', {
      error: error instanceof Error ? error.message : 'Error desconocido',
      recepcionId: id,
      datos: Object.keys(datos)
    });
    throw error;
  }
}

// ===================================================
// 🗑️ Función: Eliminar recepción
// ===================================================
export async function eliminarRecepcion(
  id: string
): Promise<{ success: boolean; message: string }> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
    const response = await fetch(`${baseUrl}/api/logistica/recepciones/${id}`, {
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
    
    logger.info('Recepción eliminada exitosamente', {
      recepcionId: id
    });

    return data;

  } catch (error) {
    logger.error('Error al eliminar recepción', {
      error: error instanceof Error ? error.message : 'Error desconocido',
      recepcionId: id
    });
    throw error;
  }
}

// ===================================================
// ✅ Función: Completar recepción
// ===================================================
export async function completarRecepcion(
  id: string,
  datos: CompletarRecepcionData
): Promise<{ success: boolean; message: string; recepcion: RecepcionConTodo }> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
    const response = await fetch(`${baseUrl}/api/logistica/recepciones/${id}/completar`, {
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
    
    logger.info('Recepción completada exitosamente', {
      recepcionId: id,
      fechaCompletado: datos.fechaCompletado,
      observaciones: datos.observaciones
    });

    return data;

  } catch (error) {
    logger.error('Error al completar recepción', {
      error: error instanceof Error ? error.message : 'Error desconocido',
      recepcionId: id,
      datos
    });
    throw error;
  }
}

// ===================================================
// 🔍 Función: Inspeccionar recepción
// ===================================================
export async function inspeccionarRecepcion(
  id: string,
  datos: InspeccionarRecepcionData
): Promise<{ success: boolean; message: string; recepcion: RecepcionConTodo }> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
    const response = await fetch(`${baseUrl}/api/logistica/recepciones/${id}/inspeccionar`, {
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
    
    logger.info('Recepción inspeccionada exitosamente', {
      recepcionId: id,
      fechaInspeccion: datos.fechaInspeccion,
      resultadoInspeccion: datos.resultadoInspeccion,
      itemsInspeccionados: datos.itemsInspeccionados?.length || 0
    });

    return data;

  } catch (error) {
    logger.error('Error al inspeccionar recepción', {
      error: error instanceof Error ? error.message : 'Error desconocido',
      recepcionId: id,
      datos
    });
    throw error;
  }
}

// ===================================================
// 📊 Función: Obtener estadísticas de recepciones
// ===================================================
export async function obtenerEstadisticasRecepciones(
  filtros: {
    fechaInicio?: string;
    fechaFin?: string;

    estado?: EstadoRecepcion;
  } = {}
): Promise<{
  totalRecepciones: number;
  porEstado: Record<EstadoRecepcion, number>;
  porResultadoInspeccion: Record<EstadoInspeccion, number>;
  tiempoPromedioRecepcion: number;
  tasaAprobacion: number;
  tendenciaMensual: Array<{ mes: string; cantidad: number; aprobadas: number; rechazadas: number }>;
}> {
  try {
    const recepciones = await obtenerRecepciones(filtros, 1, 1000); // Obtener todas para calcular estadísticas
    
    const estadisticas = {
      totalRecepciones: recepciones.total,
      porEstado: recepciones.recepciones.reduce((acc, recepcion) => {
        acc[recepcion.estado] = (acc[recepcion.estado] || 0) + 1;
        return acc;
      }, {} as Record<EstadoRecepcion, number>),
      porResultadoInspeccion: recepciones.recepciones.reduce((acc, recepcion) => {
        if (recepcion.resultadoInspeccion) {
          acc[recepcion.resultadoInspeccion] = (acc[recepcion.resultadoInspeccion] || 0) + 1;
        }
        return acc;
      }, {} as Record<ResultadoInspeccion, number>),
      tiempoPromedioRecepcion: 0, // Se calcularía con fechas de creación vs recepción
      tasaAprobacion: 0, // Se calcularía basado en inspecciones aprobadas vs total
      tendenciaMensual: [] // Se implementaría agrupando por mes
    };
    
    // 📊 Calcular tasa de aprobación
    const inspeccionesAprobadas = recepciones.recepciones.filter(
      r => r.resultadoInspeccion === 'APROBADO'
    ).length;
    const totalInspecciones = recepciones.recepciones.filter(
      r => r.resultadoInspeccion !== null
    ).length;
    
    estadisticas.tasaAprobacion = totalInspecciones > 0 
      ? (inspeccionesAprobadas / totalInspecciones) * 100 
      : 0;
    
    logger.info('Estadísticas de recepciones calculadas', {
      filtros,
      totalRecepciones: estadisticas.totalRecepciones,
      tasaAprobacion: estadisticas.tasaAprobacion
    });

    return estadisticas;

  } catch (error) {
    logger.error('Error al obtener estadísticas de recepciones', {
      error: error instanceof Error ? error.message : 'Error desconocido',
      filtros
    });
    throw error;
  }
}

// ===================================================
// 🔍 Función: Buscar recepciones
// ===================================================
export async function buscarRecepciones(
  termino: string,
  filtros: RecepcionFilters = {},
  limit: number = 10
): Promise<RecepcionConTodo[]> {
  try {
    const filtrosBusqueda: RecepcionFilters = {
      ...filtros,
      busqueda: termino
    };

    const resultado = await obtenerRecepciones(filtrosBusqueda, 1, limit);
    
    logger.info('Búsqueda de recepciones realizada', {
      termino,
      filtros,
      resultados: resultado.recepciones.length
    });

    return resultado.recepciones;

  } catch (error) {
    logger.error('Error al buscar recepciones', {
      error: error instanceof Error ? error.message : 'Error desconocido',
      termino,
      filtros
    });
    throw error;
  }
}

// ===================================================
// 🔍 Función: Validar recepción para aprobación
// ===================================================
export async function validarRecepcionParaAprobacion(
  id: string
): Promise<{
  esValida: boolean;
  errores: string[];
  advertencias: string[];
}> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
    const response = await fetch(`${baseUrl}/api/recepciones/${id}/validar-aprobacion`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Error al validar recepción para aprobación');
    }

    const data = await response.json();
    logger.info('Recepción validada para aprobación:', { id, resultado: data });
    return data;
  } catch (error) {
    logger.error('Error al validar recepción para aprobación:', error);
    throw error;
  }
}

// ===================================================
// 📋 Función: Validar recepción antes de completar
// ===================================================
export async function validarRecepcionParaCompletar(
  id: string
): Promise<{
  esValida: boolean;
  errores: string[];
  advertencias: string[];
}> {
  try {
    const recepcion = await obtenerRecepcionPorId(id);
    
    const errores: string[] = [];
    const advertencias: string[] = [];

    // ✅ Validaciones obligatorias
    if (recepcion.estado !== 'PENDIENTE' && recepcion.estado !== 'EN_INSPECCION') {
      errores.push('La recepción debe estar en estado PENDIENTE o EN_INSPECCION para ser completada');
    }

    if (!recepcion.items || recepcion.items.length === 0) {
      errores.push('La recepción debe tener al menos un item');
    }

    if (recepcion.items) {
      for (const item of recepcion.items) {
        if (!item.cantidadRecibida || item.cantidadRecibida <= 0) {
          errores.push(`El item ${item.producto?.nombre || item.productoId} no tiene cantidad recibida válida`);
        }
      }
    }

    if (!recepcion.fechaRecepcion) {
      errores.push('La recepción debe tener una fecha de recepción');
    }

    // ⚠️ Validaciones de advertencia
    if (recepcion.estado === 'EN_INSPECCION' && !recepcion.fechaInspeccion) {
      advertencias.push('La recepción está en inspección pero no tiene fecha de inspección');
    }

    if (recepcion.items) {
      const itemsConDiferencias = recepcion.items.filter(
        item => item.cantidadRecibida !== item.cantidadEsperada
      );
      if (itemsConDiferencias.length > 0) {
        advertencias.push(`${itemsConDiferencias.length} items tienen diferencias entre cantidad esperada y recibida`);
      }
    }

    const resultado = {
      esValida: errores.length === 0,
      errores,
      advertencias
    };
    
    logger.info('Validación de recepción completada', {
      recepcionId: id,
      esValida: resultado.esValida,
      erroresCount: errores.length,
      advertenciasCount: advertencias.length
    });

    return resultado;

  } catch (error) {
    logger.error('Error al validar recepción', {
      error: error instanceof Error ? error.message : 'Error desconocido',
      recepcionId: id
    });
    throw error;
  }
}



// ===================================================
// 📄 Función: Generar PDF de recepción
// ===================================================
export async function generarPDFRecepcion(
  id: string
): Promise<Blob> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
    const response = await fetch(`${baseUrl}/api/logistica/recepciones/${id}/pdf`, {
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
    
    logger.info('PDF de recepción generado exitosamente', {
      recepcionId: id,
      size: pdfBlob.size
    });

    return pdfBlob;

  } catch (error) {
    logger.error('Error al generar PDF de recepción', {
      error: error instanceof Error ? error.message : 'Error desconocido',
      recepcionId: id
    });
    throw error;
  }
}