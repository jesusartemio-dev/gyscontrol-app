import { prisma } from '@/lib/prisma'
import { hh } from '@/lib/services/horasHombre'

// ¿Las tareas extra ([EXTRA]) entran en la curva S? ¿Y por qué hay EDT sin fase?
// Read-only.

async function main() {
  const cronos = await prisma.proyectoCronograma.findMany({
    where: { tipo: 'ejecucion' },
    select: { id: true, proyecto: { select: { codigo: true, esInterno: true } } },
  })

  console.log('=== TAREAS EXTRA POR PROYECTO ===\n')
  const filas = []
  let totalExtra = 0
  for (const c of cronos) {
    const tareas = await prisma.proyectoTarea.findMany({
      where: { proyectoCronogramaId: c.id },
      select: {
        id: true, nombre: true, descripcion: true, horasEstimadas: true,
        personasEstimadas: true, porcentajeCompletado: true, horasReales: true,
        proyectoEdt: { select: { nombre: true, proyectoFaseId: true } },
      },
    })
    const extra = tareas.filter((t) => t.descripcion?.startsWith('[EXTRA]'))
    if (extra.length === 0) continue
    totalExtra += extra.length

    const hhTotal = tareas.reduce((s, t) => s + (t.proyectoEdt?.proyectoFaseId ? hh(t) : 0), 0)
    const hhExtraConFase = extra.reduce((s, t) => s + (t.proyectoEdt?.proyectoFaseId ? hh(t) : 0), 0)

    filas.push({
      proyecto: c.proyecto.codigo,
      interno: c.proyecto.esInterno ? 'sí' : '',
      'tareas extra': extra.length,
      'con fase (cuentan)': extra.filter((t) => t.proyectoEdt?.proyectoFaseId).length,
      'sin fase (no cuentan)': extra.filter((t) => !t.proyectoEdt?.proyectoFaseId).length,
      'con horas>0': extra.filter((t) => Number(t.horasEstimadas ?? 0) > 0).length,
      'peso en la curva': hhTotal > 0 ? `${((hhExtraConFase / hhTotal) * 100).toFixed(1)}%` : '0%',
      'horas reales': extra.reduce((s, t) => s + Number(t.horasReales ?? 0), 0),
    })
  }
  console.table(filas)
  console.log(`Total de tareas [EXTRA] en cronogramas de ejecución: ${totalExtra}`)

  console.log('\n=== DETALLE DE LAS TAREAS EXTRA ===\n')
  for (const c of cronos) {
    const extra = await prisma.proyectoTarea.findMany({
      where: { proyectoCronogramaId: c.id, descripcion: { startsWith: '[EXTRA]' } },
      select: {
        nombre: true, horasEstimadas: true, personasEstimadas: true,
        porcentajeCompletado: true, horasReales: true,
        proyectoEdt: { select: { nombre: true, proyectoFaseId: true, proyectoFase: { select: { nombre: true } } } },
      },
    })
    if (extra.length === 0) continue
    console.log(`── ${c.proyecto.codigo} ──`)
    console.table(extra.map((t) => ({
      tarea: t.nombre.slice(0, 40),
      edt: t.proyectoEdt?.nombre,
      fase: t.proyectoEdt?.proyectoFase?.nombre ?? '(SIN FASE)',
      hhEstim: hh(t),
      pct: t.porcentajeCompletado,
      hReales: Number(t.horasReales ?? 0),
      '¿entra en curva?': t.proyectoEdt?.proyectoFaseId && hh(t) > 0 ? 'SÍ' : 'no',
    })))
  }

  console.log('\n=== EDT SIN FASE (por qué el avance no los cuenta) ===\n')
  const edtsSinFase = await prisma.proyectoEdt.findMany({
    where: { proyectoFaseId: null, proyectoCronograma: { tipo: 'ejecucion' } },
    select: {
      nombre: true,
      proyecto: { select: { codigo: true, esInterno: true } },
      _count: { select: { proyectoTarea: true } },
    },
  })
  console.table(edtsSinFase.map((e) => ({
    proyecto: e.proyecto.codigo,
    interno: e.proyecto.esInterno ? 'sí' : '',
    edt: e.nombre,
    tareas: e._count.proyectoTarea,
  })))

  const totalFases = await prisma.proyectoFase.count({
    where: { proyectoCronograma: { tipo: 'ejecucion' } },
  })
  console.log(`\nFases en cronogramas de ejecución: ${totalFases}`)
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1 })
  .finally(() => prisma.$disconnect())
