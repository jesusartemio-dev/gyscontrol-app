/**
 * 📋 API Individual para Proyectos de Aprovisionamiento Financiero
 * 
 * Funcionalidades:
 * - GET: Obtener proyecto específico con datos de aprovisionamiento
 * - PUT: Actualizar proyecto y recalcular datos
 * - DELETE: Eliminar proyecto y validar dependencias
 * 
 * @author Sistema GYS
 * @version 2.0.0
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { z } from 'zod'

// 📋 Schema de validación para actualización de proyecto
const actualizarProyectoSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido').optional(),
  codigo: z.string().min(1, 'El código es requerido').optional(),
  estado: z.enum(['planificacion', 'en_progreso', 'pausado', 'completado', 'cancelado']).optional(),
  fechaInicio: z.string().datetime().optional(),
  fechaFin: z.string().datetime().optional(),
  presupuesto: z.number().min(0, 'El presupuesto debe ser positivo').optional(),
  descripcion: z.string().optional(),
  comercialId: z.string().optional(),
  gestorId: z.string().optional()
})

/**
 * 📡 GET /api/aprovisionamiento/proyectos/[id]
 * Obtiene un proyecto específico con todos sus datos de aprovisionamiento
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    // 🔐 Verificar autenticación
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const proyectoId = id

    // 📡 Obtener proyecto con todas las relaciones
    const proyecto = await prisma.proyecto.findUnique({
      where: { id: proyectoId },
      include: {
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
        },
        listaEquipos: {
          include: {
            items: {
              select: {
                id: true,
                codigo: true,
                descripcion: true,
                cantidad: true,
                precioElegido: true,
                estado: true,
                unidad: true
              }
            },
            pedidoEquipos: {
              select: {
                id: true,
                estado: true,
                fechaEntregaEstimada: true,
                costoRealTotal: true
              }
            }
          }
        },
        pedidos: {
          include: {
            items: {
              select: {
                id: true,
                codigo: true,
                descripcion: true,
                cantidadPedida: true,
                precioUnitario: true,
                unidad: true,
                listaEquipoItemId: true
              }
            },
            lista: {
              select: {
                id: true,
                nombre: true,
                fechaNecesaria: true
              }
            }
          }
        }
      }
    })

    if (!proyecto) {
      return NextResponse.json(
        { error: 'Proyecto no encontrado' },
        { status: 404 }
      )
    }

    // 🔁 Función para calcular KPIs del proyecto
    function calcularKPIsProyecto(proyecto: any) {
      const listas = proyecto.listas || []
      const pedidos = proyecto.pedidos || []
      
      // 💰 Calcular montos de listas
      const montoListas = listas.reduce((total: number, lista: any) => {
        const montoLista = lista.items?.reduce((subtotal: number, item: any) => {
          return subtotal + (item.cantidad * (item.equipo?.precio || 0))
        }, 0) || 0
        return total + montoLista
      }, 0)
      
      // 💰 Calcular montos de pedidos
      const montoPedidos = pedidos.reduce((total: number, pedido: any) => {
        return total + (pedido.montoTotal || 0)
      }, 0)
      
      // 📊 Calcular porcentajes y desviaciones
      const porcentajeEjecutado = montoListas > 0 ? (montoPedidos / montoListas) * 100 : 0
      const porcentajeDesviacion = proyecto.presupuesto > 0 ? 
        ((montoListas - proyecto.presupuesto) / proyecto.presupuesto) * 100 : 0
      
      // 🚨 Calcular alertas
      const fechaActual = new Date()
      const listasPendientes = listas.filter((lista: any) => {
        const fechaNecesaria = new Date(lista.fechaNecesaria)
        const tienePedidos = lista.pedidos && lista.pedidos.length > 0
        return fechaNecesaria <= fechaActual && !tienePedidos
      }).length
      
      const pedidosRetrasados = pedidos.filter((pedido: any) => {
        const fechaEntrega = new Date(pedido.fechaEntrega)
        return fechaEntrega < fechaActual && pedido.estado !== 'entregado'
      }).length
      
      // 📈 Determinar estado de aprovisionamiento
      let estadoAprovisionamiento = 'sin_listas'
      if (listas.length > 0) {
        if (pedidos.length === 0) {
          estadoAprovisionamiento = 'listas_creadas'
        } else if (porcentajeEjecutado < 50) {
          estadoAprovisionamiento = 'parcialmente_pedido'
        } else if (porcentajeEjecutado < 100) {
          estadoAprovisionamiento = 'mayormente_pedido'
        } else {
          estadoAprovisionamiento = 'completamente_pedido'
        }
      }
      
      return {
        cantidadListas: listas.length,
        cantidadPedidos: pedidos.length,
        montoListas,
        montoPedidos,
        porcentajeEjecutado: Math.round(porcentajeEjecutado * 100) / 100,
        porcentajeDesviacion: Math.round(porcentajeDesviacion * 100) / 100,
        estadoAprovisionamiento,
        alertas: {
          listasPendientes,
          pedidosRetrasados,
          desviacionPresupuesto: Math.abs(porcentajeDesviacion) > 10
        }
      }
    }

    // 🔁 Función para calcular datos de Gantt
    function calcularDatosGantt(proyecto: any) {
      const listas = proyecto.listas || []
      const pedidos = proyecto.pedidos || []
      
      if (listas.length === 0) {
        return {
          fechaInicio: proyecto.fechaInicio,
          fechaFin: proyecto.fechaFin || proyecto.fechaInicio,
          duracionDias: 0,
          hitos: []
        }
      }
      
      // Calcular fechas extremas
      const fechasNecesarias = listas.map((l: any) => new Date(l.fechaNecesaria))
      const fechaInicioListas = new Date(Math.min(...fechasNecesarias.map((f: Date) => f.getTime())))
      const fechaFinListas = new Date(Math.max(...fechasNecesarias.map((f: Date) => f.getTime())))
      
      let fechaFinPedidos = fechaFinListas
      if (pedidos.length > 0) {
        const fechasEntrega = pedidos.map((p: any) => new Date(p.fechaEntrega))
        fechaFinPedidos = new Date(Math.max(...fechasEntrega.map((f: Date) => f.getTime())))
      }
      
      const fechaInicio = proyecto.fechaInicio ? new Date(proyecto.fechaInicio) : fechaInicioListas
      const fechaFin = fechaFinPedidos > fechaFinListas ? fechaFinPedidos : fechaFinListas
      
      const msPerDay = 1000 * 60 * 60 * 24
      const duracionDias = Math.ceil((fechaFin.getTime() - fechaInicio.getTime()) / msPerDay)
      
      // Crear hitos del timeline
      const hitos = [
        {
          tipo: 'inicio_proyecto',
          fecha: fechaInicio.toISOString(),
          descripcion: 'Inicio del proyecto'
        },
        ...listas.map((lista: any) => ({
          tipo: 'lista_necesaria',
          fecha: lista.fechaNecesaria,
          descripcion: `Lista requerida: ${lista.nombre}`,
          listaId: lista.id
        })),
        ...pedidos.map((pedido: any) => ({
          tipo: 'entrega_pedido',
          fecha: pedido.fechaEntrega,
          descripcion: `Entrega de pedido`,
          pedidoId: pedido.id
        })),
        {
          tipo: 'fin_proyecto',
          fecha: fechaFin.toISOString(),
          descripcion: 'Fin del proyecto'
        }
      ].sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
      
      return {
        fechaInicio: fechaInicio.toISOString(),
        fechaFin: fechaFin.toISOString(),
        duracionDias: duracionDias > 0 ? duracionDias : 1,
        hitos
      }
    }

    // 📊 Calcular datos del proyecto
    const kpis = calcularKPIsProyecto(proyecto)
    const gantt = calcularDatosGantt(proyecto)
    
    // 🚨 Calcular alertas específicas
    const fechaActual = new Date()
    const fechaFin = proyecto.fechaFin ? new Date(proyecto.fechaFin) : null
    
    const alertas = {
      proyectoRetrasado: fechaFin ? fechaActual > fechaFin && proyecto.estado !== 'completado' : false,
      sinAprovisionamiento: kpis.cantidadListas === 0,
      desviacionPresupuesto: Math.abs(kpis.porcentajeDesviacion) > 10,
      pedidosRetrasados: kpis.alertas.pedidosRetrasados > 0,
      listasPendientes: kpis.alertas.listasPendientes > 0
    }

    const proyectoCompleto = {
      ...proyecto,
      kpis,
      gantt,
      alertas,
      estadoAprovisionamiento: kpis.estadoAprovisionamiento
    }

    logger.info('Proyecto de aprovisionamiento obtenido', {
      userId: session.user.id,
      proyectoId,
      cantidadListas: kpis.cantidadListas,
      cantidadPedidos: kpis.cantidadPedidos
    })

    return NextResponse.json({
      success: true,
      data: proyectoCompleto
    })

  } catch (error) {
    logger.error('Error al obtener proyecto de aprovisionamiento', {
      error: error instanceof Error ? error.message : 'Error desconocido',
      stack: error instanceof Error ? error.stack : undefined,
      proyectoId: id
    })

    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

/**
 * 📝 PUT /api/aprovisionamiento/proyectos/[id]
 * Actualiza un proyecto y recalcula sus datos de aprovisionamiento
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    // 🔐 Verificar autenticación
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const proyectoId = id
    const body = await request.json()

    // ✅ Validar datos de entrada
    const datosValidados = actualizarProyectoSchema.parse(body)

    // 📡 Verificar que el proyecto existe
    const proyectoExistente = await prisma.proyecto.findUnique({
      where: { id: proyectoId }
    })

    if (!proyectoExistente) {
      return NextResponse.json(
        { error: 'Proyecto no encontrado' },
        { status: 404 }
      )
    }

    // 🔁 Validaciones de negocio
    if (datosValidados.fechaInicio && datosValidados.fechaFin) {
      const fechaInicio = new Date(datosValidados.fechaInicio)
      const fechaFin = new Date(datosValidados.fechaFin)
      
      if (fechaFin <= fechaInicio) {
        return NextResponse.json(
          { error: 'La fecha de fin debe ser posterior a la fecha de inicio' },
          { status: 400 }
        )
      }
    }

    // 📝 Actualizar proyecto
    const proyectoActualizado = await prisma.proyecto.update({
      where: { id: proyectoId },
      data: {
        ...datosValidados,
        updatedAt: new Date()
      },
      include: {
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
        },
        listaEquipos: {
          include: {
            items: true,
            pedidoEquipos: true
          }
        },
        pedidos: {
          include: {
            items: true
          }
        }
      }
    })

    logger.info('Proyecto de aprovisionamiento actualizado', {
      userId: session.user.id,
      proyectoId,
      cambios: Object.keys(datosValidados)
    })

    return NextResponse.json({
      success: true,
      data: proyectoActualizado,
      message: 'Proyecto actualizado exitosamente'
    })

  } catch (error) {
    logger.error('Error al actualizar proyecto de aprovisionamiento', {
      error: error instanceof Error ? error.message : 'Error desconocido',
      stack: error instanceof Error ? error.stack : undefined,
      proyectoId: id
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

/**
 * 🗑️ DELETE /api/aprovisionamiento/proyectos/[id]
 * Elimina un proyecto validando dependencias de aprovisionamiento
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    // 🔐 Verificar autenticación
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const proyectoId = id

    // 📡 Verificar que el proyecto existe y obtener dependencias
    const proyecto = await prisma.proyecto.findUnique({
      where: { id: proyectoId },
      include: {
        listaEquipos: {
          include: {
            pedidoEquipos: true
          }
        },
        pedidos: true
      }
    })

    if (!proyecto) {
      return NextResponse.json(
        { error: 'Proyecto no encontrado' },
        { status: 404 }
      )
    }

    // 🔁 Validar dependencias antes de eliminar
    const listasConPedidos = proyecto.listaEquipos.filter((lista: any) => 
      lista.pedidoEquipos && lista.pedidoEquipos.length > 0
    )
    
    const pedidosActivos = proyecto.pedidos.filter(pedido => 
      pedido.estado !== 'cancelado'
    )

    if (listasConPedidos.length > 0 || pedidosActivos.length > 0) {
      return NextResponse.json(
        { 
          error: 'No se puede eliminar el proyecto',
          message: 'El proyecto tiene listas con pedidos asociados o pedidos activos',
          dependencias: {
            listasConPedidos: listasConPedidos.length,
            pedidosActivos: pedidosActivos.length
          }
        },
        { status: 400 }
      )
    }

    // 🗑️ Eliminar proyecto (Prisma manejará las relaciones en cascada)
    await prisma.proyecto.delete({
      where: { id: proyectoId }
    })

    logger.info('Proyecto de aprovisionamiento eliminado', {
      userId: session.user.id,
      proyectoId,
      nombre: proyecto.nombre
    })

    return NextResponse.json({
      success: true,
      message: 'Proyecto eliminado exitosamente'
    })

  } catch (error) {
    logger.error('Error al eliminar proyecto de aprovisionamiento', {
      error: error instanceof Error ? error.message : 'Error desconocido',
      stack: error instanceof Error ? error.stack : undefined,
      proyectoId: id
    })

    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}