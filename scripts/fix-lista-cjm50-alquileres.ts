/**
 * Enlaza los ítems de la lista CJM50-LST-008 (Alquiler de Andamios y Manlift)
 * al catálogo de ALQUILERES.
 *
 * Estaban como `tipoItem = servicio`, categoría "ALQUILER" (texto libre),
 * código "POR DEFINIR", sin catalogoEquipoId y con presupuesto 0 — o sea, la
 * lista no valía nada y el andamio no se podía pedir. Los tres ítems ya tienen
 * su equivalente en el catálogo, así que se enlazan igual que quedó
 * CJM51-LST-010.
 *
 * El manlift se cobra por día: la cantidad pasa de 1 a 3 (días confirmados).
 *
 *   npx dotenv -e .env.production -o -- npx tsx scripts/fix-lista-cjm50-alquileres.ts --dry
 *   npx dotenv -e .env.production -o -- npx tsx scripts/fix-lista-cjm50-alquileres.ts
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const DRY = process.argv.includes('--dry')

const LISTA_ID = '137142c9-9547-4c81-854a-e56f9fe52779'

/**
 * Se identifica el ítem por la descripción que tenía antes de enlazarse, o por
 * el código que tiene ahora — así el script se puede volver a correr para
 * cambiar un enlace sin depender de en qué paso quedó la lista.
 */
const MAPEO: Array<{
  identificaPor: string[]
  codigoCatalogo: string
  cantidad?: number
}> = [
  {
    identificaPor: ['ALQUILER Y ARMADO DE ANDAMIO MULTICUERPO DE 10 CUERPOS', 'ALQ-AND-TORRE-10C-ARMADO'],
    codigoCatalogo: 'ALQ-AND-TORRE-10C-ARMADO',
  },
  {
    identificaPor: ['ALQUILER DE ANDAMIO DE 1 CUERPO', 'ALQ-AND-LAYHER-F-1C-109X157'],
    codigoCatalogo: 'ALQ-AND-LAYHER-F-1C-109X157',
  },
  {
    // En CJM50 el manlift tiene que ir con operador: el genérico ALQ-MANLIFT-DIA
    // es un 45 ft que se alquila pelado.
    identificaPor: ['ALQUILER DE MANLIFT', 'ALQ-MANLIFT-DIA', 'ALQ-MANLIFT-ART-60FT-OP-DIA'],
    codigoCatalogo: 'ALQ-MANLIFT-ART-60FT-OP-DIA',
    cantidad: 3, // se cobra por día
  },
]

async function main() {
  console.log(DRY ? '[DRY RUN]\n' : '')

  const lista = await prisma.listaEquipo.findUnique({
    where: { id: LISTA_ID },
    include: { listaEquipoItem: true },
  })
  if (!lista) throw new Error(`No existe la lista ${LISTA_ID}`)
  console.log(`Lista ${lista.codigo} — ${lista.nombre}\n`)

  for (const m of MAPEO) {
    const item = lista.listaEquipoItem.find(
      i => m.identificaPor.includes(i.descripcion) || m.identificaPor.includes(i.codigo)
    )
    if (!item) {
      console.log(`  ! no se encontró el ítem de ${m.codigoCatalogo} — se salta`)
      continue
    }

    const cat = await prisma.catalogoEquipo.findUnique({
      where: { codigo: m.codigoCatalogo },
      include: { unidad: true, categoriaEquipo: true },
    })
    if (!cat) {
      console.log(`  ! no existe en el catálogo ${m.codigoCatalogo} — se salta`)
      continue
    }

    const cantidad = m.cantidad ?? item.cantidad

    console.log(`  ${DRY ? '~' : '+'} ${item.codigo} → ${cat.codigo}`)
    console.log(`      tipoItem  ${item.tipoItem} → equipo`)
    console.log(`      categoria ${item.categoria} → ${cat.categoriaEquipo.nombre}`)
    console.log(`      unidad    ${item.unidad} → ${cat.unidad.nombre}`)
    console.log(`      cantidad  ${item.cantidad} → ${cantidad}`)
    console.log(`      presup.   ${item.presupuesto} → ${cat.precioVenta}`)
    console.log(`      desc.     ${cat.descripcion}`)

    if (!DRY) {
      await prisma.listaEquipoItem.update({
        where: { id: item.id },
        data: {
          catalogoEquipoId: cat.id,
          codigo: cat.codigo,
          descripcion: cat.descripcion,
          categoria: cat.categoriaEquipo.nombre,
          tipoItem: 'equipo',
          unidad: cat.unidad.nombre,
          marca: cat.marca,
          cantidad,
          presupuesto: cat.precioVenta,
        },
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
