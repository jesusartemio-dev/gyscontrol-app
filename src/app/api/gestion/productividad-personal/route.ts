import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const ROLES = ['admin', 'gerente', 'gestor', 'coordinador', 'proyectos']

const MESES_POR_DEFECTO = 6

/** Por debajo de esto el costo por hora no está configurado, es un placeholder. En
 *  producción hay gente con 0.12 S//h y con 0, contra 11-28 del resto: sus importes en soles
 *  son basura y hay que decirlo en vez de sumarlos como si nada. */
const COSTO_HORA_MINIMO_CREIBLE = 1

function mesDe(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}
const r1 = (n: number) => Number(n.toFixed(1))

/**
 * GET /api/gestion/productividad-personal?meses=6
 *
 * Reparto del tiempo de cada persona entre proyectos de cliente (COSTO DIRECTO) y proyectos
 * internos / centros de costo (COSTO INDIRECTO), mes a mes.
 *
 * El timesheet de supervisión responde "¿esta persona registró sus horas esta semana?". Esto
 * responde otra pregunta, de gestión: "¿en qué se le fue el tiempo y cuánto de eso es
 * facturable a un proyecto?". Una persona al 40 % directo cuesta lo mismo que una al 90 %,
 * pero solo la segunda se está pagando sola.
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
    const meses: string[] = []
    for (let i = nMeses - 1; i >= 0; i--) {
      meses.push(mesDe(new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth() - i, 1))))
    }

    // Fuente principal: RegistroHoras (timesheet + jornadas de campo ya convertidas). Trae
    // costoHora, así que es la única que permite expresar el reparto en dinero.
    const registros = await prisma.registroHoras.findMany({
      where: { fechaTrabajo: { gte: desde } },
      select: {
        usuarioId: true, fechaTrabajo: true, horasTrabajadas: true, costoHora: true,
        user: { select: { id: true, name: true, email: true } },
        proyecto: {
          select: {
            id: true, codigo: true, nombre: true, esInterno: true,
            centroCosto: { select: { nombre: true } },
          },
        },
      },
    })

    // Jornadas cerradas aún sin convertir: sus horas cuentan, pero no traen costoHora.
    const miembros = await prisma.registroHorasCampoMiembro.findMany({
      where: {
        registroHorasId: null,
        registroCampoTarea: {
          registroCampo: { estado: { not: 'iniciado' }, fechaTrabajo: { gte: desde } },
        },
      },
      select: {
        horas: true, usuarioId: true,
        usuario: { select: { id: true, name: true, email: true } },
        registroCampoTarea: {
          select: {
            registroCampo: {
              select: {
                fechaTrabajo: true,
                proyecto: {
                  select: {
                    id: true, codigo: true, nombre: true, esInterno: true,
                    centroCosto: { select: { nombre: true } },
                  },
                },
              },
            },
          },
        },
      },
    })

    interface Destino {
      codigo: string; nombre: string; esInterno: boolean; centroCosto: string | null; horas: number
    }
    interface Persona {
      id: string; nombre: string; email: string | null
      directo: number; indirecto: number
      costoDirecto: number; costoIndirecto: number
      sinCosto: number
      porMes: Map<string, { directo: number; indirecto: number }>
      destinos: Map<string, Destino>
      /** Para detectar a quién no se le configuró el costo por hora. */
      costoHoraMax: number
    }
    const gente = new Map<string, Persona>()

    const anotar = (
      user: { id: string; name: string | null; email: string | null } | null,
      fecha: Date,
      horas: number,
      costoHora: number | null,
      proyecto: {
        id: string; codigo: string; nombre: string; esInterno: boolean
        centroCosto: { nombre: string } | null
      } | null,
    ) => {
      if (!user?.id || horas <= 0) return
      const p = gente.get(user.id) ?? {
        id: user.id, nombre: user.name ?? user.email ?? '(sin nombre)', email: user.email,
        directo: 0, indirecto: 0, costoDirecto: 0, costoIndirecto: 0, sinCosto: 0,
        porMes: new Map(), destinos: new Map(), costoHoraMax: 0,
      }
      if (costoHora != null && costoHora > p.costoHoraMax) p.costoHoraMax = costoHora
      const interno = proyecto?.esInterno ?? false
      const costo = costoHora != null ? horas * costoHora : 0
      if (interno) { p.indirecto += horas; p.costoIndirecto += costo }
      else { p.directo += horas; p.costoDirecto += costo }
      if (costoHora == null) p.sinCosto += horas

      const m = mesDe(fecha)
      const mm = p.porMes.get(m) ?? { directo: 0, indirecto: 0 }
      if (interno) mm.indirecto += horas
      else mm.directo += horas
      p.porMes.set(m, mm)

      if (proyecto) {
        const d = p.destinos.get(proyecto.id) ?? {
          codigo: proyecto.codigo, nombre: proyecto.nombre, esInterno: proyecto.esInterno,
          centroCosto: proyecto.centroCosto?.nombre ?? null, horas: 0,
        }
        d.horas += horas
        p.destinos.set(proyecto.id, d)
      }
      gente.set(user.id, p)
    }

    for (const r of registros) {
      anotar(r.user, r.fechaTrabajo, Number(r.horasTrabajadas) || 0,
        r.costoHora == null ? null : Number(r.costoHora), r.proyecto)
    }
    for (const m of miembros) {
      const j = m.registroCampoTarea.registroCampo
      anotar(m.usuario, j.fechaTrabajo, m.horas || 0, null, j.proyecto)
    }

    const personas = [...gente.values()]
      .map((p) => {
        const total = p.directo + p.indirecto
        return {
          id: p.id,
          nombre: p.nombre,
          horas: { total: r1(total), directo: r1(p.directo), indirecto: r1(p.indirecto) },
          costo: {
            total: r1(p.costoDirecto + p.costoIndirecto),
            directo: r1(p.costoDirecto),
            indirecto: r1(p.costoIndirecto),
          },
          // Horas sin costoHora (jornadas sin convertir): el dinero las subestima.
          horasSinCosto: r1(p.sinCosto),
          costoHora: r1(p.costoHoraMax),
          // Si ni el máximo llega al mínimo creíble, a esta persona no se le configuró tarifa.
          costoNoConfigurado: p.costoHoraMax < COSTO_HORA_MINIMO_CREIBLE,
          porcentajeDirecto: total > 0 ? Math.round((p.directo / total) * 100) : null,
          porMes: meses.map((m) => {
            const v = p.porMes.get(m) ?? { directo: 0, indirecto: 0 }
            const t = v.directo + v.indirecto
            return {
              mes: m,
              total: r1(t),
              directo: r1(v.directo),
              indirecto: r1(v.indirecto),
              porcentajeDirecto: t > 0 ? Math.round((v.directo / t) * 100) : null,
            }
          }),
          destinos: [...p.destinos.values()]
            .sort((a, b) => b.horas - a.horas)
            .map((d) => ({ ...d, horas: r1(d.horas) })),
        }
      })
      .sort((a, b) => b.horas.total - a.horas.total)

    const sum = (f: (p: (typeof personas)[number]) => number) => r1(personas.reduce((s, p) => s + f(p), 0))
    const tDirecto = sum((p) => p.horas.directo)
    const tIndirecto = sum((p) => p.horas.indirecto)
    const tTotal = tDirecto + tIndirecto

    return NextResponse.json({
      meses,
      personas,
      total: {
        personas: personas.length,
        horas: { total: r1(tTotal), directo: tDirecto, indirecto: tIndirecto },
        costo: {
          total: sum((p) => p.costo.total),
          directo: sum((p) => p.costo.directo),
          indirecto: sum((p) => p.costo.indirecto),
        },
        horasSinCosto: sum((p) => p.horasSinCosto),
        personasSinCosto: personas.filter((p) => p.costoNoConfigurado).length,
        horasSinTarifa: sum((p) => (p.costoNoConfigurado ? p.horas.total : 0)),
        porcentajeDirecto: tTotal > 0 ? Math.round((tDirecto / tTotal) * 100) : null,
        porMes: meses.map((m, i) => {
          const d = r1(personas.reduce((s, p) => s + p.porMes[i].directo, 0))
          const ind = r1(personas.reduce((s, p) => s + p.porMes[i].indirecto, 0))
          const t = d + ind
          return {
            mes: m, total: r1(t), directo: d, indirecto: ind,
            porcentajeDirecto: t > 0 ? Math.round((d / t) * 100) : null,
          }
        }),
      },
    })
  } catch (e) {
    console.error('[GET /api/gestion/productividad-personal]', e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
