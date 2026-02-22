// ===================================================
// Archivo: [id]/seleccionar-cotizacion/route.ts
// Descripción: Selecciona una cotización ganadora para un ítem (ListaEquipoItem)
// Efecto: Marca una cotización como seleccionada, desmarca las otras, y actualiza datos clave del ítem
// Valida si hay OCs vinculadas antes de permitir el cambio
// ===================================================

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { propagarPrecioLogisticaCatalogo } from '@/lib/services/catalogoPrecioSync'
import { checkOCVinculada, clasificarOC, actualizarOCBorrador } from '@/lib/utils/ocValidation'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { cotizacionProveedorItemId } = await req.json()
    const session = await getServerSession(authOptions)
    const userId = (session?.user as any)?.id as string | undefined

    // Paso 0: Verificar OCs vinculadas ANTES de hacer cualquier cambio
    const pedidoItemsVinculados = await prisma.pedidoEquipoItem.findMany({
      where: { listaEquipoItemId: id },
      select: { id: true }
    })
    const pedidoItemIds = pedidoItemsVinculados.map(p => p.id)

    const ocVinculada = await checkOCVinculada(id, pedidoItemIds)
    const clasificacion = clasificarOC(ocVinculada)

    // CASO bloqueada: no permitir el cambio
    if (clasificacion === 'bloqueada') {
      return NextResponse.json(
        { error: `No se puede cambiar la cotización. La OC ${ocVinculada!.ocNumero} está en estado "${ocVinculada!.ocEstado}". Anula o cancela la OC primero.` },
        { status: 409 }
      )
    }

    // Variable para acumular warning de OC en borrador
    let warningOC: string | null = null

    // Paso 1: desmarcar todas las cotizaciones previas del ítem
    await prisma.cotizacionProveedorItem.updateMany({
      where: { listaEquipoItemId: id },
      data: { esSeleccionada: false },
    })

    // Verificar si es una deselección (cotizacionProveedorItemId es null)
    if (cotizacionProveedorItemId === null) {
      // Paso 2: actualizar el ListaEquipoItem limpiando la selección
      const updatedItem = await prisma.listaEquipoItem.update({
        where: { id },
        data: {
          cotizacionSeleccionadaId: null,
          precioElegido: null,
          costoElegido: 0,
          tiempoEntrega: null,
          tiempoEntregaDias: null,
          proveedorId: null,
        },
      })

      // Paso 3: limpiar precios en pedidos existentes
      const pedidosAfectados = await prisma.pedidoEquipoItem.findMany({
        where: { listaEquipoItemId: id },
        include: {
          pedidoEquipo: {
            select: { id: true, codigo: true, proyecto: { select: { nombre: true } } }
          }
        }
      })

      const pedidosActualizados = []
      for (const pedidoItem of pedidosAfectados) {
        await prisma.pedidoEquipoItem.update({
          where: { id: pedidoItem.id },
          data: {
            precioUnitario: 0,
            costoTotal: 0,
            tiempoEntrega: null,
            tiempoEntregaDias: null,
            proveedorId: null,
          },
        })

        pedidosActualizados.push({
          pedidoId: pedidoItem.pedidoEquipo.id,
          pedidoCodigo: pedidoItem.pedidoEquipo.codigo,
          proyectoNombre: pedidoItem.pedidoEquipo.proyecto.nombre,
          itemId: pedidoItem.id,
          precioAnterior: pedidoItem.precioUnitario,
          precioNuevo: 0,
          costoTotalNuevo: 0,
          accion: 'deseleccion'
        })
      }

      // Paso 4: recalcular totales de pedidos afectados
      const pedidosIds = [...new Set(pedidosAfectados.map(p => p.pedidoEquipo.id))]
      for (const pedidoId of pedidosIds) {
        const itemsPedido = await prisma.pedidoEquipoItem.findMany({
          where: { pedidoId },
          select: { costoTotal: true }
        })
        const nuevoPresupuestoTotal = itemsPedido.reduce((sum, item) => sum + (item.costoTotal || 0), 0)
        await prisma.pedidoEquipo.update({
          where: { id: pedidoId },
          data: { presupuestoTotal: nuevoPresupuestoTotal }
        })
      }

      // CASO editable (deselección): actualizar OC borrador con precio 0
      if (clasificacion === 'editable' && ocVinculada) {
        const resultado = await actualizarOCBorrador(ocVinculada, 0, null)
        warningOC = `La OC ${resultado.ocNumero} (borrador) fue actualizada — precios en 0 por deselección.`
      }

      return NextResponse.json({
        listaItem: updatedItem,
        pedidosActualizados,
        estadisticas: {
          pedidosAfectados: pedidosIds.length,
          itemsActualizados: pedidosActualizados.length,
          accion: 'deseleccion'
        },
        warningOC,
      })
    }

    // Es una selección normal - buscar la cotización seleccionada con su proveedor
    const cotizacionItem = await prisma.cotizacionProveedorItem.findUnique({
      where: { id: cotizacionProveedorItemId },
      include: {
        cotizacionProveedor: {
          select: { proveedorId: true }
        }
      }
    })

    // Validación: que la cotización exista y pertenezca al ítem solicitado
    if (!cotizacionItem || cotizacionItem.listaEquipoItemId !== id) {
      return NextResponse.json(
        { error: 'Cotización no válida para este ítem' },
        { status: 400 }
      )
    }

    // Paso 2: marcar como seleccionada la cotización elegida
    await prisma.cotizacionProveedorItem.update({
      where: { id: cotizacionProveedorItemId },
      data: { esSeleccionada: true },
    })

    // Paso 3: calcular precio y costo total (unitario × cantidad)
    const precioUnitario = cotizacionItem.precioUnitario ?? 0
    const cantidad = cotizacionItem.cantidad ?? cotizacionItem.cantidadOriginal ?? 0
    const costoElegido = precioUnitario * cantidad

    // Paso 4: obtener datos adicionales
    const tiempoEntrega = cotizacionItem.tiempoEntrega || 'Stock'
    const tiempoEntregaDias = cotizacionItem.tiempoEntregaDias ?? 0

    // Paso 5: actualizar el ListaEquipoItem con la información final
    const proveedorId = cotizacionItem.cotizacionProveedor?.proveedorId ?? null
    const updatedItem = await prisma.listaEquipoItem.update({
      where: { id },
      data: {
        cotizacionSeleccionadaId: cotizacionProveedorItemId,
        precioElegido: precioUnitario,
        costoElegido,
        tiempoEntrega,
        tiempoEntregaDias,
        proveedorId,
      },
    })

    // Paso 6: actualizar pedidos existentes que referencian este ítem
    const pedidosAfectados = await prisma.pedidoEquipoItem.findMany({
      where: { listaEquipoItemId: id },
      include: {
        pedidoEquipo: {
          select: { id: true, codigo: true, proyecto: { select: { nombre: true } } }
        }
      }
    })

    const pedidosActualizados = []
    for (const pedidoItem of pedidosAfectados) {
      const nuevoCostoTotal = precioUnitario * pedidoItem.cantidadPedida

      await prisma.pedidoEquipoItem.update({
        where: { id: pedidoItem.id },
        data: {
          precioUnitario,
          costoTotal: nuevoCostoTotal,
          tiempoEntrega,
          tiempoEntregaDias,
          proveedorId,
        },
      })

      pedidosActualizados.push({
        pedidoId: pedidoItem.pedidoEquipo.id,
        pedidoCodigo: pedidoItem.pedidoEquipo.codigo,
        proyectoNombre: pedidoItem.pedidoEquipo.proyecto.nombre,
        itemId: pedidoItem.id,
        precioAnterior: pedidoItem.precioUnitario,
        precioNuevo: precioUnitario,
        costoTotalNuevo: nuevoCostoTotal
      })
    }

    // Paso 7: recalcular totales de pedidos afectados
    const pedidosIds = [...new Set(pedidosAfectados.map(p => p.pedidoEquipo.id))]
    for (const pedidoId of pedidosIds) {
      const itemsPedido = await prisma.pedidoEquipoItem.findMany({
        where: { pedidoId },
        select: { costoTotal: true }
      })
      const nuevoPresupuestoTotal = itemsPedido.reduce((sum, item) => sum + (item.costoTotal || 0), 0)
      await prisma.pedidoEquipo.update({
        where: { id: pedidoId },
        data: { presupuestoTotal: nuevoPresupuestoTotal }
      })
    }

    // CASO editable (selección): actualizar OC borrador con nuevo precio
    if (clasificacion === 'editable' && ocVinculada) {
      const resultado = await actualizarOCBorrador(ocVinculada, precioUnitario, proveedorId)
      warningOC = resultado.warningProveedor
        ? `La OC ${resultado.ocNumero} está en borrador y fue actualizada con el nuevo precio. Sin embargo, fue generada para otro proveedor. Considera anularla y generar una nueva OC.`
        : `La OC ${resultado.ocNumero} (borrador) fue actualizada con el nuevo precio.`
    }

    // Paso 8: propagar precioLogistica al catálogo
    propagarPrecioLogisticaCatalogo({
      catalogoEquipoId: updatedItem.catalogoEquipoId,
      precioLogistica: precioUnitario,
      userId,
      metadata: { origen: 'seleccionar-cotizacion', listaEquipoItemId: id },
    }).catch(err => console.error('Error propagating precioLogistica:', err))

    // Listo - devolver información completa de la operación
    return NextResponse.json({
      listaItem: updatedItem,
      pedidosActualizados,
      estadisticas: {
        pedidosAfectados: pedidosIds.length,
        itemsActualizados: pedidosActualizados.length
      },
      warningOC,
    })
  } catch (error) {
    console.error('Error al seleccionar cotización:', error)
    return NextResponse.json(
      { error: 'Error al seleccionar cotización: ' + String(error) },
      { status: 500 }
    )
  }
}

// POST reutiliza el PATCH por compatibilidad
export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  return PATCH(req, context)
}
