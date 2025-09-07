/**
 * 🎯 API de Conversión Lista → Pedido
 * Procesa la conversión de una lista técnica a pedido real
 * Implementa validaciones y trazabilidad completa
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// ✅ Types
interface ItemConversion {
  itemId: string
  cantidadAConvertir: number
}

interface ConversionRequest {
  listaId: string
  items: ItemConversion[]
  fechaNecesaria: string
  prioridad?: 'baja' | 'media' | 'alta' | 'critica'
  esUrgente?: boolean
  observaciones?: string
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

    const body: ConversionRequest = await request.json()
    const { 
      listaId, 
      items, 
      fechaNecesaria,
      prioridad = 'media',
      esUrgente = false,
      observaciones
    } = body

    // 🔍 Validaciones básicas
    if (!listaId || !items || items.length === 0) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: listaId, items' },
        { status: 400 }
      )
    }

    if (!fechaNecesaria) {
      return NextResponse.json(
        { error: 'Fecha necesaria es requerida' },
        { status: 400 }
      )
    }

    // Validar fecha necesaria no sea en el pasado
    const fechaNecesariaDate = new Date(fechaNecesaria)
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    
    if (fechaNecesariaDate < hoy) {
      return NextResponse.json(
        { error: 'La fecha necesaria no puede ser en el pasado' },
        { status: 400 }
      )
    }

    // 📝 Procesar conversión en transacción
    const resultado = await prisma.$transaction(async (tx) => {
      // 1. Verificar que la lista existe y está en estado válido
      const lista = await tx.listaEquipo.findUnique({
        where: { id: listaId },
        include: {
          items: {
            include: {
              proyectoEquipoItem: {
                include: {
                  catalogoEquipo: {
                    select: {
                      id: true,
                      codigo: true,
                      descripcion: true, // ✅ Corregido: usar 'descripcion' en lugar de 'nombre'
                      precioVenta: true
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
                          id: true,
                          nombre: true
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          proyecto: {
            select: {
              id: true,
              codigo: true,
              nombre: true
            }
          },
          responsable: {
            select: {
              id: true,
              name: true // ✅ Corregido: usar 'name' en lugar de 'nombre' para User
            }
          }
        }
      })

      if (!lista) {
        throw new Error('Lista no encontrada')
      }

      if (!['aprobada', 'parcial'].includes(lista.estado)) {
        throw new Error('La lista debe estar aprobada para poder convertirse a pedido')
      }

      // 2. Validar items y cantidades
      const erroresValidacion: string[] = []
      const itemsValidos: Array<{
        listaItem: any
        cantidadAConvertir: number
        costoUnitario: number
        costoTotal: number
      }> = []

      for (const itemConversion of items) {
        const listaItem = lista.items.find(item => item.id === itemConversion.itemId)
        
        if (!listaItem) {
          erroresValidacion.push(`Item ${itemConversion.itemId} no encontrado en la lista`)
          continue
        }

        const cantidadDisponible = listaItem.cantidad - (listaItem.cantidadPedida ?? 0) // ✅ Manejar cantidadPedida null como 0
        
        // ✅ Verificar que catalogoEquipo no sea null
        if (!listaItem.proyectoEquipoItem?.catalogoEquipo) {
          erroresValidacion.push(`Item ${itemConversion.itemId}: No tiene catálogo de equipo asociado`)
          continue
        }

        if (cantidadDisponible <= 0) {
          erroresValidacion.push(
            `Item ${listaItem.proyectoEquipoItem?.catalogoEquipo?.codigo}: Ya fue completamente convertido`
          )
          continue
        }

        if (itemConversion.cantidadAConvertir <= 0) {
          erroresValidacion.push(
            `Item ${listaItem.proyectoEquipoItem?.catalogoEquipo?.codigo}: Cantidad a convertir debe ser mayor a 0`
          )
          continue
        }

        if (itemConversion.cantidadAConvertir > cantidadDisponible) {
          erroresValidacion.push(
            `Item ${listaItem.proyectoEquipoItem?.catalogoEquipo?.codigo}: Cantidad a convertir (${itemConversion.cantidadAConvertir}) excede la disponible (${cantidadDisponible})`
          )
          continue
        }

        // ✅ Calcular costos directamente usando las propiedades disponibles
        // Priority: costoElegido > cotizacionSeleccionada.precioUnitario * cantidad > 0
        let costoItemTotal = 0
        if (listaItem.costoElegido !== null && listaItem.costoElegido !== undefined) {
          costoItemTotal = listaItem.costoElegido
        } else if (listaItem.cotizacionSeleccionada?.precioUnitario && listaItem.cantidad) {
          costoItemTotal = listaItem.cotizacionSeleccionada.precioUnitario * listaItem.cantidad
        }
        
        const costoUnitario = listaItem.cantidad > 0 ? costoItemTotal / listaItem.cantidad : 0
        const costoTotal = costoUnitario * itemConversion.cantidadAConvertir

        itemsValidos.push({
          listaItem,
          cantidadAConvertir: itemConversion.cantidadAConvertir,
          costoUnitario,
          costoTotal
        })
      }

      if (erroresValidacion.length > 0) {
        throw new Error(`Errores de validación:\n${erroresValidacion.join('\n')}`)
      }

      if (itemsValidos.length === 0) {
        throw new Error('No hay items válidos para convertir')
      }

      // 3. Generar código único para el pedido
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

      // 4. Calcular presupuesto total
      const presupuestoTotal = itemsValidos.reduce((sum, item) => sum + item.costoTotal, 0)

      // 5. Crear el pedido
      const pedido = await tx.pedidoEquipo.create({
        data: {
          codigo: codigoPedido,
          numeroSecuencia: numeroSecuencial, // ✅ Campo requerido agregado
          proyectoId: lista.proyectoId,
          listaId: lista.id,
          responsableId: session.user.id,
          estado: 'borrador',
          prioridad,
          esUrgente,
          fechaPedido: new Date(),
          fechaNecesaria: fechaNecesariaDate,
          presupuestoTotal,
          observacion: observaciones || `Convertido desde lista ${lista.codigo}`, // ✅ Corregido: usar 'observacion' según schema Prisma
          items: {
            create: itemsValidos.map(item => ({
              listaId: lista.id,
              listaEquipoItemId: item.listaItem.id,
              responsableId: session.user.id, // ✅ Campo requerido agregado
              codigo: item.listaItem.proyectoEquipoItem?.catalogoEquipo?.codigo || 'SIN-CODIGO', // ✅ Manejar catalogoEquipo null
          descripcion: item.listaItem.proyectoEquipoItem?.catalogoEquipo?.descripcion || 'Sin descripción', // ✅ Manejar catalogoEquipo null
              unidad: item.listaItem.unidad, // ✅ Corregido: usar 'unidad' del ListaEquipoItem
              cantidadPedida: item.cantidadAConvertir,
              cantidadAtendida: 0,
              precioUnitario: item.costoUnitario,
              costoTotal: item.costoTotal,
              tiempoEntrega: item.listaItem.cotizacionSeleccionada?.tiempoEntrega || 15,
              proveedor: item.listaItem.cotizacionSeleccionada?.cotizacion?.proveedor?.nombre || 'Por definir', // ✅ Corregido: acceder al proveedor anidado
              estado: 'pendiente'
            }))
          }
        },
        include: {
          items: true,
          proyecto: {
            select: {
              id: true,
              codigo: true,
              nombre: true
            }
          },
          lista: {
            select: {
              id: true,
              codigo: true,
              nombre: true
            }
          },
          responsable: {
            select: {
              id: true,
              name: true // ✅ Corregido: usar 'name' según schema Prisma User
            }
          }
        }
      })

      // 6. Actualizar cantidades pedidas en los items de la lista
      for (const item of itemsValidos) {
        await tx.listaEquipoItem.update({
          where: { id: item.listaItem.id },
          data: {
            cantidadPedida: item.listaItem.cantidadPedida + item.cantidadAConvertir
          }
        })
      }

      // 7. Actualizar estado de la lista si es necesario
      const todosLosItems = await tx.listaEquipoItem.findMany({
        where: { listaId: lista.id }
      })

      const itemsPendientes = todosLosItems.filter(item => 
        (item.cantidadPedida ?? 0) < item.cantidad // ✅ Manejar cantidadPedida null
      )

      // ✅ Usar valores válidos del enum EstadoListaEquipo
      // Si todos los items fueron convertidos → aprobado, si quedan pendientes → por_revisar
      const nuevoEstadoLista = itemsPendientes.length === 0 ? 'aprobado' : 'por_revisar'
      
      await tx.listaEquipo.update({
        where: { id: lista.id },
        data: { 
          estado: nuevoEstadoLista,
          updatedAt: new Date()
        }
      })

      // ✅ Log de auditoría removido - modelo LogAuditoria no existe en schema
      // TODO: Implementar sistema de auditoría si es necesario
      console.log(`Pedido creado: ${pedido.codigo} desde lista: ${lista.codigo}`)

      return {
        pedido,
        resumen: {
          itemsConvertidos: itemsValidos.length,
          montoTotal: presupuestoTotal,
          estadoListaAnterior: lista.estado,
          estadoListaNuevo: nuevoEstadoLista
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Lista convertida a pedido exitosamente',
      data: resultado
    })

  } catch (error) {
    console.error('❌ Error en conversión lista → pedido:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor'
    const statusCode = errorMessage.includes('no encontrada') || 
                      errorMessage.includes('debe estar aprobada') ||
                      errorMessage.includes('Errores de validación') ? 400 : 500

    return NextResponse.json(
      { 
        success: false,
        error: errorMessage 
      },
      { status: statusCode }
    )
  }
}