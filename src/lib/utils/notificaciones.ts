import { randomUUID } from 'crypto'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PrismaLike = any

interface NotificacionData {
  usuarioId: string
  titulo: string
  mensaje: string
  tipo?: 'info' | 'warning' | 'success' | 'error'
  prioridad?: 'baja' | 'media' | 'alta' | 'critica'
  entidadTipo?: string
  entidadId?: string
  accionUrl?: string
  accionTexto?: string
}

/**
 * Crea una notificación para un usuario específico.
 * Fire-and-forget con try/catch silencioso — nunca rompe el flujo principal.
 */
export async function crearNotificacion(
  prisma: PrismaLike,
  data: NotificacionData
): Promise<void> {
  try {
    await (prisma as any).notificacion.create({
      data: {
        id: randomUUID(),
        usuarioId: data.usuarioId,
        titulo: data.titulo,
        mensaje: data.mensaje,
        tipo: data.tipo || 'info',
        prioridad: data.prioridad || 'media',
        entidadTipo: data.entidadTipo || null,
        entidadId: data.entidadId || null,
        accionUrl: data.accionUrl || null,
        accionTexto: data.accionTexto || null,
        updatedAt: new Date(),
      },
    })
  } catch (e) {
    console.error('[notificaciones] Error creando notificación:', e)
  }
}

/**
 * Crea múltiples notificaciones (una por cada usuario destino).
 * Fire-and-forget — errores individuales no afectan las demás.
 */
export async function crearNotificaciones(
  prisma: PrismaLike,
  notifs: NotificacionData[]
): Promise<void> {
  try {
    if (notifs.length === 0) return

    await (prisma as any).notificacion.createMany({
      data: notifs.map((n) => ({
        id: randomUUID(),
        usuarioId: n.usuarioId,
        titulo: n.titulo,
        mensaje: n.mensaje,
        tipo: n.tipo || 'info',
        prioridad: n.prioridad || 'media',
        entidadTipo: n.entidadTipo || null,
        entidadId: n.entidadId || null,
        accionUrl: n.accionUrl || null,
        accionTexto: n.accionTexto || null,
        updatedAt: new Date(),
      })),
    })
  } catch (e) {
    console.error('[notificaciones] Error creando notificaciones:', e)
  }
}

/**
 * Busca usuarios por rol(es) y retorna sus IDs.
 * Útil para enviar notificaciones a todos los logísticos, gestores, etc.
 */
export async function obtenerUsuariosPorRol(
  prisma: PrismaLike,
  roles: string | string[]
): Promise<string[]> {
  try {
    const rolesArray = Array.isArray(roles) ? roles : [roles]
    const usuarios = await (prisma as any).user.findMany({
      where: { role: { in: rolesArray } },
      select: { id: true },
    })
    return usuarios.map((u: { id: string }) => u.id)
  } catch (e) {
    console.error('[notificaciones] Error obteniendo usuarios por rol:', e)
    return []
  }
}

/**
 * Notifica a todos los usuarios de un rol específico.
 * Combina obtenerUsuariosPorRol + crearNotificaciones.
 */
export async function notificarPorRol(
  prisma: PrismaLike,
  roles: string | string[],
  data: Omit<NotificacionData, 'usuarioId'>,
  excluirUsuarioId?: string
): Promise<void> {
  try {
    const userIds = await obtenerUsuariosPorRol(prisma, roles)
    const filtrados = excluirUsuarioId
      ? userIds.filter((id) => id !== excluirUsuarioId)
      : userIds

    if (filtrados.length === 0) return

    await crearNotificaciones(
      prisma,
      filtrados.map((usuarioId) => ({ ...data, usuarioId }))
    )
  } catch (e) {
    console.error('[notificaciones] Error notificando por rol:', e)
  }
}
