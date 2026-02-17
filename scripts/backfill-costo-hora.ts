import { prisma } from '@/lib/prisma'
import { calcularCostosLaborales } from '@/lib/utils/costosLaborales'

async function main() {
  // 1. Count records
  const count = await prisma.registroHoras.count({ where: { costoHora: null } })
  console.log('Registros sin costoHora:', count)
  if (count === 0) {
    console.log('Nada que actualizar.')
    return
  }

  // 2. Get distinct users
  const users = await prisma.registroHoras.groupBy({
    by: ['usuarioId'],
    where: { costoHora: null },
    _count: true
  })
  console.log('Usuarios distintos:', users.length)

  // 3. Get config
  const config = await prisma.configuracionGeneral.findFirst({ select: { horasMensuales: true } })
  const horasMes = config?.horasMensuales || 192
  console.log('Horas mensuales:', horasMes)

  // 4. Get empleados
  const userIds = users.map(u => u.usuarioId)
  const empleados = await prisma.empleado.findMany({
    where: { userId: { in: userIds } },
    select: { userId: true, sueldoPlanilla: true, sueldoHonorarios: true, asignacionFamiliar: true, emo: true }
  })

  console.log('\nCostos por empleado:')
  let totalUpdated = 0
  for (const emp of empleados) {
    const costos = calcularCostosLaborales({
      sueldoPlanilla: emp.sueldoPlanilla || 0,
      sueldoHonorarios: emp.sueldoHonorarios || 0,
      asignacionFamiliar: emp.asignacionFamiliar || 0,
      emo: emp.emo || 25,
    })
    const costoHora = horasMes > 0 ? costos.totalMensual / horasMes : 0

    const user = await prisma.user.findUnique({ where: { id: emp.userId }, select: { name: true } })
    const regs = users.find(u => u.usuarioId === emp.userId)
    console.log(`  ${user?.name}: S/${costoHora.toFixed(2)}/h -> ${regs?._count || 0} registros`)

    const result = await prisma.registroHoras.updateMany({
      where: { usuarioId: emp.userId, costoHora: null },
      data: { costoHora }
    })
    totalUpdated += result.count
  }

  // Users without empleado record
  const empUserIds = new Set(empleados.map(e => e.userId))
  const sinEmpleado = users.filter(u => !empUserIds.has(u.usuarioId))
  if (sinEmpleado.length > 0) {
    console.log('\nUsuarios SIN datos de empleado (no se actualizan):')
    for (const u of sinEmpleado) {
      const user = await prisma.user.findUnique({ where: { id: u.usuarioId }, select: { name: true } })
      console.log(`  ${user?.name || u.usuarioId}: ${u._count} registros`)
    }
  }

  console.log(`\nTotal registros actualizados: ${totalUpdated}`)

  const remaining = await prisma.registroHoras.count({ where: { costoHora: null } })
  console.log('Registros restantes sin costoHora:', remaining)

  await prisma.$disconnect()
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
