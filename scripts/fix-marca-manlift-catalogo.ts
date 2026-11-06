/**
 * Saca el modelo y los equivalentes del campo `marca` de ALQ-MANLIFT-ART-60FT-OP-DIA
 * y los pasa a la descripción.
 *
 * `marca` alimenta el filtro de marca del catálogo, que se arma con los valores
 * distintos del campo. Con "GENIE Z-62/40 (O EQUIVALENTE: Z-60/37 FE, JLG 600AJ)"
 * adentro, el ítem aparece como una marca propia en vez de agrupar bajo GENIE.
 * De 2892 ítems del catálogo solo 3 tenían el campo así.
 *
 * Sincroniza también los ítems de lista que apuntan a ese catálogo, que llevan
 * copia de código, descripción y marca.
 *
 *   npx dotenv -e .env.production -o -- npx tsx scripts/fix-marca-manlift-catalogo.ts --dry
 *   npx dotenv -e .env.production -o -- npx tsx scripts/fix-marca-manlift-catalogo.ts
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const DRY = process.argv.includes('--dry')

const CODIGO = 'ALQ-MANLIFT-ART-60FT-OP-DIA'
const MARCA = 'GENIE'
const DESCRIPCION =
  'ALQUILER PLATAFORMA ELEVADORA BRAZO ARTICULADO 60 FT (ALT. PLATAFORMA 18 M / TRABAJO 20 M, ' +
  'ALCANCE HORIZ. MIN. 11 M, CANASTILLA 230 KG), DIESEL 4X4 - INCLUYE OPERADOR CERTIFICADO, ' +
  'TRASLADO Y CERTIFICADO DE OPERATIVIDAD VIGENTE - POR DIA - REF. Z-62/40 O EQUIVALENTE ' +
  '(GENIE Z-60/37 FE, JLG 600AJ)'

async function main() {
  console.log(DRY ? '[DRY RUN]\n' : '')

  const cat = await prisma.catalogoEquipo.findUnique({ where: { codigo: CODIGO } })
  if (!cat) throw new Error(`No existe ${CODIGO} en el catálogo`)

  console.log('Catálogo:')
  console.log(`  marca       "${cat.marca}" → "${MARCA}"`)
  console.log(`  descripcion ${cat.descripcion.length} → ${DESCRIPCION.length} caracteres`)
  console.log(`              ${DESCRIPCION}`)

  if (!DRY) {
    await prisma.catalogoEquipo.update({
      where: { id: cat.id },
      data: { marca: MARCA, descripcion: DESCRIPCION, updatedAt: new Date() },
    })
  }

  const items = await prisma.listaEquipoItem.findMany({
    where: { catalogoEquipoId: cat.id },
    select: { id: true, marca: true, listaEquipo: { select: { codigo: true } } },
  })
  console.log(`\nÍtems de lista enlazados: ${items.length}`)
  for (const it of items) {
    console.log(`  ${DRY ? '~' : '+'} ${it.listaEquipo.codigo} — marca "${it.marca}" → "${MARCA}"`)
    if (!DRY) {
      await prisma.listaEquipoItem.update({
        where: { id: it.id },
        data: { marca: MARCA, descripcion: DESCRIPCION },
      })
    }
  }

  console.log(DRY ? '\nNada escrito.' : '\nListo.')
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
