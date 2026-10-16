/**
 * Catálogo: fase transversal "GESTION Y CONTROL" con el EDT CTL, y PRO a la fase PROCURA.
 *  1. Fase GESTION Y CONTROL (orden 1); INGENIERIA, PROCURA, EJECUCION, CIERRE, INTERNO se corren +1.
 *  2. EDT CTL "Control y Seguimiento" en esa fase.
 *  3. EDT PRO → fase PROCURA.
 *  4. GES: descripción "Planificación del Proyecto".
 *  5. Servicios [Seguimiento] de GES → CTL, menos "Envío y Aprobación de Documentos",
 *     que se queda en GES con la etiqueta [Documentos].
 * Solo cambia el catálogo: proyectos y cotizaciones existentes tienen sus propias copias.
 * Idempotente. Uso: npx dotenv -e .env.production -o -- npx tsx scripts/catalogo-fase-gestion-control.ts [--aplicar]
 */
import fs from 'fs'
import { randomUUID } from 'crypto'
import { prisma } from '../src/lib/prisma'

const APLICAR = process.argv.includes('--aplicar')
const FASE = 'GESTION Y CONTROL'
const QUEDA_EN_GES = 'Envío y Aprobación de Documentos'

async function main() {
  const fases = await prisma.faseDefault.findMany({ orderBy: { orden: 'asc' } })
  const edts = await prisma.edt.findMany({ where: { nombre: { in: ['GES', 'PRO', 'CTL'] } } })
  const ges = edts.find(e => e.nombre === 'GES')!
  const pro = edts.find(e => e.nombre === 'PRO')!
  const procura = fases.find(f => f.nombre === 'PROCURA')!
  const servicios = await prisma.catalogoServicio.findMany({
    where: { categoriaId: ges.id, actividadTag: { has: 'Seguimiento' } },
    select: { id: true, nombre: true, descripcion: true, actividadTag: true, categoriaId: true },
  })

  const existente = fases.find(f => f.nombre === FASE)
  const ordenNuevo: { nombre: string; antes: number; despues: number }[] = []
  if (!existente) for (const f of fases) if (f.orden >= 1) ordenNuevo.push({ nombre: f.nombre, antes: f.orden, despues: f.orden + 1 })

  console.log('FASES')
  console.log(existente ? `  ${FASE} ya existe (orden ${existente.orden})` : `  + ${FASE} (orden 1)`)
  for (const o of ordenNuevo) console.log(`  ${o.nombre}: orden ${o.antes} → ${o.despues}`)
  console.log('EDTS')
  console.log(edts.find(e => e.nombre === 'CTL') ? '  CTL ya existe' : `  + CTL "Control y Seguimiento" → ${FASE}`)
  console.log(`  PRO: fase ${fases.find(f => f.id === pro.faseDefaultId)?.nombre} → PROCURA`)
  console.log(`  GES: descripción "${ges.descripcion}" → "Planificación del Proyecto"`)
  console.log('SERVICIOS')
  for (const s of servicios) {
    console.log(s.nombre === QUEDA_EN_GES ? `  = ${s.nombre}: se queda en GES, etiqueta [Seguimiento] → [Documentos]` : `  → ${s.nombre}: GES → CTL`)
  }
  if (!APLICAR) { console.log('\nVista previa. Para aplicar: --aplicar'); return }

  fs.writeFileSync(`scripts/respaldo-catalogo-fase-gestion-control-${new Date().toISOString().replace(/[:.]/g, '-')}.json`,
    JSON.stringify({ fases, edts, servicios }, null, 2))
  const ahora = new Date()
  await prisma.$transaction(async (tx) => {
    let fase = existente
    if (!fase) {
      for (const o of [...ordenNuevo].reverse()) await tx.faseDefault.update({ where: { nombre: o.nombre }, data: { orden: o.despues, updatedAt: ahora } })
      fase = await tx.faseDefault.create({
        data: {
          id: randomUUID(), nombre: FASE, orden: 1, activo: true, duracionDias: 30, color: '#0ea5e9', updatedAt: ahora,
          descripcion: 'Control y seguimiento transversal del proyecto: reuniones y reportes semanales de avance, valorizaciones y conformidades. Va desde el fin de la planificación hasta el fin de la ejecución.',
        },
      })
    }
    let ctl = edts.find(e => e.nombre === 'CTL')
    if (!ctl) ctl = await tx.edt.create({ data: { nombre: 'CTL', descripcion: 'Control y Seguimiento', faseDefaultId: fase.id, orden: 0 } })
    else await tx.edt.update({ where: { id: ctl.id }, data: { faseDefaultId: fase.id } })
    await tx.edt.update({ where: { id: pro.id }, data: { faseDefaultId: procura.id } })
    await tx.edt.update({ where: { id: ges.id }, data: { descripcion: 'Planificación del Proyecto' } })
    for (const s of servicios) {
      if (s.nombre === QUEDA_EN_GES) {
        await tx.catalogoServicio.update({ where: { id: s.id }, data: {
          actividadTag: s.actividadTag.map(t => (t === 'Seguimiento' ? 'Documentos' : t)),
          descripcion: s.descripcion.replace('[Seguimiento]', '[Documentos]'),
          updatedAt: ahora,
        } })
      } else {
        await tx.catalogoServicio.update({ where: { id: s.id }, data: { categoriaId: ctl.id, updatedAt: ahora } })
      }
    }
  })
  console.log('\nAplicado.')
}
main().finally(() => prisma.$disconnect())
