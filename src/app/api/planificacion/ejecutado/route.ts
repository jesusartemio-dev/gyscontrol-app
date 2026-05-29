import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import { addDays, resolverColorProyecto } from '@/lib/utils/planificacion'

const DEPARTAMENTOS_DEFAULT = ['INGENIERIA', 'CONSTRUCCION', 'GESTION', 'PROYECTOS']

/**
 * GET /api/planificacion/ejecutado
 * Devuelve por persona × día:
 *   - planificado: proyecto planificado ese día (PlanificacionDia)
 *   - asistio: tuvo ingreso en Asistencia
 *   - proyectos: horas aprobadas y pendientes de jornada de campo
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

    const diasObjs = Array.from({ length: numSemanas * 7 }, (_, i) => addDays(inicio, i))
    const finStr = diasObjs[diasObjs.length - 1].toISOString().slice(0, 10)
    const finDate = new Date(finStr + 'T23:59:59.999Z')
    const diasStrs = diasObjs.map(d => d.toISOString().slice(0, 10))

    // ── Empleados ─────────────────────────────────────────────────────────────
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

    if (empleados.length === 0) return NextResponse.json({ dias: diasStrs, personas: [] })
    const userIds = empleados.map(e => e.userId)

    // ── PlanificacionDia ──────────────────────────────────────────────────────
    const planificaciones = await prisma.planificacionDia.findMany({
      where: {
        userId: { in: userIds },
        fecha: { gte: inicio, lte: finDate },
        proyectoId: { not: null },
      },
      select: {
        userId: true,
        fecha: true,
        proyecto: { select: { id: true, codigo: true, nombre: true, colorPlanificacion: true } },
      },
    })

    // ── RegistroHoras aprobados (campo) ───────────────────────────────────────
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
        fechaTrabajo: true,
        proyecto: { select: { id: true, codigo: true, nombre: true, colorPlanificacion: true } },
      },
    })

    // ── Pendientes (RegistroHorasCampoMiembro sin aprobar) ────────────────────
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
                fechaTrabajo: true,
                proyecto: { select: { id: true, codigo: true, nombre: true, colorPlanificacion: true } },
              },
            },
          },
        },
      },
    })

    // ── Asistencia (ingreso) ──────────────────────────────────────────────────
    const asistencias = await prisma.asistencia.findMany({
      where: {
        userId: { in: userIds },
        tipo: 'ingreso',
        fechaHora: { gte: inicio, lte: finDate },
      },
      select: { userId: true, fechaHora: true },
    })

    // ── Agregación día a día ──────────────────────────────────────────────────
    type ProyectoDia = { codigo: string; nombre: string; color: string; horasAprobadas: number; horasPendientes: number }
    type DiaDato = { asistio: boolean; proyectos: Map<string, ProyectoDia>; planificado: { codigo: string; nombre: string; color: string } | null }

    const personaDias = new Map<string, Map<string, DiaDato>>()
    for (const emp of empleados) personaDias.set(emp.userId, new Map())

    function getOrCreateDia(userId: string, fechaKey: string): DiaDato {
      const m = personaDias.get(userId)!
      if (!m.has(fechaKey)) m.set(fechaKey, { asistio: false, planificado: null, proyectos: new Map() })
      return m.get(fechaKey)!
    }

    function getOrCreateProy(dia: DiaDato, p: { id: string; codigo: string; nombre: string; colorPlanificacion: string | null }): ProyectoDia {
      if (!dia.proyectos.has(p.id)) {
        dia.proyectos.set(p.id, { codigo: p.codigo, nombre: p.nombre, color: resolverColorProyecto(p.id, p.colorPlanificacion), horasAprobadas: 0, horasPendientes: 0 })
      }
      return dia.proyectos.get(p.id)!
    }

    for (const a of asistencias) {
      const key = new Date(a.fechaHora).toISOString().slice(0, 10)
      if (!personaDias.has(a.userId)) continue
      getOrCreateDia(a.userId, key).asistio = true
    }

    for (const plan of planificaciones) {
      if (!plan.proyecto) continue
      const key = new Date(plan.fecha).toISOString().slice(0, 10)
      const dia = getOrCreateDia(plan.userId, key)
      if (!dia.planificado) {
        dia.planificado = { codigo: plan.proyecto.codigo, nombre: plan.proyecto.nombre, color: resolverColorProyecto(plan.proyecto.id, plan.proyecto.colorPlanificacion) }
      }
    }

    for (const r of registrosAprobados) {
      if (!r.proyecto) continue
      const key = new Date(r.fechaTrabajo).toISOString().slice(0, 10)
      const dia = getOrCreateDia(r.usuarioId, key)
      getOrCreateProy(dia, r.proyecto).horasAprobadas += r.horasTrabajadas
    }

    for (const p of pendientes) {
      const rc = p.registroCampoTarea.registroCampo
      if (!rc.proyecto) continue
      const key = new Date(rc.fechaTrabajo).toISOString().slice(0, 10)
      const dia = getOrCreateDia(p.usuarioId, key)
      getOrCreateProy(dia, rc.proyecto).horasPendientes += p.horas
    }

    // ── Respuesta ────────────────────────────────────────────────────────────
    const personas = empleados
      .map(emp => {
        const diasMap = personaDias.get(emp.userId)!
        const diasData: Record<string, { asistio: boolean; planificado: { codigo: string; nombre: string; color: string } | null; proyectos: ProyectoDia[] } | null> = {}
        for (const dStr of diasStrs) {
          const d = diasMap.get(dStr)
          diasData[dStr] = d
            ? {
                asistio: d.asistio,
                planificado: d.planificado,
                proyectos: Array.from(d.proyectos.values()).map(pr => ({
                  ...pr,
                  horasAprobadas: Math.round(pr.horasAprobadas * 100) / 100,
                  horasPendientes: Math.round(pr.horasPendientes * 100) / 100,
                })),
              }
            : null
        }
        return { userId: emp.userId, nombre: emp.user.name || emp.user.email, departamento: emp.departamento?.nombre || '', dias: diasData }
      })
      .filter(p => Object.values(p.dias).some(d => d !== null))

    return NextResponse.json({ fechaInicio: inicioStr, fechaFin: finStr, dias: diasStrs, personas })
  } catch (error) {
    console.error('[planificacion/ejecutado]', error)
    return NextResponse.json({ error: 'Error al cargar datos ejecutados' }, { status: 500 })
  }
}
