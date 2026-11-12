// ===================================================
// 📁 fusionar-controles-sueltos-iperc.ts
// 📌 Los controles del catálogo que quedaron sin grupo son duplicados.
//
// Al importar las hojas del Excel, los controles quedaron colgados de su grupo
// (el peligro-riesgo de la hoja). Los 13 que quedaron sin grupo vienen del
// catálogo viejo que estaba escrito en el código, y cada uno tiene su gemelo
// dentro de un grupo: mismo control, redacción distinta. El del Excel trae las
// erratas de la hoja ("manteniemiento", "a10 minutos", "permisibles de
// permisibles"); el suelto es la versión limpia.
//
// Así que no hay nada que asignar: hay que fusionar. Se conserva el grupo —que
// es lo que el Excel dice— y la redacción limpia, y se borra el duplicado.
//
// Importa qué texto queda: la procedencia de un control se decide comparando
// su texto con el del catálogo, y la comparación no perdona erratas. De los 13,
// 9 ya están usados en IPERC generados con la redacción limpia: si se quedara
// la del Excel, esos 9 dejarían de contar como criterio de la empresa y
// pasarían a verse como propuesta de la IA.
//
// Uso:
//   npx dotenv -e .env.production -o -- npx tsx scripts/fusionar-controles-sueltos-iperc.ts
//   ... --aplicar
// ===================================================

import { prisma } from '../src/lib/prisma'

const APLICAR = process.argv.includes('--aplicar')

/** Debajo de esto no se considera el mismo control y se deja para revisión. */
const UMBRAL = 0.55

const normalizar = (t: string) =>
  t.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9ñ\s]/g, ' ').replace(/\s+/g, ' ').trim()

/** Palabras que aparecen en casi todo control y no distinguen nada. */
const VACIAS = new Set([
  'de', 'la', 'el', 'los', 'las', 'en', 'y', 'a', 'con', 'para', 'del', 'al',
  'un', 'una', 'o', 'que', 'se', 'por', 'su', 'sus', 'lo',
])

const fichas = (t: string) =>
  new Set(normalizar(t).split(' ').filter(p => p.length > 1 && !VACIAS.has(p)))

/** Jaccard sobre palabras: cuánto comparten dos redacciones del mismo control. */
function parecido(a: string, b: string): number {
  const x = fichas(a)
  const y = fichas(b)
  if (x.size === 0 || y.size === 0) return 0
  let comunes = 0
  for (const p of x) if (y.has(p)) comunes++
  return comunes / (x.size + y.size - comunes)
}

async function main() {
  const sueltos = await prisma.ipercCatalogoControl.findMany({
    where: { grupoId: null },
    orderBy: [{ tipoPeligro: 'asc' }, { jerarquia: 'asc' }],
  })
  const agrupados = await prisma.ipercCatalogoControl.findMany({
    where: { grupoId: { not: null } },
    include: { grupo: { select: { numero: true, descripcionPeligro: true } } },
  })

  console.log(`Sueltos: ${sueltos.length} · agrupados: ${agrupados.length}\n`)

  const pares: Array<{ suelto: (typeof sueltos)[number]; gemelo: (typeof agrupados)[number]; score: number }> = []
  const huerfanos: typeof sueltos = []

  for (const s of sueltos) {
    // Mismo tipo de peligro y misma jerarquía: un control de ingeniería no es
    // el gemelo de uno administrativo aunque digan algo parecido.
    const candidatos = agrupados
      .filter(g => g.tipoPeligro === s.tipoPeligro && g.jerarquia === s.jerarquia)
      .map(g => ({ g, score: parecido(s.texto, g.texto) }))
      .sort((a, b) => b.score - a.score)

    const mejor = candidatos[0]
    if (!mejor || mejor.score < UMBRAL) {
      huerfanos.push(s)
      console.log(`SIN GEMELO  [${s.tipoPeligro} · ${s.jerarquia}] ${s.texto.slice(0, 70)}`)
      if (mejor) console.log(`            mejor candidato ${(mejor.score * 100).toFixed(0)}%: ${mejor.g.texto.slice(0, 70)}`)
      continue
    }
    pares.push({ suelto: s, gemelo: mejor.g, score: mejor.score })
    console.log(`#${String(mejor.g.grupo!.numero).padStart(2)} ${(mejor.score * 100).toFixed(0)}%  ${s.tipoPeligro} · ${s.jerarquia}`)
    console.log(`     queda : ${s.texto}`)
    console.log(`     se va : ${mejor.g.texto}`)
  }

  console.log(`\nFusionables: ${pares.length} · sin gemelo: ${huerfanos.length}`)

  // Un gemelo elegido dos veces sería un empate que hay que mirar a mano.
  const repetidos = pares.map(p => p.gemelo.id).filter((id, i, xs) => xs.indexOf(id) !== i)
  if (repetidos.length > 0) {
    console.log(`\n⚠ ${repetidos.length} gemelo(s) elegidos por más de un suelto. No se aplica nada.`)
    return
  }

  if (!APLICAR) {
    console.log('\nSimulación. Para aplicar: --aplicar')
    return
  }

  for (const { suelto, gemelo } of pares) {
    // El borrado va primero: (tipoPeligro, jerarquia, texto) es único, y el
    // gemelo no puede tomar el texto limpio mientras el suelto lo ocupe.
    await prisma.$transaction([
      prisma.ipercCatalogoControl.delete({ where: { id: suelto.id } }),
      prisma.ipercCatalogoControl.update({
        where: { id: gemelo.id },
        data: { texto: suelto.texto },
      }),
    ])
    console.log(`✓ #${gemelo.grupo!.numero} ${suelto.texto.slice(0, 60)}`)
  }

  const quedan = await prisma.ipercCatalogoControl.count({ where: { grupoId: null } })
  console.log(`\nListo. Controles sin grupo que quedan: ${quedan}`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
