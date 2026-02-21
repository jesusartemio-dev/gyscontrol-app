const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  // Check orphaned proveedorId
  const orphanedProveedor = await prisma.$queryRaw`
    SELECT COUNT(*)::int as count
    FROM pedido_equipo_item
    WHERE "proveedorId" IS NOT NULL
    AND "proveedorId" NOT IN (SELECT id FROM proveedor)
  `
  console.log('Huerfanos proveedorId:', orphanedProveedor[0].count)

  // Check orphaned catalogoEquipoId
  const orphanedCatalogo = await prisma.$queryRaw`
    SELECT COUNT(*)::int as count
    FROM pedido_equipo_item
    WHERE "catalogoEquipoId" IS NOT NULL
    AND "catalogoEquipoId" NOT IN (SELECT id FROM catalogo_equipo)
  `
  console.log('Huerfanos catalogoEquipoId:', orphanedCatalogo[0].count)

  // Stats
  const total = await prisma.pedidoEquipoItem.count()
  const conProveedor = await prisma.pedidoEquipoItem.count({ where: { NOT: { proveedorId: null } } })
  const conCatalogo = await prisma.pedidoEquipoItem.count({ where: { NOT: { catalogoEquipoId: null } } })
  console.log(`\nTotal items: ${total}`)
  console.log(`Con proveedorId: ${conProveedor}`)
  console.log(`Con catalogoEquipoId: ${conCatalogo}`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
