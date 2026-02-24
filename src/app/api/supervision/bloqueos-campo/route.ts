import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const ROLES_PERMITIDOS = ['admin', 'gerente', 'gestor', 'coordinador', 'proyectos']

interface BloqueoFlat {
  tipoBloqueoNombre: string
  descripcion: string
  impacto: string | null
  accion: string | null
  jornadaId: string
  fechaTrabajo: string
  estadoJornada: string
  proyectoId: string
  proyectoNombre: string
  supervisorId: string
  supervisorNombre: string
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const role = (session.user as any).role
    if (!ROLES_PERMITIDOS.includes(role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const filtroProyecto = searchParams.get('proyectoId') || undefined
    const filtroTipo = searchParams.get('tipoBloqueo') || undefined
    const filtroSupervisor = searchParams.get('supervisorId') || undefined
    const filtroEstado = searchParams.get('estado') || undefined
    const fechaDesde = searchParams.get('fechaDesde') || undefined
    const fechaHasta = searchParams.get('fechaHasta') || undefined
    const busqueda = searchParams.get('busqueda') || undefined
    const conImpacto = searchParams.get('conImpacto') === 'true'

    // Query jornadas que tienen bloqueos
    const where: any = {
      bloqueos: { not: { equals: null } },
    }

    if (filtroProyecto) where.proyectoId = filtroProyecto
    if (filtroSupervisor) where.supervisorId = filtroSupervisor
    if (filtroEstado && filtroEstado !== 'all') where.estado = filtroEstado
    if (fechaDesde || fechaHasta) {
      where.fechaTrabajo = {}
      if (fechaDesde) where.fechaTrabajo.gte = new Date(fechaDesde)
      if (fechaHasta) {
        const hasta = new Date(fechaHasta)
        hasta.setDate(hasta.getDate() + 1)
        where.fechaTrabajo.lte = hasta
      }
    }

    const jornadas = await prisma.registroHorasCampo.findMany({
      where,
      select: {
        id: true,
        fechaTrabajo: true,
        estado: true,
        bloqueos: true,
        proyectoId: true,
        supervisorId: true,
        proyecto: { select: { id: true, nombre: true } },
        supervisor: { select: { id: true, name: true } },
      },
      orderBy: { fechaTrabajo: 'desc' },
    })

    // Aplanar bloqueos del JSON
    const bloqueos: BloqueoFlat[] = []
    for (const jornada of jornadas) {
      const bloqueosJson = jornada.bloqueos as any[]
      if (!Array.isArray(bloqueosJson) || bloqueosJson.length === 0) continue

      for (const b of bloqueosJson) {
        if (!b.descripcion) continue

        bloqueos.push({
          tipoBloqueoNombre: b.tipoBloqueoNombre || 'Sin tipo',
          descripcion: b.descripcion,
          impacto: b.impacto || null,
          accion: b.accion || null,
          jornadaId: jornada.id,
          fechaTrabajo: jornada.fechaTrabajo.toISOString(),
          estadoJornada: jornada.estado,
          proyectoId: jornada.proyecto.id,
          proyectoNombre: jornada.proyecto.nombre,
          supervisorId: jornada.supervisor.id,
          supervisorNombre: jornada.supervisor.name || 'Sin nombre',
        })
      }
    }

    // Filtros in-memory (JSON fields)
    let resultado = bloqueos
    if (filtroTipo && filtroTipo !== 'all') {
      resultado = resultado.filter(b => b.tipoBloqueoNombre === filtroTipo)
    }
    if (conImpacto) {
      resultado = resultado.filter(b => b.impacto && b.impacto.trim() !== '')
    }
    if (busqueda) {
      const q = busqueda.toLowerCase()
      resultado = resultado.filter(
        b =>
          b.descripcion.toLowerCase().includes(q) ||
          (b.impacto && b.impacto.toLowerCase().includes(q)) ||
          (b.accion && b.accion.toLowerCase().includes(q)) ||
          b.proyectoNombre.toLowerCase().includes(q)
      )
    }

    // Resumen
    const tiposCount: Record<string, number> = {}
    const proyectosSet = new Set<string>()
    let conImpactoCount = 0
    for (const b of resultado) {
      tiposCount[b.tipoBloqueoNombre] = (tiposCount[b.tipoBloqueoNombre] || 0) + 1
      proyectosSet.add(b.proyectoId)
      if (b.impacto) conImpactoCount++
    }

    const tipoMasFrecuente = Object.entries(tiposCount).sort((a, b) => b[1] - a[1])[0]

    const resumen = {
      totalBloqueos: resultado.length,
      proyectosAfectados: proyectosSet.size,
      tipoMasFrecuente: tipoMasFrecuente ? { nombre: tipoMasFrecuente[0], count: tipoMasFrecuente[1] } : null,
      conImpacto: conImpactoCount,
    }

    // Opciones para filtros
    const allTipos = [...new Set(bloqueos.map(b => b.tipoBloqueoNombre))].sort()
    const allProyectos = [...new Map(bloqueos.map(b => [b.proyectoId, { id: b.proyectoId, nombre: b.proyectoNombre }])).values()]
    const allSupervisores = [...new Map(bloqueos.map(b => [b.supervisorId, { id: b.supervisorId, nombre: b.supervisorNombre }])).values()]

    return NextResponse.json({
      data: resultado,
      resumen,
      filtros: {
        tipos: allTipos,
        proyectos: allProyectos,
        supervisores: allSupervisores,
      },
    })
  } catch (error: any) {
    console.error('[Bloqueos Campo] Error:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
