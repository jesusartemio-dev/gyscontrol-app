/**
 * Renumera las filas de un IPERC según el orden del cronograma de
 * planificación (fase → EDT → actividad → tarea), sin volver a llamar a la IA.
 *
 * Hace falta para los IPERC generados antes de que el renumerado mirara el
 * cronograma completo: al generar un bloque de último, sus filas quedaban
 * arriba de todo lo demás (Comisionamiento antes que Construcción).
 *
 *   npx dotenv -e .env.production -o -- npx tsx scripts/renumerar-iperc.ts <proyectoId> --dry
 *   npx dotenv -e .env.production -o -- npx tsx scripts/renumerar-iperc.ts <proyectoId>
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const DRY = process.argv.includes('--dry')
const proyectoId = process.argv[2]

async function main() {
  if (!proyectoId || proyectoId.startsWith('--')) {
    throw new Error('Uso: renumerar-iperc.ts <proyectoId> [--dry]')
  }

  const iperc = await prisma.iperc.findUnique({
    where: { proyectoId },
    select: { id: true, codigoDocumento: true },
  })
  if (!iperc) throw new Error('El proyecto no tiene IPERC')

  const cronograma = await prisma.proyectoCronograma.findUnique({
    where: { proyectoId_tipo: { proyectoId, tipo: 'planificacion' } },
    select: { id: true },
  })
  if (!cronograma) throw new Error('El proyecto no tiene cronograma de planificación')

  const [fases, edts, actividades, tareas] = await Promise.all([
    prisma.proyectoFase.findMany({
      where: { proyectoCronogramaId: cronograma.id },
      select: { id: true, orden: true },
    }),
    prisma.proyectoEdt.findMany({
      where: { proyectoCronogramaId: cronograma.id },
      select: { id: true, orden: true, proyectoFaseId: true },
    }),
    prisma.proyectoActividad.findMany({
      where: { proyectoCronogramaId: cronograma.id },
      select: { id: true, orden: true },
    }),
    prisma.proyectoTarea.findMany({
      where: { proyectoCronogramaId: cronograma.id },
      select: { id: true, orden: true, proyectoEdtId: true, proyectoActividadId: true },
    }),
  ])

  const faseOrden = new Map(fases.map(f => [f.id, f.orden]))
  const edtMap = new Map(edts.map(e => [e.id, e]))
  const actOrden = new Map(actividades.map(a => [a.id, a.orden]))

  const clave = (t: (typeof tareas)[number]) => {
    const edt = edtMap.get(t.proyectoEdtId)
    const fo = edt?.proyectoFaseId ? faseOrden.get(edt.proyectoFaseId) ?? 9999 : 9999
    return [fo, edt?.orden ?? 9999, t.proyectoActividadId ? actOrden.get(t.proyectoActividadId) ?? 9999 : 9999, t.orden ?? 9999]
  }
  const ordenadas = [...tareas].sort((a, b) => {
    const ka = clave(a), kb = clave(b)
    for (let i = 0; i < ka.length; i++) if (ka[i] !== kb[i]) return ka[i] - kb[i]
    return 0
  })
  const posicionTarea = new Map(ordenadas.map((t, i) => [t.id, i]))

  const filas = await prisma.ipercFila.findMany({
    where: { ipercId: iperc.id },
    select: { id: true, numero: true, tareaCronogramaRefId: true, proceso: true, actividad: true },
  })
  const filasOrdenadas = [...filas].sort((a, b) => {
    const pa = a.tareaCronogramaRefId ? posicionTarea.get(a.tareaCronogramaRefId) ?? 1e9 : 1e9
    const pb = b.tareaCronogramaRefId ? posicionTarea.get(b.tareaCronogramaRefId) ?? 1e9 : 1e9
    return pa !== pb ? pa - pb : a.numero - b.numero
  })

  const cambios = filasOrdenadas
    .map((f, i) => ({ id: f.id, numero: i + 1, antes: f.numero }))
    .filter(c => c.numero !== c.antes)

  console.log(`${DRY ? '[DRY RUN] ' : ''}IPERC ${iperc.codigoDocumento} · ${filas.length} filas · ${cambios.length} cambian de número\n`)
  let prev = ''
  for (const f of filasOrdenadas) {
    const k = `${f.proceso} :: ${f.actividad}`
    if (k !== prev) {
      console.log(`  ${String(filasOrdenadas.indexOf(f) + 1).padStart(4)}  ${k}`)
      prev = k
    }
  }

  if (DRY || cambios.length === 0) {
    console.log(DRY ? '\nNada escrito.' : '\nYa estaba en orden.')
    return
  }

  await prisma.$transaction([
    ...cambios.map(c => prisma.ipercFila.update({ where: { id: c.id }, data: { numero: -c.numero } })),
    ...cambios.map(c => prisma.ipercFila.update({ where: { id: c.id }, data: { numero: c.numero } })),
  ])
  console.log('\nListo.')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
