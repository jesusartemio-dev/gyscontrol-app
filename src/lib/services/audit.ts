// ===================================================
// 📊 SERVICIO DE AUDITORÍA
// ===================================================
// Servicio para registrar y consultar el historial de acciones del sistema
// ===================================================

import { prisma } from '../prisma'
import type { User } from '@/types/modelos'

// Tipos para el servicio de auditoría
export interface AuditLogEntry {
  id: string
  entidadTipo: 'LISTA_EQUIPO' | 'PEDIDO_EQUIPO' | 'PROYECTO' | 'COTIZACION' | 'OPORTUNIDAD' | 'LISTA_EQUIPO_ITEM'
  entidadId: string
  accion: string
  usuarioId: string
  descripcion: string
  cambios?: Record<string, { anterior: any; nuevo: any }>
  metadata?: Record<string, any>
  createdAt: string
  usuario?: {
    id: string
    name: string | null
    email: string
  }
}

export interface AuditFilters {
  entidadTipo?: string
  entidadId?: string
  usuarioId?: string
  accion?: string
  fechaDesde?: Date
  fechaHasta?: Date
  limite?: number
  pagina?: number
}

// ===================================================
// 📝 REGISTRO DE ACCIONES
// ===================================================

/**
 * Registra una nueva acción en el log de auditoría
 */
export async function registrarAccion(
  entidadTipo: AuditLogEntry['entidadTipo'],
  entidadId: string,
  accion: string,
  usuarioId: string,
  descripcion: string,
  cambios?: Record<string, { anterior: any; nuevo: any }>,
  metadata?: Record<string, any>
): Promise<AuditLogEntry> {
  try {
    const auditLog = await (prisma as any).auditLog.create({
      data: {
        entidadTipo,
        entidadId,
        accion,
        usuarioId,
        descripcion,
        cambios: cambios ? JSON.stringify(cambios) : null,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
      include: {
        usuario: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    return {
      ...auditLog,
      cambios: cambios || undefined,
      metadata: metadata || undefined,
    }
  } catch (error) {
    console.error('Error al registrar acción en auditoría:', error)
    throw new Error('Error al registrar la acción en el historial')
  }
}

// ===================================================
// 🔍 CONSULTAS DE HISTORIAL
// ===================================================

/**
 * Obtiene el historial de una entidad específica
 */
export async function obtenerHistorialEntidad(
  entidadTipo: string,
  entidadId: string,
  filtros: Omit<AuditFilters, 'entidadTipo' | 'entidadId'> = {}
): Promise<{ data: AuditLogEntry[]; total: number; pagina: number; totalPaginas: number }> {
  try {
    const { limite = 50, pagina = 1, usuarioId, accion, fechaDesde, fechaHasta } = filtros

    const where: any = {
      entidadTipo,
      entidadId,
    }

    if (usuarioId) where.usuarioId = usuarioId
    if (accion) where.accion = accion
    if (fechaDesde || fechaHasta) {
      where.createdAt = {}
      if (fechaDesde) where.createdAt.gte = fechaDesde
      if (fechaHasta) where.createdAt.lte = fechaHasta
    }

    const [auditLogs, total] = await Promise.all([
      (prisma as any).auditLog.findMany({
        where,
        include: {
          usuario: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: limite,
        skip: (pagina - 1) * limite,
      }),
      (prisma as any).auditLog.count({ where }),
    ])

    const totalPaginas = Math.ceil(total / limite)

    const data = auditLogs.map((log: any) => ({
      ...log,
      cambios: log.cambios ? JSON.parse(log.cambios) : undefined,
      metadata: log.metadata ? JSON.parse(log.metadata) : undefined,
    }))

    return {
      data,
      total,
      pagina,
      totalPaginas,
    }
  } catch (error) {
    console.error('Error al obtener historial de entidad:', error)
    throw new Error('Error al obtener el historial')
  }
}

/**
 * Obtiene actividad reciente del sistema
 */
export async function obtenerActividadReciente(
  limite: number = 20,
  usuarioId?: string
): Promise<AuditLogEntry[]> {
  try {
    console.log('🔍 Ejecutando obtenerActividadReciente con límite:', limite, 'usuario:', usuarioId)

    const where: any = {}
    if (usuarioId) where.usuarioId = usuarioId

    console.log('📋 Where clause:', where)

    const auditLogs = await (prisma as any).auditLog.findMany({
      where,
      include: {
        usuario: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limite,
    })

    console.log('📊 Registros encontrados:', auditLogs.length)

    const result = auditLogs.map((log: any) => ({
      ...log,
      cambios: log.cambios ? JSON.parse(log.cambios) : undefined,
      metadata: log.metadata ? JSON.parse(log.metadata) : undefined,
    }))

    console.log('✅ Resultado procesado:', result.length, 'registros')
    return result
  } catch (error: any) {
    console.error('❌ Error al obtener actividad reciente:', error)
    throw new Error(`Error al obtener la actividad reciente: ${error?.message || 'Error desconocido'}`)
  }
}

// ===================================================
// 🎯 FUNCIONES DE CONVENIENCIA
// ===================================================

/**
 * Registra creación de entidad
 */
export async function registrarCreacion(
  entidadTipo: AuditLogEntry['entidadTipo'],
  entidadId: string,
  usuarioId: string,
  nombreEntidad: string,
  metadata?: Record<string, any>
): Promise<AuditLogEntry> {
  return registrarAccion(
    entidadTipo,
    entidadId,
    'CREAR',
    usuarioId,
    `Se creó ${entidadTipo.toLowerCase()}: ${nombreEntidad}`,
    undefined,
    metadata
  )
}

/**
 * Registra actualización de entidad
 */
export async function registrarActualizacion(
  entidadTipo: AuditLogEntry['entidadTipo'],
  entidadId: string,
  usuarioId: string,
  nombreEntidad: string,
  cambios: Record<string, { anterior: any; nuevo: any }>,
  metadata?: Record<string, any>
): Promise<AuditLogEntry> {
  const descripcionCambios = Object.keys(cambios)
    .map(campo => `${campo}: ${cambios[campo].anterior || 'vacío'} → ${cambios[campo].nuevo || 'vacío'}`)
    .join(', ')

  return registrarAccion(
    entidadTipo,
    entidadId,
    'ACTUALIZAR',
    usuarioId,
    `Se actualizó ${entidadTipo.toLowerCase()}: ${descripcionCambios}`,
    cambios,
    metadata
  )
}

/**
 * Registra cambio de estado
 */
export async function registrarCambioEstado(
  entidadTipo: AuditLogEntry['entidadTipo'],
  entidadId: string,
  usuarioId: string,
  nombreEntidad: string,
  estadoAnterior: string,
  estadoNuevo: string,
  metadata?: Record<string, any>
): Promise<AuditLogEntry> {
  return registrarAccion(
    entidadTipo,
    entidadId,
    'CAMBIAR_ESTADO',
    usuarioId,
    `Estado cambiado: ${estadoAnterior} → ${estadoNuevo}`,
    { estado: { anterior: estadoAnterior, nuevo: estadoNuevo } },
    metadata
  )
}

/**
 * Registra eliminación de entidad
 */
export async function registrarEliminacion(
  entidadTipo: AuditLogEntry['entidadTipo'],
  entidadId: string,
  usuarioId: string,
  nombreEntidad: string,
  metadata?: Record<string, any>
): Promise<AuditLogEntry> {
  return registrarAccion(
    entidadTipo,
    entidadId,
    'ELIMINAR',
    usuarioId,
    `Se eliminó ${entidadTipo.toLowerCase()}: ${nombreEntidad}`,
    undefined,
    metadata
  )
}