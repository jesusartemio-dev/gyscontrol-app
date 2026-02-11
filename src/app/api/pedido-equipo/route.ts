// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: src/app/api/pedido-equipo/
// 🔧 Descripción: API para crear y listar pedidos de equipo por proyecto con código secuencial
// 🧠 Uso: Proyectos genera pedidos; logística visualiza y gestiona
// ✍️ Autor: Jesús Artemio + IA GYS
// 📅 Última actualización: 2025-07-17
// ===================================================

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import type { PedidoEquipoPayload } from '@/types'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { registrarCreacion } from '@/lib/services/audit'
import { randomUUID } from 'crypto'

// ✅ Obtener todos los pedidos con filtros avanzados
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const proyectoId = searchParams.get('proyectoId')
    const estado = searchParams.get('estado')
    const responsableId = searchParams.get('responsableId')
    const fechaDesde = searchParams.get('fechaDesde')
    const fechaHasta = searchParams.get('fechaHasta')
    const searchText = searchParams.get('searchText')
    const fechaOCDesde = searchParams.get('fechaOCDesde')
    const fechaOCHasta = searchParams.get('fechaOCHasta')
    const soloVencidas = searchParams.get('soloVencidas') === 'true'

    // Build where clause dynamically
    const whereClause: any = {}
    
    if (proyectoId) {
      whereClause.proyectoId = proyectoId
    }
    
    if (estado) {
      whereClause.estado = estado
    }
    
    if (responsableId) {
      whereClause.responsableId = responsableId
    }
    
    if (fechaDesde || fechaHasta) {
      whereClause.fechaPedido = {}
      if (fechaDesde) {
        whereClause.fechaPedido.gte = new Date(fechaDesde)
      }
      if (fechaHasta) {
        whereClause.fechaPedido.lte = new Date(fechaHasta + 'T23:59:59.999Z')
      }
    }
    
    if (searchText) {
      whereClause.OR = [
        { codigo: { contains: searchText, mode: 'insensitive' } },
        { observacion: { contains: searchText, mode: 'insensitive' } },
        { listaEquipo: { nombre: { contains: searchText, mode: 'insensitive' } } },
        { user: { name: { contains: searchText, mode: 'insensitive' } } },
      ]
    }

    // Filtros por fecha OC recomendada
    if (fechaOCDesde || fechaOCHasta || soloVencidas) {
      whereClause.pedidoEquipoItem = {
        some: {
          fechaOrdenCompraRecomendada: {
            ...(fechaOCDesde && { gte: new Date(fechaOCDesde) }),
            ...(fechaOCHasta && { lte: new Date(fechaOCHasta + 'T23:59:59.999Z') }),
            ...(soloVencidas && { lt: new Date() })
          }
        }
      }
    }

    const data = await prisma.pedidoEquipo.findMany({
      where: whereClause,
      select: {
        id: true,
        codigo: true,
        numeroSecuencia: true,
        estado: true,
        observacion: true,
        fechaPedido: true,
        fechaNecesaria: true,
        fechaEntregaEstimada: true,
        fechaEntregaReal: true,
        proyectoId: true,
        responsableId: true,
        listaId: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        proyecto: {
          select: {
            id: true,
            codigo: true,
            nombre: true,
          },
        },
        listaEquipo: {
          select: {
            id: true,
            nombre: true,
            listaEquipoItem: {
              select: {
                id: true,
                cantidadPedida: true,
                codigo: true,
                descripcion: true,
                unidad: true,
                precioElegido: true,
                tiempoEntrega: true,
                tiempoEntregaDias: true,
              },
            },
          },
        },
        pedidoEquipoItem: {
           select: {
             id: true,
             cantidadPedida: true,
             cantidadAtendida: true,
             precioUnitario: true,
             costoTotal: true,
             estado: true,
             codigo: true,
             descripcion: true,
             unidad: true,
             fechaEntregaEstimada: true,
             fechaEntregaReal: true,
             estadoEntrega: true,
             observacionesEntrega: true,
             listaEquipoItem: {
               select: {
                 id: true,
                 codigo: true,
                 descripcion: true,
                 unidad: true,
                 precioElegido: true,
                 proveedor: {
                  select: {
                    id: true,
                    nombre: true,
                    ruc: true,
                  },
                },
               },
             },
           },
         },
      },
      orderBy: { fechaPedido: 'desc' },
    })

    // Transformar para compatibilidad con frontend
    const response = data.map(pedido => ({
      ...pedido,
      responsable: pedido.user,
      lista: pedido.listaEquipo ? {
        ...pedido.listaEquipo,
        items: pedido.listaEquipo.listaEquipoItem
      } : null,
      items: pedido.pedidoEquipoItem
    }))

    return NextResponse.json(response)
  } catch (error) {
    console.error('❌ Error en GET /api/pedido-equipo:', error)
    return NextResponse.json(
      { error: 'Error al obtener pedidos: ' + String(error) },
      { status: 500 }
    )
  }
}

// ✅ Crear nuevo pedido (unificado: soporta creación directa y desde lista)
export async function POST(request: Request) {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const body: PedidoEquipoPayload = await request.json()

    // 🎯 Validaciones mínimas
    if (!body.proyectoId || !body.responsableId || !body.fechaNecesaria) {
      return NextResponse.json(
        { error: 'Campos requeridos faltantes (proyectoId, responsableId, fechaNecesaria)' },
        { status: 400 }
      )
    }

    // 🔎 Validar existencia de proyecto
    const proyecto = await prisma.proyecto.findUnique({
      where: { id: body.proyectoId },
    })
    if (!proyecto) {
      return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })
    }

    // 🔎 Validar existencia de responsable
    const responsable = await prisma.user.findUnique({
      where: { id: body.responsableId },
    })
    if (!responsable) {
      return NextResponse.json({ error: 'Responsable no encontrado' }, { status: 404 })
    }

    // 🔎 Validar lista técnica si se envía
    if (body.listaId) {
      const lista = await prisma.listaEquipo.findUnique({
        where: { id: body.listaId },
      })
      if (!lista) {
        return NextResponse.json({ error: 'Lista de equipo no encontrada' }, { status: 404 })
      }
    }

    // 🔢 Generar código secuencial
    const ultimoPedido = await prisma.pedidoEquipo.findFirst({
      where: { proyectoId: body.proyectoId },
      orderBy: { numeroSecuencia: 'desc' },
    })
    const nuevoNumero = ultimoPedido ? ultimoPedido.numeroSecuencia + 1 : 1
    const codigoGenerado = `${proyecto.codigo}-PED-${String(nuevoNumero).padStart(3, '0')}`

    // 📦 Pre-cargar items de lista si hay seleccionados (para pricing fallback)
    let listaItemsMap = new Map<string, any>()
    if (body.itemsSeleccionados && body.itemsSeleccionados.length > 0) {
      const listaItemIds = body.itemsSeleccionados.map(item => item.listaEquipoItemId)
      const listaItems = await prisma.listaEquipoItem.findMany({
        where: { id: { in: listaItemIds } },
        include: {
          cotizacionSeleccionada: {
            select: { precioUnitario: true },
          },
          proveedor: {
            select: { id: true, nombre: true },
          },
        },
      })
      listaItemsMap = new Map(listaItems.map(item => [item.id, item]))

      // Validar que todos los items existen
      for (const itemSel of body.itemsSeleccionados) {
        if (!listaItemsMap.has(itemSel.listaEquipoItemId)) {
          return NextResponse.json(
            { error: `Item de lista no encontrado: ${itemSel.listaEquipoItemId}` },
            { status: 400 }
          )
        }
      }
    }

    // 🔄 Transacción atómica: crear pedido + items + actualizar cantidades
    const now = new Date()
    const pedidoId = randomUUID()

    const resultado = await prisma.$transaction(async (tx) => {
      // 1️⃣ Crear el pedido
      const pedido = await tx.pedidoEquipo.create({
        data: {
          id: pedidoId,
          proyectoId: body.proyectoId,
          responsableId: body.responsableId,
          listaId: body.listaId ?? null,
          codigo: codigoGenerado,
          numeroSecuencia: nuevoNumero,
          estado: 'borrador',
          observacion: body.observacion ?? '',
          prioridad: body.prioridad || 'media',
          esUrgente: body.esUrgente || false,
          fechaPedido: body.fechaPedido ? new Date(body.fechaPedido) : now,
          fechaNecesaria: new Date(body.fechaNecesaria),
          fechaEntregaEstimada: body.fechaEntregaEstimada ? new Date(body.fechaEntregaEstimada) : null,
          fechaEntregaReal: body.fechaEntregaReal ? new Date(body.fechaEntregaReal) : null,
          updatedAt: now,
        },
      })

      // 2️⃣ Crear items del pedido si hay seleccionados
      let itemsCreados = 0
      let presupuestoTotal = 0

      if (body.itemsSeleccionados && body.itemsSeleccionados.length > 0) {
        for (const itemSel of body.itemsSeleccionados) {
          const listaItem = listaItemsMap.get(itemSel.listaEquipoItemId)!
          const cantidad = listaItem.cantidad || 1

          // Pricing fallback: precioElegido > cotizacionSeleccionada > 0
          // Si no hay precio confirmado, usar 0 (presupuesto es solo estimación, no precio real)
          let precioUnitario = 0
          if (listaItem.precioElegido !== null && listaItem.precioElegido !== undefined) {
            precioUnitario = listaItem.precioElegido
          } else if (listaItem.cotizacionSeleccionada?.precioUnitario) {
            precioUnitario = listaItem.cotizacionSeleccionada.precioUnitario
          }

          const costoTotal = precioUnitario * itemSel.cantidadPedida
          presupuestoTotal += costoTotal

          await tx.pedidoEquipoItem.create({
            data: {
              id: randomUUID(),
              pedidoId: pedido.id,
              listaEquipoItemId: listaItem.id,
              listaId: listaItem.listaId,
              codigo: listaItem.codigo,
              descripcion: listaItem.descripcion,
              unidad: listaItem.unidad,
              cantidadPedida: itemSel.cantidadPedida,
              precioUnitario,
              costoTotal,
              tiempoEntrega: listaItem.tiempoEntrega,
              tiempoEntregaDias: listaItem.tiempoEntregaDias,
              responsableId: body.responsableId,
              estado: 'pendiente',
              estadoEntrega: 'pendiente',
              proveedorId: listaItem.proveedorId || null,
              proveedorNombre: listaItem.proveedor?.nombre || null,
              updatedAt: now,
            },
          })

          // Actualizar cantidadPedida en ListaEquipoItem
          await tx.listaEquipoItem.update({
            where: { id: itemSel.listaEquipoItemId },
            data: { cantidadPedida: { increment: itemSel.cantidadPedida } },
          })

          itemsCreados++
        }

        // Actualizar presupuestoTotal en el pedido
        await tx.pedidoEquipo.update({
          where: { id: pedido.id },
          data: { presupuestoTotal, updatedAt: now },
        })
      }

      return { pedido, itemsCreados }
    })

    // Budget validation warning
    let _advertenciaPresupuesto: string | null = null
    if (body.listaId) {
      // Calculate lista budget from items since ListaEquipo has no presupuestoTotal field
      const listaItems = await prisma.listaEquipoItem.findMany({
        where: { listaId: body.listaId },
        select: { presupuesto: true, precioElegido: true, cantidad: true }
      })
      const listaPresupuesto = listaItems.reduce((sum, item) => {
        return sum + ((item.precioElegido ?? item.presupuesto ?? 0) * (item.cantidad || 1))
      }, 0)
      if (listaPresupuesto > 0) {
        // Sum all pedidos from this lista
        const pedidosLista = await prisma.pedidoEquipo.findMany({
          where: { listaId: body.listaId },
          select: { presupuestoTotal: true }
        })
        const totalPedidos = pedidosLista.reduce((s, p) => s + (p.presupuestoTotal || 0), 0)
        if (totalPedidos > listaPresupuesto) {
          _advertenciaPresupuesto = `La suma de pedidos ($${totalPedidos.toFixed(2)}) excede el presupuesto de la lista ($${listaPresupuesto.toFixed(2)})`
        }
      }
    }

    // ✅ Registrar en auditoría (fuera de la transacción)
    try {
      await registrarCreacion(
        'PEDIDO_EQUIPO',
        resultado.pedido.id,
        session.user.id,
        `Pedido ${resultado.pedido.codigo}`,
        {
          proyecto: proyecto.nombre,
          codigo: resultado.pedido.codigo,
          fechaNecesaria: body.fechaNecesaria,
          estado: resultado.pedido.estado,
          itemsCreados: resultado.itemsCreados,
        }
      )
    } catch (auditError) {
      console.error('Error al registrar auditoría:', auditError)
    }

    console.log(`✅ Pedido ${resultado.pedido.codigo} creado con ${resultado.itemsCreados} items`)
    return NextResponse.json({ ...resultado.pedido, _advertenciaPresupuesto })
  } catch (error) {
    console.error('❌ Error al crear pedido:', error)
    return NextResponse.json(
      { error: 'Error al crear pedido: ' + String(error) },
      { status: 500 }
    )
  }
}
