import { prisma } from '../src/lib/prisma'

// Catálogo: desfases de los hitos de valorización como se programan a mano:
// Elaboración → Aprobación +1d → Recepción de Conformidad HES +2d (cada hito
// cuenta desde la tarea anterior del ciclo; ver construirEstructuraReal).
// Por defecto simula; con --apply escribe.

const APPLY = process.argv.includes('--apply')
const CAMBIOS = [
  { id: 'e86fc385', nombre: 'Aprobación de Valorización', de: 'Hito+2d', a: 'Hito+1d' },
  { id: '1aeb4c1d', nombre: 'Recepción de Conformidad HES', de: 'Hito+5d', a: 'Hito+2d' },
]

async function main() {
  console.log(APPLY ? '*** MODO APPLY ***' : '--- simulación (usar --apply para escribir) ---')
  for (const c of CAMBIOS) {
    const s = await prisma.catalogoServicio.findFirstOrThrow({ where: { id: { startsWith: c.id }, nombre: c.nombre } })
    if (!s.actividadTag.includes(c.de)) throw new Error(`${s.nombre}: no tiene ${c.de} (${JSON.stringify(s.actividadTag)})`)
    const tags = s.actividadTag.map((t) => (t === c.de ? c.a : t))
    console.log(`${s.nombre}: ${JSON.stringify(s.actividadTag)} → ${JSON.stringify(tags)}`)
    if (APPLY) await prisma.catalogoServicio.update({ where: { id: s.id }, data: { actividadTag: tags, updatedAt: new Date() } })
  }
}

main().catch((e) => { console.error(e); process.exitCode = 1 }).finally(() => prisma.$disconnect())
