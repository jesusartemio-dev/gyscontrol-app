// Script de backfill: vincula marcajes históricos (asistencia) con su empleadoId actual.
//
// Contexto: si un user marcaba asistencia ANTES de que se le creara la ficha de
// empleado, asistencia.empleadoId quedaba en null. Este script recorre esos
// registros y los enlaza al empleado actual del user (si hoy existe).
//
// Uso:
//   npx tsx scripts/backfill-asistencia-empleado.ts                 # local (.env)
//   npx dotenv -e .env.production -- npx tsx scripts/backfill-asistencia-empleado.ts

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const sinEmpleado = await prisma.asistencia.findMany({
    where: { empleadoId: null },
    select: { id: true, userId: true },
  })

  console.log(`📋 ${sinEmpleado.length} marcajes sin empleadoId`)

  if (sinEmpleado.length === 0) {
    console.log('✅ Nada que hacer.')
    return
  }

  // Agrupar por userId para evitar consultas repetidas
  const userIds = Array.from(new Set(sinEmpleado.map(a => a.userId)))
  const empleados = await prisma.empleado.findMany({
    where: { userId: { in: userIds } },
    select: { id: true, userId: true },
  })
  const mapUserToEmpleado = new Map(empleados.map(e => [e.userId, e.id]))

  console.log(`👥 ${empleados.length} usuarios tienen ficha de empleado ahora`)

  let actualizados = 0
  let sinFichaAun = 0
  const sinFichaIds = new Set<string>()

  for (const asis of sinEmpleado) {
    const empleadoId = mapUserToEmpleado.get(asis.userId)
    if (!empleadoId) {
      sinFichaAun++
      sinFichaIds.add(asis.userId)
      continue
    }
    await prisma.asistencia.update({
      where: { id: asis.id },
      data: { empleadoId },
    })
    actualizados++
  }

  console.log(`\n✅ Backfill completado:`)
  console.log(`   ${actualizados} marcajes vinculados a su empleado actual`)
  console.log(`   ${sinFichaAun} marcajes de ${sinFichaIds.size} usuarios sin ficha aún (se mantienen con empleadoId=null)`)
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
