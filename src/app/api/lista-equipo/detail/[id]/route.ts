// ===================================================
// 📁 Archivo: /api/lista-equipo/detail/[id]/route.ts
// 🔧 Descripción: API optimizada para vista Detail - datos completos de una lista específica
// 🧠 Uso: GET para obtener lista con información completa para vista de detalle
// ✍️ Autor: Asistente IA GYS (Fase 4 Master-Detail)
// 📅 Última actualización: 2025-01-27
// ===================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// 🎯 GET - Obtener lista específica con datos completos para vista Detail
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { error: 'ID de lista requerido' },
        { status: 400 }
      )
    }

    // 🎯 Complete query with all relationships for Detail view
    const lista = await prisma.listaEquipo.findUnique({
      where: { id },
      include: {
        // 🏢 Complete project information
        proyecto: {
          select: {
            id: true,
            nombre: true,
            codigo: true,
            estado: true,
            fechaInicio: true,
            fechaFin: true,
            cliente: {
              select: {
                id: true,
                nombre: true,
                correo: true
              }
            }
          }
        },
        // 👤 Complete responsible information
        responsable: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        },
        // 📋 Complete items with all relationships
        items: {
          include: {
            // 👤 Responsable information
            responsable: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true
              }
            },
            // 🏪 Proveedor information
            proveedor: {
              select: {
                id: true,
                nombre: true,
                ruc: true
              }
            },
            // 💰 All cotizaciones with details
            cotizaciones: {
              include: {
                cotizacion: {
                  select: {
                    id: true,
                    codigo: true,
                    createdAt: true,
                    estado: true,
                    proveedor: {
                      select: {
                        id: true,
                        nombre: true
                      }
                    }
                  }
                }
              },
              orderBy: {
                precioUnitario: 'asc'
              }
            },
            // 📦 All pedidos with complete information
            pedidos: {
              include: {
                pedido: {
                  select: {
                    id: true,
                    codigo: true,
                    fechaPedido: true,
                    fechaEntregaEstimada: true,
                    estado: true
                  }
                }
              }
            },

            // 🏗️ Proyecto equipo relationship
            proyectoEquipo: {
              select: {
                id: true,
                nombre: true,
                descripcion: true
              }
            },
            // 📋 Proyecto equipo item relationship
            proyectoEquipoItem: {
              include: {
                proyectoEquipo: {
                  select: {
                    id: true,
                    nombre: true,
                    descripcion: true
                  }
                },
                listaEquipoSeleccionado: {
                  select: {
                    id: true,
                    codigo: true,
                    descripcion: true
                  }
                }
              }
            }
          },
          orderBy: {
            createdAt: 'asc'
          }
        }
      }
    })

    if (!lista) {
      return NextResponse.json(
        { error: 'Lista no encontrada' },
        { status: 404 }
      )
    }

    // 🧮 Calculate detailed statistics and enrich data
    const itemsEnriquecidos = lista.items.map(item => {
      // 💰 Calculate best prices and totals
      const mejorCotizacion = item.cotizaciones.length > 0 
        ? item.cotizaciones[0] // Already ordered by price ASC
        : null
      
      const precioUnitarioFinal = mejorCotizacion?.precioUnitario 
        || item.precioElegido 
        || item.presupuesto 
        || 0
      
      const subtotal = precioUnitarioFinal * (item.cantidad || 0)
      
      // 📦 Calculate pedidos statistics
      const cantidadPedida = item.pedidos.reduce((total, pedidoItem) => {
        return total + (pedidoItem.cantidadPedida || 0)
      }, 0)
      
      const cantidadPendiente = (item.cantidad || 0) - cantidadPedida
      const progresoPedidos = item.cantidad > 0 
        ? Math.round((cantidadPedida / item.cantidad) * 100) 
        : 0
      
      // 💵 Calculate savings if cotización is better than budget
      const ahorro = item.presupuesto && mejorCotizacion?.precioUnitario
        ? (item.presupuesto - mejorCotizacion.precioUnitario) * (item.cantidad || 0)
        : 0
      
      return {
        ...item,
        // 💰 Calculated fields
        precioUnitarioFinal,
        subtotal,
        cantidadPedida,
        cantidadPendiente,
        progresoPedidos,
        ahorro,
        // 🎯 Status indicators
        tieneCotizaciones: item.cotizaciones.length > 0,
        tienePedidos: item.pedidos.length > 0,
        estaCompletamentePedido: cantidadPendiente <= 0,
        necesitaCotizacion: item.cotizaciones.length === 0 && !item.precioElegido
      }
    })

    // 📊 Calculate lista-level statistics
    const estadisticas = {
      totalItems: lista.items.length,
      itemsConCotizacion: itemsEnriquecidos.filter(item => item.tieneCotizaciones).length,
      itemsConPedidos: itemsEnriquecidos.filter(item => item.tienePedidos).length,
      itemsCompletos: itemsEnriquecidos.filter(item => item.estaCompletamentePedido).length,
      
      // 💰 Financial totals
      montoPresupuestado: itemsEnriquecidos.reduce((total, item) => 
        total + ((item.presupuesto || 0) * (item.cantidad || 0)), 0),
      montoEstimado: itemsEnriquecidos.reduce((total, item) => 
        total + item.subtotal, 0),
      ahorroTotal: itemsEnriquecidos.reduce((total, item) => 
        total + item.ahorro, 0),
      
      // 📈 Progress percentages
      progresoCotizacion: lista.items.length > 0 
        ? Math.round((itemsEnriquecidos.filter(item => item.tieneCotizaciones).length / lista.items.length) * 100)
        : 0,
      progresoPedidos: lista.items.length > 0 
        ? Math.round((itemsEnriquecidos.filter(item => item.tienePedidos).length / lista.items.length) * 100)
        : 0,
      progresoCompletado: lista.items.length > 0 
        ? Math.round((itemsEnriquecidos.filter(item => item.estaCompletamentePedido).length / lista.items.length) * 100)
        : 0
    }

    // 🎯 Return enriched lista with complete data
    const listaCompleta = {
      ...lista,
      items: itemsEnriquecidos,
      estadisticas,
      // 🎯 Lista-level status indicators
      estaCompleta: estadisticas.progresoCotizacion === 100,
      tienePedidosPendientes: estadisticas.progresoPedidos < 100,
      necesitaRevision: estadisticas.progresoCotizacion < 50,
      puedeGenerarPedidos: estadisticas.progresoCotizacion > 0 && estadisticas.progresoPedidos < 100
    }

    return NextResponse.json(listaCompleta)
  } catch (error) {
    console.error('❌ Error en GET /lista-equipo/detail/[id]:', error)
    return NextResponse.json(
      { error: 'Error al obtener detalle de lista: ' + String(error) },
      { status: 500 }
    )
  }
}