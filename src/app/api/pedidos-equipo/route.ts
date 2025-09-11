// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: src/app/api/pedidos-equipo/route.ts
// 🔧 Descripción: API para gestión de pedidos de equipos
// 🧠 Uso: CRUD de pedidos de equipos conectado a base de datos real
// ✍️ Autor: Senior Fullstack Developer
// 📅 Última actualización: 2025-01-15
// ===================================================

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { EstadoPedido } from '@prisma/client'

// ✅ GET - Obtener todos los pedidos de equipos
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
    const proyectoId = searchParams.get('proyectoId')
    const estadoParam = searchParams.get('estado')
    const responsableId = searchParams.get('responsableId')

    // ✅ Validar que el estado sea un valor válido del enum
    const estadosValidos = Object.values(EstadoPedido)
    const estado = estadoParam && estadosValidos.includes(estadoParam as EstadoPedido) ? estadoParam as EstadoPedido : undefined

    // 📊 Obtener pedidos con relaciones completas
    const pedidos = await prisma.pedidoEquipo.findMany({
      where: {
        ...(proyectoId ? { proyectoId } : {}),
        ...(estado ? { estado } : {}),
        ...(responsableId ? { responsableId } : {}),
      },
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
            name: true,
            email: true
          }
        },
        lista: {
          select: {
            id: true,
            codigo: true,
            nombre: true
          }
        },
        items: {
          include: {
            listaEquipoItem: {
              include: {
                proyectoEquipoItem: {
                  include: {
                    catalogoEquipo: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // 🔄 Transformar datos para la interfaz
    const pedidosTransformados = pedidos.map(pedido => {
      // ✅ Calculate montoTotal from items
      const montoTotal = pedido.items.reduce((total, item) => {
        const precioUnitario = item.precioUnitario || 
          item.listaEquipoItem?.precioElegido || 
          item.listaEquipoItem?.costoElegido || 
          0
        return total + (precioUnitario * (item.cantidadPedida || 0))
      }, 0)

      return {
        id: pedido.id,
        codigo: pedido.codigo,
        proyecto: {
          id: pedido.proyecto.id,
          nombre: pedido.proyecto.nombre,
          codigo: pedido.proyecto.codigo
        },
        responsable: {
          id: pedido.responsable?.id || '',
          name: pedido.responsable?.name || 'Sin asignar'
        },
        lista: pedido.lista ? {
          id: pedido.lista.id,
          codigo: pedido.lista.codigo,
          nombre: pedido.lista.nombre
        } : null,
        estado: pedido.estado,
        prioridad: pedido.prioridad || 'media',
        fechaPedido: pedido.fechaPedido?.toISOString() || pedido.createdAt.toISOString(),
        fechaNecesaria: pedido.fechaNecesaria?.toISOString() || '',
        fechaEntrega: pedido.fechaEntregaEstimada?.toISOString() || '',
        montoTotal: montoTotal,
        itemsCount: pedido.items.length,
        observaciones: pedido.observacion || '',
        createdAt: pedido.createdAt.toISOString(),
        updatedAt: pedido.updatedAt.toISOString()
      }
    })

    return NextResponse.json(pedidosTransformados)

  } catch (error) {
    console.error('❌ Error al obtener pedidos:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// ✅ POST - Crear nuevo pedido de equipo
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
      proyectoId,
      listaId,
      responsableId,
      fechaNecesaria,
      prioridad = 'media',
      observacion
    } = body

    // ✅ Validaciones básicas
    if (!proyectoId) {
      return NextResponse.json(
        { error: 'El proyecto es obligatorio' },
        { status: 400 }
      )
    }

    if (!fechaNecesaria) {
      return NextResponse.json(
        { error: 'La fecha necesaria es obligatoria' },
        { status: 400 }
      )
    }

    // 📝 Generar código único
    const proyecto = await prisma.proyecto.findUnique({
      where: { id: proyectoId },
      select: { codigo: true }
    })

    if (!proyecto) {
      return NextResponse.json(
        { error: 'Proyecto no encontrado' },
        { status: 404 }
      )
    }

    // 🔢 Obtener siguiente número secuencial
    const ultimoPedido = await prisma.pedidoEquipo.findFirst({
      where: {
        codigo: {
          startsWith: `PED-${proyecto.codigo}-`
        }
      },
      orderBy: { codigo: 'desc' }
    })

    let numeroSecuencia = 1
    if (ultimoPedido) {
      const match = ultimoPedido.codigo.match(/-([0-9]+)$/)
      if (match) {
        numeroSecuencia = parseInt(match[1]) + 1
      }
    }

    const codigo = `PED-${proyecto.codigo}-${numeroSecuencia.toString().padStart(3, '0')}`

    // 💾 Crear pedido
    const nuevoPedido = await prisma.pedidoEquipo.create({
      data: {
        codigo,
        numeroSecuencia,
        proyectoId,
        listaId,
        responsableId,
        fechaNecesaria: new Date(fechaNecesaria),
        prioridad,
        observacion,
        estado: 'borrador'
      },
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
        lista: {
          select: {
            id: true,
            codigo: true,
            nombre: true
          }
        }
      }
    })

    return NextResponse.json(nuevoPedido, { status: 201 })

  } catch (error) {
    console.error('❌ Error al crear pedido:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
