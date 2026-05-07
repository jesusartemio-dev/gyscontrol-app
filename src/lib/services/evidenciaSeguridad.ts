import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'

export const EVIDENCIA_INCLUDE = {
  jornada: {
    select: {
      id: true,
      fechaTrabajo: true,
      estado: true,
      ubicacion: true,
      proyecto: { select: { id: true, codigo: true, nombre: true } },
      supervisor: { select: { id: true, name: true } },
      tareas: {
        select: {
          id: true,
          nombreTareaExtra: true,
          proyectoTarea: { select: { id: true, nombre: true } },
          miembros: {
            select: {
              usuarioId: true,
              horas: true,
              usuario: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
  },
  creadoPor: { select: { id: true, name: true, email: true } },
  registros: {
    orderBy: { createdAt: 'asc' },
    include: {
      ingeniero: { select: { id: true, name: true } },
      fotos: { orderBy: { orden: 'asc' } },
    },
  },
} as const satisfies Prisma.EvidenciaSeguridadInclude

export type EvidenciaSeguridadDetalle = Prisma.EvidenciaSeguridadGetPayload<{
  include: typeof EVIDENCIA_INCLUDE
}>

const ESTADOS_JORNADA_ACTIVOS = ['iniciado', 'pendiente'] as const
type EstadoJornadaPermitido = (typeof ESTADOS_JORNADA_ACTIVOS)[number]

function esJornadaActiva(estado: string): estado is EstadoJornadaPermitido {
  return (ESTADOS_JORNADA_ACTIVOS as readonly string[]).includes(estado)
}

/**
 * Find or create idempotently. Si la evidencia ya existe para la jornada, la retorna.
 * Si no, la crea con el usuario indicado como creadoPor.
 * Lanza error si la jornada no existe o no está en estado iniciado/pendiente.
 */
export async function obtenerOCrearEvidencia(
  jornadaId: string,
  userId: string,
  observaciones?: string | null,
): Promise<EvidenciaSeguridadDetalle> {
  const existente = await prisma.evidenciaSeguridad.findUnique({
    where: { registroHorasCampoId: jornadaId },
    include: EVIDENCIA_INCLUDE,
  })
  if (existente) return existente

  const jornada = await prisma.registroHorasCampo.findUnique({
    where: { id: jornadaId },
    select: { id: true, estado: true },
  })
  if (!jornada) throw new Error('Jornada no encontrada')
  if (!esJornadaActiva(jornada.estado)) {
    throw new Error('Solo se puede abrir evidencias para jornadas iniciadas o pendientes')
  }

  return prisma.evidenciaSeguridad.create({
    data: {
      registroHorasCampoId: jornadaId,
      creadoPorId: userId,
      observaciones: observaciones ?? null,
    },
    include: EVIDENCIA_INCLUDE,
  })
}

export async function obtenerEvidenciaPorId(id: string) {
  return prisma.evidenciaSeguridad.findUnique({
    where: { id },
    include: EVIDENCIA_INCLUDE,
  })
}

export async function obtenerEvidenciaPorJornada(jornadaId: string) {
  return prisma.evidenciaSeguridad.findUnique({
    where: { registroHorasCampoId: jornadaId },
    include: EVIDENCIA_INCLUDE,
  })
}

export async function cerrarEvidencia(id: string, observaciones?: string | null) {
  return prisma.evidenciaSeguridad.update({
    where: { id },
    data: {
      estado: 'cerrada',
      fechaCierre: new Date(),
      ...(observaciones !== undefined ? { observaciones } : {}),
    },
    include: EVIDENCIA_INCLUDE,
  })
}

export async function reabrirEvidencia(id: string) {
  return prisma.evidenciaSeguridad.update({
    where: { id },
    data: { estado: 'abierta', fechaCierre: null },
    include: EVIDENCIA_INCLUDE,
  })
}

const ROLES_EDICION_TOTAL = ['admin', 'gerente', 'gestor'] as const
const ROLES_PERMITIDOS = ['admin', 'gerente', 'gestor', 'seguridad'] as const

/**
 * Determina si un usuario puede agregar/editar registros dentro de una evidencia.
 * Modelo colaborativo: cualquier rol seguridad/admin/gerente con jornada activa y evidencia abierta.
 * admin/gerente bypassan los locks (jornada cerrada, evidencia cerrada).
 */
export function puedeEscribirEvidencia(
  role: string | undefined,
  jornadaEstado: string,
  evidenciaEstado: string,
): boolean {
  if (!role) return false
  if (!(ROLES_PERMITIDOS as readonly string[]).includes(role)) return false
  if ((ROLES_EDICION_TOTAL as readonly string[]).includes(role)) return true
  // seguridad: requiere ambos estados activos
  return esJornadaActiva(jornadaEstado) && evidenciaEstado === 'abierta'
}

export function puedeLeerEvidencia(role: string | undefined): boolean {
  if (!role) return false
  return (ROLES_PERMITIDOS as readonly string[]).includes(role)
}
