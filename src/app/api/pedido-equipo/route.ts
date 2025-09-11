// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: src/app/api/pedido-equipo/
// 🔧 Descripción: API para crear y listar pedidos de equipo por proyecto con código secuencial
// 🧠 Uso: Proyectos genera pedidos; logística visualiza y gestiona
// ✍️ Autor: Jesús Artemio + IA GYS
// 📅 Última actualización: 2025-07-17
// ===================================================

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import type { PedidoEquipoPayload } from '@/types'

// ✅ Obtener todos los pedidos con filtros avanzados
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const proyectoId = searchParams.get('proyectoId')
    const estado = searchParams.get('estado')
    const responsableId = searchParams.get('responsableId')
    const fechaDesde = searchParams.get('fechaDesde')
    const fechaHasta = searchParams.get('fechaHasta')
    const searchText = searchParams.get('searchText')
    const fechaOCDesde = searchParams.get('fechaOCDesde')
    const fechaOCHasta = searchParams.get('fechaOCHasta')
    const soloVencidas = searchParams.get('soloVencidas') === 'true'

    // Build where clause dynamically
    const whereClause: any = {}
    
    if (proyectoId) {
      whereClause.proyectoId = proyectoId
    }
    
    if (estado) {
      whereClause.estado = estado
    }
    
    if (responsableId) {
      whereClause.responsableId = responsableId
    }
    
    if (fechaDesde || fechaHasta) {
      whereClause.fechaPedido = {}
      if (fechaDesde) {
        whereClause.fechaPedido.gte = new Date(fechaDesde)
      }
      if (fechaHasta) {
        whereClause.fechaPedido.lte = new Date(fechaHasta + 'T23:59:59.999Z')
      }
    }
    
    if (searchText) {
      whereClause.OR = [
        { codigo: { contains: searchText, mode: 'insensitive' } },
        { observacion: { contains: searchText, mode: 'insensitive' } },
        { lista: { nombre: { contains: searchText, mode: 'insensitive' } } },
        { responsable: { name: { contains: searchText, mode: 'insensitive' } } },
      ]
    }

    // Filtros por fecha OC recomendada
    if (fechaOCDesde || fechaOCHasta || soloVencidas) {
      whereClause.items = {
        some: {
          fechaOrdenCompraRecomendada: {
            ...(fechaOCDesde && { gte: new Date(fechaOCDesde) }),
            ...(fechaOCHasta && { lte: new Date(fechaOCHasta + 'T23:59:59.999Z') }),
            ...(soloVencidas && { lt: new Date() })
          }
        }
      }
    }

    const data = await prisma.pedidoEquipo.findMany({
      where: whereClause,
      select: {
        id: true,
        codigo: true,
        numeroSecuencia: true,
        estado: true,
        observacion: true,
        fechaPedido: true,
        fechaNecesaria: true,
        fechaEntregaEstimada: true,
        fechaEntregaReal: true,
        proyectoId: true,
        responsableId: true,
        listaId: true,
        createdAt: true,
        updatedAt: true,
        responsable: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        proyecto: {
          select: {
            id: true,
            codigo: true,
            nombre: true,
          },
        },
        lista: {
          select: {
            id: true,
            nombre: true,
            items: {
              select: {
                id: true,
                cantidadPedida: true,
                codigo: true,
                descripcion: true,
                unidad: true,
                precioElegido: true,
                tiempoEntrega: true,
                tiempoEntregaDias: true,
              },
            },
          },
        },
        items: {
           select: {
             id: true,
             cantidadPedida: true,
             cantidadAtendida: true,
             precioUnitario: true,
             costoTotal: true,
             estado: true,
             codigo: true,
             descripcion: true,
             unidad: true,
             fechaEntregaEstimada: true,
             fechaEntregaReal: true,
             estadoEntrega: true,
             observacionesEntrega: true,
             listaEquipoItem: {
               select: {
                 id: true,
                 codigo: true,
                 descripcion: true,
                 unidad: true,
                 precioElegido: true,
                 proveedor: {
                  select: {
                    id: true,
                    nombre: true,
                    ruc: true,
                  },
                },
               },
             },
           },
         },
      },
      orderBy: { fechaPedido: 'desc' },
    })

    return NextResponse.json(data)
  } catch (error) {
    console.error('❌ Error en GET /api/pedido-equipo:', error)
    return NextResponse.json(
      { error: 'Error al obtener pedidos: ' + String(error) },
      { status: 500 }
    )
  }
}

// ✅ Crear nuevo pedido
export async function POST(request: Request) {
  try {
    const body: PedidoEquipoPayload = await request.json()

    // 🎯 Validaciones mínimas
    if (!body.proyectoId || !body.responsableId || !body.fechaNecesaria) {
      return NextResponse.json(
        { error: 'Campos requeridos faltantes (proyectoId, responsableId, fechaNecesaria)' },
        { status: 400 }
      )
    }

    // 🔎 Validar existencia de proyecto
    const proyecto = await prisma.proyecto.findUnique({
      where: { id: body.proyectoId },
    })
    if (!proyecto) {
      return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })
    }

    // 🔎 Validar existencia de responsable
    const responsable = await prisma.user.findUnique({
      where: { id: body.responsableId },
    })
    if (!responsable) {
      return NextResponse.json({ error: 'Responsable no encontrado' }, { status: 404 })
    }

    // 🔎 Validar lista técnica si se envía
    if (body.listaId) {
      const lista = await prisma.listaEquipo.findUnique({
        where: { id: body.listaId },
      })
      if (!lista) {
        return NextResponse.json({ error: 'Lista de equipo no encontrada' }, { status: 404 })
      }
    }

    // 🔢 Generar código secuencial
    const ultimoPedido = await prisma.pedidoEquipo.findFirst({
      where: { proyectoId: body.proyectoId },
      orderBy: { numeroSecuencia: 'desc' },
    })
    const nuevoNumero = ultimoPedido ? ultimoPedido.numeroSecuencia + 1 : 1
    const codigoGenerado = `${proyecto.codigo}-PED-${String(nuevoNumero).padStart(3, '0')}`

    // 📝 Crear pedido
    const pedido = await prisma.pedidoEquipo.create({
      data: {
        proyectoId: body.proyectoId,
        responsableId: body.responsableId,
        listaId: body.listaId ?? null,
        codigo: codigoGenerado,
        numeroSecuencia: nuevoNumero,
        estado: body.estado ?? 'borrador',
        observacion: body.observacion ?? '',
        fechaPedido: body.fechaPedido ? new Date(body.fechaPedido) : new Date(),
        fechaNecesaria: new Date(body.fechaNecesaria),
        fechaEntregaEstimada: body.fechaEntregaEstimada ? new Date(body.fechaEntregaEstimada) : null,
        fechaEntregaReal: body.fechaEntregaReal ? new Date(body.fechaEntregaReal) : null,
      },
    })

    console.log('✅ Pedido creado:', pedido)
    return NextResponse.json(pedido)
  } catch (error) {
    console.error('❌ Error al crear pedido:', error)
    return NextResponse.json(
      { error: 'Error al crear pedido: ' + String(error) },
      { status: 500 }
    )
  }
}
