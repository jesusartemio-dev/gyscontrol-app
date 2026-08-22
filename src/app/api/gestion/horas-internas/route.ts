import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const ROLES = ['admin', 'gerente', 'gestor', 'coordinador', 'proyectos']

const MESES_POR_DEFECTO = 6

/** "YYYY-MM" de una fecha, en UTC. */
function mesDe(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

/**
 * GET /api/gestion/horas-internas?meses=6
 *
 * Horas imputadas a los proyectos internos, agrupadas por centro de costo y mes.
 *
 * Un proyecto interno no tiene alcance: medirle "avance" o "eficiencia" no significa nada.
 * Lo único que dice algo es cuántas horas se le fueron, de quién y en qué mes — que es
 * exactamente lo que el centro de costo necesita para repartir el gasto indirecto.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    if (!ROLES.includes(session.user.role))
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

    const pedidos = Number(req.nextUrl.searchParams.get('meses'))
    const nMeses = Number.isFinite(pedidos) && pedidos >= 3 && pedidos <= 24
      ? Math.trunc(pedidos)
      : MESES_POR_DEFECTO

    const hoy = new Date()
    const desde = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth() - (nMeses - 1), 1))

    const proyectos = await prisma.proyecto.findMany({
      where: { esInterno: true },
      select: {
        id: true, codigo: true, nombre: true, estado: true,
        centroCosto: { select: { id: true, nombre: true, tipo: true } },
      },
      orderBy: { codigo: 'asc' },
    })
    if (proyectos.length === 0) {
      return NextResponse.json({ meses: [], centrosCosto: [], total: null })
    }
    const ids = proyectos.map((p) => p.id)

    // Las horas de proyectos internos entran por timesheet; se contemplan igualmente las
    // jornadas de campo cerradas y aún sin convertir, por si algún día se usan.
    const [registros, miembros] = await Promise.all([
      prisma.registroHoras.findMany({
        where: { proyectoId: { in: ids }, fechaTrabajo: { gte: desde } },
        select: { proyectoId: true, fechaTrabajo: true, horasTrabajadas: true, usuarioId: true },
      }),
      prisma.registroHorasCampoMiembro.findMany({
        where: {
          registroHorasId: null,
          registroCampoTarea: {
            registroCampo: {
              proyectoId: { in: ids }, estado: { not: 'iniciado' }, fechaTrabajo: { gte: desde },
            },
          },
        },
        select: {
          horas: true, usuarioId: true,
          registroCampoTarea: {
            select: { registroCampo: { select: { proyectoId: true, fechaTrabajo: true } } },
          },
        },
      }),
    ])

    const meses: string[] = []
    for (let i = nMeses - 1; i >= 0; i--) {
      meses.push(mesDe(new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth() - i, 1))))
    }

    type Acc = { horas: number; personas: Set<string>; porMes: Map<string, number> }
    const nuevo = (): Acc => ({ horas: 0, personas: new Set(), porMes: new Map() })
    const porProyecto = new Map<string, Acc>()

    const suma = (proyectoId: string, fecha: Date, horas: number, usuarioId: string | null) => {
      const a = porProyecto.get(proyectoId) ?? nuevo()
      a.horas += horas
      if (usuarioId) a.personas.add(usuarioId)
      const m = mesDe(fecha)
      a.porMes.set(m, (a.porMes.get(m) ?? 0) + horas)
      porProyecto.set(proyectoId, a)
    }
    for (const r of registros) suma(r.proyectoId, r.fechaTrabajo, Number(r.horasTrabajadas) || 0, r.usuarioId)
    for (const m of miembros) {
      const j = m.registroCampoTarea.registroCampo
      suma(j.proyectoId, j.fechaTrabajo, m.horas || 0, m.usuarioId)
    }

    const serie = (a: Acc | undefined) => meses.map((m) => Number((a?.porMes.get(m) ?? 0).toFixed(1)))

    // Agrupar por centro de costo (GYS.PRO tiene dos proyectos, por ejemplo).
    const grupos = new Map<string, {
      nombre: string; tipo: string
      proyectos: typeof proyectos
      personas: Set<string>
    }>()
    for (const p of proyectos) {
      const clave = p.centroCosto?.id ?? '__sin_centro__'
      const g = grupos.get(clave) ?? {
        nombre: p.centroCosto?.nombre ?? 'Sin centro de costo',
        tipo: p.centroCosto?.tipo ?? '—',
        proyectos: [] as typeof proyectos,
        personas: new Set<string>(),
      }
      g.proyectos.push(p)
      porProyecto.get(p.id)?.personas.forEach((u) => g.personas.add(u))
      grupos.set(clave, g)
    }

    const centrosCosto = [...grupos.values()]
      .map((g) => {
        const porMes = meses.map((_, i) =>
          Number(g.proyectos.reduce((s, p) => s + serie(porProyecto.get(p.id))[i], 0).toFixed(1)),
        )
        return {
          nombre: g.nombre,
          tipo: g.tipo,
          horas: Number(porMes.reduce((s, h) => s + h, 0).toFixed(1)),
          personas: g.personas.size,
          porMes,
          proyectos: g.proyectos.map((p) => {
            const a = porProyecto.get(p.id)
            const s = serie(a)
            return {
              id: p.id,
              codigo: p.codigo,
              nombre: p.nombre,
              estado: p.estado,
              horas: Number(s.reduce((x, h) => x + h, 0).toFixed(1)),
              personas: a?.personas.size ?? 0,
              porMes: s,
            }
          }),
        }
      })
      .sort((a, b) => b.horas - a.horas)

    const totalPersonas = new Set<string>()
    for (const a of porProyecto.values()) a.personas.forEach((u) => totalPersonas.add(u))

    return NextResponse.json({
      meses,
      centrosCosto,
      total: {
        horas: Number(centrosCosto.reduce((s, c) => s + c.horas, 0).toFixed(1)),
        personas: totalPersonas.size,
        porMes: meses.map((_, i) =>
          Number(centrosCosto.reduce((s, c) => s + c.porMes[i], 0).toFixed(1)),
        ),
      },
    })
  } catch (e) {
    console.error('[GET /api/gestion/horas-internas]', e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
