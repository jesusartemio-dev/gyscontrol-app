// ✅ API para Listas de Equipos - Aprovisionamiento Financiero
// 📡 Next.js 14 App Router - API Routes con validaciones y filtros
// 🎯 Obtener listas con filtros avanzados y cálculos automáticos

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { z } from 'zod'

// 🔁 Schema de validación para filtros
const FiltrosListasSchema = z.object({
  proyectoId: z.string().optional(),
  estado: z.enum(['borrador', 'por_revisar', 'por_cotizar', 'por_validar', 'por_aprobar', 'aprobado', 'rechazado']).optional(),
  responsable: z.string().optional(),
  fechaDesde: z.string().optional(),
  fechaHasta: z.string().optional(),
  montoMinimo: z.number().optional(),
  montoMaximo: z.number().optional(),
  busqueda: z.string().optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  orderBy: z.enum(['fechaNecesaria', 'codigo', 'nombre', 'createdAt']).default('fechaNecesaria'),
  orderDir: z.enum(['asc', 'desc']).default('asc')
})

// 🔁 Función para calcular datos de Gantt para listas
function calcularDatosGantt(lista: any) {
  // 📡 Cálculo según especificación:
  // fechaInicio = fechaNecesaria - MAX(tiempoEntregaDias)
  // fechaFin = fechaNecesaria
  // montoProyectado = SUM(cantidad * precioElegido)
  
  const items = lista.items || []
  const maxTiempoEntrega = Math.max(...items.map((item: any) => item.tiempoEntregaDias || 0), 0)
  const fechaNecesaria = new Date(lista.fechaNecesaria)
  const fechaInicio = new Date(fechaNecesaria)
  fechaInicio.setDate(fechaInicio.getDate() - maxTiempoEntrega)
  
  const montoProyectado = items.reduce((total: number, item: any) => {
    return total + (item.cantidad * (item.precioElegido || 0))
  }, 0)
  
  return {
    fechaInicio: fechaInicio.toISOString(),
    fechaFin: lista.fechaNecesaria,
    montoProyectado,
    duracionDias: maxTiempoEntrega,
    cantidadItems: items.length
  }
}

// 🔁 Función para calcular coherencia con pedidos
function calcularCoherencia(lista: any) {
  const pedidos = lista.pedidos || []
  const montoLista = lista.items?.reduce((total: number, item: any) => {
    return total + (item.cantidad * (item.precioElegido || 0))
  }, 0) || 0
  
  const montoPedidos = pedidos.reduce((total: number, pedido: any) => {
    return total + (pedido.items?.reduce((subtotal: number, item: any) => {
      return subtotal + (item.cantidadPedida * item.precioUnitario)
    }, 0) || 0)
  }, 0)
  
  const porcentajeEjecutado = montoLista > 0 ? (montoPedidos / montoLista) * 100 : 0
  const desviacion = montoPedidos - montoLista
  const esCoherente = Math.abs(desviacion) <= (montoLista * 0.05) // 5% tolerancia
  
  return {
    montoLista,
    montoPedidos,
    porcentajeEjecutado,
    desviacion,
    esCoherente,
    alertas: {
      excedePedidos: montoPedidos > montoLista * 1.1,
      faltanPedidos: montoPedidos < montoLista * 0.5 && pedidos.length === 0,
      desviacionAlta: Math.abs(desviacion) > montoLista * 0.1
    }
  }
}

// ✅ GET - Obtener listas con filtros
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

    // 📡 Extraer y validar parámetros de consulta
    const { searchParams } = new URL(request.url)
    const params = {
      proyectoId: searchParams.get('proyectoId') || undefined,
      estado: searchParams.get('estado') || undefined,
      responsable: searchParams.get('responsable') || undefined,
      fechaDesde: searchParams.get('fechaDesde') || undefined,
      fechaHasta: searchParams.get('fechaHasta') || undefined,
      montoMinimo: searchParams.get('montoMinimo') ? Number(searchParams.get('montoMinimo')) : undefined,
      montoMaximo: searchParams.get('montoMaximo') ? Number(searchParams.get('montoMaximo')) : undefined,
      busqueda: searchParams.get('busqueda') || undefined,
      page: Number(searchParams.get('page')) || 1,
      limit: Number(searchParams.get('limit')) || 20,
      orderBy: searchParams.get('orderBy') || 'fechaNecesaria',
      orderDir: searchParams.get('orderDir') || 'asc'
    }

    const filtros = FiltrosListasSchema.parse(params)

    // 📡 Construir condiciones de filtro
    const where: any = {}
    
    if (filtros.proyectoId) {
      where.proyectoId = filtros.proyectoId
    }
    
    if (filtros.estado) {
      where.estado = filtros.estado
    }
    
    if (filtros.responsable) {
      where.OR = [
        { proyecto: { comercialId: filtros.responsable } },
        { proyecto: { gestorId: filtros.responsable } }
      ]
    }
    
    if (filtros.fechaDesde || filtros.fechaHasta) {
      where.fechaNecesaria = {}
      if (filtros.fechaDesde) {
        where.fechaNecesaria.gte = new Date(filtros.fechaDesde)
      }
      if (filtros.fechaHasta) {
        where.fechaNecesaria.lte = new Date(filtros.fechaHasta)
      }
    }
    
    if (filtros.busqueda) {
      where.OR = [
        { codigo: { contains: filtros.busqueda, mode: 'insensitive' } },
        { nombre: { contains: filtros.busqueda, mode: 'insensitive' } },
        { proyecto: { nombre: { contains: filtros.busqueda, mode: 'insensitive' } } }
      ]
    }

    // 📡 Calcular offset para paginación
    const offset = (filtros.page - 1) * filtros.limit

    // 📡 Obtener listas con relaciones
    const [listas, total] = await Promise.all([
      prisma.listaEquipo.findMany({
        where,
        include: {
          proyecto: {
            select: {
              id: true,
              nombre: true,
              codigo: true,
              comercialId: true,
              gestorId: true,
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
              codigo: true,
              descripcion: true,
              cantidad: true,
              precioElegido: true,
              tiempoEntregaDias: true,
              unidad: true,
              estado: true
            }
          },
          pedidoEquipos: {
            include: {
              items: {
                select: {
                  cantidadPedida: true,
                  precioUnitario: true
                }
              }
            }
          }
        },
        orderBy: {
          [filtros.orderBy]: filtros.orderDir
        },
        skip: offset,
        take: filtros.limit
      }),
      prisma.listaEquipo.count({ where })
    ])

    // 📡 Procesar listas con cálculos
    const listasConCalculos = listas.map(lista => {
      const datosGantt = calcularDatosGantt(lista)
      const coherencia = calcularCoherencia(lista)
      
      // 🔁 Filtrar por monto si se especifica
      if (filtros.montoMinimo && datosGantt.montoProyectado < filtros.montoMinimo) {
        return null
      }
      if (filtros.montoMaximo && datosGantt.montoProyectado > filtros.montoMaximo) {
        return null
      }
      
      return {
        id: lista.id,
        codigo: lista.codigo,
        nombre: lista.nombre,
        estado: lista.estado,
        fechaNecesaria: lista.fechaNecesaria,
        createdAt: lista.createdAt,
        updatedAt: lista.updatedAt,
        proyecto: lista.proyecto,
        gantt: datosGantt,
        coherencia,
        estadisticas: {
          totalItems: lista.items?.length || 0,
          totalPedidos: lista.pedidoEquipos?.length || 0,
          montoTotal: datosGantt.montoProyectado,
          porcentajeEjecutado: coherencia.porcentajeEjecutado
        }
      }
    }).filter(Boolean)

    // 📡 Calcular estadísticas generales
    const estadisticas = {
      total,
      pagina: filtros.page,
      limite: filtros.limit,
      totalPaginas: Math.ceil(total / filtros.limit),
      montoTotalProyectado: listasConCalculos.reduce((sum, lista) => sum + (lista?.gantt.montoProyectado || 0), 0),
      estadosDistribucion: listas.reduce((acc: any, lista) => {
        acc[lista.estado] = (acc[lista.estado] || 0) + 1
        return acc
      }, {}),
      alertasGlobales: {
        listasConExceso: listasConCalculos.filter(l => l?.coherencia.alertas.excedePedidos).length,
        listasSinPedidos: listasConCalculos.filter(l => l?.coherencia.alertas.faltanPedidos).length,
        listasConDesviacion: listasConCalculos.filter(l => l?.coherencia.alertas.desviacionAlta).length
      }
    }

    logger.info('Listas de equipos obtenidas', {
      userId: session.user.id,
      filtros,
      resultados: listasConCalculos.length,
      total
    })

    return NextResponse.json({
      success: true,
      data: listasConCalculos,
      estadisticas,
      filtros: filtros
    })

  } catch (error) {
    logger.error('Error al obtener listas de equipos', {
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

// ✅ POST - Crear nueva lista (opcional para completitud)
export async function POST(request: NextRequest) {
  try {
    // 📡 Verificar autenticación
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    // 📡 Por ahora retornamos método no implementado
    // En el futuro se puede implementar creación de listas desde aprovisionamiento
    return NextResponse.json(
      { error: 'Método no implementado en esta versión' },
      { status: 501 }
    )

  } catch (error) {
    logger.error('Error en POST listas aprovisionamiento', { error })
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}