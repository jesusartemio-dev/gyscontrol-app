import { prisma } from '@/lib/prisma'

// Detalle completo de la única tarea cuyo % actual no coincide con su último avance
// fechado, para poder auditar qué pasó. Read-only.

async function main() {
  const av = await prisma.proyectoTareaAvance.findMany({
    orderBy: [{ fecha: 'asc' }, { createdAt: 'asc' }],
    select: { proyectoTareaId: true, porcentaje: true, fecha: true, origen: true, createdAt: true, usuarioId: true },
  })
  const ultimo = new Map<string, (typeof av)[number]>()
  for (const a of av) ultimo.set(a.proyectoTareaId, a)

  const tareas = await prisma.proyectoTarea.findMany({
    where: { id: { in: [...ultimo.keys()] } },
    select: {
      id: true, nombre: true, porcentajeCompletado: true, estado: true,
      horasEstimadas: true, personasEstimadas: true, horasReales: true,
      fechaInicio: true, fechaFin: true, fechaFinReal: true, updatedAt: true,
      user: { select: { name: true, email: true } },
      proyectoEdt: {
        select: {
          nombre: true,
          proyectoFase: { select: { nombre: true } },
          proyectoCronograma: { select: { tipo: true, proyecto: { select: { codigo: true, nombre: true } } } },
        },
      },
    },
  })

  const desviadas = tareas.filter((t) => t.porcentajeCompletado !== ultimo.get(t.id)!.porcentaje)
  console.log(`Tareas con % distinto de su último avance fechado: ${desviadas.length}\n`)

  for (const t of desviadas) {
    const u = ultimo.get(t.id)!
    const he = Number(t.horasEstimadas ?? 0)
    const hr = Number(t.horasReales ?? 0)
    console.log('='.repeat(78))
    console.log(`PROYECTO : ${t.proyectoEdt?.proyectoCronograma?.proyecto?.codigo} — ${t.proyectoEdt?.proyectoCronograma?.proyecto?.nombre}`)
    console.log(`FASE     : ${t.proyectoEdt?.proyectoFase?.nombre ?? '(sin fase)'}`)
    console.log(`EDT      : ${t.proyectoEdt?.nombre}`)
    console.log(`TAREA    : ${t.nombre}`)
    console.log(`ID       : ${t.id}`)
    console.log(`Responsable: ${t.user?.name ?? '(sin asignar)'} ${t.user?.email ? `<${t.user.email}>` : ''}`)
    console.log(`\n% ACTUAL en la tarea : ${t.porcentajeCompletado}%  (estado: ${t.estado})`)
    console.log(`% ÚLTIMO FECHADO     : ${u.porcentaje}%  el ${u.fecha.toISOString().slice(0, 10)} (origen ${u.origen})`)
    console.log(`Horas: estimadas ${he} × ${t.personasEstimadas ?? 1} personas = ${he * (t.personasEstimadas ?? 1)} hh | reales ${hr}`)
    console.log(`horasReales/horasEstimadas = ${he > 0 ? Math.min(100, Math.round((hr / he) * 100)) : '—'}%  ← si coincide con el % actual, lo pisó ProgresoService`)
    console.log(`fechaFinReal: ${t.fechaFinReal?.toISOString().slice(0, 10) ?? '—'} | updatedAt: ${t.updatedAt.toISOString().slice(0, 16).replace('T', ' ')}`)

    console.log('\nHistórico fechado completo:')
    const hist = av.filter((a) => a.proyectoTareaId === t.id)
    console.table(hist.map((h) => ({
      fechaEfecto: h.fecha.toISOString().slice(0, 10),
      pct: h.porcentaje,
      origen: h.origen,
      capturado: h.createdAt.toISOString().slice(0, 10),
    })))

    // Jornadas de campo que tocaron la tarea
    const jt = await prisma.registroHorasCampoTarea.findMany({
      where: { proyectoTareaId: t.id },
      select: {
        porcentajeFinal: true,
        registroCampo: {
          select: {
            id: true, fechaTrabajo: true, estado: true, fechaCierre: true, fechaAprobacion: true,
            supervisor: { select: { name: true } },
          },
        },
        miembros: { select: { horas: true, registroHorasId: true } },
      },
    })
    console.log('Jornadas de campo que imputaron a esta tarea:')
    console.table(jt.map((x) => ({
      fechaTrabajo: x.registroCampo.fechaTrabajo.toISOString().slice(0, 10),
      estado: x.registroCampo.estado,
      cerrada: x.registroCampo.fechaCierre?.toISOString().slice(0, 10) ?? '—',
      aprobada: x.registroCampo.fechaAprobacion?.toISOString().slice(0, 10) ?? '—',
      supervisor: x.registroCampo.supervisor?.name ?? '—',
      pctDeclarado: x.porcentajeFinal ?? '—',
      horas: x.miembros.reduce((s, m) => s + m.horas, 0),
      convertidas: x.miembros.filter((m) => m.registroHorasId).length,
    })))

    // Horas de timesheet
    const rh = await prisma.registroHoras.findMany({
      where: { proyectoTareaId: t.id },
      orderBy: { fechaTrabajo: 'asc' },
      select: { fechaTrabajo: true, horasTrabajadas: true, descripcion: true, origen: true, user: { select: { name: true } } },
    })
    console.log(`Registros de horas imputados (${rh.length}):`)
    console.table(rh.map((r) => ({
      fecha: r.fechaTrabajo.toISOString().slice(0, 10),
      horas: Number(r.horasTrabajadas),
      quien: r.user?.name ?? '—', origen: r.origen,
      descripcion: (r.descripcion ?? '').slice(0, 40),
    })))
  }
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1 })
  .finally(() => prisma.$disconnect())
