import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const almacen = await prisma.almacen.upsert({
    where: { id: 'almacen-central' },
    update: {},
    create: {
      id: 'almacen-central',
      nombre: 'Almacén Central',
      activo: true,
    },
  })
  console.log('✅ Almacén Central:', almacen.id, '-', almacen.nombre)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
