// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: src/app/api/finanzas/aprovisionamiento/proyectos/
// 🔧 Descripción: API endpoint para vista consolidada financiera de proyectos
//
// 🧠 Funcionalidades:
// - GET: Obtener proyectos con datos consolidados de listas y pedidos
// - Cálculo de KPIs financieros y métricas de aprovisionamiento
// ✍️ Autor: Sistema GYS
// 📅 Última actualización: 2025-01-20
// ===================================================

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// ✅ Schema de validación para filtros
const FiltrosConsolidadosSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  search: z.string().optional(),
  estado: z.enum(['todos', 'activo', 'pausado', 'completado']).optional(),
  responsable: z.string().optional(),
  fechaInicio: z.string().optional(),
  fechaFin: z.string().optional(),
  alertas: z.coerce.boolean().optional()
})

// 🎯 Tipo para proyecto consolidado
interface ProyectoConsolidado {
  id: string
  nombre: string
  codigo: string
  estado: 'activo' | 'pausado' | 'completado'
  cliente: string
  responsable: string
  fechaInicio: string
  fechaFin: string
  presupuestoTotal: number
  presupuestoEjecutado: number
  presupuestoComercial: number
  presupuestoPedidos: number
  listas: {
    total: number
    aprobadas: number
    pendientes: number
    montoTotal: number
  }
  pedidos: {
    total: number
    enviados: number
    pendientes: number
    montoTotal: number
  }
  ordenes: {
    total: number
    montoComprometido: number
  }
  facturas: {
    total: number
    montoFacturado: number
    montoPagado: number
    saldoPendiente: number
  }
  recepcionesPendientes: number
  alertas: number
  progreso: number
  moneda: 'PEN' | 'USD'
}

// 🎯 Función para calcular estado del proyecto
function calcularEstadoProyecto(proyecto: any): 'activo' | 'pausado' | 'completado' {
  if (proyecto.estado === 'completado' || proyecto.estado === 'cerrado') return 'completado'
  if (proyecto.estado === 'pausado' || proyecto.estado === 'cancelado') return 'pausado'
  return 'activo'
}

// 🎯 Función para calcular progreso del proyecto
function calcularProgreso(listas: any[], pedidos: any[]): number {
  if (listas.length === 0) return 0
  
  const listasAprobadas = listas.filter(l => l.estado === 'aprobada').length
  const pedidosEnviados = pedidos.filter(p => p.estado === 'enviado').length
  
  const progresoListas = listas.length > 0 ? (listasAprobadas / listas.length) * 50 : 0
  const progresoPedidos = pedidos.length > 0 ? (pedidosEnviados / pedidos.length) * 50 : 0
  
  return Math.round(progresoListas + progresoPedidos)
}

// 🎯 Función para contar alertas
function contarAlertas(proyecto: any, listas: any[], pedidos: any[]): number {
  let alertas = 0
  
  // ⚠️ Alertas por listas pendientes
  const listasPendientes = listas.filter(l => l.estado === 'borrador' || l.estado === 'por_revisar')
  alertas += listasPendientes.length

  // ⚠️ Alertas por pedidos atrasados
  const pedidosAtrasados = pedidos.filter(p => {
    if (!p.fechaEntregaEstimada) return false
    return new Date(p.fechaEntregaEstimada) < new Date() && p.estado !== 'entregado' && p.estado !== 'cancelado'
  })
  alertas += pedidosAtrasados.length
  
  // ⚠️ Alerta por proyecto sin actividad reciente
  const fechaLimite = new Date()
  fechaLimite.setDate(fechaLimite.getDate() - 30)
  if (proyecto.updatedAt < fechaLimite) {
    alertas += 1
  }
  
  return alertas
}

// 🎯 GET - Obtener proyectos consolidados
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
    
    const { searchParams } = new URL(request.url)
    
    // 📋 Validar parámetros
    const filtros = FiltrosConsolidadosSchema.parse({
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      search: searchParams.get('search') || undefined,
      estado: searchParams.get('estado') || undefined,
      responsable: searchParams.get('responsable') || undefined,
      fechaInicio: searchParams.get('fechaInicio') || undefined,
      fechaFin: searchParams.get('fechaFin') || undefined,
      alertas: searchParams.get('alertas') === 'true'
    })
    
    // 🔍 Construir condiciones WHERE dinámicamente
    const whereConditions: any = {}
    const andConditions: any[] = []

    if (filtros.search) {
      andConditions.push({
        OR: [
          { nombre: { contains: filtros.search, mode: 'insensitive' } },
          { codigo: { contains: filtros.search, mode: 'insensitive' } },
          { comercial: { name: { contains: filtros.search, mode: 'insensitive' } } },
          { gestor: { name: { contains: filtros.search, mode: 'insensitive' } } }
        ]
      })
    }

    if (filtros.estado && filtros.estado !== 'todos') {
      if (filtros.estado === 'activo') {
        whereConditions.estado = { notIn: ['completado', 'cerrado', 'pausado', 'cancelado'] }
      } else if (filtros.estado === 'completado') {
        whereConditions.estado = { in: ['completado', 'cerrado'] }
      } else if (filtros.estado === 'pausado') {
        whereConditions.estado = { in: ['pausado', 'cancelado'] }
      }
    }

    if (filtros.responsable && filtros.responsable !== 'todos') {
      andConditions.push({
        OR: [
          { comercialId: filtros.responsable },
          { gestorId: filtros.responsable }
        ]
      })
    }

    if (filtros.fechaInicio) {
      whereConditions.fechaInicio = { gte: new Date(filtros.fechaInicio) }
    }

    if (filtros.fechaFin) {
      whereConditions.fechaFin = { lte: new Date(filtros.fechaFin) }
    }

    if (andConditions.length > 0) {
      whereConditions.AND = andConditions
    }

    // 📊 Obtener todos los proyectos (sin paginar, para KPIs globales y filtro de alertas)
    const proyectos = await prisma.proyecto.findMany({
      where: whereConditions,
      include: {
        comercial: {
          select: {
            name: true,
            email: true
          }
        },
        gestor: {
          select: {
            name: true,
            email: true
          }
        },
        cotizacion: {
          select: {
            cliente: {
              select: {
                nombre: true,
                ruc: true
              }
            }
          }
        },
        listaEquipo: {
          include: {
            listaEquipoItem: {
              select: {
                id: true,
                codigo: true,
                descripcion: true,
                cantidad: true,
                unidad: true,
                precioElegido: true,
                costoElegido: true,
                costoReal: true,
                estado: true
              }
            }
          }
        },
        pedidoEquipo: {
          include: {
            pedidoEquipoItem: {
              select: {
                id: true,
                codigo: true,
                descripcion: true,
                cantidadPedida: true,
                precioUnitario: true,
                costoTotal: true,
                estado: true,
                cantidadAtendida: true
              }
            }
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    })

    const proyectoIds = proyectos.map(p => p.id)

    // 💰 Agregar datos financieros del lado derecho del flujo (OC, CxP, Recepciones)
    // Hacemos una query agregada por proyecto para evitar N+1.

    // Comprometido: OCs en estado vivo (no borrador, no cancelada)
    const ocsActivas = proyectoIds.length === 0 ? [] : await prisma.ordenCompra.groupBy({
      by: ['proyectoId'],
      where: {
        proyectoId: { in: proyectoIds },
        estado: { in: ['aprobada', 'enviada', 'confirmada', 'parcial', 'completada'] },
      },
      _sum: { total: true },
      _count: { _all: true },
    })
    const compromisoMap = new Map<string, { monto: number; count: number }>()
    for (const r of ocsActivas) {
      if (r.proyectoId) compromisoMap.set(r.proyectoId, { monto: r._sum.total || 0, count: r._count._all })
    }

    // Cuentas por pagar (facturas) por proyecto
    const cxpAgg = proyectoIds.length === 0 ? [] : await prisma.cuentaPorPagar.groupBy({
      by: ['proyectoId'],
      where: {
        proyectoId: { in: proyectoIds },
        estado: { not: 'anulada' },
      },
      _sum: { monto: true, montoPagado: true, saldoPendiente: true },
      _count: { _all: true },
    })
    const cxpMap = new Map<string, { facturado: number; pagado: number; pendiente: number; count: number }>()
    for (const r of cxpAgg) {
      if (r.proyectoId) cxpMap.set(r.proyectoId, {
        facturado: r._sum.monto || 0,
        pagado: r._sum.montoPagado || 0,
        pendiente: r._sum.saldoPendiente || 0,
        count: r._count._all,
      })
    }

    // Recepciones pendientes por proyecto (vía OC.proyectoId → OrdenCompraItem → RecepcionPendiente)
    const recepcionesPend = proyectoIds.length === 0 ? [] : await prisma.recepcionPendiente.findMany({
      where: {
        estado: { in: ['pendiente', 'en_almacen'] },
        ordenCompraItem: {
          ordenCompra: { proyectoId: { in: proyectoIds } },
        },
      },
      select: {
        ordenCompraItem: {
          select: { ordenCompra: { select: { proyectoId: true } } },
        },
      },
    })
    const recepcionesMap = new Map<string, number>()
    for (const r of recepcionesPend) {
      const pid = r.ordenCompraItem?.ordenCompra?.proyectoId
      if (pid) recepcionesMap.set(pid, (recepcionesMap.get(pid) || 0) + 1)
    }
    
    // 🔄 Transformar datos a formato consolidado
    let proyectosConsolidados: ProyectoConsolidado[] = proyectos.map(proyecto => {
      const listas = proyecto.listaEquipo || []
      const pedidos = proyecto.pedidoEquipo || []

      // 💰 Monto total de listas (precioElegido = lo cotizado/aprobado).
      // Es el valor "presupuestado" desde la vista de aprovisionamiento.
      // Antes se usaba costoElegido que casi nunca está cargado → mostraba 0.
      const montoTotalListas = listas.reduce((total, lista) => {
        const montoLista = lista.listaEquipoItem?.reduce((subtotal, item) => {
          return subtotal + (item.precioElegido || 0) * item.cantidad
        }, 0) || 0
        return total + montoLista
      }, 0)

      // 💰 Presupuesto total = monto total de listas (alias por retrocompatibilidad)
      const presupuestoTotal = montoTotalListas

      // 💰 Calcular presupuesto ejecutado (suma de costoReal de todos los items)
      const presupuestoEjecutado = listas.reduce((total, lista) => {
        const montoLista = lista.listaEquipoItem?.reduce((subtotal, item) => {
          return subtotal + (item.costoReal || 0) * item.cantidad
        }, 0) || 0
        return total + montoLista
      }, 0)

      // 💰 Calcular montos de pedidos
      const montoTotalPedidos = pedidos.reduce((total, pedido) => {
        const montoPedido = pedido.pedidoEquipoItem?.reduce((subtotal, item) => {
          return subtotal + (item.precioUnitario || 0) * item.cantidadPedida
        }, 0) || 0
        return total + montoPedido
      }, 0)
      
      // 📊 Contar estados
      const listasAprobadas = listas.filter((l: any) => l.estado === 'aprobada').length
      const listasPendientes = listas.filter((l: any) => l.estado === 'borrador' || l.estado === 'por_revisar').length

      const pedidosEnviados = pedidos.filter((p: any) => p.estado === 'enviado').length
      const pedidosPendientes = pedidos.filter(p => p.estado === 'borrador').length
      
      const alertas = contarAlertas(proyecto, listas, pedidos)
      const progreso = calcularProgreso(listas, pedidos)
      const compromiso = compromisoMap.get(proyecto.id) || { monto: 0, count: 0 }
      const cxp = cxpMap.get(proyecto.id) || { facturado: 0, pagado: 0, pendiente: 0, count: 0 }
      const recepcionesPendientes = recepcionesMap.get(proyecto.id) || 0

      return {
        id: proyecto.id,
        nombre: proyecto.nombre,
        codigo: proyecto.codigo,
        estado: calcularEstadoProyecto(proyecto),
        cliente: proyecto.cotizacion?.cliente?.nombre || 'Sin cliente',
        responsable: proyecto.comercial?.name || proyecto.gestor?.name || 'Sin asignar',
        fechaInicio: proyecto.fechaInicio?.toISOString().split('T')[0] || '',
        fechaFin: proyecto.fechaFin?.toISOString().split('T')[0] || '',
        presupuestoTotal: presupuestoTotal,
        presupuestoEjecutado: presupuestoEjecutado,
        presupuestoComercial: proyecto.totalInterno || 0,
        presupuestoPedidos: montoTotalPedidos,
        listas: {
          total: listas.length,
          aprobadas: listasAprobadas,
          pendientes: listasPendientes,
          montoTotal: montoTotalListas
        },
        pedidos: {
          total: pedidos.length,
          enviados: pedidosEnviados,
          pendientes: pedidosPendientes,
          montoTotal: montoTotalPedidos
        },
        ordenes: {
          total: compromiso.count,
          montoComprometido: compromiso.monto,
        },
        facturas: {
          total: cxp.count,
          montoFacturado: cxp.facturado,
          montoPagado: cxp.pagado,
          saldoPendiente: cxp.pendiente,
        },
        recepcionesPendientes,
        alertas,
        progreso,
        moneda: 'USD' as const
      }
    })
    
    // 🔍 Filtrar por alertas si se solicita (aplicado después de la transformación)
    if (filtros.alertas) {
      proyectosConsolidados = proyectosConsolidados.filter(p => p.alertas > 0)
    }
    
    // 📊 Calcular KPIs globales (desde TODOS los proyectos filtrados, no solo la página)
    const kpis = {
      totalProyectos: proyectosConsolidados.length,
      proyectosActivos: proyectosConsolidados.filter(p => p.estado === 'activo').length,
      proyectosPausados: proyectosConsolidados.filter(p => p.estado === 'pausado').length,
      proyectosCompletados: proyectosConsolidados.filter(p => p.estado === 'completado').length,
      totalListas: proyectosConsolidados.reduce((sum, p) => sum + p.listas.total, 0),
      totalPedidos: proyectosConsolidados.reduce((sum, p) => sum + p.pedidos.total, 0),
      totalOrdenes: proyectosConsolidados.reduce((sum, p) => sum + p.ordenes.total, 0),
      totalFacturas: proyectosConsolidados.reduce((sum, p) => sum + p.facturas.total, 0),
      montoTotalListas: proyectosConsolidados.reduce((sum, p) => sum + p.listas.montoTotal, 0),
      montoTotalPedidos: proyectosConsolidados.reduce((sum, p) => sum + p.pedidos.montoTotal, 0),
      montoComprometido: proyectosConsolidados.reduce((sum, p) => sum + p.ordenes.montoComprometido, 0),
      montoFacturado: proyectosConsolidados.reduce((sum, p) => sum + p.facturas.montoFacturado, 0),
      montoPagado: proyectosConsolidados.reduce((sum, p) => sum + p.facturas.montoPagado, 0),
      saldoPendientePago: proyectosConsolidados.reduce((sum, p) => sum + p.facturas.saldoPendiente, 0),
      recepcionesPendientes: proyectosConsolidados.reduce((sum, p) => sum + p.recepcionesPendientes, 0),
      totalAlertas: proyectosConsolidados.reduce((sum, p) => sum + p.alertas, 0),
      progresoPromedio: proyectosConsolidados.length > 0
        ? Math.round(proyectosConsolidados.reduce((sum, p) => sum + p.progreso, 0) / proyectosConsolidados.length)
        : 0
    }
    
    // 📄 Paginación manual (después de filtros computados y KPIs)
    const adjustedTotal = proyectosConsolidados.length
    const paginatedData = proyectosConsolidados.slice(
      (filtros.page - 1) * filtros.limit,
      filtros.page * filtros.limit
    )

    return NextResponse.json({
      success: true,
      data: paginatedData,
      pagination: {
        page: filtros.page,
        limit: filtros.limit,
        total: adjustedTotal,
        pages: Math.ceil(adjustedTotal / filtros.limit)
      },
      kpis,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('❌ Error en GET /api/finanzas/aprovisionamiento/proyectos:', error)
    
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
      },
      { status: 500 }
    )
  }
}
