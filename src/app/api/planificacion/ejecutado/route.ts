import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import { addDays } from '@/lib/utils/planificacion'
import { resolverColorProyecto } from '@/lib/utils/planificacion'

const DEPARTAMENTOS_DEFAULT = ['INGENIERIA', 'CONSTRUCCION', 'GESTION', 'PROYECTOS']

/**
 * GET /api/planificacion/ejecutado
 * Devuelve, para el mismo rango que planificación, el cruce de:
 *   - PlanificacionDia  → días planificados por persona/proyecto
 *   - RegistroHoras     → horas aprobadas (de jornadas aprobadas)
 *   - RegistroHorasCampoMiembro → horas pendientes (jornadas sin aprobar)
 *   - Asistencia.ingreso → días con presencia física
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const sp = req.nextUrl.searchParams
    const inicioStr = sp.get('inicio')
    if (!inicioStr) return NextResponse.json({ error: 'inicio requerido' }, { status: 400 })

    const numSemanas = Math.min(6, Math.max(1, parseInt(sp.get('semanas') ?? '1') || 1))
    const departamentosParam = sp.get('departamentos')

    const inicio = new Date(inicioStr + 'T00:00:00.000Z')
    if (isNaN(inicio.getTime())) return NextResponse.json({ error: 'Fecha inválida' }, { status: 400 })

    const dias = Array.from({ length: numSemanas * 7 }, (_, i) => addDays(inicio, i))
    const finStr = dias[dias.length - 1]
    const finDate = new Date(finStr + 'T23:59:59.999Z')

    // ── Empleados del rango ───────────────────────────────────────────────────
    const empleados = await prisma.empleado.findMany({
      where: {
        activo: true,
        ...(departamentosParam
          ? { departamentoId: { in: departamentosParam.split(',').filter(Boolean) } }
          : {
              departamento: {
                OR: DEPARTAMENTOS_DEFAULT.map(n => ({
                  nombre: { contains: n, mode: 'insensitive' as const },
                })),
              },
            }),
      },
      select: {
        userId: true,
        user: { select: { name: true, email: true } },
        departamento: { select: { nombre: true } },
      },
      orderBy: [{ departamento: { nombre: 'asc' } }, { user: { name: 'asc' } }],
    })

    if (empleados.length === 0) return NextResponse.json({ personas: [] })

    const userIds = empleados.map(e => e.userId)

    // ── PlanificacionDia (días planificados por proyecto) ─────────────────────
    const planificaciones = await prisma.planificacionDia.findMany({
      where: {
        userId: { in: userIds },
        fecha: { gte: inicio, lte: finDate },
        proyectoId: { not: null },
      },
      select: {
        userId: true,
        proyectoId: true,
        proyecto: {
          select: { id: true, codigo: true, nombre: true, colorPlanificacion: true },
        },
      },
    })

    // ── RegistroHoras aprobados (origen campo) ────────────────────────────────
    const registrosAprobados = await prisma.registroHoras.findMany({
      where: {
        usuarioId: { in: userIds },
        fechaTrabajo: { gte: inicio, lte: finDate },
        origen: 'campo',
      },
      select: {
        usuarioId: true,
        proyectoId: true,
        horasTrabajadas: true,
        proyecto: {
          select: { id: true, codigo: true, nombre: true, colorPlanificacion: true },
        },
      },
    })

    // ── RegistroHorasCampoMiembro pendientes (sin RegistroHoras aún) ──────────
    const pendientes = await prisma.registroHorasCampoMiembro.findMany({
      where: {
        usuarioId: { in: userIds },
        registroHorasId: null,
        registroCampoTarea: {
          registroCampo: {
            fechaTrabajo: { gte: inicio, lte: finDate },
            estado: { in: ['iniciado', 'pendiente'] },
          },
        },
      },
      select: {
        usuarioId: true,
        horas: true,
        registroCampoTarea: {
          select: {
            registroCampo: {
              select: {
                proyectoId: true,
                proyecto: {
                  select: { id: true, codigo: true, nombre: true, colorPlanificacion: true },
                },
              },
            },
          },
        },
      },
    })

    // ── Asistencia (ingreso por día) ──────────────────────────────────────────
    const asistencias = await prisma.asistencia.findMany({
      where: {
        userId: { in: userIds },
        tipo: 'ingreso',
        fechaHora: { gte: inicio, lte: finDate },
      },
      select: { userId: true, fechaHora: true },
    })

    // ── Días únicos con asistencia por usuario ───────────────────────────────
    const diasAsistidosPorUser = new Map<string, Set<string>>()
    for (const a of asistencias) {
      const dia = new Date(a.fechaHora).toISOString().slice(0, 10)
      if (!diasAsistidosPorUser.has(a.userId)) diasAsistidosPorUser.set(a.userId, new Set())
      diasAsistidosPorUser.get(a.userId)!.add(dia)
    }

    // ── Agregación por persona → proyecto ────────────────────────────────────
    type ProyectoRaw = {
      id: string; codigo: string; nombre: string; colorPlanificacion: string | null
    }
    type EntradaProyecto = {
      proyectoId: string; codigo: string; nombre: string; color: string
      diasPlanificados: number; horasAprobadas: number; horasPendientes: number
    }

    const personaMap = new Map<string, {
      userId: string; nombre: string; departamento: string
      proyectos: Map<string, EntradaProyecto>
    }>()

    for (const emp of empleados) {
      personaMap.set(emp.userId, {
        userId: emp.userId,
        nombre: emp.user.name || emp.user.email,
        departamento: emp.departamento?.nombre || '',
        proyectos: new Map(),
      })
    }

    function getOrCreateProyecto(userId: string, proy: ProyectoRaw): EntradaProyecto {
      const persona = personaMap.get(userId)!
      if (!persona.proyectos.has(proy.id)) {
        persona.proyectos.set(proy.id, {
          proyectoId: proy.id,
          codigo: proy.codigo,
          nombre: proy.nombre,
          color: resolverColorProyecto(proy.id, proy.colorPlanificacion),
          diasPlanificados: 0,
          horasAprobadas: 0,
          horasPendientes: 0,
        })
      }
      return persona.proyectos.get(proy.id)!
    }

    for (const p of planificaciones) {
      if (!p.proyecto || !p.proyectoId) continue
      const entry = getOrCreateProyecto(p.userId, p.proyecto)
      entry.diasPlanificados++
    }

    for (const r of registrosAprobados) {
      if (!r.proyecto) continue
      const entry = getOrCreateProyecto(r.usuarioId, r.proyecto)
      entry.horasAprobadas += r.horasTrabajadas
    }

    for (const p of pendientes) {
      const rc = p.registroCampoTarea.registroCampo
      if (!rc.proyecto) continue
      const entry = getOrCreateProyecto(p.usuarioId, rc.proyecto)
      entry.horasPendientes += p.horas
    }

    // ── Construir respuesta ───────────────────────────────────────────────────
    const personas = Array.from(personaMap.values())
      .filter(p => p.proyectos.size > 0)
      .map(p => ({
        userId: p.userId,
        nombre: p.nombre,
        departamento: p.departamento,
        diasConAsistencia: diasAsistidosPorUser.get(p.userId)?.size ?? 0,
        proyectos: Array.from(p.proyectos.values()).sort((a, b) => a.codigo.localeCompare(b.codigo)),
      }))

    return NextResponse.json({ fechaInicio: inicioStr, fechaFin: finStr, personas })
  } catch (error) {
    console.error('[planificacion/ejecutado]', error)
    return NextResponse.json({ error: 'Error al cargar datos ejecutados' }, { status: 500 })
  }
}
