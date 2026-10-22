/**
 * Reproduce la generación del asistente de un proyecto con su propuesta guardada
 * (el mismo código del generador) y revisa dos defectos:
 *  - tareas con 0 horas laborables (inicio = fin, o 18:30 → 08:00);
 *  - tareas que terminan después que su actividad.
 * Solo lectura. Uso:
 *   npx dotenv -e .env.production -o -- npx tsx scripts/repro-duracion-cero-generador.ts CJM51
 */
import { prisma } from '../src/lib/prisma'
import { obtenerCalendarioLaboral } from '../src/lib/utils/calendarioLaboral'
import { construirEstructuraReal, calendarioHoras, type EdtCatalogoInfo } from '../src/lib/cronogramaIA/construirEstructuraReal'
import { horasLaborablesEntre } from '../src/lib/services/cronogramaHoras'
import type { ActividadPropuesta } from '../src/types/cronogramaIA'

const hm = (d: Date) => d.toISOString().slice(0, 16).replace('T', ' ')

async function main() {
  const codigo = process.argv[2]
  const cron = await prisma.proyectoCronograma.findFirstOrThrow({
    where: { tipo: 'planificacion', proyecto: { codigo } },
    select: { id: true, proyectoId: true, proyecto: { select: { fechaInicio: true, cotizacion: { select: { calendarioLaboral: { include: { diaCalendario: true, excepcionCalendario: true } } } } } } },
  })
  const gen = await prisma.proyectoCronogramaGeneracionIA.findFirstOrThrow({
    where: { proyectoCronogramaId: cron.id, estado: 'aplicado' }, orderBy: { generadoEn: 'desc' }, select: { propuestaActividades: true },
  })
  const calendarioLaboral = cron.proyecto.cotizacion?.calendarioLaboral ?? (await obtenerCalendarioLaboral('empresa', 'default'))
  const acts = ((gen.propuestaActividades as unknown as ActividadPropuesta[]) ?? [])
    .map(a => ({ ...a, tareas: a.tareas.filter(t => t.incluida) }))
    .filter(a => a.tareas.length)
  const edtsDb = await prisma.edt.findMany({ where: { nombre: { in: [...new Set(acts.map(a => a.edtNombre))] } }, include: { faseDefault: true } })
  const edtsCatalogo = new Map<string, EdtCatalogoInfo>(edtsDb.filter(e => e.faseDefault).map(e => [e.nombre, {
    id: e.id, nombre: e.nombre, descripcionEdt: e.descripcion || e.nombre, faseNombre: e.faseDefault!.nombre, faseOrden: e.faseDefault!.orden, edtOrden: e.orden,
  }]))
  const r = construirEstructuraReal({
    actividades: acts, edtsCatalogo, proyectoId: cron.proyectoId, proyectoCronogramaId: cron.id,
    fechaInicioProyecto: cron.proyecto.fechaInicio, calendarioLaboral: calendarioLaboral!, recursoPorServicio: new Map(),
  })
  const cal = calendarioHoras(calendarioLaboral)
  const actPorId = new Map(r.actividades.map(a => [a.id, a]))

  const cero = r.tareas.filter(t => !t.esHito && t.horasEstimadas > 0 && horasLaborablesEntre(cal, t.fechaInicio, t.fechaFin) === 0)
  const fueraDeActividad = r.tareas.filter(t => t.fechaFin.getTime() > actPorId.get(t.proyectoActividadId)!.fechaFinPlan.getTime())
  console.log(`${r.tareas.length} tareas generadas`)
  console.log(`- con 0 h laborables: ${cero.length}`)
  for (const t of cero) console.log(`    ${t.nombre} (${t.horasEstimadas} h) ${hm(t.fechaInicio)} → ${hm(t.fechaFin)}  [${actPorId.get(t.proyectoActividadId)!.nombre}]`)
  console.log(`- terminan después que su actividad: ${fueraDeActividad.length}`)
  for (const t of fueraDeActividad.slice(0, 10)) console.log(`    ${t.nombre} ${hm(t.fechaFin)} > actividad ${hm(actPorId.get(t.proyectoActividadId)!.fechaFinPlan)}`)
}
main().finally(() => prisma.$disconnect())
