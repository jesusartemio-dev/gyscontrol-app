import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()
async function main() {
  // Buscar en proyectos por nombre o descripcion
  const porNombre = await p.proyecto.findMany({
    where: { OR: [
      { nombre: { contains: 'nexa', mode: 'insensitive' } },
      { descripcion: { contains: 'nexa', mode: 'insensitive' } },
    ]},
    select: { id: true, nombre: true, estado: true, clienteId: true },
  })
  console.log('Proyectos con "nexa" en nombre/descripcion:', JSON.stringify(porNombre, null, 2))

  // Buscar en clientes
  const clientes = await p.cliente.findMany({
    where: { nombre: { contains: 'nexa', mode: 'insensitive' } },
    select: { id: true, nombre: true },
  })
  console.log('Clientes con "nexa":', JSON.stringify(clientes, null, 2))

  // Si hay clientes, buscar sus proyectos
  for (const c of clientes) {
    const proyectos = await p.proyecto.findMany({
      where: { clienteId: c.id },
      select: { id: true, nombre: true, estado: true },
      orderBy: { createdAt: 'desc' },
    })
    console.log(`Proyectos de cliente "${c.nombre}":`, JSON.stringify(proyectos, null, 2))
  }

  // Total de proyectos
  const total = await p.proyecto.count()
  console.log(`\nTotal proyectos en BD: ${total}`)
}
main().catch(console.error).finally(() => p.$disconnect())
