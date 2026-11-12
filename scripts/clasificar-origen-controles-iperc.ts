/**
 * Marca de dónde salió cada control de los IPERC ya generados y los reordena:
 * primero lo que está en el catálogo de la empresa, después lo que redactó la
 * IA.
 *
 * Todo lo existente se generó antes de que esto existiera, así que se clasifica
 * comparando el texto contra el catálogo: lo que coincide es "catalogo", el
 * resto queda como "ia" — que es la verdad, porque esas filas las escribió la
 * IA. Nada se marca como "manual": no hay forma de saber qué tocó una persona
 * antes de que se registrara.
 *
 *   npx dotenv -e .env.production -o -- npx tsx scripts/clasificar-origen-controles-iperc.ts --dry
 *   npx dotenv -e .env.production -o -- npx tsx scripts/clasificar-origen-controles-iperc.ts
 */
import { PrismaClient } from '@prisma/client'
import {
  clasificarControles, textoOrdenado, CAMPOS_CONTROL,
} from '../src/lib/iperc/origenControles'

const prisma = new PrismaClient()
const DRY = process.argv.includes('--dry')

const normalizar = (t: string) =>
  t.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/\s+/g, ' ').replace(/\.$/, '').trim()

async function main() {
  const catalogoFilas = await prisma.ipercCatalogoControl.findMany({
    where: { activo: true },
    select: { texto: true },
  })
  const catalogo = new Set(catalogoFilas.map(f => normalizar(f.texto)))
  console.log(`${DRY ? '[DRY] ' : ''}Catálogo de controles: ${catalogo.size} textos\n`)

  const filas = await prisma.ipercFila.findMany({
    orderBy: { numero: 'asc' },
    include: { iperc: { select: { codigoDocumento: true } } },
  })

  let cambiadas = 0
  let delCatalogo = 0
  let deIa = 0
  const porDocumento = new Map<string, number>()

  for (const f of filas) {
    const origen = clasificarControles(f as unknown as Record<string, unknown>, catalogo, null, 'ia')

    const data: Record<string, unknown> = { origenControles: origen as object }
    let reordena = false
    for (const campo of CAMPOS_CONTROL) {
      const texto = textoOrdenado(origen[campo] ?? [])
      if (texto !== (f[campo] ?? '')) { data[campo] = texto; reordena = true }
    }

    for (const campo of CAMPOS_CONTROL) {
      for (const i of origen[campo] ?? []) {
        if (i.origen === 'catalogo') delCatalogo++
        else deIa++
      }
    }

    if (!DRY) await prisma.ipercFila.update({ where: { id: f.id }, data })
    cambiadas++
    if (reordena) {
      porDocumento.set(f.iperc.codigoDocumento, (porDocumento.get(f.iperc.codigoDocumento) ?? 0) + 1)
    }
  }

  const total = delCatalogo + deIa
  console.log(`Filas procesadas: ${cambiadas}`)
  console.log(`Controles: ${total} · del catálogo ${delCatalogo} (${Math.round(delCatalogo / total * 100)}%) · redactados por la IA ${deIa}`)
  if (porDocumento.size > 0) {
    console.log('\nFilas que además se reordenan:')
    for (const [doc, n] of porDocumento) console.log(`  ${doc}: ${n}`)
  }
  console.log(DRY ? '\nNada escrito.' : '\nListo.')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
