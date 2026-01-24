// ✅ API para Lista Individual - Aprovisionamiento Financiero
// 📡 Next.js 14 App Router - CRUD completo para lista específica
// 🎯 Operaciones GET, PUT, DELETE con validaciones y cálculos

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import logger from '@/lib/logger'
import { z } from 'zod'

// 🔁 Schema para actualización de lista
const ActualizarListaSchema = z.object({
  nombre: z.string().min(1).optional(),
  fechaNecesaria: z.string().datetime().optional(),
  estado: z.enum(['borrador', 'por_revisar', 'por_cotizar', 'por_validar', 'por_aprobar', 'aprobada', 'rechazada']).optional()
})

// 🔁 Función para recalcular datos de Gantt
function calcularDatosGantt(lista: any) {
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

// 🔁 Función para validar coherencia
function validarCoherencia(lista: any) {
  const pedidos = lista.pedidos || []
  const items = lista.items || []
  
  const validaciones = {
    tieneItems: items.length > 0,
    fechaValida: new Date(lista.fechaNecesaria) > new Date(),
    preciosCompletos: items.every((item: any) => item.precioElegido > 0),
    tiemposCompletos: items.every((item: any) => item.tiempoEntregaDias > 0),
    pedidosCoherentes: true // Se calculará más adelante
  }
  
  // 📡 Validar coherencia con pedidos
  if (pedidos.length > 0) {
    const montoLista = items.reduce((total: number, item: any) => {
      return total + (item.cantidad * (item.precioElegido || 0))
    }, 0)
    
    const montoPedidos = pedidos.reduce((total: number, pedido: any) => {
      return total + (pedido.items?.reduce((subtotal: number, item: any) => {
        return subtotal + (item.cantidadPedida * item.precioUnitario)
      }, 0) || 0)
    }, 0)
    
    validaciones.pedidosCoherentes = Math.abs(montoPedidos - montoLista) <= (montoLista * 0.05)
  }
  
  const esValida = Object.values(validaciones).every(Boolean)
  
  return {
    esValida,
    validaciones,
    errores: {
      sinItems: !validaciones.tieneItems ? 'La lista no tiene items' : null,
      fechaInvalida: !validaciones.fechaValida ? 'La fecha necesaria debe ser futura' : null,
      preciosIncompletos: !validaciones.preciosCompletos ? 'Algunos items no tienen precio elegido' : null,
      tiemposIncompletos: !validaciones.tiemposCompletos ? 'Algunos items no tienen tiempo de entrega' : null,
      pedidosIncoherentes: !validaciones.pedidosCoherentes ? 'Los pedidos no coinciden con la lista' : null
    }
  }
}

// ✅ GET - Obtener lista específica
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    // 📡 Obtener lista con todas las relaciones
    const lista = await prisma.listaEquipo.findUnique({
      where: { id },
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
        listaEquipoItem: {
          select: {
            id: true,
            codigo: true,
            descripcion: true,
            unidad: true,
            cantidad: true,
            precioElegido: true,
            tiempoEntregaDias: true,
            estado: true,
            verificado: true,
            comentarioRevision: true,
            presupuesto: true,
            costoElegido: true,
            cantidadPedida: true,
            cantidadEntregada: true,
            cotizacionProveedorItems: true
          }
        },
        pedidoEquipo: {
          include: {
            pedidoEquipoItem: {
              select: {
                cantidadPedida: true,
                precioUnitario: true,
                listaEquipoItemId: true,
                codigo: true,
                descripcion: true,
                unidad: true
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

    // 📡 Calcular datos adicionales
    const datosGantt = calcularDatosGantt(lista)
    const validacion = validarCoherencia(lista)

    // 📡 Estadísticas detalladas
    const estadisticas = {
      totalItems: lista.listaEquipoItem.length,
      itemsConPrecio: lista.listaEquipoItem.filter(item => item.precioElegido && item.precioElegido > 0).length,
      itemsConCotizaciones: lista.listaEquipoItem.filter(item => item.cotizacionProveedorItems && item.cotizacionProveedorItems.length > 0).length,
      totalPedidos: lista.pedidoEquipo.length,
      montoTotal: datosGantt.montoProyectado,
      montoEjecutado: lista.pedidoEquipo.reduce((total, pedido) => {
        return total + (pedido.pedidoEquipoItem?.reduce((subtotal, item) => {
          return subtotal + (item.cantidadPedida * (item.precioUnitario || 0))
        }, 0) || 0)
      }, 0)
    }

    const resultado = {
      ...lista,
      gantt: datosGantt,
      validacion,
      estadisticas
    }

    logger.info('Lista individual obtenida', {
      userId: session.user.id,
      listaId: id,
      estado: lista.estado
    })

    return NextResponse.json({
      success: true,
      data: resultado
    })

  } catch (error) {
    logger.error('Error al obtener lista individual', {
      error: error instanceof Error ? error.message : 'Error desconocido',
      listaId: id
    })

    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// ✅ PUT - Actualizar lista
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const body = await request.json()
    
    // 📡 Validar datos de entrada
    const datosValidados = ActualizarListaSchema.parse(body)

    // 📡 Verificar que la lista existe
    const listaExistente = await prisma.listaEquipo.findUnique({
      where: { id },
      select: { id: true, estado: true }
    })

    if (!listaExistente) {
      return NextResponse.json(
        { error: 'Lista no encontrada' },
        { status: 404 }
      )
    }

    // 📡 Validar permisos de edición según estado
    const estadosEditables = ['borrador', 'por_revisar', 'rechazado']
    if (!estadosEditables.includes(listaExistente.estado)) {
      return NextResponse.json(
        { error: 'No se puede editar una lista en estado ' + listaExistente.estado },
        { status: 403 }
      )
    }

    // 📡 Actualizar lista
    const listaActualizada = await prisma.listaEquipo.update({
      where: { id },
      data: {
        ...datosValidados,
        updatedAt: new Date()
      },
      include: {
        proyecto: {
          select: {
            id: true,
            nombre: true,
            codigo: true
          }
        },
        listaEquipoItem: {
          select: {
            id: true,
            cantidad: true,
            precioElegido: true,
            tiempoEntregaDias: true
          }
        }
      }
    })

    // 📡 Recalcular datos
    const datosGantt = calcularDatosGantt(listaActualizada)
    const validacion = validarCoherencia(listaActualizada)

    logger.info('Lista actualizada', {
      userId: session.user.id,
      listaId: id,
      cambios: Object.keys(datosValidados)
    })

    return NextResponse.json({
      success: true,
      data: {
        ...listaActualizada,
        gantt: datosGantt,
        validacion
      },
      message: 'Lista actualizada correctamente'
    })

  } catch (error) {
    logger.error('Error al actualizar lista', {
      error: error instanceof Error ? error.message : 'Error desconocido',
      listaId: id
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

// ✅ DELETE - Eliminar lista (solo si está en borrador)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    // 📡 Verificar que la lista existe y está en borrador
    const lista = await prisma.listaEquipo.findUnique({
      where: { id },
      select: { 
        id: true, 
        estado: true, 
        codigo: true,
        pedidoEquipo: { select: { id: true } }
      }
    })

    if (!lista) {
      return NextResponse.json(
        { error: 'Lista no encontrada' },
        { status: 404 }
      )
    }

    // 📡 Solo permitir eliminar si está en borrador y no tiene pedidos
    if (lista.estado !== 'borrador') {
      return NextResponse.json(
        { error: 'Solo se pueden eliminar listas en estado borrador' },
        { status: 403 }
      )
    }

    if (lista.pedidoEquipo.length > 0) {
      return NextResponse.json(
        { error: 'No se puede eliminar una lista que tiene pedidos asociados' },
        { status: 403 }
      )
    }

    // 📡 Eliminar lista (cascade eliminará items y cotizaciones)
    await prisma.listaEquipo.delete({
      where: { id }
    })

    logger.info('Lista eliminada', {
      userId: session.user.id,
      listaId: id,
      codigo: lista.codigo
    })

    return NextResponse.json({
      success: true,
      message: 'Lista eliminada correctamente'
    })

  } catch (error) {
    logger.error('Error al eliminar lista', {
      error: error instanceof Error ? error.message : 'Error desconocido',
      listaId: id
    })

    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}