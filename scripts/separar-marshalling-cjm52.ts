/**
 * Separa de CJM52-LST-001 los materiales de armado del tablero.
 *
 * La lista traía los equipos y los materiales de marshalling juntos. Son dos
 * compras distintas: los equipos se cotizan por marca y modelo, y los
 * materiales de armado se piden por metro y por unidad, casi siempre a otro
 * proveedor.
 *
 * Usa el mismo `dividirLista` que el botón de la app, que es lo que hace
 * falta acá: al mover los nueve materiales que desglosan el "MV" cotizado,
 * traslada el registro de desglose a la parte nueva y lo quita de la original
 * si no le queda ninguno. Moviendo las filas a mano eso se rompía.
 *
 *   npx dotenv -e .env.production -o -- npx tsx scripts/separar-marshalling-cjm52.ts --dry
 *   npx dotenv -e .env.production -o -- npx tsx scripts/separar-marshalling-cjm52.ts
 */
import { prisma } from '../src/lib/prisma'
import { dividirLista } from '../src/lib/services/dividirListaEquipo'

const DRY = process.argv.includes('--dry')

const LISTA_CODIGO = 'CJM52-LST-001'
const NOMBRE_PARTE = 'TABLEROS DE COMUNICACIÓN — MARSHALLING Y ARMADO'

/**
 * Lo que se va a la parte nueva: todo lo que se usa para equipar el tablero
 * por dentro. Los equipos —armario, llave, fuente, ODF y su patch cord— se
 * quedan en la original.
 */
const A_MARSHALLING = [
  'AX 1485.200',            // ángulos del armario
  '1485.300',               // tornillos de montaje interior
  'CHASIS-GALV-AX-400X600', // chasis
  '35150250',               // base de riel DIN del ODF
  'TB1-BORNERA-JGO',
  'BARRA-PE-8P',
  'CANALETA-25X40',
  'RIEL-DIN-35X7.5',
  'PRENSAESTOPA-M25',
  'PRENSAESTOPA-M16',
  'KIT-PAT-ARMADURA-FO',
  'BASE-CINTILLO',
  'PLACA-ACRILICA-ID',
]

async function main() {
  const lista = await prisma.listaEquipo.findFirst({
    where: { codigo: LISTA_CODIGO },
    select: { id: true, nombre: true, estado: true, responsableId: true },
  })
  if (!lista) throw new Error(`No existe ${LISTA_CODIGO}`)

  const items = await prisma.listaEquipoItem.findMany({
    where: { listaId: lista.id },
    select: { id: true, codigo: true, descripcion: true, cantidad: true, unidad: true },
    orderBy: { orden: 'asc' },
  })

  const porCodigo = new Map(items.map(i => [i.codigo, i]))
  const faltantes = A_MARSHALLING.filter(c => !porCodigo.has(c))
  if (faltantes.length) throw new Error(`No están en la lista: ${faltantes.join(', ')}`)

  const mover = A_MARSHALLING.map(c => porCodigo.get(c)!)
  const quedan = items.filter(i => !A_MARSHALLING.includes(i.codigo))

  console.log(`${LISTA_CODIGO} — ${lista.nombre} (${lista.estado})\n`)
  console.log(`Se queda en ${LISTA_CODIGO} (${quedan.length}):`)
  for (const i of quedan) {
    console.log(`  ${i.codigo.padEnd(24)} ${String(i.cantidad).padStart(5)} ${i.unidad}`)
  }
  console.log(`\nSe va a la parte nueva (${mover.length}):`)
  for (const i of mover) {
    console.log(`  ${i.codigo.padEnd(24)} ${String(i.cantidad).padStart(5)} ${i.unidad}`)
  }

  if (DRY) {
    console.log('\nSimulación. Para aplicar, quita --dry')
    return
  }

  const nueva = await dividirLista({
    listaId: lista.id,
    itemIds: mover.map(i => i.id),
    nombre: NOMBRE_PARTE,
    usuarioId: lista.responsableId,
  })

  console.log(`\nCreada ${nueva.codigo} — ${nueva.nombre}`)
}

main()
  .catch(e => { console.error(e instanceof Error ? e.message : e); process.exit(1) })
  .finally(() => prisma.$disconnect())
