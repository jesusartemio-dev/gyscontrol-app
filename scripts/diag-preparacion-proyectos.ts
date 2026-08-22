import { prisma } from '@/lib/prisma'

// 1. Clasifica cada proyecto según lo lejos que llegó su configuración de cronograma.
// 2. Comprueba si las horas de jornadas ABIERTAS se están colando en el consumo.
// Read-only.

type Estado =
  | 'sin planificacion'
  | 'planificacion sin baseline'
  | 'sin ejecucion'
  | 'ejecucion sin tareas'
  | 'tareas sin fase'
  | 'listo'

async function main() {
  const proyectos = await prisma.proyecto.findMany({
    select: { id: true, codigo: true, nombre: true, estado: true },
    orderBy: { codigo: 'asc' },
  })

  const filas: { proyecto: string; estadoProy: string; diagnostico: Estado; tareas: number; detalle: string }[] = []

  for (const p of proyectos) {
    const cronos = await prisma.proyectoCronograma.findMany({
      where: { proyectoId: p.id },
      select: { id: true, tipo: true, esBaseline: true },
    })
    const plan = cronos.filter((c) => c.tipo === 'planificacion')
    const baseline = plan.filter((c) => c.esBaseline)
    const ejec = cronos.filter((c) => c.tipo === 'ejecucion')

    // Cada dimensión se mira por separado: hay proyectos SIN planificación que igual
    // tienen cronograma de ejecución con tareas (los GYS.*), así que la cascada estricta
    // "sin plan → sin ejecución → sin tareas" no es cierta y clasificarla así engaña.
    let tareas = 0
    let sinFase = 0
    if (ejec.length > 0) {
      const t = await prisma.proyectoTarea.findMany({
        where: { proyectoCronogramaId: ejec[0].id },
        select: { proyectoEdt: { select: { proyectoFaseId: true } } },
      })
      tareas = t.length
      sinFase = t.filter((x) => !x.proyectoEdt?.proyectoFaseId).length
    }

    let diagnostico: Estado
    let detalle = ''
    if (ejec.length === 0) {
      if (plan.length === 0) {
        diagnostico = 'sin planificacion'
        detalle = 'sin cronograma alguno: nada que imputar en jornadas ni timesheets'
      } else if (baseline.length === 0) {
        diagnostico = 'planificacion sin baseline'
        detalle = `${plan.length} cronograma(s) de planificación, ninguno marcado como línea base`
      } else {
        diagnostico = 'sin ejecucion'
        detalle = 'hay línea base pero no se generó el cronograma de ejecución'
      }
    } else if (tareas === 0) {
      diagnostico = 'ejecucion sin tareas'
      detalle = 'cronograma de ejecución vacío: nada que imputar'
    } else if (sinFase === tareas) {
      diagnostico = 'tareas sin fase'
      detalle = `${tareas} tareas, ninguna cuelga de una fase → no puntúan en el avance` +
        (plan.length === 0 ? '; además no hay línea base para comparar' : '')
    } else if (plan.length === 0) {
      diagnostico = 'sin planificacion'
      detalle = `${tareas} tareas en ejecución, pero sin línea base: la curva Real sí sale, la de Plan no`
    } else if (baseline.length === 0) {
      diagnostico = 'planificacion sin baseline'
      detalle = 'hay planificación pero ninguna marcada como línea base: la curva Plan no se dibuja'
    } else {
      diagnostico = 'listo'
      detalle = sinFase > 0 ? `${sinFase} de ${tareas} tareas sin fase (no puntúan)` : ''
    }

    filas.push({ proyecto: p.codigo, estadoProy: p.estado, diagnostico, tareas, detalle })
  }

  console.log('=== PREPARACIÓN DEL CRONOGRAMA POR PROYECTO ===\n')
  const orden: Estado[] = ['sin planificacion', 'planificacion sin baseline', 'sin ejecucion', 'ejecucion sin tareas', 'tareas sin fase', 'listo']
  for (const d of orden) {
    const g = filas.filter((f) => f.diagnostico === d)
    if (g.length === 0) continue
    console.log(`\n── ${d.toUpperCase()} (${g.length}) ──`)
    console.table(g.map((f) => ({ proyecto: f.proyecto, estado: f.estadoProy, tareas: f.tareas, detalle: f.detalle })))
  }

  console.log('\n\n=== ¿LAS HORAS DE JORNADAS ABIERTAS ENTRAN EN EL CONSUMO? ===\n')
  // El servicio suma RegistroHorasCampoMiembro con registroHorasId NULL. Esas filas existen
  // desde que se añade a alguien a la jornada, o sea también mientras está 'iniciado'.
  const abiertas = await prisma.registroHorasCampo.findMany({
    where: { estado: 'iniciado' },
    select: {
      fechaTrabajo: true,
      proyecto: { select: { codigo: true } },
      tareas: {
        select: {
          proyectoTareaId: true,
          miembros: { select: { horas: true, registroHorasId: true } },
        },
      },
    },
  })
  const filasAb = abiertas.map((j) => {
    const conTarea = j.tareas.filter((t) => t.proyectoTareaId)
    const horas = conTarea.reduce((s, t) => s + t.miembros.reduce((a, m) => a + m.horas, 0), 0)
    const sinConvertir = conTarea.reduce(
      (s, t) => s + t.miembros.filter((m) => !m.registroHorasId).reduce((a, m) => a + m.horas, 0), 0)
    return {
      proyecto: j.proyecto.codigo,
      fechaTrabajo: j.fechaTrabajo.toISOString().slice(0, 10),
      'tareas ligadas': conTarea.length,
      'horas cargadas': horas,
      'horas que SÍ cuenta el consumo': sinConvertir,
    }
  })
  console.table(filasAb)
  const total = filasAb.reduce((s, f) => s + f['horas que SÍ cuenta el consumo'], 0)
  console.log(`\nTotal de horas de jornadas ABIERTAS que el consumo ya está contando: ${total}`)
  console.log('(horasReales de la tarea NO las tiene: solo se incrementa al cerrar la jornada)')
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1 })
  .finally(() => prisma.$disconnect())
