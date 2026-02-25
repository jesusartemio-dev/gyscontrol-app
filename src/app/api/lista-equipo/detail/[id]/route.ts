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

    // 🎯 Simplified query to avoid Prisma client cache issues
    const lista = await prisma.listaEquipo.findUnique({
      where: { id },
      include: {
        // 🏢 Basic project information
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
        // 👤 Basic responsible information
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        // 📋 Simplified items with basic relationships
        listaEquipoItem: {
          include: {
            // 👤 Basic responsable information
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            },
            // 🏪 Basic proveedor information
            proveedor: {
              select: {
                id: true,
                nombre: true
              }
            },
            // 👤 Auditoría de selección de cotización
            seleccionadoPor: {
              select: {
                id: true,
                name: true
              }
            },
            // 💰 Simplified cotizaciones
            cotizacionProveedorItems: {
              select: {
                id: true,
                precioUnitario: true,
                cantidad: true,
                estado: true,
                esSeleccionada: true,
                tiempoEntrega: true,
                tiempoEntregaDias: true,
                createdAt: true,
                cotizacionProveedor: {
                  select: {
                    id: true,
                    codigo: true,
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
            // 📦 Simplified pedidos
            pedidoEquipoItem: {
              select: {
                id: true,
                cantidadPedida: true,
                estado: true,
                createdAt: true,
                pedidoEquipo: {
                  select: {
                    id: true,
                    codigo: true,
                    estado: true
                  }
                }
              }
            },

            // 🏗️ Basic proyecto equipo relationship
            proyectoEquipoCotizado: {
              select: {
                id: true,
                nombre: true
              }
            },
            // 📋 Basic proyecto equipo item relationship
            proyectoEquipoItem: {
              include: {
                proyectoEquipoCotizado: {
                  select: {
                    id: true,
                    nombre: true
                  }
                }
              }
            },
            // 📦 Catálogo de equipo con categoría (para exportación Excel)
            catalogoEquipo: {
              select: {
                id: true,
                codigo: true,
                descripcion: true,
                marca: true,
                categoriaEquipo: {
                  select: {
                    id: true,
                    nombre: true
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
    const rawItems = lista.listaEquipoItem || []
    const itemsEnriquecidos = rawItems.map((item: any) => {
      // 💰 Calculate best prices and totals
      const cotizaciones = item.cotizacionProveedorItems || []
      const mejorCotizacion = cotizaciones.length > 0
        ? cotizaciones[0] // Already ordered by price ASC
        : null

      const precioUnitarioFinal = mejorCotizacion?.precioUnitario
        || item.precioElegido
        || item.presupuesto
        || 0

      const subtotal = precioUnitarioFinal * (item.cantidad || 0)

      // 📦 Calculate pedidos statistics
      const pedidos = item.pedidoEquipoItem || []
      const cantidadPedida = pedidos.reduce((total: number, pedidoItem: any) => {
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
        // 🔄 Frontend compatibility mapping
        responsable: item.user,
        cotizaciones: cotizaciones.map((cot: any) => ({
          ...cot,
          cotizacion: cot.cotizacionProveedor
        })),
        pedidos: pedidos.map((ped: any) => ({
          ...ped,
          pedido: ped.pedidoEquipo
        })),
        proyectoEquipo: item.proyectoEquipoCotizado,
        // 💰 Calculated fields
        precioUnitarioFinal,
        subtotal,
        cantidadPedida,
        cantidadPendiente,
        progresoPedidos,
        ahorro,
        // 🎯 Status indicators
        tieneCotizaciones: cotizaciones.length > 0,
        tienePedidos: pedidos.length > 0,
        estaCompletamentePedido: cantidadPendiente <= 0,
        necesitaCotizacion: cotizaciones.length === 0 && !item.precioElegido
      }
    })

    // 📊 Calculate lista-level statistics
    const estadisticas = {
      totalItems: rawItems.length,
      itemsConCotizacion: itemsEnriquecidos.filter((item: any) => item.tieneCotizaciones).length,
      itemsConPedidos: itemsEnriquecidos.filter((item: any) => item.tienePedidos).length,
      itemsCompletos: itemsEnriquecidos.filter((item: any) => item.estaCompletamentePedido).length,

      // 💰 Financial totals
      montoPresupuestado: itemsEnriquecidos.reduce((total: number, item: any) =>
        total + ((item.presupuesto || 0) * (item.cantidad || 0)), 0),
      montoEstimado: itemsEnriquecidos.reduce((total: number, item: any) =>
        total + item.subtotal, 0),
      ahorroTotal: itemsEnriquecidos.reduce((total: number, item: any) =>
        total + item.ahorro, 0),

      // 📈 Progress percentages
      progresoCotizacion: rawItems.length > 0
        ? Math.round((itemsEnriquecidos.filter((item: any) => item.tieneCotizaciones).length / rawItems.length) * 100)
        : 0,
      progresoPedidos: rawItems.length > 0
        ? Math.round((itemsEnriquecidos.filter((item: any) => item.tienePedidos).length / rawItems.length) * 100)
        : 0,
      progresoCompletado: rawItems.length > 0
        ? Math.round((itemsEnriquecidos.filter((item: any) => item.estaCompletamentePedido).length / rawItems.length) * 100)
        : 0
    }

    // 🎯 Return enriched lista with complete data
    const listaCompleta = {
      ...lista,
      listaEquipoItem: itemsEnriquecidos,
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