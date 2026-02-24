import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { calcularHorasOT, calcularDescuentoVolumen } from '@/lib/utils/otUtils'

const ROLES_ALLOWED = ['admin', 'gerente', 'gestor', 'coordinador', 'administracion']

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (!ROLES_ALLOWED.includes(session.user.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const body = await req.json()
    const { clienteId, periodoInicio, periodoFin } = body
    const proyectosIds: string[] = body.proyectosIds || []
    const recursosIds: string[] = body.recursosIds || []

    if (!clienteId || !periodoInicio || !periodoFin) {
      return NextResponse.json(
        { error: 'clienteId, periodoInicio y periodoFin son requeridos' },
        { status: 400 }
      )
    }

    const inicio = new Date(periodoInicio)
    const fin = new Date(periodoFin)
    // Set fin to end of day
    fin.setUTCHours(23, 59, 59, 999)

    if (inicio > fin) {
      return NextResponse.json(
        { error: 'periodoInicio debe ser menor o igual a periodoFin' },
        { status: 400 }
      )
    }

    // PASO 1 — Cargar tarifas y descuentos del cliente
    const tarifasDB = await prisma.tarifaClienteRecurso.findMany({
      where: { clienteId, activo: true },
    })

    const tarifasMap = new Map<string, number>()
    for (const t of tarifasDB) {
      tarifasMap.set(`${t.recursoId}_${t.modalidad}`, t.tarifaVenta)
    }

    const descuentosDB = await prisma.configDescuentoHH.findMany({
      where: { clienteId, activo: true },
      orderBy: { orden: 'asc' },
    })

    // PASO 2 — Buscar RegistroHoras elegibles
    // Si proyectosIds vacío, buscar todos los proyectos del cliente
    let filtroProyectos: string[] = proyectosIds
    if (filtroProyectos.length === 0) {
      const proyectosCliente = await prisma.proyecto.findMany({
        where: { clienteId },
        select: { id: true },
      })
      filtroProyectos = proyectosCliente.map(p => p.id)
    }

    if (filtroProyectos.length === 0) {
      return NextResponse.json({
        lineas: [],
        resumen: emptyResumen(),
      })
    }

    const whereRegistros: any = {
      proyectoId: { in: filtroProyectos },
      fechaTrabajo: { gte: inicio, lte: fin },
      lineaHH: null, // NO valorizado aún
      aprobado: true,
    }
    if (recursosIds.length > 0) {
      whereRegistros.recursoId = { in: recursosIds }
    }

    const registros = await prisma.registroHoras.findMany({
      where: whereRegistros,
      include: {
        recurso: { select: { id: true, nombre: true, tipo: true, costoHora: true } },
        proyecto: { select: { id: true, codigo: true, nombre: true } },
      },
      orderBy: [
        { proyectoId: 'asc' },
        { recursoId: 'asc' },
        { fechaTrabajo: 'asc' },
      ],
    })

    // PASO 3 — Construir líneas preview
    const lineas = registros.map((reg, idx) => {
      const modalidad = reg.origen ?? 'oficina'
      const tarifaKey = `${reg.recursoId}_${modalidad}`
      const tarifaFallback = `${reg.recursoId}_oficina`
      const tarifaHora = tarifasMap.get(tarifaKey)
        ?? tarifasMap.get(tarifaFallback)
        ?? 0
      const sinTarifa = tarifaHora === 0

      const ot = calcularHorasOT(new Date(reg.fechaTrabajo), reg.horasTrabajadas)
      const costoLinea = +(ot.horasEquivalente * tarifaHora).toFixed(2)

      return {
        registroHorasId: reg.id,
        proyectoId: reg.proyectoId,
        proyectoCodigo: reg.proyecto.codigo,
        proyectoNombre: reg.proyecto.nombre,
        recursoId: reg.recursoId,
        recursoNombre: reg.recurso.nombre,
        fecha: reg.fechaTrabajo.toISOString(),
        detalle: reg.descripcion,
        modalidad,
        horasReportadas: reg.horasTrabajadas,
        horasStd: ot.horasStd,
        horasOT125: ot.horasOT125,
        horasOT135: ot.horasOT135,
        horasOT200: ot.horasOT200,
        horasEquivalente: ot.horasEquivalente,
        tarifaHora,
        moneda: 'USD',
        costoLinea,
        sinTarifa,
        orden: idx,
      }
    })

    // PASO 4 — Calcular totales y descuentos
    const totalHorasReportadas = +lineas.reduce((s, l) => s + l.horasReportadas, 0).toFixed(4)
    const totalHorasEquivalentes = +lineas.reduce((s, l) => s + l.horasEquivalente, 0).toFixed(4)
    const subtotal = +lineas.reduce((s, l) => s + l.costoLinea, 0).toFixed(2)

    const descuento = calcularDescuentoVolumen(subtotal, totalHorasEquivalentes, descuentosDB)
    const subtotalConDescuento = +(subtotal - descuento.descuentoMonto).toFixed(2)

    // PASO 5 — Contar registros ya valorizados
    const whereYaVal: any = {
      proyectoId: { in: filtroProyectos },
      fechaTrabajo: { gte: inicio, lte: fin },
      lineaHH: { isNot: null },
      aprobado: true,
    }
    if (recursosIds.length > 0) {
      whereYaVal.recursoId = { in: recursosIds }
    }
    const registrosYaValorizados = await prisma.registroHoras.count({ where: whereYaVal })

    // Desglose por proyecto
    const porProyectoMap = new Map<string, { proyectoId: string; proyectoCodigo: string; proyectoNombre: string; totalHoras: number; totalCosto: number }>()
    for (const l of lineas) {
      const existing = porProyectoMap.get(l.proyectoId)
      if (existing) {
        existing.totalHoras += l.horasEquivalente
        existing.totalCosto += l.costoLinea
      } else {
        porProyectoMap.set(l.proyectoId, {
          proyectoId: l.proyectoId,
          proyectoCodigo: l.proyectoCodigo,
          proyectoNombre: l.proyectoNombre,
          totalHoras: l.horasEquivalente,
          totalCosto: l.costoLinea,
        })
      }
    }
    const porProyecto = Array.from(porProyectoMap.values()).map(p => ({
      ...p,
      totalHoras: +p.totalHoras.toFixed(4),
      totalCosto: +p.totalCosto.toFixed(2),
    }))

    // Desglose por recurso
    const porRecursoMap = new Map<string, { recursoId: string; recursoNombre: string; tarifaHora: number; totalHoras: number; totalCosto: number }>()
    for (const l of lineas) {
      const existing = porRecursoMap.get(l.recursoId)
      if (existing) {
        existing.totalHoras += l.horasEquivalente
        existing.totalCosto += l.costoLinea
      } else {
        porRecursoMap.set(l.recursoId, {
          recursoId: l.recursoId,
          recursoNombre: l.recursoNombre,
          tarifaHora: l.tarifaHora,
          totalHoras: l.horasEquivalente,
          totalCosto: l.costoLinea,
        })
      }
    }
    const porRecurso = Array.from(porRecursoMap.values()).map(r => ({
      ...r,
      totalHoras: +r.totalHoras.toFixed(4),
      totalCosto: +r.totalCosto.toFixed(2),
    }))

    return NextResponse.json({
      lineas,
      resumen: {
        totalRegistros: lineas.length,
        totalHorasReportadas,
        totalHorasEquivalentes,
        subtotal,
        descuentoPct: descuento.descuentoPct,
        descuentoMonto: descuento.descuentoMonto,
        subtotalConDescuento,
        descuentosAplicados: descuento.aplicados,
        registrosSinTarifa: lineas.filter(l => l.sinTarifa).length,
        registrosYaValorizados,
        porProyecto,
        porRecurso,
      },
    })
  } catch (error) {
    console.error('Error en preview valorización HH:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}

function emptyResumen() {
  return {
    totalRegistros: 0,
    totalHorasReportadas: 0,
    totalHorasEquivalentes: 0,
    subtotal: 0,
    descuentoPct: 0,
    descuentoMonto: 0,
    subtotalConDescuento: 0,
    descuentosAplicados: [],
    registrosSinTarifa: 0,
    registrosYaValorizados: 0,
    porProyecto: [],
    porRecurso: [],
  }
}
