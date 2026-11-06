import { prisma } from '../src/lib/prisma'

// Catálogo de servicios: los 3 servicios de habilitación de personal (tag
// "Habilitacion") pasan del EDT SSO (Seguimiento de Seguridad) al EDT SEG
// (Planificación de Seguridad), después de "Envío y Aprobación de Documentos
// HSE". El generador los agrupa en la actividad "Habilitación de Personal" de SEG.
// Por defecto simula; con --apply escribe.

const APPLY = process.argv.includes('--apply')
const EDT_SEG = '8f35cf6b-ae3f-4da0-aa08-a8795c9cb3eb'
const EDT_SSO = 'cmvagdkyl0001l8p4efjz8n4j'

async function main() {
  console.log(APPLY ? '*** MODO APPLY ***' : '--- simulación (usar --apply para escribir) ---')
  const servicios = await prisma.catalogoServicio.findMany({
    where: { categoriaId: EDT_SSO, actividadTag: { has: 'Habilitacion' } },
    orderBy: { orden: 'asc' },
  })
  if (servicios.length !== 3) throw new Error(`Se esperaban 3 servicios, hay ${servicios.length}`)
  const maxSeg = await prisma.catalogoServicio.aggregate({ where: { categoriaId: EDT_SEG }, _max: { orden: true } })
  const base = (maxSeg._max.orden ?? 0) + 1
  servicios.forEach((s, i) => console.log(`${s.nombre}: SSO [${s.orden}] → SEG [${base + i}]`))
  if (!APPLY) return
  const ahora = new Date()
  await prisma.$transaction(servicios.map((s, i) => prisma.catalogoServicio.update({ where: { id: s.id }, data: { categoriaId: EDT_SEG, orden: base + i, updatedAt: ahora } })))
  console.log('OK')
}

main().catch((e) => { console.error(e); process.exitCode = 1 }).finally(() => prisma.$disconnect())
