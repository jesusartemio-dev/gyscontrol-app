import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const result = await prisma.tipoAusencia.update({
    where: { codigo: 'COMP_HE' },
    data: {
      activo: true,
      descuentaSaldo: true,
      diasPorDefecto: null,
      requiereAprobacion: true,
      requiereAprobacion2: false,
      diasUmbralAprobacion2: null,
      aplicaFinDeSemana: false,
      requiereDocumento: false,
    },
  })
  console.log(`✅ ${result.codigo} reactivado (activo=${result.activo})`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
