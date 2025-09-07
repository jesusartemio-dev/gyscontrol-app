// ✅ API para Pedidos de Equipos - Aprovisionamiento Financiero
// 📡 Next.js 14 App Router - API Routes con validaciones y filtros
// 🎯 Obtener pedidos con filtros avanzados y cálculos automáticos

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { z } from 'zod'

// 🔁 Schema de validación para filtros
const FiltrosPedidosSchema = z.object({
  proyectoId: z.string().optional(),
  listaId: z.string().optional(),
  proveedorId: z.string().optional(),
  estado: z.enum(['borrador', 'enviado', 'atendido', 'parcial', 'entregado', 'cancelado']).optional(),
  responsable: z.string().optional(),
  fechaDesde: z.string().optional(),
  fechaHasta: z.string().optional(),
  montoMinimo: z.number().optional(),
  montoMaximo: z.number().optional(),
  busqueda: z.string().optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  orderBy: z.enum(['fechaEntregaEstimada', 'costoRealTotal', 'codigo', 'createdAt']).default('fechaEntregaEstimada'),
  orderDir: z.enum(['asc', 'desc']).default('asc')
})

// 🔁 Función para calcular datos de Gantt para pedidos
function calcularDatosGantt(pedido: any) {
  // 📡 Cálculo según especificación:
  // fechaInicio = fechaPedido
  // fechaFin = fechaEntrega
  // montoReal = SUM(cantidadPedida * precioUnitario)
  
  const items = pedido.items || []
  const fechaPedido = pedido.fechaPedido || pedido.createdAt
  const fechaEntrega = pedido.fechaEntregaEstimada || new Date()
  
  const montoReal = items.reduce((total: number, item: any) => {
    return total + (item.cantidadPedida * item.precioUnitario)
  }, 0)
  
  // Calcular duración en días
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

// 🔁 Función para calcular coherencia con lista
function calcularCoherencia(pedido: any) {
  const lista = pedido.lista
  if (!lista) {
    return {
      esCoherente: false,
      alertas: {
        sinLista: true
      }
    }
  }
  
  const itemsPedido = pedido.items || []
  const itemsLista = lista.items || []
  
  // Mapear items de pedido a sus correspondientes en lista
  const itemsMapeados = itemsPedido.map((itemPedido: any) => {
    const itemLista = itemsLista.find((il: any) => il.id === itemPedido.listaEquipoItemId)
    return {
      itemPedido,
      itemLista,
      cantidadCoherente: itemLista ? itemPedido.cantidadPedida <= itemLista.cantidad : false,
      precioCoherente: itemLista ? 
        Math.abs(itemPedido.precioUnitario - (itemLista.precioElegido || 0)) <= (itemLista.precioElegido || 0) * 0.1 : 
        false
    }
  })
  
  const cantidadItemsCoherentes = itemsMapeados.filter((im: any) => im.cantidadCoherente).length
  const cantidadPreciosCoherentes = itemsMapeados.filter((im: any) => im.precioCoherente).length
  
  const esCoherente = 
    itemsMapeados.length > 0 && 
    cantidadItemsCoherentes === itemsMapeados.length && 
    cantidadPreciosCoherentes === itemsMapeados.length
  
  return {
    esCoherente,
    itemsCoherentes: cantidadItemsCoherentes,
    preciosCoherentes: cantidadPreciosCoherentes,
    totalItems: itemsMapeados.length,
    alertas: {
      cantidadesExcedidas: cantidadItemsCoherentes < itemsMapeados.length,
      preciosDesviados: cantidadPreciosCoherentes < itemsMapeados.length,
      itemsFaltantes: itemsLista.length > itemsPedido.length
    }
  }
}

// ✅ GET - Obtener pedidos con filtros
export async function GET(request: NextRequest) {
  try {
    // 📡 Verificar autenticación
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }
    
    console.log('🔍 API pedidos - Iniciando GET request')

    // 📡 Extraer y validar parámetros de consulta
    const { searchParams } = new URL(request.url)
    const params = {
      proyectoId: searchParams.get('proyectoId') || undefined,
      listaId: searchParams.get('listaId') || undefined,
      proveedorId: searchParams.get('proveedorId') || undefined,
      estado: searchParams.get('estado') || undefined,
      responsable: searchParams.get('responsable') || undefined,
      fechaDesde: searchParams.get('fechaDesde') || undefined,
      fechaHasta: searchParams.get('fechaHasta') || undefined,
      montoMinimo: searchParams.get('montoMinimo') ? Number(searchParams.get('montoMinimo')) : undefined,
      montoMaximo: searchParams.get('montoMaximo') ? Number(searchParams.get('montoMaximo')) : undefined,
      busqueda: searchParams.get('busqueda') || undefined,
      page: Number(searchParams.get('page')) || 1,
      limit: Number(searchParams.get('limit')) || 20,
      orderBy: searchParams.get('orderBy') || 'fechaEntregaEstimada',
      orderDir: searchParams.get('orderDir') || 'asc'
    }

    const filtros = FiltrosPedidosSchema.parse(params)

    // 📡 Construir condiciones de filtro
    const where: any = {}
    
    if (filtros.proyectoId) {
      where.lista = {
        proyectoId: filtros.proyectoId
      }
    }
    
    if (filtros.listaId) {
      where.listaId = filtros.listaId
    }
    
    // Nota: proveedorId filtro removido ya que no hay relación directa con proveedor
    
    if (filtros.estado) {
      where.estado = filtros.estado
    }
    
    if (filtros.responsable) {
      where.OR = [
        { lista: { proyecto: { comercialId: filtros.responsable } } },
        { lista: { proyecto: { gestorId: filtros.responsable } } }
      ]
    }
    
    if (filtros.fechaDesde || filtros.fechaHasta) {
      where.fechaEntrega = {}
      if (filtros.fechaDesde) {
        where.fechaEntrega.gte = new Date(filtros.fechaDesde)
      }
      if (filtros.fechaHasta) {
        where.fechaEntrega.lte = new Date(filtros.fechaHasta)
      }
    }
    
    if (filtros.busqueda) {
      where.OR = [
        { codigo: { contains: filtros.busqueda, mode: 'insensitive' } },
        { observacion: { contains: filtros.busqueda, mode: 'insensitive' } },
        { lista: { codigo: { contains: filtros.busqueda, mode: 'insensitive' } } },
        { proyecto: { codigo: { contains: filtros.busqueda, mode: 'insensitive' } } },
        { proyecto: { nombre: { contains: filtros.busqueda, mode: 'insensitive' } } }
      ]
    }

    // 📡 Calcular offset para paginación
    const offset = (filtros.page - 1) * filtros.limit

    // 📡 Obtener pedidos con relaciones
    const [pedidos, total] = await Promise.all([
      prisma.pedidoEquipo.findMany({
        where,
        include: {
          // ✅ Proyecto directo del pedido
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
          // ✅ Lista asociada (opcional)
          lista: {
            select: {
              id: true,
              codigo: true,
              nombre: true,
              estado: true,
              fechaNecesaria: true
            }
          },
          // ✅ Items del pedido para calcular monto total
          items: {
            select: {
              id: true,
              cantidadPedida: true,
              precioUnitario: true,
              costoTotal: true,
              listaEquipoItemId: true,
              codigo: true,
              descripcion: true
            }
          }
        },
        orderBy: {
          [filtros.orderBy]: filtros.orderDir
        },
        skip: offset,
        take: filtros.limit
      }),
      prisma.pedidoEquipo.count({ where })
    ])

    // 📡 Procesar pedidos con cálculos
    const pedidosConCalculos = pedidos.map(pedido => {
      const datosGantt = calcularDatosGantt(pedido)
      const coherencia = calcularCoherencia(pedido)
      
      // 🔁 Filtrar por monto si se especifica
      if (filtros.montoMinimo && datosGantt.montoReal < filtros.montoMinimo) {
        return null
      }
      if (filtros.montoMaximo && datosGantt.montoReal > filtros.montoMaximo) {
        return null
      }
      
      return {
        id: pedido.id,
        codigo: pedido.codigo,
        estado: pedido.estado,
        fechaPedido: pedido.fechaPedido,
        fechaEntregaEstimada: pedido.fechaEntregaEstimada,
        fechaEntregaReal: pedido.fechaEntregaReal,
        observacion: pedido.observacion,
        createdAt: pedido.createdAt,
        updatedAt: pedido.updatedAt,
        // ✅ Proyecto del pedido
        proyecto: pedido.proyecto ? {
          id: pedido.proyecto.id,
          codigo: pedido.proyecto.codigo,
          nombre: pedido.proyecto.nombre,
          comercial: pedido.proyecto.comercial,
          gestor: pedido.proyecto.gestor
        } : null,
        // ✅ Lista asociada (opcional)
        lista: pedido.lista,
        // ✅ Items del pedido
        items: pedido.items || [],
        gantt: datosGantt,
        coherencia,
        estadisticas: {
          totalItems: pedido.items?.length || 0,
          montoTotal: datosGantt.montoReal,
          diasEntrega: datosGantt.duracionDias
        }
      }
    }).filter(Boolean)

    // 📡 Calcular estadísticas generales
    const estadisticas = {
      total,
      pagina: filtros.page,
      limite: filtros.limit,
      totalPaginas: Math.ceil(total / filtros.limit),
      montoTotalReal: pedidosConCalculos.reduce((sum, pedido) => sum + (pedido?.gantt.montoReal || 0), 0),
      estadosDistribucion: pedidos.reduce((acc: any, pedido) => {
        acc[pedido.estado] = (acc[pedido.estado] || 0) + 1
        return acc
      }, {}),
      alertasGlobales: {
        pedidosIncoherentes: pedidosConCalculos.filter(p => !p?.coherencia.esCoherente).length,
        pedidosRetrasados: pedidosConCalculos.filter(p => {
          return p?.fechaEntregaEstimada && new Date(p.fechaEntregaEstimada) > new Date() && 
                 p?.lista?.fechaNecesaria && new Date(p.fechaEntregaEstimada) > new Date(p.lista.fechaNecesaria)
        }).length
      }
    }

    logger.info('Pedidos de equipos obtenidos', {
      userId: session.user.id,
      filtros,
      resultados: pedidosConCalculos.length,
      total
    })

    return NextResponse.json({
      success: true,
      data: pedidosConCalculos,
      estadisticas,
      filtros: filtros
    })

  } catch (error) {
    logger.error('Error al obtener pedidos de equipos', {
      error: error instanceof Error ? error.message : 'Error desconocido',
      stack: error instanceof Error ? error.stack : undefined
    })

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Parámetros inválidos',
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

// ✅ POST - Crear nuevo pedido (opcional para completitud)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    // 📡 Por ahora retornamos método no implementado
    // En el futuro se puede implementar creación de pedidos desde aprovisionamiento
    return NextResponse.json(
      { error: 'Método no implementado en esta versión' },
      { status: 501 }
    )

  } catch (error) {
    logger.error('Error en POST pedidos aprovisionamiento', { error })
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}