import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()
async function main() {
  const rows = await p.proyecto.findMany({
    select: { id: true, nombre: true, estado: true },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })
  console.log(JSON.stringify(rows, null, 2))
}
main().catch(console.error).finally(() => p.$disconnect())
