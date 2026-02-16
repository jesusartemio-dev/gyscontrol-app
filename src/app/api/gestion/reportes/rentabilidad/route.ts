import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const ROLES_ALLOWED = ['admin', 'gerente', 'gestor']

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (!ROLES_ALLOWED.includes(session.user.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const proyectoId = searchParams.get('proyectoId')

    if (proyectoId) {
      return await getProyectoDetalle(proyectoId)
    }
    return await getResumenTodos()
  } catch (error) {
    console.error('Error en reporte rentabilidad:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}

async function getProyectoDetalle(proyectoId: string) {
  const [proyecto, ocAggregate, serviciosRaw, gastosAggregate] = await Promise.all([
    prisma.proyecto.findUnique({
      where: { id: proyectoId },
      select: {
        id: true,
        codigo: true,
        nombre: true,
        moneda: true,
        estado: true,
        totalCliente: true,
        totalEquiposInterno: true,
        totalServiciosInterno: true,
        totalGastosInterno: true,
        cliente: { select: { nombre: true } },
      },
    }),
    prisma.ordenCompra.aggregate({
      where: { proyectoId, estado: { not: 'cancelada' } },
      _sum: { total: true },
    }),
    prisma.$queryRaw<{ total: number }[]>`
      SELECT COALESCE(SUM(rh."horasTrabajadas" * r."costoHora"), 0) as "total"
      FROM registro_horas rh
      JOIN recurso r ON rh."recursoId" = r."id"
      WHERE rh."proyectoId" = ${proyectoId}
    `,
    prisma.hojaDeGastos.aggregate({
      where: { proyectoId, estado: { in: ['validado', 'cerrado'] } },
      _sum: { montoGastado: true },
    }),
  ])

  if (!proyecto) {
    return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })
  }

  const ingreso = proyecto.totalCliente
  const costoEquipos = ocAggregate._sum.total || 0
  const costoServicios = Number(serviciosRaw[0]?.total || 0)
  const costoGastos = gastosAggregate._sum.montoGastado || 0
  const costoTotal = costoEquipos + costoServicios + costoGastos
  const presupuestoTotal = proyecto.totalEquiposInterno + proyecto.totalServiciosInterno + proyecto.totalGastosInterno
  const margen = ingreso - costoTotal
  const margenPorcentaje = ingreso > 0 ? Math.round(((margen / ingreso) * 100) * 100) / 100 : 0

  return NextResponse.json({
    proyecto: {
      id: proyecto.id,
      codigo: proyecto.codigo,
      nombre: proyecto.nombre,
      moneda: proyecto.moneda,
      estado: proyecto.estado,
      cliente: proyecto.cliente?.nombre,
    },
    ingreso,
    costos: {
      equipos: {
        presupuesto: proyecto.totalEquiposInterno,
        real: costoEquipos,
        diferencia: proyecto.totalEquiposInterno - costoEquipos,
      },
      servicios: {
        presupuesto: proyecto.totalServiciosInterno,
        real: costoServicios,
        diferencia: proyecto.totalServiciosInterno - costoServicios,
      },
      gastos: {
        presupuesto: proyecto.totalGastosInterno,
        real: costoGastos,
        diferencia: proyecto.totalGastosInterno - costoGastos,
      },
      total: {
        presupuesto: presupuestoTotal,
        real: costoTotal,
        diferencia: presupuestoTotal - costoTotal,
      },
    },
    margen,
    margenPorcentaje,
  })
}

async function getResumenTodos() {
  const [proyectos, ocPorProyecto, serviciosPorProyecto, gastosPorProyecto] = await Promise.all([
    prisma.proyecto.findMany({
      where: { estado: { notIn: ['cancelado'] } },
      select: {
        id: true,
        codigo: true,
        nombre: true,
        moneda: true,
        estado: true,
        totalCliente: true,
        totalEquiposInterno: true,
        totalServiciosInterno: true,
        totalGastosInterno: true,
        cliente: { select: { nombre: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.ordenCompra.groupBy({
      by: ['proyectoId'],
      where: { estado: { not: 'cancelada' }, proyectoId: { not: null } },
      _sum: { total: true },
    }),
    prisma.$queryRaw<{ proyectoId: string; total: number }[]>`
      SELECT rh."proyectoId", COALESCE(SUM(rh."horasTrabajadas" * r."costoHora"), 0) as "total"
      FROM registro_horas rh
      JOIN recurso r ON rh."recursoId" = r."id"
      GROUP BY rh."proyectoId"
    `,
    prisma.hojaDeGastos.groupBy({
      by: ['proyectoId'],
      where: { estado: { in: ['validado', 'cerrado'] }, proyectoId: { not: null } },
      _sum: { montoGastado: true },
    }),
  ])

  const ocMap = new Map(ocPorProyecto.map(oc => [oc.proyectoId, oc._sum.total || 0]))
  const serviciosMap = new Map(serviciosPorProyecto.map(s => [s.proyectoId, Number(s.total)]))
  const gastosMap = new Map(gastosPorProyecto.map(g => [g.proyectoId, g._sum.montoGastado || 0]))

  const resumen = proyectos.map(p => {
    const ingreso = p.totalCliente
    const costoEquipos = ocMap.get(p.id) || 0
    const costoServicios = serviciosMap.get(p.id) || 0
    const costoGastos = gastosMap.get(p.id) || 0
    const costoTotal = costoEquipos + costoServicios + costoGastos
    const presupuestoTotal = p.totalEquiposInterno + p.totalServiciosInterno + p.totalGastosInterno
    const margen = ingreso - costoTotal
    const margenPorcentaje = ingreso > 0 ? Math.round(((margen / ingreso) * 100) * 100) / 100 : 0

    return {
      id: p.id,
      codigo: p.codigo,
      nombre: p.nombre,
      moneda: p.moneda,
      estado: p.estado,
      cliente: p.cliente?.nombre,
      ingreso,
      presupuestoTotal,
      costoEquipos,
      costoServicios,
      costoGastos,
      costoTotal,
      margen,
      margenPorcentaje,
    }
  })

  return NextResponse.json({ proyectos: resumen })
}
