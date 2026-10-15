/**
 * Prueba de ida y vuelta GYS → MS Project → GYS (solo lectura, no escribe nada).
 *
 * Para cada cronograma de planificación/ejecución: exporta a XML (MSPDI) y a
 * Excel con las mismas funciones de la app, vuelve a leer los archivos con el
 * importador y calcula el plan de sincronización. Si la exportación y la
 * importación son fieles, el plan debe salir vacío (0 cambios, 0 nuevos,
 * 0 eliminados, 0 dependencias) en todos los cronogramas.
 *
 * Uso:
 *   npx tsx scripts/probar-ida-vuelta-msproject.ts                                   (BD local)
 *   npx dotenv -e .env.production -o -- npx tsx scripts/probar-ida-vuelta-msproject.ts (producción, solo lectura)
 */
import { prisma } from '../src/lib/prisma'
import { generarMspdiProyecto } from '../src/lib/utils/msProjectMspdiExport'
import { exportCronogramaToExcel } from '../src/lib/utils/msProjectExcelExport'
import { leerMspdi, leerExcelMsProject } from '../src/lib/cronogramaSync/leerArchivoMsProject'
import { calcularPlanSincronizacion } from '../src/lib/cronogramaSync/sincronizar'
import { obtenerCalendarioProyecto } from '../src/lib/services/cronogramaDesplazamiento'
import { horasLaborablesEntre, horasPorDiaCalendario } from '../src/lib/services/cronogramaHoras'
import { calcularHHRealDeTarea } from '../src/lib/planTrabajo/calcularDatos'
import * as XLSX from 'xlsx'
import { readdirSync, unlinkSync } from 'fs'

export async function construirArbol(cronogramaId: string) {
  const c = await prisma.proyectoCronograma.findUniqueOrThrow({ where: { id: cronogramaId }, select: { proyectoId: true } })
  const cal = await obtenerCalendarioProyecto(c.proyectoId)
  const recurso = { select: { id: true, nombre: true, tipo: true, perfiles: { where: { activo: true }, select: { cantidad: true } } } }
  const fases = await prisma.proyectoFase.findMany({ where: { proyectoCronogramaId: cronogramaId }, orderBy: { orden: 'asc' }, include: { proyectoEdt: { orderBy: { orden: 'asc' }, include: { proyectoActividad: { orderBy: { orden: 'asc' }, include: { proyectoTarea: { orderBy: { orden: 'asc' }, include: { recurso } } } } } } } })
  const dur = (a: Date | null, b: Date | null) => (a && b ? horasLaborablesEntre(cal, a, b) : 0)
  const arbol = { id: 'proyecto-x', type: 'proyecto', nombre: 'P', level: 0, data: {}, children: fases.map(f => ({ id: `fase-${f.id}`, type: 'fase', nombre: f.nombre, level: 1, data: { fechaInicioComercial: f.fechaInicioPlan, fechaFinComercial: f.fechaFinPlan }, children: f.proyectoEdt.map(e => ({ id: `edt-${e.id}`, type: 'edt', nombre: e.nombre, level: 2, data: { fechaInicioComercial: e.fechaInicioPlan, fechaFinComercial: e.fechaFinPlan }, children: e.proyectoActividad.map(a => ({ id: `actividad-${a.id}`, type: 'actividad', nombre: a.nombre, level: 3, data: { fechaInicioComercial: a.fechaInicioPlan, fechaFinComercial: a.fechaFinPlan }, children: a.proyectoTarea.map(t => ({ id: `tarea-${t.id}`, type: 'tarea', nombre: t.nombre, level: 4, children: [], data: { fechaInicio: t.fechaInicio, fechaFin: t.fechaFin, esHito: t.esHito, fechaLimite: t.fechaLimite, esExtra: t.esExtra, descripcion: t.descripcion, horasEstimadas: Number(t.horasEstimadas ?? 0), recursoId: t.recursoId, recursoNombre: t.recurso?.nombre, duracionHoras: t.esHito ? 0 : dur(t.fechaInicio, t.fechaFin), horasHombre: calcularHHRealDeTarea({ horasEstimadas: Number(t.horasEstimadas ?? 0), recurso: t.recurso as any }) } })) })) })) })) }
  const deps = await prisma.proyectoDependenciasTarea.findMany({ where: { tareaOrigen: { proyectoCronogramaId: cronogramaId } } })
  const calendario = { ...(cal as any), horasPorDia: horasPorDiaCalendario(cal) }
  return { arbol, deps, calendario, hpd: horasPorDiaCalendario(cal) }
}

const resumir = (p: any) => `coinciden ${p.coincidencias}/${p.totalFilas} · cambios ${p.cambios.length} · nuevos ${p.nuevos.length} · eliminados ${p.eliminados.length} · deps +${p.dependencias.agregar.length} -${p.dependencias.quitar.length} ~${p.dependencias.cambiar.length} · bloqueado ${p.bloqueado}`

async function main() {
  const crons = await prisma.proyectoCronograma.findMany({ where: { tipo: { in: ['planificacion', 'ejecucion'] }, proyectoTarea: { some: {} } }, select: { id: true, tipo: true, proyecto: { select: { codigo: true } }, _count: { select: { proyectoTarea: true } } } })
  const fallidos: string[] = []
  for (const c of crons) {
    const { arbol, deps, calendario, hpd } = await construirArbol(c.id)
    // XML
    const xml = generarMspdiProyecto({ proyectoNombre: 'P', arbol: arbol as any, dependencias: deps as any, calendario })
    const pXml = await calcularPlanSincronizacion(c.id, leerMspdi(xml))
    // Excel
    const antes = new Set(readdirSync('.'))
    exportCronogramaToExcel([arbol as any], deps as any, 'TmpSync', hpd, [])
    const f = readdirSync('.').find(x => x.endsWith('.xlsx') && !antes.has(x))!
    const pXls = await calcularPlanSincronizacion(c.id, leerExcelMsProject(XLSX.readFile(f), hpd)); unlinkSync(f)
    console.log(`${c.proyecto.codigo} ${c.tipo} (${c._count.proyectoTarea} tareas)\n   XML:   ${resumir(pXml)}\n   Excel: ${resumir(pXls)}`)
    for (const p of [pXml, pXls]) for (const cambio of p.cambios.slice(0, 4)) console.log('     cambio:', cambio.nombre, JSON.stringify(cambio.campos))
    for (const p of [pXml, pXls]) for (const e of p.eliminados.slice(0, 3)) console.log('     eliminado:', e.tipo, e.nombre)
    const limpio = (p: any) => p.bloqueado || p.cambios.length + p.nuevos.length + p.eliminados.length + p.dependencias.agregar.length + p.dependencias.quitar.length + p.dependencias.cambiar.length === 0
    if (!limpio(pXml) || !limpio(pXls)) fallidos.push(`${c.proyecto.codigo} ${c.tipo}`)
  }
  console.log(fallidos.length ? `
CON DIFERENCIAS: ${fallidos.join(', ')}` : `
OK: ${crons.length} cronogramas vuelven sin cambios.`)
  if (fallidos.length) process.exitCode = 1
}
if (require.main === module) main().finally(() => prisma.$disconnect())
