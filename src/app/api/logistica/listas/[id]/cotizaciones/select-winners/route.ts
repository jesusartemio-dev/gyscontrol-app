import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { propagarPrecioLogisticaCatalogo } from '@/lib/services/catalogoPrecioSync'
import { checkOCVinculada, clasificarOC, actualizarOCBorrador } from '@/lib/utils/ocValidation'
import { crearEvento } from '@/lib/utils/trazabilidad'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const userRole = (session.user as any)?.role as string
  const rolesPermitidos = ['admin', 'gerente', 'logistico', 'gestor', 'coordinador']
  if (!rolesPermitidos.includes(userRole)) {
    return NextResponse.json({ error: 'Sin permiso para seleccionar cotización' }, { status: 403 })
  }

  try {
    const { id } = await params
    const { selections } = await request.json()

    if (!selections || typeof selections !== 'object') {
      return NextResponse.json(
        { error: 'Se requieren selecciones válidas' },
        { status: 400 }
      )
    }

    const quotationIds = Object.values(selections) as string[]
    const validQuotations = await prisma.cotizacionProveedorItem.findMany({
      where: {
        id: { in: quotationIds },
        listaEquipoItem: {
          listaId: id
        }
      },
      include: {
        cotizacionProveedor: {
          select: { proveedorId: true, proveedor: { select: { nombre: true } } }
        },
        listaEquipoItem: {
          select: { descripcion: true, listaId: true, precioElegido: true }
        }
      }
    })

    if (validQuotations.length !== quotationIds.length) {
      return NextResponse.json(
        { error: 'Una o más cotizaciones seleccionadas no son válidas' },
        { status: 400 }
      )
    }

    // Fix 3: Clasificar items por estado de OC vinculada
    const bloqueados: { codigo: string; ocNumero: string; ocEstado: string }[] = []
    const warnings: { codigo: string; mensaje: string }[] = []
    const elegibles: [string, string][] = [] // [itemId, quotationId]

    for (const [itemId, quotationId] of Object.entries(selections)) {
      // Buscar PedidoEquipoItems vinculados
      const pedidoItems = await prisma.pedidoEquipoItem.findMany({
        where: { listaEquipoItemId: itemId },
        select: { id: true }
      })
      const pedidoItemIds = pedidoItems.map(p => p.id)

      const ocVinculada = await checkOCVinculada(itemId, pedidoItemIds)
      const clasificacion = clasificarOC(ocVinculada)

      if (clasificacion === 'bloqueada') {
        // Buscar código del item para el response
        const listaItem = await prisma.listaEquipoItem.findUnique({
          where: { id: itemId },
          select: { codigo: true }
        })
        bloqueados.push({
          codigo: listaItem?.codigo || itemId,
          ocNumero: ocVinculada!.ocNumero,
          ocEstado: ocVinculada!.ocEstado,
        })
      } else {
        elegibles.push([itemId, quotationId as string])
      }
    }

    // Procesar solo los elegibles
    const pedidoIdsAfectados = new Set<string>()

    await prisma.$transaction(async (tx) => {
      // Clear all previous selections for this list
      await tx.cotizacionProveedorItem.updateMany({
        where: {
          listaEquipoItem: {
            listaId: id
          }
        },
        data: {
          esSeleccionada: false,
        }
      })

      // Set the new selections (only elegibles)
      for (const [itemId, quotationId] of elegibles) {
        await tx.cotizacionProveedorItem.update({
          where: { id: quotationId },
          data: {
            esSeleccionada: true,
          }
        })

        // Update the list item with winner details
        const winnerQuotation = validQuotations.find(q => q.id === quotationId)
        if (winnerQuotation) {
          const proveedorId = winnerQuotation.cotizacionProveedor?.proveedorId ?? null
          const precioUnitario = winnerQuotation.precioUnitario ?? 0
          const tiempoEntrega = winnerQuotation.tiempoEntrega || 'Stock'
          const tiempoEntregaDias = winnerQuotation.tiempoEntregaDias ?? 0

          // Fix 1: Agregar proveedorId al update de ListaEquipoItem
          await tx.listaEquipoItem.update({
            where: { id: itemId },
            data: {
              cotizacionSeleccionadaId: quotationId,
              precioElegido: winnerQuotation.precioUnitario,
              tiempoEntrega: winnerQuotation.tiempoEntrega,
              tiempoEntregaDias: winnerQuotation.tiempoEntregaDias,
              costoElegido: winnerQuotation.costoTotal,
              proveedorId,
              seleccionadoPorId: userId || null,
              fechaSeleccion: new Date(),
            }
          })

          // Fix 1: Propagar a PedidoEquipoItems vinculados
          const pedidoItems = await tx.pedidoEquipoItem.findMany({
            where: { listaEquipoItemId: itemId },
            include: {
              pedidoEquipo: { select: { id: true, fechaNecesaria: true } }
            }
          })

          for (const pedidoItem of pedidoItems) {
            const nuevoCostoTotal = precioUnitario * pedidoItem.cantidadPedida

            // Recalcular fecha OC recomendada
            let fechaOrdenCompraRecomendada: Date | null = null
            if (tiempoEntregaDias && pedidoItem.pedidoEquipo.fechaNecesaria) {
              const fechaNec = new Date(pedidoItem.pedidoEquipo.fechaNecesaria)
              fechaOrdenCompraRecomendada = new Date(fechaNec)
              fechaOrdenCompraRecomendada.setDate(fechaNec.getDate() - tiempoEntregaDias)
            }

            await tx.pedidoEquipoItem.update({
              where: { id: pedidoItem.id },
              data: {
                precioUnitario,
                costoTotal: nuevoCostoTotal,
                tiempoEntrega,
                tiempoEntregaDias,
                fechaOrdenCompraRecomendada,
                proveedorId,
              }
            })
            pedidoIdsAfectados.add(pedidoItem.pedidoEquipo.id)
          }

          // Fix 3: Si hay OC en borrador, actualizarla
          const pedidoItemIds = pedidoItems.map(p => p.id)
          const ocVinculada = await checkOCVinculada(itemId, pedidoItemIds, tx)
          const clasificacion = clasificarOC(ocVinculada)

          if (clasificacion === 'editable' && ocVinculada) {
            const resultado = await actualizarOCBorrador(ocVinculada, precioUnitario, proveedorId, tx)
            const listaItem = await tx.listaEquipoItem.findUnique({
              where: { id: itemId },
              select: { codigo: true }
            })
            const msg = resultado.warningProveedor
              ? `OC ${resultado.ocNumero} (borrador) actualizada. Proveedor cambió — considera regenerar la OC.`
              : `OC ${resultado.ocNumero} (borrador) actualizada con nuevo precio.`
            warnings.push({ codigo: listaItem?.codigo || itemId, mensaje: msg })
          }
        }
      }

      // Fix 1: Recalcular presupuestoTotal de cada PedidoEquipo afectado
      for (const pedidoId of pedidoIdsAfectados) {
        const itemsPedido = await tx.pedidoEquipoItem.findMany({
          where: { pedidoId },
          select: { costoTotal: true }
        })
        const nuevoPresupuestoTotal = itemsPedido.reduce((sum: number, item: any) => sum + (item.costoTotal || 0), 0)
        await tx.pedidoEquipo.update({
          where: { id: pedidoId },
          data: { presupuestoTotal: nuevoPresupuestoTotal }
        })
      }
    })

    // Propagar precioLogistica al catálogo para cada item elegible
    const userId = (session.user as any)?.id as string | undefined
    const eligibleItemIds = elegibles.map(([itemId]) => itemId)
    const listaItems = await prisma.listaEquipoItem.findMany({
      where: { id: { in: eligibleItemIds } },
      select: { id: true, catalogoEquipoId: true },
    })
    for (const [itemId, quotationId] of elegibles) {
      const listaItem = listaItems.find(li => li.id === itemId)
      const winner = validQuotations.find(q => q.id === quotationId)
      if (listaItem?.catalogoEquipoId && winner?.precioUnitario != null) {
        propagarPrecioLogisticaCatalogo({
          catalogoEquipoId: listaItem.catalogoEquipoId,
          precioLogistica: winner.precioUnitario,
          userId,
          metadata: { origen: 'select-winners-bulk', listaEquipoItemId: itemId },
        }).catch(err => console.error('Error propagating precioLogistica:', err))
      }
    }

    // Auditoría: crear eventos de trazabilidad por cada item seleccionado
    for (const [itemId, quotationId] of elegibles) {
      const winner = validQuotations.find(q => q.id === quotationId)
      const provNombre = winner?.cotizacionProveedor?.proveedor?.nombre ?? null
      const desc = winner?.listaEquipoItem?.descripcion ?? itemId
      crearEvento(prisma, {
        tipo: 'cotizacion_seleccionada',
        descripcion: `Cotización ${provNombre || 'proveedor'} seleccionada para "${desc}" — $${(winner?.precioUnitario ?? 0).toFixed(2)} (bulk)`,
        usuarioId: userId || 'system',
        listaEquipoId: id,
        metadata: {
          itemId,
          itemDescripcion: desc,
          cotizacionId: quotationId,
          proveedorNombre: provNombre,
          precioUnitario: winner?.precioUnitario ?? 0,
          precioAnterior: winner?.listaEquipoItem?.precioElegido ?? null,
          area: 'seleccion_cotizacion',
          modo: 'bulk',
        },
      }).catch(() => {})
    }

    return NextResponse.json({
      success: true,
      actualizados: elegibles.length,
      bloqueados,
      warnings,
      pedidosAfectados: pedidoIdsAfectados.size,
      message: bloqueados.length > 0
        ? `${elegibles.length} items actualizados, ${bloqueados.length} omitidos por OC activa`
        : 'Ganadores seleccionados exitosamente'
    })

  } catch (error) {
    console.error('Error selecting winners:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
