import { prisma } from '../src/lib/prisma'
import { recalcularPadresPostOperacion } from '../src/lib/utils/cronogramaRollup'
import { obtenerCalendarioProyecto } from '../src/lib/services/cronogramaDesplazamiento'
import { siguienteMomentoLaborable } from '../src/lib/services/cronogramaHoras'

// CJM52 (línea base) — agrega lo que el generador habría creado con el servicio
// "Parada de Planta" (tag HitosCliente) del EDT CTL: actividad "Hitos del
// Cliente" en Monitoreo y Control (primera del EDT) con "Parada de Planta" como
// hito ◆ provisional al inicio de Ejecución. Luego se le pone la fecha real y
// se enlaza lo que depende de ella.
// Por defecto simula; con --apply escribe.

const PROYECTO_ID = '15eb2f1c-7b6b-4e6e-bd02-bec9ead0304a'
const CRON = '2bed33ff-b6d6-4638-af89-48b5fb04f8e8'
const APPLY = process.argv.includes('--apply')
const d = (x: Date | null) => (x ? x.toISOString().slice(0, 16).replace('T', ' ') : '-')

async function main() {
  console.log(APPLY ? '*** MODO APPLY ***' : '--- simulación (usar --apply para escribir) ---')
  const servicio = await prisma.catalogoServicio.findFirstOrThrow({ where: { nombre: 'Parada de Planta', actividadTag: { has: 'HitosCliente' } } })
  const edt = await prisma.proyectoEdt.findFirstOrThrow({
    where: { proyectoCronogramaId: CRON, edtId: servicio.categoriaId },
    include: { proyectoActividad: { orderBy: { orden: 'asc' }, select: { id: true, nombre: true, orden: true } } },
  })
  if (edt.proyectoActividad.some((a) => a.nombre === 'Hitos del Cliente')) throw new Error('Ya existe "Hitos del Cliente"')
  const ejecucion = await prisma.proyectoFase.findFirstOrThrow({ where: { proyectoCronogramaId: CRON, nombre: { contains: 'EJECUCI' } } })
  const cal = await obtenerCalendarioProyecto(PROYECTO_ID)
  // Inicio real de Ejecución: su primera tarea (la fecha guardada de la fase puede estar desfasada).
  const primera = await prisma.proyectoTarea.findFirstOrThrow({
    where: { proyectoEdt: { proyectoFaseId: ejecucion.id } }, orderBy: { fechaInicio: 'asc' }, select: { fechaInicio: true, nombre: true },
  })
  console.log(`Ejecución: fase guardada ${d(ejecucion.fechaInicioPlan)} · primera tarea "${primera.nombre}" ${d(primera.fechaInicio)}`)
  const fecha = siguienteMomentoLaborable(cal, primera.fechaInicio)
  // Responsable: el del rol del EDT, que ya tienen sus tareas.
  const hermana = await prisma.proyectoTarea.findFirst({ where: { proyectoEdtId: edt.id, responsableId: { not: null } }, select: { responsableId: true } })
  const responsableId = hermana?.responsableId ?? edt.responsableId ?? null

  console.log(`EDT: ${edt.nombre} (${edt.proyectoActividad.length} actividades: ${edt.proyectoActividad.map((a) => a.nombre).join(' | ')})`)
  console.log(`+ Actividad "Hitos del Cliente" (orden 0; las demás bajan 1)`)
  console.log(`  ◆ ${servicio.nombre} | ${d(fecha)} (inicio de Ejecución) | catálogo ${servicio.id.slice(0, 8)} | resp ${responsableId?.slice(0, 8)}`)
  if (!APPLY) { console.log('\nSimulación: no se escribió nada.'); return }

  const ahora = new Date()
  const actId = crypto.randomUUID()
  const tareaId = crypto.randomUUID()
  await prisma.$transaction(async (tx) => {
    for (const a of edt.proyectoActividad) await tx.proyectoActividad.update({ where: { id: a.id }, data: { orden: a.orden + 1, updatedAt: ahora } })
    await tx.proyectoActividad.create({ data: {
      id: actId, proyectoEdtId: edt.id, proyectoCronogramaId: CRON, nombre: 'Hitos del Cliente', orden: 0,
      fechaInicioPlan: fecha, fechaFinPlan: fecha, horasPlan: 0, responsableId, updatedAt: ahora,
    } })
    await tx.proyectoTarea.create({ data: {
      id: tareaId, proyectoEdtId: edt.id, proyectoCronogramaId: CRON, proyectoActividadId: actId,
      nombre: servicio.nombre, descripcion: servicio.descripcion, fechaInicio: fecha, fechaFin: fecha, horasEstimadas: 0,
      esHito: true, catalogoServicioId: servicio.id, recursoId: servicio.recursoId, responsableId, orden: 0, updatedAt: ahora,
    } })
  })
  await recalcularPadresPostOperacion(PROYECTO_ID, 'tarea', tareaId)
  console.log('OK')
}

main().catch((e) => { console.error(e); process.exitCode = 1 }).finally(() => prisma.$disconnect())
