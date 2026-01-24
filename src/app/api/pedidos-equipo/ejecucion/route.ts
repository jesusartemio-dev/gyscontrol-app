/**
 * 🎯 API de Pedidos de Ejecución
 * Gestiona pedidos reales con seguimiento logístico y de entrega
 * Implementa el flujo GYS para la fase de ejecución
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// ✅ Types
interface PedidoEjecucion {
  id: string
  codigo: string
  proyecto: {
    id: string
    nombre: string
    codigo: string
  }
  lista: {
    id: string
    codigo: string
    nombre: string
  } | null
  responsable: {
    id: string
    name: string | null
  }
  estado: string
  prioridad: string
  esUrgente: boolean
  fechaPedido: Date
  fechaNecesaria: Date
  fechaEntregaEstimada: Date | null
  fechaEntregaReal: Date | null
  presupuestoTotal: number
  costoRealTotal: number
  items: PedidoEjecucionItem[]
  tiempoEntrega?: number
  diasRetraso?: number
  progreso: number
}

interface PedidoEjecucionItem {
  id: string
  codigo: string
  descripcion: string
  unidad: string
  cantidadPedida: number
  cantidadAtendida: number
  precioUnitario: number
  costoTotal: number
  estado: string
  tiempoEntrega: number
  proveedorSeleccionado?: string
}

interface MetricasEjecucion {
  totalPedidos: number
  costoReal: number
  pedidosPendientes: number
  tiempoPromedioEntrega: number
}

export async function GET(request: NextRequest) {
  try {
    // 🔐 Verificar autenticación
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const url = new URL(request.url)
    const proyectoId = url.searchParams.get('proyectoId')
    const estado = url.searchParams.get('estado')
    const prioridad = url.searchParams.get('prioridad')
    const esUrgente = url.searchParams.get('esUrgente')
    const fechaInicio = url.searchParams.get('fechaInicio')
    const fechaFin = url.searchParams.get('fechaFin')
    const search = url.searchParams.get('search')

    // 🔍 Build filters
    const whereClause: any = {}
    
    if (proyectoId && proyectoId !== 'todos') {
      whereClause.proyectoId = proyectoId
    }
    
    if (estado && estado !== 'todos') {
      whereClause.estado = estado
    }
    
    if (prioridad && prioridad !== 'todos') {
      whereClause.prioridad = prioridad
    }
    
    if (esUrgente === 'true') {
      whereClause.esUrgente = true
    }
    
    if (fechaInicio || fechaFin) {
      whereClause.fechaPedido = {}
      if (fechaInicio) {
        whereClause.fechaPedido.gte = new Date(fechaInicio)
      }
      if (fechaFin) {
        whereClause.fechaPedido.lte = new Date(fechaFin)
      }
    }
    
    if (search) {
      whereClause.OR = [
        { codigo: { contains: search, mode: 'insensitive' } },
        { proyecto: { nombre: { contains: search, mode: 'insensitive' } } },
        { proyecto: { codigo: { contains: search, mode: 'insensitive' } } },
        { listaEquipo: { nombre: { contains: search, mode: 'insensitive' } } },
        { listaEquipo: { codigo: { contains: search, mode: 'insensitive' } } }
      ]
    }

    // 📊 Fetch pedidos
    const pedidos = await prisma.pedidoEquipo.findMany({
      where: whereClause,
      include: {
        proyecto: {
          select: {
            id: true,
            nombre: true,
            codigo: true
          }
        },
        listaEquipo: {
          select: {
            id: true,
            codigo: true,
            nombre: true
          }
        },
        user: {
          select: {
            id: true,
            name: true
          }
        },
        pedidoEquipoItem: {
          select: {
            id: true,
            codigo: true,
            descripcion: true,
            unidad: true,
            cantidadPedida: true,
            cantidadAtendida: true,
            precioUnitario: true,
            costoTotal: true,
            estado: true,
            tiempoEntrega: true
          }
        }
      },
      orderBy: [
        { esUrgente: 'desc' },
        { fechaNecesaria: 'asc' },
        { createdAt: 'desc' }
      ]
    })

    // 🧮 Process pedidos data
    const pedidosEjecucion = pedidos.map(pedido => {
      // Calculate tiempo de entrega
      let tiempoEntrega = 0
      if (pedido.fechaEntregaReal && pedido.fechaPedido) {
        tiempoEntrega = Math.ceil(
          (new Date(pedido.fechaEntregaReal).getTime() - new Date(pedido.fechaPedido).getTime()) / 
          (1000 * 60 * 60 * 24)
        )
      }

      // Calculate días de retraso
      let diasRetraso = 0
      const hoy = new Date()
      if (pedido.fechaNecesaria && hoy > new Date(pedido.fechaNecesaria) && pedido.estado !== 'entregado') {
        diasRetraso = Math.ceil(
          (hoy.getTime() - new Date(pedido.fechaNecesaria).getTime()) / 
          (1000 * 60 * 60 * 24)
        )
      }

      // Calculate progreso
      const totalItems = pedido.pedidoEquipoItem.length
      const itemsCompletados = pedido.pedidoEquipoItem.filter(item =>
        (item.cantidadAtendida ?? 0) >= item.cantidadPedida
      ).length
      const progreso = totalItems > 0 ? (itemsCompletados / totalItems) * 100 : 0

      return {
        id: pedido.id,
        codigo: pedido.codigo,
        proyecto: pedido.proyecto,
        lista: pedido.listaEquipo,
        responsable: {
          id: pedido.user.id,
          name: pedido.user.name || 'Sin nombre'
        },
        estado: pedido.estado,
        prioridad: pedido.prioridad,
        esUrgente: pedido.esUrgente,
        fechaPedido: pedido.fechaPedido,
        fechaNecesaria: pedido.fechaNecesaria,
        fechaEntregaEstimada: pedido.fechaEntregaEstimada,
        fechaEntregaReal: pedido.fechaEntregaReal,
        presupuestoTotal: pedido.presupuestoTotal,
        costoRealTotal: pedido.costoRealTotal || 0,
        items: pedido.pedidoEquipoItem,
        tiempoEntrega,
        diasRetraso,
        progreso: Math.round(progreso)
      }
    })

    // 🧮 Calculate metrics
    const metricas: MetricasEjecucion = {
      totalPedidos: pedidosEjecucion.length,
      costoReal: pedidosEjecucion.reduce((sum, p) => sum + p.costoRealTotal, 0),
      pedidosPendientes: pedidosEjecucion.filter(p => 
        !['entregado', 'cancelado'].includes(p.estado)
      ).length,
      tiempoPromedioEntrega: 0
    }

    // Calculate tiempo promedio de entrega
    const pedidosEntregados = pedidosEjecucion.filter(p => p.tiempoEntrega > 0)
    if (pedidosEntregados.length > 0) {
      const tiempoTotal = pedidosEntregados.reduce((sum, p) => sum + p.tiempoEntrega, 0)
      metricas.tiempoPromedioEntrega = Math.round(tiempoTotal / pedidosEntregados.length)
    }

    return NextResponse.json({
      pedidos: pedidosEjecucion,
      metricas
    })

  } catch (error) {
    console.error('❌ Error en API de pedidos ejecución:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    // 🔐 Verificar autenticación
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { pedidoId, estado, fechaEntregaReal, observaciones } = body

    if (!pedidoId || !estado) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      )
    }

    // 📝 Update pedido
    const updateData: any = {
      estado,
      updatedAt: new Date()
    }

    if (fechaEntregaReal) {
      updateData.fechaEntregaReal = new Date(fechaEntregaReal)
    }

    if (observaciones) {
      updateData.observaciones = observaciones
    }

    const pedidoActualizado = await prisma.pedidoEquipo.update({
      where: { id: pedidoId },
      data: updateData,
      include: {
        proyecto: {
          select: {
            id: true,
            nombre: true,
            codigo: true
          }
        },
        listaEquipo: {
          select: {
            id: true,
            codigo: true,
            nombre: true
          }
        },
        user: {
          select: {
            id: true,
            name: true
          }
        },
        pedidoEquipoItem: true
      }
    })

    return NextResponse.json({
      message: 'Pedido actualizado exitosamente',
      pedido: pedidoActualizado
    })

  } catch (error) {
    console.error('❌ Error actualizando pedido:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
