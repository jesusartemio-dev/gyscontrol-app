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
        User_Proyecto_comercialIdToUser: true,
        User_Proyecto_gestorIdToUser: true,
        proyectoEquipoCotizado: true, // ✅ Para contar equipos cotizados
        proyectoServicioCotizado: true, // ✅ Para contar servicios
        proyectoGastoCotizado: true, // ✅ Para contar gastos
        listaEquipo: true, // ✅ Para mostrar listas y contar items
        pedidoEquipo: true // ✅ Para contar pedidos
      },
    })

    if (!proyecto) {
      return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })
    }

    // Map relation names for frontend compatibility
    const proyectoFormatted = {
      ...proyecto,
      comercial: proyecto.User_Proyecto_comercialIdToUser,
      gestor: proyecto.User_Proyecto_gestorIdToUser
    }

    return NextResponse.json(proyectoFormatted)
  } catch (error) {
    console.error('❌ Error al obtener proyecto:', error)
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

// ✅ Eliminar proyecto
export async function DELETE(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params

    // ✅ Verificar que el proyecto existe
    const proyecto = await prisma.proyecto.findUnique({
      where: { id },
      include: {
        listaEquipo: { select: { id: true, estado: true } },
        pedidoEquipo: { select: { id: true, estado: true } },
        proyectoEquipoCotizado: { select: { id: true } },
        proyectoServicioCotizado: { select: { id: true } },
        proyectoGastoCotizado: { select: { id: true } },
        registroHoras: { select: { id: true } },
        valorizacion: { select: { id: true } },
        proyectoEdt: { select: { id: true } },
        proyectoFase: { select: { id: true } },
        crmHistorialProyecto: { select: { id: true } },
        cotizacionProveedor: { select: { id: true } }
      }
    })

    if (!proyecto) {
      return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })
    }

    // ✅ Verificar si el proyecto puede ser eliminado
    // Proyectos en ejecución o completados no pueden ser eliminados
    if (proyecto.estado === 'en_ejecucion' || proyecto.estado === 'completado') {
      return NextResponse.json({
        error: 'No se puede eliminar un proyecto en ejecución o completado. Cambie el estado primero.'
      }, { status: 400 })
    }

    // ✅ Verificar si tiene pedidos activos
    if (proyecto.pedidoEquipo.some((p: any) => p.estado !== 'cancelado')) {
      return NextResponse.json({
        error: 'No se puede eliminar un proyecto con pedidos activos. Cancele los pedidos primero.'
      }, { status: 400 })
    }

    // ✅ Verificar si tiene listas de equipo aprobadas
    if (proyecto.listaEquipo.some((l: any) => l.estado === 'aprobada')) {
      return NextResponse.json({
        error: 'No se puede eliminar un proyecto con listas de equipo aprobadas.'
      }, { status: 400 })
    }

    // ✅ Eliminar manualmente las relaciones que podrían causar problemas
    // Primero eliminar registros relacionados que no tienen CASCADE automático

    // Eliminar historial de proyectos
    await prisma.crmHistorialProyecto.deleteMany({
      where: { proyectoId: id }
    })

    // Eliminar valorizaciones
    await prisma.valorizacion.deleteMany({
      where: { proyectoId: id }
    })

    // Eliminar registros de horas
    await prisma.registroHoras.deleteMany({
      where: { proyectoId: id }
    })

    // Eliminar fases del proyecto
    await prisma.proyectoFase.deleteMany({
      where: { proyectoId: id }
    })

    // Eliminar EDTs del proyecto
    await prisma.proyectoEdt.deleteMany({
      where: { proyectoId: id }
    })

    // Eliminar listas de equipo (esto debería eliminar pedidos y items en cascada)
    const listas = await prisma.listaEquipo.findMany({
      where: { proyectoId: id },
      select: { id: true }
    })

    for (const lista of listas) {
      // Eliminar pedidos de esta lista
      const pedidos = await prisma.pedidoEquipo.findMany({
        where: { listaId: lista.id },
        select: { id: true }
      })

      for (const pedido of pedidos) {
        await prisma.pedidoEquipoItem.deleteMany({
          where: { pedidoId: pedido.id }
        })
        await prisma.pedidoEquipo.delete({
          where: { id: pedido.id }
        })
      }

      // Eliminar items de lista de equipo
      await prisma.listaEquipoItem.deleteMany({
        where: { listaId: lista.id }
      })

      // Eliminar cotizaciones proveedor
      await prisma.cotizacionProveedorItem.deleteMany({
        where: { listaId: lista.id }
      })

      await prisma.cotizacionProveedor.deleteMany({
        where: { proyectoId: id }
      })

      // Finalmente eliminar la lista
      await prisma.listaEquipo.delete({
        where: { id: lista.id }
      })
    }

    // Eliminar equipos del proyecto
    const equipos = await prisma.proyectoEquipoCotizado.findMany({
      where: { proyectoId: id },
      select: { id: true }
    })

    for (const equipo of equipos) {
      await prisma.proyectoEquipoCotizadoItem.deleteMany({
        where: { proyectoEquipoId: equipo.id }
      })
      await prisma.proyectoEquipoCotizado.delete({
        where: { id: equipo.id }
      })
    }

    // Eliminar servicios del proyecto
    const servicios = await prisma.proyectoServicioCotizado.findMany({
      where: { proyectoId: id },
      select: { id: true }
    })

    for (const servicio of servicios) {
      await prisma.proyectoServicioCotizadoItem.deleteMany({
        where: { proyectoServicioId: servicio.id }
      })
      await prisma.proyectoServicioCotizado.delete({
        where: { id: servicio.id }
      })
    }

    // Eliminar gastos del proyecto
    const gastos = await prisma.proyectoGastoCotizado.findMany({
      where: { proyectoId: id },
      select: { id: true }
    })

    for (const gasto of gastos) {
      await prisma.proyectoGastoCotizadoItem.deleteMany({
        where: { gastoId: gasto.id }
      })
      await prisma.proyectoGastoCotizado.delete({
        where: { id: gasto.id }
      })
    }

    // Finalmente eliminar el proyecto
    await prisma.proyecto.delete({ where: { id } })

    return NextResponse.json({ status: 'ok', message: 'Proyecto eliminado correctamente' })
  } catch (error: any) {
    console.error('❌ Error al eliminar proyecto:', error)

    // ✅ Manejar errores específicos de Prisma
    if (error?.code === 'P2003') {
      return NextResponse.json({
        error: 'No se puede eliminar el proyecto porque tiene datos relacionados que lo impiden.'
      }, { status: 400 })
    }

    return NextResponse.json({ error: 'Error interno al eliminar proyecto' }, { status: 500 })
  }
}
