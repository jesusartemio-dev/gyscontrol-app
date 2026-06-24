import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { getServerSession } = await import('next-auth')
    const { authOptions } = await import('@/lib/auth')
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const userRole = session.user.role
    const allowedRoles = ['admin', 'coordinador', 'gestor', 'proyectos']
    if (!allowedRoles.includes(userRole || '')) {
      return NextResponse.json({ error: 'No tiene permisos' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const proyectoId = searchParams.get('proyectoId')
    const diasProximos = Math.max(1, parseInt(searchParams.get('diasProximos') || '7'))

    const ahora = new Date()
    const fechaLimiteProximo = new Date(ahora.getTime() + diasProximos * 24 * 60 * 60 * 1000)

    // ProyectoTareas de cronograma de ejecución, no canceladas
    const whereProyectoTarea: any = {
      proyectoEdt: { proyectoCronograma: { tipo: 'ejecucion' } },
      estado: { not: 'cancelada' }
    }
    if (proyectoId) {
      whereProyectoTarea.proyectoEdt = {
        proyectoCronograma: { tipo: 'ejecucion' },
        proyectoId
      }
    }

    const proyectoTareas = await prisma.proyectoTarea.findMany({
      where: whereProyectoTarea,
      select: {
        id: true,
        responsableId: true,
        estado: true,
        fechaFin: true,
        horasEstimadas: true,
        personasEstimadas: true,
        user: { select: { id: true, name: true } }
      }
    })

    // Tareas simples, no canceladas
    const whereTarea: any = { estado: { not: 'cancelada' } }
    if (proyectoId) {
      whereTarea.proyectoServicioCotizado = { proyectoId }
    }

    const tareasSimples = await prisma.tarea.findMany({
      where: whereTarea,
      select: {
        id: true,
        responsableId: true,
        estado: true,
        fechaFin: true,
        horasEstimadas: true,
        user: { select: { id: true, name: true } }
      }
    })

    type TareaUnificada = {
      id: string
      responsableId: string | null
      responsableNombre: string | null
      estado: string
      fechaFin: Date
      horasEstimadas: number
    }

    const todas: TareaUnificada[] = [
      ...proyectoTareas.map(t => ({
        id: t.id,
        responsableId: t.responsableId,
        responsableNombre: t.user?.name || null,
        estado: t.estado,
        fechaFin: t.fechaFin,
        horasEstimadas: t.horasEstimadas
          ? Number(t.horasEstimadas) * (t.personasEstimadas || 1)
          : 0
      })),
      ...tareasSimples.map(t => ({
        id: t.id,
        responsableId: t.responsableId,
        responsableNombre: t.user?.name || null,
        estado: t.estado,
        fechaFin: t.fechaFin,
        horasEstimadas: t.horasEstimadas ? Number(t.horasEstimadas) : 0
      }))
    ]

    // Agrupar por responsableId
    const porUsuario = new Map<string, { id: string | null; nombre: string | null; tareas: TareaUnificada[] }>()
    const SIN_ASIGNAR = '__sin_asignar__'

    for (const t of todas) {
      const key = t.responsableId ?? SIN_ASIGNAR
      if (!porUsuario.has(key)) {
        porUsuario.set(key, { id: t.responsableId, nombre: t.responsableNombre, tareas: [] })
      }
      porUsuario.get(key)!.tareas.push(t)
    }

    const resultado = Array.from(porUsuario.entries()).map(([key, { id, nombre, tareas }]) => {
      const enProgreso = tareas.filter(t => t.estado === 'en_progreso')
      const pendientes = tareas.filter(t => t.estado === 'pendiente')
      const pausadas = tareas.filter(t => t.estado === 'pausada')
      const completadas = tareas.filter(t => t.estado === 'completada')
      const activas = [...enProgreso, ...pendientes, ...pausadas]

      const retrasadas = activas.filter(t => new Date(t.fechaFin) < ahora)
      const porVencer = activas.filter(t => {
        const f = new Date(t.fechaFin)
        return f >= ahora && f <= fechaLimiteProximo
      })
      const horasPendientes = activas.reduce((sum, t) => sum + t.horasEstimadas, 0)

      return {
        usuarioId: id,
        usuarioNombre: key === SIN_ASIGNAR ? 'Sin asignar' : (nombre ?? 'Usuario'),
        sinAsignar: key === SIN_ASIGNAR,
        total: tareas.length,
        activas: activas.length,
        enProgreso: enProgreso.length,
        pendientes: pendientes.length,
        pausadas: pausadas.length,
        retrasadas: retrasadas.length,
        porVencer: porVencer.length,
        completadas: completadas.length,
        horasPendientes: Math.round(horasPendientes * 10) / 10
      }
    })

    // Ordenar: primero con más retrasadas, luego más activas; sin asignar al final
    resultado.sort((a, b) => {
      if (a.sinAsignar !== b.sinAsignar) return a.sinAsignar ? 1 : -1
      if (b.retrasadas !== a.retrasadas) return b.retrasadas - a.retrasadas
      return b.activas - a.activas
    })

    return NextResponse.json({ success: true, data: resultado })

  } catch (error) {
    console.error('Error carga personal:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor', success: false },
      { status: 500 }
    )
  }
}
