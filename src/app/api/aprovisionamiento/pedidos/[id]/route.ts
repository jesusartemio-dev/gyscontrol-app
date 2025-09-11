// ✅ API para Pedido Individual - Aprovisionamiento Financiero
// 📡 Next.js 14 App Router - CRUD completo para pedido específico
// 🎯 Operaciones GET, PUT, DELETE con validaciones y cálculos

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import logger from '@/lib/logger'
import { z } from 'zod'

// 🔁 Schema para actualización de pedido
const ActualizarPedidoSchema = z.object({
  fechaEntregaEstimada: z.string().datetime().optional(),
  observacion: z.string().optional(),
  estado: z.enum(['borrador', 'enviado', 'atendido', 'parcial', 'entregado', 'cancelado']).optional()
})

// 🔁 Función para recalcular datos de Gantt
function calcularDatosGantt(pedido: any) {
  const items = pedido.items || []
  const fechaPedido = pedido.fechaPedido || pedido.createdAt
  const fechaEntrega = pedido.fechaEntregaEstimada || new Date()
  
  const montoReal = items.reduce((total: number, item: any) => {
    return total + (item.cantidadPedida * item.precioUnitario)
  }, 0)
  
  const msPerDay = 1000 * 60 * 60 * 24
  const duracionDias = Math.ceil(
    (new Date(fechaEntrega).getTime() - new Date(fechaPedido).getTime()) / msPerDay
  )
  
  return {
    fechaInicio: new Date(fechaPedido).toISOString(),
    fechaFin: new Date(fechaEntrega).toISOString(),
    montoReal,
    duracionDias: duracionDias > 0 ? duracionDias : 1,
    cantidadItems: items.length
  }
}

// 🔁 Función para validar coherencia detallada
function validarCoherencia(pedido: any) {
  const lista = pedido.lista
  const itemsPedido = pedido.items || []
  
  if (!lista) {
    return {
      esValido: false,
      validaciones: {
        tieneLista: false,
        fechaCoherente: false,
        itemsCoherentes: false,
        cantidadesValidas: false,
        preciosValidos: false
      },
      errores: {
        sinLista: 'El pedido no está asociado a una lista'
      }
    }
  }
  
  const itemsLista = lista.items || []
  
  // Validar fecha de entrega vs fecha necesaria
  const fechaEntrega = new Date(pedido.fechaEntregaEstimada)
  const fechaNecesaria = new Date(lista.fechaNecesaria)
  const fechaCoherente = fechaEntrega <= fechaNecesaria
  
  // Validar items
  const itemsValidados = itemsPedido.map((itemPedido: any) => {
    const itemLista = itemsLista.find((il: any) => il.id === itemPedido.listaEquipoItemId)
    
    if (!itemLista) {
      return {
        itemPedido,
        itemLista: null,
        cantidadValida: false,
        precioValido: false,
        error: 'Item no encontrado en la lista'
      }
    }
    
    const cantidadValida = itemPedido.cantidadPedida <= itemLista.cantidad
    const precioValido = itemLista.precioElegido ? 
      Math.abs(itemPedido.precioUnitario - itemLista.precioElegido) <= (itemLista.precioElegido * 0.1) :
      true // Si no hay precio elegido, cualquier precio es válido
    
    return {
      itemPedido,
      itemLista,
      cantidadValida,
      precioValido,
      desviacionPrecio: itemLista.precioElegido ? 
        ((itemPedido.precioUnitario - itemLista.precioElegido) / itemLista.precioElegido) * 100 :
        0
    }
  })
  
  const itemsCoherentes = itemsValidados.every((iv: any) => iv.cantidadValida && iv.precioValido)
  const cantidadesValidas = itemsValidados.every((iv: any) => iv.cantidadValida)
  const preciosValidos = itemsValidados.every((iv: any) => iv.precioValido)
  
  const validaciones = {
    tieneLista: true,
    fechaCoherente,
    itemsCoherentes,
    cantidadesValidas,
    preciosValidos,
    tieneItems: itemsPedido.length > 0
  }
  
  const esValido = Object.values(validaciones).every(Boolean)
  
  return {
    esValido,
    validaciones,
    itemsValidados,
    errores: {
      fechaTardia: !fechaCoherente ? `Fecha de entrega posterior a fecha necesaria (${fechaNecesaria.toLocaleDateString()})` : null,
      cantidadesExcedidas: !cantidadesValidas ? 'Algunas cantidades exceden las de la lista' : null,
      preciosDesviados: !preciosValidos ? 'Algunos precios se desvían más del 10% del precio elegido' : null,
      sinItems: !validaciones.tieneItems ? 'El pedido no tiene items' : null
    }
  }
}

// ✅ GET - Obtener pedido específico
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    // 📡 Obtener pedido con todas las relaciones
    const pedido = await prisma.pedidoEquipo.findUnique({
      where: { id },
      include: {
        lista: {
          select: {
            id: true,
            codigo: true,
            nombre: true,
            estado: true,
            fechaNecesaria: true,
            proyecto: {
              select: {
                id: true,
                nombre: true,
                codigo: true,
                comercial: {
                  select: {
                    id: true,
                    name: true,
                    email: true
                  }
                },
                gestor: {
                  select: {
                    id: true,
                    name: true,
                    email: true
                  }
                }
              }
            },
            items: {
              select: {
                id: true,
                cantidad: true,
                precioElegido: true,
                tiempoEntregaDias: true
              }
            }
          }
        },

        items: {
          select: {
            id: true,
            cantidadPedida: true,
            precioUnitario: true,
            listaEquipoItemId: true
          }
        }
      }
    })

    if (!pedido) {
      return NextResponse.json(
        { error: 'Pedido no encontrado' },
        { status: 404 }
      )
    }

    // 📡 Calcular datos adicionales
    const datosGantt = calcularDatosGantt(pedido)
    const validacion = validarCoherencia(pedido)

    // 📡 Estadísticas detalladas
    const estadisticas = {
      totalItems: pedido.items.length,
      montoTotal: datosGantt.montoReal,
      diasEntrega: datosGantt.duracionDias,
      diasRestantes: pedido.fechaEntregaEstimada ? Math.ceil(
        (new Date(pedido.fechaEntregaEstimada).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      ) : 0,
      porcentajeCompletado: pedido.estado === 'atendido' ? 100 :
                           pedido.estado === 'parcial' ? 75 :
                           pedido.estado === 'enviado' ? 25 : 0
    }

    const resultado = {
      ...pedido,
      gantt: datosGantt,
      validacion,
      estadisticas
    }

    logger.info('Pedido individual obtenido', {
      userId: session.user.id,
      pedidoId: id,
      estado: pedido.estado
    })

    return NextResponse.json({
      success: true,
      data: resultado
    })

  } catch (error) {
    logger.error('Error al obtener pedido individual', {
      error: error instanceof Error ? error.message : 'Error desconocido',
      pedidoId: id
    })

    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// ✅ PUT - Actualizar pedido
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const body = await request.json()
    
    // 📡 Validar datos de entrada
    const datosValidados = ActualizarPedidoSchema.parse(body)

    // 📡 Verificar que el pedido existe
    const pedidoExistente = await prisma.pedidoEquipo.findUnique({
      where: { id },
      select: { id: true, estado: true }
    })

    if (!pedidoExistente) {
      return NextResponse.json(
        { error: 'Pedido no encontrado' },
        { status: 404 }
      )
    }

    // 📡 Validar permisos de edición según estado
    const estadosEditables = ['borrador', 'enviado']
    if (!estadosEditables.includes(pedidoExistente.estado)) {
      return NextResponse.json(
        { error: 'No se puede editar un pedido en estado ' + pedidoExistente.estado },
        { status: 403 }
      )
    }

    // 📡 Actualizar pedido
    const pedidoActualizado = await prisma.pedidoEquipo.update({
      where: { id },
      data: {
        ...datosValidados,
        updatedAt: new Date()
      },
      include: {
        lista: {
          select: {
            id: true,
            codigo: true,
            nombre: true,
            fechaNecesaria: true,
            items: {
              select: {
                id: true,
                cantidad: true,
                precioElegido: true
              }
            }
          }
        },
        items: {
          select: {
            id: true,
            cantidadPedida: true,
            precioUnitario: true,
            listaEquipoItemId: true
          }
        }
      }
    })

    // 📡 Recalcular datos
    const datosGantt = calcularDatosGantt(pedidoActualizado)
    const validacion = validarCoherencia(pedidoActualizado)

    logger.info('Pedido actualizado', {
      userId: session.user.id,
      pedidoId: id,
      cambios: Object.keys(datosValidados)
    })

    return NextResponse.json({
      success: true,
      data: {
        ...pedidoActualizado,
        gantt: datosGantt,
        validacion
      },
      message: 'Pedido actualizado correctamente'
    })

  } catch (error) {
    logger.error('Error al actualizar pedido', {
      error: error instanceof Error ? error.message : 'Error desconocido',
      pedidoId: id
    })

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Datos inválidos',
          details: error.errors
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// ✅ DELETE - Cancelar pedido (solo si está en borrador o enviado)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    // 📡 Verificar que el pedido existe
    const pedido = await prisma.pedidoEquipo.findUnique({
      where: { id },
      select: { 
        id: true, 
        estado: true, 
        codigo: true
      }
    })

    if (!pedido) {
      return NextResponse.json(
        { error: 'Pedido no encontrado' },
        { status: 404 }
      )
    }

    // 📡 Validar si se puede cancelar
    const estadosCancelables = ['borrador', 'enviado']
    if (!estadosCancelables.includes(pedido.estado)) {
      return NextResponse.json(
        { error: 'Solo se pueden cancelar pedidos en estado borrador o enviado' },
        { status: 403 }
      )
    }

    // 📡 Marcar como cancelado en lugar de eliminar
    const pedidoCancelado = await prisma.pedidoEquipo.update({
      where: { id },
      data: {
        estado: 'cancelado',
        observacion: (pedido as any).observacion ? 
          `${(pedido as any).observacion}\n\nCANCELADO: ${new Date().toLocaleString()}` :
          `CANCELADO: ${new Date().toLocaleString()}`,
        updatedAt: new Date()
      }
    })

    logger.info('Pedido cancelado', {
      userId: session.user.id,
      pedidoId: id,
      codigo: pedido.codigo
    })

    return NextResponse.json({
      success: true,
      data: pedidoCancelado,
      message: 'Pedido cancelado correctamente'
    })

  } catch (error) {
    logger.error('Error al cancelar pedido', {
      error: error instanceof Error ? error.message : 'Error desconocido',
      pedidoId: id
    })

    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}