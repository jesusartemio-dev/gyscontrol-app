import { prisma } from '@/lib/prisma'

// ¿Desde cuándo hay horas registradas? Define cuántos meses tiene sentido ofrecer.

async function main() {
  const primero = await prisma.registroHoras.findFirst({
    orderBy: { fechaTrabajo: 'asc' }, select: { fechaTrabajo: true },
  })
  const ultimo = await prisma.registroHoras.findFirst({
    orderBy: { fechaTrabajo: 'desc' }, select: { fechaTrabajo: true },
  })
  console.log('primer registro:', primero?.fechaTrabajo.toISOString().slice(0, 10))
  console.log('último registro:', ultimo?.fechaTrabajo.toISOString().slice(0, 10))

  const todos = await prisma.registroHoras.findMany({
    select: { fechaTrabajo: true, horasTrabajadas: true },
  })
  const porMes = new Map<string, number>()
  for (const r of todos) {
    const k = `${r.fechaTrabajo.getUTCFullYear()}-${String(r.fechaTrabajo.getUTCMonth() + 1).padStart(2, '0')}`
    porMes.set(k, (porMes.get(k) ?? 0) + Number(r.horasTrabajadas))
  }
  console.log('\nhoras por mes (todo el histórico):')
  console.table([...porMes.entries()].sort().map(([mes, h]) => ({ mes, horas: Math.round(h) })))
  console.log(`meses con datos: ${porMes.size}`)
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1 })
  .finally(() => prisma.$disconnect())
