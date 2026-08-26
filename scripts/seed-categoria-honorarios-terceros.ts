// 📁 Archivo: scripts/seed-categoria-honorarios-terceros.ts
// 🔧 Descripción: Crea la CategoriaGasto "Honorarios Terceros" que usa el
//                 endpoint POST /api/hoja-de-gastos/pago-terceros para
//                 clasificar las líneas de la liquidación.
//
// Uso:
//   npx dotenv -e .env.production -o -- npx tsx scripts/seed-categoria-honorarios-terceros.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const NOMBRE = 'Honorarios Terceros'

async function main() {
  const existente = await prisma.categoriaGasto.findFirst({
    where: { nombre: { equals: NOMBRE, mode: 'insensitive' } },
  })
  if (existente) {
    console.log(`Ya existe: "${existente.nombre}" (${existente.id})`)
    return
  }

  const creada = await prisma.categoriaGasto.create({
    data: {
      nombre: NOMBRE,
      descripcion: 'Pago por día a personal eventual/tercero, generado desde la liquidación de terceros',
    },
  })
  console.log(`✔ Creada: "${creada.nombre}" (${creada.id})`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
