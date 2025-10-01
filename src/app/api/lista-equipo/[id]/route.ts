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
import type { EstadoListaEquipo } from '@prisma/client'
import { logStatusChange } from '@/lib/services/auditLogger'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// ✅ Obtener ListaEquipo por ID (GET)
export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params

    const data = await prisma.listaEquipo.findUnique({
      where: { id },
      include: {
        proyecto: true,
        responsable: true,
        items: {
          include: {
            proveedor: true,
            cotizaciones: true,
            pedidos: {
              include: {
                pedido: true
              }
            },
            proyectoEquipoItem: {
              include: {
                proyectoEquipo: true,
              },
            },
          },
        },
      },
    })

    // 🔄 Calculate cantidadPedida for each item
    if (data?.items) {
      data.items = data.items.map(item => {
        const cantidadPedida = item.pedidos.reduce((total, pedidoItem) => {
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

    // ✅ Preparar datos de actualización con fechas automáticas según cambio de estado
    const updateData: any = { ...body }
    const now = new Date()

    // 🔄 Si hay cambio de estado, actualizar fechas automáticamente
    if (body.estado && body.estado !== existe.estado) {
      switch (body.estado) {
        case 'por_revisar':
          updateData.fechaEnvioRevision = now
          break
        case 'por_validar':
          updateData.fechaValidacion = now
          break
        case 'por_aprobar':
          updateData.fechaValidacion = now
          break
        case 'aprobado':
          updateData.fechaAprobacionRevision = now
          break
        case 'por_cotizar':
          updateData.fechaEnvioLogistica = now
          break
        case 'rechazado':
          // No se actualiza ninguna fecha específica para rechazado
          break
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
        await logStatusChange({
          userId: session.user.id,
          entityType: 'LISTA_EQUIPO',
          entityId: id,
          oldStatus: existe.estado,
          newStatus: body.estado,
          description: `Lista ${data.nombre || data.codigo || 'sin nombre'}`
        })
      } catch (auditError) {
        console.error('Error logging status change:', auditError)
        // No fallar la operación principal por error de auditoría
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
