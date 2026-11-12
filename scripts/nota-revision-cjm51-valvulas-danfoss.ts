/**
 * Notas de revisión (comentarioRevision) de los 3 equipos Danfoss de
 * CJM51-LST-009. No toca nada más. Solo escribe si el comentario está vacío
 * (para no pisar uno puesto a mano), salvo --sobrescribir.
 *
 * Uso: npx tsx scripts/nota-revision-cjm51-valvulas-danfoss.ts [--apply] [--sobrescribir]
 */
import { prisma } from '../src/lib/prisma'

const APPLY = process.argv.includes('--apply')
const SOBRESCRIBIR = process.argv.includes('--sobrescribir')
const LISTA_ID = 'b3dc6b33-c22a-4d4a-b8ea-8ff26f844ba0'

const NOTAS: Record<string, string> = {
  '032U8504': 'Verificado vs ficha Danfoss. Va con bobina 018F7360 y caja G1NU2000. Confirmar fluido de descolmatado (agua/aire OK con EPDM) y presión mín. 0.3 bar (servoaccionada).',
  '018F7360': 'Verificado vs ficha Danfoss. IP65 solo con caja G1NU2000. Confirmar control a 110 VAC.',
  'G1NU2000': 'Verificado vs ficha Danfoss. Caja recomendada para la bobina BB.',
}

async function main() {
  const items = await prisma.listaEquipoItem.findMany({
    where: { listaId: LISTA_ID, codigo: { in: Object.keys(NOTAS) } },
    select: { id: true, codigo: true, comentarioRevision: true },
  })
  for (const it of items) {
    const nota = NOTAS[it.codigo]
    const ocupado = Boolean(it.comentarioRevision?.trim()) && it.comentarioRevision !== nota
    console.log(`${it.codigo}: ${ocupado && !SOBRESCRIBIR ? `YA TIENE NOTA (no se toca): ${it.comentarioRevision}` : nota}`)
    if (APPLY && (!ocupado || SOBRESCRIBIR)) {
      await prisma.listaEquipoItem.update({ where: { id: it.id }, data: { comentarioRevision: nota } })
    }
  }
  console.log(APPLY ? '\nAplicado.' : '\nDry-run: usar --apply')
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
