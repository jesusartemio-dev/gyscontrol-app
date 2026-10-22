/**
 * CJM51 — PRO "Seguimiento y Entrega en Obra": "Traslado N: …" pasa a "Entrega en Obra N: …"
 * y se quitan los hitos "Traslado N: En Obra". Las dependencias que salían de cada hito
 * (hacia CON) pasan a salir de su entrega, así no se pierde ningún vínculo con la obra.
 * Uso: npx dotenv -e .env.production -o -- npx tsx scripts/simplificar-entrega-obra-cjm51.ts [--aplicar]
 */
import fs from 'fs'
import { randomUUID } from 'crypto'
import { prisma } from '../src/lib/prisma'
import { recalcularActividadPadre } from '../src/lib/utils/cronogramaRollup'

const APLICAR = process.argv.includes('--aplicar')
const NOMBRES: Record<number, string> = {
  1: 'Entrega en Obra 1: Cables, Canalización, Soportería, Comunicación',
  2: 'Entrega en Obra 2: Cable Instrumentación, Tablero Botonera, Pulsadores',
  3: 'Entrega en Obra 3: Transmisores y Válvulas',
}

async function main() {
  const act = await prisma.proyectoActividad.findFirstOrThrow({
    where: { nombre: 'Seguimiento y Entrega en Obra', proyectoCronograma: { tipo: 'planificacion', proyecto: { codigo: 'CJM51' } } },
    include: { proyectoTarea: { orderBy: { orden: 'asc' } } },
  })
  const plan = [1, 2, 3].map(n => {
    const traslado = act.proyectoTarea.find(t => t.nombre.startsWith(`Traslado ${n}:`) && !t.esHito)
    const hito = act.proyectoTarea.find(t => t.nombre === `Traslado ${n}: En Obra`)
    if (!traslado || !hito) throw new Error(`Falta el traslado o el hito ${n}`)
    return { n, traslado, hito }
  })
  const deps = await prisma.proyectoDependenciasTarea.findMany({
    where: { tareaOrigenId: { in: plan.map(p => p.hito.id) } },
    include: { tareaDependiente: { select: { nombre: true } } },
  })
  for (const p of plan) {
    const suc = deps.filter(d => d.tareaOrigenId === p.hito.id)
    console.log(`"${p.traslado.nombre}" → "${NOMBRES[p.n]}"`)
    console.log(`   − ◆ ${p.hito.nombre}   (sus sucesoras pasan a la entrega: ${suc.map(d => d.tareaDependiente.nombre).join(', ') || 'ninguna'})`)
  }
  if (!APLICAR) { console.log('\nVista previa. Para aplicar: --aplicar'); return }

  const ahora = new Date()
  fs.writeFileSync(`scripts/respaldo-entrega-obra-CJM51-${ahora.toISOString().replace(/[:.]/g, '-')}.json`, JSON.stringify({ plan, deps }, null, 2))
  await prisma.$transaction(async tx => {
    for (const p of plan) {
      await tx.proyectoTarea.update({ where: { id: p.traslado.id }, data: { nombre: NOMBRES[p.n], updatedAt: ahora } })
      await tx.proyectoDependenciasTarea.createMany({
        data: deps.filter(d => d.tareaOrigenId === p.hito.id).map(d => ({ id: randomUUID(), tareaOrigenId: p.traslado.id, tareaDependienteId: d.tareaDependienteId, tipo: d.tipo, lagMinutos: d.lagMinutos })),
        skipDuplicates: true,
      })
      await tx.proyectoTarea.delete({ where: { id: p.hito.id } }) // borra en cascada sus dependencias
    }
    // Reordenar sin huecos
    const quedan = act.proyectoTarea.filter(t => !plan.some(p => p.hito.id === t.id))
    for (const [i, t] of quedan.entries()) await tx.proyectoTarea.update({ where: { id: t.id }, data: { orden: i } })
  })
  await recalcularActividadPadre(act.id)
  console.log('\nAplicado.')
}
main().finally(() => prisma.$disconnect())
