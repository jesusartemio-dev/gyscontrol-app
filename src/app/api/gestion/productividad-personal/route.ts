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

    // Dos formas de acotar el periodo: ventana móvil (`meses=N`, termina en el mes actual)
    // o año calendario (`anio=2026`, de enero a diciembre). La contabilidad razona por año
    // cerrado; la gestión del día a día, por los últimos meses. Se ofrecen las dos.
    const anioParam = Number(req.nextUrl.searchParams.get('anio'))
    const hoy = new Date()
    const anioActual = hoy.getUTCFullYear()

    let desde: Date
    let hasta: Date
    const meses: string[] = []

    if (Number.isFinite(anioParam) && anioParam >= 2020 && anioParam <= anioActual) {
      // Del año en curso solo tiene sentido hasta el mes actual: los meses futuros
      // serían columnas vacías que solo estorban.
      const ultimoMes = anioParam === anioActual ? hoy.getUTCMonth() : 11
      desde = new Date(Date.UTC(anioParam, 0, 1))
      hasta = new Date(Date.UTC(anioParam, ultimoMes + 1, 1))
      for (let m = 0; m <= ultimoMes; m++) meses.push(mesDe(new Date(Date.UTC(anioParam, m, 1))))
    } else {
      const pedidos = Number(req.nextUrl.searchParams.get('meses'))
      const nMeses = Number.isFinite(pedidos) && pedidos >= 3 && pedidos <= 24
        ? Math.trunc(pedidos)
        : MESES_POR_DEFECTO
      desde = new Date(Date.UTC(anioActual, hoy.getUTCMonth() - (nMeses - 1), 1))
      hasta = new Date(Date.UTC(anioActual, hoy.getUTCMonth() + 1, 1))
      for (let i = nMeses - 1; i >= 0; i--) {
        meses.push(mesDe(new Date(Date.UTC(anioActual, hoy.getUTCMonth() - i, 1))))
      }
    }

    // Fuente principal: RegistroHoras (timesheet + jornadas de campo ya convertidas). Trae
    // costoHora, así que es la única que permite expresar el reparto en dinero.
    // Ficha de empleado de quien registró horas: sirve para distinguir "a esta persona le
    // falta cargar el sueldo" de "esta persona ya cesó". No hay campo de personal externo en
    // el modelo, así que eso hoy no se puede diferenciar — todos los que no tienen costo son
    // empleados con cargo y sin sueldo cargado.
    const empleados = await prisma.empleado.findMany({
      select: {
        userId: true, activo: true, sueldoPlanilla: true, sueldoHonorarios: true,
        cargo: { select: { nombre: true } },
      },
    })
    const fichaPorUsuario = new Map(empleados.map((e) => [e.userId, e]))

    const registros = await prisma.registroHoras.findMany({
      where: { fechaTrabajo: { gte: desde, lt: hasta } },
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
          registroCampo: { estado: { not: 'iniciado' }, fechaTrabajo: { gte: desde, lt: hasta } },
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
      codigo: string; nombre: string; esInterno: boolean; centroCosto: string | null
      horas: number
      /** Horas de ese destino en cada mes del periodo. */
      porMes: Map<string, number>
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
          centroCosto: proyecto.centroCosto?.nombre ?? null, horas: 0, porMes: new Map(),
        }
        d.horas += horas
        d.porMes.set(m, (d.porMes.get(m) ?? 0) + horas)
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
          cargo: fichaPorUsuario.get(p.id)?.cargo?.nombre ?? null,
          activo: fichaPorUsuario.get(p.id)?.activo ?? null,
          tieneFicha: fichaPorUsuario.has(p.id),
          tieneSueldo: Boolean(
            fichaPorUsuario.get(p.id)?.sueldoPlanilla || fichaPorUsuario.get(p.id)?.sueldoHonorarios,
          ),
          // Si ni el máximo llega al mínimo creíble, a esta persona no se le configuró tarifa.
          costoNoConfigurado: p.costoHoraMax < COSTO_HORA_MINIMO_CREIBLE,
          porcentajeDirecto: total > 0 ? Math.round((p.directo / total) * 100) : null,
          porcentajeIndirecto: total > 0 ? Math.round((p.indirecto / total) * 100) : null,
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
            .map((d) => ({
              codigo: d.codigo, nombre: d.nombre, esInterno: d.esInterno,
              centroCosto: d.centroCosto, horas: r1(d.horas),
              porMes: meses.map((m) => r1(d.porMes.get(m) ?? 0)),
            })),
        }
      })
      .sort((a, b) => b.horas.total - a.horas.total)

    const sum = (f: (p: (typeof personas)[number]) => number) => r1(personas.reduce((s, p) => s + f(p), 0))
    const tDirecto = sum((p) => p.horas.directo)
    const tIndirecto = sum((p) => p.horas.indirecto)
    const tTotal = tDirecto + tIndirecto

    // Años con horas registradas, para que el selector no ofrezca años vacíos.
    const rango = await prisma.registroHoras.aggregate({
      _min: { fechaTrabajo: true }, _max: { fechaTrabajo: true },
    })
    const aniosDisponibles: number[] = []
    if (rango._min.fechaTrabajo && rango._max.fechaTrabajo) {
      for (let a = rango._max.fechaTrabajo.getUTCFullYear(); a >= rango._min.fechaTrabajo.getUTCFullYear(); a--) {
        aniosDisponibles.push(a)
      }
    }

    return NextResponse.json({
      meses,
      periodo: Number.isFinite(anioParam) && anioParam >= 2020 && anioParam <= anioActual
        ? { tipo: 'anio' as const, anio: anioParam }
        : { tipo: 'movil' as const, meses: meses.length },
      aniosDisponibles,
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
        // Quién exactamente, para poder ir a arreglarlo sin buscar.
        sinCostoDetalle: personas
          .filter((p) => p.costoNoConfigurado)
          .map((p) => ({
            nombre: p.nombre, cargo: p.cargo, activo: p.activo,
            horas: p.horas.total, tieneFicha: p.tieneFicha,
          })),
        porcentajeDirecto: tTotal > 0 ? Math.round((tDirecto / tTotal) * 100) : null,
        porcentajeIndirecto: tTotal > 0 ? Math.round((tIndirecto / tTotal) * 100) : null,
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
