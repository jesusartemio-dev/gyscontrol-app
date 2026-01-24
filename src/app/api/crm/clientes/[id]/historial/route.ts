// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: /api/crm/clientes/[id]/historial
// 🔧 Descripción: API para historial de proyectos de un cliente CRM
// ✅ GET: Obtener historial completo de proyectos del cliente
// ===================================================

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

// ✅ Obtener historial de proyectos de un cliente
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(req.url)
    const tipo = searchParams.get('tipo') // 'todos', 'proyectos', 'cotizaciones'

    // Verificar que el cliente existe
    const cliente = await prisma.cliente.findUnique({
      where: { id },
      select: { id: true, nombre: true, codigo: true }
    })

    if (!cliente) {
      return NextResponse.json(
        { error: 'Cliente no encontrado' },
        { status: 404 }
      )
    }

    // Obtener proyectos asociados al cliente
    const proyectos = await prisma.proyecto.findMany({
      where: { clienteId: id },
      select: {
        id: true,
        nombre: true,
        codigo: true,
        estado: true,
        fechaInicio: true,
        fechaFin: true,
        totalCliente: true,
        createdAt: true,
        comercial: {
          select: { name: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Obtener cotizaciones asociadas al cliente
    const cotizaciones = await prisma.cotizacion.findMany({
      where: { clienteId: id },
      select: {
        id: true,
        codigo: true,
        nombre: true,
        estado: true,
        totalCliente: true,
        fechaEnvio: true,
        createdAt: true,
        user: {
          select: { name: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Obtener historial de proyectos desde CrmHistorialProyecto
    const historialProyectos = await prisma.crmHistorialProyecto.findMany({
      where: { clienteId: id },
      include: {
        proyecto: {
          select: {
            id: true,
            nombre: true,
            codigo: true,
            estado: true
          }
        },
        cotizacion: {
          select: {
            id: true,
            codigo: true,
            nombre: true,
            estado: true
          }
        }
      },
      orderBy: { fechaInicio: 'desc' }
    })

    // Combinar y formatear datos
    const proyectosFormateados = proyectos.map(proyecto => ({
      id: proyecto.id,
      tipo: 'proyecto' as const,
      titulo: proyecto.nombre,
      codigo: proyecto.codigo,
      estado: proyecto.estado,
      fechaInicio: proyecto.fechaInicio,
      fechaFin: proyecto.fechaFin,
      valor: proyecto.totalCliente,
      responsable: proyecto.comercial?.name,
      createdAt: proyecto.createdAt
    }))

    const cotizacionesFormateadas = cotizaciones.map(cotizacion => ({
      id: cotizacion.id,
      tipo: 'cotizacion' as const,
      titulo: cotizacion.nombre,
      codigo: cotizacion.codigo,
      estado: cotizacion.estado,
      fechaInicio: cotizacion.fechaEnvio,
      fechaFin: null,
      valor: cotizacion.totalCliente,
      responsable: cotizacion.user?.name,
      createdAt: cotizacion.createdAt
    }))

    const historialFormateado = historialProyectos.map(historial => ({
      id: historial.id,
      tipo: 'historial' as const,
      titulo: historial.nombreProyecto,
      codigo: null,
      estado: historial.proyecto?.estado || 'completado',
      fechaInicio: historial.fechaInicio,
      fechaFin: historial.fechaFin,
      valor: historial.valorContrato,
      responsable: null,
      createdAt: historial.createdAt,
      // Información adicional del historial
      sector: historial.sector,
      complejidad: historial.complejidad,
      duracionDias: historial.duracionDias,
      calificacionCliente: historial.calificacionCliente,
      exitos: historial.exitos,
      problemas: historial.problemas
    }))

    // Combinar todos los registros
    let todosLosRegistros = [
      ...proyectosFormateados,
      ...cotizacionesFormateadas,
      ...historialFormateado
    ]

    // Filtrar por tipo si se especifica
    if (tipo && tipo !== 'todos') {
      todosLosRegistros = todosLosRegistros.filter(registro => registro.tipo === tipo)
    }

    // Ordenar por fecha de creación descendente
    todosLosRegistros.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

    // Calcular estadísticas
    const estadisticas = {
      totalProyectos: proyectos.length,
      totalCotizaciones: cotizaciones.length,
      totalRegistrosHistorial: historialProyectos.length,
      valorTotalProyectos: proyectos.reduce((sum, p) => sum + p.totalCliente, 0),
      valorTotalCotizaciones: cotizaciones.reduce((sum, c) => sum + c.totalCliente, 0),
      proyectosActivos: proyectos.filter(p => ['creado', 'en_planificacion', 'en_ejecucion'].includes(p.estado)).length,
      cotizacionesPendientes: cotizaciones.filter(c => ['borrador', 'enviada'].includes(c.estado)).length
    }

    const resultado = {
      cliente,
      estadisticas,
      registros: todosLosRegistros,
      filtros: {
        tipo: tipo || 'todos',
        totalRegistros: todosLosRegistros.length
      }
    }

    return NextResponse.json(resultado)
  } catch (error) {
    console.error('❌ Error al obtener historial del cliente:', error)
    return NextResponse.json(
      { error: 'Error al obtener historial del cliente' },
      { status: 500 }
    )
  }
}