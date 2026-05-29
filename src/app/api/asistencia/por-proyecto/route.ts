import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import { resolverColorProyecto } from '@/lib/utils/planificacion'

/**
 * GET /api/asistencia/por-proyecto
 * Para un rango de fechas, devuelve las horas ejecutadas en campo
 * (RegistroHoras aprobados + RegistroHorasCampoMiembro pendientes)
 * agrupadas por persona → proyecto, cruzadas con la asistencia física.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const sp = req.nextUrl.searchParams
    const desdeStr = sp.get('desde')
    const hastaStr = sp.get('hasta')
    const departamentoId = sp.get('departamentoId')

    if (!desdeStr || !hastaStr) {
      return NextResponse.json({ error: 'desde y hasta son requeridos' }, { status: 400 })
    }

    const desde = new Date(desdeStr + 'T00:00:00.000Z')
    const hasta = new Date(hastaStr + 'T23:59:59.999Z')

    if (isNaN(desde.getTime()) || isNaN(hasta.getTime())) {
      return NextResponse.json({ error: 'Fechas inválidas' }, { status: 400 })
    }

    // ── RegistroHoras aprobados (campo) ───────────────────────────────────────
    const registrosAprobados = await prisma.registroHoras.findMany({
      where: {
        fechaTrabajo: { gte: desde, lte: hasta },
        origen: 'campo',
        ...(departamentoId ? {
          user: { empleado: { departamentoId } },
        } : {}),
      },
      select: {
        usuarioId: true,
        proyectoId: true,
        horasTrabajadas: true,
        proyecto: {
          select: { id: true, codigo: true, nombre: true, colorPlanificacion: true },
        },
        user: {
          select: {
            name: true,
            email: true,
            empleado: {
              select: { departamento: { select: { nombre: true } } },
            },
          },
        },
      },
      orderBy: { fechaTrabajo: 'asc' },
    })

    // ── RegistroHorasCampoMiembro pendientes ──────────────────────────────────
    const pendientes = await prisma.registroHorasCampoMiembro.findMany({
      where: {
        registroHorasId: null,
        registroCampoTarea: {
          registroCampo: {
            fechaTrabajo: { gte: desde, lte: hasta },
            estado: { in: ['iniciado', 'pendiente'] },
          },
        },
        ...(departamentoId ? {
          usuario: { empleado: { departamentoId } },
        } : {}),
      },
      select: {
        usuarioId: true,
        horas: true,
        registroCampoTarea: {
          select: {
            registroCampo: {
              select: {
                id: true,
                proyectoId: true,
                proyecto: {
                  select: { id: true, codigo: true, nombre: true, colorPlanificacion: true },
                },
              },
            },
          },
        },
        usuario: {
          select: {
            name: true,
            email: true,
            empleado: {
              select: { departamento: { select: { nombre: true } } },
            },
          },
        },
      },
    })

    // ── Asistencia (ingreso por día) ──────────────────────────────────────────
    // Collect all involved userIds first
    const userIdsSet = new Set<string>()
    for (const r of registrosAprobados) userIdsSet.add(r.usuarioId)
    for (const p of pendientes) userIdsSet.add(p.usuarioId)
    const userIds = Array.from(userIdsSet)

    const asistencias = userIds.length > 0
      ? await prisma.asistencia.findMany({
          where: {
            userId: { in: userIds },
            tipo: 'ingreso',
            fechaHora: { gte: desde, lte: hasta },
          },
          select: { userId: true, fechaHora: true },
        })
      : []

    const diasAsistidosPorUser = new Map<string, Set<string>>()
    for (const a of asistencias) {
      const dia = new Date(a.fechaHora).toISOString().slice(0, 10)
      if (!diasAsistidosPorUser.has(a.userId)) diasAsistidosPorUser.set(a.userId, new Set())
      diasAsistidosPorUser.get(a.userId)!.add(dia)
    }

    // ── Agregación ────────────────────────────────────────────────────────────
    type PersonaData = {
      userId: string; nombre: string; email: string; departamento: string
      proyectos: Map<string, {
        proyectoId: string; codigo: string; nombre: string; color: string
        horasAprobadas: number; horasPendientes: number; jornadas: Set<string>
      }>
    }

    const personaMap = new Map<string, PersonaData>()

    function getOrCreatePersona(userId: string, userData: { name: string | null; email: string; empleado?: { departamento?: { nombre: string } | null } | null }): PersonaData {
      if (!personaMap.has(userId)) {
        personaMap.set(userId, {
          userId,
          nombre: userData.name || userData.email,
          email: userData.email,
          departamento: userData.empleado?.departamento?.nombre || '',
          proyectos: new Map(),
        })
      }
      return personaMap.get(userId)!
    }

    function getOrCreateProyecto(persona: PersonaData, proy: { id: string; codigo: string; nombre: string; colorPlanificacion?: string | null }) {
      if (!persona.proyectos.has(proy.id)) {
        persona.proyectos.set(proy.id, {
          proyectoId: proy.id,
          codigo: proy.codigo,
          nombre: proy.nombre,
          color: resolverColorProyecto(proy.id, proy.colorPlanificacion),
          horasAprobadas: 0,
          horasPendientes: 0,
          jornadas: new Set(),
        })
      }
      return persona.proyectos.get(proy.id)!
    }

    for (const r of registrosAprobados) {
      if (!r.proyecto) continue
      const persona = getOrCreatePersona(r.usuarioId, r.user)
      const proy = getOrCreateProyecto(persona, r.proyecto)
      proy.horasAprobadas += r.horasTrabajadas
    }

    for (const p of pendientes) {
      const rc = p.registroCampoTarea.registroCampo
      if (!rc.proyecto) continue
      const persona = getOrCreatePersona(p.usuarioId, p.usuario)
      const proy = getOrCreateProyecto(persona, rc.proyecto)
      proy.horasPendientes += p.horas
      proy.jornadas.add(rc.id)
    }

    // ── Respuesta ────────────────────────────────────────────────────────────
    const personas = Array.from(personaMap.values())
      .map(p => ({
        userId: p.userId,
        nombre: p.nombre,
        departamento: p.departamento,
        diasConAsistencia: diasAsistidosPorUser.get(p.userId)?.size ?? 0,
        proyectos: Array.from(p.proyectos.values())
          .map(proy => ({
            proyectoId: proy.proyectoId,
            codigo: proy.codigo,
            nombre: proy.nombre,
            color: proy.color,
            horasAprobadas: Math.round(proy.horasAprobadas * 100) / 100,
            horasPendientes: Math.round(proy.horasPendientes * 100) / 100,
            jornadas: proy.jornadas.size,
          }))
          .sort((a, b) => a.codigo.localeCompare(b.codigo)),
      }))
      .sort((a, b) => a.departamento.localeCompare(b.departamento) || a.nombre.localeCompare(b.nombre))

    return NextResponse.json({ personas })
  } catch (error) {
    console.error('[asistencia/por-proyecto]', error)
    return NextResponse.json({ error: 'Error al cargar datos por proyecto' }, { status: 500 })
  }
}
