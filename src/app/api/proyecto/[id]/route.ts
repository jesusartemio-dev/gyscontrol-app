// ===================================================
// 📁 Archivo: [id]/route.ts
// 📌 Ubicación: /api/proyecto/[id]
// 🔧 Descripción: API para manejar GET, PUT y DELETE de proyectos
// ===================================================

import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// ✅ Obtener proyecto por ID
export async function GET(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params

    const proyecto = await prisma.proyecto.findUnique({
      where: { id },
      include: {
        cliente: true,
        comercial: true,
        gestor: true,
        supervisor: true,
        lider: true,
        proyectoEquipoCotizado: {
          include: {
            proyectoEquipoCotizadoItem: true
          }
        },
        proyectoServicioCotizado: {
          include: {
            proyectoServicioCotizadoItem: true,
            edt: true
          }
        },
        proyectoGastoCotizado: {
          include: {
            proyectoGastoCotizadoItem: true
          }
        },
        listaEquipo: {
          include: {
            listaEquipoItem: true
          }
        },
        pedidoEquipo: {
          include: {
            pedidoEquipoItem: true
          }
        }
      },
    })

    if (!proyecto) {
      return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })
    }

    // Traer pedidos de OTROS proyectos que contengan al menos un ítem con override
    // hacia este proyecto (caso: pedido interno de EPPs imputados a este proyecto).
    // Se marcan con `_overrideExterno: true` para que el frontend los trate distinto.
    const pedidosOverrideExternos = await prisma.pedidoEquipo.findMany({
      where: {
        proyectoId: { not: id },
        pedidoEquipoItem: { some: { proyectoId: id } },
      },
      include: {
        pedidoEquipoItem: true,
      },
    })

    // Map relation names for frontend compatibility
    const proyectoFormatted = {
      ...proyecto,
      // Map equipos, servicios, gastos for frontend
      equipos: proyecto.proyectoEquipoCotizado.map((eq: any) => ({
        ...eq,
        items: eq.proyectoEquipoCotizadoItem || []
      })),
      servicios: proyecto.proyectoServicioCotizado.map((sv: any) => ({
        ...sv,
        items: sv.proyectoServicioCotizadoItem || [],
        edt: sv.edt || null
      })),
      gastos: proyecto.proyectoGastoCotizado.map((ga: any) => ({
        ...ga,
        items: ga.proyectoGastoCotizadoItem || []
      })),
      listaEquipos: proyecto.listaEquipo.map((lista: any) => ({
        ...lista,
        items: lista.listaEquipoItem || []
      })),
      pedidos: [
        ...proyecto.pedidoEquipo.map((pedido: any) => ({
          ...pedido,
          items: pedido.pedidoEquipoItem || [],
          _overrideExterno: false,
        })),
        ...pedidosOverrideExternos.map((pedido: any) => ({
          ...pedido,
          items: pedido.pedidoEquipoItem || [],
          _overrideExterno: true,
        })),
      ],
    }

    return NextResponse.json(proyectoFormatted)
  } catch (error: any) {
    console.error('❌ Error al obtener proyecto:', error?.message || error)
    console.error('❌ Error detallado:', JSON.stringify(error, null, 2))
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// ✅ Actualizar proyecto
export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const data = await req.json()

    const actualizado = await prisma.proyecto.update({
      where: { id },
      data,
    })

    return NextResponse.json(actualizado)
  } catch (error) {
    console.error('❌ Error al actualizar proyecto:', error)
    return NextResponse.json({ error: 'Error interno al actualizar proyecto' }, { status: 500 })
  }
}

// ✅ Actualizar parcialmente proyecto (estado, etc.)
export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const data = await req.json()

    // Detectar transición a "cerrado" para crear CxC de fondo de garantía
    if (data.estado === 'cerrado') {
      const proyectoActual = await prisma.proyecto.findUnique({
        where: { id },
        select: { estado: true, clienteId: true, codigo: true, diasGarantia: true, moneda: true, tipoCambio: true },
      })

      if (proyectoActual && proyectoActual.estado !== 'cerrado') {
        // Idempotencia: verificar que no exista ya una CxC de fondo de garantía para este proyecto
        const cxcExistente = await prisma.cuentaPorCobrar.findFirst({
          where: {
            proyectoId: id,
            descripcion: { startsWith: 'Fondo de Garantía' },
          },
        })

        if (!cxcExistente) {
          // Sumar fondoGarantiaMonto de todas las valorizaciones no anuladas
          const agg = await prisma.valorizacion.aggregate({
            where: {
              proyectoId: id,
              estado: { not: 'anulada' },
            },
            _sum: { fondoGarantiaMonto: true },
          })

          const totalFondoGarantia = agg._sum.fondoGarantiaMonto || 0

          if (totalFondoGarantia > 0) {
            const diasGarantia = proyectoActual.diasGarantia ?? 365
            const fechaVencimiento = new Date()
            fechaVencimiento.setDate(fechaVencimiento.getDate() + diasGarantia)

            await prisma.cuentaPorCobrar.create({
              data: {
                proyectoId: id,
                clienteId: proyectoActual.clienteId!,
                descripcion: `Fondo de Garantía — ${proyectoActual.codigo}`,
                monto: totalFondoGarantia,
                saldoPendiente: totalFondoGarantia,
                moneda: proyectoActual.moneda || 'PEN',
                tipoCambio: proyectoActual.tipoCambio || undefined,
                fechaEmision: new Date(),
                fechaVencimiento,
                condicionPago: `${diasGarantia} días post-cierre`,
                diasCredito: diasGarantia,
                observaciones: `Generado automáticamente al cerrar proyecto. Fondo acumulado de ${agg._sum.fondoGarantiaMonto?.toFixed(2)} en valorizaciones.`,
                updatedAt: new Date(),
              },
            })
          }
        }
      }
    }

    const actualizado = await prisma.proyecto.update({
      where: { id },
      data,
    })

    return NextResponse.json(actualizado)
  } catch (error) {
    console.error('❌ Error al actualizar proyecto (PATCH):', error)
    return NextResponse.json({ error: 'Error interno al actualizar proyecto' }, { status: 500 })
  }
}

// ✅ Eliminar proyecto (Soft Delete)
// En lugar de eliminar físicamente, marca el proyecto con deletedAt
// La extension de Prisma filtra automáticamente los proyectos eliminados
export async function DELETE(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params

    // Buscar proyecto usando query raw para evitar problemas con tipos de Prisma
    // mientras se regenera el cliente
    const proyectos = await prisma.$queryRaw<Array<{
      id: string
      estado: string
      nombre: string
      codigo: string
      deletedAt: Date | null
    }>>`SELECT id, estado, nombre, codigo, "deletedAt" FROM proyecto WHERE id = ${id}`

    if (proyectos.length === 0) {
      return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })
    }

    const proyecto = proyectos[0]

    // Verificar si ya fue eliminado
    if (proyecto.deletedAt) {
      return NextResponse.json({ error: 'Este proyecto ya fue eliminado' }, { status: 400 })
    }

    // Proyectos completados no pueden ser eliminados
    if (proyecto.estado === 'completado') {
      return NextResponse.json({
        error: 'No se puede eliminar un proyecto completado. Puede archivarlo en su lugar.'
      }, { status: 400 })
    }

    // Soft delete: marcar con fecha de eliminación usando raw query
    await prisma.$executeRaw`UPDATE proyecto SET "deletedAt" = NOW() WHERE id = ${id}`

    console.log(`🗑️ Proyecto eliminado (soft delete): ${proyecto.codigo} - ${proyecto.nombre}`)

    return NextResponse.json({
      status: 'ok',
      message: 'Proyecto eliminado correctamente',
      proyecto: {
        id: proyecto.id,
        codigo: proyecto.codigo,
        nombre: proyecto.nombre
      }
    })
  } catch (error: any) {
    console.error('❌ Error al eliminar proyecto:', error)
    return NextResponse.json({ error: 'Error interno al eliminar proyecto' }, { status: 500 })
  }
}
