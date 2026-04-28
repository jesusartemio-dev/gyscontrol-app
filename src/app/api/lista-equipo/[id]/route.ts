// ===================================================
// 📁 Archivo: [id]/route.ts
// 📌 Ubicación: src/app/api/lista-equipo/[id]/route.ts
// 🔧 Descripción: API para obtener, actualizar y eliminar una ListaEquipo por ID
//
// 🧠 Uso: Usado por la vista de detalle de lista de equipos
// ✍️ Autor: Jesús Artemio (Master Experto 🧙‍♂️)
// 📅 Última actualización: 2025-05-18
// ===================================================

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import type { ListaEquipoUpdatePayload } from '@/types/payloads'
import { logStatusChange } from '@/lib/services/auditLogger'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { validarTransicion, getFechasPorTransicion, type EstadoListaEquipo } from '@/lib/utils/flujoListaEquipo'
import { sincronizarRealesProyecto } from '@/lib/utils/syncReales'
import { registrarActualizacion } from '@/lib/services/audit'
import { canDelete } from '@/lib/utils/deleteValidation'
import { crearEvento } from '@/lib/utils/trazabilidad'

// ✅ Obtener ListaEquipo por ID (GET)
export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params

    const data = await prisma.listaEquipo.findUnique({
      where: { id },
      include: {
        proyecto: true,
        user: true,
        listaEquipoItem: {
          orderBy: { orden: 'asc' as const },
          include: {
            proveedor: true,
            cotizacionProveedorItems: true,
            pedidoEquipoItem: {
              include: {
                pedidoEquipo: true
              }
            },
            proyectoEquipoItem: {
              include: {
                proyectoEquipoCotizado: true,
              },
            },
          },
        },
      },
    })

    // 🔄 Calculate cantidadPedida for each item
    if (data?.listaEquipoItem) {
      data.listaEquipoItem = data.listaEquipoItem.map(item => {
        const cantidadPedida = item.pedidoEquipoItem.reduce((total, pedidoItem) => {
          return total + (pedidoItem.cantidadPedida || 0)
        }, 0)
        
        return {
          ...item,
          cantidadPedida
        }
      })
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al obtener la lista de equipos: ' + String(error) },
      { status: 500 }
    )
  }
}

export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const body: ListaEquipoUpdatePayload = await req.json()

    // ✅ Verificar autenticación
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { error: 'ID inválido o no proporcionado' },
        { status: 400 }
      )
    }

    const existe = await prisma.listaEquipo.findUnique({
      where: { id },
      select: { id: true, estado: true, fechaNecesaria: true, nombre: true, codigo: true, proyectoId: true }
    })
    if (!existe) {
      return NextResponse.json(
        { error: 'Lista no encontrada con el ID proporcionado' },
        { status: 404 }
      )
    }

    // Audit fechaNecesaria changes
    if (body.fechaNecesaria && body.fechaNecesaria !== existe.fechaNecesaria?.toISOString().split('T')[0]) {
      try {
        await registrarActualizacion(
          'LISTA_EQUIPO',
          id,
          session.user.id,
          `Fecha necesaria actualizada en lista ${existe.nombre || existe.codigo}`,
          {
            fechaNecesariaAnterior: existe.fechaNecesaria?.toISOString().split('T')[0] || null,
            fechaNecesariaNueva: body.fechaNecesaria
          }
        )
      } catch (auditError) {
        console.error('Error al registrar cambio de fechaNecesaria:', auditError)
      }
    }

    // ✅ Validar transición de estado + rol si hay cambio de estado
    if (body.estado && body.estado !== existe.estado) {
      const userRole = session.user.role || ''
      const resultado = validarTransicion(existe.estado, body.estado, userRole)
      if (!resultado.valido) {
        return NextResponse.json(
          { error: resultado.error },
          { status: 403 }
        )
      }
    }

    // ✅ Preparar datos de actualización
    const { motivoRechazo, motivoAnulacion, ...restBody } = body as any
    const updateData: any = { ...restBody }

    // 🔄 Si hay cambio de estado, actualizar fechas automáticamente
    if (body.estado && body.estado !== existe.estado) {
      const fechas = getFechasPorTransicion(body.estado as EstadoListaEquipo)
      Object.assign(updateData, fechas)

      // 🔄 Si se anula, guardar motivo de anulación
      if (body.estado === 'anulada' && motivoAnulacion) {
        updateData.motivoAnulacion = motivoAnulacion
      }
    }

    // 🔄 Convertir fechaNecesaria a Date si viene como string
    if (updateData.fechaNecesaria && typeof updateData.fechaNecesaria === 'string') {
      updateData.fechaNecesaria = new Date(updateData.fechaNecesaria)
    }

    const data = await prisma.listaEquipo.update({
      where: { id },
      data: updateData,
    })

    // ✅ Registrar el cambio de estado en auditoría si hubo cambio de estado
    if (body.estado && body.estado !== existe.estado) {
      try {
        const motivo = motivoAnulacion || motivoRechazo
        const description = motivo
          ? `Lista ${data.nombre || data.codigo || 'sin nombre'} - Motivo: ${motivo}`
          : `Lista ${data.nombre || data.codigo || 'sin nombre'}`
        await logStatusChange({
          userId: session.user.id,
          entityType: 'LISTA_EQUIPO',
          entityId: id,
          oldStatus: existe.estado,
          newStatus: body.estado,
          description
        })
      } catch (auditError) {
        console.error('Error logging status change:', auditError)
      }

      // 🕑 Evento de trazabilidad para transiciones clave
      const motivo = motivoAnulacion || motivoRechazo
      const tipoEvento =
        body.estado === 'aprobada' ? 'lista_aprobada' :
        body.estado === 'anulada' ? 'lista_anulada' :
        body.estado === 'por_aprobar' ? 'lista_cotizada' :
        null

      if (tipoEvento) {
        const labels: Record<string, string> = {
          lista_aprobada: 'aprobada',
          lista_anulada: 'anulada',
          lista_cotizada: 'cotizada (lista para aprobar)',
        }
        crearEvento(prisma, {
          listaEquipoId: id,
          proyectoId: existe.proyectoId,
          tipo: tipoEvento,
          descripcion: `Lista ${data.codigo || id} ${labels[tipoEvento]}${motivo ? `: ${motivo}` : ''}`,
          usuarioId: session.user.id,
          metadata: {
            codigo: data.codigo,
            estadoAnterior: existe.estado,
            estadoNuevo: body.estado,
            ...(motivo ? { motivo } : {}),
          },
        }).catch(() => {})
      }
    }

    // Auto-sync reales to ProyectoEquipoCotizadoItem when lista is approved
    if (body.estado === 'aprobada' && existe.estado !== 'aprobada') {
      try {
        const syncCount = await sincronizarRealesProyecto(existe.proyectoId)
        console.log(`✅ Auto-sync: ${syncCount} items sincronizados al aprobar lista ${id}`)
      } catch (syncError) {
        console.error('⚠️ Error al auto-sincronizar reales:', syncError)
      }
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('⛔ Error al actualizar lista:', error)

    return NextResponse.json(
      { error: 'Error al actualizar lista: ' + (error instanceof Error ? error.message : JSON.stringify(error)) },
      { status: 500 }
    )
  }
}



// ✅ Eliminar ListaEquipo (DELETE)
export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  try {
    // 🔐 Verificar sesión
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // 🛡️ Validar dependientes antes de eliminar
    const deleteCheck = await canDelete('listaEquipo', id)
    if (!deleteCheck.allowed) {
      return NextResponse.json(
        { error: deleteCheck.message, blockers: deleteCheck.blockers },
        { status: 409 }
      )
    }

    // 📌 Obtener IDs de los lista items ANTES de borrar para detectar cotizados
    // que apunten a ellos vía listaEquipoSeleccionadoId aunque su listaId esté NULL
    // (caso de items creados antes del fix donde listaId no se sincronizaba).
    const listaItemsDeLista = await prisma.listaEquipoItem.findMany({
      where: { listaId: id },
      select: { id: true },
    })
    const listaItemIds = listaItemsDeLista.map(li => li.id)

    await prisma.$transaction([
      // 0. Desmarcar todas las cotizaciones seleccionadas relacionadas
      prisma.cotizacionProveedorItem.updateMany({
        where: {
          listaEquipoItem: {
            listaId: id,
          },
          esSeleccionada: true,
        },
        data: {
          esSeleccionada: false,
        },
      }),

      // 1. Setear a null los campos relacionados con listaId
      prisma.cotizacionProveedorItem.updateMany({
        where: { listaId: id },
        data: { listaId: null },
      }),
      prisma.pedidoEquipoItem.updateMany({
        where: { listaId: id },
        data: { listaId: null },
      }),

      // 2. Buscar todos los items de la lista
      prisma.cotizacionProveedorItem.updateMany({
        where: {
          listaEquipoItem: {
            listaId: id,
          },
        },
        data: {
          listaEquipoItemId: null,
        },
      }),
      prisma.pedidoEquipoItem.updateMany({
        where: {
          listaEquipoItem: {
            listaId: id,
          },
        },
        data: {
          listaEquipoItemId: null,
        },
      }),

      // 3. Resetear estado de items cotizados vinculados a esta lista
      // Captura tanto los que tienen listaId apuntando aquí como los que solo
      // tienen listaEquipoSeleccionadoId apuntando a un item de esta lista
      // (con listaId=NULL — pre-fix dejó esos casos).
      prisma.proyectoEquipoCotizadoItem.updateMany({
        where: {
          estado: { in: ['en_lista', 'reemplazado'] },
          OR: [
            { listaId: id },
            ...(listaItemIds.length > 0 ? [{ listaEquipoSeleccionadoId: { in: listaItemIds } }] : []),
          ],
        },
        data: {
          estado: 'pendiente',
          listaId: null,
          listaEquipoSeleccionadoId: null,
        },
      }),

      // 4. Eliminar la lista (esto eliminará los items por cascade)
      prisma.listaEquipo.delete({
        where: { id },
      }),
    ]);

    return NextResponse.json({ message: "Lista eliminada correctamente" });
  } catch (error) {
    console.error("[LISTA_EQUIPO_DELETE]", error);
    return new NextResponse("Error al eliminar Lista de Equipo", { status: 500 });
  }
}
