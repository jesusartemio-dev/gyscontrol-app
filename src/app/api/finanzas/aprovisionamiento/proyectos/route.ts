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
  alertas: number
  progreso: number
  moneda: 'PEN' | 'USD'
}

// 🎯 Función para calcular estado del proyecto
function calcularEstadoProyecto(proyecto: any): 'activo' | 'pausado' | 'completado' {
  if (proyecto.estado === 'completado') return 'completado'
  if (proyecto.estado === 'pausado') return 'pausado'
  return 'activo'
}

// 🎯 Función para calcular progreso del proyecto
function calcularProgreso(listas: any[], pedidos: any[]): number {
  if (listas.length === 0) return 0
  
  const listasAprobadas = listas.filter(l => l.estado === 'aprobado').length
  const pedidosEnviados = pedidos.filter(p => p.estado === 'enviado').length
  
  const progresoListas = listas.length > 0 ? (listasAprobadas / listas.length) * 50 : 0
  const progresoPedidos = pedidos.length > 0 ? (pedidosEnviados / pedidos.length) * 50 : 0
  
  return Math.round(progresoListas + progresoPedidos)
}

// 🎯 Función para contar alertas
function contarAlertas(proyecto: any, listas: any[], pedidos: any[]): number {
  let alertas = 0
  
  // ⚠️ Alertas por listas pendientes
  const listasPendientes = listas.filter(l => l.estado === 'borrador' || l.estado === 'pendiente')
  alertas += listasPendientes.length
  
  // ⚠️ Alertas por pedidos atrasados
  const pedidosAtrasados = pedidos.filter(p => {
    if (!p.fechaEntregaEstimada) return false
    return new Date(p.fechaEntregaEstimada) < new Date() && p.estado !== 'completado'
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
    console.log('🔍 Iniciando GET /api/finanzas/aprovisionamiento/proyectos')
    
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
    
    console.log('📋 Filtros aplicados:', filtros)
    
    // 🔍 Construir condiciones WHERE dinámicamente
    const whereConditions: any = {}
    
    if (filtros.search) {
      whereConditions.OR = [
        { nombre: { contains: filtros.search, mode: 'insensitive' } },
        { codigo: { contains: filtros.search, mode: 'insensitive' } },
        { responsable: { contains: filtros.search, mode: 'insensitive' } }
      ]
    }
    
    if (filtros.estado && filtros.estado !== 'todos') {
      whereConditions.estado = filtros.estado
    }
    
    if (filtros.responsable && filtros.responsable !== 'todos') {
      whereConditions.responsable = filtros.responsable
    }
    
    if (filtros.fechaInicio) {
      whereConditions.fechaInicio = { gte: new Date(filtros.fechaInicio) }
    }
    
    if (filtros.fechaFin) {
      whereConditions.fechaFin = { lte: new Date(filtros.fechaFin) }
    }
    
    // 📊 Obtener total de registros para paginación
    const total = await prisma.proyecto.count({ where: whereConditions })
    
    // 📊 Obtener proyectos con relaciones y paginación
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
        listaEquipos: {
          include: {
            items: {
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
        pedidos: {
          include: {
            items: {
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
      skip: (filtros.page - 1) * filtros.limit,
      take: filtros.limit,
      orderBy: {
        updatedAt: 'desc'
      }
    })
    
    console.log(`📊 Encontrados ${proyectos.length} proyectos de ${total} total`)
    
    // 🔄 Transformar datos a formato consolidado
    let proyectosConsolidados: ProyectoConsolidado[] = proyectos.map(proyecto => {
      const listas = proyecto.listaEquipos || []
      const pedidos = proyecto.pedidos || []
      
      // 💰 Calcular presupuesto total (suma de costoElegido de todos los items)
      const presupuestoTotal = listas.reduce((total, lista) => {
        const montoLista = lista.items?.reduce((subtotal, item) => {
          return subtotal + (item.costoElegido || 0) * item.cantidad
        }, 0) || 0
        return total + montoLista
      }, 0)
      
      // 💰 Calcular presupuesto ejecutado (suma de costoReal de todos los items)
      const presupuestoEjecutado = listas.reduce((total, lista) => {
        const montoLista = lista.items?.reduce((subtotal, item) => {
          return subtotal + (item.costoReal || 0) * item.cantidad
        }, 0) || 0
        return total + montoLista
      }, 0)
      
      // 💰 Calcular montos de listas (para mostrar en la sección de listas)
      const montoTotalListas = listas.reduce((total, lista) => {
        const montoLista = lista.items?.reduce((subtotal, item) => {
          return subtotal + (item.precioElegido || 0) * item.cantidad
        }, 0) || 0
        return total + montoLista
      }, 0)
      
      // 💰 Calcular montos de pedidos
      const montoTotalPedidos = pedidos.reduce((total, pedido) => {
        const montoPedido = pedido.items?.reduce((subtotal, item) => {
          return subtotal + (item.precioUnitario || 0) * item.cantidadPedida
        }, 0) || 0
        return total + montoPedido
      }, 0)
      
      // 📊 Contar estados
      const listasAprobadas = listas.filter(l => l.estado === 'aprobado').length
      const listasPendientes = listas.filter(l => l.estado === 'borrador' || l.estado === 'por_revisar').length

      const pedidosEnviados = pedidos.filter(p => p.estado === 'enviado').length
      const pedidosPendientes = pedidos.filter(p => p.estado === 'borrador').length
      
      const alertas = contarAlertas(proyecto, listas, pedidos)
      const progreso = calcularProgreso(listas, pedidos)
      
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
        alertas,
        progreso,
        moneda: 'USD' as const
      }
    })
    
    // 🔍 Filtrar por alertas si se solicita (aplicado después de la transformación)
    if (filtros.alertas) {
      proyectosConsolidados = proyectosConsolidados.filter(p => p.alertas > 0)
    }
    
    // 📊 Calcular KPIs globales
    const kpis = {
      totalProyectos: total,
      proyectosActivos: proyectosConsolidados.filter(p => p.estado === 'activo').length,
      proyectosPausados: proyectosConsolidados.filter(p => p.estado === 'pausado').length,
      proyectosCompletados: proyectosConsolidados.filter(p => p.estado === 'completado').length,
      totalListas: proyectosConsolidados.reduce((sum, p) => sum + p.listas.total, 0),
      totalPedidos: proyectosConsolidados.reduce((sum, p) => sum + p.pedidos.total, 0),
      montoTotalListas: proyectosConsolidados.reduce((sum, p) => sum + p.listas.montoTotal, 0),
      montoTotalPedidos: proyectosConsolidados.reduce((sum, p) => sum + p.pedidos.montoTotal, 0),
      totalAlertas: proyectosConsolidados.reduce((sum, p) => sum + p.alertas, 0),
      progresoPromedio: proyectosConsolidados.length > 0 
        ? Math.round(proyectosConsolidados.reduce((sum, p) => sum + p.progreso, 0) / proyectosConsolidados.length)
        : 0
    }
    
    console.log('✅ Datos consolidados procesados exitosamente')
    
    return NextResponse.json({
      success: true,
      data: proyectosConsolidados,
      pagination: {
        page: filtros.page,
        limit: filtros.limit,
        total: total,
        pages: Math.ceil(total / filtros.limit)
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