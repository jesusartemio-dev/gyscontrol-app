import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const result = await prisma.tipoAusencia.update({
    where: { codigo: 'COMP_HE' },
    data: { activo: false },
  })
  console.log(`✅ ${result.codigo} marcado como inactivo`)
  console.log('   Razón: pendiente construir flujo de cálculo de HE desde RegistroHoras')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => prisma.$disconnect())
