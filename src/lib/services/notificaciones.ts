// ===================================================
// 📁 Sistema de Notificaciones Automáticas
// 📌 Descripción: Servicio para gestionar notificaciones del workflow de proyectos
// ✍️ Autor: Sistema de IA
// 📅 Actualizado: 2025-01-27
// ===================================================

import { prisma } from '@/lib/prisma'

export interface NotificacionData {
  titulo: string
  mensaje: string
  tipo: 'info' | 'warning' | 'success' | 'error'
  prioridad: 'baja' | 'media' | 'alta' | 'critica'
  usuarioId: string
  entidadTipo?: string
  entidadId?: string
  accionUrl?: string
  accionTexto?: string
}

// ✅ Crear notificación
export async function crearNotificacion(data: NotificacionData) {
  try {
    const notificacion = await prisma.notificacion.create({
      data: {
        id: crypto.randomUUID(),
        titulo: data.titulo,
        mensaje: data.mensaje,
        tipo: data.tipo,
        prioridad: data.prioridad,
        usuarioId: data.usuarioId,
        entidadTipo: data.entidadTipo,
        entidadId: data.entidadId,
        accionUrl: data.accionUrl,
        accionTexto: data.accionTexto,
        updatedAt: new Date()
      }
    })
    return notificacion
  } catch (error) {
    console.error('Error creando notificación:', error)
    throw error
  }
}

// ✅ Obtener notificaciones de un usuario
export async function obtenerNotificacionesUsuario(usuarioId: string, limite: number = 50) {
  try {
    const notificaciones = await prisma.notificacion.findMany({
      where: { usuarioId },
      orderBy: { createdAt: 'desc' },
      take: limite
    })
    return notificaciones
  } catch (error) {
    console.error('Error obteniendo notificaciones:', error)
    throw error
  }
}

// ✅ Marcar notificación como leída
export async function marcarNotificacionLeida(id: string) {
  try {
    const notificacion = await prisma.notificacion.update({
      where: { id },
      data: {
        leida: true,
        fechaLectura: new Date()
      }
    })
    return notificacion
  } catch (error) {
    console.error('Error marcando notificación como leída:', error)
    throw error
  }
}

// ✅ Obtener notificaciones no leídas
export async function obtenerNotificacionesNoLeidas(usuarioId: string) {
  try {
    const count = await prisma.notificacion.count({
      where: {
        usuarioId,
        leida: false
      }
    })
    return count
  } catch (error) {
    console.error('Error obteniendo notificaciones no leídas:', error)
    throw error
  }
}

// ===================================================
// 🔔 TRIGGERS AUTOMÁTICOS PARA WORKFLOW
// ===================================================

// ✅ Trigger: Proyecto creado
export async function triggerProyectoCreado(proyectoId: string) {
  try {
    const proyecto = await prisma.proyecto.findUnique({
      where: { id: proyectoId },
      include: { gestor: true, comercial: true }
    })

    if (!proyecto) return

    // Notificar al gestor del proyecto
    if (proyecto.gestorId) {
      await crearNotificacion({
        titulo: 'Nuevo proyecto asignado',
        mensaje: `Se te ha asignado el proyecto "${proyecto.nombre}" (${proyecto.codigo})`,
        tipo: 'info',
        prioridad: 'media',
        usuarioId: proyecto.gestorId,
        entidadTipo: 'proyecto',
        entidadId: proyectoId,
        accionUrl: `/proyectos/${proyectoId}`,
        accionTexto: 'Ver Proyecto'
      })
    }

    // Notificar al comercial
    if (proyecto.comercialId) {
      await crearNotificacion({
        titulo: 'Proyecto creado desde tu cotización',
        mensaje: `El proyecto "${proyecto.nombre}" ha sido creado desde tu cotización`,
        tipo: 'success',
        prioridad: 'baja',
        usuarioId: proyecto.comercialId,
        entidadTipo: 'proyecto',
        entidadId: proyectoId,
        accionUrl: `/proyectos/${proyectoId}`,
        accionTexto: 'Ver Proyecto'
      })
    }

  } catch (error) {
    console.error('Error en trigger proyecto creado:', error)
  }
}

// ✅ Trigger: Lista aprobada
export async function triggerListaAprobada(proyectoId: string, listaId: string) {
  try {
    const proyecto = await prisma.proyecto.findUnique({
      where: { id: proyectoId },
      include: { gestor: true }
    })

    if (!proyecto || !proyecto.gestorId) return

    // Verificar si todas las listas están aprobadas
    const listasPendientes = await prisma.listaEquipo.count({
      where: {
        proyectoId,
        estado: { not: 'aprobada' }
      }
    })

    if (listasPendientes === 0) {
      // Todas las listas aprobadas - actualizar estado del proyecto
      await prisma.proyecto.update({
        where: { id: proyectoId },
        data: { estado: 'listas_aprobadas' }
      })

      // Notificar que puede crear pedidos
      await crearNotificacion({
        titulo: 'Listas aprobadas - Crear pedidos',
        mensaje: `Todas las listas del proyecto "${proyecto.nombre}" han sido aprobadas. Puedes crear pedidos parciales.`,
        tipo: 'success',
        prioridad: 'alta',
        usuarioId: proyecto.gestorId,
        entidadTipo: 'proyecto',
        entidadId: proyectoId,
        accionUrl: `/proyectos/${proyectoId}/pedidos`,
        accionTexto: 'Crear Pedidos'
      })
    }

  } catch (error) {
    console.error('Error en trigger lista aprobada:', error)
  }
}

// ✅ Trigger: Pedido creado
export async function triggerPedidoCreado(proyectoId: string, pedidoId: string) {
  try {
    const proyecto = await prisma.proyecto.findUnique({
      where: { id: proyectoId },
      include: { gestor: true }
    })

    if (!proyecto || !proyecto.gestorId) return

    // Actualizar estado del proyecto si es el primer pedido
    const pedidosCount = await prisma.pedidoEquipo.count({
      where: { proyectoId }
    })

    if (pedidosCount === 1) {
      await prisma.proyecto.update({
        where: { id: proyectoId },
        data: { estado: 'pedidos_creados' }
      })
    }

    // Notificar creación de pedido
    await crearNotificacion({
      titulo: 'Pedido creado exitosamente',
      mensaje: `Se ha creado un nuevo pedido para el proyecto "${proyecto.nombre}"`,
      tipo: 'success',
      prioridad: 'media',
      usuarioId: proyecto.gestorId,
      entidadTipo: 'pedido',
      entidadId: pedidoId,
      accionUrl: `/proyectos/${proyectoId}/pedidos`,
      accionTexto: 'Ver Pedidos'
    })

  } catch (error) {
    console.error('Error en trigger pedido creado:', error)
  }
}

// ✅ Trigger: Proyecto completado
export async function triggerProyectoCompletado(proyectoId: string) {
  try {
    const proyecto = await prisma.proyecto.findUnique({
      where: { id: proyectoId },
      include: { gestor: true, comercial: true }
    })

    if (!proyecto) return

    // Notificar al gestor
    if (proyecto.gestorId) {
      await crearNotificacion({
        titulo: 'Proyecto completado',
        mensaje: `El proyecto "${proyecto.nombre}" ha sido marcado como completado`,
        tipo: 'success',
        prioridad: 'media',
        usuarioId: proyecto.gestorId,
        entidadTipo: 'proyecto',
        entidadId: proyectoId,
        accionUrl: `/proyectos/${proyectoId}`,
        accionTexto: 'Ver Proyecto'
      })
    }

    // Notificar al comercial
    if (proyecto.comercialId) {
      await crearNotificacion({
        titulo: 'Proyecto completado exitosamente',
        mensaje: `El proyecto "${proyecto.nombre}" ha sido completado exitosamente`,
        tipo: 'success',
        prioridad: 'baja',
        usuarioId: proyecto.comercialId,
        entidadTipo: 'proyecto',
        entidadId: proyectoId,
        accionUrl: `/proyectos/${proyectoId}`,
        accionTexto: 'Ver Proyecto'
      })
    }

  } catch (error) {
    console.error('Error en trigger proyecto completado:', error)
  }
}

// ✅ Trigger: Recordatorio semanal para proyectos sin actividad
export async function triggerRecordatorioSemanal() {
  try {
    const hace7Dias = new Date()
    hace7Dias.setDate(hace7Dias.getDate() - 7)

    // Encontrar proyectos sin actividad reciente
    const proyectosSinActividad = await prisma.proyecto.findMany({
      where: {
        estado: { in: ['en_ejecucion', 'pedidos_creados'] },
        updatedAt: { lt: hace7Dias }
      },
      include: { gestor: true }
    })

    for (const proyecto of proyectosSinActividad) {
      if (proyecto.gestorId) {
        await crearNotificacion({
          titulo: 'Proyecto sin actividad reciente',
          mensaje: `El proyecto "${proyecto.nombre}" no ha tenido actividad en los últimos 7 días`,
          tipo: 'warning',
          prioridad: 'media',
          usuarioId: proyecto.gestorId,
          entidadTipo: 'proyecto',
          entidadId: proyecto.id,
          accionUrl: `/proyectos/${proyecto.id}`,
          accionTexto: 'Ver Proyecto'
        })
      }
    }

  } catch (error) {
    console.error('Error en trigger recordatorio semanal:', error)
  }
}
