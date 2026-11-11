/**
 * Corrige horasPlan de actividades y EDTs que quedaron desfasadas de la suma de
 * sus hijos (p. ej. al eliminar una tarea antes del fix del rollup: el padre se
 * buscaba después de borrar y no se recalculaba). Mismo criterio que el árbol:
 * actividad = suma de horasEstimadas de sus tareas; EDT = suma de horasPlan de
 * sus actividades (solo si tiene actividades).
 *
 * Uso: npx tsx scripts/recalcular-horas-cronograma.ts [CODIGO_PROYECTO] [--apply]
 * Sin --apply solo muestra lo que cambiaría.
 */
import { prisma } from '../src/lib/prisma'

const APPLY = process.argv.includes('--apply')
const codigo = process.argv.slice(2).find(a => !a.startsWith('--'))
const r1 = (n: number) => Math.round(n * 100) / 100

async function main() {
  const proyectos = await prisma.proyecto.findMany({
    where: codigo ? { codigo: { contains: codigo } } : {},
    select: { id: true, codigo: true },
  })
  let totalAct = 0
  let totalEdt = 0
  for (const p of proyectos) {
    const actividades = await prisma.proyectoActividad.findMany({
      where: { proyectoCronograma: { proyectoId: p.id } },
      select: {
        id: true, nombre: true, horasPlan: true, proyectoEdtId: true,
        proyectoCronograma: { select: { tipo: true } },
        proyectoTarea: { select: { horasEstimadas: true } },
      },
    })
    const nuevasAct = new Map<string, number>()
    for (const a of actividades) {
      const actual = Number(a.horasPlan ?? 0)
      // Sin tareas: el rollup del árbol no la toca; aquí tampoco.
      const suma = a.proyectoTarea.length ? r1(a.proyectoTarea.reduce((s, t) => s + Number(t.horasEstimadas ?? 0), 0)) : actual
      nuevasAct.set(a.id, suma)
      if (Math.abs(suma - actual) > 0.001) {
        totalAct++
        console.log(`${p.codigo} [${a.proyectoCronograma.tipo}] ACT ${a.nombre}: ${actual} → ${suma} h`)
        if (APPLY) await prisma.proyectoActividad.update({ where: { id: a.id }, data: { horasPlan: suma, updatedAt: new Date() } })
      }
    }
    const edts = await prisma.proyectoEdt.findMany({
      where: { proyectoId: p.id },
      select: { id: true, nombre: true, horasPlan: true, proyectoCronograma: { select: { tipo: true } } },
    })
    for (const e of edts) {
      const hijas = actividades.filter(a => a.proyectoEdtId === e.id)
      if (!hijas.length) continue
      const suma = r1(hijas.reduce((s, a) => s + (nuevasAct.get(a.id) ?? 0), 0))
      const actual = Number(e.horasPlan ?? 0)
      if (Math.abs(suma - actual) > 0.001) {
        totalEdt++
        console.log(`${p.codigo} [${e.proyectoCronograma.tipo}] EDT ${e.nombre}: ${actual} → ${suma} h`)
        if (APPLY) await prisma.proyectoEdt.update({ where: { id: e.id }, data: { horasPlan: suma, updatedAt: new Date() } })
      }
    }
  }
  console.log(`\n${totalAct} actividades y ${totalEdt} EDTs ${APPLY ? 'corregidos' : 'por corregir (dry-run, usar --apply)'}`)
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
