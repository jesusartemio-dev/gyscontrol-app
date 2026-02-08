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

    const existe = await prisma.listaEquipo.findUnique({ where: { id } })
    if (!existe) {
      return NextResponse.json(
        { error: 'Lista no encontrada con el ID proporcionado' },
        { status: 404 }
      )
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
    const { motivoRechazo, ...restBody } = body as any
    const updateData: any = { ...restBody }

    // 🔄 Si hay cambio de estado, actualizar fechas automáticamente
    if (body.estado && body.estado !== existe.estado) {
      const fechas = getFechasPorTransicion(body.estado as EstadoListaEquipo)
      Object.assign(updateData, fechas)
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
        const description = motivoRechazo
          ? `Lista ${data.nombre || data.codigo || 'sin nombre'} - Motivo: ${motivoRechazo}`
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

      // 3. Eliminar la lista (esto eliminará los items por cascade)
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
