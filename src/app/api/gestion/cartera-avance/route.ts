import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calcularPesosFase } from '@/lib/services/pesoFase'
import { serieAvanceRealSemanal, serieConsumoHorasSemanal } from '@/lib/services/avanceHistorico'
import { diagnosticarPreparacion } from '@/lib/services/preparacionCronograma'

const ROLES = ['admin', 'gerente', 'gestor', 'coordinador', 'proyectos']

/** Cuántos proyectos se procesan a la vez. Cada uno son ~6 consultas; sin tope, la cartera
 *  entera abre demasiadas conexiones de golpe contra Neon. */
const CONCURRENCIA = 6

async function enLotes<T, R>(items: T[], n: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const salida: R[] = []
  for (let i = 0; i < items.length; i += n) {
    salida.push(...(await Promise.all(items.slice(i, i + n).map(fn))))
  }
  return salida
}

/** Tipo de proyecto que se quiere ver. Los internos son cubos de horas de un centro de
 *  costo, no obras: por defecto quedan fuera para que la cartera no mezcle peras y manzanas. */
type Tipo = 'cliente' | 'interno' | 'todos'

/**
 * GET /api/gestion/cartera-avance?tipo=cliente&incluirCerrados=0
 *
 * Una fila por proyecto con el estado de su curva de avance: cuánto lleva, cuánto de eso
 * está fechado, cuántas horas consumió, cuánto trabajo va fuera del plan y qué le falta para
 * que la curva sea fiable. Es la vista de cartera de lo que el reporte de curva S muestra de
 * uno en uno.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    if (!ROLES.includes(session.user.role))
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

    const incluirCerrados = req.nextUrl.searchParams.get('incluirCerrados') === '1'
    const tipoParam = req.nextUrl.searchParams.get('tipo')
    const tipo: Tipo = tipoParam === 'interno' || tipoParam === 'todos' ? tipoParam : 'cliente'

    const proyectos = await prisma.proyecto.findMany({
      where: {
        ...(incluirCerrados ? {} : { estado: { not: 'cerrado' as const } }),
        ...(tipo === 'todos' ? {} : { esInterno: tipo === 'interno' }),
      },
      select: {
        id: true, codigo: true, nombre: true, estado: true, esInterno: true,
        centroCosto: { select: { nombre: true, tipo: true } },
      },
      orderBy: [{ esInterno: 'asc' }, { codigo: 'asc' }],
    })

    // Conteos por tipo, para que el selector muestre cuántos hay de cada uno.
    const [nCliente, nInterno] = await Promise.all([
      prisma.proyecto.count({
        where: { esInterno: false, ...(incluirCerrados ? {} : { estado: { not: 'cerrado' as const } }) },
      }),
      prisma.proyecto.count({
        where: { esInterno: true, ...(incluirCerrados ? {} : { estado: { not: 'cerrado' as const } }) },
      }),
    ])

    // Jornadas abiertas de toda la cartera en una sola consulta.
    const abiertas = await prisma.registroHorasCampo.findMany({
      where: { estado: 'iniciado' },
      select: { proyectoId: true, fechaTrabajo: true },
      orderBy: { fechaTrabajo: 'asc' },
    })
    const abiertasPorProyecto = new Map<string, string[]>()
    for (const j of abiertas) {
      const lista = abiertasPorProyecto.get(j.proyectoId) ?? []
      lista.push(j.fechaTrabajo.toISOString().slice(0, 10))
      abiertasPorProyecto.set(j.proyectoId, lista)
    }

    const filas = await enLotes(proyectos, CONCURRENCIA, async (p) => {
      const pesos = await calcularPesosFase(p.id)
      const [serie, consumo, preparacion] = await Promise.all([
        serieAvanceRealSemanal(p.id, pesos),
        serieConsumoHorasSemanal(p.id),
        diagnosticarPreparacion(p.id),
      ])

      const pctHoras = consumo.horasPresupuestadas > 0
        ? (consumo.horasConsumidas / consumo.horasPresupuestadas) * 100
        : null

      return {
        id: p.id,
        codigo: p.codigo,
        nombre: p.nombre,
        estado: p.estado,
        esInterno: p.esInterno,
        centroCosto: p.centroCosto?.nombre ?? null,
        preparacion: {
          estado: preparacion.estado,
          listo: preparacion.listo,
          esInterno: preparacion.esInterno,
          puedeCompararConPlan: preparacion.puedeCompararConPlan,
          titulo: preparacion.titulo,
        },
        avanceReal: serie.porcentajeDerivado,
        avanceActual: serie.porcentajeActual,
        // Avance que existe en las tareas pero sin fecha registrada: la curva arranca por
        // debajo de la realidad mientras esto sea > 0.
        brecha: Number((serie.porcentajeActual - serie.porcentajeDerivado).toFixed(2)),
        semanasConDato: serie.puntos.length,
        horasPresupuestadas: Number(consumo.horasPresupuestadas.toFixed(1)),
        horasConsumidas: Number(consumo.horasConsumidas.toFixed(1)),
        porcentajeHoras: pctHoras == null ? null : Number(pctHoras.toFixed(1)),
        // Avance logrado por punto de horas gastado. < 1 = sobrecosto.
        eficiencia: pctHoras && pctHoras > 0 ? Number((serie.porcentajeActual / pctHoras).toFixed(2)) : null,
        fueraDePlan: pesos.fueraDePlan,
        jornadasAbiertas: abiertasPorProyecto.get(p.id) ?? [],
      }
    })

    // Totales de cartera, solo sobre proyectos con cronograma utilizable.
    const utiles = filas.filter((f) => f.preparacion.listo)
    const hPres = utiles.reduce((s, f) => s + f.horasPresupuestadas, 0)
    const hCons = utiles.reduce((s, f) => s + f.horasConsumidas, 0)

    return NextResponse.json({
      proyectos: filas,
      tipo,
      conteos: { cliente: nCliente, interno: nInterno, todos: nCliente + nInterno },
      resumen: {
        total: filas.length,
        listos: utiles.length,
        sinArmar: filas.filter((f) => !f.preparacion.listo && f.preparacion.estado !== 'centro_de_costo').length,
        conBrecha: filas.filter((f) => f.brecha > 1).length,
        conSobrecosto: filas.filter((f) => f.preparacion.listo && f.eficiencia != null && f.eficiencia < 1).length,
        // Un centro de costo no tiene alcance del que salirse: no cuenta como desbordado.
        fueraDePlanAlto: filas.filter(
          (f) => f.preparacion.estado !== 'centro_de_costo'
            && (f.fueraDePlan.sinAlcancePlanificado || f.fueraDePlan.porcentajeSobrePlan >= 50),
        ).length,
        jornadasAbiertas: abiertas.length,
        horasPresupuestadas: Number(hPres.toFixed(1)),
        horasConsumidas: Number(hCons.toFixed(1)),
      },
    })
  } catch (e) {
    console.error('[GET /api/gestion/cartera-avance]', e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
