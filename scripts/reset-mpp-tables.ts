import { prisma } from '../src/lib/prisma'

async function main() {
  console.log('Truncando tablas MPP en cascada...')

  // Cascade: mpp_item → mpp → ok; mpp_epp_catalogo ← mpp_item (via FK)
  // Orden correcto: primero los hijos, luego los padres
  await prisma.$executeRaw`TRUNCATE TABLE mpp_generacion CASCADE`
  await prisma.$executeRaw`TRUNCATE TABLE mpp_item CASCADE`
  await prisma.$executeRaw`TRUNCATE TABLE mpp CASCADE`
  await prisma.$executeRaw`TRUNCATE TABLE mpp_epp_catalogo CASCADE`

  console.log('✅ Tablas MPP vaciadas. Ahora podés correr db push.')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
