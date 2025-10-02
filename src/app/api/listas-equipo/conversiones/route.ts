/**
 * 🎯 API de Conversiones Lista → Pedido
 * Gestiona el flujo de conversión de proyecciones técnicas a pedidos reales
 * Implementa trazabilidad completa y control de desviaciones
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
// Removed calcularCostoItem import - using direct calculation logic instead
import { EstadoCotizacionProveedor } from '@/types/modelos'
import { EstadoListaEquipo, EstadoPedidoItem } from '@prisma/client'

// ✅ Types
interface ConversionItem {
  id: string
  codigo: string
  nombre: string
  proyecto: {
    id: string
    nombre: string
    codigo: string
  }
  responsable: {
    id: string
    name: string
  }
  estado: string
  presupuestoEstimado: number
  costoCalculado: number
  desviacion: number
  itemsCount: number
  itemsPendientes: number
  puedeConvertir: boolean
  motivoBloqueo?: string
}

interface ConversionItemDetail {
  id: string
  catalogoEquipo: {
    id: string
    codigo: string
    descripcion: string
    unidad: {
      nombre: string
    }
    precioVenta?: number
  } | null | undefined
  cantidad: number
  cantidadPedida: number
  cantidadPendiente: number
  costoEstimado: number
  costoElegido?: number
  precioElegido?: number
  cotizacionSeleccionada?: {
    id: string
    precioUnitario: number | null
    tiempoEntrega: string | null
    cotizacion: {
      proveedor: {
        nombre: string
      }
    }
  } | null
  seleccionado: boolean
  cantidadAConvertir: number
}

interface MetricasConversion {
  totalListas: number
  listasConvertibles: number
  montoTotal: number
  desviacionPromedio: number
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
    const soloConvertibles = url.searchParams.get('soloConvertibles') === 'true'
    const listaId = url.searchParams.get('listaId') // Para obtener detalles de una lista específica

    // 🔍 Si se solicita detalle de una lista específica
    if (listaId) {
      return await getListaDetalle(listaId)
    }

    // 🔍 Build filters para listas
    const whereClause: any = {
      estado: {
        in: ['aprobada', 'parcial'] // Solo listas que pueden convertirse
      }
    }
    
    if (proyectoId && proyectoId !== 'todos') {
      whereClause.proyectoId = proyectoId
    }
    
    if (estado && estado !== 'todos') {
      whereClause.estado = estado
    }
    
    if (prioridad && prioridad !== 'todos') {
      whereClause.prioridad = prioridad
    }

    // 📊 Fetch listas convertibles
    const listas = await prisma.listaEquipo.findMany({
      where: whereClause,
      select: {
        id: true,
        codigo: true,
        nombre: true,
        estado: true,
        fechaNecesaria: true,
        fechaAprobacionFinal: true,
        createdAt: true,
        proyecto: {
          select: {
            id: true,
            nombre: true,
            codigo: true
          }
        },
        responsable: {
          select: {
            id: true,
            name: true
          }
        },
        items: {
          select: {
            id: true,
            listaId: true,
            proyectoEquipoItemId: true,
            proyectoEquipoId: true,
            reemplazaProyectoEquipoCotizadoItemId: true,
            proveedorId: true,
            cotizacionSeleccionadaId: true,
            comentarioRevision: true,
            codigo: true,
            descripcion: true,
            unidad: true,
            cantidad: true,
            cantidadPedida: true,
            costoElegido: true,
            precioElegido: true,
            presupuesto: true,
            costoPedido: true,
            costoReal: true,
            cantidadEntregada: true,
            estado: true,
            verificado: true,
            tiempoEntrega: true,
            tiempoEntregaDias: true,
            proyectoEquipoItem: {
              select: {
                id: true,
                catalogoEquipoId: true,
                catalogoEquipo: {
                  select: {
                    id: true,
                    codigo: true,
                    descripcion: true,
                    precioVenta: true,
                    unidad: {
                      select: {
                        nombre: true
                      }
                    }
                  }
                }
              }
            },
            cotizacionSeleccionada: {
              select: {
                id: true,
                precioUnitario: true,
                tiempoEntrega: true,
                cotizacion: {
                  select: {
                    proveedor: {
                      select: {
                        nombre: true
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      orderBy: [
          { createdAt: 'desc' }
        ]
    })

    // 🧮 Process conversion data
    const conversiones: ConversionItem[] = listas.map(lista => {
      const costoCalculado = lista.items.reduce((sum, item) => {
        // ✅ Create a compatible item for calcularCostoItem
        const compatibleItem = {
          ...item,
          id: item.id,
          listaId: lista.id,
          codigo: item.proyectoEquipoItem?.catalogoEquipo?.codigo || '',
          descripcion: item.proyectoEquipoItem?.catalogoEquipo?.descripcion || '',
          unidad: item.proyectoEquipoItem?.catalogoEquipo?.unidad?.nombre || '',
          cantidad: item.cantidad,
          estado: 'borrador' as const,
          origen: 'cotizado' as const,
          verificado: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lista: {} as any,
          cotizaciones: [],
          pedidos: [],
          catalogoEquipo: item.proyectoEquipoItem?.catalogoEquipo ? {
            ...item.proyectoEquipoItem.catalogoEquipo,
            categoriaId: '',
            unidadId: '', // No available in this query - only nombre is included
            categoria: {
              id: '',
              nombre: ''
            },
            marca: '',
            precioInterno: 0,
            margen: 0,
            estado: 'activo',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          } : undefined,
          proveedor: undefined, // No available in this query
          cotizacionSeleccionada: item.cotizacionSeleccionada ? {
          id: item.cotizacionSeleccionada.id,
          cotizacionId: '', // Not available in this query
          listaEquipoItemId: item.id,
          listaId: item.listaId,
          codigo: item.codigo,
          descripcion: item.descripcion,
          unidad: item.unidad,
          cantidadOriginal: item.cantidad,
          presupuesto: item.presupuesto,
          precioUnitario: item.cotizacionSeleccionada.precioUnitario,
          cantidad: item.cantidad,
          costoTotal: (item.cotizacionSeleccionada.precioUnitario || 0) * item.cantidad,
          tiempoEntrega: item.cotizacionSeleccionada.tiempoEntrega,
          tiempoEntregaDias: undefined,
          estado: 'seleccionado' as EstadoCotizacionProveedor,
          esSeleccionada: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          cotizacion: {
            id: '', // Not available in this query
            proveedorId: '',
            proyectoId: '',
            codigo: '',
            numeroSecuencia: 0,
            estado: 'seleccionado' as EstadoCotizacionProveedor,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            proveedor: {
              id: '',
              nombre: item.cotizacionSeleccionada.cotizacion.proveedor.nombre,
              ruc: undefined
            },
            proyecto: {} as any,
            items: []
          },
          listaEquipoItem: undefined
        } : undefined,
          proyectoEquipoItemId: item.proyectoEquipoItemId || undefined,
          proyectoEquipoId: item.proyectoEquipoId || undefined,
          reemplazaProyectoEquipoCotizadoItemId: item.reemplazaProyectoEquipoCotizadoItemId || undefined,
          catalogoEquipoId: item.proyectoEquipoItem?.catalogoEquipoId || undefined,
          proveedorId: item.proveedorId || undefined,
          cotizacionSeleccionadaId: item.cotizacionSeleccionadaId || undefined,
          comentarioRevision: item.comentarioRevision || undefined,
          presupuesto: item.presupuesto || undefined,
          precioElegido: item.precioElegido || undefined,
          costoElegido: item.costoElegido || undefined,
          costoPedido: item.costoPedido || undefined,
          costoReal: item.costoReal || undefined,
          cantidadPedida: item.cantidadPedida || undefined,
          cantidadEntregada: item.cantidadEntregada || undefined,
          tiempoEntrega: item.tiempoEntrega || undefined,
          tiempoEntregaDias: item.tiempoEntregaDias || undefined
        }
        // Calculate cost based on selected quote or catalog price
        return sum + (
          compatibleItem.cotizacionSeleccionada?.precioUnitario 
            ? compatibleItem.cotizacionSeleccionada.precioUnitario * compatibleItem.cantidad
            : (compatibleItem.proyectoEquipoItem?.catalogoEquipo?.precioVenta || 0) * compatibleItem.cantidad
        )
      }, 0)
      const presupuestoEstimado = 0 // Campo no disponible en el modelo actual
      const desviacion = presupuestoEstimado > 0 ?
        ((costoCalculado - presupuestoEstimado) / presupuestoEstimado) * 100 : 0
      
      const itemsCount = lista.items.length
      const itemsPendientes = lista.items.filter(item => 
        (item.cantidadPedida ?? 0) < item.cantidad
      ).length
      
      // Determinar si puede convertirse
      let puedeConvertir = true
      let motivoBloqueo = ''
      
      if (itemsPendientes === 0) {
        puedeConvertir = false
        motivoBloqueo = 'Todos los items ya fueron convertidos'
      } else if (lista.estado !== EstadoListaEquipo.aprobada && lista.estado !== EstadoListaEquipo.por_revisar) {
        puedeConvertir = false
        motivoBloqueo = 'Lista debe estar aprobada para convertir'
      } else if (Math.abs(desviacion) > 25) {
        puedeConvertir = false
        motivoBloqueo = 'Desviación presupuestaria muy alta (>25%)'
      }
      
      // Filtrar si solo se quieren convertibles
      if (soloConvertibles && !puedeConvertir) {
        return null
      }

      return {
        id: lista.id,
        codigo: lista.codigo,
        nombre: lista.nombre,
        proyecto: lista.proyecto,
        responsable: lista.responsable,
        estado: lista.estado,
        presupuestoEstimado,
        costoCalculado,
        desviacion,
        itemsCount,
        itemsPendientes,
        puedeConvertir,
        motivoBloqueo
      }
    }).filter(Boolean) as ConversionItem[]

    // 🧮 Calculate metrics
    const metricas: MetricasConversion = {
      totalListas: conversiones.length,
      listasConvertibles: conversiones.filter(c => c.puedeConvertir).length,
      montoTotal: conversiones.reduce((sum, c) => sum + c.costoCalculado, 0),
      desviacionPromedio: conversiones.length > 0 ? 
        conversiones.reduce((sum, c) => sum + Math.abs(c.desviacion), 0) / conversiones.length : 0
    }

    return NextResponse.json({
      conversiones,
      metricas
    })

  } catch (error) {
    console.error('❌ Error en API de conversiones:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// 🔍 Función para obtener detalle de una lista específica
async function getListaDetalle(listaId: string) {
  try {
    const lista = await prisma.listaEquipo.findUnique({
      where: { id: listaId },
      include: {
        proyecto: {
          select: {
            id: true,
            nombre: true,
            codigo: true
          }
        },
        responsable: {
          select: {
            id: true,
            name: true
          }
        },
        items: {
          include: {
            proyectoEquipoItem: {
              include: {
                catalogoEquipo: {
                  select: {
                    id: true,
                    codigo: true,
                    descripcion: true,
                    precioVenta: true,
                    unidad: {
                      select: {
                        nombre: true
                      }
                    }
                  }
                }
              }
            },
            cotizacionSeleccionada: {
              select: {
                id: true,
                precioUnitario: true,
                tiempoEntrega: true,
                cotizacion: {
                  select: {
                    proveedor: {
                      select: {
                        nombre: true
                      }
                    }
                  }
                }
              }
            }
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

    // 🧮 Process items detail
    const itemsDetalle: ConversionItemDetail[] = lista.items.map(item => {
      // ✅ Create a compatible item for calcularCostoItem
      const compatibleItem = {
        ...item,
        id: item.id,
        listaId: lista.id,
        codigo: item.proyectoEquipoItem?.catalogoEquipo?.codigo || '',
        descripcion: item.proyectoEquipoItem?.catalogoEquipo?.descripcion || '',
        unidad: item.proyectoEquipoItem?.catalogoEquipo?.unidad?.nombre || '',
        cantidad: item.cantidad,
        estado: 'borrador' as const,
        origen: 'cotizado' as const,
        verificado: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lista: {} as any,
        cotizaciones: [],
        pedidos: [],
        catalogoEquipo: item.proyectoEquipoItem?.catalogoEquipo ? {
          ...item.proyectoEquipoItem.catalogoEquipo,
          categoriaId: '',
          unidadId: '', // No available in this query - only nombre is included
          categoria: {
            id: '',
            nombre: ''
          },
          unidad: {
            id: '', // Required by CatalogoEquipo type but not available in query
            nombre: item.proyectoEquipoItem?.catalogoEquipo?.unidad?.nombre || ''
          },
          marca: '',
          precioInterno: 0,
          margen: 0,
          estado: 'activo',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        } : undefined,
        proveedor: undefined, // No available in this query
        cotizacionSeleccionada: item.cotizacionSeleccionada || undefined,
        proyectoEquipoItemId: item.proyectoEquipoItemId || undefined,
        proyectoEquipoId: item.proyectoEquipoId || undefined,
        reemplazaProyectoEquipoCotizadoItemId: item.reemplazaProyectoEquipoCotizadoItemId || undefined,
        catalogoEquipoId: item.proyectoEquipoItem?.catalogoEquipoId || undefined,
        proveedorId: item.proveedorId || undefined,
        cotizacionSeleccionadaId: item.cotizacionSeleccionadaId || undefined,
        comentarioRevision: item.comentarioRevision || undefined,
        presupuesto: item.presupuesto || undefined,
        precioElegido: item.precioElegido || undefined,
        costoElegido: item.costoElegido || undefined,
        costoPedido: item.costoPedido || undefined,
        costoReal: item.costoReal || undefined,
        cantidadPedida: item.cantidadPedida || undefined,
        cantidadEntregada: item.cantidadEntregada || undefined,
        tiempoEntrega: item.tiempoEntrega || undefined,
        tiempoEntregaDias: item.tiempoEntregaDias || undefined
      }
      const costoEstimado = compatibleItem.cotizacionSeleccionada?.precioUnitario 
        ? compatibleItem.cotizacionSeleccionada.precioUnitario * compatibleItem.cantidad
        : (compatibleItem.proyectoEquipoItem?.catalogoEquipo?.precioVenta || 0) * compatibleItem.cantidad
      const cantidadPedidaActual = item.cantidadPedida ?? 0 // ✅ Manejar null
      const cantidadPendiente = item.cantidad - cantidadPedidaActual
      
      return {
        id: item.id,
        catalogoEquipo: item.proyectoEquipoItem?.catalogoEquipo,
        cantidad: item.cantidad,
        cantidadPedida: cantidadPedidaActual,
        cantidadPendiente,
        costoEstimado,
        costoElegido: item.costoElegido ?? undefined,
        precioElegido: item.precioElegido ?? undefined,
        cotizacionSeleccionada: item.cotizacionSeleccionada,
        seleccionado: cantidadPendiente > 0, // Por defecto seleccionar items pendientes
        cantidadAConvertir: cantidadPendiente
      }
    })

    return NextResponse.json({
      lista: {
        id: lista.id,
        codigo: lista.codigo,
        nombre: lista.nombre,
        proyecto: lista.proyecto,
        responsable: lista.responsable,
        estado: lista.estado,
        presupuestoEstimado: 0 // Campo no disponible en el modelo actual
      },
      items: itemsDetalle
    })

  } catch (error) {
    console.error('❌ Error obteniendo detalle de lista:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
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
    const { 
      listaId, 
      items, // Array de { itemId, cantidadAConvertir }
      fechaNecesaria,
      prioridad = 'media',
      esUrgente = false,
      observaciones
    } = body

    if (!listaId || !items || items.length === 0) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      )
    }

    // 📝 Usar transacción para garantizar consistencia
    const resultado = await prisma.$transaction(async (tx) => {
      // 1. Obtener la lista
      const lista = await tx.listaEquipo.findUnique({
        where: { id: listaId },
        include: {
          items: {
            include: {
              proyectoEquipoItem: {
                include: {
                  catalogoEquipo: {
                    include: {
                      unidad: {
                        select: {
                          nombre: true
                        }
                      }
                    }
                  }
                }
              },
              cotizacionSeleccionada: {
                include: {
                  cotizacion: {
                    include: {
                      proveedor: {
                        select: {
                          nombre: true
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          proyecto: true
        }
      })

      if (!lista) {
        throw new Error('Lista no encontrada')
      }

      // 2. Generar código único para el pedido
      const ultimoPedido = await tx.pedidoEquipo.findFirst({
        where: {
          codigo: {
            startsWith: `PED-${lista.proyecto.codigo}-`
          }
        },
        orderBy: { codigo: 'desc' }
      })

      let numeroSecuencial = 1
      if (ultimoPedido) {
        const match = ultimoPedido.codigo.match(/-([0-9]+)$/)
        if (match) {
          numeroSecuencial = parseInt(match[1]) + 1
        }
      }

      const codigoPedido = `PED-${lista.proyecto.codigo}-${numeroSecuencial.toString().padStart(3, '0')}`

      // 3. Calcular totales
      let presupuestoTotal = 0
      const itemsParaPedido: {
        listaId: string
        listaEquipoItemId: string
        responsableId: string
        codigo: string
        descripcion: string
        unidad: string
        cantidadPedida: number
        precioUnitario: number
        costoTotal: number
        tiempoEntrega: string
        proveedor: string
        estado: EstadoPedidoItem
      }[] = []

      for (const itemConversion of items) {
        const listaItem = lista.items.find(item => item.id === itemConversion.itemId)
        if (!listaItem || !listaItem.proyectoEquipoItem?.catalogoEquipo) continue

        const cantidadAConvertir = Math.min(
          itemConversion.cantidadAConvertir,
          listaItem.cantidad - (listaItem.cantidadPedida ?? 0)
        )

        if (cantidadAConvertir <= 0) continue

        // ✅ Calculate cost directly without using calcularCostoItem to avoid type issues
        let costoItemTotal = 0
        if (listaItem.costoElegido !== null && listaItem.costoElegido !== undefined) {
          costoItemTotal = listaItem.costoElegido
        } else if (listaItem.cotizacionSeleccionada?.precioUnitario && listaItem.cantidad) {
          costoItemTotal = listaItem.cotizacionSeleccionada.precioUnitario * listaItem.cantidad
        }
        
        const costoUnitario = listaItem.cantidad > 0 ? costoItemTotal / listaItem.cantidad : 0
        const costoTotal = costoUnitario * cantidadAConvertir
        presupuestoTotal += costoTotal

        itemsParaPedido.push({ 
           listaId: lista.id, 
           listaEquipoItemId: listaItem.id, 
           responsableId: session.user.id,
           codigo: listaItem.proyectoEquipoItem?.catalogoEquipo?.codigo || 'SIN-CODIGO',
        descripcion: listaItem.proyectoEquipoItem?.catalogoEquipo?.descripcion || 'Sin descripción',
        unidad: listaItem.proyectoEquipoItem?.catalogoEquipo?.unidad?.nombre || 'und', 
           cantidadPedida: cantidadAConvertir, 
           precioUnitario: costoUnitario, 
           costoTotal, 
           tiempoEntrega: listaItem.cotizacionSeleccionada?.tiempoEntrega || '15 días', 
           proveedor: listaItem.cotizacionSeleccionada?.cotizacion?.proveedor?.nombre || 'Por definir', 
           estado: EstadoPedidoItem.pendiente 
         })

        // 4. Actualizar cantidad pedida en lista item
        await tx.listaEquipoItem.update({
          where: { id: listaItem.id },
          data: {
            cantidadPedida: (listaItem.cantidadPedida ?? 0) + cantidadAConvertir
          }
        })
      }

      if (itemsParaPedido.length === 0) {
        throw new Error('No hay items válidos para convertir')
      }

      // 5. Crear el pedido
      const pedido = await tx.pedidoEquipo.create({
        data: {
          codigo: codigoPedido,
          proyectoId: lista.proyectoId,
          listaId: lista.id,
          responsableId: session.user.id,
          numeroSecuencia: numeroSecuencial,
          estado: 'borrador',
          prioridad,
          esUrgente,
          fechaPedido: new Date(),
          fechaNecesaria: new Date(fechaNecesaria),
          presupuestoTotal,
          observacion: observaciones,
          items: {
            create: itemsParaPedido
          }
        },
        include: {
          items: true,
          proyecto: true,
          lista: true
        }
      })

      // 6. Actualizar estado de la lista si es necesario
      const itemsPendientes = lista.items.filter(item => {
        const itemActualizado = itemsParaPedido.find(ip => ip.listaEquipoItemId === item.id)
        const cantidadPedidaFinal = (item.cantidadPedida ?? 0) + (itemActualizado?.cantidadPedida || 0)
        return cantidadPedidaFinal < item.cantidad
      })

      // ✅ Usar valores válidos del enum EstadoListaEquipo
      const nuevoEstadoLista: EstadoListaEquipo = itemsPendientes.length === 0 ? EstadoListaEquipo.aprobada : EstadoListaEquipo.por_revisar
      
      await tx.listaEquipo.update({
        where: { id: lista.id },
        data: { estado: nuevoEstadoLista }
      })

      return pedido
    })

    return NextResponse.json({
      message: 'Conversión realizada exitosamente',
      pedido: resultado
    })

  } catch (error) {
    console.error('❌ Error en conversión:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
