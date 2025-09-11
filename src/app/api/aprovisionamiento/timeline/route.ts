/**
 * 📊 API de Timeline para Aprovisionamiento Financiero V2
 * 
 * Funcionalidades:
 * - GET: Obtener datos consolidados de timeline Gantt
 * - POST: Validar y recalcular coherencia de timeline
 * - Validaciones de coherencia entre listas y pedidos
 * - Análisis de dependencias y rutas críticas
 * - Alertas de timeline y retrasos
 * 
 * @author Sistema GYS
 * @version 2.0.0
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import logger from '@/lib/logger'
import { z } from 'zod'
import type { 
  ItemGantt,
  ConfiguracionGantt,
  ResumenTimeline,
  AlertaTimeline 
} from '@/types/aprovisionamiento'

// 📋 Schema de validación para filtros de timeline
const timelineFiltersSchema = z.object({
  proyectoId: z.string().optional(),
  fechaInicio: z.string().optional().transform((val) => {
    if (!val) return undefined
    // ✅ Acepta tanto formato ISO como fecha simple (YYYY-MM-DD)
    const date = new Date(val)
    return isNaN(date.getTime()) ? undefined : date.toISOString()
  }),
  fechaFin: z.string().optional().transform((val) => {
    if (!val) return undefined
    // ✅ Acepta tanto formato ISO como fecha simple (YYYY-MM-DD)
    const date = new Date(val)
    return isNaN(date.getTime()) ? undefined : date.toISOString()
  }),
  incluirCompletados: z.boolean().default(false),
  soloAlertas: z.boolean().default(false),
  tipoVista: z.enum(['gantt', 'calendario', 'lista']).default('gantt'),
  agrupacion: z.enum(['proyecto', 'categoria', 'proveedor', 'fecha']).default('proyecto'),
  validarCoherencia: z.boolean().default(true),
  incluirSugerencias: z.boolean().default(true),
  tipo: z.enum(['lista', 'pedido', 'ambos']).default('ambos'),
  estado: z.array(z.string()).optional(),
  montoMinimo: z.number().optional(),
  montoMaximo: z.number().optional(),
  responsableId: z.string().optional(),
  soloConAlertas: z.boolean().default(false),
  zoom: z.enum(['dia', 'semana', 'mes', 'trimestre']).default('mes')
})

// 📋 Schema para validación de coherencia POST
const validacionCoherenciaSchema = z.object({
  proyectoIds: z.array(z.string()).optional(),
  recalcularFechas: z.boolean().default(false),
  aplicarSugerencias: z.boolean().default(false),
  configuracion: z.object({
    margenDias: z.number().min(1).max(30).default(7),
    alertaAnticipacion: z.number().min(1).max(60).default(14)
  }).optional()
})

// 🧮 Función para calcular fechas de lista basado en tiempoEntregaDias
function calcularFechasLista(fechaNecesaria: Date, tiempoEntregaDias: number) {
  const fechaFin = new Date(fechaNecesaria)
  const fechaInicio = new Date(fechaFin)
  fechaInicio.setDate(fechaFin.getDate() - tiempoEntregaDias)
  
  return { fechaInicio, fechaFin }
}

// 🧮 Función para calcular fechas de pedido basado en fechas de lista
function calcularFechasPedido(fechaInicioLista: Date, fechaFinLista: Date, tiempoEntregaDias: number) {
  // El pedido inicia cuando la lista está aprobada (estimado 70% del tiempo de lista)
  const fechaInicio = new Date(fechaInicioLista)
  fechaInicio.setDate(fechaInicioLista.getDate() + Math.floor(tiempoEntregaDias * 0.7))
  
  // El pedido debe completarse antes de la fecha necesaria de la lista
  const fechaFin = new Date(fechaFinLista)
  fechaFin.setDate(fechaFinLista.getDate() - 2) // 2 días de margen
  
  return { fechaInicio, fechaFin }
}

// 🚨 Función para generar alertas
function generarAlertas(item: any, tipo: 'lista' | 'pedido'): AlertaTimeline[] {
  const alertas: AlertaTimeline[] = []
  const ahora = new Date()
  const diasHastaVencimiento = Math.ceil((item.fechaFin.getTime() - ahora.getTime()) / (1000 * 60 * 60 * 24))
  
  // 🔴 Alertas por vencimiento
  if (diasHastaVencimiento < 0) {
    alertas.push({
      tipo: 'error',
      titulo: 'Elemento Vencido',
      mensaje: `${tipo === 'lista' ? 'Lista' : 'Pedido'} vencido hace ${Math.abs(diasHastaVencimiento)} días`,
      prioridad: 'alta'
    })
  } else if (diasHastaVencimiento <= 3) {
    alertas.push({
      tipo: 'warning',
      titulo: 'Vencimiento Crítico',
      mensaje: `${tipo === 'lista' ? 'Lista' : 'Pedido'} vence en ${diasHastaVencimiento} días`,
      prioridad: 'alta'
    })
  } else if (diasHastaVencimiento <= 7) {
    alertas.push({
      tipo: 'info',
      titulo: 'Próximo Vencimiento',
      mensaje: `${tipo === 'lista' ? 'Lista' : 'Pedido'} vence en ${diasHastaVencimiento} días`,
      prioridad: 'media'
    })
  }
  
  // 🟡 Alertas por estado
  if (tipo === 'lista') {
    if (item.estado === 'BORRADOR' && diasHastaVencimiento <= 14) {
      alertas.push({
        tipo: 'warning',
        titulo: 'Estado Pendiente',
        mensaje: 'Lista en borrador próxima a vencer',
        prioridad: 'media'
      })
    }
  } else {
    if (item.estado === 'BORRADOR' && diasHastaVencimiento <= 10) {
      alertas.push({
        tipo: 'warning',
        titulo: 'Estado Pendiente',
        mensaje: 'Pedido en borrador próximo a vencer',
        prioridad: 'media'
      })
    }
  }
  
  // 💰 Alertas por monto
  if (item.monto > 100000) {
    alertas.push({
      tipo: 'info',
      titulo: 'Monto Elevado',
      mensaje: 'Monto alto - requiere aprobación especial',
      prioridad: 'baja'
    })
  }
  
  return alertas
}

// 🔍 GET - Obtener datos del timeline Gantt
export async function GET(request: NextRequest) {
  // 🔐 Declarar session fuera del try para acceso en catch
  let session: any = null
  
  try {
    // 🔐 Verificar autenticación (bypass temporal para desarrollo)
    session = await getServerSession(authOptions)
    if (!session?.user && process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }
    
    // ⚠️ Log para desarrollo - remover en producción
    if (process.env.NODE_ENV === 'development') {
      console.log('🔐 Session status:', session ? 'authenticated' : 'not authenticated')
    }

    // ✅ Validar parámetros de consulta
    const { searchParams } = new URL(request.url)
    const filtros = timelineFiltersSchema.parse({
      proyectoId: searchParams.get('proyectoId') || undefined,
      fechaInicio: searchParams.get('fechaInicio') || undefined,
      fechaFin: searchParams.get('fechaFin') || undefined,
      incluirCompletados: searchParams.get('incluirCompletados') === 'true',
      soloAlertas: searchParams.get('soloAlertas') === 'true',
      tipoVista: searchParams.get('tipoVista') as any || 'gantt',
      agrupacion: searchParams.get('agrupacion') as any || 'proyecto',
      validarCoherencia: searchParams.get('validarCoherencia') !== 'false',
      incluirSugerencias: searchParams.get('incluirSugerencias') !== 'false',
      tipo: searchParams.get('tipo') as any || 'ambos',
      estado: searchParams.get('estado') ? searchParams.get('estado')!.split(',') : undefined,
      montoMinimo: searchParams.get('montoMinimo') ? parseFloat(searchParams.get('montoMinimo')!) : undefined,
      montoMaximo: searchParams.get('montoMaximo') ? parseFloat(searchParams.get('montoMaximo')!) : undefined,
      responsableId: searchParams.get('responsableId') || undefined,
      soloConAlertas: searchParams.get('soloConAlertas') === 'true',
      zoom: searchParams.get('zoom') as any || 'mes'
    })

    const itemsGantt: ItemGantt[] = []

    // 📋 Obtener listas de equipo si se requieren
    if (filtros.tipo === 'lista' || filtros.tipo === 'ambos') {
      const whereClauseListas: any = {}
      
      if (filtros.proyectoId) {
        whereClauseListas.proyectoId = filtros.proyectoId
      }
      
      if (filtros.estado) {
        whereClauseListas.estado = { in: filtros.estado }
      }

      const listas = await prisma.listaEquipo.findMany({
        where: whereClauseListas,
        include: {
          proyecto: {
            select: {
              id: true,
              nombre: true,
              codigo: true,
              comercial: {
                select: {
                  id: true,
                  name: true
                }
              },
              gestor: {
                select: {
                  id: true,
                  name: true
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
        },
        orderBy: {
          fechaNecesaria: 'asc'
        }
      })

      // 🔄 Procesar listas y calcular fechas/montos
      for (const lista of listas) {
        if (!lista.fechaNecesaria) continue

        // 🧮 Calcular monto total de la lista
        const monto = lista.items.reduce((total, item) => {
          return total + (item.cantidad * (item.precioElegido || 0))
        }, 0)

        // 🧮 Calcular fechas basado en tiempoEntregaDias según documentación
        // fechaInicio = fechaNecesaria - MAX(ListaEquipoItem.tiempoEntregaDias)
        const tiemposEntrega = lista.items
          .map(item => item.tiempoEntregaDias || 0)
          .filter(tiempo => tiempo > 0)
        const tiempoEntrega = tiemposEntrega.length > 0 ? Math.max(...tiemposEntrega) : 30
        const { fechaInicio, fechaFin } = calcularFechasLista(lista.fechaNecesaria, tiempoEntrega)

        // 🧮 Calcular días de retraso para listas
        const hoy = new Date()
        let diasRetraso = 0
        if (lista.fechaNecesaria && hoy > lista.fechaNecesaria && lista.estado !== 'aprobado') {
          diasRetraso = Math.ceil((hoy.getTime() - lista.fechaNecesaria.getTime()) / (1000 * 60 * 60 * 24))
        }

        // 🚨 Generar alertas
        const alertas = generarAlertas({
          ...lista,
          fechaFin: lista.fechaNecesaria,
          monto
        }, 'lista')

        // 🎨 Determinar color basado en estado
        let color = '#3b82f6' // azul por defecto
        switch (lista.estado) {
          case 'borrador': color = '#6b7280'; break
          case 'por_revisar': color = '#f59e0b'; break
          case 'aprobado': color = '#10b981'; break
          case 'por_cotizar': color = '#3b82f6'; break
          case 'por_validar': color = '#059669'; break
          case 'rechazado': color = '#ef4444'; break
        }

        const itemGantt: ItemGantt = {
          id: lista.id,
          tipo: 'lista',
          codigo: lista.codigo,
          nombre: lista.nombre,
          proyecto: {
            id: lista.proyecto.id,
            nombre: lista.proyecto.nombre,
            codigo: lista.proyecto.codigo
          },
          fechaInicio,
          fechaFin: lista.fechaNecesaria,
          fechaNecesaria: lista.fechaNecesaria,
          monto,
          estado: lista.estado,
          progreso: lista.estado === 'aprobado' ? 100 : 
                   lista.estado === 'por_validar' ? 75 :
                   lista.estado === 'por_aprobar' ? 50 :
                   lista.estado === 'por_revisar' ? 25 : 0,
          alertas,
          color,
          responsable: lista.proyecto.gestor?.name || undefined,
          dependencias: [],
          diasRetraso: diasRetraso > 0 ? diasRetraso : undefined,
          metadatos: {
            tiempoEntregaDias: tiempoEntrega,
            totalItems: lista.items.length
          }
        }

        itemsGantt.push(itemGantt)
      }
    }

    // 🛒 Obtener pedidos de equipo si se requieren
    if (filtros.tipo === 'pedido' || filtros.tipo === 'ambos') {
      const whereClausePedidos: any = {}
      
      if (filtros.proyectoId) {
        whereClausePedidos.proyectoId = filtros.proyectoId
      }
      
      if (filtros.estado) {
        whereClausePedidos.estado = { in: filtros.estado }
      }

      const pedidos = await prisma.pedidoEquipo.findMany({
        where: whereClausePedidos,
        include: {
          proyecto: {
            select: {
              id: true,
              nombre: true,
              codigo: true,
              gestor: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          },
          lista: {
            select: {
              id: true,
              fechaNecesaria: true
            }
          },
          items: {
            select: {
              id: true,
              cantidadPedida: true,
              precioUnitario: true,
              tiempoEntregaDias: true
            }
          }
        },
        orderBy: {
          fechaEntregaEstimada: 'asc'
        }
      })

      // 🔄 Procesar pedidos y calcular fechas/montos
      for (const pedido of pedidos) {
        // 🧮 Calcular monto total del pedido
        const monto = pedido.items.reduce((total, item) => {
          return total + (item.cantidadPedida * (item.precioUnitario || 0))
        }, 0)

        // 🧮 Calcular fechas basado en lista relacionada o estimaciones
        let fechaInicio: Date
        let fechaFin: Date
        let dependencias: string[] = []

        // 🧮 Calcular tiempoEntrega basado en MAX(PedidoEquipoItem.tiempoEntregaDias)
        const tiemposEntregaPedido = pedido.items
          .map(item => item.tiempoEntregaDias || 0)
          .filter(tiempo => tiempo > 0)
        const tiempoEntregaPedido = tiemposEntregaPedido.length > 0 ? Math.max(...tiemposEntregaPedido) : 20

        if (pedido.lista && pedido.lista.fechaNecesaria) {
          // Calcular basado en la lista relacionada
          const fechasLista = calcularFechasLista(pedido.lista.fechaNecesaria, tiempoEntregaPedido)
          const fechasPedido = calcularFechasPedido(fechasLista.fechaInicio, fechasLista.fechaFin, tiempoEntregaPedido)
          
          fechaInicio = fechasPedido.fechaInicio
          fechaFin = pedido.fechaEntregaEstimada || fechasPedido.fechaFin
          dependencias = [pedido.lista.id]
        } else {
          // Usar fechas del pedido directamente
          fechaFin = pedido.fechaEntregaEstimada || new Date()
          fechaInicio = new Date(fechaFin)
          fechaInicio.setDate(fechaFin.getDate() - tiempoEntregaPedido)
        }

        // 🧮 Calcular días de retraso para pedidos
        const hoy = new Date()
        let diasRetrasoPedido = 0
        if (pedido.fechaNecesaria && hoy > pedido.fechaNecesaria && pedido.estado !== 'entregado') {
          diasRetrasoPedido = Math.ceil((hoy.getTime() - pedido.fechaNecesaria.getTime()) / (1000 * 60 * 60 * 24))
        } else if (fechaFin && hoy > fechaFin && pedido.estado !== 'entregado') {
          diasRetrasoPedido = Math.ceil((hoy.getTime() - fechaFin.getTime()) / (1000 * 60 * 60 * 24))
        }

        // 🚨 Generar alertas
        const alertas = generarAlertas({
          ...pedido,
          fechaFin,
          monto
        }, 'pedido')

        // 🎨 Determinar color basado en estado
        let color = '#10b981' // verde por defecto
        switch (pedido.estado) {
          case 'borrador': color = '#6b7280'; break
          case 'enviado': color = '#f59e0b'; break
          case 'atendido': color = '#3b82f6'; break
          case 'parcial': color = '#8b5cf6'; break
          case 'entregado': color = '#059669'; break
          case 'cancelado': color = '#ef4444'; break
        }

        const itemGantt: ItemGantt = {
          id: pedido.id,
          tipo: 'pedido',
          codigo: pedido.codigo,
          nombre: `Pedido ${pedido.codigo}`,
          proyecto: {
            id: pedido.proyecto.id,
            nombre: pedido.proyecto.nombre,
            codigo: pedido.proyecto.codigo
          },
          fechaInicio,
          fechaFin,
          fechaNecesaria: fechaFin,
          monto,
          estado: pedido.estado,
          progreso: pedido.estado === 'entregado' ? 100 : 
                   pedido.estado === 'parcial' ? 80 :
                   pedido.estado === 'atendido' ? 60 :
                   pedido.estado === 'enviado' ? 30 : 0,
          alertas,
          color,
          responsable: pedido.proyecto.gestor?.name || undefined,
          dependencias,
          diasRetraso: diasRetrasoPedido > 0 ? diasRetrasoPedido : undefined,
          metadatos: {
            tiempoEntregaDias: tiempoEntregaPedido,
            totalItems: pedido.items.length,
            listaRelacionadaId: pedido.listaId
          }
        }

        itemsGantt.push(itemGantt)
      }
    }

    // 🔍 Aplicar filtros adicionales
    let itemsFiltrados = itemsGantt

    if (filtros.fechaInicio) {
      const fechaInicioFiltro = new Date(filtros.fechaInicio)
      itemsFiltrados = itemsFiltrados.filter(item => item.fechaFin >= fechaInicioFiltro)
    }

    if (filtros.fechaFin) {
      const fechaFinFiltro = new Date(filtros.fechaFin)
      itemsFiltrados = itemsFiltrados.filter(item => item.fechaInicio <= fechaFinFiltro)
    }

    if (filtros.montoMinimo) {
      itemsFiltrados = itemsFiltrados.filter(item => item.monto >= filtros.montoMinimo!)
    }

    if (filtros.montoMaximo) {
      itemsFiltrados = itemsFiltrados.filter(item => item.monto <= filtros.montoMaximo!)
    }

    if (filtros.responsableId) {
      itemsFiltrados = itemsFiltrados.filter(item => 
        item.proyecto.id === filtros.responsableId // Simplificado, en real sería por responsable
      )
    }

    if (filtros.soloConAlertas) {
      itemsFiltrados = itemsFiltrados.filter(item => item.alertas.length > 0)
    }

    // 📊 Calcular resumen del timeline
    const resumen: ResumenTimeline = {
      totalItems: itemsFiltrados.length,
      montoTotal: itemsFiltrados.reduce((sum, item) => sum + item.monto, 0),
      itemsVencidos: itemsFiltrados.filter(item => 
        item.fechaFin < new Date() && !['COMPLETADA', 'ENTREGADO', 'CANCELADO', 'CANCELADA'].includes(item.estado)
      ).length,
      itemsEnRiesgo: itemsFiltrados.filter(item => {
        const diasHastaVencimiento = Math.ceil((item.fechaFin.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        return diasHastaVencimiento <= 7 && diasHastaVencimiento > 0
      }).length,
      porcentajeCompletado: itemsFiltrados.length > 0 ? 
        itemsFiltrados.reduce((sum, item) => sum + item.progreso, 0) / itemsFiltrados.length : 0,
      distribucionPorTipo: {
        listas: itemsFiltrados.filter(item => item.tipo === 'lista').length,
        pedidos: itemsFiltrados.filter(item => item.tipo === 'pedido').length
      },
      alertasPorPrioridad: {
        alta: itemsFiltrados.reduce((sum, item) => 
          sum + item.alertas.filter(alerta => alerta.prioridad === 'alta').length, 0
        ),
        media: itemsFiltrados.reduce((sum, item) => 
          sum + item.alertas.filter(alerta => alerta.prioridad === 'media').length, 0
        ),
        baja: itemsFiltrados.reduce((sum, item) => 
          sum + item.alertas.filter(alerta => alerta.prioridad === 'baja').length, 0
        )
      },
      itemsConAlertas: itemsFiltrados.filter(item => item.alertas.length > 0).length,
      coherenciaPromedio: itemsFiltrados.length > 0 ? 
        itemsFiltrados.reduce((sum, item) => sum + (item.progreso || 0), 0) / itemsFiltrados.length : 100
    }

    return NextResponse.json({
      items: itemsFiltrados,
      resumen,
      configuracion: {
        zoom: filtros.zoom,
        fechaInicio: filtros.fechaInicio ? new Date(filtros.fechaInicio) : 
          itemsFiltrados.length > 0 ? 
            new Date(Math.min(...itemsFiltrados.map(item => item.fechaInicio.getTime()))) : 
            new Date(),
        fechaFin: filtros.fechaFin ? new Date(filtros.fechaFin) : 
          itemsFiltrados.length > 0 ? 
            new Date(Math.max(...itemsFiltrados.map(item => item.fechaFin.getTime()))) : 
            new Date()
      }
    })

  } catch (error) {
    console.error('Error en GET /api/aprovisionamiento/timeline:', error)
    
    if (error instanceof z.ZodError) {
      logger.error('❌ Error de validación en timeline:', {
        errors: error.errors,
        receivedParams: Object.fromEntries(new URL(request.url).searchParams.entries())
      })
      return NextResponse.json(
        { 
          error: 'Parámetros inválidos',
          details: error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '),
          receivedParams: Object.fromEntries(new URL(request.url).searchParams.entries())
        },
        { status: 400 }
      )
    }

    logger.error('❌ Error interno en timeline:', {
      error: error instanceof Error ? error.message : 'Error desconocido',
      stack: error instanceof Error ? error.stack : undefined,
      userId: session?.user?.id
    })

    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

/**
 * 📝 POST /api/aprovisionamiento/timeline
 * Valida coherencia y recalcula timeline de aprovisionamiento
 */
export async function POST(request: NextRequest) {
  // 🔐 Declarar session fuera del try para acceso en catch
  let session: any = null
  
  try {
    // 🔐 Verificar autenticación (bypass temporal para desarrollo)
    session = await getServerSession(authOptions)
    if (!session?.user && process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }
    
    // ⚠️ Log para desarrollo - remover en producción
    if (process.env.NODE_ENV === 'development') {
      console.log('🔐 POST Session status:', session ? 'authenticated' : 'not authenticated')
    }

    const body = await request.json()
    
    // ✅ Validar datos de entrada
    const datos = validacionCoherenciaSchema.parse(body)

    // 📡 Construir filtros para proyectos
    const whereConditions: any = {}
    if (datos.proyectoIds && datos.proyectoIds.length > 0) {
      whereConditions.id = {
        in: datos.proyectoIds
      }
    }

    // 📊 Obtener proyectos con datos completos
    const proyectos = await prisma.proyecto.findMany({
      where: whereConditions,
      include: {
        listaEquipos: {
          include: {
            items: {
              include: {
                proveedor: true,
                cotizacionSeleccionada: true,
                responsable: {
                  select: {
                    id: true,
                    name: true
                  }
                }
              }
            },
            pedidoEquipos: {
              include: {
                items: true
              }
            }
          }
        },
        pedidos: {
          include: {
            items: true,
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

    // 🔁 Función para validar coherencia avanzada
    function validarCoherenciaAvanzada(proyectos: any[], config: any) {
      const validaciones = {
        errores: [] as any[],
        advertencias: [] as any[],
        sugerencias: [] as any[],
        estadisticas: {
          proyectosAnalizados: proyectos.length,
          listasAnalizadas: 0,
          pedidosAnalizados: 0,
          conflictosEncontrados: 0
        }
      }

      const margenDias = config?.margenDias || 7
      const alertaAnticipacion = config?.alertaAnticipacion || 14
      const fechaActual = new Date()

      proyectos.forEach(proyecto => {
        const listas = proyecto.listaEquipos || []
        const pedidos = proyecto.pedidoEquipos || []
        
        validaciones.estadisticas.listasAnalizadas += listas.length
        validaciones.estadisticas.pedidosAnalizados += pedidos.length

        // 🔍 Validar coherencia temporal entre listas y pedidos
        listas.forEach((lista: any) => {
          const fechaNecesaria = new Date(lista.fechaNecesaria)
          const pedidosLista = lista.pedidos || []
          
          // Error: Lista vencida sin pedidos
          if (fechaNecesaria < fechaActual && pedidosLista.length === 0) {
            validaciones.errores.push({
              tipo: 'lista_vencida_sin_pedidos',
              proyectoId: proyecto.id,
              proyectoNombre: proyecto.nombre,
              listaId: lista.id,
              listaNombre: lista.nombre,
              mensaje: `Lista "${lista.nombre}" venció el ${fechaNecesaria.toLocaleDateString()} y no tiene pedidos asociados`,
              severidad: 'alta',
              fechaDeteccion: new Date().toISOString(),
              sugerencia: 'Crear pedido urgente o reprogramar fecha necesaria'
            })
            validaciones.estadisticas.conflictosEncontrados++
          }

          // Advertencia: Lista próxima a vencer
          const diasHastaVencimiento = Math.ceil((fechaNecesaria.getTime() - fechaActual.getTime()) / (1000 * 60 * 60 * 24))
          if (diasHastaVencimiento > 0 && diasHastaVencimiento <= alertaAnticipacion && pedidosLista.length === 0) {
            validaciones.advertencias.push({
              tipo: 'lista_proxima_vencer',
              proyectoId: proyecto.id,
              proyectoNombre: proyecto.nombre,
              listaId: lista.id,
              listaNombre: lista.nombre,
              mensaje: `Lista "${lista.nombre}" vence en ${diasHastaVencimiento} días y no tiene pedidos`,
              severidad: 'media',
              diasRestantes: diasHastaVencimiento,
              sugerencia: 'Iniciar proceso de pedido con anticipación'
            })
          }

          // 🔍 Validar coherencia de pedidos con lista
          pedidosLista.forEach((pedido: any) => {
            const fechaEntrega = new Date(pedido.fechaEntrega)
            
            // Error: Pedido con entrega posterior a fecha necesaria
            if (fechaEntrega > fechaNecesaria) {
              const diasRetraso = Math.ceil((fechaEntrega.getTime() - fechaNecesaria.getTime()) / (1000 * 60 * 60 * 24))
              validaciones.errores.push({
                tipo: 'pedido_entrega_tardia',
                proyectoId: proyecto.id,
                proyectoNombre: proyecto.nombre,
                listaId: lista.id,
                listaNombre: lista.nombre,
                pedidoId: pedido.id,
                mensaje: `Pedido se entrega ${diasRetraso} días después de la fecha necesaria`,
                severidad: 'alta',
                diasRetraso,
                sugerencia: 'Adelantar fecha de entrega o reprogramar lista'
              })
              validaciones.estadisticas.conflictosEncontrados++
            }

            // Advertencia: Pedido con margen insuficiente
            const margenReal = Math.ceil((fechaNecesaria.getTime() - fechaEntrega.getTime()) / (1000 * 60 * 60 * 24))
            if (margenReal >= 0 && margenReal < margenDias) {
              validaciones.advertencias.push({
                tipo: 'margen_insuficiente',
                proyectoId: proyecto.id,
                proyectoNombre: proyecto.nombre,
                listaId: lista.id,
                pedidoId: pedido.id,
                mensaje: `Margen de ${margenReal} días es menor al recomendado (${margenDias} días)`,
                severidad: 'media',
                margenActual: margenReal,
                margenRecomendado: margenDias
              })
            }
          })
        })

        // 🔍 Validar pedidos huérfanos (sin lista asociada)
        const pedidosHuerfanos = pedidos.filter((p: any) => !p.lista)
        pedidosHuerfanos.forEach((pedido: any) => {
          validaciones.advertencias.push({
            tipo: 'pedido_sin_lista',
            proyectoId: proyecto.id,
            proyectoNombre: proyecto.nombre,
            pedidoId: pedido.id,
            mensaje: 'Pedido no está asociado a ninguna lista de equipos',
            severidad: 'media',
            sugerencia: 'Asociar pedido a lista correspondiente o verificar si es necesario'
          })
        })

        // 💡 Sugerencias de optimización
        if (listas.length > 0) {
          const montoTotalListas = listas.reduce((total: number, lista: any) => {
            return total + (lista.items?.reduce((subtotal: number, item: any) => {
              return subtotal + (item.cantidad * (item.equipo?.precio || 0))
            }, 0) || 0)
          }, 0)

          const montoTotalPedidos = pedidos.reduce((total: number, pedido: any) => {
            return total + (pedido.montoTotal || 0)
          }, 0)

          const porcentajeEjecutado = montoTotalListas > 0 ? (montoTotalPedidos / montoTotalListas) * 100 : 0

          if (porcentajeEjecutado < 50 && listas.length > 2) {
            validaciones.sugerencias.push({
              tipo: 'consolidar_pedidos',
              proyectoId: proyecto.id,
              proyectoNombre: proyecto.nombre,
              mensaje: `Considerar consolidar ${listas.length} listas en menos pedidos para optimizar costos`,
              beneficio: 'Reducción de costos de gestión y mejores precios por volumen',
              porcentajeEjecutado: Math.round(porcentajeEjecutado)
            })
          }
        }
      })

      return validaciones
    }

    // 🔁 Función para generar sugerencias de recalculo
    function generarSugerenciasRecalculo(validaciones: any) {
      const sugerencias = []

      // Sugerencias basadas en errores
      const listasVencidas = validaciones.errores.filter((e: any) => e.tipo === 'lista_vencida_sin_pedidos')
      if (listasVencidas.length > 0) {
        sugerencias.push({
          tipo: 'reprogramar_listas_vencidas',
          descripcion: `Reprogramar ${listasVencidas.length} listas vencidas`,
          accion: 'Extender fechas necesarias por 30 días',
          impacto: 'Permite crear pedidos para listas críticas'
        })
      }

      // Sugerencias basadas en advertencias
      const margenes = validaciones.advertencias.filter((a: any) => a.tipo === 'margen_insuficiente')
      if (margenes.length > 0) {
        sugerencias.push({
          tipo: 'optimizar_margenes',
          descripcion: `Optimizar márgenes de ${margenes.length} pedidos`,
          accion: 'Adelantar fechas de entrega por 7 días',
          impacto: 'Reduce riesgo de retrasos en aprovisionamiento'
        })
      }

      return sugerencias
    }

    // 📊 Ejecutar validaciones
    const validaciones = validarCoherenciaAvanzada(proyectos, datos.configuracion)
    const sugerenciasRecalculo = generarSugerenciasRecalculo(validaciones)

    // 🔄 Aplicar recálculos si se solicita
    let resultadosRecalculo = null
    if (datos.recalcularFechas) {
      // Aquí implementarías la lógica de recálculo automático
      resultadosRecalculo = {
        listasActualizadas: 0,
        pedidosActualizados: 0,
        conflictosResueltos: 0
      }
    }

    logger.info('Validación de coherencia de timeline ejecutada', {
      userId: session.user.id,
      proyectosAnalizados: validaciones.estadisticas.proyectosAnalizados,
      erroresEncontrados: validaciones.errores.length,
      advertencias: validaciones.advertencias.length,
      recalculoAplicado: datos.recalcularFechas
    })

    return NextResponse.json({
      success: true,
      data: {
        validaciones,
        sugerenciasRecalculo,
        resultadosRecalculo,
        configuracion: datos.configuracion
      },
      message: `Análisis completado: ${validaciones.errores.length} errores, ${validaciones.advertencias.length} advertencias`
    })

  } catch (error) {
    logger.error('Error en validación de coherencia de timeline', {
      error: error instanceof Error ? error.message : 'Error desconocido',
      stack: error instanceof Error ? error.stack : undefined
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
